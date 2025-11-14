-- =====================================================
-- MULTI-TENANT VIEW MIGRATION
-- Creates tenant-specific views for all tables
-- Filters by tenant_id using auth.uid() + user_roles
-- =====================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_bookings CASCADE;
DROP VIEW IF EXISTS v_guests CASCADE;
DROP VIEW IF EXISTS v_rooms CASCADE;
DROP VIEW IF EXISTS v_room_types CASCADE;
DROP VIEW IF EXISTS v_room_status_history CASCADE;
DROP VIEW IF EXISTS v_room_categories CASCADE;
DROP VIEW IF EXISTS v_requests CASCADE;
DROP VIEW IF EXISTS v_guest_communications CASCADE;
DROP VIEW IF EXISTS v_guest_feedback CASCADE;
DROP VIEW IF EXISTS v_guest_orders CASCADE;
DROP VIEW IF EXISTS v_payments CASCADE;
DROP VIEW IF EXISTS v_receivables CASCADE;
DROP VIEW IF EXISTS v_stay_folios CASCADE;
DROP VIEW IF EXISTS v_folio_transactions CASCADE;
DROP VIEW IF EXISTS v_wallets CASCADE;
DROP VIEW IF EXISTS v_wallet_transactions CASCADE;
DROP VIEW IF EXISTS v_booking_charges CASCADE;
DROP VIEW IF EXISTS v_receipt_sequences CASCADE;
DROP VIEW IF EXISTS v_finance_providers CASCADE;
DROP VIEW IF EXISTS v_finance_locations CASCADE;
DROP VIEW IF EXISTS v_finance_provider_rules CASCADE;
DROP VIEW IF EXISTS v_finance_reconciliation_records CASCADE;
DROP VIEW IF EXISTS v_finance_reconciliation_audit CASCADE;
DROP VIEW IF EXISTS v_finance_analytics_snapshots CASCADE;
DROP VIEW IF EXISTS v_finance_audit_events CASCADE;
DROP VIEW IF EXISTS v_staff CASCADE;
DROP VIEW IF EXISTS v_user_roles CASCADE;
DROP VIEW IF EXISTS v_navigation_items CASCADE;
DROP VIEW IF EXISTS v_hotel_permissions CASCADE;
DROP VIEW IF EXISTS v_hotel_branding CASCADE;
DROP VIEW IF EXISTS v_hotel_configurations CASCADE;
DROP VIEW IF EXISTS v_hotel_meta CASCADE;
DROP VIEW IF EXISTS v_hotel_financials CASCADE;
DROP VIEW IF EXISTS v_hotel_payment_preferences CASCADE;
DROP VIEW IF EXISTS v_hotel_config_snapshots CASCADE;
DROP VIEW IF EXISTS v_hotel_domains CASCADE;
DROP VIEW IF EXISTS v_document_templates CASCADE;
DROP VIEW IF EXISTS v_email_settings CASCADE;
DROP VIEW IF EXISTS v_hotel_dashboard_defaults CASCADE;
DROP VIEW IF EXISTS v_inventory_items CASCADE;
DROP VIEW IF EXISTS v_department_stock CASCADE;
DROP VIEW IF EXISTS v_department_requests CASCADE;
DROP VIEW IF EXISTS v_purchase_orders CASCADE;
DROP VIEW IF EXISTS v_stock_movements CASCADE;
DROP VIEW IF EXISTS v_suppliers CASCADE;
DROP VIEW IF EXISTS v_menu_items CASCADE;
DROP VIEW IF EXISTS v_laundry_items CASCADE;
DROP VIEW IF EXISTS v_spa_services CASCADE;
DROP VIEW IF EXISTS v_qr_codes CASCADE;
DROP VIEW IF EXISTS v_notification_sounds CASCADE;
DROP VIEW IF EXISTS v_organizations CASCADE;
DROP VIEW IF EXISTS v_organization_members CASCADE;
DROP VIEW IF EXISTS v_organization_service_rules CASCADE;
DROP VIEW IF EXISTS v_organization_wallet_rules CASCADE;
DROP VIEW IF EXISTS v_platform_fee_ledger CASCADE;
DROP VIEW IF EXISTS v_platform_fee_configurations CASCADE;
DROP VIEW IF EXISTS v_hotel_audit_logs CASCADE;

