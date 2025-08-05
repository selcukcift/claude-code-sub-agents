-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- USER MANAGEMENT & SECURITY SCHEMA
-- =====================================================
-- 
-- This schema implements comprehensive role-based access control (RBAC):
-- - 6 Primary User Roles: Admin, Sales Manager, Production Manager, 
--   QC Inspector, Assembly Technician, Customer Service
-- - Hierarchical permissions with granular access control
-- - Multi-role support for users
-- - Session management and security tokens
-- - Activity logging and audit trail
-- - Row-level security policies
-- 
-- Key Features:
-- - Support for 50 concurrent users
-- - Multi-factor authentication support
-- - Granular permission system
-- - User delegation and role assignments
-- - Comprehensive audit logging
-- 
-- Performance Targets:
-- - User authentication: <200ms
-- - Permission checks: <50ms
-- - Session management: <100ms
-- =====================================================

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Core user accounts and authentication

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    
    -- Password and Authentication
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(50),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    phone VARCHAR(20),
    mobile_phone VARCHAR(20),
    
    -- Professional Information
    job_title VARCHAR(100),
    department VARCHAR(100),
    employee_id VARCHAR(50),
    supervisor_id BIGINT,                          -- Reporting manager
    cost_center VARCHAR(50),
    
    -- Authentication Status
    last_login TIMESTAMP,
    last_login_ip INET,
    current_login_ip INET,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    locked_until TIMESTAMP,
    locked_reason TEXT,
    
    -- Password Policy
    password_expires_at TIMESTAMP,
    must_change_password BOOLEAN DEFAULT false,
    password_history JSONB,                        -- Store hash of last 5 passwords
    
    -- Multi-Factor Authentication
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    mfa_backup_codes TEXT[],                       -- Array of backup codes
    mfa_last_used TIMESTAMP,
    
    -- Account Status
    is_active BOOLEAN DEFAULT true,
    is_system_user BOOLEAN DEFAULT false,          -- System/service accounts
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    
    -- User Preferences
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(10) DEFAULT '24H',
    ui_theme VARCHAR(20) DEFAULT 'LIGHT',
    ui_preferences JSONB,                          -- Custom UI preferences
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    desktop_notifications BOOLEAN DEFAULT true,
    notification_frequency VARCHAR(20) DEFAULT 'IMMEDIATE',
    CHECK (notification_frequency IN ('IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY')),
    
    -- Integration and External Systems
    external_user_id VARCHAR(100),                 -- External system user ID
    ldap_dn VARCHAR(500),                          -- LDAP Distinguished Name
    active_directory_sid VARCHAR(200),             -- Windows AD SID
    
    -- Audit and Compliance
    terms_accepted_at TIMESTAMP,
    terms_version VARCHAR(20),                     -- Version of terms accepted
    privacy_policy_accepted_at TIMESTAMP,
    privacy_policy_version VARCHAR(20),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_users_supervisor 
        FOREIGN KEY (supervisor_id) 
        REFERENCES users(user_id),
    CONSTRAINT chk_users_email_format 
        CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_users_failed_attempts_positive 
        CHECK (failed_login_attempts >= 0),
    CONSTRAINT chk_users_login_count_positive 
        CHECK (login_count >= 0)
);

-- Indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_supervisor ON users(supervisor_id);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_users_last_login ON users(last_login DESC);
CREATE INDEX idx_users_locked ON users(is_locked) WHERE is_locked = true;
CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = true;

-- Full-text search for users
CREATE INDEX idx_users_search_gin ON users USING gin(
    (full_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(job_title, '')) gin_trgm_ops
);

-- =====================================================
-- ROLES TABLE
-- =====================================================
-- System roles and permissions

