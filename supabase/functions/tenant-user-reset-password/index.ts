import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is platform admin
    const { data: platformUser } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      throw new Error('Insufficient permissions');
    }

    const { user_id, tenant_id } = await req.json();

    if (!user_id || !tenant_id) {
      throw new Error('user_id and tenant_id are required');
    }

    // Generate secure temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    const tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(14)))
      .map(x => chars[x % chars.length])
      .join('');

    // Get user profile for logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    // Update user password and set force reset flag
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        password: tempPassword,
        user_metadata: {
          force_password_reset: true,
          password_reset_by: user.id,
          password_reset_at: new Date().toISOString()
        }
      }
    );

    if (updateError) {
      throw updateError;
    }

    // Log to audit stream
    await supabase.from('platform_audit_stream').insert({
      actor_id: user.id,
      actor_role: platformUser.role,
      action: 'reset_user_password',
      resource_type: 'user',
      resource_id: user_id,
      payload: {
        tenant_id,
        user_email: profile?.email,
        user_name: profile?.full_name
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        temporary_password: tempPassword,
        message: 'Password reset successfully. User must change password on next login.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Reset password error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to reset password' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
