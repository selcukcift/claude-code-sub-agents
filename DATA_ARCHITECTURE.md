# TORVAN MEDICAL DATA ARCHITECTURE
## COMPREHENSIVE DATABASE DESIGN AND DATA MANAGEMENT STRATEGY

### EXECUTIVE SUMMARY

This document defines the complete data architecture for the TORVAN MEDICAL workflow management system, including database schema design, data access patterns, hierarchical inventory management, dynamic BOM generation, and comprehensive data governance strategies.

**Key Architecture Decisions:**
- **Database**: PostgreSQL for ACID compliance and complex relationships
- **ORM**: Prisma for type-safe database access and migrations
- **Caching**: Redis for session storage and query caching
- **File Storage**: AWS S3 for documents and images
- **Search**: PostgreSQL full-text search with optional Elasticsearch

---

## 1. DATABASE ARCHITECTURE OVERVIEW

### 1.1 Database Technology Selection

**PostgreSQL Selection Rationale:**
- **ACID Compliance**: Critical for order and inventory management
- **Complex Relationships**: Supports hierarchical inventory structure
- **JSON Support**: Flexible configuration storage
- **Full-text Search**: Built-in search capabilities
- **Scalability**: Proven performance for similar applications
- **Advanced Features**: CTEs, window functions, custom types

**Database Configuration:**
```sql
-- Database creation with optimized settings
CREATE DATABASE torvan_medical
    WITH ENCODING 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Performance optimizations
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
```

### 1.2 Schema Organization Strategy

**Schema Separation:**
```sql
-- Core business schemas
CREATE SCHEMA auth;      -- Authentication and authorization
CREATE SCHEMA inventory; -- Inventory and parts management
CREATE SCHEMA orders;    -- Order management and workflow
CREATE SCHEMA quality;   -- Quality control processes
CREATE SCHEMA audit;     -- Audit logging and compliance
CREATE SCHEMA files;     -- File and document management
```

---

## 2. CORE DATA MODEL DESIGN

### 2.1 User and Authentication Schema

```sql
-- Custom enum types
CREATE TYPE user_role AS ENUM (
    'PRODUCTION_COORDINATOR',
    'ADMIN', 
    'PROCUREMENT',
    'QC_PERSON',
    'ASSEMBLER',
    'SERVICE_DEPARTMENT'
);

CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    
    -- Personal information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    
    -- Account management
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Preferences
    preferences JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT password_not_empty CHECK (length(password_hash) > 0)
);

-- User sessions
CREATE TABLE auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Permission system
CREATE TABLE auth.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE auth.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES auth.permissions(id),
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);
```

### 2.2 Customer Management Schema

```sql
CREATE TYPE customer_type AS ENUM ('HEALTHCARE', 'LABORATORY', 'VETERINARY', 'RESEARCH', 'OTHER');
CREATE TYPE address_type AS ENUM ('BILLING', 'SHIPPING', 'BOTH');

-- Customer base table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Company information
    company_name VARCHAR(255) NOT NULL,
    customer_type customer_type DEFAULT 'HEALTHCARE',
    tax_id VARCHAR(50),
    
    -- Primary contact
    primary_contact_name VARCHAR(255),
    primary_contact_title VARCHAR(100),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(50),
    
    -- Business information
    website VARCHAR(255),
    industry VARCHAR(100),
    annual_revenue DECIMAL(15,2),
    employee_count INTEGER,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    credit_limit DECIMAL(10,2),
    payment_terms INTEGER DEFAULT 30, -- days
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Customer addresses
CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_type address_type NOT NULL,
    
    -- Address components
    label VARCHAR(100), -- e.g., "Main Office", "Warehouse"
    street_address_1 VARCHAR(255) NOT NULL,
    street_address_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'United States',
    
    -- Validation
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMPTZ,
    
    -- Default flags
    is_default_billing BOOLEAN DEFAULT FALSE,
    is_default_shipping BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Customer contacts
CREATE TABLE customer_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Contact information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    -- Contact preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    receives_notifications BOOLEAN DEFAULT TRUE,
    
    -- Status
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 Hierarchical Inventory Schema

```sql
-- Custom types for inventory
CREATE TYPE part_status AS ENUM ('ACTIVE', 'DISCONTINUED', 'PENDING_APPROVAL', 'OBSOLETE');
CREATE TYPE unit_of_measure AS ENUM ('EACH', 'PAIR', 'SET', 'FEET', 'INCHES', 'POUNDS', 'OUNCES');

-- Level 1: Categories
CREATE TABLE inventory.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES inventory.categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    
    -- Configuration
    requires_serial_numbers BOOLEAN DEFAULT FALSE,
    default_unit_of_measure unit_of_measure DEFAULT 'EACH',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_level CHECK (level >= 1 AND level <= 4)
);

