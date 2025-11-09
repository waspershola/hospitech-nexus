import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify user is platform admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is platform admin
    const { data: platformUser, error: platformError } = await supabase
      .from('platform_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (platformError || !platformUser || !['super_admin', 'support_admin'].includes(platformUser.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Platform admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const method = req.method;
    const body = method !== 'GET' ? await req.json() : {};
    const { action, tenant_id } = body;

    console.log('📍 Request:', { method, action, tenant_id });

    // CREATE TENANT
    if (action === 'create') {
      const { 
        hotel_name, owner_email, owner_full_name, plan_id, domain, owner_phone, 
        password_delivery_method = 'email', provider_id, sender_id, additional_credits 
      } = body;

      if (!hotel_name || !owner_email || !plan_id) {
        return new Response(
          JSON.stringify({ error: 'hotel_name, owner_email, and plan_id are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('🏗️ Creating tenant:', { hotel_name, owner_email, plan_id, domain, password_delivery_method });

      // Generate unique slug with safety checks
      const baseSlug = hotel_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let slug = baseSlug;
      let attempts = 0;
      const maxAttempts = 5;

      // Check for existing slug (including soft-deleted tenants) and make it unique if needed
      while (attempts < maxAttempts) {
        const { data: existingTenant } = await supabase
          .from('tenants')
          .select('id, deleted_at')
          .eq('slug', slug)
          .is('deleted_at', null)
          .maybeSingle();
        
        if (!existingTenant) {
          console.log(`✅ Slug "${slug}" is available`);
          break; // Slug is unique, use it
        }
        
        // Slug exists for active tenant, append unique suffix
        attempts++;
        const suffix = Date.now().toString().slice(-6) + Math.random().toString(36).slice(2, 5);
        slug = `${baseSlug}-${suffix}`;
        console.log(`⚠️ Slug collision detected, trying: ${slug} (attempt ${attempts})`);
      }

      if (attempts >= maxAttempts) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to generate unique tenant slug after multiple attempts',
            failed_at: 'slug_generation'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create tenant with unique slug
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name: hotel_name, slug })
        .select()
        .single();

      if (tenantError) {
        console.error('❌ Tenant creation error:', tenantError);
        throw tenantError;
      }

      console.log('✅ Tenant created:', tenant.id);

      // Validate phone format if provided (E.164 format)
      if (owner_phone && !/^\+[1-9]\d{1,14}$/.test(owner_phone)) {
        await supabase.from('platform_tenants').delete().eq('id', tenant.id);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid phone number format. Must be in E.164 format (e.g., +234XXXXXXXXXX)',
            failed_at: 'validation'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Validate delivery method
      const deliveryMethod = password_delivery_method || 'email';
      if (deliveryMethod === 'sms' && !owner_phone) {
        await supabase.from('platform_tenants').delete().eq('id', tenant.id);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Phone number is required for SMS delivery',
            failed_at: 'validation'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Create admin user for tenant
      let adminUser = null;
      let tempPassword = '';
      try {
        // Always generate strong temporary password (never accept custom - security best practice)
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

        tempPassword = generatePassword();
        
        // Build user creation payload
        // IMPORTANT: Only include phone in auth.users when SMS delivery is selected
        // This prevents phone uniqueness conflicts across tenants
        const createUserPayload: any = {
          email: owner_email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: owner_full_name || 'Admin',
            // hotel_name removed to prevent duplicate tenant creation via handle_new_user_signup trigger
            force_password_reset: true,
          },
        };
        
        // ONLY include phone in auth.users if SMS delivery is selected
        // For email/manual delivery, phone will be stored in staff table only
        if (password_delivery_method === 'sms' && owner_phone && /^\+[1-9]\d{1,14}$/.test(owner_phone)) {
          createUserPayload.phone = owner_phone;
          createUserPayload.phone_confirm = true;
          console.log('📱 Phone added to auth.users for SMS delivery');
        } else {
          console.log('📱 Phone not added to auth.users (delivery method:', password_delivery_method, ') - will be stored in staff table only');
        }
        
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser(createUserPayload);

        if (authError) {
          console.error('❌ User creation error:', authError);
          
          // CRITICAL: Rollback tenant creation if user creation fails
          console.log('🔄 Rolling back tenant creation...');
          await supabase.from('platform_tenants').delete().eq('id', tenant.id);
          await supabase.from('tenants').delete().eq('id', tenant.id);
          
          // Provide helpful error messages based on error type
          let errorMessage = `Failed to create owner user: ${authError.message}`;
          
          if (authError.message?.toLowerCase().includes('phone') || authError.message?.toLowerCase().includes('unique')) {
            errorMessage = `Phone number ${owner_phone} is already registered for SMS authentication. ` +
              `Please either:\n` +
              `1. Use 'Email' or 'Manual' password delivery (phone will be saved for contact purposes but not for authentication)\n` +
              `2. Provide a different phone number for SMS-based authentication`;
          } else if (authError.message?.toLowerCase().includes('email')) {
            errorMessage = `Email ${owner_email} is already registered. Email addresses must be unique across all tenants.`;
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: errorMessage,
              failed_at: 'user_creation',
              details: authError
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        adminUser = authUser.user;
        console.log('✅ Admin user created:', adminUser.id);

        // Assign owner role
        await supabase
          .from('user_roles')
          .insert({
            user_id: adminUser.id,
            tenant_id: tenant.id,
            role: 'owner',
          });

        console.log('✅ Owner role assigned');

        // Create staff record for owner with "management" department
        // IMPORTANT: Always store phone in staff table, regardless of whether it's in auth.users
        const { error: staffError } = await supabase
          .from('staff')
          .insert({
            user_id: adminUser.id,
            tenant_id: tenant.id,
            full_name: owner_full_name || hotel_name || 'Owner',
            email: owner_email,
            phone: owner_phone || null, // Store phone for contact purposes
            department: 'management',
            role: 'owner',
            status: 'active',
          });

        if (staffError) {
          console.error('⚠️ Staff creation error:', staffError);
          // Continue anyway - user_roles already created, staff record is for navigation/department access
        } else {
          console.log('✅ Staff record created with management department');
        }

        // Handle password delivery
        let deliveryResult: any = { success: false };
        
        if (password_delivery_method === 'email') {
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(owner_email, {
            redirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
          });
          deliveryResult = { success: !resetError, method: 'email' };
        } else if (password_delivery_method === 'sms' && owner_phone) {
          const { data: smsData } = await supabase.functions.invoke('send-password-sms', {
            body: {
              phone: owner_phone,
              password: tempPassword,
              user_name: 'Admin',
              user_type: 'tenant_user',
              user_id: adminUser.id,
              delivered_by: user.id,
            },
          });
          deliveryResult = { success: smsData?.success, method: 'sms' };
        } else if (password_delivery_method === 'manual') {
          deliveryResult = { success: true, method: 'manual', password: tempPassword };
        }

        // Log password delivery
        if (adminUser) {
          await supabase.from('password_delivery_log').insert({
            user_id: adminUser.id,
            delivery_method: password_delivery_method,
            delivered_by: user.id,
            delivery_status: deliveryResult.success ? 'sent' : 'failed',
            metadata: { phone: owner_phone || null, tenant_id: tenant.id, is_owner: true },
          });
        }
      } catch (err) {
        console.error('⚠️ User creation failed, continuing:', err);
      }

      // Create platform tenant entry
      const { error: platformTenantError } = await supabase
        .from('platform_tenants')
        .insert({
          id: tenant.id,
          domain,
          status: 'trial',
          plan_id,
          owner_email,
          settings: {
            admin_user_id: adminUser?.id,
          },
        });

      if (platformTenantError) {
        console.error('❌ Platform tenant error:', platformTenantError);
        throw platformTenantError;
      }

      console.log('✅ Platform tenant entry created');

      // Initialize SMS credit pool with trial credits + additional
      try {
        const totalCredits = 100 + (additional_credits || 0);
        await supabase
          .from('platform_sms_credit_pool')
          .insert({
            tenant_id: tenant.id,
            total_credits: totalCredits,
            consumed_credits: 0,
            last_topup_at: new Date().toISOString(),
            billing_reference: additional_credits 
              ? `Trial credits (100) + Additional (${additional_credits})`
              : 'Trial credits',
          });
        console.log(`✅ SMS credit pool initialized (${totalCredits} credits)`);
      } catch (err) {
        console.error('⚠️ SMS credit pool creation failed:', err);
      }

      // Seed default navigation items (53 items from platform_nav_items where tenant_id is null)
      try {
        const { data: defaultNav } = await supabase
          .from('platform_nav_items')
          .select('*')
          .is('tenant_id', null);

        if (defaultNav && defaultNav.length > 0) {
          const tenantNav = defaultNav.map(item => ({
            ...item,
            id: undefined, // Generate new IDs
            tenant_id: tenant.id,
          }));

          await supabase
            .from('platform_nav_items')
            .insert(tenantNav);

          console.log(`✅ Seeded ${tenantNav.length} default navigation items`);
        }
      } catch (err) {
        console.error('⚠️ Navigation seeding failed:', err);
      }

      // Create default financial settings
      const { error: financialError } = await supabase
        .from('hotel_financials')
        .insert({
          tenant_id: tenant.id,
          vat_rate: 0,
          vat_inclusive: false,
          service_charge: 0,
          service_charge_inclusive: false,
          currency: 'NGN',
          currency_symbol: '₦',
          symbol_position: 'before',
          decimal_separator: '.',
          thousand_separator: ',',
          decimal_places: 2,
        });

      if (financialError) console.error('⚠️ Financial settings error:', financialError);

      // Create default branding
      const { error: brandingError } = await supabase
        .from('hotel_branding')
        .insert({
          tenant_id: tenant.id,
          primary_color: 'hsl(0 65% 51%)',
          secondary_color: 'hsl(51 100% 50%)',
          accent_color: 'hsl(51 85% 65%)',
          font_heading: 'Playfair Display',
          font_body: 'Inter',
        });

      if (brandingError) console.error('Branding error:', brandingError);

      // Assign SMS provider if specified
      if (provider_id && sender_id) {
        try {
          await supabase
            .from('tenant_provider_assignments')
            .insert({
              tenant_id: tenant.id,
              provider_id,
              sender_id,
              is_active: true,
              assigned_at: new Date().toISOString(),
              assigned_by: user.id,
            });
          console.log(`✅ SMS provider assigned: ${provider_id} with sender ID: ${sender_id}`);
        } catch (err) {
          console.error('⚠️ Provider assignment failed:', err);
        }
      }

      // Create default hotel meta
      const { error: metaError } = await supabase
        .from('hotel_meta')
        .insert({
          tenant_id: tenant.id,
          hotel_name,
          tagline: `Welcome to ${hotel_name}`,
        });

      if (metaError) console.error('Meta error:', metaError);

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_created',
          resource_type: 'tenant',
          resource_id: tenant.id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: {
            tenant_id: tenant.id,
            hotel_name,
            owner_email,
            plan_id,
            domain,
            admin_user_id: adminUser?.id,
            provider_id: provider_id || null,
            sender_id: sender_id || null,
            initial_credits: 100 + (additional_credits || 0),
          },
        });

      console.log('✅ Tenant creation complete:', tenant.id);

      const response: any = { 
        success: true, 
        tenant: {
          ...tenant,
          admin_email: owner_email,
          admin_user_id: adminUser?.id,
        }
      };

      // Include temp password if manual delivery
      if (password_delivery_method === 'manual' && tempPassword) {
        response.temporary_password = tempPassword;
        response.delivery_method = 'manual';
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE TENANT
    if (action === 'update' && tenant_id) {
      const { error: updateError } = await supabase
        .from('platform_tenants')
        .update(body.updates)
        .eq('id', tenant_id);

      if (updateError) throw updateError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_updated',
          resource_type: 'tenant',
          resource_id: tenant_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id, updates: body.updates },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SUSPEND TENANT
    if (action === 'suspend' && tenant_id) {
      const { error: suspendError } = await supabase
        .from('platform_tenants')
        .update({ status: 'suspended' })
        .eq('id', tenant_id);

      if (suspendError) throw suspendError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_suspended',
          resource_type: 'tenant',
          resource_id: tenant_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACTIVATE TENANT
    if (action === 'activate' && tenant_id) {
      const { error: activateError } = await supabase
        .from('platform_tenants')
        .update({ status: 'active' })
        .eq('id', tenant_id);

      if (activateError) throw activateError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_activated',
          resource_type: 'tenant',
          resource_id: tenant_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE TENANT (soft delete)
    if (action === 'delete' && tenant_id) {
      const { error: deleteError } = await supabase
        .from('platform_tenants')
        .update({ status: 'cancelled' })
        .eq('id', tenant_id);

      if (deleteError) throw deleteError;

      // Log audit event
      await supabase
        .from('platform_audit_stream')
        .insert({
          action: 'tenant_deleted',
          resource_type: 'tenant',
          resource_id: tenant_id,
          actor_id: user.id,
          actor_role: platformUser.role,
          payload: { tenant_id },
        });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Tenant management error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
