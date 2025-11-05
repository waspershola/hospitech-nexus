import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);

    // Check if user is platform admin or tenant user
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPlatformAdmin = platformUser && ['super_admin', 'support_admin'].includes(platformUser.role);

    // Get tenant_id for tenant users
    let tenantId: string | null = null;
    if (!isPlatformAdmin) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      tenantId = userRole?.tenant_id || null;
      
      if (!tenantId) {
        throw new Error('User has no tenant association');
      }
    }

    // GET /support-ticket - List tickets
    if (req.method === 'GET' && path.length === 1) {
      let query = supabase
        .from('platform_support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      // If not platform admin, only show own tenant's tickets
      if (!isPlatformAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      // Filter by status if provided
      const status = url.searchParams.get('status');
      if (status) {
        query = query.eq('status', status);
      }

      // Filter by priority if provided
      const priority = url.searchParams.get('priority');
      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data: tickets, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data: tickets }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /support-ticket/{ticketId} - Get single ticket
    if (req.method === 'GET' && path.length === 2) {
      const ticketId = path[1];

      let query = supabase
        .from('platform_support_tickets')
        .select('*')
        .eq('id', ticketId);

      // If not platform admin, verify ticket belongs to their tenant
      if (!isPlatformAdmin && tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: ticket, error } = await query.single();
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data: ticket }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /support-ticket - Create ticket
    if (req.method === 'POST' && path.length === 1) {
      if (isPlatformAdmin) {
        throw new Error('Platform admins cannot create tickets');
      }

      const { subject, description, priority } = await req.json();

      if (!subject || !description) {
        throw new Error('Missing required fields: subject, description');
      }

      // Generate ticket number
      const { count } = await supabase
        .from('platform_support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId!);

      const ticketNumber = `TICKET-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: ticket, error: createError } = await supabase
        .from('platform_support_tickets')
        .insert({
          tenant_id: tenantId!,
          ticket_number: ticketNumber,
          subject,
          description,
          priority: priority || 'medium',
          status: 'open',
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        action: 'support_ticket_created',
        resource_type: 'support_ticket',
        resource_id: ticket.id,
        payload: {
          ticket_number: ticketNumber,
          subject,
          priority,
          tenant_id: tenantId,
        },
      });

      console.log(`Support ticket created: ${ticketNumber}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: ticket,
          message: 'Support ticket created successfully',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /support-ticket/{ticketId} - Update ticket
    if (req.method === 'PATCH' && path.length === 2) {
      const ticketId = path[1];
      const updates = await req.json();

      // Get existing ticket
      const { data: existingTicket, error: fetchError } = await supabase
        .from('platform_support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (fetchError) throw fetchError;

      // Permission check
      if (!isPlatformAdmin && existingTicket.tenant_id !== tenantId) {
        throw new Error('Unauthorized to update this ticket');
      }

      // Tenants can only update description, platform admins can update everything
      let allowedUpdates: any = {};
      if (isPlatformAdmin) {
        allowedUpdates = {
          ...(updates.status && { status: updates.status }),
          ...(updates.priority && { priority: updates.priority }),
          ...(updates.assigned_to && { assigned_to: updates.assigned_to }),
          ...(updates.resolution_notes && { resolution_notes: updates.resolution_notes }),
        };

        // Auto-set resolved/closed timestamps
        if (updates.status === 'resolved') {
          allowedUpdates.resolved_at = new Date().toISOString();
        }
        if (updates.status === 'closed') {
          allowedUpdates.closed_at = new Date().toISOString();
        }
      } else {
        // Tenants can only add comments (stored in description for now)
        if (updates.description) {
          allowedUpdates.description = updates.description;
        }
      }

      if (Object.keys(allowedUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }

      allowedUpdates.updated_at = new Date().toISOString();

      const { data: updatedTicket, error: updateError } = await supabase
        .from('platform_support_tickets')
        .update(allowedUpdates)
        .eq('id', ticketId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        actor_role: platformUser?.role,
        action: 'support_ticket_updated',
        resource_type: 'support_ticket',
        resource_id: ticketId,
        payload: {
          updates: allowedUpdates,
          old_status: existingTicket.status,
          new_status: updatedTicket.status,
        },
      });

      console.log(`Support ticket updated: ${ticketId}`);

      return new Response(JSON.stringify({ success: true, data: updatedTicket }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /support-ticket/{ticketId} - Delete ticket (platform admin only)
    if (req.method === 'DELETE' && path.length === 2) {
      if (!isPlatformAdmin) {
        throw new Error('Only platform admins can delete tickets');
      }

      const ticketId = path[1];

      const { data: ticket } = await supabase
        .from('platform_support_tickets')
        .select('ticket_number, tenant_id')
        .eq('id', ticketId)
        .single();

      const { error: deleteError } = await supabase
        .from('platform_support_tickets')
        .delete()
        .eq('id', ticketId);

      if (deleteError) throw deleteError;

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        actor_role: platformUser?.role,
        action: 'support_ticket_deleted',
        resource_type: 'support_ticket',
        resource_id: ticketId,
        payload: {
          ticket_number: ticket?.ticket_number,
          tenant_id: ticket?.tenant_id,
        },
      });

      console.log(`Support ticket deleted: ${ticketId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Support ticket error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: errorMessage.includes('Unauthorized') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
