-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- INVENTORY MANAGEMENT SCHEMA
-- =====================================================
-- 
-- This schema defines the hierarchical inventory structure:
-- Categories -> Subcategories -> Assemblies -> Parts
-- 
-- Key Features:
-- - 4-level hierarchical product organization
-- - Support for 219 assemblies across 6 categories
-- - 481+ individual parts with detailed specifications
-- - Dynamic parent-child relationships
-- - Full-text search capabilities
-- - Performance optimized with proper indexing
-- 
-- Performance Targets:
-- - Category/Assembly lookups: <50ms
-- - Part searches: <100ms  
-- - Hierarchy traversal: <200ms
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
-- Top-level product categories (e.g., "718", "719", "720", etc.)
-- Supports nested categories through parent_category_id

CREATE TABLE categories (
    category_id VARCHAR(10) PRIMARY KEY,           -- e.g., "718", "719"
    name VARCHAR(100) NOT NULL,                    -- e.g., "CONTROL BOX"
    description TEXT,
    parent_category_id VARCHAR(10),                -- For nested categories
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_categories_parent 
        FOREIGN KEY (parent_category_id) 
        REFERENCES categories(category_id),
    CONSTRAINT chk_categories_name_length 
        CHECK (length(name) >= 1),
    CONSTRAINT chk_categories_display_order 
        CHECK (display_order >= 0)
);

-- Indexes for categories
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_display_order ON categories(display_order);
CREATE INDEX idx_categories_name_gin ON categories USING gin(name gin_trgm_ops);

-- =====================================================
-- SUBCATEGORIES TABLE  
-- =====================================================
-- Second-level product organization within categories
-- Up to 27 subcategories per category based on source data

CREATE TABLE subcategories (
    subcategory_id VARCHAR(20) PRIMARY KEY,        -- e.g., "718.001", "719.016"  
    category_id VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,                    -- e.g., "1 BASIN", "CONTROL BOX"
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Product specifications
    specifications JSONB,                          -- Category-specific specs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_subcategories_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT chk_subcategories_name_length 
        CHECK (length(name) >= 1),
    CONSTRAINT chk_subcategories_display_order 
        CHECK (display_order >= 0)
);

-- Indexes for subcategories
CREATE INDEX idx_subcategories_category ON subcategories(category_id);
CREATE INDEX idx_subcategories_active ON subcategories(is_active);
CREATE INDEX idx_subcategories_display_order ON subcategories(display_order);
CREATE INDEX idx_subcategories_name_gin ON subcategories USING gin(name gin_trgm_ops);
CREATE INDEX idx_subcategories_specs_gin ON subcategories USING gin(specifications);

-- =====================================================
-- ASSEMBLIES TABLE
-- =====================================================
-- Third-level product organization - actual orderable products
-- 219 assemblies based on source data analysis
-- Supports complex hierarchy with parent assemblies

CREATE TABLE assemblies (
    assembly_id VARCHAR(50) PRIMARY KEY,           -- e.g., "T2-CTRL-EDR1"
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id VARCHAR(10),
    subcategory_id VARCHAR(20),
    
    -- Assembly Classification
    assembly_type VARCHAR(20) NOT NULL DEFAULT 'COMPONENT',
    CHECK (assembly_type IN ('COMPONENT', 'KIT', 'SERVICE_PART', 'ACCESSORY')),
    
    -- Hierarchy Support
    parent_assembly_id VARCHAR(50),                -- For sub-assemblies
    assembly_level INTEGER DEFAULT 1,              -- Hierarchy depth
    
    -- Ordering Configuration
    can_order BOOLEAN DEFAULT true,
    is_kit BOOLEAN DEFAULT false,
    requires_configuration BOOLEAN DEFAULT false,  -- For BOM generation
    
    -- Financial Information
    base_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Physical Properties
    weight_kg DECIMAL(8,3),
    dimensions JSONB,                               -- {"length": 10, "width": 5, "height": 2}
    
    -- Status and Versioning
    status VARCHAR(20) DEFAULT 'ACTIVE',
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DEVELOPMENT')),
    version VARCHAR(20) DEFAULT '1.0',
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- Manufacturing Information
    lead_time_days INTEGER DEFAULT 0,
    build_time_hours DECIMAL(6,2),
    complexity_score INTEGER DEFAULT 1,            -- 1-10 scale for scheduling
    
    -- Search and Classification
    tags TEXT[],                                    -- Searchable tags
    product_family VARCHAR(50),
    market_segment VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_assemblies_category 
        FOREIGN KEY (category_id) 
        REFERENCES categories(category_id),
    CONSTRAINT fk_assemblies_subcategory 
        FOREIGN KEY (subcategory_id) 
        REFERENCES subcategories(subcategory_id),
    CONSTRAINT fk_assemblies_parent 
        FOREIGN KEY (parent_assembly_id) 
        REFERENCES assemblies(assembly_id),
    CONSTRAINT chk_assemblies_name_length 
        CHECK (length(name) >= 1),
    CONSTRAINT chk_assemblies_price_positive 
        CHECK (base_price IS NULL OR base_price >= 0),
    CONSTRAINT chk_assemblies_weight_positive 
        CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT chk_assemblies_lead_time_positive 
        CHECK (lead_time_days >= 0),
    CONSTRAINT chk_assemblies_complexity_range 
        CHECK (complexity_score BETWEEN 1 AND 10),
    CONSTRAINT chk_assemblies_effective_dates 
        CHECK (end_date IS NULL OR end_date >= effective_date)
);

