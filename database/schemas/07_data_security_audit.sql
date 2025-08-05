-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- DATA SECURITY & AUDIT SCHEMA
-- =====================================================
-- 
-- This schema implements comprehensive data security and audit features:
-- - Row-level security (RLS) policies
-- - Column-level encryption for sensitive data
-- - Automatic audit triggers for all tables
-- - Data retention and archival policies
-- - Data quality monitoring and validation
-- - Security event logging and alerting
-- 
-- Key Features:
-- - GDPR/CCPA compliance support
-- - Automatic PII detection and protection
-- - Comprehensive audit trail
-- - Data retention policy enforcement
-- - Security breach detection and response
-- 
-- Performance Targets:
-- - Security policy checks: <10ms overhead
-- - Audit log queries: <1s for recent data
-- - Data quality checks: <30s for full validation
-- =====================================================

-- Enable required extensions for security
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- ENCRYPTION FUNCTIONS
-- =====================================================
-- Centralized encryption/decryption functions

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data text)
RETURNS bytea AS
$$
BEGIN
    -- Use application-level encryption key from environment
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data bytea)
RETURNS text AS
$$
BEGIN
    -- Decrypt using application-level encryption key
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key', true));
EXCEPTION
    WHEN OTHERS THEN
        -- Return null if decryption fails
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_id_param BIGINT, permission_code_param VARCHAR)
RETURNS BOOLEAN AS
$$
DECLARE
    permission_exists BOOLEAN DEFAULT false;
BEGIN
    -- Check if user has the specified permission through their roles
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE ur.user_id = user_id_param
          AND p.permission_code = permission_code_param
          AND ur.is_active = true
          AND ur.effective_from <= CURRENT_DATE
          AND (ur.effective_until IS NULL OR ur.effective_until >= CURRENT_DATE)
          AND rp.is_active = true
          AND p.is_active = true
    ) INTO permission_exists;
    
    RETURN permission_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(user_id_param BIGINT, role_code_param VARCHAR)
RETURNS BOOLEAN AS
$$
DECLARE
    role_exists BOOLEAN DEFAULT false;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.role_id
        WHERE ur.user_id = user_id_param
          AND r.role_code = role_code_param
          AND ur.is_active = true
          AND ur.effective_from <= CURRENT_DATE
          AND (ur.effective_until IS NULL OR ur.effective_until >= CURRENT_DATE)
          AND r.is_active = true
    ) INTO role_exists;
    
    RETURN role_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID from session
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS BIGINT AS
$$
BEGIN
    -- Get user ID from application context
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::BIGINT,
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Orders access policy
CREATE POLICY orders_access_policy ON orders
    FOR ALL TO public
    USING (
        -- Users can access orders they created, are assigned to, or are sales rep for
        created_by = current_user_id() OR 
        assigned_to = current_user_id() OR
        sales_rep_id = current_user_id() OR
        -- Or if they have admin or sales manager role
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'SALES_MGR') OR
        has_role(current_user_id(), 'PROD_MGR') OR
        -- Or if they have specific order access permission
        has_permission(current_user_id(), 'orders:read_all')
    );

-- Customers access policy
CREATE POLICY customers_access_policy ON customers
    FOR ALL TO public
    USING (
        -- Sales and admin can access all customers
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'SALES_MGR') OR
        has_role(current_user_id(), 'CUST_SVC') OR
        -- Others can only access customers from their orders
        customer_id IN (
            SELECT customer_id FROM orders 
            WHERE created_by = current_user_id() OR assigned_to = current_user_id()
        )
    );

-- Order items access policy  
CREATE POLICY order_items_access_policy ON order_items
    FOR ALL TO public
    USING (
        -- Access based on order access
        order_id IN (
            SELECT order_id FROM orders 
            WHERE created_by = current_user_id() OR 
                  assigned_to = current_user_id() OR
                  sales_rep_id = current_user_id() OR
                  has_role(current_user_id(), 'ADMIN') OR
                  has_role(current_user_id(), 'SALES_MGR') OR
                  has_role(current_user_id(), 'PROD_MGR')
        )
    );