-- =====================================================
-- CORE OPERATIONS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_bookings AS
SELECT *
FROM public.bookings
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_guests AS
SELECT *
FROM public.guests
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_rooms AS
SELECT *
FROM public.rooms
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_room_types AS
SELECT *
FROM public.room_types
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_room_status_history AS
SELECT *
FROM public.room_status_history
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_room_categories AS
SELECT *
FROM public.room_categories
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- REQUESTS & COMMUNICATIONS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_requests AS
SELECT *
FROM public.requests
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_guest_communications AS
SELECT *
FROM public.guest_communications
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_guest_feedback AS
SELECT *
FROM public.guest_feedback
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_guest_orders AS
SELECT *
FROM public.guest_orders
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- PAYMENTS & FINANCIALS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_payments AS
SELECT *
FROM public.payments
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_receivables AS
SELECT *
FROM public.receivables
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_stay_folios AS
SELECT *
FROM public.stay_folios
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_folio_transactions AS
SELECT *
FROM public.folio_transactions
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_wallets AS
SELECT *
FROM public.wallets
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_wallet_transactions AS
SELECT *
FROM public.wallet_transactions
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_booking_charges AS
SELECT *
FROM public.booking_charges
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_receipt_sequences AS
SELECT *
FROM public.receipt_sequences
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- FINANCE CENTER VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_finance_providers AS
SELECT *
FROM public.finance_providers
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_finance_locations AS
SELECT *
FROM public.finance_locations
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_finance_provider_rules AS
SELECT *
FROM public.finance_provider_rules
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_finance_reconciliation_records AS
SELECT *
FROM public.finance_reconciliation_records
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_finance_reconciliation_audit AS
SELECT *
FROM public.finance_reconciliation_audit
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_finance_analytics_snapshots AS
SELECT *
FROM public.finance_analytics_snapshots
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_finance_audit_events AS
SELECT *
FROM public.finance_audit_events
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- STAFF & PERMISSIONS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_staff AS
SELECT *
FROM public.staff
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_user_roles AS
SELECT *
FROM public.user_roles
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_navigation_items AS
SELECT *
FROM public.navigation_items
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_permissions AS
SELECT *
FROM public.hotel_permissions
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- HOTEL CONFIGURATION VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_hotel_branding AS
SELECT *
FROM public.hotel_branding
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_configurations AS
SELECT *
FROM public.hotel_configurations
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_meta AS
SELECT *
FROM public.hotel_meta
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_financials AS
SELECT *
FROM public.hotel_financials
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_payment_preferences AS
SELECT *
FROM public.hotel_payment_preferences
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_config_snapshots AS
SELECT *
FROM public.hotel_config_snapshots
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_domains AS
SELECT *
FROM public.hotel_domains
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_document_templates AS
SELECT *
FROM public.document_templates
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_email_settings AS
SELECT *
FROM public.email_settings
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_hotel_dashboard_defaults AS
SELECT *
FROM public.hotel_dashboard_defaults
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- INVENTORY & PROCUREMENT VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_inventory_items AS
SELECT *
FROM public.inventory_items
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_department_stock AS
SELECT *
FROM public.department_stock
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_department_requests AS
SELECT *
FROM public.department_requests
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT *
FROM public.purchase_orders
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_stock_movements AS
SELECT *
FROM public.stock_movements
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_suppliers AS
SELECT *
FROM public.suppliers
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- MENU & SERVICES VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_menu_items AS
SELECT *
FROM public.menu_items
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_laundry_items AS
SELECT *
FROM public.laundry_items
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_spa_services AS
SELECT *
FROM public.spa_services
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- QR SYSTEM VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_qr_codes AS
SELECT *
FROM public.qr_codes
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_notification_sounds AS
SELECT *
FROM public.notification_sounds
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- ORGANIZATIONS (B2B) VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_organizations AS
SELECT *
FROM public.organizations
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_organization_members AS
SELECT *
FROM public.organization_members
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_organization_service_rules AS
SELECT *
FROM public.organization_service_rules
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_organization_wallet_rules AS
SELECT *
FROM public.organization_wallet_rules
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- PLATFORM FEES VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_platform_fee_ledger AS
SELECT *
FROM public.platform_fee_ledger
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

CREATE OR REPLACE VIEW v_platform_fee_configurations AS
SELECT *
FROM public.platform_fee_configurations
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- AUDIT & LOGS VIEWS
-- =====================================================

CREATE OR REPLACE VIEW v_hotel_audit_logs AS
SELECT *
FROM public.hotel_audit_logs
WHERE tenant_id = (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1);