CREATE TABLE roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_code VARCHAR(20) UNIQUE NOT NULL,         -- e.g., 'ADMIN', 'SALES_MGR'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Role Hierarchy
    parent_role_id BIGINT,                         -- For role inheritance
    role_level INTEGER DEFAULT 1,                 -- Hierarchy level (1=top)
    role_path VARCHAR(500),                        -- Materialized path for hierarchy
    
    -- Role Type and Classification
    role_type VARCHAR(20) DEFAULT 'FUNCTIONAL',
    CHECK (role_type IN ('SYSTEM', 'FUNCTIONAL', 'ORGANIZATIONAL', 'TEMPORARY')),
    role_category VARCHAR(50),                     -- Grouping roles by category
    
    -- Permission Summary (for quick access)
    can_create_orders BOOLEAN DEFAULT false,
    can_approve_orders BOOLEAN DEFAULT false,
    can_modify_boms BOOLEAN DEFAULT false,
    can_access_financials BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_configure_system BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT false,
    can_export_data BOOLEAN DEFAULT false,
    
    -- Access Levels
    max_order_value DECIMAL(12,2),                 -- Maximum order value user can handle
    max_discount_percentage DECIMAL(5,2),          -- Maximum discount they can authorize
    data_access_level VARCHAR(20) DEFAULT 'DEPARTMENT',
    CHECK (data_access_level IN ('PERSONAL', 'TEAM', 'DEPARTMENT', 'DIVISION', 'COMPANY')),
    
    -- Role Constraints
    max_concurrent_users INTEGER,                  -- Limit concurrent users for this role
    session_timeout_minutes INTEGER DEFAULT 480,   -- Session timeout in minutes
    ip_restrictions INET[],                        -- Allowed IP addresses/ranges
    time_restrictions JSONB,                       -- Allowed time periods
    
    -- Status and Lifecycle
    is_active BOOLEAN DEFAULT true,
    is_assignable BOOLEAN DEFAULT true,            -- Can be assigned to users
    requires_approval BOOLEAN DEFAULT false,       -- Role assignment requires approval
    auto_expire_days INTEGER,                      -- Auto-expire role assignment after N days
    
    -- Integration
    external_role_mapping JSONB,                   -- Mapping to external systems
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_roles_parent 
        FOREIGN KEY (parent_role_id) 
        REFERENCES roles(role_id),
    CONSTRAINT chk_roles_level_positive 
        CHECK (role_level > 0),
    CONSTRAINT chk_roles_max_order_value_positive 
        CHECK (max_order_value IS NULL OR max_order_value >= 0),
    CONSTRAINT chk_roles_max_discount_valid 
        CHECK (max_discount_percentage IS NULL OR 
               (max_discount_percentage >= 0 AND max_discount_percentage <= 100)),
    CONSTRAINT chk_roles_session_timeout_positive 
        CHECK (session_timeout_minutes > 0)
);

-- Indexes for roles
CREATE INDEX idx_roles_code ON roles(role_code);
CREATE INDEX idx_roles_active ON roles(is_active);
CREATE INDEX idx_roles_parent ON roles(parent_role_id);
CREATE INDEX idx_roles_level ON roles(role_level);
CREATE INDEX idx_roles_type ON roles(role_type);
CREATE INDEX idx_roles_assignable ON roles(is_assignable) WHERE is_assignable = true;

-- =====================================================
-- USER ROLES JUNCTION TABLE
-- =====================================================
-- Many-to-many relationship between users and roles

