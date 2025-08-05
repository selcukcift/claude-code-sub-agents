-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- QUALITY CONTROL & PRODUCTION TRACKING SCHEMA
-- =====================================================
-- 
-- This schema implements comprehensive quality control and production management:
-- - Multi-stage QC inspections throughout production
-- - Photo documentation for visual verification
-- - Digital checklists with pass/fail criteria
-- - Issue tracking and resolution workflow
-- - Production task management and scheduling
-- - Resource allocation and capacity planning
-- 
-- Key Features:
-- - Complete production workflow visibility
-- - Digital QC checklists and documentation
-- - Photo/media attachment support
-- - Issue tracking and resolution
-- - Performance metrics and KPIs
-- - Resource and capacity management
-- 
-- Performance Targets:
-- - QC process lookup: <100ms
-- - Production status updates: <200ms
-- - Issue resolution tracking: <500ms
-- =====================================================

-- =====================================================
-- QC PROCESSES TABLE
-- =====================================================
-- Quality control process definitions and templates

CREATE TABLE qc_processes (
    qc_process_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    process_name VARCHAR(100) NOT NULL,
    process_code VARCHAR(50) UNIQUE NOT NULL,
    assembly_id VARCHAR(50),                       -- Specific to assembly type
    
    -- Process Classification
    process_stage VARCHAR(20) NOT NULL,
    CHECK (process_stage IN ('INCOMING', 'IN_PROCESS', 'FINAL', 'PACKAGING', 'SHIPPING')),
    process_type VARCHAR(20) DEFAULT 'STANDARD',
    CHECK (process_type IN ('STANDARD', 'CUSTOM', 'CRITICAL', 'OPTIONAL')),
    
    -- Process Definition
    description TEXT,
    detailed_instructions TEXT,
    inspection_criteria JSONB,                     -- Detailed criteria in structured format
    required_photos JSONB,                         -- Photo requirements specification
    required_measurements JSONB,                   -- Measurement requirements
    
    -- Pass/Fail Criteria
    pass_threshold_percentage DECIMAL(5,2) DEFAULT 100.00,
    critical_checkpoints JSONB,                    -- Must-pass checkpoints
    warning_thresholds JSONB,                      -- Warning level thresholds
    
    -- Time and Resource Estimates
    estimated_duration_minutes INTEGER DEFAULT 30,
    required_skill_level INTEGER DEFAULT 1,        -- 1-5 skill level requirement
    required_certifications TEXT[],                -- Required inspector certifications
    
    -- Equipment and Tools
    required_equipment JSONB,                      -- Equipment needed for inspection
    required_tools TEXT[],                         -- Tools needed
    calibration_requirements JSONB,                -- Equipment calibration needs
    
    -- Documentation Requirements
    documentation_template JSONB,                  -- Template for inspection documentation
    photo_requirements JSONB,                      -- Specific photo requirements
    measurement_forms JSONB,                       -- Measurement form templates
    
    -- Approval and Versioning
    version VARCHAR(20) DEFAULT '1.0',
    approved_by BIGINT,
    approved_at TIMESTAMP,
    effective_date DATE DEFAULT CURRENT_DATE,
    revision_notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT true,             -- Must be performed
    
    -- Metadata
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_qc_processes_assembly 
        FOREIGN KEY (assembly_id) 
        REFERENCES assemblies(assembly_id),
    CONSTRAINT fk_qc_processes_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_qc_processes_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_qc_processes_duration_positive 
        CHECK (estimated_duration_minutes > 0),
    CONSTRAINT chk_qc_processes_skill_level_range 
        CHECK (required_skill_level BETWEEN 1 AND 5),
    CONSTRAINT chk_qc_processes_pass_threshold_valid 
        CHECK (pass_threshold_percentage BETWEEN 0 AND 100)
);

