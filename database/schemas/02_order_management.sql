-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- ORDER MANAGEMENT SCHEMA
-- =====================================================
-- 
-- This schema implements the complete 8-phase order lifecycle:
-- 1. DRAFT - Initial order creation
-- 2. CONFIGURATION - Product configuration and BOM generation  
-- 3. APPROVAL - Management approval
-- 4. PRODUCTION - Manufacturing phase
-- 5. QUALITY_CONTROL - QC inspection
-- 6. PACKAGING - Final packaging
-- 7. SHIPPING - Delivery preparation
-- 8. DELIVERED - Order completion
-- 
-- Key Features:
-- - Complete order lifecycle tracking
-- - 1000 orders/month capacity
-- - Multi-item orders with configurations
-- - Status history and audit trail
-- - Performance optimized for concurrent access
-- 
-- Performance Targets:
-- - Order creation: <1s
-- - Order search/filter: <2s
-- - Status updates: <500ms
-- =====================================================

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
-- Customer master data with ERP integration support

CREATE TABLE customers (
    customer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Company Information
    company_name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(20) DEFAULT 'MEDIUM',
    CHECK (company_size IN ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE')),
    
    -- Primary Contact
    primary_contact_name VARCHAR(100),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    secondary_contact_name VARCHAR(100),
    secondary_contact_email VARCHAR(255),
    secondary_contact_phone VARCHAR(20),
    
    -- Addresses (stored as JSONB for flexibility)
    billing_address JSONB,                          -- Structured address data
    shipping_address JSONB,                         -- Structured address data
    additional_addresses JSONB,                     -- Array of additional addresses
    
    -- Business Terms
    payment_terms INTEGER DEFAULT 30,              -- Net days
    credit_limit DECIMAL(12,2),
    tax_exempt BOOLEAN DEFAULT false,
    tax_id VARCHAR(50),
    
    -- Customer Classification
    customer_tier VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (customer_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'STANDARD')),
    preferred_customer BOOLEAN DEFAULT false,
    
    -- Communication Preferences
    preferred_communication VARCHAR(20) DEFAULT 'EMAIL',
    CHECK (preferred_communication IN ('EMAIL', 'PHONE', 'PORTAL', 'FAX')),
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- ERP Integration
    erp_customer_id VARCHAR(50),                    -- External ERP reference
    erp_last_sync TIMESTAMP,
    
    -- Status and Flags
    customer_status VARCHAR(20) DEFAULT 'ACTIVE',
    CHECK (customer_status IN ('ACTIVE', 'INACTIVE', 'PROSPECT', 'SUSPENDED', 'ARCHIVED')),
    requires_approval BOOLEAN DEFAULT false,        -- Orders require approval
    
    -- Notes and History
    notes TEXT,
    account_manager_id BIGINT,                      -- Assigned account manager
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT chk_customers_payment_terms_positive 
        CHECK (payment_terms > 0),
    CONSTRAINT chk_customers_credit_limit_positive 
        CHECK (credit_limit IS NULL OR credit_limit >= 0),
    CONSTRAINT chk_customers_email_format 
        CHECK (primary_contact_email IS NULL OR primary_contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for customers
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_company ON customers(company_name);
CREATE INDEX idx_customers_status ON customers(customer_status);
CREATE INDEX idx_customers_erp ON customers(erp_customer_id);
CREATE INDEX idx_customers_account_manager ON customers(account_manager_id);
CREATE INDEX idx_customers_tier ON customers(customer_tier);

-- Full-text search for customers
CREATE INDEX idx_customers_search_gin ON customers USING gin(
    (company_name || ' ' || COALESCE(primary_contact_name, '')) gin_trgm_ops
);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
-- Main orders table supporting the 8-phase workflow

CREATE TABLE orders (
    order_id VARCHAR(20) PRIMARY KEY,               -- e.g., "ORD-2025-0001"
    order_number VARCHAR(50) UNIQUE NOT NULL,       -- Human-readable order number
    customer_id BIGINT NOT NULL,
    customer_po_number VARCHAR(100),                -- Customer's PO reference
    
    -- Order Classification
    order_type VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (order_type IN ('STANDARD', 'CUSTOM', 'RUSH', 'PROTOTYPE', 'REPAIR', 'WARRANTY')),
    
    -- Workflow Status (8-phase lifecycle)
    current_phase VARCHAR(20) DEFAULT 'DRAFT',
    CHECK (current_phase IN ('DRAFT', 'CONFIGURATION', 'APPROVAL', 'PRODUCTION', 
                             'QUALITY_CONTROL', 'PACKAGING', 'SHIPPING', 'DELIVERED', 
                             'CANCELLED', 'ON_HOLD')),
    
    -- Priority Management
    priority VARCHAR(20) DEFAULT 'NORMAL',
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
    
    -- Financial Information
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Dates and Scheduling
    order_date DATE NOT NULL,
    requested_delivery_date DATE,
    promised_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Phase Timing (for performance tracking)
    configuration_started_at TIMESTAMP,
    configuration_completed_at TIMESTAMP,
    production_started_at TIMESTAMP,
    production_completed_at TIMESTAMP,
    qc_started_at TIMESTAMP,
    qc_completed_at TIMESTAMP,
    
    -- Assignment and Ownership
    assigned_to BIGINT,                             -- Current responsible user
    created_by BIGINT NOT NULL,
    sales_rep_id BIGINT,                           -- Sales representative
    project_manager_id BIGINT,                     -- Project manager
    
    -- Special Handling
    is_rush_order BOOLEAN DEFAULT false,
    requires_special_packaging BOOLEAN DEFAULT false,
    requires_white_glove_delivery BOOLEAN DEFAULT false,
    
    -- Documentation and Notes
    special_instructions TEXT,
    internal_notes TEXT,
    customer_notes TEXT,
    
    -- Shipping Information
    shipping_method VARCHAR(50),
    shipping_account VARCHAR(50),                   -- Customer's shipping account
    tracking_number VARCHAR(100),
    
    -- Integration and External References
    erp_order_id VARCHAR(50),                       -- ERP system reference
    external_references JSONB,                      -- Other system references
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_orders_customer 
        FOREIGN KEY (customer_id) 
        REFERENCES customers(customer_id),
    CONSTRAINT chk_orders_amounts_positive 
        CHECK (subtotal >= 0 AND tax_amount >= 0 AND shipping_amount >= 0 AND total_amount >= 0),
    CONSTRAINT chk_orders_delivery_dates 
        CHECK (requested_delivery_date IS NULL OR requested_delivery_date >= order_date),
    CONSTRAINT chk_orders_promised_dates 
        CHECK (promised_delivery_date IS NULL OR promised_delivery_date >= order_date)
);

-- Indexes for orders (performance critical)
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_phase ON orders(current_phase);
CREATE INDEX idx_orders_priority ON orders(priority);
CREATE INDEX idx_orders_date ON orders(order_date DESC);
CREATE INDEX idx_orders_assigned ON orders(assigned_to);
CREATE INDEX idx_orders_delivery ON orders(requested_delivery_date);
CREATE INDEX idx_orders_type ON orders(order_type);
CREATE INDEX idx_orders_sales_rep ON orders(sales_rep_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_orders_status_date ON orders(current_phase, order_date DESC);
CREATE INDEX idx_orders_customer_status ON orders(customer_id, current_phase);
CREATE INDEX idx_orders_active_priority ON orders(priority, order_date DESC) 
    WHERE current_phase NOT IN ('DELIVERED', 'CANCELLED');

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
-- Line items for each order

CREATE TABLE order_items (
    item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    line_number INTEGER NOT NULL,
    assembly_id VARCHAR(50) NOT NULL,
    
    -- Quantity and Pricing
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2),
    line_total DECIMAL(12,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Configuration and Customization
    configuration_id BIGINT,                       -- Links to configuration table
    bom_id BIGINT,                                 -- Generated BOM reference
    custom_specifications JSONB,                   -- Item-specific customizations
    
    -- Production Tracking
    production_status VARCHAR(20) DEFAULT 'PENDING',
    CHECK (production_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED')),
    production_started_at TIMESTAMP,
    production_completed_at TIMESTAMP,
    estimated_completion_date DATE,
    
    -- Quality Control
    qc_status VARCHAR(20) DEFAULT 'PENDING',
    CHECK (qc_status IN ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'RETEST')),
    qc_completed_at TIMESTAMP,
    
    -- Delivery Information
    serial_numbers TEXT[],                          -- For tracking individual units
    lot_numbers TEXT[],                            -- For batch tracking
    
    -- Special Instructions
    special_instructions TEXT,
    handling_requirements TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_order_items_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_assembly 
        FOREIGN KEY (assembly_id) 
        REFERENCES assemblies(assembly_id),
    CONSTRAINT uk_order_line 
        UNIQUE (order_id, line_number),
    CONSTRAINT chk_order_items_quantity_positive 
        CHECK (quantity > 0),
    CONSTRAINT chk_order_items_price_positive 
        CHECK (unit_price IS NULL OR unit_price >= 0),
    CONSTRAINT chk_order_items_discount_valid 
        CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Indexes for order items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_assembly ON order_items(assembly_id);
CREATE INDEX idx_order_items_production_status ON order_items(production_status);
CREATE INDEX idx_order_items_qc_status ON order_items(qc_status);
CREATE INDEX idx_order_items_configuration ON order_items(configuration_id);
CREATE INDEX idx_order_items_bom ON order_items(bom_id);

-- =====================================================
-- ORDER STATUS HISTORY TABLE
-- =====================================================
-- Complete audit trail of order status changes

CREATE TABLE order_status_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    
    -- Status Transition
    from_phase VARCHAR(20),
    to_phase VARCHAR(20) NOT NULL,
    CHECK (to_phase IN ('DRAFT', 'CONFIGURATION', 'APPROVAL', 'PRODUCTION', 
                       'QUALITY_CONTROL', 'PACKAGING', 'SHIPPING', 'DELIVERED', 
                       'CANCELLED', 'ON_HOLD')),
    
    -- Change Information
    changed_by BIGINT NOT NULL,
    change_reason TEXT,
    change_type VARCHAR(20) DEFAULT 'MANUAL',
    CHECK (change_type IN ('MANUAL', 'AUTOMATIC', 'SYSTEM', 'INTEGRATION')),
    
    -- Timing Analysis
    phase_duration_hours DECIMAL(8,2),             -- Time spent in previous phase
    business_hours_duration DECIMAL(8,2),          -- Excluding weekends/holidays
    
    -- Additional Context
    notes TEXT,
    system_info JSONB,                              -- System context at time of change
    
    -- Metadata
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_order_history_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT chk_order_history_duration_positive 
        CHECK (phase_duration_hours IS NULL OR phase_duration_hours >= 0)
);

-- Indexes for order status history
CREATE INDEX idx_order_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_history_phase ON order_status_history(to_phase);
CREATE INDEX idx_order_history_date ON order_status_history(changed_at DESC);
CREATE INDEX idx_order_history_changed_by ON order_status_history(changed_by);

-- =====================================================
-- ORDER WORKFLOW RULES TABLE
-- =====================================================
-- Business rules for order workflow transitions

CREATE TABLE order_workflow_rules (
    rule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    
    -- Rule Scope
    from_phase VARCHAR(20) NOT NULL,
    to_phase VARCHAR(20) NOT NULL,
    order_type VARCHAR(20),                         -- Applies to specific order types
    customer_tier VARCHAR(20),                      -- Applies to specific customer tiers
    
    -- Rule Conditions
    conditions JSONB,                               -- Complex conditions in JSON
    required_permissions TEXT[],                    -- Required user permissions
    required_approvals TEXT[],                      -- Required approval types
    
    -- Validation Rules
    validation_rules JSONB,                         -- Data validation requirements
    
    -- Automation
    auto_execute BOOLEAN DEFAULT false,             -- Auto-execute transition
    auto_assign_to VARCHAR(50),                     -- Auto-assign to role/user
    
    -- Notifications
    notify_roles TEXT[],                            -- Roles to notify
    notify_users BIGINT[],                          -- Specific users to notify
    notification_template VARCHAR(100),             -- Email template to use
    
    -- Status and Priority
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,                   -- Lower number = higher priority
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    
    -- Constraints
    CONSTRAINT uk_workflow_rules_unique 
        UNIQUE (from_phase, to_phase, order_type, customer_tier),
    CONSTRAINT chk_workflow_rules_priority_positive 
        CHECK (priority > 0)
);

-- Indexes for workflow rules
CREATE INDEX idx_workflow_rules_transition ON order_workflow_rules(from_phase, to_phase);
CREATE INDEX idx_workflow_rules_active ON order_workflow_rules(is_active);
CREATE INDEX idx_workflow_rules_priority ON order_workflow_rules(priority);

-- =====================================================
-- ORDER ATTACHMENTS TABLE
-- =====================================================
-- File attachments for orders

CREATE TABLE order_attachments (
    attachment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),                          -- For integrity checking
    
    -- Classification
    attachment_type VARCHAR(50) NOT NULL,
    CHECK (attachment_type IN ('CUSTOMER_PO', 'DRAWING', 'SPECIFICATION', 'PHOTO', 
                              'CERTIFICATE', 'SHIPPING_LABEL', 'INVOICE', 'OTHER')),
    
    -- Access Control
    access_level VARCHAR(20) DEFAULT 'INTERNAL',
    CHECK (access_level IN ('PUBLIC', 'CUSTOMER', 'INTERNAL', 'RESTRICTED')),
    
    -- Metadata
    description TEXT,
    uploaded_by BIGINT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_order_attachments_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT chk_order_attachments_file_size_positive 
        CHECK (file_size_bytes > 0)
);

-- Indexes for order attachments
CREATE INDEX idx_order_attachments_order ON order_attachments(order_id);
CREATE INDEX idx_order_attachments_type ON order_attachments(attachment_type);
CREATE INDEX idx_order_attachments_uploaded_by ON order_attachments(uploaded_by);

-- =====================================================
-- ORDER NOTES TABLE
-- =====================================================
-- Timestamped notes and communications for orders

CREATE TABLE order_notes (
    note_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    
    -- Note Content
    note_text TEXT NOT NULL,
    note_type VARCHAR(20) DEFAULT 'GENERAL',
    CHECK (note_type IN ('GENERAL', 'CUSTOMER_COMMUNICATION', 'INTERNAL', 
                        'STATUS_UPDATE', 'ISSUE', 'RESOLUTION')),
    
    -- Visibility and Access
    is_internal BOOLEAN DEFAULT true,               -- Internal vs customer-visible
    is_important BOOLEAN DEFAULT false,             -- Flag important notes
    
    -- Related Information
    related_phase VARCHAR(20),                      -- Phase this note relates to
    related_user_id BIGINT,                         -- User this note relates to
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_order_notes_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT chk_order_notes_text_length 
        CHECK (length(note_text) >= 1)
);

-- Indexes for order notes
CREATE INDEX idx_order_notes_order ON order_notes(order_id);
CREATE INDEX idx_order_notes_type ON order_notes(note_type);
CREATE INDEX idx_order_notes_created_at ON order_notes(created_at DESC);
CREATE INDEX idx_order_notes_created_by ON order_notes(created_by);
CREATE INDEX idx_order_notes_important ON order_notes(is_important) WHERE is_important = true;

-- =====================================================
-- ORDER METRICS TABLE
-- =====================================================
-- Performance metrics and KPIs for orders

CREATE TABLE order_metrics (
    metric_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    
    -- Timing Metrics (in hours)
    total_cycle_time DECIMAL(8,2),
    configuration_time DECIMAL(8,2),
    approval_time DECIMAL(8,2),
    production_time DECIMAL(8,2),
    qc_time DECIMAL(8,2),
    packaging_time DECIMAL(8,2),
    shipping_time DECIMAL(8,2),
    
    -- Business Hours (excluding weekends/holidays)
    business_cycle_time DECIMAL(8,2),
    business_production_time DECIMAL(8,2),
    
    -- Performance Indicators
    on_time_delivery BOOLEAN,
    quality_first_pass BOOLEAN,                     -- Passed QC on first attempt
    customer_satisfaction_score INTEGER,            -- 1-10 scale
    
    -- Complexity and Resource Metrics
    bom_complexity_score INTEGER,                   -- Sum of assembly complexity scores
    resource_utilization_score DECIMAL(5,2),       -- Percentage of capacity used
    
    -- Cost Metrics
    actual_cost DECIMAL(12,2),
    cost_variance_percentage DECIMAL(5,2),          -- vs estimated cost
    
    -- Status
    is_final BOOLEAN DEFAULT false,                 -- Final metrics calculated
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_order_metrics_order 
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id) ON DELETE CASCADE,
    CONSTRAINT uk_order_metrics_order 
        UNIQUE (order_id),
    CONSTRAINT chk_order_metrics_times_positive 
        CHECK (total_cycle_time IS NULL OR total_cycle_time >= 0),
    CONSTRAINT chk_order_metrics_satisfaction_range 
        CHECK (customer_satisfaction_score IS NULL OR 
               customer_satisfaction_score BETWEEN 1 AND 10)
);

-- Indexes for order metrics
CREATE INDEX idx_order_metrics_order ON order_metrics(order_id);
CREATE INDEX idx_order_metrics_calculated_at ON order_metrics(calculated_at);
CREATE INDEX idx_order_metrics_on_time ON order_metrics(on_time_delivery);
CREATE INDEX idx_order_metrics_satisfaction ON order_metrics(customer_satisfaction_score);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE customers IS 'Customer master data with ERP integration support';
COMMENT ON TABLE orders IS 'Main orders table supporting 8-phase workflow lifecycle';
COMMENT ON TABLE order_items IS 'Order line items with production and QC tracking';
COMMENT ON TABLE order_status_history IS 'Complete audit trail of order status changes';
COMMENT ON TABLE order_workflow_rules IS 'Business rules for order workflow transitions';
COMMENT ON TABLE order_attachments IS 'File attachments associated with orders';
COMMENT ON TABLE order_notes IS 'Timestamped notes and communications for orders';
COMMENT ON TABLE order_metrics IS 'Performance metrics and KPIs for completed orders';

COMMENT ON COLUMN orders.current_phase IS '8-phase workflow: DRAFT -> CONFIGURATION -> APPROVAL -> PRODUCTION -> QUALITY_CONTROL -> PACKAGING -> SHIPPING -> DELIVERED';
COMMENT ON COLUMN order_items.production_status IS 'Production status independent of overall order phase';
COMMENT ON COLUMN order_status_history.phase_duration_hours IS 'Time spent in previous phase for performance analysis';
COMMENT ON COLUMN order_metrics.business_cycle_time IS 'Cycle time excluding weekends and holidays';

-- =====================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- =====================================================

-- Example performance validation queries:

-- Order dashboard query (should execute in <2s)
-- SELECT o.order_id, o.order_number, c.company_name, o.current_phase, o.priority,
--        o.order_date, o.total_amount, COUNT(oi.item_id) as item_count
-- FROM orders o
-- JOIN customers c ON o.customer_id = c.customer_id
-- LEFT JOIN order_items oi ON o.order_id = oi.order_id
-- WHERE o.current_phase IN ('PRODUCTION', 'QUALITY_CONTROL', 'PACKAGING')
-- GROUP BY o.order_id, c.company_name
-- ORDER BY o.priority DESC, o.order_date;

-- Active orders by phase (should execute in <1s)
-- SELECT current_phase, COUNT(*) as order_count, AVG(total_amount) as avg_value
-- FROM orders 
-- WHERE current_phase NOT IN ('DELIVERED', 'CANCELLED')
-- GROUP BY current_phase;