CREATE TABLE user_roles (
    user_role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    
    -- Assignment Context
    assigned_by BIGINT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assignment_reason TEXT,
    
    -- Temporal Validity
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    -- Role Scope and Limitations
    scope_restrictions JSONB,                      -- Limit role to specific data/areas
    permission_overrides JSONB,                    -- Override specific permissions
    
    -- Delegation Support
    is_delegated BOOLEAN DEFAULT false,
    delegated_by BIGINT,                          -- Original role holder
    delegation_reason TEXT,
    delegation_expires_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_primary_role BOOLEAN DEFAULT false,         -- User's primary role
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Usage Tracking
    last_used_at TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_user_roles_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role 
        FOREIGN KEY (role_id) 
        REFERENCES roles(role_id),
    CONSTRAINT fk_user_roles_assigned_by 
        FOREIGN KEY (assigned_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_user_roles_delegated_by 
        FOREIGN KEY (delegated_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_user_roles_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT uk_user_role_effective 
        UNIQUE (user_id, role_id, effective_from, is_active),
    CONSTRAINT chk_user_roles_effective_dates 
        CHECK (effective_until IS NULL OR effective_until >= effective_from),
    CONSTRAINT chk_user_roles_delegation_expires 
        CHECK (delegation_expires_at IS NULL OR delegation_expires_at > CURRENT_TIMESTAMP),
    CONSTRAINT chk_user_roles_usage_count_positive 
        CHECK (usage_count >= 0)
);

-- Indexes for user roles
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);
CREATE INDEX idx_user_roles_assigned_by ON user_roles(assigned_by);
CREATE INDEX idx_user_roles_effective ON user_roles(effective_from, effective_until);
CREATE INDEX idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX idx_user_roles_primary ON user_roles(is_primary_role) WHERE is_primary_role = true;
CREATE INDEX idx_user_roles_delegated ON user_roles(is_delegated, delegation_expires_at) 
    WHERE is_delegated = true;

-- =====================================================
-- PERMISSIONS TABLE
-- =====================================================
-- Granular permissions system

CREATE TABLE permissions (
    permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    permission_code VARCHAR(50) UNIQUE NOT NULL,   -- e.g., 'orders:create'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Permission Structure
    resource_type VARCHAR(50) NOT NULL,            -- e.g., 'orders', 'boms', 'users'
    action VARCHAR(50) NOT NULL,                   -- e.g., 'create', 'read', 'update', 'delete'
    scope VARCHAR(50) DEFAULT 'RECORD',            -- RECORD, FIELD, SYSTEM
    CHECK (scope IN ('RECORD', 'FIELD', 'SYSTEM', 'FUNCTION')),
    
    -- Permission Categories
    category VARCHAR(30) NOT NULL,
    CHECK (category IN ('SYSTEM', 'ORDERS', 'INVENTORY', 'PRODUCTION', 'QC', 
                       'FINANCIAL', 'REPORTS', 'ADMIN', 'INTEGRATION')),
    subcategory VARCHAR(50),
    
    -- Risk and Compliance
    risk_level VARCHAR(20) DEFAULT 'LOW',
    CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    requires_mfa BOOLEAN DEFAULT false,            -- Requires multi-factor auth
    requires_approval BOOLEAN DEFAULT false,       -- Assignment requires approval
    
    -- Constraints and Validation
    validation_rules JSONB,                        -- Additional validation rules
    conditions JSONB,                              -- Conditional permission logic
    
    -- Audit and Compliance
    is_audited BOOLEAN DEFAULT false,              -- Track usage of this permission
    compliance_tags TEXT[],                        -- Compliance framework tags
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system_permission BOOLEAN DEFAULT false,    -- System-managed permission
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    
    -- Constraints
    CONSTRAINT uk_permissions_resource_action 
        UNIQUE (resource_type, action, scope),
    CONSTRAINT chk_permissions_name_length 
        CHECK (length(permission_name) >= 3)
);

-- Indexes for permissions
CREATE INDEX idx_permissions_resource ON permissions(resource_type);
CREATE INDEX idx_permissions_action ON permissions(action);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_risk_level ON permissions(risk_level);
CREATE INDEX idx_permissions_active ON permissions(is_active);
CREATE INDEX idx_permissions_mfa_required ON permissions(requires_mfa) WHERE requires_mfa = true;
CREATE INDEX idx_permissions_audited ON permissions(is_audited) WHERE is_audited = true;

-- =====================================================
-- ROLE PERMISSIONS JUNCTION TABLE
-- =====================================================
-- Permissions assigned to roles

CREATE TABLE role_permissions (
    role_permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    
    -- Permission Grant Details
    granted_by BIGINT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grant_reason TEXT,
    
    -- Permission Constraints
    conditions JSONB,                              -- Conditional permissions
    scope_limitations JSONB,                      -- Scope-specific limitations
    field_restrictions TEXT[],                    -- Restricted fields
    
    -- Temporal Validity
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_role_permissions_role 
        FOREIGN KEY (role_id) 
        REFERENCES roles(role_id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission 
        FOREIGN KEY (permission_id) 
        REFERENCES permissions(permission_id),
    CONSTRAINT fk_role_permissions_granted_by 
        FOREIGN KEY (granted_by) 
        REFERENCES users(user_id),
    CONSTRAINT uk_role_permission 
        UNIQUE (role_id, permission_id, effective_from),
    CONSTRAINT chk_role_permissions_effective_dates 
        CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- Indexes for role permissions
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_granted_by ON role_permissions(granted_by);
CREATE INDEX idx_role_permissions_effective ON role_permissions(effective_from, effective_until);
CREATE INDEX idx_role_permissions_active ON role_permissions(is_active) WHERE is_active = true;

-- =====================================================
-- USER SESSIONS TABLE
-- =====================================================
-- Active user sessions and tokens

CREATE TABLE user_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id BIGINT NOT NULL,
    
    -- Session Information
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- Session Context
    device_info JSONB,                             -- Device information
    user_agent TEXT,
    ip_address INET,
    location_info JSONB,                           -- Geolocation data
    
    -- Session Status
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Security Flags
    is_mfa_verified BOOLEAN DEFAULT false,
    mfa_verified_at TIMESTAMP,
    force_logout BOOLEAN DEFAULT false,            -- Force logout on next request
    
    -- Session Statistics
    request_count INTEGER DEFAULT 0,
    last_request_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_user_sessions_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_user_sessions_expires_future 
        CHECK (expires_at > created_at),
    CONSTRAINT chk_user_sessions_request_count_positive 
        CHECK (request_count >= 0)
);

-- Indexes for user sessions
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, last_activity DESC) 
    WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_ip ON user_sessions(ip_address);

-- =====================================================
-- SECURITY EVENTS TABLE
-- =====================================================
-- Security-related events and alerts

CREATE TABLE security_events (
    event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT,
    
    -- Event Classification
    event_type VARCHAR(50) NOT NULL,
    CHECK (event_type IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE',
                         'MFA_ENABLED', 'MFA_DISABLED', 'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY',
                         'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'SESSION_EXPIRED',
                         'ROLE_ASSIGNED', 'ROLE_REVOKED')),
    
    -- Event Details
    event_description TEXT,
    severity VARCHAR(20) DEFAULT 'INFO',
    CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    
    -- Context Information
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    resource_accessed VARCHAR(100),
    
    -- Additional Data
    event_data JSONB,                              -- Additional event-specific data
    
    -- Status and Response
    is_resolved BOOLEAN DEFAULT false,
    resolved_by BIGINT,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Risk Assessment
    risk_score INTEGER DEFAULT 0,                  -- 0-100 risk score
    requires_investigation BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_security_events_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id),
    CONSTRAINT fk_security_events_resolved_by 
        FOREIGN KEY (resolved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_security_events_session 
        FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id),
    CONSTRAINT chk_security_events_risk_score_range 
        CHECK (risk_score BETWEEN 0 AND 100)
);