-- Level 2: Assemblies
CREATE TABLE inventory.assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES inventory.categories(id),
    
    -- Identification
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Physical properties
    weight DECIMAL(8,3), -- pounds
    dimensions JSONB, -- {length, width, height, unit}
    material VARCHAR(100),
    finish VARCHAR(100),
    
    -- Costing
    standard_cost DECIMAL(10,2),
    current_cost DECIMAL(10,2),
    last_cost_update TIMESTAMPTZ,
    
    -- Manufacturing
    make_or_buy CHAR(1) DEFAULT 'M' CHECK (make_or_buy IN ('M', 'B')), -- Make or Buy
    lead_time_days INTEGER DEFAULT 0,
    setup_time_minutes INTEGER DEFAULT 0,
    cycle_time_minutes INTEGER DEFAULT 0,
    
    -- Documentation
    drawing_number VARCHAR(100),
    revision VARCHAR(10),
    specifications JSONB,
    
    -- Status and lifecycle
    status part_status DEFAULT 'ACTIVE',
    lifecycle_phase VARCHAR(50) DEFAULT 'PRODUCTION',
    obsolete_date DATE,
    replacement_part_id UUID REFERENCES inventory.assemblies(id),
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Level 3: Sub-assemblies
CREATE TABLE inventory.sub_assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id UUID NOT NULL REFERENCES inventory.assemblies(id),
    
    -- Identification (inherits pattern from assemblies)
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Physical properties
    weight DECIMAL(8,3),
    dimensions JSONB,
    material VARCHAR(100),
    finish VARCHAR(100),
    
    -- Costing
    standard_cost DECIMAL(10,2),
    current_cost DECIMAL(10,2),
    last_cost_update TIMESTAMPTZ,
    
    -- Manufacturing
    make_or_buy CHAR(1) DEFAULT 'M' CHECK (make_or_buy IN ('M', 'B')),
    lead_time_days INTEGER DEFAULT 0,
    setup_time_minutes INTEGER DEFAULT 0,
    cycle_time_minutes INTEGER DEFAULT 0,
    
    -- Quality requirements
    inspection_required BOOLEAN DEFAULT FALSE,
    inspection_type VARCHAR(50),
    
    -- Status
    status part_status DEFAULT 'ACTIVE',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id)
);

-- Level 4: Individual Parts
CREATE TABLE inventory.parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_assembly_id UUID REFERENCES inventory.sub_assemblies(id),
    
    -- Identification
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Classification
    is_custom_part BOOLEAN DEFAULT FALSE,
    is_service_part BOOLEAN DEFAULT TRUE,
    part_type VARCHAR(50), -- 'RAW_MATERIAL', 'COMPONENT', 'FASTENER', etc.
    
    -- Physical properties
    weight DECIMAL(8,3),
    dimensions JSONB,
    material VARCHAR(100),
    finish VARCHAR(100),
    color VARCHAR(50),
    
    -- Inventory management
    unit_of_measure unit_of_measure DEFAULT 'EACH',
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_allocated INTEGER DEFAULT 0,
    quantity_available AS (quantity_on_hand - quantity_allocated) STORED,
    
    -- Reorder parameters
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    safety_stock INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    
    -- Costing
    standard_cost DECIMAL(10,2),
    average_cost DECIMAL(10,2),
    last_cost DECIMAL(10,2),
    last_cost_update TIMESTAMPTZ,
    
    -- Vendor information
    primary_vendor_id UUID,
    vendor_part_number VARCHAR(100),
    
    -- Manufacturing/procurement
    make_or_buy CHAR(1) DEFAULT 'B' CHECK (make_or_buy IN ('M', 'B')),
    lead_time_days INTEGER DEFAULT 0,
    minimum_order_quantity INTEGER DEFAULT 1,
    order_multiple INTEGER DEFAULT 1,
    
    -- Quality and compliance
    inspection_required BOOLEAN DEFAULT FALSE,
    lot_control BOOLEAN DEFAULT FALSE,
    serial_control BOOLEAN DEFAULT FALSE,
    shelf_life_days INTEGER,
    
    -- Status
    status part_status DEFAULT 'ACTIVE',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT positive_quantities CHECK (
        quantity_on_hand >= 0 AND 
        quantity_allocated >= 0 AND
        reorder_point >= 0 AND
        reorder_quantity >= 0
    ),
    CONSTRAINT valid_costs CHECK (
        standard_cost >= 0 AND 
        average_cost >= 0 AND 
        last_cost >= 0
    )
);

-- Part alternatives and substitutes
CREATE TABLE inventory.part_substitutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_part_id UUID NOT NULL REFERENCES inventory.parts(id),
    substitute_part_id UUID NOT NULL REFERENCES inventory.parts(id),
    substitute_type VARCHAR(20) NOT NULL CHECK (substitute_type IN ('PREFERRED', 'ACCEPTABLE', 'EMERGENCY')),
    conversion_factor DECIMAL(10,4) DEFAULT 1.0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT no_self_substitute CHECK (primary_part_id != substitute_part_id),
    UNIQUE(primary_part_id, substitute_part_id)
);
```

### 2.4 Part Numbering System Implementation

```sql
-- Part number sequences for 700-series custom parts
CREATE TABLE inventory.part_number_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    prefix VARCHAR(10) NOT NULL,
    current_sequence INTEGER DEFAULT 0,
    last_generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(category, prefix)
);

-- Initialize 700-series sequences
INSERT INTO inventory.part_number_sequences (category, prefix, current_sequence) VALUES
('PEGBOARD', '710', 0),
('LEG_ASSEMBLY', '720', 0),
('BASIN_CUSTOM', '730', 0),
('FAUCET_CUSTOM', '740', 0),
('DRAIN_CUSTOM', '750', 0),
('ACCESSORY_CUSTOM', '760', 0),
('MISC_CUSTOM', '790', 0);

-- Function to generate next part number
CREATE OR REPLACE FUNCTION inventory.generate_part_number(
    part_category VARCHAR(50)
) RETURNS VARCHAR(100) AS $$
DECLARE
    next_sequence INTEGER;
    prefix_code VARCHAR(10);
    new_part_number VARCHAR(100);
BEGIN
    -- Get prefix and increment sequence
    UPDATE inventory.part_number_sequences 
    SET current_sequence = current_sequence + 1,
        last_generated_at = CURRENT_TIMESTAMP
    WHERE category = part_category
    RETURNING current_sequence, prefix INTO next_sequence, prefix_code;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown part category: %', part_category;
    END IF;
    
    -- Format: 7XX-XXXX (e.g., 710-0001)
    new_part_number := prefix_code || '-' || LPAD(next_sequence::TEXT, 4, '0');
    
    RETURN new_part_number;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. ORDER MANAGEMENT SCHEMA

### 3.1 Order Lifecycle Management