-- Indexes for assemblies (performance critical)
CREATE INDEX idx_assemblies_category ON assemblies(category_id);
CREATE INDEX idx_assemblies_subcategory ON assemblies(subcategory_id);
CREATE INDEX idx_assemblies_parent ON assemblies(parent_assembly_id);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_assemblies_type ON assemblies(assembly_type);
CREATE INDEX idx_assemblies_can_order ON assemblies(can_order) WHERE can_order = true;
CREATE INDEX idx_assemblies_effective_date ON assemblies(effective_date, end_date);
CREATE INDEX idx_assemblies_complexity ON assemblies(complexity_score);
CREATE INDEX idx_assemblies_family ON assemblies(product_family);

-- Full-text search index for assemblies  
CREATE INDEX idx_assemblies_search_gin ON assemblies USING gin(
    (name || ' ' || COALESCE(description, '')) gin_trgm_ops
);

-- GIN index for tags array
CREATE INDEX idx_assemblies_tags_gin ON assemblies USING gin(tags);

-- =====================================================
-- PARTS TABLE
-- =====================================================
-- Fourth-level - individual components and materials
-- 481+ parts based on source data analysis
-- Supports both standard and custom (700-series) parts

CREATE TABLE parts (
    part_id VARCHAR(50) PRIMARY KEY,               -- e.g., "1916", "T-OA-BINRAIL-24"
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Manufacturer Information
    manufacturer_part_number VARCHAR(100),
    manufacturer_name VARCHAR(200),
    manufacturer_info TEXT,
    supplier_part_number VARCHAR(100),
    
    -- Part Classification
    part_type VARCHAR(20) NOT NULL DEFAULT 'COMPONENT',
    CHECK (part_type IN ('COMPONENT', 'MATERIAL', 'HARDWARE', 'ELECTRONIC', 'CONSUMABLE')),
    
    -- Measurement and Costing
    unit_of_measure VARCHAR(20) DEFAULT 'EACH',
    unit_cost DECIMAL(10,4),
    currency VARCHAR(3) DEFAULT 'USD',
    weight_kg DECIMAL(8,3),
    
    -- Physical Properties
    dimensions JSONB,                               -- {"length": 10, "width": 5, "height": 2}
    specifications JSONB,                           -- Technical specifications
    material VARCHAR(100),                          -- Material type
    color VARCHAR(50),
    finish VARCHAR(100),
    
    -- Status and Availability
    status VARCHAR(20) DEFAULT 'ACTIVE',
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISCONTINUED', 'OBSOLETE')),
    
    -- Custom Parts (700-series)
    is_custom_part BOOLEAN DEFAULT false,
    custom_part_category VARCHAR(20),               -- For 700-series organization
    custom_specifications JSONB,                    -- Custom part specs
    
    -- Inventory Management
    lead_time_days INTEGER DEFAULT 0,
    min_order_qty INTEGER DEFAULT 1,
    max_order_qty INTEGER,
    reorder_point INTEGER,
    safety_stock INTEGER DEFAULT 0,
    
    -- Quality and Compliance
    quality_grade VARCHAR(20),
    certifications TEXT[],                          -- Quality certifications
    hazmat_info JSONB,                              -- Hazardous material info
    
    -- Search and Classification
    tags TEXT[],                                    -- Searchable tags
    keywords TEXT[],                                -- Additional search terms
    
    -- Version Control
    version VARCHAR(20) DEFAULT '1.0',
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT chk_parts_name_length 
        CHECK (length(name) >= 1),
    CONSTRAINT chk_parts_unit_cost_positive 
        CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT chk_parts_weight_positive 
        CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT chk_parts_lead_time_positive 
        CHECK (lead_time_days >= 0),
    CONSTRAINT chk_parts_min_order_positive 
        CHECK (min_order_qty > 0),
    CONSTRAINT chk_parts_max_order_valid 
        CHECK (max_order_qty IS NULL OR max_order_qty >= min_order_qty),
    CONSTRAINT chk_parts_safety_stock_positive 
        CHECK (safety_stock >= 0),
    CONSTRAINT chk_parts_effective_dates 
        CHECK (end_date IS NULL OR end_date >= effective_date)
);