-- =====================================================
-- GRANT SELECT PERMISSIONS ON ALL VIEWS
-- =====================================================

GRANT SELECT ON v_bookings TO authenticated;
GRANT SELECT ON v_guests TO authenticated;
GRANT SELECT ON v_rooms TO authenticated;
GRANT SELECT ON v_room_types TO authenticated;
GRANT SELECT ON v_room_status_history TO authenticated;
GRANT SELECT ON v_room_categories TO authenticated;
GRANT SELECT ON v_requests TO authenticated;
GRANT SELECT ON v_guest_communications TO authenticated;
GRANT SELECT ON v_guest_feedback TO authenticated;
GRANT SELECT ON v_guest_orders TO authenticated;
GRANT SELECT ON v_payments TO authenticated;
GRANT SELECT ON v_receivables TO authenticated;
GRANT SELECT ON v_stay_folios TO authenticated;
GRANT SELECT ON v_folio_transactions TO authenticated;
GRANT SELECT ON v_wallets TO authenticated;
GRANT SELECT ON v_wallet_transactions TO authenticated;
GRANT SELECT ON v_booking_charges TO authenticated;
GRANT SELECT ON v_receipt_sequences TO authenticated;
GRANT SELECT ON v_finance_providers TO authenticated;
GRANT SELECT ON v_finance_locations TO authenticated;
GRANT SELECT ON v_finance_provider_rules TO authenticated;
GRANT SELECT ON v_finance_reconciliation_records TO authenticated;
GRANT SELECT ON v_finance_reconciliation_audit TO authenticated;
GRANT SELECT ON v_finance_analytics_snapshots TO authenticated;
GRANT SELECT ON v_finance_audit_events TO authenticated;
GRANT SELECT ON v_staff TO authenticated;
GRANT SELECT ON v_user_roles TO authenticated;
GRANT SELECT ON v_navigation_items TO authenticated;
GRANT SELECT ON v_hotel_permissions TO authenticated;
GRANT SELECT ON v_hotel_branding TO authenticated;
GRANT SELECT ON v_hotel_configurations TO authenticated;
GRANT SELECT ON v_hotel_meta TO authenticated;
GRANT SELECT ON v_hotel_financials TO authenticated;
GRANT SELECT ON v_hotel_payment_preferences TO authenticated;
GRANT SELECT ON v_hotel_config_snapshots TO authenticated;
GRANT SELECT ON v_hotel_domains TO authenticated;
GRANT SELECT ON v_document_templates TO authenticated;
GRANT SELECT ON v_email_settings TO authenticated;
GRANT SELECT ON v_hotel_dashboard_defaults TO authenticated;
GRANT SELECT ON v_inventory_items TO authenticated;
GRANT SELECT ON v_department_stock TO authenticated;
GRANT SELECT ON v_department_requests TO authenticated;
GRANT SELECT ON v_purchase_orders TO authenticated;
GRANT SELECT ON v_stock_movements TO authenticated;
GRANT SELECT ON v_suppliers TO authenticated;
GRANT SELECT ON v_menu_items TO authenticated;
GRANT SELECT ON v_laundry_items TO authenticated;
GRANT SELECT ON v_spa_services TO authenticated;
GRANT SELECT ON v_qr_codes TO authenticated;
GRANT SELECT ON v_notification_sounds TO authenticated;
GRANT SELECT ON v_organizations TO authenticated;
GRANT SELECT ON v_organization_members TO authenticated;
GRANT SELECT ON v_organization_service_rules TO authenticated;
GRANT SELECT ON v_organization_wallet_rules TO authenticated;
GRANT SELECT ON v_platform_fee_ledger TO authenticated;
GRANT SELECT ON v_platform_fee_configurations TO authenticated;
GRANT SELECT ON v_hotel_audit_logs TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON VIEW v_bookings IS 'Tenant-filtered view of bookings table';
COMMENT ON VIEW v_guests IS 'Tenant-filtered view of guests table';
COMMENT ON VIEW v_rooms IS 'Tenant-filtered view of rooms table';
COMMENT ON VIEW v_room_types IS 'Tenant-filtered view of room_types table';
COMMENT ON VIEW v_payments IS 'Tenant-filtered view of payments table';
COMMENT ON VIEW v_staff IS 'Tenant-filtered view of staff table';
COMMENT ON VIEW v_hotel_branding IS 'Tenant-filtered view of hotel_branding table';
COMMENT ON VIEW v_hotel_configurations IS 'Tenant-filtered view of hotel_configurations table';