```sql
-- Order status enumeration
CREATE TYPE order_status AS ENUM (
    'PENDING',
    'IN_PRODUCTION', 
    'PRE_QC',
    'PRODUCTION_COMPLETE',
    'FINAL_QC',
    'QC_COMPLETE',
    'SHIPPED',
    'DELIVERED'
);

CREATE TYPE order_priority AS ENUM ('STANDARD', 'RUSH', 'EMERGENCY');
CREATE TYPE order_type AS ENUM ('PRODUCTION', 'SERVICE', 'WARRANTY', 'SAMPLE');

-- Main orders table
CREATE TABLE orders.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identification
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_type order_type DEFAULT 'PRODUCTION',
    
    -- Customer information
    customer_id UUID NOT NULL REFERENCES customers(id),
    customer_po_number VARCHAR(100),
    
    -- Order details
    status order_status NOT NULL DEFAULT 'PENDING',
    priority order_priority NOT NULL DEFAULT 'STANDARD',
    
    -- Dates
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_ship_date DATE,
    promised_ship_date DATE,
    actual_ship_date DATE,
    
    -- Financial
    subtotal DECIMAL(12,2),
    tax_amount DECIMAL(12,2),
    shipping_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    
    -- Configuration and requirements
    special_instructions TEXT,
    packing_instructions TEXT,
    shipping_instructions TEXT,
    
    -- Internal tracking
    assigned_to UUID REFERENCES auth.users(id),
    estimated_completion_date DATE,
    actual_completion_date DATE,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (
        requested_ship_date >= order_date AND
        promised_ship_date >= order_date AND
        (actual_ship_date IS NULL OR actual_ship_date >= order_date)
    ),
    CONSTRAINT valid_amounts CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        shipping_amount >= 0 AND
        total_amount >= 0
    )
);

-- Order status history tracking
CREATE TABLE orders.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    
    -- Status change details
    from_status order_status,
    to_status order_status NOT NULL,
    
    -- Change metadata
    changed_by UUID NOT NULL REFERENCES auth.users(id),
    change_reason VARCHAR(255),
    notes TEXT,
    
    -- Timing
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- System tracking
    ip_address INET,
    user_agent TEXT
);

-- Order line items (for service orders)
CREATE TABLE orders.order_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    
    -- Product information
    part_id UUID REFERENCES inventory.parts(id),
    part_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Quantities
    quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_shipped INTEGER DEFAULT 0 CHECK (quantity_shipped >= 0),
    quantity_backordered AS (quantity_ordered - quantity_shipped) STORED,
    
    -- Pricing
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    extended_price AS (quantity_ordered * unit_price) STORED,
    discount_percent DECIMAL(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount AS (extended_price * discount_percent / 100) STORED,
    net_amount AS (extended_price - discount_amount) STORED,
    
    -- Status
    line_status VARCHAR(20) DEFAULT 'OPEN' CHECK (line_status IN ('OPEN', 'SHIPPED', 'CANCELLED', 'BACKORDERED')),
    
    -- Dates
    requested_ship_date DATE,
    actual_ship_date DATE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(order_id, line_number)
);
```

### 3.2 Sink Configuration Schema

```sql
-- Sink families and models
CREATE TABLE products.sink_families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Base specifications
    base_width DECIMAL(6,2),
    base_depth DECIMAL(6,2),
    base_height DECIMAL(6,2),
    
    -- Configuration options
    available_materials TEXT[],
    available_finishes TEXT[],
    max_basins INTEGER DEFAULT 1,
    
    -- Pricing
    base_price DECIMAL(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_configurable BOOLEAN DEFAULT TRUE,
    
    -- Documentation
    product_sheet_url VARCHAR(500),
    installation_guide_url VARCHAR(500),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Order sink configurations
CREATE TABLE orders.order_sink_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    build_number VARCHAR(50) NOT NULL, -- Unique tracking number
    
    -- Sink selection
    sink_family_id UUID NOT NULL REFERENCES products.sink_families(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Body configuration
    body_material VARCHAR(100),
    body_finish VARCHAR(100),
    body_dimensions JSONB, -- {width, depth, height, unit}
    mounting_type VARCHAR(50),
    
    -- Basin configuration
    basin_configuration JSONB, -- Array of basin specifications
    
    -- Pegboard configuration
    pegboard_config JSONB, -- {width, height, hole_pattern, material, custom_specs}
    
    -- Leg configuration
    leg_config JSONB, -- {type, height, material, adjustability, custom_specs}
    
    -- Additional components
    additional_components JSONB, -- Array of additional component specifications
    
    -- Pricing
    configuration_price DECIMAL(10,2),
    
    -- Status
    configuration_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (
        configuration_status IN ('DRAFT', 'VALIDATED', 'APPROVED', 'IN_PRODUCTION')
    ),
    
    -- Validation
    validated_at TIMESTAMPTZ,
    validated_by UUID REFERENCES auth.users(id),
    validation_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(order_id, build_number)
);
```

---

## 4. BILL OF MATERIALS (BOM) SCHEMA

### 4.1 Dynamic BOM Generation System