-- Indexes for parts (performance critical for BOM generation)
CREATE INDEX idx_parts_status ON parts(status);
CREATE INDEX idx_parts_type ON parts(part_type);
CREATE INDEX idx_parts_custom ON parts(is_custom_part);
CREATE INDEX idx_parts_manufacturer ON parts(manufacturer_part_number);
CREATE INDEX idx_parts_supplier ON parts(supplier_part_number);
CREATE INDEX idx_parts_effective_date ON parts(effective_date, end_date);
CREATE INDEX idx_parts_lead_time ON parts(lead_time_days);
CREATE INDEX idx_parts_cost ON parts(unit_cost) WHERE unit_cost IS NOT NULL;

-- Full-text search index for parts (critical for search performance)
CREATE INDEX idx_parts_search_gin ON parts USING gin(
    (name || ' ' || 
     COALESCE(description, '') || ' ' || 
     COALESCE(manufacturer_part_number, '') || ' ' ||
     COALESCE(supplier_part_number, '')) gin_trgm_ops
);

-- GIN indexes for JSON fields and arrays
CREATE INDEX idx_parts_specifications_gin ON parts USING gin(specifications);
CREATE INDEX idx_parts_custom_specs_gin ON parts USING gin(custom_specifications);
CREATE INDEX idx_parts_tags_gin ON parts USING gin(tags);
CREATE INDEX idx_parts_keywords_gin ON parts USING gin(keywords);
CREATE INDEX idx_parts_certifications_gin ON parts USING gin(certifications);

-- =====================================================
-- ASSEMBLY COMPONENTS JUNCTION TABLE
-- =====================================================
-- Defines which parts/assemblies are used in each assembly
-- Critical for BOM generation and costing

CREATE TABLE assembly_components (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assembly_id VARCHAR(50) NOT NULL,
    component_id VARCHAR(50) NOT NULL,              -- Can reference parts or other assemblies
    component_type VARCHAR(20) NOT NULL DEFAULT 'PART',
    CHECK (component_type IN ('PART', 'ASSEMBLY')),
    
    -- Quantity and Measurement
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(20) DEFAULT 'EACH',
    waste_factor DECIMAL(5,4) DEFAULT 0,            -- Manufacturing waste percentage
    
    -- Assembly Information
    position_sequence INTEGER DEFAULT 0,
    assembly_step VARCHAR(100),                     -- Assembly step description
    assembly_time_minutes DECIMAL(6,2),            -- Time to install
    
    -- Configuration and Options
    is_optional BOOLEAN DEFAULT false,
    is_substitute BOOLEAN DEFAULT false,
    substitute_group VARCHAR(20),                   -- For grouping alternative parts
    configuration_rules JSONB,                     -- When this component is needed
    
    -- Installation Details
    installation_notes TEXT,
    required_tools TEXT[],                          -- Tools needed for installation
    skill_level INTEGER DEFAULT 1,                 -- 1-5 skill requirement
    safety_requirements TEXT,
    
    -- Status and Versioning
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_assembly_components_assembly 
        FOREIGN KEY (assembly_id) 
        REFERENCES assemblies(assembly_id) ON DELETE CASCADE,
    CONSTRAINT chk_assembly_components_quantity_positive 
        CHECK (quantity > 0),
    CONSTRAINT chk_assembly_components_waste_factor_valid 
        CHECK (waste_factor >= 0 AND waste_factor < 1),
    CONSTRAINT chk_assembly_components_skill_level_range 
        CHECK (skill_level BETWEEN 1 AND 5),
    CONSTRAINT chk_assembly_components_effective_dates 
        CHECK (end_date IS NULL OR end_date >= effective_date),
    
    -- Unique constraint to prevent duplicate components in same assembly
    CONSTRAINT uk_assembly_component_unique 
        UNIQUE (assembly_id, component_id, component_type, effective_date)
);

