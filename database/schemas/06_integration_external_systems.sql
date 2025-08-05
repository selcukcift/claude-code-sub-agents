-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- INTEGRATION & EXTERNAL SYSTEMS SCHEMA
-- =====================================================
-- 
-- This schema implements comprehensive integration capabilities:
-- - ERP Systems - Financial and inventory synchronization
-- - Document Management - Work instructions, specifications, media
-- - Shipping Systems - Logistics and tracking integration
-- - Customer Portals - Order status and communication
-- - Audit and Compliance - Complete activity logging
-- 
-- Key Features:
-- - Multi-system integration support
-- - Real-time and batch synchronization
-- - Document management with version control
-- - Comprehensive audit trail
-- - Error handling and retry mechanisms
-- - Performance monitoring and alerting
-- 
-- Performance Targets:
-- - Sync operations: <30s for standard datasets
-- - Document retrieval: <500ms
-- - Audit queries: <1s for recent data
-- =====================================================

-- =====================================================
-- EXTERNAL SYSTEMS TABLE
-- =====================================================
-- Registry of external systems and their connection details

CREATE TABLE external_systems (
    system_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    system_name VARCHAR(100) UNIQUE NOT NULL,
    system_code VARCHAR(50) UNIQUE NOT NULL,       -- Short code for system
    
    -- System Classification
    system_type VARCHAR(30) NOT NULL,
    CHECK (system_type IN ('ERP', 'CRM', 'DOCUMENT_MANAGEMENT', 'SHIPPING', 'FINANCIAL', 
                          'MES', 'PLM', 'WAREHOUSE', 'ECOMMERCE', 'ANALYTICS')),
    system_category VARCHAR(50),                    -- Further categorization
    vendor_name VARCHAR(100),
    system_version VARCHAR(50),
    
    -- Connection Configuration
    endpoint_url VARCHAR(500),
    api_version VARCHAR(20),
    authentication_type VARCHAR(30) NOT NULL,
    CHECK (authentication_type IN ('API_KEY', 'OAUTH', 'BASIC_AUTH', 'CERTIFICATE', 
                                   'TOKEN', 'LDAP', 'SAML', 'JWT')),
    
    -- Connection Details (encrypted)
    connection_config JSONB,                       -- Connection configuration
    authentication_config JSONB,                   -- Authentication details
    api_credentials JSONB,                         -- API credentials (encrypted)
    
    -- Synchronization Configuration
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency_minutes INTEGER DEFAULT 60,
    batch_size INTEGER DEFAULT 100,               -- Records per batch
    sync_direction VARCHAR(20) DEFAULT 'BIDIRECTIONAL',
    CHECK (sync_direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
    
    -- Data Mapping Configuration
    field_mappings JSONB,                          -- Field mapping configurations
    transformation_rules JSONB,                    -- Data transformation rules
    validation_rules JSONB,                        -- Data validation rules
    
    -- Connection Status and Health
    is_active BOOLEAN DEFAULT true,
    is_connected BOOLEAN DEFAULT false,
    last_connection_test TIMESTAMP,
    connection_test_result TEXT,
    health_check_url VARCHAR(500),
    
    -- Sync Status and Timing
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    sync_in_progress BOOLEAN DEFAULT false,
    last_successful_sync TIMESTAMP,
    consecutive_failures INTEGER DEFAULT 0,
    
    -- Error Handling
    max_retry_attempts INTEGER DEFAULT 3,
    retry_delay_minutes INTEGER DEFAULT 5,
    error_notification_enabled BOOLEAN DEFAULT true,
    error_notification_recipients TEXT[],
    
    -- Rate Limiting
    rate_limit_requests_per_minute INTEGER,
    rate_limit_enabled BOOLEAN DEFAULT false,
    
    -- Monitoring and Alerting
    monitoring_enabled BOOLEAN DEFAULT true,
    performance_threshold_ms INTEGER DEFAULT 30000, -- 30 second threshold
    error_threshold_percentage DECIMAL(5,2) DEFAULT 10.0,
    
    -- Data Security
    data_encryption_enabled BOOLEAN DEFAULT true,
    ssl_certificate_required BOOLEAN DEFAULT true,
    ip_whitelist INET[],                           -- Allowed IP addresses
    
    -- Documentation and Support
    description TEXT,
    integration_notes TEXT,
    support_contact VARCHAR(200),
    documentation_url VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_external_systems_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_external_systems_updated_by 
        FOREIGN KEY (updated_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_external_systems_sync_frequency_positive 
        CHECK (sync_frequency_minutes > 0),
    CONSTRAINT chk_external_systems_batch_size_positive 
        CHECK (batch_size > 0),
    CONSTRAINT chk_external_systems_retry_attempts_positive 
        CHECK (max_retry_attempts >= 0),
    CONSTRAINT chk_external_systems_consecutive_failures_positive 
        CHECK (consecutive_failures >= 0),
    CONSTRAINT chk_external_systems_error_threshold_valid 
        CHECK (error_threshold_percentage BETWEEN 0 AND 100)
);

-- Indexes for external systems
CREATE INDEX idx_external_systems_type ON external_systems(system_type);
CREATE INDEX idx_external_systems_active ON external_systems(is_active);
CREATE INDEX idx_external_systems_connected ON external_systems(is_connected);
CREATE INDEX idx_external_systems_sync_enabled ON external_systems(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX idx_external_systems_next_sync ON external_systems(next_sync_at) WHERE sync_enabled = true;
CREATE INDEX idx_external_systems_failures ON external_systems(consecutive_failures) WHERE consecutive_failures > 0;

-- =====================================================
-- DATA SYNCHRONIZATION LOG TABLE
-- =====================================================
-- Complete log of all data synchronization activities

CREATE TABLE sync_log (
    sync_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    system_id BIGINT NOT NULL,
    
    -- Sync Classification
    sync_type VARCHAR(30) NOT NULL,
    CHECK (sync_type IN ('FULL', 'INCREMENTAL', 'MANUAL', 'SCHEDULED', 'TRIGGERED', 'RETRY')),
    sync_direction VARCHAR(20) NOT NULL,
    CHECK (sync_direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
    
    -- Data Information
    data_type VARCHAR(50) NOT NULL,                -- e.g., 'orders', 'customers', 'inventory'
    data_subset VARCHAR(100),                      -- Subset of data if applicable
    
    -- Sync Statistics
    records_to_process INTEGER DEFAULT 0,
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_inserted INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    
    -- Timing Information
    sync_started_at TIMESTAMP NOT NULL,
    sync_completed_at TIMESTAMP,
    duration_seconds INTEGER,
    average_records_per_second DECIMAL(8,2),
    
    -- Status and Results
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED', 'TIMEOUT')),
    
    -- Error Information
    error_count INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,                           -- Detailed error information
    stack_trace TEXT,
    
    -- Performance Metrics
    api_call_count INTEGER DEFAULT 0,
    average_response_time_ms DECIMAL(8,2),
    data_volume_bytes BIGINT DEFAULT 0,
    network_time_ms INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    
    -- Sync Configuration Used
    sync_parameters JSONB,                         -- Parameters used for this sync
    batch_size_used INTEGER,
    retry_attempt INTEGER DEFAULT 0,
    
    -- Quality Metrics
    data_quality_score DECIMAL(5,2),              -- 0-100 data quality score
    validation_errors INTEGER DEFAULT 0,
    transformation_warnings INTEGER DEFAULT 0,
    
    -- User and System Context
    initiated_by BIGINT,                          -- User who initiated (if manual)
    system_triggered BOOLEAN DEFAULT true,        -- System vs user initiated
    correlation_id VARCHAR(100),                  -- For tracking related operations
    
    -- External References
    external_sync_id VARCHAR(100),                -- External system's sync ID
    
    -- Detailed Sync Information
    sync_details JSONB,                           -- Detailed sync information
    affected_records JSONB,                       -- Sample of affected record IDs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_sync_log_system 
        FOREIGN KEY (system_id) 
        REFERENCES external_systems(system_id),
    CONSTRAINT fk_sync_log_initiated_by 
        FOREIGN KEY (initiated_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_sync_log_records_valid 
        CHECK (records_processed >= 0 AND records_successful >= 0 AND records_failed >= 0),
    CONSTRAINT chk_sync_log_duration_positive 
        CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT chk_sync_log_error_count_positive 
        CHECK (error_count >= 0),
    CONSTRAINT chk_sync_log_data_quality_range 
        CHECK (data_quality_score IS NULL OR (data_quality_score BETWEEN 0 AND 100))
);

-- Indexes for sync log (performance critical for monitoring)
CREATE INDEX idx_sync_log_system ON sync_log(system_id);
CREATE INDEX idx_sync_log_type ON sync_log(data_type);
CREATE INDEX idx_sync_log_status ON sync_log(status);
CREATE INDEX idx_sync_log_started_at ON sync_log(sync_started_at DESC);
CREATE INDEX idx_sync_log_completed_at ON sync_log(sync_completed_at DESC);
CREATE INDEX idx_sync_log_correlation ON sync_log(correlation_id);
CREATE INDEX idx_sync_log_errors ON sync_log(error_count, status) WHERE error_count > 0;
CREATE INDEX idx_sync_log_performance ON sync_log(duration_seconds DESC, records_processed DESC);

-- Partitioning for sync_log by month (for large volumes)
-- CREATE TABLE sync_log_2025_01 PARTITION OF sync_log 
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================
-- Document management system for all file types

CREATE TABLE documents (
    document_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    document_title VARCHAR(500),                   -- Display title
    
    -- Document Classification
    document_type VARCHAR(50) NOT NULL,
    CHECK (document_type IN ('WORK_INSTRUCTION', 'SPECIFICATION', 'DRAWING', 'PHOTO', 
                            'MANUAL', 'CERTIFICATE', 'REPORT', 'FORM', 'TEMPLATE', 
                            'CONTRACT', 'INVOICE', 'OTHER')),
    document_category VARCHAR(50),
    document_subcategory VARCHAR(50),
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_extension VARCHAR(10),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),                         -- SHA-256 for integrity checking
    
    -- Content Information
    content_type VARCHAR(50),                      -- Text, Image, Video, etc.
    page_count INTEGER,                            -- For multi-page documents
    word_count INTEGER,                            -- For text documents
    
    -- Document Metadata
    version VARCHAR(20) DEFAULT '1.0',
    revision VARCHAR(20),
    description TEXT,
    keywords TEXT[],                               -- Searchable keywords
    tags TEXT[],                                   -- Classification tags
    
    -- Associations and Relationships
    related_to_type VARCHAR(50),
    CHECK (related_to_type IN ('ORDER', 'ASSEMBLY', 'PART', 'QC_PROCESS', 'TASK', 
                              'CUSTOMER', 'SUPPLIER', 'PROJECT', 'GENERAL')),
    related_to_id VARCHAR(50),
    parent_document_id BIGINT,                     -- For document hierarchies
    
    -- Access Control and Security
    access_level VARCHAR(20) DEFAULT 'INTERNAL',
    CHECK (access_level IN ('PUBLIC', 'CUSTOMER', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL')),
    owner_id BIGINT,                               -- Document owner
    permissions JSONB,                             -- Detailed permissions
    
    -- Status and Workflow
    status VARCHAR(20) DEFAULT 'DRAFT',
    CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'DELETED')),
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Retention and Lifecycle
    retention_period_years INTEGER,
    archive_date DATE,
    purge_date DATE,
    is_archived BOOLEAN DEFAULT false,
    
    -- Version Control
    is_latest_version BOOLEAN DEFAULT true,
    original_document_id BIGINT,                   -- Original document this is version of
    version_notes TEXT,
    
    -- External Information
    external_document_id VARCHAR(100),             -- External system reference
    source_system VARCHAR(50),                     -- System document came from
    external_url VARCHAR(1000),                    -- External URL if applicable
    
    -- Usage Tracking
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    last_accessed_by BIGINT,
    
    -- Search and Indexing
    full_text_content TEXT,                       -- Extracted text for searching
    ocr_text TEXT,                                -- OCR extracted text
    
    -- Media Specific Information
    image_width INTEGER,                           -- For images
    image_height INTEGER,                          -- For images
    video_duration_seconds INTEGER,                -- For videos
    audio_duration_seconds INTEGER,                -- For audio files
    
    -- Metadata
    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_documents_parent 
        FOREIGN KEY (parent_document_id) 
        REFERENCES documents(document_id),
    CONSTRAINT fk_documents_owner 
        FOREIGN KEY (owner_id) 
        REFERENCES users(user_id),
    CONSTRAINT fk_documents_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_documents_uploaded_by 
        FOREIGN KEY (uploaded_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_documents_updated_by 
        FOREIGN KEY (updated_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_documents_last_accessed_by 
        FOREIGN KEY (last_accessed_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_documents_original 
        FOREIGN KEY (original_document_id) 
        REFERENCES documents(document_id),
    CONSTRAINT chk_documents_file_size_positive 
        CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
    CONSTRAINT chk_documents_counts_positive 
        CHECK (download_count >= 0 AND view_count >= 0),
    CONSTRAINT chk_documents_dimensions_positive 
        CHECK ((image_width IS NULL OR image_width > 0) AND (image_height IS NULL OR image_height > 0)),
    CONSTRAINT chk_documents_durations_positive 
        CHECK ((video_duration_seconds IS NULL OR video_duration_seconds > 0) AND 
               (audio_duration_seconds IS NULL OR audio_duration_seconds > 0))
);

-- Indexes for documents
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_related ON documents(related_to_type, related_to_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_access_level ON documents(access_level);
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_approved_by ON documents(approved_by);
CREATE INDEX idx_documents_parent ON documents(parent_document_id);
CREATE INDEX idx_documents_latest ON documents(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX idx_documents_archived ON documents(is_archived);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);

-- Full-text search index for documents
CREATE INDEX idx_documents_search_gin ON documents USING gin(
    (document_name || ' ' || COALESCE(document_title, '') || ' ' || 
     COALESCE(description, '') || ' ' || COALESCE(full_text_content, '')) gin_trgm_ops
);

-- GIN indexes for arrays
CREATE INDEX idx_documents_keywords_gin ON documents USING gin(keywords);
CREATE INDEX idx_documents_tags_gin ON documents USING gin(tags);

-- =====================================================
-- AUDIT LOG TABLE
-- =====================================================
-- Comprehensive audit trail for all system activities

CREATE TABLE audit_log (
    audit_id BIGINT GENERATED ALWAYS AS IDENTITY,
    
    -- Entity Information
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    
    -- Action Information
    action VARCHAR(20) NOT NULL,
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT')),
    action_type VARCHAR(30),                       -- More specific action type
    
    -- Change Details
    old_values JSONB,                              -- Previous values (for updates/deletes)
    new_values JSONB,                              -- New values (for inserts/updates)
    changed_columns TEXT[],                        -- List of changed columns
    change_summary TEXT,                           -- Human-readable change summary
    
    -- User Context
    user_id BIGINT,
    username VARCHAR(50),                          -- Stored for history even if user deleted
    user_ip INET,
    user_agent TEXT,
    session_id VARCHAR(128),
    
    -- Request Context
    request_id VARCHAR(100),                       -- Correlation ID for request
    request_path VARCHAR(500),                     -- API endpoint or page accessed
    request_method VARCHAR(10),                    -- HTTP method
    request_parameters JSONB,                      -- Request parameters
    
    -- Business Context
    business_process VARCHAR(100),                 -- Which business process
    workflow_step VARCHAR(100),                   -- Step in workflow
    transaction_id VARCHAR(100),                  -- Business transaction ID
    
    -- System Context
    application_version VARCHAR(50),
    database_user VARCHAR(50),                    -- Database user account
    application_module VARCHAR(100),              -- Which module/feature
    
    -- Risk and Compliance
    data_classification VARCHAR(20) DEFAULT 'INTERNAL',
    CHECK (data_classification IN ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL')),
    compliance_tags TEXT[],                        -- Compliance framework tags
    risk_level VARCHAR(20) DEFAULT 'LOW',
    CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Performance Information
    execution_time_ms INTEGER,
    query_count INTEGER,
    
    -- Additional Context
    additional_info JSONB,                         -- Flexible additional information
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_audit_log_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(user_id),
    CONSTRAINT fk_audit_log_session 
        FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id),
    CONSTRAINT chk_audit_log_execution_time_positive 
        CHECK (execution_time_ms IS NULL OR execution_time_ms >= 0)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit log
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_log_2025_02 PARTITION OF audit_log 
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Indexes for audit log
CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_user_date ON audit_log (user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log (action, created_at DESC);
CREATE INDEX idx_audit_log_session ON audit_log (session_id);
CREATE INDEX idx_audit_log_request ON audit_log (request_id);
CREATE INDEX idx_audit_log_business_process ON audit_log (business_process);
CREATE INDEX idx_audit_log_risk_level ON audit_log (risk_level) WHERE risk_level IN ('HIGH', 'CRITICAL');
CREATE INDEX idx_audit_log_compliance ON audit_log USING gin(compliance_tags);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
-- System notifications and alerts

CREATE TABLE notifications (
    notification_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    
    -- Notification Classification
    notification_type VARCHAR(50) NOT NULL,
    CHECK (notification_type IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'REMINDER', 
                                 'APPROVAL_REQUEST', 'STATUS_UPDATE', 'SYSTEM_ALERT')),
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL')),
    
    -- Content
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,                                 -- Additional notification details
    
    -- Recipients
    recipient_user_id BIGINT,                      -- Individual recipient
    recipient_role_ids BIGINT[],                   -- Role-based recipients
    recipient_groups TEXT[],                       -- Group-based recipients
    
    -- Delivery Channels
    delivery_email BOOLEAN DEFAULT false,
    delivery_sms BOOLEAN DEFAULT false,
    delivery_push BOOLEAN DEFAULT true,           -- In-app notification
    delivery_webhook BOOLEAN DEFAULT false,
    
    -- Related Information
    related_to_type VARCHAR(50),
    CHECK (related_to_type IN ('ORDER', 'TASK', 'INSPECTION', 'SYSTEM', 'USER', 'DOCUMENT')),
    related_to_id VARCHAR(100),
    related_url VARCHAR(500),                      -- Deep link to related item
    
    -- Status and Tracking
    status VARCHAR(20) DEFAULT 'PENDING',
    CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'DISMISSED', 'FAILED')),
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP,
    
    -- Scheduling
    scheduled_for TIMESTAMP,                       -- When to send (for scheduled notifications)
    expires_at TIMESTAMP,                          -- When notification expires
    
    -- Delivery Tracking
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    delivery_attempts INTEGER DEFAULT 0,
    delivery_errors TEXT[],
    
    -- Action Buttons/Links
    actions JSONB,                                 -- Possible actions user can take
    
    -- Metadata
    created_by BIGINT,                             -- System or user that created notification
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_notifications_recipient 
        FOREIGN KEY (recipient_user_id) 
        REFERENCES users(user_id),
    CONSTRAINT fk_notifications_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_notifications_delivery_attempts_positive 
        CHECK (delivery_attempts >= 0),
    CONSTRAINT chk_notifications_expires_future 
        CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_related ON notifications(related_to_type, related_to_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'PENDING';
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert common external system types
INSERT INTO external_systems (system_name, system_code, system_type, description, created_by) VALUES
('Primary ERP System', 'ERP_MAIN', 'ERP', 'Main ERP system for financial and inventory data', 1),
('Document Management', 'DMS_MAIN', 'DOCUMENT_MANAGEMENT', 'Central document repository', 1),
('Shipping Integration', 'SHIP_MAIN', 'SHIPPING', 'Primary shipping and logistics system', 1),
('Customer Portal', 'PORTAL_CUST', 'CRM', 'Customer self-service portal', 1);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE external_systems IS 'Registry of external systems with connection and sync configuration';
COMMENT ON TABLE sync_log IS 'Comprehensive log of all data synchronization activities';
COMMENT ON TABLE documents IS 'Document management system with version control and access control';
COMMENT ON TABLE audit_log IS 'Complete audit trail for all system activities and changes';
COMMENT ON TABLE notifications IS 'System notifications and alerts with multi-channel delivery';

COMMENT ON COLUMN external_systems.consecutive_failures IS 'Number of consecutive sync failures for alerting';
COMMENT ON COLUMN sync_log.data_quality_score IS 'Data quality score (0-100) for synchronized data';
COMMENT ON COLUMN documents.full_text_content IS 'Extracted text content for full-text search';
COMMENT ON COLUMN audit_log.data_classification IS 'Data classification level for compliance';
COMMENT ON COLUMN notifications.delivery_attempts IS 'Number of delivery attempts made';

-- =====================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- =====================================================

-- Recent sync activity (should execute in <1s)
-- SELECT es.system_name, sl.data_type, sl.status, sl.records_processed, sl.duration_seconds
-- FROM sync_log sl
-- JOIN external_systems es ON sl.system_id = es.system_id
-- WHERE sl.sync_started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
-- ORDER BY sl.sync_started_at DESC;

-- Document search (should execute in <500ms)
-- SELECT document_name, document_type, file_size_bytes, uploaded_at
-- FROM documents
-- WHERE status = 'ACTIVE' AND access_level IN ('PUBLIC', 'INTERNAL')
-- AND (document_name ILIKE '%search_term%' OR full_text_content ILIKE '%search_term%')
-- ORDER BY uploaded_at DESC;