```sql
-- BOM headers
CREATE TABLE orders.boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id),
    version INTEGER NOT NULL DEFAULT 1,
    
    -- BOM metadata
    bom_type VARCHAR(20) DEFAULT 'PRODUCTION' CHECK (bom_type IN ('PRODUCTION', 'SERVICE', 'TEMPLATE')),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Generation details
    generated_from VARCHAR(20) CHECK (generated_from IN ('TEMPLATE', 'CONFIGURATION', 'MANUAL')),
    generation_method VARCHAR(100),
    configuration_snapshot JSONB, -- Snapshot of configuration at BOM generation
    
    -- Totals
    total_parts_count INTEGER DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    total_weight DECIMAL(10,3) DEFAULT 0,
    
    -- Status and approval
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'OBSOLETE')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Validity period
    effective_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    
    -- Comments and notes
    notes TEXT,
    change_reason TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(order_id, version)
);

-- BOM line items
CREATE TABLE orders.bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES orders.boms(id) ON DELETE CASCADE,
    
    -- Item identification
    line_number INTEGER NOT NULL,
    part_id UUID NOT NULL REFERENCES inventory.parts(id),
    
    -- Assembly hierarchy
    parent_item_id UUID REFERENCES orders.bom_items(id),
    level INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    
    -- Quantities
    quantity_required DECIMAL(10,4) NOT NULL CHECK (quantity_required > 0),
    quantity_per_assembly DECIMAL(10,4) DEFAULT 1,
    scrap_factor DECIMAL(5,4) DEFAULT 0 CHECK (scrap_factor >= 0 AND scrap_factor < 1),
    total_quantity AS (quantity_required * (1 + scrap_factor)) STORED,
    
    -- Costing
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    extended_cost AS (total_quantity * unit_cost) STORED,
    
    -- Item properties
    is_phantom BOOLEAN DEFAULT FALSE, -- Phantom items exist only for structure
    is_optional BOOLEAN DEFAULT FALSE,
    is_substitute BOOLEAN DEFAULT FALSE,
    original_part_id UUID REFERENCES inventory.parts(id), -- If this is a substitute
    
    -- Manufacturing details
    operation_sequence INTEGER,
    work_center VARCHAR(50),
    lead_time_offset_days INTEGER DEFAULT 0,
    
    -- Reference information
    reference_designator VARCHAR(50),
    find_number VARCHAR(20),
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(bom_id, line_number),
    CONSTRAINT valid_level CHECK (level >= 1 AND level <= 10),
    CONSTRAINT parent_level_check CHECK (
        parent_item_id IS NULL OR 
        level > (SELECT level FROM orders.bom_items WHERE id = parent_item_id)
    )
);

-- BOM templates for standard configurations
CREATE TABLE products.bom_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sink_family_id UUID NOT NULL REFERENCES products.sink_families(id),
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuration criteria
    configuration_rules JSONB, -- Rules for when this template applies
    
    -- Template metadata
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(sink_family_id, template_name, version)
);

-- BOM template items
CREATE TABLE products.bom_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES products.bom_templates(id) ON DELETE CASCADE,
    
    -- Item details
    line_number INTEGER NOT NULL,
    part_id UUID REFERENCES inventory.parts(id),
    part_number_pattern VARCHAR(100), -- For dynamic part selection
    
    -- Quantities (may include formulas)
    quantity_formula VARCHAR(255), -- e.g., "basin_count * 2"
    base_quantity DECIMAL(10,4) DEFAULT 1,
    
    -- Conditional inclusion
    include_condition VARCHAR(255), -- e.g., "pegboard.is_custom = true"
    
    -- Assembly structure
    parent_item_id UUID REFERENCES products.bom_template_items(id),
    level INTEGER NOT NULL DEFAULT 1,
    
    UNIQUE(template_id, line_number)
);
```

### 4.2 BOM Generation Logic Implementation

```sql
-- Function to calculate dynamic quantities
CREATE OR REPLACE FUNCTION orders.calculate_bom_quantity(
    quantity_formula VARCHAR(255),
    base_quantity DECIMAL(10,4),
    configuration_data JSONB
) RETURNS DECIMAL(10,4) AS $$
DECLARE
    calculated_quantity DECIMAL(10,4);
    basin_count INTEGER;
    pegboard_width DECIMAL(6,2);
    pegboard_height DECIMAL(6,2);
BEGIN
    -- Extract configuration values
    basin_count := COALESCE((configuration_data->'basins'->>'count')::INTEGER, 1);
    pegboard_width := COALESCE((configuration_data->'pegboard'->>'width')::DECIMAL, 0);
    pegboard_height := COALESCE((configuration_data->'pegboard'->>'height')::DECIMAL, 0);
    
    -- Process formula or return base quantity
    IF quantity_formula IS NULL OR quantity_formula = '' THEN
        RETURN base_quantity;
    END IF;
    
    -- Simple formula processing (in production, consider using a more robust parser)
    quantity_formula := REPLACE(quantity_formula, 'basin_count', basin_count::TEXT);
    quantity_formula := REPLACE(quantity_formula, 'pegboard_area', (pegboard_width * pegboard_height)::TEXT);
    
    -- Execute simple mathematical expressions
    IF quantity_formula ~ '^[0-9\.\+\-\*/\(\)\s]+$' THEN
        EXECUTE 'SELECT ' || quantity_formula INTO calculated_quantity;
        RETURN GREATEST(calculated_quantity, 0);
    ELSE
        -- Fallback to base quantity for complex formulas
        RETURN base_quantity;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate BOM from configuration
CREATE OR REPLACE FUNCTION orders.generate_bom_from_configuration(
    p_order_id UUID,
    p_sink_config_id UUID
) RETURNS UUID AS $$
DECLARE
    bom_record RECORD;
    template_record RECORD;
    config_data JSONB;
    new_bom_id UUID;
    item_record RECORD;
    calculated_qty DECIMAL(10,4);
BEGIN
    -- Get configuration data
    SELECT sink_family_id, 
           jsonb_build_object(
               'body', jsonb_build_object('material', body_material, 'finish', body_finish),
               'basins', basin_configuration,
               'pegboard', pegboard_config,
               'legs', leg_config,
               'components', additional_components
           ) INTO config_data
    FROM orders.order_sink_configurations 
    WHERE id = p_sink_config_id;
    
    -- Find appropriate BOM template
    SELECT * INTO template_record
    FROM products.bom_templates
    WHERE sink_family_id = (SELECT sink_family_id FROM orders.order_sink_configurations WHERE id = p_sink_config_id)
      AND is_active = true
      AND orders.evaluate_configuration_rules(configuration_rules, config_data)
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No suitable BOM template found for configuration';
    END IF;
    
    -- Create BOM header
    INSERT INTO orders.boms (
        order_id,
        version,
        generated_from,
        generation_method,
        configuration_snapshot,
        status,
        created_by
    ) VALUES (
        p_order_id,
        COALESCE((SELECT MAX(version) + 1 FROM orders.boms WHERE order_id = p_order_id), 1),
        'TEMPLATE',
        'AUTOMATIC',
        config_data,
        'DRAFT',
        (SELECT created_by FROM orders.orders WHERE id = p_order_id)
    ) RETURNING id INTO new_bom_id;
    
    -- Generate BOM items from template
    FOR item_record IN 
        SELECT * FROM products.bom_template_items 
        WHERE template_id = template_record.id
        ORDER BY line_number
    LOOP
        -- Check include condition
        IF item_record.include_condition IS NOT NULL AND 
           NOT orders.evaluate_include_condition(item_record.include_condition, config_data) THEN
            CONTINUE;
        END IF;
        
        -- Calculate quantity
        calculated_qty := orders.calculate_bom_quantity(
            item_record.quantity_formula,
            item_record.base_quantity,
            config_data
        );
        
        -- Insert BOM item
        INSERT INTO orders.bom_items (
            bom_id,
            line_number,
            part_id,
            parent_item_id,
            level,
            quantity_required,
            unit_cost
        ) VALUES (
            new_bom_id,
            item_record.line_number,
            item_record.part_id,
            item_record.parent_item_id,
            item_record.level,
            calculated_qty,
            (SELECT COALESCE(current_cost, standard_cost, 0) FROM inventory.parts WHERE id = item_record.part_id)
        );
    END LOOP;
    
    -- Update BOM totals
    PERFORM orders.update_bom_totals(new_bom_id);
    
    RETURN new_bom_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. QUALITY CONTROL SCHEMA

### 5.1 QC Process Management

```sql
CREATE TYPE qc_phase AS ENUM ('PRE_QC', 'FINAL_QC');
CREATE TYPE qc_status AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'WAIVED');
CREATE TYPE qc_item_type AS ENUM ('VISUAL_INSPECTION', 'MEASUREMENT', 'FUNCTIONAL_TEST', 'DOCUMENTATION');