-- Indexes for assembly_components (critical for BOM performance)
CREATE INDEX idx_assembly_components_assembly ON assembly_components(assembly_id);
CREATE INDEX idx_assembly_components_component ON assembly_components(component_id, component_type);
CREATE INDEX idx_assembly_components_substitute ON assembly_components(substitute_group) 
    WHERE substitute_group IS NOT NULL;
CREATE INDEX idx_assembly_components_optional ON assembly_components(is_optional);
CREATE INDEX idx_assembly_components_active ON assembly_components(is_active);
CREATE INDEX idx_assembly_components_sequence ON assembly_components(assembly_id, position_sequence);
CREATE INDEX idx_assembly_components_effective ON assembly_components(effective_date, end_date);

-- Covering index for BOM generation queries
CREATE INDEX idx_assembly_components_bom_covering ON assembly_components 
    (assembly_id, is_active, effective_date, end_date) 
    INCLUDE (component_id, component_type, quantity, unit_of_measure);

-- GIN index for configuration rules
CREATE INDEX idx_assembly_components_config_gin ON assembly_components USING gin(configuration_rules);

-- =====================================================
-- PRODUCT VARIANTS TABLE
-- =====================================================
-- For managing product variants and configurations
-- Supports the dynamic product configuration system

CREATE TABLE product_variants (
    variant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assembly_id VARCHAR(50) NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    variant_code VARCHAR(50) NOT NULL,
    
    -- Variant Configuration
    configuration_parameters JSONB NOT NULL,        -- Variant-specific parameters
    price_adjustment DECIMAL(10,2) DEFAULT 0,       -- Price difference from base
    weight_adjustment_kg DECIMAL(8,3) DEFAULT 0,    -- Weight difference
    
    -- Manufacturing Impact
    lead_time_adjustment_days INTEGER DEFAULT 0,
    complexity_adjustment INTEGER DEFAULT 0,         -- Complexity score adjustment
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,               -- Default variant for assembly
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_product_variants_assembly 
        FOREIGN KEY (assembly_id) 
        REFERENCES assemblies(assembly_id) ON DELETE CASCADE,
    CONSTRAINT uk_product_variants_assembly_code 
        UNIQUE (assembly_id, variant_code),
    CONSTRAINT chk_product_variants_name_length 
        CHECK (length(variant_name) >= 1),
    CONSTRAINT chk_product_variants_complexity_range 
        CHECK (complexity_adjustment >= -5 AND complexity_adjustment <= 5)
);

-- Indexes for product variants
CREATE INDEX idx_product_variants_assembly ON product_variants(assembly_id);
CREATE INDEX idx_product_variants_active ON product_variants(is_active);
CREATE INDEX idx_product_variants_default ON product_variants(is_default) WHERE is_default = true;
CREATE INDEX idx_product_variants_config_gin ON product_variants USING gin(configuration_parameters);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE categories IS 'Top-level product categories supporting hierarchical organization';
COMMENT ON TABLE subcategories IS 'Second-level product organization within categories';
COMMENT ON TABLE assemblies IS 'Third-level orderable products and assemblies';
COMMENT ON TABLE parts IS 'Individual components and materials used in assemblies';
COMMENT ON TABLE assembly_components IS 'Junction table defining assembly composition';
COMMENT ON TABLE product_variants IS 'Product variants and configuration options';

COMMENT ON COLUMN assemblies.complexity_score IS 'Manufacturing complexity score (1-10) for scheduling';
COMMENT ON COLUMN parts.is_custom_part IS 'True for 700-series custom manufactured parts';
COMMENT ON COLUMN assembly_components.waste_factor IS 'Manufacturing waste percentage (0.0-0.99)';
COMMENT ON COLUMN assembly_components.skill_level IS 'Required skill level for assembly (1-5)';

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default categories (will be updated with actual data during migration)
INSERT INTO categories (category_id, name, description, display_order) VALUES
('718', 'Control Box Systems', 'Control box assemblies and components', 1),
('719', 'Basin Systems', 'Wash basin assemblies and related components', 2),
('720', 'Lighting Systems', 'Overhead and basin lighting components', 3),
('721', 'Plumbing Systems', 'Water supply and drainage components', 4),
('722', 'Electrical Systems', 'Electrical components and assemblies', 5),
('723', 'Mechanical Systems', 'Mechanical hardware and assemblies', 6);

-- Performance validation query (should execute in <100ms)
-- SELECT COUNT(*) FROM assemblies WHERE status = 'ACTIVE' AND can_order = true;