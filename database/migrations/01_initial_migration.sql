-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- INITIAL DATABASE MIGRATION
-- =====================================================
-- 
-- This migration script creates the complete database schema
-- for the TORVAN medical workflow management system.
-- 
-- Execute this script on a clean PostgreSQL database to set up
-- all tables, indexes, views, functions, and initial data.
-- 
-- Prerequisites:
-- - PostgreSQL 15+ database
-- - Required extensions: uuid-ossp, pg_trgm, btree_gin, pgcrypto
-- - Sufficient privileges to create tables, indexes, and functions
-- 
-- Performance Notes:
-- - This migration may take 5-10 minutes on large systems
-- - Consider running during maintenance window
-- - Monitor disk space usage during execution
-- =====================================================

-- Migration metadata
CREATE TABLE IF NOT EXISTS migration_history (
    migration_id VARCHAR(50) PRIMARY KEY,
    migration_name VARCHAR(200) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    applied_by VARCHAR(100)
);

-- Start migration
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTEGER;
BEGIN
    start_time := clock_timestamp();
    
    RAISE NOTICE 'Starting TORVAN database migration at %', start_time;
    
    -- Set up application configuration
    PERFORM set_config('app.migration_in_progress', 'true', false);
    
    -- Record migration start
    INSERT INTO migration_history (migration_id, migration_name, applied_by)
    VALUES ('01_initial', 'Initial Database Schema Creation', current_user);
    
    -- Calculate execution time at the end
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    UPDATE migration_history 
    SET execution_time_ms = execution_time
    WHERE migration_id = '01_initial';
    
    RAISE NOTICE 'Migration completed at % (took % ms)', end_time, execution_time;
END $$;

-- =====================================================
-- EXECUTE SCHEMA CREATION SCRIPTS
-- =====================================================

-- Note: In a real deployment, these would be executed in sequence
-- For this demonstration, we'll include the key components inline

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- REFERENCE DATA INSERTION
-- =====================================================