-- QC Checklists
CREATE TABLE quality.qc_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id),
    phase qc_phase NOT NULL,
    
    -- Checklist metadata
    checklist_name VARCHAR(255),
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Status tracking
    status qc_status DEFAULT 'PENDING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    reviewed_by UUID REFERENCES auth.users(id),
    
    -- Results
    overall_result qc_status,
    pass_percentage DECIMAL(5,2),
    
    -- Comments
    inspector_notes TEXT,
    reviewer_notes TEXT,
    corrective_actions TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(order_id, phase)
);

-- QC Checklist Items
CREATE TABLE quality.qc_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES quality.qc_checklists(id) ON DELETE CASCADE,
    
    -- Item identification
    item_number INTEGER NOT NULL,
    category VARCHAR(100),
    
    -- Item details
    description TEXT NOT NULL,
    item_type qc_item_type NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    
    -- Specifications
    specification TEXT,
    tolerance VARCHAR(100),
    expected_value VARCHAR(255),
    measurement_unit VARCHAR(50),
    
    -- Test procedures
    test_procedure TEXT,
    required_tools TEXT[],
    estimated_time_minutes INTEGER,
    
    -- Results
    status qc_status DEFAULT 'PENDING',
    actual_value VARCHAR(255),
    measured_at TIMESTAMPTZ,
    measured_by UUID REFERENCES auth.users(id),
    
    -- Pass/Fail criteria
    pass_criteria TEXT,
    fail_reason TEXT,
    
    -- Documentation requirements
    photo_required BOOLEAN DEFAULT FALSE,
    document_required BOOLEAN DEFAULT FALSE,
    signature_required BOOLEAN DEFAULT FALSE,
    
    -- Comments
    inspector_comments TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(checklist_id, item_number)
);

-- QC Photos and Documentation
CREATE TABLE quality.qc_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_item_id UUID NOT NULL REFERENCES quality.qc_checklist_items(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    
    -- Image metadata
    width_pixels INTEGER,
    height_pixels INTEGER,
    
    -- URLs
    full_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Description
    description TEXT,
    photo_type VARCHAR(50), -- 'BEFORE', 'AFTER', 'DEFECT', 'MEASUREMENT'
    
    -- Metadata
    taken_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    taken_by UUID NOT NULL REFERENCES auth.users(id),
    camera_info JSONB, -- Camera metadata if available
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- QC Defects and Non-conformances
CREATE TABLE quality.qc_defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_item_id UUID NOT NULL REFERENCES quality.qc_checklist_items(id),
    
    -- Defect classification
    defect_code VARCHAR(50),
    defect_category VARCHAR(100),
    severity VARCHAR(20) CHECK (severity IN ('MINOR', 'MAJOR', 'CRITICAL')),
    
    -- Description
    description TEXT NOT NULL,
    root_cause TEXT,
    
    -- Location
    defect_location VARCHAR(255),
    coordinates JSONB, -- {x, y, z} coordinates if applicable
    
    -- Corrective actions
    corrective_action TEXT,
    preventive_action TEXT,
    
    -- Resolution
    resolution_status VARCHAR(20) DEFAULT 'OPEN' CHECK (
        resolution_status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WAIVED')
    ),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Impact
    affects_functionality BOOLEAN DEFAULT FALSE,
    affects_appearance BOOLEAN DEFAULT FALSE,
    customer_visible BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id)
);
```

---

## 6. WORKFLOW AND TASK MANAGEMENT SCHEMA

### 6.1 Task Management System

```sql
CREATE TYPE task_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD');
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE task_type AS ENUM ('ASSEMBLY', 'INSPECTION', 'PACKAGING', 'SHIPPING', 'DOCUMENTATION', 'QC');

