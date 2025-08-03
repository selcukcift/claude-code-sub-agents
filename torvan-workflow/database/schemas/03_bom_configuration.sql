-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- BOM GENERATION & CONFIGURATION SCHEMA
-- =====================================================
-- 
-- This schema implements dynamic BOM generation and configuration management:
-- - Configuration-driven BOM generation based on customer selections
-- - 700-series custom part creation for non-standard configurations  
-- - Real-time validation against business rules
-- - Version control for BOM revisions
-- - Support for complex sink configurations (basin count, types, features)
-- 
-- Key Features:
-- - Sub-5 second BOM generation performance
-- - Complex configuration parameter support
-- - Business rules engine integration
-- - Custom part specification management
-- - Version control and approval workflow
-- 
-- Performance Targets:
-- - BOM generation: <5s for complex configurations
-- - Configuration validation: <1s
-- - Rules processing: <500ms
-- =====================================================

-- =====================================================
-- CONFIGURATIONS TABLE
-- =====================================================
-- Product configurations based on customer requirements

CREATE TABLE configurations (
    configuration_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    configuration_name VARCHAR(100) NOT NULL,
    configuration_code VARCHAR(50),                -- Unique code for this configuration
    order_item_id BIGINT,                          -- Links to order item
    assembly_id VARCHAR(50) NOT NULL,
    
    -- Basic Configuration Parameters
    base_configuration JSONB,                      -- Base configuration template
    custom_parameters JSONB,                       -- Customer-specific parameters
    
    -- Sink Configuration Parameters (medical equipment specific)
    sink_length_inches INTEGER,                    -- Variable sink lengths
    sink_width_inches INTEGER DEFAULT 20,
    sink_depth_inches INTEGER DEFAULT 8,           -- 8 or 10 inches standard
    basin_count INTEGER DEFAULT 1,                 -- 1, 2, or 3 basins
    basin_type VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (basin_type IN ('EDR', 'ESK', 'STANDARD', 'CUSTOM')),
    basin_depth_inches INTEGER DEFAULT 8,          -- Individual basin depth
    
    -- Features Configuration
    has_lifter BOOLEAN DEFAULT false,
    lifter_type VARCHAR(20),
    CHECK (lifter_type IS NULL OR lifter_type IN ('DL14', 'DL27', 'LC1', 'CUSTOM')),
    has_overhead_light BOOLEAN DEFAULT false,
    overhead_light_type VARCHAR(20),
    has_basin_lights BOOLEAN DEFAULT false,
    basin_light_count INTEGER DEFAULT 0,
    has_dosing_pump BOOLEAN DEFAULT false,
    dosing_pump_type VARCHAR(20),
    has_temperature_control BOOLEAN DEFAULT false,
    temperature_control_type VARCHAR(20),
    
    -- Pegboard Configuration
    pegboard_type VARCHAR(20) DEFAULT 'PERFORATED',
    CHECK (pegboard_type IN ('PERFORATED', 'SOLID', 'NONE', 'CUSTOM')),
    pegboard_color VARCHAR(20),
    pegboard_material VARCHAR(20),
    
    -- Water System Configuration
    water_type VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (water_type IN ('STANDARD', 'DI', 'MIXED', 'HOT_COLD', 'CUSTOM')),
    has_temperature_monitoring BOOLEAN DEFAULT false,
    has_water_filtration BOOLEAN DEFAULT false,
    water_pressure_requirements VARCHAR(50),
    
    -- Electrical Configuration
    voltage_requirements VARCHAR(20),               -- 110V, 220V, etc.
    electrical_certification VARCHAR(50),          -- UL, CE, etc.
    has_gfci_protection BOOLEAN DEFAULT true,
    
    -- Material and Finish Options
    sink_material VARCHAR(20) DEFAULT 'STAINLESS_STEEL',
    sink_finish VARCHAR(20) DEFAULT 'BRUSHED',
    cabinet_material VARCHAR(20),
    cabinet_finish VARCHAR(20),
    countertop_material VARCHAR(20),
    
    -- Dimensional Constraints and Validations
    overall_dimensions JSONB,                       -- Final calculated dimensions
    weight_estimate_kg DECIMAL(8,2),               -- Estimated total weight
    
    -- Configuration Rules and Validation
    applied_rules JSONB,                           -- Rules applied during configuration
    validation_results JSONB,                     -- Validation results and warnings
    compatibility_checks JSONB,                   -- Component compatibility results
    is_valid BOOLEAN DEFAULT false,
    validation_errors TEXT[],                      -- Array of validation error messages
    validation_warnings TEXT[],                    -- Array of warnings
    
    -- Pricing and Costing
    base_price DECIMAL(12,2),                      -- Base configuration price
    options_price DECIMAL(12,2) DEFAULT 0,        -- Additional options cost
    engineering_cost DECIMAL(12,2) DEFAULT 0,     -- Custom engineering cost
    total_estimated_price DECIMAL(12,2),          -- Total configuration price
    cost_breakdown JSONB,                          -- Detailed cost breakdown
    
    -- Manufacturing Information
    estimated_build_time_hours DECIMAL(8,2),      -- Estimated manufacturing time
    complexity_score INTEGER DEFAULT 1,            -- Manufacturing complexity (1-10)
    requires_custom_parts BOOLEAN DEFAULT false,
    custom_parts_list JSONB,                      -- List of required custom parts
    
    -- Approval and Status
    status VARCHAR(20) DEFAULT 'DRAFT',
    CHECK (status IN ('DRAFT', 'VALIDATING', 'VALID', 'APPROVED', 'REJECTED', 'SUPERSEDED')),
    approved_by BIGINT,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Version Control
    version VARCHAR(20) DEFAULT '1.0',
    parent_configuration_id BIGINT,               -- For configuration revisions
    is_latest_version BOOLEAN DEFAULT true,
    
    -- Change Tracking
    change_summary TEXT,                          -- Summary of changes from parent
    change_reason VARCHAR(100),                   -- Reason for configuration change
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_configurations_order_item 
        FOREIGN KEY (order_item_id) 
        REFERENCES order_items(item_id),
    CONSTRAINT fk_configurations_assembly 
        FOREIGN KEY (assembly_id) 
        REFERENCES assemblies(assembly_id),
    CONSTRAINT fk_configurations_parent 
        FOREIGN KEY (parent_configuration_id) 
        REFERENCES configurations(configuration_id),
    CONSTRAINT fk_configurations_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_configurations_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT uk_configurations_code 
        UNIQUE (configuration_code),
    CONSTRAINT chk_configurations_basin_count_valid 
        CHECK (basin_count BETWEEN 1 AND 5),
    CONSTRAINT chk_configurations_dimensions_positive 
        CHECK (sink_length_inches IS NULL OR sink_length_inches > 0),
    CONSTRAINT chk_configurations_weight_positive 
        CHECK (weight_estimate_kg IS NULL OR weight_estimate_kg > 0),
    CONSTRAINT chk_configurations_prices_positive 
        CHECK (base_price IS NULL OR base_price >= 0),
    CONSTRAINT chk_configurations_complexity_range 
        CHECK (complexity_score BETWEEN 1 AND 10),
    CONSTRAINT chk_configurations_build_time_positive 
        CHECK (estimated_build_time_hours IS NULL OR estimated_build_time_hours > 0)
);