-- Indexes for QC processes
CREATE INDEX idx_qc_processes_assembly ON qc_processes(assembly_id);
CREATE INDEX idx_qc_processes_stage ON qc_processes(process_stage);
CREATE INDEX idx_qc_processes_type ON qc_processes(process_type);
CREATE INDEX idx_qc_processes_active ON qc_processes(is_active);
CREATE INDEX idx_qc_processes_mandatory ON qc_processes(is_mandatory) WHERE is_mandatory = true;
CREATE INDEX idx_qc_processes_skill_level ON qc_processes(required_skill_level);

-- GIN indexes for JSONB fields
CREATE INDEX idx_qc_processes_criteria_gin ON qc_processes USING gin(inspection_criteria);
CREATE INDEX idx_qc_processes_equipment_gin ON qc_processes USING gin(required_equipment);

-- =====================================================
-- QC INSPECTIONS TABLE
-- =====================================================
-- Individual quality control inspection instances

CREATE TABLE qc_inspections (
    inspection_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL, -- Human-readable inspection number
    order_item_id BIGINT NOT NULL,
    qc_process_id BIGINT NOT NULL,
    
    -- Inspector Information
    inspector_id BIGINT NOT NULL,
    backup_inspector_id BIGINT,                    -- Backup/secondary inspector
    inspector_certification_verified BOOLEAN DEFAULT false,
    
    -- Scheduling and Timing
    scheduled_date DATE,
    scheduled_start_time TIME,
    inspection_date DATE NOT NULL,
    inspection_start_time TIMESTAMP,
    inspection_end_time TIMESTAMP,
    actual_duration_minutes INTEGER,
    
    -- Inspection Results
    overall_result VARCHAR(20) DEFAULT 'PENDING',
    CHECK (overall_result IN ('PENDING', 'IN_PROGRESS', 'PASS', 'FAIL', 
                              'CONDITIONAL_PASS', 'RETEST_REQUIRED', 'CANCELLED')),
    
    -- Scoring and Metrics
    total_checkpoints INTEGER DEFAULT 0,
    passed_checkpoints INTEGER DEFAULT 0,
    failed_checkpoints INTEGER DEFAULT 0,
    warning_checkpoints INTEGER DEFAULT 0,
    pass_percentage DECIMAL(5,2),
    
    -- Quality Metrics
    defect_count INTEGER DEFAULT 0,
    critical_defects INTEGER DEFAULT 0,
    major_defects INTEGER DEFAULT 0,
    minor_defects INTEGER DEFAULT 0,
    
    -- Documentation and Notes
    inspection_notes TEXT,
    defect_descriptions TEXT,
    corrective_actions TEXT,
    preventive_actions TEXT,
    root_cause_analysis TEXT,
    
    -- Environmental Conditions
    temperature_celsius DECIMAL(5,2),
    humidity_percentage DECIMAL(5,2),
    environmental_conditions JSONB,                 -- Additional environmental data
    
    -- Equipment and Calibration
    equipment_used JSONB,                          -- Equipment used in inspection
    calibration_verified BOOLEAN DEFAULT false,
    calibration_dates JSONB,                      -- Calibration verification data
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by BIGINT,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    rejection_reason TEXT,
    
    -- Re-inspection Tracking
    is_reinspection BOOLEAN DEFAULT false,
    original_inspection_id BIGINT,                 -- Reference to original inspection
    reinspection_reason TEXT,
    reinspection_count INTEGER DEFAULT 0,
    
    -- Status and Flags
    is_final BOOLEAN DEFAULT false,                -- Final inspection result
    is_critical BOOLEAN DEFAULT false,             -- Critical inspection
    requires_customer_approval BOOLEAN DEFAULT false,
    
    -- Integration and External References
    external_inspection_id VARCHAR(100),           -- External system reference
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_qc_inspections_order_item 
        FOREIGN KEY (order_item_id) 
        REFERENCES order_items(item_id),
    CONSTRAINT fk_qc_inspections_qc_process 
        FOREIGN KEY (qc_process_id) 
        REFERENCES qc_processes(qc_process_id),
    CONSTRAINT fk_qc_inspections_inspector 
        FOREIGN KEY (inspector_id) 
        REFERENCES users(user_id),
    CONSTRAINT fk_qc_inspections_backup_inspector 
        FOREIGN KEY (backup_inspector_id) 
        REFERENCES users(user_id),
    CONSTRAINT fk_qc_inspections_approved_by 
        FOREIGN KEY (approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_qc_inspections_original 
        FOREIGN KEY (original_inspection_id) 
        REFERENCES qc_inspections(inspection_id),
    CONSTRAINT chk_qc_inspections_checkpoints_valid 
        CHECK (total_checkpoints >= 0 AND passed_checkpoints >= 0 AND failed_checkpoints >= 0),
    CONSTRAINT chk_qc_inspections_defects_valid 
        CHECK (defect_count >= 0 AND critical_defects >= 0 AND major_defects >= 0 AND minor_defects >= 0),
    CONSTRAINT chk_qc_inspections_pass_percentage_range 
        CHECK (pass_percentage IS NULL OR (pass_percentage >= 0 AND pass_percentage <= 100)),
    CONSTRAINT chk_qc_inspections_environmental_valid 
        CHECK (temperature_celsius IS NULL OR temperature_celsius BETWEEN -50 AND 100),
    CONSTRAINT chk_qc_inspections_humidity_valid 
        CHECK (humidity_percentage IS NULL OR (humidity_percentage >= 0 AND humidity_percentage <= 100))
);

-- Indexes for QC inspections
CREATE INDEX idx_qc_inspections_order_item ON qc_inspections(order_item_id);
CREATE INDEX idx_qc_inspections_qc_process ON qc_inspections(qc_process_id);
CREATE INDEX idx_qc_inspections_inspector ON qc_inspections(inspector_id);
CREATE INDEX idx_qc_inspections_date ON qc_inspections(inspection_date DESC);
CREATE INDEX idx_qc_inspections_result ON qc_inspections(overall_result);
CREATE INDEX idx_qc_inspections_final ON qc_inspections(is_final) WHERE is_final = true;
CREATE INDEX idx_qc_inspections_critical ON qc_inspections(is_critical) WHERE is_critical = true;
CREATE INDEX idx_qc_inspections_scheduled ON qc_inspections(scheduled_date, scheduled_start_time);
CREATE INDEX idx_qc_inspections_approved_by ON qc_inspections(approved_by);

-- =====================================================
-- QC INSPECTION ITEMS TABLE
-- =====================================================
-- Individual checkpoints within each inspection

CREATE TABLE qc_inspection_items (
    inspection_item_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inspection_id BIGINT NOT NULL,
    
    -- Item Identification
    item_sequence INTEGER NOT NULL,
    checkpoint_id VARCHAR(50),                     -- Reference to standard checkpoint
    item_description TEXT NOT NULL,
    item_category VARCHAR(50),                     -- Category of inspection item
    
    -- Inspection Type and Method
    inspection_type VARCHAR(30) NOT NULL,
    CHECK (inspection_type IN ('VISUAL', 'MEASUREMENT', 'FUNCTIONAL', 'DOCUMENTATION', 
                              'DIMENSIONAL', 'ELECTRICAL', 'MECHANICAL', 'COSMETIC')),
    
    -- Test Method and Procedure
    test_method VARCHAR(100),
    test_procedure TEXT,
    required_equipment VARCHAR(100),
    
    -- Acceptance Criteria
    acceptance_criteria TEXT,
    specification_reference VARCHAR(100),
    tolerance_type VARCHAR(20) DEFAULT 'ABSOLUTE',
    CHECK (tolerance_type IN ('ABSOLUTE', 'PERCENTAGE', 'RANGE', 'NOMINAL')),
    
    -- Expected Values and Tolerances
    expected_value VARCHAR(100),                   -- Expected value or condition
    upper_tolerance VARCHAR(50),                   -- Upper tolerance limit
    lower_tolerance VARCHAR(50),                   -- Lower tolerance limit
    units_of_measure VARCHAR(20),                  -- Units for measurements
    
    -- Actual Results
    measured_value VARCHAR(100),                   -- Actual measured value
    actual_value_numeric DECIMAL(15,6),           -- Numeric value for calculations
    actual_condition TEXT,                         -- Description of actual condition
    
    -- Pass/Fail Determination
    result VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    CHECK (result IN ('PASS', 'FAIL', 'WARNING', 'N/A', 'PENDING', 'RETEST')),
    
    -- Defect Classification
    defect_type VARCHAR(30),
    CHECK (defect_type IN ('CRITICAL', 'MAJOR', 'MINOR', 'COSMETIC', 'NONE')),
    defect_description TEXT,
    defect_location TEXT,
    
    -- Inspector Actions
    inspector_notes TEXT,
    corrective_action TEXT,
    disposition VARCHAR(30),
    CHECK (disposition IN ('ACCEPT', 'REJECT', 'REWORK', 'REPAIR', 'USE_AS_IS', 'RETURN')),
    
    -- Photo and Documentation References
    photo_required BOOLEAN DEFAULT false,
    photo_taken BOOLEAN DEFAULT false,
    photo_references TEXT[],                       -- Array of photo file references
    document_references TEXT[],                    -- Array of document references
    
    -- Time Tracking
    inspection_time_minutes DECIMAL(6,2),
    
    -- Status and Flags
    is_critical_checkpoint BOOLEAN DEFAULT false,  -- Critical quality checkpoint
    requires_witness BOOLEAN DEFAULT false,        -- Requires witness/supervisor
    witnessed_by BIGINT,                           -- User who witnessed inspection
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_qc_inspection_items_inspection 
        FOREIGN KEY (inspection_id) 
        REFERENCES qc_inspections(inspection_id) ON DELETE CASCADE,
    CONSTRAINT fk_qc_inspection_items_witnessed_by 
        FOREIGN KEY (witnessed_by) 
        REFERENCES users(user_id),
    CONSTRAINT uk_inspection_item_sequence 
        UNIQUE (inspection_id, item_sequence),
    CONSTRAINT chk_qc_inspection_items_sequence_positive 
        CHECK (item_sequence > 0),
    CONSTRAINT chk_qc_inspection_items_time_positive 
        CHECK (inspection_time_minutes IS NULL OR inspection_time_minutes >= 0)
);

-- Indexes for QC inspection items
CREATE INDEX idx_qc_inspection_items_inspection ON qc_inspection_items(inspection_id);
CREATE INDEX idx_qc_inspection_items_result ON qc_inspection_items(result);
CREATE INDEX idx_qc_inspection_items_defect_type ON qc_inspection_items(defect_type);
CREATE INDEX idx_qc_inspection_items_critical ON qc_inspection_items(is_critical_checkpoint) 
    WHERE is_critical_checkpoint = true;
CREATE INDEX idx_qc_inspection_items_type ON qc_inspection_items(inspection_type);
CREATE INDEX idx_qc_inspection_items_sequence ON qc_inspection_items(inspection_id, item_sequence);

-- =====================================================
-- PRODUCTION TASKS TABLE
-- =====================================================
-- Individual production tasks and work orders

CREATE TABLE production_tasks (
    task_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_number VARCHAR(50) UNIQUE NOT NULL,       -- Human-readable task number
    order_item_id BIGINT NOT NULL,
    
    -- Task Definition
    task_name VARCHAR(200) NOT NULL,
    task_description TEXT,
    task_type VARCHAR(30) NOT NULL,
    CHECK (task_type IN ('ASSEMBLY', 'FABRICATION', 'INSPECTION', 'PACKAGING', 
                        'TESTING', 'REWORK', 'SETUP', 'TEARDOWN')),
    
    -- Task Sequence and Dependencies
    sequence_order INTEGER NOT NULL,              -- Order in production sequence
    depends_on_task_id BIGINT,                    -- Task dependency
    blocks_task_ids BIGINT[],                     -- Tasks that this blocks
    
    -- Work Instructions and Procedures
    work_instructions TEXT,
    procedure_reference VARCHAR(100),             -- Reference to standard procedure
    quality_requirements TEXT,
    safety_requirements TEXT,
    
    -- Resource Requirements
    required_tools JSONB,                         -- Tools needed for task
    required_equipment JSONB,                     -- Equipment needed
    required_materials JSONB,                     -- Materials/consumables needed
    required_skill_level INTEGER DEFAULT 1,       -- Required skill level (1-5)
    required_certifications TEXT[],               -- Required worker certifications
    
    -- Capacity and Scheduling
    estimated_hours DECIMAL(6,2),                -- Estimated time to complete
    estimated_setup_hours DECIMAL(6,2) DEFAULT 0,-- Setup time
    estimated_teardown_hours DECIMAL(6,2) DEFAULT 0, -- Cleanup time
    
    -- Assignment and Scheduling
    assigned_to BIGINT,                           -- Assigned worker
    assigned_by BIGINT,                           -- Who made the assignment
    assigned_at TIMESTAMP,
    backup_assigned_to BIGINT,                    -- Backup worker
    
    -- Scheduling Information
    scheduled_start_date DATE,
    scheduled_start_time TIME,
    scheduled_end_date DATE,
    scheduled_end_time TIME,
    priority_level INTEGER DEFAULT 3,             -- 1=Highest, 5=Lowest
    
    -- Status and Progress
    status VARCHAR(20) DEFAULT 'PENDING',
    CHECK (status IN ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 
                     'CANCELLED', 'REWORK_REQUIRED', 'WAITING_PARTS')),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Time Tracking
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    actual_hours DECIMAL(6,2),
    actual_setup_hours DECIMAL(6,2),
    actual_teardown_hours DECIMAL(6,2),
    
    -- Break and Interruption Tracking
    break_time_hours DECIMAL(6,2) DEFAULT 0,
    interruption_time_hours DECIMAL(6,2) DEFAULT 0,
    interruption_reasons TEXT[],
    
    -- Quality and Inspection
    quality_check_required BOOLEAN DEFAULT false,
    quality_check_completed BOOLEAN DEFAULT false,
    quality_check_passed BOOLEAN,
    quality_notes TEXT,
    
    -- Work Environment
    work_station VARCHAR(50),
    work_area VARCHAR(50),
    environmental_requirements JSONB,             -- Temperature, humidity, etc.
    
    -- Issues and Problems
    issues_encountered TEXT,
    issue_resolution TEXT,
    rework_required BOOLEAN DEFAULT false,
    rework_reason TEXT,
    rework_instructions TEXT,
    
    -- Cost Tracking
    actual_labor_cost DECIMAL(10,2),
    material_cost DECIMAL(10,2),
    overhead_cost DECIMAL(10,2),
    
    -- Documentation and Photos
    work_notes TEXT,
    completion_notes TEXT,
    photo_references TEXT[],                      -- Array of photo file references
    document_references TEXT[],                   -- Array of document references
    
    -- Approval and Sign-off
    requires_supervisor_approval BOOLEAN DEFAULT false,
    supervisor_approved_by BIGINT,
    supervisor_approved_at TIMESTAMP,
    requires_qc_signoff BOOLEAN DEFAULT false,
    qc_signed_off_by BIGINT,
    qc_signed_off_at TIMESTAMP,
    
    -- External Integration
    erp_task_id VARCHAR(50),                      -- ERP system reference
    mes_task_id VARCHAR(50),                      -- Manufacturing Execution System ID
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_production_tasks_order_item 
        FOREIGN KEY (order_item_id) 
        REFERENCES order_items(item_id),
    CONSTRAINT fk_production_tasks_depends_on 
        FOREIGN KEY (depends_on_task_id) 
        REFERENCES production_tasks(task_id),
    CONSTRAINT fk_production_tasks_assigned_to 
        FOREIGN KEY (assigned_to) 
        REFERENCES users(user_id),
    CONSTRAINT fk_production_tasks_assigned_by 
        FOREIGN KEY (assigned_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_production_tasks_backup_assigned 
        FOREIGN KEY (backup_assigned_to) 
        REFERENCES users(user_id),
    CONSTRAINT fk_production_tasks_supervisor_approved 
        FOREIGN KEY (supervisor_approved_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_production_tasks_qc_signed_off 
        FOREIGN KEY (qc_signed_off_by) 
        REFERENCES users(user_id),
    CONSTRAINT fk_production_tasks_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_production_tasks_sequence_positive 
        CHECK (sequence_order > 0),
    CONSTRAINT chk_production_tasks_skill_level_range 
        CHECK (required_skill_level BETWEEN 1 AND 5),
    CONSTRAINT chk_production_tasks_priority_range 
        CHECK (priority_level BETWEEN 1 AND 5),
    CONSTRAINT chk_production_tasks_progress_range 
        CHECK (progress_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_production_tasks_hours_positive 
        CHECK (estimated_hours IS NULL OR estimated_hours >= 0),
    CONSTRAINT chk_production_tasks_costs_positive 
        CHECK (actual_labor_cost IS NULL OR actual_labor_cost >= 0)
);

-- Indexes for production tasks
CREATE INDEX idx_production_tasks_order_item ON production_tasks(order_item_id);
CREATE INDEX idx_production_tasks_assigned_to ON production_tasks(assigned_to);
CREATE INDEX idx_production_tasks_status ON production_tasks(status);
CREATE INDEX idx_production_tasks_sequence ON production_tasks(order_item_id, sequence_order);
CREATE INDEX idx_production_tasks_dependency ON production_tasks(depends_on_task_id);
CREATE INDEX idx_production_tasks_scheduled ON production_tasks(scheduled_start_date, scheduled_start_time);
CREATE INDEX idx_production_tasks_priority ON production_tasks(priority_level);
CREATE INDEX idx_production_tasks_work_station ON production_tasks(work_station);
CREATE INDEX idx_production_tasks_created_by ON production_tasks(created_by);

-- =====================================================
-- PRODUCTION RESOURCES TABLE  
-- =====================================================
-- Available production resources (equipment, workstations, tools)

CREATE TABLE production_resources (
    resource_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    resource_code VARCHAR(50) UNIQUE NOT NULL,
    resource_name VARCHAR(100) NOT NULL,
    
    -- Resource Classification
    resource_type VARCHAR(30) NOT NULL,
    CHECK (resource_type IN ('WORKSTATION', 'EQUIPMENT', 'TOOL', 'FIXTURE', 'GAUGE', 'FACILITY')),
    resource_category VARCHAR(50),
    resource_subtype VARCHAR(50),
    
    -- Physical Information
    location VARCHAR(100),
    work_area VARCHAR(50),
    department VARCHAR(50),
    
    -- Capacity and Availability
    capacity_units_per_hour DECIMAL(8,2),         -- Production capacity
    capacity_description TEXT,
    availability_schedule JSONB,                   -- When resource is available
    
    -- Resource Specifications
    specifications JSONB,                          -- Technical specifications
    capabilities TEXT[],                           -- What this resource can do
    limitations TEXT[],                            -- Resource limitations
    
    -- Maintenance and Calibration
    requires_calibration BOOLEAN DEFAULT false,
    calibration_frequency_days INTEGER,
    last_calibration_date DATE,
    next_calibration_date DATE,
    calibration_status VARCHAR(20) DEFAULT 'VALID',
    CHECK (calibration_status IN ('VALID', 'EXPIRED', 'OVERDUE', 'N_A')),
    
    -- Maintenance Schedule
    requires_maintenance BOOLEAN DEFAULT false,
    maintenance_frequency_days INTEGER,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    maintenance_notes TEXT,
    
    -- Operating Costs
    hourly_rate DECIMAL(8,2),                     -- Cost per hour of operation
    setup_cost DECIMAL(8,2),                      -- Setup cost per use
    maintenance_cost_annual DECIMAL(10,2),        -- Annual maintenance cost
    
    -- Status and Availability
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'BROKEN', 'RETIRED', 'RESERVED')),
    is_active BOOLEAN DEFAULT true,
    
    -- Usage Tracking
    total_usage_hours DECIMAL(10,2) DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    current_task_id BIGINT,                       -- Currently assigned task
    
    -- Safety and Certifications
    safety_requirements TEXT,
    required_certifications TEXT[],               -- Certifications needed to operate
    safety_training_required BOOLEAN DEFAULT false,
    
    -- Documentation
    operating_instructions TEXT,
    maintenance_instructions TEXT,
    safety_instructions TEXT,
    manual_references TEXT[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT,
    
    -- Constraints
    CONSTRAINT fk_production_resources_current_task 
        FOREIGN KEY (current_task_id) 
        REFERENCES production_tasks(task_id),
    CONSTRAINT fk_production_resources_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(user_id),
    CONSTRAINT chk_production_resources_capacity_positive 
        CHECK (capacity_units_per_hour IS NULL OR capacity_units_per_hour > 0),
    CONSTRAINT chk_production_resources_rates_positive 
        CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT chk_production_resources_usage_positive 
        CHECK (total_usage_hours >= 0 AND usage_count >= 0),
    CONSTRAINT chk_production_resources_calibration_frequency_positive 
        CHECK (calibration_frequency_days IS NULL OR calibration_frequency_days > 0)
);

-- Indexes for production resources
CREATE INDEX idx_production_resources_code ON production_resources(resource_code);
CREATE INDEX idx_production_resources_type ON production_resources(resource_type);
CREATE INDEX idx_production_resources_location ON production_resources(location);
CREATE INDEX idx_production_resources_status ON production_resources(status);
CREATE INDEX idx_production_resources_active ON production_resources(is_active);
CREATE INDEX idx_production_resources_calibration ON production_resources(next_calibration_date) 
    WHERE requires_calibration = true;
CREATE INDEX idx_production_resources_maintenance ON production_resources(next_maintenance_date) 
    WHERE requires_maintenance = true;
CREATE INDEX idx_production_resources_current_task ON production_resources(current_task_id);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE qc_processes IS 'Quality control process definitions and templates';
COMMENT ON TABLE qc_inspections IS 'Individual quality control inspection instances';
COMMENT ON TABLE qc_inspection_items IS 'Individual checkpoints within each inspection';
COMMENT ON TABLE production_tasks IS 'Individual production tasks and work orders';
COMMENT ON TABLE production_resources IS 'Available production resources and equipment';

COMMENT ON COLUMN qc_processes.pass_threshold_percentage IS 'Minimum percentage of checkpoints that must pass';
COMMENT ON COLUMN qc_inspections.pass_percentage IS 'Actual percentage of checkpoints that passed';
COMMENT ON COLUMN qc_inspection_items.is_critical_checkpoint IS 'Critical checkpoint that must pass for overall pass';
COMMENT ON COLUMN production_tasks.sequence_order IS 'Order in production sequence for the order item';
COMMENT ON COLUMN production_resources.capacity_units_per_hour IS 'Production capacity in units per hour';

-- =====================================================
-- PERFORMANCE OPTIMIZATION QUERIES
-- =====================================================

-- QC process lookup (should execute in <100ms)
-- SELECT qp.process_name, qp.estimated_duration_minutes, qp.inspection_criteria
-- FROM qc_processes qp
-- WHERE qp.assembly_id = ? AND qp.process_stage = ? AND qp.is_active = true
-- ORDER BY qp.process_name;

-- Production task status (should execute in <200ms)
-- SELECT pt.task_name, pt.status, pt.progress_percentage, pt.assigned_to,
--        u.full_name as assigned_to_name
-- FROM production_tasks pt
-- LEFT JOIN users u ON pt.assigned_to = u.user_id
-- WHERE pt.order_item_id = ?
-- ORDER BY pt.sequence_order;