-- Tasks table
CREATE TABLE workflow.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders.orders(id),
    
    -- Task identification
    task_number VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type task_type NOT NULL,
    
    -- Hierarchy and dependencies
    parent_task_id UUID REFERENCES workflow.tasks(id),
    sequence_number INTEGER,
    
    -- Assignment
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES auth.users(id),
    
    -- Status and priority
    status task_status DEFAULT 'PENDING',
    priority task_priority DEFAULT 'MEDIUM',
    
    -- Time tracking
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    
    -- Work details
    work_instructions TEXT,
    required_tools TEXT[],
    required_skills TEXT[],
    work_center VARCHAR(100),
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_progress_update TIMESTAMPTZ,
    
    -- Quality requirements
    inspection_required BOOLEAN DEFAULT FALSE,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Comments and notes
    notes TEXT,
    completion_notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Task dependencies
CREATE TABLE workflow.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_task_id UUID NOT NULL REFERENCES workflow.tasks(id) ON DELETE CASCADE,
    successor_task_id UUID NOT NULL REFERENCES workflow.tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'FINISH_TO_START' CHECK (
        dependency_type IN ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH')
    ),
    lag_time_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT no_self_dependency CHECK (predecessor_task_id != successor_task_id),
    UNIQUE(predecessor_task_id, successor_task_id)
);

-- Task time tracking
CREATE TABLE workflow.task_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Time details
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    -- Entry details
    description TEXT,
    activity_type VARCHAR(50), -- 'SETUP', 'WORK', 'REWORK', 'WAIT', 'BREAK'
    
    -- Status
    is_billable BOOLEAN DEFAULT TRUE,
    is_complete BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time)
);

-- Task materials consumption
CREATE TABLE workflow.task_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES workflow.tasks(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES inventory.parts(id),
    
    -- Quantities
    quantity_required DECIMAL(10,4) NOT NULL,
    quantity_issued DECIMAL(10,4) DEFAULT 0,
    quantity_consumed DECIMAL(10,4) DEFAULT 0,
    quantity_returned DECIMAL(10,4) DEFAULT 0,
    
    -- Tracking
    issued_at TIMESTAMPTZ,
    issued_by UUID REFERENCES auth.users(id),
    consumed_at TIMESTAMPTZ,
    consumed_by UUID REFERENCES auth.users(id),
    
    -- Location
    bin_location VARCHAR(100),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(task_id, part_id)
);
```

---

## 7. AUDIT AND COMPLIANCE SCHEMA

### 7.1 Comprehensive Audit Trail

```sql
CREATE TYPE audit_action AS ENUM (
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
    'STATUS_CHANGE', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT'
);

-- Audit log table
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action details
    action audit_action NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- 'order', 'user', 'inventory', etc.
    resource_id VARCHAR(100), -- ID of the affected resource
    
    -- User context
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    user_role user_role,
    
    -- Session context
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[], -- Array of field names that changed
    
    -- Additional context
    description TEXT,
    business_context JSONB, -- Additional business-specific context
    
    -- Request details
    request_method VARCHAR(10),
    request_path VARCHAR(500),
    request_params JSONB,
    
    -- Results
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    response_status INTEGER,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER
);

-- Data change log for specific tables
CREATE TABLE audit.data_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NOT NULL REFERENCES audit.audit_log(id),
    
    -- Table identification
    schema_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    
    -- Operation details
    operation CHAR(1) NOT NULL CHECK (operation IN ('I', 'U', 'D')), -- Insert, Update, Delete
    
    -- Row data
    old_row JSONB,
    new_row JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Login attempts tracking
CREATE TABLE audit.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Attempt details
    email VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Security
    is_suspicious BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0,
    
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 7.2 Audit Triggers Implementation

```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_id UUID;
    current_user_id UUID;
    current_session_id VARCHAR(255);
BEGIN
    -- Get current user context (this would be set by the application)
    current_user_id := current_setting('app.current_user_id', true)::UUID;
    current_session_id := current_setting('app.current_session_id', true);
    
    -- Create audit log entry
    INSERT INTO audit.audit_log (
        action,
        resource_type,
        resource_id,
        user_id,
        old_values,
        new_values,
        description
    ) VALUES (
        CASE TG_OP
            WHEN 'INSERT' THEN 'CREATE'
            WHEN 'UPDATE' THEN 'UPDATE'
            WHEN 'DELETE' THEN 'DELETE'
        END,
        TG_TABLE_NAME,
        CASE TG_OP
            WHEN 'DELETE' THEN OLD.id::TEXT
            ELSE NEW.id::TEXT
        END,
        current_user_id,
        CASE TG_OP
            WHEN 'INSERT' THEN NULL
            ELSE row_to_json(OLD)
        END,
        CASE TG_OP
            WHEN 'DELETE' THEN NULL
            ELSE row_to_json(NEW)
        END,
        TG_OP || ' on ' || TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME
    ) RETURNING id INTO audit_id;
    
    -- Create detailed change record
    INSERT INTO audit.data_changes (
        audit_log_id,
        schema_name,
        table_name,
        record_id,
        operation,
        old_row,
        new_row
    ) VALUES (
        audit_id,
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        CASE TG_OP
            WHEN 'DELETE' THEN OLD.id::TEXT
            ELSE NEW.id::TEXT
        END,
        CASE TG_OP
            WHEN 'INSERT' THEN 'I'
            WHEN 'UPDATE' THEN 'U'
            WHEN 'DELETE' THEN 'D'
        END,
        CASE TG_OP
            WHEN 'INSERT' THEN NULL
            ELSE row_to_json(OLD)
        END,
        CASE TG_OP
            WHEN 'DELETE' THEN NULL
            ELSE row_to_json(NEW)
        END
    );
    
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for key tables
CREATE TRIGGER audit_orders_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders.orders
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

CREATE TRIGGER audit_inventory_trigger
    AFTER INSERT OR UPDATE OR DELETE ON inventory.parts
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();
```

---

## 8. FILE STORAGE AND DOCUMENT MANAGEMENT

### 8.1 Document Management Schema