-- Indexes for configurations
CREATE INDEX idx_configurations_order_item ON configurations(order_item_id);
CREATE INDEX idx_configurations_assembly ON configurations(assembly_id);
CREATE INDEX idx_configurations_status ON configurations(status);
CREATE INDEX idx_configurations_valid ON configurations(is_valid);
CREATE INDEX idx_configurations_approved_by ON configurations(approved_by);
CREATE INDEX idx_configurations_parent ON configurations(parent_configuration_id);
CREATE INDEX idx_configurations_latest ON configurations(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX idx_configurations_complexity ON configurations(complexity_score);

-- GIN indexes for JSONB fields
CREATE INDEX idx_configurations_base_config_gin ON configurations USING gin(base_configuration);
CREATE INDEX idx_configurations_custom_params_gin ON configurations USING gin(custom_parameters);
CREATE INDEX idx_configurations_validation_gin ON configurations USING gin(validation_results);

-- =====================================================
-- BOMS TABLE
-- =====================================================
-- Bill of Materials generated from configurations

CREATE TABLE boms (
    bom_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bom_number VARCHAR(50) UNIQUE NOT NULL,        -- Auto-generated BOM number
    configuration_id BIGINT NOT NULL,
    assembly_id VARCHAR(50) NOT NULL,
    
    -- BOM Classification
    bom_type VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (bom_type IN ('STANDARD', 'CUSTOM', 'PROTOTYPE', 'REPAIR', 'SPARE_PARTS')),
    
    -- BOM Summary Statistics
    total_parts_count INTEGER DEFAULT 0,
    unique_parts_count INTEGER DEFAULT 0,
    custom_parts_count INTEGER DEFAULT 0,
    total_estimated_cost DECIMAL(12,2) DEFAULT 0,
    total_estimated_weight_kg DECIMAL(10,3) DEFAULT 0,
    
    -- Manufacturing Estimates
    estimated_build_hours DECIMAL(8,2) DEFAULT 0,
    estimated_assembly_complexity INTEGER DEFAULT 1, -- 1-10 scale
    critical_path_hours DECIMAL(8,2),              -- Longest assembly sequence
    
    -- Status and Approval Workflow
    status VARCHAR(20) DEFAULT 'DRAFT',
    CHECK (status IN ('DRAFT', 'CALCULATING', 'PENDING_REVIEW', 'PENDING_APPROVAL', 
                     'APPROVED', 'REJECTED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED')),
    
    -- Approval Chain
    reviewed_by BIGINT,
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Version Control
    version VARCHAR(20) DEFAULT '1.0',
    parent_bom_id BIGINT,                          -- For BOM revisions
    is_latest_version BOOLEAN DEFAULT true,
    
    -- Generation Information
    generated_by BIGINT NOT NULL,                  -- User who generated the BOM
    generation_method VARCHAR(20) DEFAULT 'AUTOMATIC',
    CHECK (generation_method IN ('AUTOMATIC', 'MANUAL', 'HYBRID', 'IMPORTED')),
    generation_rules_applied JSONB,                -- Rules used in generation
    generation_parameters JSONB,                   -- Parameters used in generation
    generation_duration_ms INTEGER,                -- Time taken to generate
    
    -- Quality and Validation
    validation_status VARCHAR(20) DEFAULT 'PENDING',
    CHECK (validation_status IN ('PENDING', 'VALID', 'INVALID', 'WARNING')),
    validation_errors TEXT[],
    validation_warnings TEXT[],
    last_validated_at TIMESTAMP,
    
    -- Integration and External References
    erp_bom_id VARCHAR(50),                        -- ERP system reference
    external_references JSONB,                     -- Other system references
    
    -- Change Management
    change_reason TEXT,
    change_impact_assessment TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_boms_configuration 
        FOREIGN KEY (configuration_id) 
        REFERENCES configurations(configuration_id),
    CONSTRAINT fk_boms_assembly 
        FOREIGN KEY (assembly_id) 
        REFERENCES assemblies(assembly_id),
    CONSTRAINT fk_boms_reviewed_by 
        FOREIGN KEY (reviewed_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_boms_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_boms_generated_by 
        FOREIGN KEY (generated_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_boms_parent 
        FOREIGN KEY (parent_bom_id) 
        REFERENCES boms(bom_id),
    CONSTRAINT chk_boms_parts_count_positive 
        CHECK (total_parts_count >= 0),
    CONSTRAINT chk_boms_cost_positive 
        CHECK (total_estimated_cost >= 0),
    CONSTRAINT chk_boms_weight_positive 
        CHECK (total_estimated_weight_kg >= 0),
    CONSTRAINT chk_boms_complexity_range 
        CHECK (estimated_assembly_complexity BETWEEN 1 AND 10)
);

-- Indexes for BOMs
CREATE INDEX idx_boms_configuration ON boms(configuration_id);
CREATE INDEX idx_boms_assembly ON boms(assembly_id);
CREATE INDEX idx_boms_status ON boms(status);
CREATE INDEX idx_boms_type ON boms(bom_type);
CREATE INDEX idx_boms_generated_by ON boms(generated_by);
CREATE INDEX idx_boms_approved_by ON boms(approved_by);
CREATE INDEX idx_boms_parent ON boms(parent_bom_id);
CREATE INDEX idx_boms_latest ON boms(is_latest_version) WHERE is_latest_version = true;
CREATE INDEX idx_boms_created_at ON boms(created_at DESC);

-- =====================================================
-- BOM LINE ITEMS TABLE
-- =====================================================
-- Individual components within each BOM

CREATE TABLE bom_line_items (
    line_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bom_id BIGINT NOT NULL,
    line_number INTEGER NOT NULL,
    
    -- Component Reference
    component_id VARCHAR(50) NOT NULL,
    component_type VARCHAR(20) NOT NULL DEFAULT 'PART',
    CHECK (component_type IN ('PART', 'ASSEMBLY', 'MATERIAL', 'SERVICE')),
    
    -- Quantity and Measurements
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(20) DEFAULT 'EACH',
    waste_factor DECIMAL(5,4) DEFAULT 0,           -- Manufacturing waste allowance
    adjusted_quantity DECIMAL(10,3),               -- Quantity including waste
    
    -- Costing Information
    unit_cost DECIMAL(10,4),
    extended_cost DECIMAL(12,2),                   -- quantity * unit_cost
    cost_source VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (cost_source IN ('STANDARD', 'QUOTED', 'ESTIMATED', 'CONTRACTED')),
    cost_date DATE,                                -- When cost was determined
    
    -- Configuration Context
    required_for_configs JSONB,                   -- Which configurations require this
    conditional_logic TEXT,                        -- When this component is needed
    configuration_parameters JSONB,                -- Config-specific parameters
    
    -- Substitution and Alternatives
    is_substitute BOOLEAN DEFAULT false,
    primary_component_id VARCHAR(50),             -- If this is a substitute
    substitute_group VARCHAR(20),
    preference_order INTEGER DEFAULT 1,           -- For multiple substitutes
    substitution_reason TEXT,
    
    -- Custom Part Information (700-series)
    is_custom_part BOOLEAN DEFAULT false,
    custom_part_specifications JSONB,             -- For 700-series parts
    custom_part_drawing_reference VARCHAR(100),
    custom_part_lead_time_days INTEGER,
    
    -- Manufacturing and Assembly Information
    assembly_sequence INTEGER DEFAULT 0,
    assembly_operation VARCHAR(100),               -- Operation description
    assembly_time_minutes DECIMAL(6,2),           -- Time to install/assemble
    assembly_station VARCHAR(50),                 -- Where assembly occurs
    
    -- Installation and Technical Details
    installation_notes TEXT,
    required_tools TEXT[],                         -- Tools needed for installation
    skill_level INTEGER DEFAULT 1,                -- Required skill level (1-5)
    safety_requirements TEXT,
    torque_specifications VARCHAR(100),
    installation_sequence INTEGER,
    
    -- Quality and Compliance
    quality_requirements TEXT,
    inspection_requirements TEXT,
    certifications_required TEXT[],
    
    -- Supply Chain Information
    preferred_supplier VARCHAR(100),
    supplier_part_number VARCHAR(100),
    lead_time_days INTEGER DEFAULT 0,
    minimum_order_quantity INTEGER DEFAULT 1,
    
    -- Change Control
    engineering_change_number VARCHAR(50),
    change_reason TEXT,
    effectivity_date DATE,
    
    -- Status and Flags
    is_active BOOLEAN DEFAULT true,
    is_critical_path BOOLEAN DEFAULT false,        -- Part of critical manufacturing path
    requires_approval BOOLEAN DEFAULT false,       -- Requires special approval
    
    -- Notes and Documentation
    engineering_notes TEXT,
    manufacturing_notes TEXT,
    procurement_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_bom_line_items_bom 
        FOREIGN KEY (bom_id) 
        REFERENCES boms(bom_id) ON DELETE CASCADE,
    CONSTRAINT uk_bom_line_unique 
        UNIQUE (bom_id, line_number),
    CONSTRAINT chk_bom_line_items_quantity_positive 
        CHECK (quantity > 0),
    CONSTRAINT chk_bom_line_items_waste_factor_valid 
        CHECK (waste_factor >= 0 AND waste_factor < 1),
    CONSTRAINT chk_bom_line_items_unit_cost_positive 
        CHECK (unit_cost IS NULL OR unit_cost >= 0),
    CONSTRAINT chk_bom_line_items_skill_level_range 
        CHECK (skill_level BETWEEN 1 AND 5),
    CONSTRAINT chk_bom_line_items_preference_positive 
        CHECK (preference_order > 0),
    CONSTRAINT chk_bom_line_items_lead_time_positive 
        CHECK (lead_time_days >= 0),
    CONSTRAINT chk_bom_line_items_min_qty_positive 
        CHECK (minimum_order_quantity > 0)
);

-- Indexes for BOM line items (critical for BOM performance)
CREATE INDEX idx_bom_line_items_bom ON bom_line_items(bom_id);
CREATE INDEX idx_bom_line_items_component ON bom_line_items(component_id, component_type);
CREATE INDEX idx_bom_line_items_custom ON bom_line_items(is_custom_part);
CREATE INDEX idx_bom_line_items_substitute ON bom_line_items(substitute_group) 
    WHERE substitute_group IS NOT NULL;
CREATE INDEX idx_bom_line_items_active ON bom_line_items(is_active);
CREATE INDEX idx_bom_line_items_critical_path ON bom_line_items(is_critical_path) 
    WHERE is_critical_path = true;
CREATE INDEX idx_bom_line_items_sequence ON bom_line_items(bom_id, assembly_sequence);

-- Covering index for BOM cost calculations
CREATE INDEX idx_bom_line_items_cost_covering ON bom_line_items 
    (bom_id, is_active) 
    INCLUDE (quantity, unit_cost, extended_cost);

-- =====================================================
-- CONFIGURATION RULES ENGINE
-- =====================================================
-- Business rules for product configuration validation

CREATE TABLE configuration_rules (
    rule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Rule Classification
    rule_type VARCHAR(30) NOT NULL,
    CHECK (rule_type IN ('VALIDATION', 'COMPONENT_SELECTION', 'PRICING', 
                        'COMPATIBILITY', 'CONSTRAINT', 'CALCULATION', 'SUBSTITUTION')),
    
    -- Rule Priority and Execution
    priority INTEGER DEFAULT 100,                 -- Lower number = higher priority
    execution_order INTEGER DEFAULT 100,          -- Order of execution within priority
    is_blocking BOOLEAN DEFAULT false,            -- Prevents configuration if fails
    
    -- Rule Conditions and Logic
    conditions JSONB NOT NULL,                    -- Rule conditions in structured format
    actions JSONB NOT NULL,                       -- Actions to take when rule fires
    parameters JSONB,                             -- Rule parameters and settings
    
    -- Rule Scope
    applies_to_assemblies TEXT[],                 -- Assembly IDs this rule affects
    applies_to_categories TEXT[],                 -- Category IDs this rule affects
    applies_to_product_families TEXT[],           -- Product families affected
    
    -- Complex Logic Support
    rule_expression TEXT,                         -- SQL-like expression for complex rules
    dependency_rules BIGINT[],                    -- Other rules this depends on
    conflicting_rules BIGINT[],                   -- Rules that conflict with this one
    
    -- Error and Warning Messages
    error_message TEXT,                           -- Message when rule fails
    warning_message TEXT,                         -- Warning message
    resolution_guidance TEXT,                     -- How to resolve rule violation
    
    -- Documentation and Examples
    description TEXT,
    business_rationale TEXT,                      -- Why this rule exists
    examples JSONB,                               -- Example scenarios
    
    -- Rule Effectiveness and Performance
    is_active BOOLEAN DEFAULT true,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    performance_weight DECIMAL(5,2) DEFAULT 1.0, -- Performance impact weight
    
    -- Usage Statistics
    execution_count BIGINT DEFAULT 0,
    success_count BIGINT DEFAULT 0,
    failure_count BIGINT DEFAULT 0,
    avg_execution_time_ms DECIMAL(8,2),
    last_executed_at TIMESTAMP,
    
    -- Change Management
    version VARCHAR(20) DEFAULT '1.0',
    change_reason TEXT,
    replaced_rule_id BIGINT,                      -- Rule this replaces
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_configuration_rules_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_configuration_rules_replaced_rule 
        FOREIGN KEY (replaced_rule_id) 
        REFERENCES configuration_rules(rule_id),
    CONSTRAINT chk_config_rules_priority_positive 
        CHECK (priority > 0),
    CONSTRAINT chk_config_rules_execution_order_positive 
        CHECK (execution_order > 0),
    CONSTRAINT chk_config_rules_weight_positive 
        CHECK (performance_weight > 0),
    CONSTRAINT chk_config_rules_effective_dates 
        CHECK (expiration_date IS NULL OR expiration_date > effective_date)
);

-- Indexes for configuration rules
CREATE INDEX idx_config_rules_type ON configuration_rules(rule_type);
CREATE INDEX idx_config_rules_active ON configuration_rules(is_active);
CREATE INDEX idx_config_rules_priority ON configuration_rules(priority, execution_order);
CREATE INDEX idx_config_rules_effective ON configuration_rules(effective_date, expiration_date);
CREATE INDEX idx_config_rules_blocking ON configuration_rules(is_blocking) WHERE is_blocking = true;

-- GIN indexes for arrays and JSONB
CREATE INDEX idx_config_rules_assemblies_gin ON configuration_rules USING gin(applies_to_assemblies);
CREATE INDEX idx_config_rules_categories_gin ON configuration_rules USING gin(applies_to_categories);
CREATE INDEX idx_config_rules_conditions_gin ON configuration_rules USING gin(conditions);
CREATE INDEX idx_config_rules_actions_gin ON configuration_rules USING gin(actions);

-- =====================================================
-- CUSTOM PARTS REGISTRY (700-series)
-- =====================================================
-- Registry for custom manufactured parts

CREATE TABLE custom_parts_registry (
    custom_part_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    part_number VARCHAR(50) UNIQUE NOT NULL,      -- 700-series part number
    part_name VARCHAR(200) NOT NULL,
    
    -- Base Part Information
    base_part_id VARCHAR(50),                      -- Standard part this is based on
    customization_type VARCHAR(30) NOT NULL,
    CHECK (customization_type IN ('DIMENSIONAL', 'MATERIAL', 'FINISH', 'FEATURE', 'COMPLETE_CUSTOM')),
    
    -- Custom Specifications
    custom_specifications JSONB NOT NULL,          -- Detailed custom specifications
    dimensional_changes JSONB,                     -- Dimensional modifications
    material_specifications JSONB,                 -- Custom materials
    finish_specifications JSONB,                   -- Custom finishes
    
    -- Manufacturing Information
    manufacturing_process TEXT,                    -- How to manufacture
    required_tooling TEXT[],                       -- Special tooling required
    manufacturing_lead_time_days INTEGER NOT NULL, -- Custom part lead time
    setup_cost DECIMAL(10,2),                     -- One-time setup cost
    unit_cost DECIMAL(10,4),                      -- Per-unit manufacturing cost
    minimum_quantity INTEGER DEFAULT 1,            -- Minimum order quantity
    
    -- Engineering Information
    drawing_number VARCHAR(100),                   -- Engineering drawing reference
    drawing_revision VARCHAR(20),
    engineering_approval_required BOOLEAN DEFAULT true,
    engineering_approved_by BIGINT,
    engineering_approved_at TIMESTAMP,
    
    -- Quality and Testing
    quality_requirements TEXT,
    test_requirements TEXT,
    certification_requirements TEXT[],
    
    -- Usage and Applications
    applicable_assemblies TEXT[],                  -- Which assemblies can use this
    usage_instructions TEXT,
    installation_notes TEXT,
    
    -- Lifecycle Management
    status VARCHAR(20) DEFAULT 'DEVELOPMENT',
    CHECK (status IN ('DEVELOPMENT', 'APPROVED', 'ACTIVE', 'DEPRECATED', 'OBSOLETE')),
    first_used_date DATE,
    last_used_date DATE,
    usage_count INTEGER DEFAULT 0,
    
    -- Cost Tracking
    development_cost DECIMAL(10,2),               -- Development cost
    total_manufactured_quantity INTEGER DEFAULT 0,
    total_manufacturing_cost DECIMAL(12,2) DEFAULT 0,
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_custom_parts_base_part 
        FOREIGN KEY (base_part_id) 
        REFERENCES parts(part_id),
    CONSTRAINT fk_custom_parts_engineering_approved 
        FOREIGN KEY (engineering_approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_custom_parts_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_custom_parts_lead_time_positive 
        CHECK (manufacturing_lead_time_days > 0),
    CONSTRAINT chk_custom_parts_costs_positive 
        CHECK (setup_cost IS NULL OR setup_cost >= 0),
    CONSTRAINT chk_custom_parts_min_qty_positive 
        CHECK (minimum_quantity > 0),
    CONSTRAINT chk_custom_parts_usage_count_positive 
        CHECK (usage_count >= 0)
);

-- Indexes for custom parts registry
CREATE INDEX idx_custom_parts_part_number ON custom_parts_registry(part_number);
CREATE INDEX idx_custom_parts_base_part ON custom_parts_registry(base_part_id);
CREATE INDEX idx_custom_parts_type ON custom_parts_registry(customization_type);
CREATE INDEX idx_custom_parts_status ON custom_parts_registry(status);
CREATE INDEX idx_custom_parts_created_by ON custom_parts_registry(created_by);
CREATE INDEX idx_custom_parts_lead_time ON custom_parts_registry(manufacturing_lead_time_days);

-- GIN indexes for JSONB and arrays
CREATE INDEX idx_custom_parts_specs_gin ON custom_parts_registry USING gin(custom_specifications);
CREATE INDEX idx_custom_parts_assemblies_gin ON custom_parts_registry USING gin(applicable_assemblies);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE configurations IS 'Product configurations with complex parameter support';
COMMENT ON TABLE boms IS 'Bill of Materials generated from configurations with approval workflow';
COMMENT ON TABLE bom_line_items IS 'Individual components within BOMs with detailed assembly information';
COMMENT ON TABLE configuration_rules IS 'Business rules engine for configuration validation and processing';
COMMENT ON TABLE custom_parts_registry IS '700-series custom parts registry with manufacturing specifications';

COMMENT ON COLUMN configurations.complexity_score IS 'Manufacturing complexity score (1-10) for resource planning';
COMMENT ON COLUMN boms.generation_duration_ms IS 'BOM generation time in milliseconds for performance monitoring';
COMMENT ON COLUMN bom_line_items.is_critical_path IS 'Component is part of critical manufacturing path';
COMMENT ON COLUMN configuration_rules.is_blocking IS 'Rule prevents configuration completion if it fails';
COMMENT ON COLUMN custom_parts_registry.part_number IS '700-series part number for custom manufactured parts';

-- =====================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- =====================================================

-- BOM generation performance test (should execute in <5s)
-- SELECT bli.component_id, bli.quantity, bli.unit_cost, 
--        (bli.quantity * bli.unit_cost) as extended_cost
-- FROM boms b
-- JOIN bom_line_items bli ON b.bom_id = bli.bom_id
-- WHERE b.configuration_id = ? AND bli.is_active = true
-- ORDER BY bli.assembly_sequence;

-- Configuration validation query (should execute in <1s)  
-- SELECT rule_name, rule_type, error_message
-- FROM configuration_rules
-- WHERE is_active = true AND is_blocking = true
-- AND (applies_to_assemblies @> ARRAY[?] OR applies_to_assemblies IS NULL)
-- ORDER BY priority, execution_order;