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
      .eq('id', user.id)
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

      const { email, full_name, role, phone, password_delivery_method } = await req.json();

      if (!email || !full_name || !role) {
        throw new Error('Missing required fields: email, full_name, role');
      }

      // Validate delivery method and phone requirement
      const deliveryMethod = password_delivery_method || 'email';
      if (deliveryMethod === 'sms' && !phone) {
        throw new Error('Phone number is required for SMS delivery');
      }

      // Validate role
      const validRoles = ['super_admin', 'support_admin', 'billing_bot', 'marketplace_admin', 'monitoring_bot'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Generate strong temporary password (14 chars: uppercase, lowercase, numbers, special)
      const generatePassword = () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*';
        const all = uppercase + lowercase + numbers + special;
        
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];
        
        for (let i = 4; i < 14; i++) {
          password += all[Math.floor(Math.random() * all.length)];
        }
        
        return password.split('').sort(() => Math.random() - 0.5).join('');
      };

      const tempPassword = generatePassword();
      const passwordExpiry = new Date();
      passwordExpiry.setHours(passwordExpiry.getHours() + 24); // Expires in 24 hours

      // Create auth user with temporary password
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
          id: newUser.user.id,
          email,
          full_name,
          role,
          phone: phone || null,
          password_delivery_method: deliveryMethod,
          temp_password_expires_at: passwordExpiry.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Rollback auth user creation
        await supabase.auth.admin.deleteUser(newUser.user.id);
        throw insertError;
      }

      // Handle password delivery based on method
      let deliveryResult: any = { success: false };
      
      if (deliveryMethod === 'email') {
        // Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${req.headers.get('origin')}/auth/password-change`,
        });
        
        deliveryResult = { 
          success: !resetError, 
          method: 'email',
          error: resetError?.message 
        };
      } else if (deliveryMethod === 'sms') {
        // Call SMS delivery function
        const { data: smsData, error: smsError } = await supabase.functions.invoke('send-password-sms', {
          body: {
            phone,
            password: tempPassword,
            user_name: full_name,
            user_type: 'platform_user',
            user_id: newUser.user.id,
            delivered_by: user.id,
          },
        });
        
        deliveryResult = { 
          success: smsData?.success || false, 
          method: 'sms',
          error: smsError?.message || smsData?.error 
        };
      } else if (deliveryMethod === 'manual') {
        // Manual delivery - password will be returned in response
        deliveryResult = { 
          success: true, 
          method: 'manual',
          password: tempPassword 
        };
      }

      // Log delivery to password_delivery_log
      await supabase.from('password_delivery_log').insert({
        user_id: newUser.user.id,
        delivery_method: deliveryMethod,
        delivered_by: user.id,
        delivery_status: deliveryResult.success ? 'sent' : 'failed',
        error_message: deliveryResult.error || null,
        metadata: {
          phone: phone || null,
          delivery_details: deliveryResult,
        },
      });

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
          phone: phone || null,
          delivery_method: deliveryMethod,
          created_by: user.email,
        },
      });

      console.log(`Platform user created: ${email} with role ${role}, delivery: ${deliveryMethod}`);

      const response: any = { 
        success: true, 
        data: platformUserRecord,
        message: deliveryMethod === 'manual' 
          ? 'Platform user created. Copy the temporary password shown below.'
          : deliveryMethod === 'sms'
          ? `Platform user created. Password sent via SMS to ${phone}.`
          : 'Platform user created. Password reset email sent.',
      };

      // Include temp password only if manual delivery
      if (deliveryMethod === 'manual') {
        response.temporary_password = tempPassword;
        response.delivery_method = 'manual';
      }

      return new Response(
        JSON.stringify(response),
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

      // Check if attempting to modify protected user
      const { data: existingUser, error: fetchError } = await supabase
        .from('platform_users')
        .select('system_locked, role')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (existingUser?.system_locked) {
        // Prevent role changes for system-locked users
        if (updates.role && updates.role !== existingUser.role) {
          throw new Error('Cannot change role of system-locked user');
        }
        
        // Prevent unlocking
        if (updates.system_locked === false) {
          throw new Error('Cannot remove system_locked flag from protected user');
        }
      }

      // Update platform_users record
      const { data: updatedUser, error: updateError } = await supabase
        .from('platform_users')
        .update({
          ...(updates.role && { role: updates.role }),
          ...(updates.full_name && { full_name: updates.full_name }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
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

      // Check if user is system-locked before attempting deletion
      const { data: userToDelete, error: fetchError } = await supabase
        .from('platform_users')
        .select('email, role, system_locked')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (userToDelete?.system_locked) {
        throw new Error('Cannot delete system-locked user. This is a protected platform account.');
      }

      // Delete platform_users record (cascade will handle auth.users via trigger if needed)
      const { error: deleteError } = await supabase
        .from('platform_users')
        .delete()
        .eq('id', userId);

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
        .eq('id', userId)
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