```sql
CREATE TYPE document_type AS ENUM (
    'ORDER_DOCUMENT', 'QC_PHOTO', 'WORK_INSTRUCTION', 'DRAWING', 
    'SPECIFICATION', 'CERTIFICATE', 'MANUAL', 'OTHER'
);

CREATE TYPE file_status AS ENUM ('UPLOADING', 'ACTIVE', 'ARCHIVED', 'DELETED');

-- Documents table
CREATE TABLE files.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- File identification
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_extension VARCHAR(10),
    mime_type VARCHAR(100),
    
    -- File properties
    file_size_bytes BIGINT NOT NULL,
    checksum_md5 VARCHAR(32),
    checksum_sha256 VARCHAR(64),
    
    -- Storage information
    storage_provider VARCHAR(50) DEFAULT 'AWS_S3',
    bucket_name VARCHAR(100),
    object_key VARCHAR(500) NOT NULL,
    storage_class VARCHAR(50),
    
    -- URLs
    public_url VARCHAR(500),
    secure_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Document metadata
    document_type document_type NOT NULL,
    title VARCHAR(255),
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Content information
    page_count INTEGER,
    duration_seconds INTEGER, -- For video files
    dimensions JSONB, -- {width, height} for images
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    requires_authentication BOOLEAN DEFAULT TRUE,
    allowed_roles user_role[],
    
    -- Status and lifecycle
    status file_status DEFAULT 'UPLOADING',
    archived_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Relationships
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    parent_document_id UUID REFERENCES files.documents(id),
    
    -- Metadata
    tags TEXT[],
    custom_metadata JSONB,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Document relationships
CREATE TABLE files.document_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES files.documents(id) ON DELETE CASCADE,
    
    -- Related entity
    entity_type VARCHAR(100) NOT NULL, -- 'order', 'part', 'user', etc.
    entity_id UUID NOT NULL,
    
    -- Relationship details
    relationship_type VARCHAR(50), -- 'ATTACHMENT', 'SPECIFICATION', 'PHOTO', etc.
    is_primary BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, entity_type, entity_id, relationship_type)
);

-- File access log
CREATE TABLE files.file_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES files.documents(id),
    
    -- Access details
    accessed_by UUID REFERENCES auth.users(id),
    access_type VARCHAR(20) CHECK (access_type IN ('VIEW', 'DOWNLOAD', 'PREVIEW')),
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    referer VARCHAR(500),
    
    -- Results
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    bytes_served BIGINT,
    
    accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. PERFORMANCE OPTIMIZATION STRATEGIES

### 9.1 Indexing Strategy

```sql
-- User and authentication indexes
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_role ON auth.users(role) WHERE status = 'ACTIVE';
CREATE INDEX idx_user_sessions_token ON auth.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON auth.user_sessions(user_id) WHERE is_active = true;