-- BOMs access policy
CREATE POLICY boms_access_policy ON boms
    FOR ALL TO public
    USING (
        -- BOM creators, approvers, and users with BOM permissions
        generated_by = current_user_id() OR
        approved_by = current_user_id() OR
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'PROD_MGR') OR
        has_permission(current_user_id(), 'boms:read')
    );

-- Configurations access policy
CREATE POLICY configurations_access_policy ON configurations
    FOR ALL TO public
    USING (
        -- Configuration creators, approvers, and related order access
        created_by = current_user_id() OR
        approved_by = current_user_id() OR
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'SALES_MGR') OR
        has_role(current_user_id(), 'PROD_MGR') OR
        -- Or if they have access to the related order
        order_item_id IN (
            SELECT oi.item_id FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.created_by = current_user_id() OR o.assigned_to = current_user_id()
        )
    );

-- Production tasks access policy
CREATE POLICY production_tasks_access_policy ON production_tasks
    FOR ALL TO public
    USING (
        -- Assigned workers, supervisors, and production managers
        assigned_to = current_user_id() OR
        backup_assigned_to = current_user_id() OR
        created_by = current_user_id() OR
        supervisor_approved_by = current_user_id() OR
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'PROD_MGR') OR
        has_role(current_user_id(), 'ASSY_TECH')
    );

-- QC inspections access policy
CREATE POLICY qc_inspections_access_policy ON qc_inspections
    FOR ALL TO public
    USING (
        -- Inspectors, approvers, and QC managers
        inspector_id = current_user_id() OR
        backup_inspector_id = current_user_id() OR
        approved_by = current_user_id() OR
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'QC_INSP') OR
        has_role(current_user_id(), 'PROD_MGR')
    );

-- Documents access policy
CREATE POLICY documents_access_policy ON documents
    FOR ALL TO public
    USING (
        -- Document owners, uploaders, and based on access level
        owner_id = current_user_id() OR
        uploaded_by = current_user_id() OR
        approved_by = current_user_id() OR
        access_level = 'PUBLIC' OR
        (access_level = 'INTERNAL' AND current_user_id() > 0) OR
        has_role(current_user_id(), 'ADMIN') OR
        has_permission(current_user_id(), 'documents:read_all')
    );

-- =====================================================
-- AUDIT TRIGGER FUNCTION
-- =====================================================
-- Comprehensive audit logging for all table changes

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS
$$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_cols TEXT[];
    user_id_val BIGINT;
    session_id_val VARCHAR(128);
    ip_address_val INET;
    table_classification VARCHAR(20) DEFAULT 'INTERNAL';