-- Indexes for security events
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
CREATE INDEX idx_security_events_unresolved ON security_events(is_resolved, requires_investigation) 
    WHERE is_resolved = false;
CREATE INDEX idx_security_events_risk_score ON security_events(risk_score DESC) 
    WHERE risk_score > 50;

-- =====================================================
-- INITIAL DATA - SYSTEM ROLES
-- =====================================================

-- Insert core system roles
INSERT INTO roles (role_name, role_code, display_name, description, role_level, role_type, 
                  can_create_orders, can_approve_orders, can_modify_boms, can_access_financials,
                  can_manage_users, can_configure_system, can_view_reports, can_export_data) VALUES
('Administrator', 'ADMIN', 'System Administrator', 'Full system access and configuration', 1, 'SYSTEM',
 true, true, true, true, true, true, true, true),
 
('Sales Manager', 'SALES_MGR', 'Sales Manager', 'Order creation and customer management', 2, 'FUNCTIONAL',
 true, true, false, true, false, false, true, true),
 
('Production Manager', 'PROD_MGR', 'Production Manager', 'Production workflow and resource allocation', 2, 'FUNCTIONAL',
 false, true, true, false, false, false, true, false),
 
('QC Inspector', 'QC_INSP', 'Quality Control Inspector', 'Quality control processes and approvals', 3, 'FUNCTIONAL',
 false, false, false, false, false, false, true, false),
 
('Assembly Technician', 'ASSY_TECH', 'Assembly Technician', 'Task execution and progress updates', 4, 'FUNCTIONAL',
 false, false, false, false, false, false, false, false),
 
('Customer Service', 'CUST_SVC', 'Customer Service Representative', 'Order status and customer communication', 3, 'FUNCTIONAL',
 false, false, false, false, false, false, true, false);