-- Customer indexes
CREATE INDEX idx_customers_company_name ON customers(company_name);
CREATE INDEX idx_customers_active ON customers(id) WHERE is_active = true;
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Inventory indexes
CREATE INDEX idx_parts_part_number ON inventory.parts(part_number);
CREATE INDEX idx_parts_name_gin ON inventory.parts USING gin(to_tsvector('english', name));
CREATE INDEX idx_parts_status ON inventory.parts(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_parts_sub_assembly ON inventory.parts(sub_assembly_id);
CREATE INDEX idx_parts_availability ON inventory.parts(quantity_available) WHERE quantity_available > 0;

-- Order indexes
CREATE INDEX idx_orders_order_number ON orders.orders(order_number);
CREATE INDEX idx_orders_customer_id ON orders.orders(customer_id);
CREATE INDEX idx_orders_status ON orders.orders(status);
CREATE INDEX idx_orders_created_date ON orders.orders(order_date);
CREATE INDEX idx_orders_assigned_user ON orders.orders(assigned_to) WHERE assigned_to IS NOT NULL;

-- BOM indexes
CREATE INDEX idx_boms_order_id ON orders.boms(order_id);
CREATE INDEX idx_boms_active ON orders.boms(order_id, version) WHERE is_active = true;
CREATE INDEX idx_bom_items_bom_id ON orders.bom_items(bom_id);
CREATE INDEX idx_bom_items_part_id ON orders.bom_items(part_id);

-- QC indexes
CREATE INDEX idx_qc_checklists_order_id ON quality.qc_checklists(order_id);
CREATE INDEX idx_qc_checklists_assigned ON quality.qc_checklists(assigned_to) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_qc_items_checklist_id ON quality.qc_checklist_items(checklist_id);

-- Task indexes
CREATE INDEX idx_tasks_order_id ON workflow.tasks(order_id);
CREATE INDEX idx_tasks_assigned_to ON workflow.tasks(assigned_to) WHERE status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_tasks_status ON workflow.tasks(status);
CREATE INDEX idx_tasks_due_date ON workflow.tasks(due_date) WHERE status IN ('PENDING', 'IN_PROGRESS');

-- Audit indexes
CREATE INDEX idx_audit_log_user_id ON audit.audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created_at ON audit.audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit.audit_log(action);

-- Document indexes
CREATE INDEX idx_documents_type ON files.documents(document_type);
CREATE INDEX idx_documents_uploaded_by ON files.documents(uploaded_by);
CREATE INDEX idx_documents_status ON files.documents(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_document_relationships_entity ON files.document_relationships(entity_type, entity_id);
```

### 9.2 Query Optimization Views

```sql
-- Order summary view for dashboard
CREATE VIEW orders.order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.priority,
    o.order_date,
    o.total_amount,
    c.company_name as customer_name,
    u.first_name || ' ' || u.last_name as created_by_name,
    COALESCE(sink_count.total_sinks, 0) as total_sinks,
    CASE 
        WHEN o.status = 'PENDING' THEN 'Awaiting Production'
        WHEN o.status = 'IN_PRODUCTION' THEN 'In Progress'
        WHEN o.status IN ('PRE_QC', 'FINAL_QC') THEN 'Quality Control'
        WHEN o.status = 'QC_COMPLETE' THEN 'Ready to Ship'
        WHEN o.status = 'SHIPPED' THEN 'Shipped'
        WHEN o.status = 'DELIVERED' THEN 'Delivered'
    END as status_display
FROM orders.orders o
JOIN customers c ON o.customer_id = c.id
JOIN auth.users u ON o.created_by = u.id
LEFT JOIN (
    SELECT order_id, SUM(quantity) as total_sinks
    FROM orders.order_sink_configurations
    GROUP BY order_id
) sink_count ON o.id = sink_count.order_id;

-- Inventory availability view
CREATE VIEW inventory.parts_availability AS
SELECT 
    p.id,
    p.part_number,
    p.name,
    p.quantity_on_hand,
    p.quantity_allocated,
    p.quantity_available,
    p.reorder_point,
    p.status,
    sa.name as sub_assembly_name,
    a.name as assembly_name,
    c.name as category_name,
    CASE 
        WHEN p.quantity_available <= 0 THEN 'OUT_OF_STOCK'
        WHEN p.quantity_available <= p.reorder_point THEN 'LOW_STOCK'
        WHEN p.quantity_available <= p.reorder_point * 2 THEN 'MEDIUM_STOCK'
        ELSE 'IN_STOCK'
    END as stock_status
FROM inventory.parts p
LEFT JOIN inventory.sub_assemblies sa ON p.sub_assembly_id = sa.id
LEFT JOIN inventory.assemblies a ON sa.assembly_id = a.id
LEFT JOIN inventory.categories c ON a.category_id = c.id
WHERE p.status = 'ACTIVE';

-- Task workload view
CREATE VIEW workflow.user_workload AS
SELECT 
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.role,
    COUNT(CASE WHEN t.status = 'PENDING' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) as active_tasks,
    COUNT(CASE WHEN t.status = 'COMPLETED' AND t.completed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as completed_last_30_days,
    SUM(CASE WHEN t.status IN ('PENDING', 'IN_PROGRESS') THEN COALESCE(t.estimated_duration_minutes, 0) END) as estimated_remaining_minutes,
    AVG(CASE WHEN t.status = 'COMPLETED' THEN t.actual_duration_minutes END) as avg_completion_time_minutes
FROM auth.users u
LEFT JOIN workflow.tasks t ON u.id = t.assigned_to
WHERE u.status = 'ACTIVE'
GROUP BY u.id, u.first_name, u.last_name, u.role;
```

---

## 10. DATA GOVERNANCE AND COMPLIANCE

### 10.1 Data Retention Policies

```sql
-- Data retention configuration
CREATE TABLE system.data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_schema VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    archive_before_delete BOOLEAN DEFAULT TRUE,
    policy_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(table_schema, table_name)
);

-- Initialize retention policies
INSERT INTO system.data_retention_policies (table_schema, table_name, retention_period_days, policy_description) VALUES
('orders', 'orders', 2555, '7 years retention for financial compliance'), -- 7 years
('audit', 'audit_log', 730, '2 years audit trail retention'), -- 2 years
('files', 'file_access_log', 365, '1 year file access logging'), -- 1 year
('auth', 'user_sessions', 90, '90 days session history'), -- 90 days
('audit', 'login_attempts', 365, '1 year login attempt history'), -- 1 year
('workflow', 'task_time_entries', 1095, '3 years time tracking data'), -- 3 years
('quality', 'qc_photos', 2555, '7 years QC documentation retention'); -- 7 years

-- Automated cleanup function
CREATE OR REPLACE FUNCTION system.cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    policy_record RECORD;
    cleanup_sql TEXT;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    FOR policy_record IN 
        SELECT * FROM system.data_retention_policies 
        WHERE is_active = true 
    LOOP
        -- Build cleanup SQL
        cleanup_sql := format(
            'DELETE FROM %I.%I WHERE created_at < CURRENT_DATE - INTERVAL ''%s days''',
            policy_record.table_schema,
            policy_record.table_name,
            policy_record.retention_period_days
        );
        
        -- Execute cleanup
        EXECUTE cleanup_sql;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        
        total_deleted := total_deleted + deleted_count;
        
        -- Log cleanup operation
        INSERT INTO audit.audit_log (
            action,
            resource_type,
            description,
            user_id
        ) VALUES (
            'DELETE',
            'DATA_CLEANUP',
            format('Cleaned up %s records from %s.%s', deleted_count, policy_record.table_schema, policy_record.table_name),
            NULL
        );
    END LOOP;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;
```

### 10.2 Data Backup and Recovery Strategy

```sql
-- Backup job tracking
CREATE TABLE system.backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL, -- 'FULL', 'INCREMENTAL', 'DIFFERENTIAL'
    backup_size_bytes BIGINT,
    backup_location VARCHAR(500),
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    error_message TEXT,
    
    -- Metadata
    backup_tool VARCHAR(100),
    compression_ratio DECIMAL(5,2),
    verification_status VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Database health monitoring
CREATE TABLE system.database_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type VARCHAR(100) NOT NULL,
    check_result VARCHAR(20) NOT NULL CHECK (check_result IN ('PASS', 'WARN', 'FAIL')),
    details JSONB,
    message TEXT,
    checked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

This comprehensive data architecture provides a robust foundation for the TORVAN MEDICAL workflow management system. The design emphasizes:

- **Data Integrity**: ACID compliance, foreign key constraints, and validation rules
- **Performance**: Strategic indexing, optimized queries, and materialized views
- **Scalability**: Hierarchical design that can grow with business needs
- **Compliance**: Comprehensive audit trails and data retention policies
- **Security**: Role-based access control and data encryption strategies
- **Maintainability**: Clear schema organization and documentation

The architecture supports all business requirements while providing the flexibility needed for future enhancements and growth.