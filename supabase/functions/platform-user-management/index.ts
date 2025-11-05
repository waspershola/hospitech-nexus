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

    // Check if user is platform admin
    const { data: platformUser, error: roleError } = await supabase
      .from('platform_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      throw new Error('Insufficient permissions - requires platform admin role');
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').filter(Boolean);

    // GET /platform-user-management - List all platform users
    if (req.method === 'GET' && path.length === 1) {
      const { data: users, error } = await supabase
        .from('platform_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data: users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /platform-user-management - Create platform user
    if (req.method === 'POST' && path.length === 1) {
      // Only super_admin can create users
      if (platformUser.role !== 'super_admin') {
        throw new Error('Only super admins can create platform users');
      }

      const { email, full_name, role } = await req.json();

      if (!email || !full_name || !role) {
        throw new Error('Missing required fields: email, full_name, role');
      }

      // Validate role
      const validRoles = ['super_admin', 'support_admin', 'billing_bot', 'marketplace_admin', 'monitoring_bot'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Create auth user with temporary password
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: 'platform_admin',
          requires_password_change: true,
        },
      });

      if (createError) throw createError;

      // Create platform_users record
      const { data: platformUserRecord, error: insertError } = await supabase
        .from('platform_users')
        .insert({
          user_id: newUser.user.id,
          email,
          full_name,
          role,
        })
        .select()
        .single();

      if (insertError) {
        // Rollback auth user creation
        await supabase.auth.admin.deleteUser(newUser.user.id);
        throw insertError;
      }

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        actor_role: platformUser.role,
        action: 'platform_user_created',
        resource_type: 'platform_user',
        resource_id: newUser.user.id,
        payload: {
          email,
          role,
          created_by: user.email,
        },
      });

      console.log(`Platform user created: ${email} with role ${role}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: platformUserRecord,
          message: 'Platform user created. Password reset email will be sent.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /platform-user-management/{userId} - Update platform user
    if (req.method === 'PATCH' && path.length === 2) {
      // Only super_admin can update users
      if (platformUser.role !== 'super_admin') {
        throw new Error('Only super admins can update platform users');
      }

      const userId = path[1];
      const updates = await req.json();

      // Prevent self-role change
      if (userId === user.id && updates.role) {
        throw new Error('Cannot change your own role');
      }

      // Update platform_users record
      const { data: updatedUser, error: updateError } = await supabase
        .from('platform_users')
        .update({
          ...(updates.role && { role: updates.role }),
          ...(updates.full_name && { full_name: updates.full_name }),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        actor_role: platformUser.role,
        action: 'platform_user_updated',
        resource_type: 'platform_user',
        resource_id: userId,
        payload: {
          updates,
          updated_by: user.email,
        },
      });

      console.log(`Platform user updated: ${userId}`);

      return new Response(JSON.stringify({ success: true, data: updatedUser }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /platform-user-management/{userId} - Delete platform user
    if (req.method === 'DELETE' && path.length === 2) {
      // Only super_admin can delete users
      if (platformUser.role !== 'super_admin') {
        throw new Error('Only super admins can delete platform users');
      }

      const userId = path[1];

      // Prevent self-deletion
      if (userId === user.id) {
        throw new Error('Cannot delete yourself');
      }

      // Get user info before deletion
      const { data: userToDelete } = await supabase
        .from('platform_users')
        .select('email, role')
        .eq('user_id', userId)
        .single();

      // Delete platform_users record (cascade will handle auth.users via trigger if needed)
      const { error: deleteError } = await supabase
        .from('platform_users')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Delete auth user
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error('Failed to delete auth user:', authDeleteError);
      }

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        actor_role: platformUser.role,
        action: 'platform_user_deleted',
        resource_type: 'platform_user',
        resource_id: userId,
        payload: {
          deleted_user: userToDelete,
          deleted_by: user.email,
        },
      });

      console.log(`Platform user deleted: ${userId}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /platform-user-management/{userId}/reset-password - Send password reset
    if (req.method === 'POST' && path.length === 3 && path[2] === 'reset-password') {
      const userId = path[1];

      const { data: userToReset } = await supabase
        .from('platform_users')
        .select('email')
        .eq('user_id', userId)
        .single();

      if (!userToReset) {
        throw new Error('User not found');
      }

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        userToReset.email,
        { redirectTo: `${supabaseUrl}/auth/reset-password` }
      );

      if (resetError) throw resetError;

      // Log to audit stream
      await supabase.from('platform_audit_stream').insert({
        actor_id: user.id,
        actor_role: platformUser.role,
        action: 'platform_user_password_reset_requested',
        resource_type: 'platform_user',
        resource_id: userId,
        payload: {
          requested_by: user.email,
        },
      });

      console.log(`Password reset sent for: ${userToReset.email}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Platform user management error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: errorMessage.includes('Unauthorized') || errorMessage.includes('permissions') ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
