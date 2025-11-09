import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Verify platform admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: platformUser } = await supabaseAdmin
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Platform admin required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, tenant_id, user_id, email, full_name, role, phone, password, password_delivery_method, delivery_method, updates } = await req.json();

    console.log('📍 Tenant user management:', { action, tenant_id, user_id, password_delivery_method });

    // LIST USERS
    if (action === 'list' && tenant_id) {
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select(`
          user_id,
          role,
          status,
          created_at,
          suspension_metadata
        `)
        .eq('tenant_id', tenant_id);

      if (rolesError) throw rolesError;

      const userIds = roles?.map(r => r.user_id) || [];
      
      if (userIds.length === 0) {
        return new Response(
          JSON.stringify({ users: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      const users = authUsers.users
        .filter(u => userIds.includes(u.id))
        .map(u => {
          const roleData = roles?.find(r => r.user_id === u.id);
          return {
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name,
            phone: u.phone,
            role: roleData?.role || 'staff',
            status: roleData?.status || 'active',
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            suspension_metadata: roleData?.suspension_metadata || null,
          };
        });

      return new Response(
        JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE USER
    if (action === 'create' && tenant_id && email) {
      // Generate strong temporary password (14 chars)
      const generatePassword = () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '!@#$%^&*';
        const all = uppercase + lowercase + numbers + special;
        
        let pwd = '';
        pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
        pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
        pwd += numbers[Math.floor(Math.random() * numbers.length)];
        pwd += special[Math.floor(Math.random() * special.length)];
        
        for (let i = 4; i < 14; i++) {
          pwd += all[Math.floor(Math.random() * all.length)];
        }
        
        return pwd.split('').sort(() => Math.random() - 0.5).join('');
      };

      const tempPassword = password || generatePassword();
      const actualDeliveryMethod = delivery_method || password_delivery_method || 'email';
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || '',
          force_password_reset: true,
        },
        phone: phone || undefined,
      });

      if (createError) throw createError;

      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          tenant_id,
          role: role || 'staff',
          status: 'active',
        });

      // Handle password delivery
      let deliveryResult: any = { success: false };
      
      if (actualDeliveryMethod === 'email') {
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
        });
        deliveryResult = { success: !resetError, method: 'email', error: resetError?.message };
      } else if (actualDeliveryMethod === 'sms' && phone) {
        const { data: smsData, error: smsError } = await supabaseAdmin.functions.invoke('send-password-sms', {
          body: {
            phone,
            password: tempPassword,
            user_name: full_name || email,
            user_type: 'tenant_user',
            user_id: newUser.user.id,
            delivered_by: user.id,
            tenant_id,
          },
        });
        deliveryResult = { success: smsData?.success || false, method: 'sms', error: smsError?.message || smsData?.error };
      } else if (actualDeliveryMethod === 'manual') {
        deliveryResult = { success: true, method: 'manual', password: tempPassword };
      }

      // Log delivery attempt
      await supabaseAdmin.from('password_delivery_log').insert({
        user_id: newUser.user.id,
        delivery_method: actualDeliveryMethod,
        delivered_by: user.id,
        delivery_status: deliveryResult.success ? 'sent' : 'failed',
        error_message: deliveryResult.error || null,
        metadata: { phone: phone || null, tenant_id },
      });

      await supabaseAdmin
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_user_created',
          resource_type: 'tenant_user',
          resource_id: newUser.user.id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id, email, role, created_by: user.id, delivery_method: actualDeliveryMethod },
        });

      console.log('✅ User created:', newUser.user.id, 'Delivery:', actualDeliveryMethod);

      const response: any = { success: true, user_id: newUser.user.id };
      if (actualDeliveryMethod === 'manual') {
        response.temporary_password = tempPassword;
        response.delivery_method = 'manual';
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE USER
    if (action === 'update' && tenant_id && user_id && updates) {
      if (updates.role) {
        await supabaseAdmin
          .from('user_roles')
          .update({ role: updates.role })
          .eq('user_id', user_id)
          .eq('tenant_id', tenant_id);
      }

      if (updates.full_name) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, {
          user_metadata: { full_name: updates.full_name },
        });
      }

      await supabaseAdmin
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_user_updated',
          resource_type: 'tenant_user',
          resource_id: user_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id, user_id, updates },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SUSPEND USER
    if (action === 'suspend' && tenant_id && user_id) {
      await supabaseAdmin
        .from('user_roles')
        .update({ 
          status: 'suspended',
          suspension_metadata: {
            suspension_type: 'individual',
            suspended_at: new Date().toISOString(),
            suspended_by: user.id,
            reason: 'Individual suspension by admin',
          }
        })
        .eq('user_id', user_id)
        .eq('tenant_id', tenant_id);

      await supabaseAdmin
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_user_suspended',
          resource_type: 'tenant_user',
          resource_id: user_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id, user_id, suspension_type: 'individual' },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTIVATE USER
    if (action === 'activate' && tenant_id && user_id) {
      // Check if tenant is suspended
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('status')
        .eq('id', tenant_id)
        .single();

      if (tenant?.status === 'suspended') {
        return new Response(
          JSON.stringify({ 
            error: 'Cannot activate user: Tenant is currently suspended. Activate the tenant first.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin
        .from('user_roles')
        .update({ 
          status: 'active',
          suspension_metadata: null 
        })
        .eq('user_id', user_id)
        .eq('tenant_id', tenant_id);

      await supabaseAdmin
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_user_activated',
          resource_type: 'tenant_user',
          resource_id: user_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id, user_id },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // RESET PASSWORD
    if (action === 'reset_password' && tenant_id && user_id) {
      const actualDeliveryMethod = delivery_method || password_delivery_method || 'email';
      
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
      
      if (!userData.user?.email) {
        throw new Error('User email not found');
      }

      // Generate new temp password
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let pwd = '';
        for (let i = 0; i < 14; i++) {
          pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return pwd;
      };

      const tempPassword = generatePassword();

      // Update user with new password and force reset flag
      await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: tempPassword,
        user_metadata: { force_password_reset: true },
      });

      // Handle delivery
      let deliveryResult: any = { success: false };
      
      if (actualDeliveryMethod === 'email') {
        const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(userData.user.email, {
          redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
        });
        deliveryResult = { success: !resetError, method: 'email' };
      } else if (actualDeliveryMethod === 'sms' && userData.user.phone) {
        const { data: smsData } = await supabaseAdmin.functions.invoke('send-password-sms', {
          body: {
            phone: userData.user.phone,
            password: tempPassword,
            user_name: userData.user.user_metadata?.full_name || userData.user.email,
            user_type: 'tenant_user',
            user_id,
            delivered_by: user.id,
            tenant_id,
          },
        });
        deliveryResult = { success: smsData?.success, method: 'sms', error: smsData?.error };
      } else if (actualDeliveryMethod === 'manual') {
        deliveryResult = { success: true, method: 'manual', password: tempPassword };
      }

      await supabaseAdmin
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_user_password_reset',
          resource_type: 'tenant_user',
          resource_id: user_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id, user_id, delivery_method: actualDeliveryMethod },
        });

      const response: any = { success: true };
      if (actualDeliveryMethod === 'manual') {
        response.temporary_password = tempPassword;
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