-- Insert core permissions
INSERT INTO permissions (permission_name, permission_code, display_name, resource_type, action, category, risk_level) VALUES
-- Order permissions
('Create Orders', 'orders:create', 'Create Orders', 'orders', 'create', 'ORDERS', 'MEDIUM'),
('Read Orders', 'orders:read', 'View Orders', 'orders', 'read', 'ORDERS', 'LOW'),
('Update Orders', 'orders:update', 'Modify Orders', 'orders', 'update', 'ORDERS', 'MEDIUM'),
('Delete Orders', 'orders:delete', 'Delete Orders', 'orders', 'delete', 'ORDERS', 'HIGH'),
('Approve Orders', 'orders:approve', 'Approve Orders', 'orders', 'approve', 'ORDERS', 'HIGH'),

-- BOM permissions
('Create BOMs', 'boms:create', 'Create BOMs', 'boms', 'create', 'INVENTORY', 'MEDIUM'),
('Read BOMs', 'boms:read', 'View BOMs', 'boms', 'read', 'INVENTORY', 'LOW'),
('Update BOMs', 'boms:update', 'Modify BOMs', 'boms', 'update', 'INVENTORY', 'MEDIUM'),
('Approve BOMs', 'boms:approve', 'Approve BOMs', 'boms', 'approve', 'INVENTORY', 'HIGH'),

-- User management permissions
('Manage Users', 'users:manage', 'Manage Users', 'users', 'manage', 'ADMIN', 'CRITICAL'),
('View Users', 'users:read', 'View Users', 'users', 'read', 'ADMIN', 'MEDIUM'),

-- Financial permissions
('View Financials', 'financials:read', 'View Financial Data', 'financials', 'read', 'FINANCIAL', 'HIGH'),
('Manage Pricing', 'pricing:manage', 'Manage Pricing', 'pricing', 'manage', 'FINANCIAL', 'HIGH'),

-- System permissions
('System Configuration', 'system:configure', 'Configure System', 'system', 'configure', 'SYSTEM', 'CRITICAL'),
('View Reports', 'reports:read', 'View Reports', 'reports', 'read', 'REPORTS', 'MEDIUM'),
('Export Data', 'data:export', 'Export Data', 'data', 'export', 'REPORTS', 'HIGH');

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Core user accounts with authentication and profile information';
COMMENT ON TABLE roles IS 'System roles with hierarchical structure and permission summaries';
COMMENT ON TABLE user_roles IS 'Many-to-many assignment of roles to users with delegation support';
COMMENT ON TABLE permissions IS 'Granular permissions for system resources and actions';
COMMENT ON TABLE role_permissions IS 'Assignment of permissions to roles';
COMMENT ON TABLE user_sessions IS 'Active user sessions with security tracking';
COMMENT ON TABLE security_events IS 'Security-related events and audit trail';

COMMENT ON COLUMN users.mfa_enabled IS 'Multi-factor authentication enabled for user';
COMMENT ON COLUMN roles.max_order_value IS 'Maximum order value user with this role can handle';
COMMENT ON COLUMN user_roles.is_delegated IS 'Role is temporarily delegated from another user';
COMMENT ON COLUMN permissions.requires_mfa IS 'Permission requires multi-factor authentication';
COMMENT ON COLUMN security_events.risk_score IS 'Risk score (0-100) for security event';

-- =====================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- =====================================================

-- User authentication query (should execute in <200ms)
-- SELECT u.user_id, u.username, u.password_hash, u.is_active, u.is_locked
-- FROM users u
-- WHERE u.username = ? AND u.is_active = true AND u.is_locked = false;

-- User permissions query (should execute in <50ms)
-- SELECT DISTINCT p.permission_code
-- FROM users u
-- JOIN user_roles ur ON u.user_id = ur.user_id
-- JOIN roles r ON ur.role_id = r.role_id
-- JOIN role_permissions rp ON r.role_id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.permission_id
-- WHERE u.user_id = ? AND ur.is_active = true AND ur.effective_from <= CURRENT_DATE 
--   AND (ur.effective_until IS NULL OR ur.effective_until >= CURRENT_DATE)
--   AND rp.is_active = true AND p.is_active = true;