BEGIN
    -- Get user context
    user_id_val := COALESCE(current_setting('app.current_user_id', true)::BIGINT, 0);
    session_id_val := current_setting('app.session_id', true);
    ip_address_val := inet_client_addr();
    
    -- Determine data classification based on table
    table_classification := CASE TG_TABLE_NAME
        WHEN 'customers' THEN 'RESTRICTED'
        WHEN 'users' THEN 'RESTRICTED'
        WHEN 'user_sessions' THEN 'CONFIDENTIAL'
        WHEN 'security_events' THEN 'RESTRICTED'
        WHEN 'audit_log' THEN 'RESTRICTED'
        ELSE 'INTERNAL'
    END;
    
    -- Process based on operation
    IF TG_OP = 'UPDATE' THEN
        -- Find changed columns
        SELECT array_agg(key ORDER BY key) INTO changed_cols
        FROM jsonb_each_text(to_jsonb(NEW))
        WHERE value IS DISTINCT FROM jsonb_extract_path_text(to_jsonb(OLD), key);
        
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        
    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log (
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values, 
        changed_columns, 
        user_id, 
        username,
        user_ip, 
        session_id,
        data_classification,
        additional_info
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(
            (NEW ->> CASE TG_TABLE_NAME
                WHEN 'orders' THEN 'order_id'
                WHEN 'customers' THEN 'customer_id'
                WHEN 'users' THEN 'user_id'
                WHEN 'parts' THEN 'part_id'
                WHEN 'assemblies' THEN 'assembly_id'
                ELSE 'id'
            END),
            (OLD ->> CASE TG_TABLE_NAME
                WHEN 'orders' THEN 'order_id'
                WHEN 'customers' THEN 'customer_id'
                WHEN 'users' THEN 'user_id'
                WHEN 'parts' THEN 'part_id'
                WHEN 'assemblies' THEN 'assembly_id'
                ELSE 'id'
            END),
            'unknown'
        ),
        TG_OP,
        old_data,
        new_data,
        changed_cols,
        user_id_val,
        current_setting('app.current_username', true),
        ip_address_val,
        session_id_val,
        table_classification,
        jsonb_build_object(
            'trigger_name', TG_NAME,
            'table_schema', TG_TABLE_SCHEMA,
            'operation_time', CURRENT_TIMESTAMP,
            'statement_type', TG_WHEN
        )
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to all major tables
DO $$
DECLARE
    table_name TEXT;
    audit_tables TEXT[] := ARRAY[
        'users', 'roles', 'user_roles', 'permissions', 'role_permissions',
        'customers', 'orders', 'order_items', 'order_status_history',
        'categories', 'subcategories', 'assemblies', 'parts', 'assembly_components',
        'configurations', 'boms', 'bom_line_items', 'configuration_rules',
        'qc_processes', 'qc_inspections', 'qc_inspection_items',
        'production_tasks', 'production_resources',
        'external_systems', 'documents'
    ];
BEGIN
    FOREACH table_name IN ARRAY audit_tables
    LOOP
        -- Skip if table doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            CONTINUE;
        END IF;
        
        -- Create trigger
        EXECUTE format('
            CREATE TRIGGER audit_%I 
            AFTER INSERT OR UPDATE OR DELETE ON %I
            FOR EACH ROW EXECUTE FUNCTION audit_trigger()
        ', table_name, table_name);
    END LOOP;
END $$;

-- =====================================================
-- DATA RETENTION AND ARCHIVAL
-- =====================================================

-- Data retention policies table
CREATE TABLE data_retention_policies (
    policy_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    retention_period_months INTEGER NOT NULL,
    archive_after_months INTEGER,
    
    -- Retention Criteria
    retention_criteria JSONB,                      -- Additional criteria for retention
    date_column VARCHAR(100) DEFAULT 'created_at', -- Column to use for date comparison
    
    -- Archival Configuration
    archive_to_cold_storage BOOLEAN DEFAULT false,
    cold_storage_location VARCHAR(500),
    archive_table_suffix VARCHAR(20) DEFAULT '_archive',
    
    -- Deletion Configuration
    hard_delete_after_archive BOOLEAN DEFAULT false,
    hard_delete_after_months INTEGER,
    
    -- Policy Status
    is_active BOOLEAN DEFAULT true,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_data_retention_policies_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_retention_periods_positive 
        CHECK (retention_period_months > 0 AND 
               (archive_after_months IS NULL OR archive_after_months > 0) AND
               (hard_delete_after_months IS NULL OR hard_delete_after_months > retention_period_months))
);

-- Define retention policies for major tables
INSERT INTO data_retention_policies 
(table_name, retention_period_months, archive_after_months, created_by) VALUES
('orders', 84, 24, 1),                              -- Keep orders for 7 years, archive after 2 years
('audit_log', 36, 12, 1),                          -- Keep audit logs for 3 years, archive after 1 year
('qc_inspections', 60, 24, 1),                     -- Keep QC data for 5 years, archive after 2 years
('production_tasks', 36, 12, 1),                   -- Keep production data for 3 years, archive after 1 year
('sync_log', 12, 3, 1),                           -- Keep sync logs for 1 year, archive after 3 months
('user_sessions', 1, 0, 1),                       -- Keep sessions for 1 month, no archival
('security_events', 24, 6, 1),                    -- Keep security events for 2 years, archive after 6 months
('notifications', 6, 1, 1);                       -- Keep notifications for 6 months, archive after 1 month

-- Function to execute retention policies
CREATE OR REPLACE FUNCTION execute_retention_policy(policy_id_param BIGINT)
RETURNS JSONB AS
$$  
DECLARE
    policy RECORD;
    archive_date DATE;
    delete_date DATE;
    archive_count INTEGER := 0;
    delete_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Get policy details
    SELECT * INTO policy 
    FROM data_retention_policies 
    WHERE policy_id = policy_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Policy not found or inactive');
    END IF;
    
    -- Calculate dates
    archive_date := CURRENT_DATE - (policy.archive_after_months || ' months')::INTERVAL;
    delete_date := CURRENT_DATE - (policy.retention_period_months || ' months')::INTERVAL;
    
    -- Archive old records if archival is enabled
    IF policy.archive_after_months IS NOT NULL THEN
        -- Create archive table if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I (LIKE %I INCLUDING ALL)
        ', policy.table_name || policy.archive_table_suffix, policy.table_name);
        
        -- Move records to archive
        EXECUTE format('
            WITH moved_rows AS (
                DELETE FROM %I 
                WHERE %I < %L
                  AND %I >= %L
                RETURNING *
            )
            INSERT INTO %I SELECT * FROM moved_rows
        ', policy.table_name, policy.date_column, archive_date, 
           policy.date_column, delete_date,
           policy.table_name || policy.archive_table_suffix);
        
        GET DIAGNOSTICS archive_count = ROW_COUNT;
    END IF;
    
    -- Delete old records
    EXECUTE format('
        DELETE FROM %I WHERE %I < %L
    ', policy.table_name, policy.date_column, delete_date);
    
    GET DIAGNOSTICS delete_count = ROW_COUNT;
    
    -- Update policy execution timestamp
    UPDATE data_retention_policies 
    SET last_executed_at = CURRENT_TIMESTAMP,
        next_execution_at = CURRENT_TIMESTAMP + INTERVAL '1 month'
    WHERE policy_id = policy_id_param;
    
    -- Return results
    result := jsonb_build_object(
        'policy_id', policy_id_param,
        'table_name', policy.table_name,
        'archived_records', archive_count,
        'deleted_records', delete_count,
        'archive_date', archive_date,
        'delete_date', delete_date,
        'executed_at', CURRENT_TIMESTAMP
    );
    
    -- Log the retention execution
    INSERT INTO audit_log (table_name, record_id, action, additional_info)
    VALUES ('data_retention_policies', policy_id_param::text, 'RETENTION_EXECUTED', result);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATA QUALITY MONITORING
-- =====================================================

-- Data quality rules table
CREATE TABLE data_quality_rules (
    rule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100),
    
    -- Rule Definition
    rule_type VARCHAR(30) NOT NULL,
    CHECK (rule_type IN ('NOT_NULL', 'UNIQUE', 'RANGE', 'FORMAT', 'REFERENCE', 'CUSTOM', 'COMPLETENESS')),
    rule_expression TEXT,                           -- SQL expression for the rule
    expected_values JSONB,                          -- Expected values or ranges
    
    -- Quality Thresholds
    warning_threshold DECIMAL(5,2) DEFAULT 95.0,   -- % threshold for warnings
    error_threshold DECIMAL(5,2) DEFAULT 90.0,     -- % threshold for errors
    
    -- Rule Configuration
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    is_blocking BOOLEAN DEFAULT false,              -- Blocks operations if fails
    
    -- Execution Configuration
    execution_frequency VARCHAR(20) DEFAULT 'DAILY',
    CHECK (execution_frequency IN ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'ON_DEMAND')),
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_data_quality_rules_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_dq_rules_thresholds_valid 
        CHECK (warning_threshold BETWEEN 0 AND 100 AND 
               error_threshold BETWEEN 0 AND 100 AND
               error_threshold <= warning_threshold)
);

-- Data quality results table
CREATE TABLE data_quality_results (
    result_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_id BIGINT NOT NULL,
    
    -- Test Results
    total_records INTEGER NOT NULL,
    passed_records INTEGER NOT NULL,
    failed_records INTEGER NOT NULL,
    pass_percentage DECIMAL(5,2) NOT NULL,
    
    -- Quality Status
    quality_status VARCHAR(20) NOT NULL,
    CHECK (quality_status IN ('PASS', 'WARNING', 'ERROR', 'CRITICAL')),
    
    -- Execution Details
    execution_time_ms INTEGER,
    test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Failed Records Sample (for analysis)
    failed_record_sample JSONB,                    -- Sample of failed records
    error_details TEXT,
    
    -- Metadata
    executed_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_dq_results_rule 
        FOREIGN KEY (rule_id) 
        REFERENCES data_quality_rules(rule_id),
    CONSTRAINT fk_dq_results_executed_by 
        FOREIGN KEY (executed_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_dq_results_records_valid 
        CHECK (total_records >= 0 AND passed_records >= 0 AND failed_records >= 0 AND
               passed_records + failed_records = total_records)
);

-- Indexes for data quality tables
CREATE INDEX idx_dq_rules_table ON data_quality_rules(table_name);
CREATE INDEX idx_dq_rules_active ON data_quality_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_dq_rules_next_execution ON data_quality_rules(next_execution_at) WHERE is_active = true;
CREATE INDEX idx_dq_results_rule ON data_quality_results(rule_id);
CREATE INDEX idx_dq_results_timestamp ON data_quality_results(test_timestamp DESC);
CREATE INDEX idx_dq_results_status ON data_quality_results(quality_status);

-- Define core data quality rules
INSERT INTO data_quality_rules 
(rule_name, rule_code, table_name, column_name, rule_type, rule_expression, created_by) VALUES
('Orders Customer Required', 'ORD_CUST_REQ', 'orders', 'customer_id', 'NOT_NULL', 'customer_id IS NOT NULL', 1),
('Orders Valid Phase', 'ORD_PHASE_VAL', 'orders', 'current_phase', 'CUSTOM', 
 'current_phase IN (''DRAFT'', ''CONFIGURATION'', ''APPROVAL'', ''PRODUCTION'', ''QUALITY_CONTROL'', ''PACKAGING'', ''SHIPPING'', ''DELIVERED'')', 1),
('Order Items Positive Quantity', 'OI_QTY_POS', 'order_items', 'quantity', 'RANGE', 'quantity > 0', 1),
('Parts Unit Cost Reasonable', 'PRT_COST_RANGE', 'parts', 'unit_cost', 'RANGE', 'unit_cost IS NULL OR (unit_cost >= 0 AND unit_cost <= 100000)', 1),
('Users Valid Email', 'USR_EMAIL_VAL', 'users', 'email', 'FORMAT', 
 'email ~ ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$''', 1),
('BOM Line Items Valid Component', 'BOM_COMP_VAL', 'bom_line_items', 'component_id', 'REFERENCE', 
 '(component_type = ''PART'' AND component_id IN (SELECT part_id FROM parts)) OR (component_type = ''ASSEMBLY'' AND component_id IN (SELECT assembly_id FROM assemblies))', 1);

-- =====================================================
-- PII DETECTION AND PROTECTION
-- =====================================================

-- PII detection patterns table
CREATE TABLE pii_detection_patterns (
    pattern_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    CHECK (pattern_type IN ('EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'ADDRESS', 'NAME', 'CUSTOM')),
    
    -- Pattern Definition
    regex_pattern TEXT NOT NULL,
    confidence_level VARCHAR(20) DEFAULT 'MEDIUM',
    CHECK (confidence_level IN ('LOW', 'MEDIUM', 'HIGH')),
    
    -- Actions
    mask_pattern VARCHAR(100),                      -- How to mask the data
    encrypt_data BOOLEAN DEFAULT false,
    alert_on_detection BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    
    CONSTRAINT fk_pii_patterns_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id)
);

-- PII scan results table
CREATE TABLE pii_scan_results (
    scan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    pattern_id BIGINT NOT NULL,
    
    -- Detection Results
    matches_found INTEGER NOT NULL DEFAULT 0,
    sample_matches JSONB,                          -- Sample of matches found
    confidence_score DECIMAL(5,2),                 -- 0-100 confidence
    
    -- Scan Information
    scan_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    records_scanned INTEGER,
    scan_duration_ms INTEGER,
    
    -- Actions Taken
    data_masked BOOLEAN DEFAULT false,
    data_encrypted BOOLEAN DEFAULT false,
    alert_sent BOOLEAN DEFAULT false,
    
    -- Metadata
    scanned_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_pii_scan_pattern 
        FOREIGN KEY (pattern_id) 
        REFERENCES pii_detection_patterns(pattern_id),
    CONSTRAINT fk_pii_scan_scanned_by 
        FOREIGN KEY (scanned_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_pii_scan_matches_positive 
        CHECK (matches_found >= 0),
    CONSTRAINT chk_pii_scan_confidence_range 
        CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100)
);

-- Insert common PII detection patterns
INSERT INTO pii_detection_patterns 
(pattern_name, pattern_type, regex_pattern, mask_pattern, created_by) VALUES
('Email Address', 'EMAIL', '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', 'XXX@XXX.XXX', 1),
('US Phone Number', 'PHONE', '\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})', 'XXX-XXX-XXXX', 1),
('US SSN', 'SSN', '[0-9]{3}-?[0-9]{2}-?[0-9]{4}', 'XXX-XX-XXXX', 1),
('Credit Card', 'CREDIT_CARD', '[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}', 'XXXX-XXXX-XXXX-XXXX', 1);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION encrypt_sensitive_data IS 'Encrypts sensitive data using application-level encryption key';
COMMENT ON FUNCTION decrypt_sensitive_data IS 'Decrypts sensitive data using application-level encryption key';
COMMENT ON FUNCTION has_permission IS 'Checks if user has specific permission through their roles';
COMMENT ON FUNCTION has_role IS 'Checks if user has specific role assignment';
COMMENT ON FUNCTION audit_trigger IS 'Comprehensive audit logging trigger for all table changes';
COMMENT ON FUNCTION execute_retention_policy IS 'Executes data retention policy for a specific table';

COMMENT ON TABLE data_retention_policies IS 'Data retention and archival policies for compliance';
COMMENT ON TABLE data_quality_rules IS 'Data quality validation rules and thresholds';
COMMENT ON TABLE data_quality_results IS 'Results of data quality rule executions';
COMMENT ON TABLE pii_detection_patterns IS 'Patterns for detecting personally identifiable information';
COMMENT ON TABLE pii_scan_results IS 'Results of PII detection scans';

-- =====================================================
-- SECURITY VALIDATION QUERIES
-- =====================================================

-- Test RLS policies (should return limited results based on user)
-- SET app.current_user_id = '5';
-- SELECT COUNT(*) FROM orders; -- Should show only orders user has access to

-- Test audit logging (should create audit entries)
-- UPDATE orders SET priority = 'HIGH' WHERE order_id = 'ORD-2025-0001';
-- SELECT * FROM audit_log WHERE table_name = 'orders' ORDER BY created_at DESC LIMIT 5;

-- Test data quality rules
-- SELECT * FROM data_quality_rules WHERE is_active = true;

-- Test PII detection patterns
-- SELECT * FROM pii_detection_patterns WHERE is_active = true;