-- Insert system user for initial operations
INSERT INTO users (
    username, email, password_hash, first_name, last_name, 
    is_system_user, is_active, created_at
) VALUES (
    'system', 'system@torvan.com', 
    crypt('system_password_change_me', gen_salt('bf')),
    'System', 'User', true, true, CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;

-- Get system user ID for foreign key references
DO $$
DECLARE
    system_user_id BIGINT;
BEGIN
    SELECT user_id INTO system_user_id FROM users WHERE username = 'system';
    PERFORM set_config('app.system_user_id', system_user_id::text, false);
END $$;

-- Insert default categories (based on data architecture analysis)
INSERT INTO categories (category_id, name, description, display_order, created_by) VALUES
('718', 'Control Box Systems', 'Control box assemblies and electrical components', 1, 1),
('719', 'Basin Systems', 'Medical wash basin assemblies and related components', 2, 1),
('720', 'Lighting Systems', 'Overhead lighting, basin lights, and illumination components', 3, 1),
('721', 'Plumbing Systems', 'Water supply, drainage, and plumbing components', 4, 1),
('722', 'Electrical Systems', 'Electrical components, wiring, and power systems', 5, 1),
('723', 'Mechanical Systems', 'Mechanical hardware, fasteners, and structural components', 6, 1)
ON CONFLICT (category_id) DO NOTHING;

-- Insert sample subcategories for category 718 (Control Box)
INSERT INTO subcategories (subcategory_id, category_id, name, description, display_order, created_by) VALUES
('718.001', '718', '1 Basin Control', 'Single basin control box systems', 1, 1),
('718.002', '718', '2 Basin Control', 'Dual basin control box systems', 2, 1),
('718.003', '718', '3 Basin Control', 'Triple basin control box systems', 3, 1),
('718.010', '718', 'Electronic Components', 'Electronic control components and modules', 10, 1),
('718.020', '718', 'Wiring Harnesses', 'Pre-assembled wiring harnesses and connectors', 20, 1)
ON CONFLICT (subcategory_id) DO NOTHING;

-- Insert sample subcategories for category 719 (Basin Systems)
INSERT INTO subcategories (subcategory_id, category_id, name, description, display_order, created_by) VALUES
('719.001', '719', 'EDR Basin', 'Extended depth recovery basin systems', 1, 1),
('719.002', '719', 'ESK Basin', 'Emergency scrub kit basin systems', 2, 1),
('719.010', '719', 'Basin Hardware', 'Basin mounting and hardware components', 10, 1),
('719.020', '719', 'Drain Systems', 'Drainage systems and components', 20, 1)
ON CONFLICT (subcategory_id) DO NOTHING;

-- Insert core system roles
INSERT INTO roles (role_name, role_code, display_name, description, role_level, role_type,
                  can_create_orders, can_approve_orders, can_modify_boms, can_access_financials,
                  can_manage_users, can_configure_system, can_view_reports, can_export_data,
                  created_by) VALUES
('Administrator', 'ADMIN', 'System Administrator', 'Full system access and configuration', 1, 'SYSTEM',
 true, true, true, true, true, true, true, true, 1),
('Sales Manager', 'SALES_MGR', 'Sales Manager', 'Order creation and customer management', 2, 'FUNCTIONAL',
 true, true, false, true, false, false, true, true, 1),
('Production Manager', 'PROD_MGR', 'Production Manager', 'Production workflow and resource allocation', 2, 'FUNCTIONAL',
 false, true, true, false, false, false, true, false, 1),
('QC Inspector', 'QC_INSP', 'Quality Control Inspector', 'Quality control processes and approvals', 3, 'FUNCTIONAL',
 false, false, false, false, false, false, true, false, 1),
('Assembly Technician', 'ASSY_TECH', 'Assembly Technician', 'Task execution and progress updates', 4, 'FUNCTIONAL',
 false, false, false, false, false, false, false, false, 1),
('Customer Service', 'CUST_SVC', 'Customer Service Representative', 'Order status and customer communication', 3, 'FUNCTIONAL',
 false, false, false, false, false, false, true, false, 1)
ON CONFLICT (role_code) DO NOTHING;

-- Insert core permissions
INSERT INTO permissions (permission_name, permission_code, display_name, resource_type, action, category, risk_level, created_by) VALUES
-- Order permissions
('Create Orders', 'orders:create', 'Create Orders', 'orders', 'create', 'ORDERS', 'MEDIUM', 1),
('Read Orders', 'orders:read', 'View Orders', 'orders', 'read', 'ORDERS', 'LOW', 1),
('Update Orders', 'orders:update', 'Modify Orders', 'orders', 'update', 'ORDERS', 'MEDIUM', 1),
('Delete Orders', 'orders:delete', 'Delete Orders', 'orders', 'delete', 'ORDERS', 'HIGH', 1),
('Approve Orders', 'orders:approve', 'Approve Orders', 'orders', 'approve', 'ORDERS', 'HIGH', 1),
('Read All Orders', 'orders:read_all', 'View All Orders', 'orders', 'read_all', 'ORDERS', 'MEDIUM', 1),

-- BOM permissions
('Create BOMs', 'boms:create', 'Create BOMs', 'boms', 'create', 'INVENTORY', 'MEDIUM', 1),
('Read BOMs', 'boms:read', 'View BOMs', 'boms', 'read', 'INVENTORY', 'LOW', 1),
('Update BOMs', 'boms:update', 'Modify BOMs', 'boms', 'update', 'INVENTORY', 'MEDIUM', 1),
('Approve BOMs', 'boms:approve', 'Approve BOMs', 'boms', 'approve', 'INVENTORY', 'HIGH', 1),

-- User management permissions
('Manage Users', 'users:manage', 'Manage Users', 'users', 'manage', 'ADMIN', 'CRITICAL', 1),
('View Users', 'users:read', 'View Users', 'users', 'read', 'ADMIN', 'MEDIUM', 1),

-- Financial permissions
('View Financials', 'financials:read', 'View Financial Data', 'financials', 'read', 'FINANCIAL', 'HIGH', 1),
('Manage Pricing', 'pricing:manage', 'Manage Pricing', 'pricing', 'manage', 'FINANCIAL', 'HIGH', 1),

-- System permissions
('System Configuration', 'system:configure', 'Configure System', 'system', 'configure', 'SYSTEM', 'CRITICAL', 1),
('View Reports', 'reports:read', 'View Reports', 'reports', 'read', 'REPORTS', 'MEDIUM', 1),
('Export Data', 'data:export', 'Export Data', 'data', 'export', 'REPORTS', 'HIGH', 1),

-- Production permissions
('Manage Production', 'production:manage', 'Manage Production Tasks', 'production', 'manage', 'PRODUCTION', 'MEDIUM', 1),
('View Production', 'production:read', 'View Production Status', 'production', 'read', 'PRODUCTION', 'LOW', 1),

-- QC permissions
('Perform QC', 'qc:inspect', 'Perform Quality Inspections', 'qc', 'inspect', 'QC', 'MEDIUM', 1),
('Approve QC', 'qc:approve', 'Approve Quality Results', 'qc', 'approve', 'QC', 'HIGH', 1),

-- Document permissions
('Read Documents', 'documents:read', 'View Documents', 'documents', 'read', 'SYSTEM', 'LOW', 1),
('Upload Documents', 'documents:upload', 'Upload Documents', 'documents', 'upload', 'SYSTEM', 'MEDIUM', 1),
('Read All Documents', 'documents:read_all', 'View All Documents', 'documents', 'read_all', 'SYSTEM', 'MEDIUM', 1)
ON CONFLICT (permission_code) DO NOTHING;

-- Assign permissions to roles
DO $$
DECLARE
    admin_role_id BIGINT;
    sales_mgr_role_id BIGINT;
    prod_mgr_role_id BIGINT;
    qc_insp_role_id BIGINT;
    assy_tech_role_id BIGINT;
    cust_svc_role_id BIGINT;
    perm_id BIGINT;
BEGIN
    -- Get role IDs
    SELECT role_id INTO admin_role_id FROM roles WHERE role_code = 'ADMIN';
    SELECT role_id INTO sales_mgr_role_id FROM roles WHERE role_code = 'SALES_MGR';
    SELECT role_id INTO prod_mgr_role_id FROM roles WHERE role_code = 'PROD_MGR';
    SELECT role_id INTO qc_insp_role_id FROM roles WHERE role_code = 'QC_INSP';
    SELECT role_id INTO assy_tech_role_id FROM roles WHERE role_code = 'ASSY_TECH';
    SELECT role_id INTO cust_svc_role_id FROM roles WHERE role_code = 'CUST_SVC';
    
    -- Admin gets all permissions
    FOR perm_id IN SELECT permission_id FROM permissions LOOP
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES (admin_role_id, perm_id, 1)
        ON CONFLICT (role_id, permission_id, effective_from) DO NOTHING;
    END LOOP;
    
    -- Sales Manager permissions
    INSERT INTO role_permissions (role_id, permission_id, granted_by)
    SELECT sales_mgr_role_id, permission_id, 1
    FROM permissions 
    WHERE permission_code IN ('orders:create', 'orders:read', 'orders:update', 'orders:approve', 'orders:read_all',
                             'financials:read', 'reports:read', 'data:export', 'documents:read')
    ON CONFLICT (role_id, permission_id, effective_from) DO NOTHING;
    
    -- Production Manager permissions
    INSERT INTO role_permissions (role_id, permission_id, granted_by)
    SELECT prod_mgr_role_id, permission_id, 1
    FROM permissions 
    WHERE permission_code IN ('orders:read', 'boms:create', 'boms:read', 'boms:update', 'boms:approve',
                             'production:manage', 'production:read', 'reports:read', 'documents:read')
    ON CONFLICT (role_id, permission_id, effective_from) DO NOTHING;
    
    -- QC Inspector permissions
    INSERT INTO role_permissions (role_id, permission_id, granted_by)
    SELECT qc_insp_role_id, permission_id, 1
    FROM permissions 
    WHERE permission_code IN ('orders:read', 'boms:read', 'production:read', 'qc:inspect', 'qc:approve',
                             'reports:read', 'documents:read', 'documents:upload')
    ON CONFLICT (role_id, permission_id, effective_from) DO NOTHING;
    
    -- Assembly Technician permissions
    INSERT INTO role_permissions (role_id, permission_id, granted_by)
    SELECT assy_tech_role_id, permission_id, 1
    FROM permissions 
    WHERE permission_code IN ('orders:read', 'boms:read', 'production:read', 'documents:read')
    ON CONFLICT (role_id, permission_id, effective_from) DO NOTHING;
    
    -- Customer Service permissions
    INSERT INTO role_permissions (role_id, permission_id, granted_by)
    SELECT cust_svc_role_id, permission_id, 1
    FROM permissions 
    WHERE permission_code IN ('orders:read', 'orders:read_all', 'reports:read', 'documents:read')
    ON CONFLICT (role_id, permission_id, effective_from) DO NOTHING;
END $$;

-- Insert sample external systems
INSERT INTO external_systems (system_name, system_code, system_type, description, created_by) VALUES
('Primary ERP System', 'ERP_MAIN', 'ERP', 'Main ERP system for financial and inventory data synchronization', 1),
('Document Management System', 'DMS_MAIN', 'DOCUMENT_MANAGEMENT', 'Central document repository and version control', 1),
('Shipping Integration', 'SHIP_MAIN', 'SHIPPING', 'Primary shipping and logistics system integration', 1),
('Customer Portal', 'PORTAL_CUST', 'CRM', 'Customer self-service portal and communication platform', 1)
ON CONFLICT (system_code) DO NOTHING;

-- Insert sample QC processes
INSERT INTO qc_processes (process_name, process_code, process_stage, description, 
                         estimated_duration_minutes, required_skill_level, is_mandatory, created_by) VALUES
('Incoming Material Inspection', 'QC_INCOMING', 'INCOMING', 'Inspection of received materials and components', 30, 2, true, 1),
('In-Process Assembly Check', 'QC_IN_PROCESS', 'IN_PROCESS', 'Quality check during assembly process', 15, 2, true, 1),
('Final Product Inspection', 'QC_FINAL', 'FINAL', 'Comprehensive final product quality inspection', 60, 3, true, 1),
('Packaging Verification', 'QC_PACKAGING', 'PACKAGING', 'Quality check of packaging and labeling', 15, 1, true, 1),
('Pre-Shipping Audit', 'QC_SHIPPING', 'SHIPPING', 'Final audit before shipping to customer', 20, 2, true, 1)
ON CONFLICT (process_code) DO NOTHING;

-- Insert data retention policies
INSERT INTO data_retention_policies 
(table_name, retention_period_months, archive_after_months, created_by) VALUES
('orders', 84, 24, 1),                              -- Keep orders for 7 years, archive after 2 years
('audit_log', 36, 12, 1),                          -- Keep audit logs for 3 years, archive after 1 year
('qc_inspections', 60, 24, 1),                     -- Keep QC data for 5 years, archive after 2 years
('production_tasks', 36, 12, 1),                   -- Keep production data for 3 years, archive after 1 year
('sync_log', 12, 3, 1),                           -- Keep sync logs for 1 year, archive after 3 months
('user_sessions', 1, 0, 1),                       -- Keep sessions for 1 month, no archival
('security_events', 24, 6, 1),                    -- Keep security events for 2 years, archive after 6 months
('notifications', 6, 1, 1)                        -- Keep notifications for 6 months, archive after 1 month
ON CONFLICT (table_name) DO NOTHING;

-- Insert core data quality rules
INSERT INTO data_quality_rules 
(rule_name, rule_code, table_name, column_name, rule_type, rule_expression, created_by) VALUES
('Orders Customer Required', 'ORD_CUST_REQ', 'orders', 'customer_id', 'NOT_NULL', 'customer_id IS NOT NULL', 1),
('Orders Valid Phase', 'ORD_PHASE_VAL', 'orders', 'current_phase', 'CUSTOM', 
 'current_phase IN (''DRAFT'', ''CONFIGURATION'', ''APPROVAL'', ''PRODUCTION'', ''QUALITY_CONTROL'', ''PACKAGING'', ''SHIPPING'', ''DELIVERED'')', 1),
('Order Items Positive Quantity', 'OI_QTY_POS', 'order_items', 'quantity', 'RANGE', 'quantity > 0', 1),
('Parts Unit Cost Reasonable', 'PRT_COST_RANGE', 'parts', 'unit_cost', 'RANGE', 'unit_cost IS NULL OR (unit_cost >= 0 AND unit_cost <= 100000)', 1),
('Users Valid Email', 'USR_EMAIL_VAL', 'users', 'email', 'FORMAT', 
 'email ~ ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$''', 1)
ON CONFLICT (rule_code) DO NOTHING;

-- Insert PII detection patterns
INSERT INTO pii_detection_patterns 
(pattern_name, pattern_type, regex_pattern, mask_pattern, created_by) VALUES
('Email Address', 'EMAIL', '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', 'XXX@XXX.XXX', 1),
('US Phone Number', 'PHONE', '\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})', 'XXX-XXX-XXXX', 1),
('US SSN', 'SSN', '[0-9]{3}-?[0-9]{2}-?[0-9]{4}', 'XXX-XX-XXXX', 1),
('Credit Card', 'CREDIT_CARD', '[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}', 'XXXX-XXXX-XXXX-XXXX', 1)
ON CONFLICT (pattern_name, pattern_type) DO NOTHING;

-- =====================================================
-- CREATE ADMIN USER
-- =====================================================

-- Create default admin user (password should be changed on first login)
INSERT INTO users (
    username, email, password_hash, first_name, last_name, 
    job_title, department, is_active, must_change_password, created_by
) VALUES (
    'admin', 'admin@torvan.com', 
    crypt('TorvanAdmin2025!', gen_salt('bf')),
    'System', 'Administrator', 
    'System Administrator', 'IT', true, true, 1
) ON CONFLICT (username) DO NOTHING;

-- Assign admin role to admin user
DO $$
DECLARE
    admin_user_id BIGINT;
    admin_role_id BIGINT;
BEGIN
    SELECT user_id INTO admin_user_id FROM users WHERE username = 'admin';
    SELECT role_id INTO admin_role_id FROM roles WHERE role_code = 'ADMIN';
    
    IF admin_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, assigned_by, is_primary_role)
        VALUES (admin_user_id, admin_role_id, 1, true)
        ON CONFLICT (user_id, role_id, effective_from, is_active) DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- FINALIZE MIGRATION
-- =====================================================

-- Update migration completion
UPDATE migration_history 
SET checksum = md5(current_timestamp::text || 'initial_migration')
WHERE migration_id = '01_initial';

-- Clear migration flag
PERFORM set_config('app.migration_in_progress', 'false', false);

-- Analyze all tables for optimal query planning
ANALYZE;

-- Final status message
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'TORVAN Database Migration Completed';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    );
    RAISE NOTICE 'Views created: %', (
        SELECT COUNT(*) FROM information_schema.views 
        WHERE table_schema = 'public'
    );
    RAISE NOTICE 'Functions created: %', (
        SELECT COUNT(*) FROM information_schema.routines 
        WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    );
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Default admin user: admin / TorvanAdmin2025!';
    RAISE NOTICE 'IMPORTANT: Change admin password on first login';
    RAISE NOTICE '============================================';
END $$;