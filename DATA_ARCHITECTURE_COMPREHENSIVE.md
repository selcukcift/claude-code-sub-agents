# TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
## COMPREHENSIVE DATA ARCHITECTURE DESIGN

**Version:** 1.0  
**Date:** 2025-08-03  
**Status:** Design Phase  

---

## EXECUTIVE SUMMARY

This document presents a comprehensive data architecture design for the TORVAN workflow management system, supporting complex hierarchical inventory management, dynamic BOM generation, multi-phase order lifecycle management, and integration with external systems. The architecture is designed to handle 50 concurrent users, 1000 orders/month, with sub-5-second BOM generation performance.

### Key Architecture Highlights
- **4-Level Hierarchical Data Model**: Categories → Assemblies → Sub-assemblies → Parts
- **Dynamic BOM Generation**: Configuration-driven with 700-series custom part numbering
- **8-Phase Order Lifecycle**: Complete workflow tracking from creation to delivery
- **Multi-Role Security**: 6 user types with granular permissions
- **Real-time Integration**: ERP, document management, and shipping systems
- **Performance Optimized**: Materialized views, intelligent indexing, caching strategies

---

## 1. CONCEPTUAL DATA MODEL

### 1.1 High-Level Entity Overview

Based on analysis of the source data (219 assemblies, 6 categories, 481+ parts), the conceptual model consists of these primary domains:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   INVENTORY     │    │     ORDERS      │    │     USERS       │
│   MANAGEMENT    │    │   MANAGEMENT    │    │   MANAGEMENT    │
│                 │    │                 │    │                 │
│ • Categories    │    │ • Orders        │    │ • Users         │
│ • Assemblies    │    │ • Order Items   │    │ • Roles         │
│ • Sub-assemblies│    │ • Configurations│    │ • Permissions   │
│ • Parts         │    │ • Workflows     │    │ • Sessions      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BOM & CONFIG  │    │   QUALITY       │    │   INTEGRATION   │
│   MANAGEMENT    │    │   CONTROL       │    │   & EXTERNAL    │
│                 │    │                 │    │                 │
│ • BOMs          │    │ • QC Processes  │    │ • ERP Sync      │
│ • Configurations│    │ • Inspections   │    │ • Documents     │
│ • Rules Engine  │    │ • Issues        │    │ • Shipping      │
│ • Custom Parts  │    │ • Photos        │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 Data Flow Architecture

```
Customer Order → Configuration → BOM Generation → Production → QC → Shipping
      ↓              ↓              ↓               ↓        ↓        ↓
   Order Mgmt → Config Rules → Component Assembly → Tasks → QC Data → Integration
```

---

## 2. HIERARCHICAL INVENTORY DATA MODEL

### 2.1 Category Hierarchy Structure

**Analysis Results from Source Data:**
- 6 main categories (718-723)
- Multiple subcategories per category (up to 27 subcategories)
- 219 assemblies distributed across categories
- 481+ individual parts

### 2.2 Core Inventory Entities

#### 2.2.1 Categories Table
```sql
CREATE TABLE categories (
    category_id VARCHAR(10) PRIMARY KEY,      -- e.g., "718", "719"
    name VARCHAR(100) NOT NULL,               -- e.g., "CONTROL BOX"
    description TEXT,
    parent_category_id VARCHAR(10),           -- For nested categories
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id),
    INDEX idx_categories_parent (parent_category_id),
    INDEX idx_categories_active (is_active)
);
```

#### 2.2.2 Subcategories Table
```sql
CREATE TABLE subcategories (
    subcategory_id VARCHAR(20) PRIMARY KEY,   -- e.g., "718.001", "719.016"
    category_id VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,               -- e.g., "1 BASIN", "CONTROL BOX"
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    INDEX idx_subcategories_category (category_id),
    INDEX idx_subcategories_active (is_active)
);
```

#### 2.2.3 Assemblies Table
```sql
CREATE TABLE assemblies (
    assembly_id VARCHAR(50) PRIMARY KEY,      -- e.g., "T2-CTRL-EDR1"
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id VARCHAR(10),
    subcategory_id VARCHAR(20),
    assembly_type ENUM('COMPONENT', 'KIT', 'SERVICE_PART', 'ACCESSORY') NOT NULL,
    parent_assembly_id VARCHAR(50),           -- For sub-assemblies
    can_order BOOLEAN DEFAULT true,
    is_kit BOOLEAN DEFAULT false,
    base_price DECIMAL(10,2),
    weight_kg DECIMAL(8,3),
    status ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED') DEFAULT 'ACTIVE',
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id),
    FOREIGN KEY (parent_assembly_id) REFERENCES assemblies(assembly_id),
    
    INDEX idx_assemblies_category (category_id),
    INDEX idx_assemblies_subcategory (subcategory_id),
    INDEX idx_assemblies_parent (parent_assembly_id),
    INDEX idx_assemblies_status (status),
    INDEX idx_assemblies_type (assembly_type),
    FULLTEXT INDEX idx_assemblies_search (name, description)
);
```

#### 2.2.4 Parts Table
```sql
CREATE TABLE parts (
    part_id VARCHAR(50) PRIMARY KEY,          -- e.g., "1916", "T-OA-BINRAIL-24"
    name VARCHAR(200) NOT NULL,
    description TEXT,
    manufacturer_part_number VARCHAR(100),
    manufacturer_info VARCHAR(200),
    part_type ENUM('COMPONENT', 'MATERIAL', 'HARDWARE', 'ELECTRONIC') NOT NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'EACH',
    unit_cost DECIMAL(10,4),
    weight_kg DECIMAL(8,3),
    dimensions_json JSON,                     -- {"length": 10, "width": 5, "height": 2}
    specifications_json JSON,                 -- Technical specifications
    status ENUM('ACTIVE', 'INACTIVE', 'DISCONTINUED') DEFAULT 'ACTIVE',
    is_custom_part BOOLEAN DEFAULT false,     -- For 700-series parts
    lead_time_days INTEGER DEFAULT 0,
    min_order_qty INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_parts_status (status),
    INDEX idx_parts_type (part_type),
    INDEX idx_parts_custom (is_custom_part),
    INDEX idx_parts_manufacturer (manufacturer_part_number),
    FULLTEXT INDEX idx_parts_search (name, description, manufacturer_part_number)
);
```

#### 2.2.5 Assembly Components Junction Table
```sql
CREATE TABLE assembly_components (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assembly_id VARCHAR(50) NOT NULL,
    component_id VARCHAR(50) NOT NULL,         -- Can reference parts or other assemblies
    component_type ENUM('PART', 'ASSEMBLY') NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(20) DEFAULT 'EACH',
    position_sequence INTEGER DEFAULT 0,
    is_optional BOOLEAN DEFAULT false,
    is_substitute BOOLEAN DEFAULT false,
    substitute_group VARCHAR(20),              -- For grouping alternative parts
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assembly_id) REFERENCES assemblies(assembly_id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_assembly_component (assembly_id, component_id, component_type),
    INDEX idx_assembly_components_assembly (assembly_id),
    INDEX idx_assembly_components_component (component_id, component_type),
    INDEX idx_assembly_components_substitute (substitute_group)
);
```

---

## 3. ORDER MANAGEMENT DATA MODEL

### 3.1 Order Lifecycle Framework

**8-Phase Order Lifecycle:**
1. **Draft** - Initial order creation
2. **Configuration** - Product configuration and BOM generation
3. **Approval** - Management approval
4. **Production** - Manufacturing phase
5. **Quality Control** - QC inspection
6. **Packaging** - Final packaging
7. **Shipping** - Delivery preparation
8. **Delivered** - Order completion

### 3.2 Core Order Entities

#### 3.2.1 Orders Table
```sql
CREATE TABLE orders (
    order_id VARCHAR(20) PRIMARY KEY,         -- e.g., "ORD-2025-0001"
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id BIGINT NOT NULL,
    customer_po_number VARCHAR(100),
    order_type ENUM('STANDARD', 'CUSTOM', 'RUSH', 'PROTOTYPE') DEFAULT 'STANDARD',
    current_phase ENUM('DRAFT', 'CONFIGURATION', 'APPROVAL', 'PRODUCTION', 
                      'QUALITY_CONTROL', 'PACKAGING', 'SHIPPING', 'DELIVERED') DEFAULT 'DRAFT',
    priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') DEFAULT 'NORMAL',
    
    -- Financial Information
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    shipping_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Dates
    order_date DATE NOT NULL,
    requested_delivery_date DATE,
    promised_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Assignment and Tracking
    assigned_to BIGINT,                       -- Current responsible user
    created_by BIGINT NOT NULL,
    
    -- Status and Notes
    is_rush_order BOOLEAN DEFAULT false,
    special_instructions TEXT,
    internal_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (assigned_to) REFERENCES users(user_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_phase (current_phase),
    INDEX idx_orders_priority (priority),
    INDEX idx_orders_date (order_date),
    INDEX idx_orders_assigned (assigned_to),
    INDEX idx_orders_delivery (requested_delivery_date)
);
```

#### 3.2.2 Order Items Table
```sql
CREATE TABLE order_items (
    item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(20) NOT NULL,
    line_number INTEGER NOT NULL,
    assembly_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2),
    line_total DECIMAL(12,2),
    
    -- Configuration Reference
    configuration_id BIGINT,                  -- Links to configuration
    bom_id BIGINT,                           -- Generated BOM reference
    
    -- Production Tracking
    production_status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD') DEFAULT 'PENDING',
    production_started_at TIMESTAMP NULL,
    production_completed_at TIMESTAMP NULL,
    
    -- Custom Specifications
    custom_specifications JSON,               -- Custom requirements
    special_instructions TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (assembly_id) REFERENCES assemblies(assembly_id),
    FOREIGN KEY (configuration_id) REFERENCES configurations(configuration_id),
    FOREIGN KEY (bom_id) REFERENCES boms(bom_id),
    
    UNIQUE KEY uk_order_line (order_id, line_number),
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_assembly (assembly_id),
    INDEX idx_order_items_production (production_status)
);
```

#### 3.2.3 Order Status History Table
```sql
CREATE TABLE order_status_history (
    history_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(20) NOT NULL,
    from_phase ENUM('DRAFT', 'CONFIGURATION', 'APPROVAL', 'PRODUCTION', 
                   'QUALITY_CONTROL', 'PACKAGING', 'SHIPPING', 'DELIVERED'),
    to_phase ENUM('DRAFT', 'CONFIGURATION', 'APPROVAL', 'PRODUCTION', 
                 'QUALITY_CONTROL', 'PACKAGING', 'SHIPPING', 'DELIVERED') NOT NULL,
    changed_by BIGINT NOT NULL,
    change_reason TEXT,
    phase_duration_hours DECIMAL(8,2),        -- Time spent in previous phase
    notes TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id),
    
    INDEX idx_order_history_order (order_id),
    INDEX idx_order_history_phase (to_phase),
    INDEX idx_order_history_date (changed_at)
);
```

---

## 4. BOM GENERATION & CONFIGURATION DATA MODEL

### 4.1 Dynamic BOM Architecture

The BOM system supports:
- **Configuration-driven generation** based on customer selections
- **700-series custom part creation** for non-standard configurations
- **Real-time validation** against business rules
- **Version control** for BOM revisions

### 4.2 Core BOM Entities

#### 4.2.1 Configurations Table
```sql
CREATE TABLE configurations (
    configuration_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    configuration_name VARCHAR(100) NOT NULL,
    order_item_id BIGINT,
    assembly_id VARCHAR(50) NOT NULL,
    
    -- Sink Configuration Parameters
    sink_length_inches INTEGER,               -- From requirements: various lengths
    sink_width_inches INTEGER DEFAULT 20,
    basin_count INTEGER DEFAULT 1,           -- 1, 2, or 3 basins
    basin_type ENUM('EDR', 'ESK', 'STANDARD') DEFAULT 'STANDARD',
    basin_depth_inches INTEGER DEFAULT 8,    -- 8 or 10 inches
    
    -- Features Configuration
    has_lifter BOOLEAN DEFAULT false,
    lifter_type ENUM('DL14', 'DL27', 'LC1') NULL,
    has_overhead_light BOOLEAN DEFAULT false,
    has_basin_lights BOOLEAN DEFAULT false,
    has_dosing_pump BOOLEAN DEFAULT false,
    has_temperature_control BOOLEAN DEFAULT false,
    
    -- Pegboard Configuration
    pegboard_type ENUM('PERFORATED', 'SOLID', 'NONE') DEFAULT 'PERFORATED',
    pegboard_color VARCHAR(20),
    
    -- Water Configuration
    water_type ENUM('STANDARD', 'DI', 'MIXED') DEFAULT 'STANDARD',
    temperature_monitoring BOOLEAN DEFAULT false,
    
    -- Configuration Rules Application
    configuration_rules JSON,                -- Applied business rules
    validation_results JSON,                 -- Validation results
    is_valid BOOLEAN DEFAULT false,
    
    -- Versioning
    version VARCHAR(20) DEFAULT '1.0',
    parent_configuration_id BIGINT,          -- For configuration revisions
    
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_item_id) REFERENCES order_items(item_id),
    FOREIGN KEY (assembly_id) REFERENCES assemblies(assembly_id),
    FOREIGN KEY (parent_configuration_id) REFERENCES configurations(configuration_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_configurations_order_item (order_item_id),
    INDEX idx_configurations_assembly (assembly_id),
    INDEX idx_configurations_valid (is_valid)
);
```

#### 4.2.2 BOMs Table
```sql
CREATE TABLE boms (
    bom_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bom_number VARCHAR(50) UNIQUE NOT NULL,   -- Auto-generated BOM number
    configuration_id BIGINT NOT NULL,
    assembly_id VARCHAR(50) NOT NULL,
    bom_type ENUM('STANDARD', 'CUSTOM', 'PROTOTYPE') DEFAULT 'STANDARD',
    
    -- BOM Metadata
    total_parts_count INTEGER DEFAULT 0,
    total_estimated_cost DECIMAL(12,2) DEFAULT 0,
    total_estimated_weight_kg DECIMAL(10,3) DEFAULT 0,
    estimated_build_hours DECIMAL(8,2) DEFAULT 0,
    
    -- Status and Approval
    status ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED') DEFAULT 'DRAFT',
    approved_by BIGINT,
    approved_at TIMESTAMP NULL,
    
    -- Version Control
    version VARCHAR(20) DEFAULT '1.0',
    parent_bom_id BIGINT,                     -- For BOM revisions
    
    -- Generation Information
    generated_by BIGINT NOT NULL,             -- User who generated the BOM
    generation_method ENUM('AUTOMATIC', 'MANUAL', 'HYBRID') DEFAULT 'AUTOMATIC',
    generation_rules_applied JSON,            -- Rules used in generation
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (configuration_id) REFERENCES configurations(configuration_id),
    FOREIGN KEY (assembly_id) REFERENCES assemblies(assembly_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id),
    FOREIGN KEY (generated_by) REFERENCES users(user_id),
    FOREIGN KEY (parent_bom_id) REFERENCES boms(bom_id),
    
    INDEX idx_boms_configuration (configuration_id),
    INDEX idx_boms_assembly (assembly_id),
    INDEX idx_boms_status (status),
    INDEX idx_boms_parent (parent_bom_id)
);
```

#### 4.2.3 BOM Line Items Table
```sql
CREATE TABLE bom_line_items (
    line_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bom_id BIGINT NOT NULL,
    line_number INTEGER NOT NULL,
    
    -- Component Reference
    component_id VARCHAR(50) NOT NULL,
    component_type ENUM('PART', 'ASSEMBLY') NOT NULL,
    
    -- Quantity and Measurements
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_of_measure VARCHAR(20) DEFAULT 'EACH',
    unit_cost DECIMAL(10,4),
    line_total_cost DECIMAL(12,2),
    
    -- Configuration Context
    required_for_config JSON,                -- Which configurations require this
    conditional_logic TEXT,                  -- When this component is needed
    
    -- Substitution Information
    is_substitute BOOLEAN DEFAULT false,
    primary_component_id VARCHAR(50),        -- If this is a substitute
    substitute_group VARCHAR(20),
    preference_order INTEGER DEFAULT 1,      -- For multiple substitutes
    
    -- Custom Part Information
    is_custom_part BOOLEAN DEFAULT false,
    custom_part_specifications JSON,          -- For 700-series parts
    
    -- Production Information
    assembly_sequence INTEGER DEFAULT 0,
    installation_notes TEXT,
    required_tools JSON,                      -- Tools needed for assembly
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bom_id) REFERENCES boms(bom_id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_bom_line (bom_id, line_number),
    INDEX idx_bom_lines_bom (bom_id),
    INDEX idx_bom_lines_component (component_id, component_type),
    INDEX idx_bom_lines_custom (is_custom_part),
    INDEX idx_bom_lines_substitute (substitute_group)
);
```

#### 4.2.4 Configuration Rules Engine
```sql
CREATE TABLE configuration_rules (
    rule_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    rule_type ENUM('VALIDATION', 'COMPONENT_SELECTION', 'PRICING', 'COMPATIBILITY') NOT NULL,
    
    -- Rule Conditions
    conditions JSON NOT NULL,                 -- Rule conditions in JSON format
    actions JSON NOT NULL,                    -- Actions to take when rule fires
    
    -- Rule Scope
    applies_to_assemblies JSON,               -- Which assemblies this rule affects
    applies_to_categories JSON,               -- Which categories this rule affects
    
    -- Rule Priority and Status
    priority INTEGER DEFAULT 100,            -- Lower number = higher priority
    is_active BOOLEAN DEFAULT true,
    
    -- Rule Metadata
    description TEXT,
    examples JSON,                            -- Example scenarios
    
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_config_rules_type (rule_type),
    INDEX idx_config_rules_active (is_active),
    INDEX idx_config_rules_priority (priority)
);
```

---

## 5. USER MANAGEMENT & MULTI-ROLE SECURITY MODEL

### 5.1 Role-Based Access Control (RBAC)

**6 User Roles Identified:**
1. **Administrator** - Full system access
2. **Sales Manager** - Order creation, customer management
3. **Production Manager** - Production workflow, resource allocation
4. **QC Inspector** - Quality control processes, approvals
5. **Assembly Technician** - Task execution, progress updates
6. **Customer Service** - Order status, customer communication

### 5.2 Core User Management Entities

#### 5.2.1 Users Table
```sql
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    job_title VARCHAR(100),
    department VARCHAR(100),
    
    -- Authentication
    last_login TIMESTAMP NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    locked_until TIMESTAMP NULL,
    password_expires_at TIMESTAMP,
    must_change_password BOOLEAN DEFAULT false,
    
    -- Multi-Factor Authentication
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Preferences
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    ui_preferences JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_active (is_active),
    INDEX idx_users_department (department)
);
```

#### 5.2.2 Roles Table
```sql
CREATE TABLE roles (
    role_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_code VARCHAR(20) UNIQUE NOT NULL,     -- e.g., 'ADMIN', 'SALES_MGR'
    description TEXT,
    
    -- Role Hierarchy
    parent_role_id BIGINT,                     -- For role inheritance
    role_level INTEGER DEFAULT 1,             -- Hierarchy level
    
    -- Permissions Overview
    can_create_orders BOOLEAN DEFAULT false,
    can_approve_orders BOOLEAN DEFAULT false,
    can_modify_boms BOOLEAN DEFAULT false,
    can_access_financials BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_configure_system BOOLEAN DEFAULT false,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_role_id) REFERENCES roles(role_id),
    
    INDEX idx_roles_active (is_active),
    INDEX idx_roles_parent (parent_role_id)
);
```

#### 5.2.3 User Roles Junction Table
```sql
CREATE TABLE user_roles (
    user_role_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    
    -- Role Assignment Context
    assigned_by BIGINT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_from DATE DEFAULT (CURRENT_DATE),
    effective_until DATE NULL,
    
    -- Role Scope Limitations
    scope_restrictions JSON,                   -- Limit role to specific data
    
    is_active BOOLEAN DEFAULT true,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id),
    
    UNIQUE KEY uk_user_role_active (user_id, role_id, is_active),
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id),
    INDEX idx_user_roles_effective (effective_from, effective_until)
);
```

#### 5.2.4 Permissions Table
```sql
CREATE TABLE permissions (
    permission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    permission_code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., 'orders:create'
    resource_type VARCHAR(50) NOT NULL,           -- e.g., 'orders', 'boms'
    action VARCHAR(50) NOT NULL,                  -- e.g., 'create', 'read', 'update', 'delete'
    description TEXT,
    
    -- Permission Categories
    category ENUM('SYSTEM', 'ORDERS', 'INVENTORY', 'PRODUCTION', 'QC', 'FINANCIAL') NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_permissions_resource (resource_type),
    INDEX idx_permissions_category (category),
    INDEX idx_permissions_active (is_active)
);
```

#### 5.2.5 Role Permissions Junction Table
```sql
CREATE TABLE role_permissions (
    role_permission_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    
    -- Permission Constraints
    conditions JSON,                           -- Conditional permissions
    scope_limitations JSON,                    -- Data scope limitations
    
    granted_by BIGINT NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id),
    FOREIGN KEY (granted_by) REFERENCES users(user_id),
    
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    INDEX idx_role_permissions_role (role_id),
    INDEX idx_role_permissions_permission (permission_id)
);
```

---

## 6. QUALITY CONTROL & PRODUCTION TRACKING MODEL

### 6.1 QC Process Framework

The QC system supports:
- **Multi-stage inspections** throughout production
- **Photo documentation** for visual verification
- **Digital checklists** with pass/fail criteria
- **Issue tracking** and resolution workflow

### 6.2 Core QC Entities

#### 6.2.1 QC Processes Table
```sql
CREATE TABLE qc_processes (
    qc_process_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    process_name VARCHAR(100) NOT NULL,
    assembly_id VARCHAR(50),                  -- Specific to assembly type
    process_stage ENUM('INCOMING', 'IN_PROCESS', 'FINAL', 'PACKAGING') NOT NULL,
    
    -- Process Definition
    description TEXT,
    inspection_criteria JSON,                 -- Detailed criteria
    required_photos JSON,                     -- Photo requirements
    pass_threshold_percentage DECIMAL(5,2) DEFAULT 100.00,
    
    -- Time Estimates
    estimated_duration_minutes INTEGER DEFAULT 30,
    
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assembly_id) REFERENCES assemblies(assembly_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    
    INDEX idx_qc_processes_assembly (assembly_id),
    INDEX idx_qc_processes_stage (process_stage),
    INDEX idx_qc_processes_active (is_active)
);
```

#### 6.2.2 QC Inspections Table
```sql
CREATE TABLE qc_inspections (
    inspection_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_item_id BIGINT NOT NULL,
    qc_process_id BIGINT NOT NULL,
    
    -- Inspection Details
    inspector_id BIGINT NOT NULL,
    inspection_date DATE NOT NULL,
    inspection_start_time TIMESTAMP,
    inspection_end_time TIMESTAMP,
    
    -- Results
    overall_result ENUM('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING') DEFAULT 'PENDING',
    pass_percentage DECIMAL(5,2),
    
    -- Documentation
    inspection_notes TEXT,
    corrective_actions TEXT,
    
    -- Approval
    approved_by BIGINT,
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_item_id) REFERENCES order_items(item_id),
    FOREIGN KEY (qc_process_id) REFERENCES qc_processes(qc_process_id),
    FOREIGN KEY (inspector_id) REFERENCES users(user_id),
    FOREIGN KEY (approved_by) REFERENCES users(user_id),
    
    INDEX idx_qc_inspections_order_item (order_item_id),
    INDEX idx_qc_inspections_process (qc_process_id),
    INDEX idx_qc_inspections_inspector (inspector_id),
    INDEX idx_qc_inspections_date (inspection_date),
    INDEX idx_qc_inspections_result (overall_result)
);
```

#### 6.2.3 QC Inspection Items Table
```sql
CREATE TABLE qc_inspection_items (
    inspection_item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    inspection_id BIGINT NOT NULL,
    
    -- Inspection Item Details
    item_sequence INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    inspection_type ENUM('VISUAL', 'MEASUREMENT', 'FUNCTIONAL', 'DOCUMENTATION') NOT NULL,
    
    -- Criteria and Results
    acceptance_criteria TEXT,
    measured_value VARCHAR(100),
    expected_value VARCHAR(100),
    tolerance VARCHAR(50),
    result ENUM('PASS', 'FAIL', 'N/A') NOT NULL,
    
    -- Notes and Actions
    notes TEXT,
    corrective_action TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (inspection_id) REFERENCES qc_inspections(inspection_id) ON DELETE CASCADE,
    
    UNIQUE KEY uk_inspection_item_sequence (inspection_id, item_sequence),
    INDEX idx_qc_items_inspection (inspection_id),
    INDEX idx_qc_items_result (result)
);
```

#### 6.2.4 Production Tasks Table
```sql
CREATE TABLE production_tasks (
    task_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_item_id BIGINT NOT NULL,
    task_name VARCHAR(200) NOT NULL,
    task_type ENUM('ASSEMBLY', 'FABRICATION', 'INSPECTION', 'PACKAGING', 'TESTING') NOT NULL,
    
    -- Task Sequence and Dependencies
    sequence_order INTEGER NOT NULL,
    depends_on_task_id BIGINT,                -- Task dependency
    
    -- Assignment
    assigned_to BIGINT,
    assigned_by BIGINT,
    assigned_at TIMESTAMP,
    
    -- Work Instructions
    work_instructions TEXT,
    required_tools JSON,
    safety_requirements TEXT,
    estimated_hours DECIMAL(6,2),
    
    -- Status and Progress
    status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED') DEFAULT 'PENDING',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Time Tracking
    actual_start_time TIMESTAMP,
    actual_end_time TIMESTAMP,
    actual_hours DECIMAL(6,2),
    
    -- Notes and Issues
    work_notes TEXT,
    issues_encountered TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (order_item_id) REFERENCES order_items(item_id),
    FOREIGN KEY (depends_on_task_id) REFERENCES production_tasks(task_id),
    FOREIGN KEY (assigned_to) REFERENCES users(user_id),
    FOREIGN KEY (assigned_by) REFERENCES users(user_id),
    
    INDEX idx_production_tasks_order_item (order_item_id),
    INDEX idx_production_tasks_assigned (assigned_to),
    INDEX idx_production_tasks_status (status),
    INDEX idx_production_tasks_sequence (sequence_order),
    INDEX idx_production_tasks_dependency (depends_on_task_id)
);
```

---

## 7. INTEGRATION & EXTERNAL SYSTEMS MODEL

### 7.1 Integration Architecture

The system integrates with:
- **ERP Systems** - Financial and inventory synchronization
- **Document Management** - Work instructions, specifications
- **Shipping Systems** - Logistics and tracking
- **Customer Portals** - Order status and communication

### 7.2 Core Integration Entities

#### 7.2.1 External Systems Table
```sql
CREATE TABLE external_systems (
    system_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    system_name VARCHAR(100) UNIQUE NOT NULL,
    system_type ENUM('ERP', 'DOCUMENT_MANAGEMENT', 'SHIPPING', 'CRM', 'FINANCIAL') NOT NULL,
    
    -- Connection Details
    endpoint_url VARCHAR(500),
    authentication_type ENUM('API_KEY', 'OAUTH', 'BASIC_AUTH', 'CERTIFICATE') NOT NULL,
    connection_config JSON,                   -- Connection configuration
    
    -- Sync Configuration
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMP,
    next_sync_at TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_connected BOOLEAN DEFAULT false,
    last_connection_test TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_external_systems_type (system_type),
    INDEX idx_external_systems_active (is_active)
);
```

#### 7.2.2 Data Synchronization Log
```sql
CREATE TABLE sync_log (
    sync_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    system_id BIGINT NOT NULL,
    sync_type ENUM('FULL', 'INCREMENTAL', 'MANUAL') NOT NULL,
    sync_direction ENUM('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL') NOT NULL,
    
    -- Sync Details
    data_type VARCHAR(50) NOT NULL,           -- e.g., 'orders', 'customers'
    records_processed INTEGER DEFAULT 0,
    records_successful INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Timing
    sync_started_at TIMESTAMP NOT NULL,
    sync_completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Results
    status ENUM('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL') NOT NULL,
    error_message TEXT,
    sync_details JSON,                        -- Detailed sync information
    
    initiated_by BIGINT,                      -- User who initiated sync
    
    FOREIGN KEY (system_id) REFERENCES external_systems(system_id),
    FOREIGN KEY (initiated_by) REFERENCES users(user_id),
    
    INDEX idx_sync_log_system (system_id),
    INDEX idx_sync_log_type (data_type),
    INDEX idx_sync_log_status (status),
    INDEX idx_sync_log_date (sync_started_at)
);
```

#### 7.2.3 Document Management Table
```sql
CREATE TABLE documents (
    document_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    document_name VARCHAR(255) NOT NULL,
    document_type ENUM('WORK_INSTRUCTION', 'SPECIFICATION', 'DRAWING', 'PHOTO', 'MANUAL', 'CERTIFICATE') NOT NULL,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),                    -- For integrity checking
    
    -- Document Metadata
    version VARCHAR(20) DEFAULT '1.0',
    description TEXT,
    tags JSON,                                -- Searchable tags
    
    -- Associations
    related_to_type ENUM('ORDER', 'ASSEMBLY', 'PART', 'QC_PROCESS', 'TASK') NOT NULL,
    related_to_id VARCHAR(50) NOT NULL,
    
    -- Access Control
    access_level ENUM('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL') DEFAULT 'INTERNAL',
    
    -- Status and Versioning
    status ENUM('DRAFT', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'ARCHIVED') DEFAULT 'DRAFT',
    approved_by BIGINT,
    approved_at TIMESTAMP,
    
    uploaded_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (approved_by) REFERENCES users(user_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    
    INDEX idx_documents_type (document_type),
    INDEX idx_documents_related (related_to_type, related_to_id),
    INDEX idx_documents_status (status),
    INDEX idx_documents_access (access_level),
    FULLTEXT INDEX idx_documents_search (document_name, description)
);
```

#### 7.2.4 Customers Table
```sql
CREATE TABLE customers (
    customer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Company Information
    company_name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    company_size ENUM('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'),
    
    -- Primary Contact
    primary_contact_name VARCHAR(100),
    primary_contact_email VARCHAR(255),
    primary_contact_phone VARCHAR(20),
    
    -- Addresses
    billing_address JSON,                     -- Structured address
    shipping_address JSON,                    -- Structured address
    
    -- Business Terms
    payment_terms INTEGER DEFAULT 30,        -- Net days
    credit_limit DECIMAL(12,2),
    tax_exempt BOOLEAN DEFAULT false,
    
    -- ERP Integration
    erp_customer_id VARCHAR(50),              -- External ERP reference
    
    -- Status
    customer_status ENUM('ACTIVE', 'INACTIVE', 'PROSPECT', 'SUSPENDED') DEFAULT 'ACTIVE',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_customers_code (customer_code),
    INDEX idx_customers_company (company_name),
    INDEX idx_customers_status (customer_status),
    INDEX idx_customers_erp (erp_customer_id)
);
```

---

## 8. PHYSICAL DATABASE DESIGN & PERFORMANCE OPTIMIZATION

### 8.1 Database Architecture

**Technology Stack:**
- **Primary Database**: PostgreSQL 15+ (for ACID compliance, JSON support, full-text search)
- **Cache Layer**: Redis (for session management, frequently accessed data)
- **Search Engine**: Elasticsearch (for advanced product/part search)
- **File Storage**: AWS S3 or equivalent (for documents, photos)

### 8.2 Database Partitioning Strategy

#### 8.2.1 Time-Based Partitioning
```sql
-- Orders table partitioned by month for performance
CREATE TABLE orders (
    -- ... existing columns ...
) PARTITION BY RANGE (order_date);

-- Create monthly partitions
CREATE TABLE orders_2025_01 PARTITION OF orders 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE orders_2025_02 PARTITION OF orders 
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- Continue for each month...

-- Auto-partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + interval '1 month';
    
    EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

#### 8.2.2 Hash Partitioning for Large Tables
```sql
-- BOM line items partitioned by hash for even distribution
CREATE TABLE bom_line_items (
    -- ... existing columns ...
) PARTITION BY HASH (bom_id);

-- Create hash partitions
CREATE TABLE bom_line_items_0 PARTITION OF bom_line_items FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE bom_line_items_1 PARTITION OF bom_line_items FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE bom_line_items_2 PARTITION OF bom_line_items FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE bom_line_items_3 PARTITION OF bom_line_items FOR VALUES WITH (modulus 4, remainder 3);
```

### 8.3 Advanced Indexing Strategy

#### 8.3.1 Composite Indexes for Common Query Patterns
```sql
-- Multi-column index for order filtering and sorting 
CREATE INDEX idx_orders_composite_search ON orders 
(customer_id, current_phase, order_date DESC, priority);

-- Covering index for BOM generation queries
CREATE INDEX idx_assembly_components_covering ON assembly_components 
(assembly_id, component_type) 
INCLUDE (component_id, quantity, is_optional);

-- Partial index for active orders only
CREATE INDEX idx_orders_active_phase ON orders (current_phase, order_date DESC) 
WHERE current_phase NOT IN ('DELIVERED', 'CANCELLED');

-- Expression index for case-insensitive searches
CREATE INDEX idx_parts_name_lower ON parts (lower(name));
```

#### 8.3.2 Full-Text Search Indexes
```sql
-- Advanced full-text search for parts
ALTER TABLE parts ADD COLUMN search_vector tsvector;

CREATE INDEX idx_parts_search_gin ON parts USING GIN(search_vector);

-- Update search vector automatically
CREATE OR REPLACE FUNCTION update_parts_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.manufacturer_part_number, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parts_search_vector_update
    BEFORE INSERT OR UPDATE ON parts
    FOR EACH ROW EXECUTE FUNCTION update_parts_search_vector();
```

### 8.4 Materialized Views for Performance

#### 8.4.1 Order Summary View
```sql
CREATE MATERIALIZED VIEW mv_order_summary AS
SELECT 
    o.order_id,
    o.order_number,
    o.customer_id,
    c.company_name,
    o.current_phase,
    o.priority,
    o.order_date,
    o.total_amount,
    COUNT(oi.item_id) as total_items,
    COUNT(CASE WHEN oi.production_status = 'COMPLETED' THEN 1 END) as completed_items,
    ROUND(COUNT(CASE WHEN oi.production_status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(oi.item_id), 2) as completion_percentage
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id, c.company_name;

-- Index on materialized view
CREATE INDEX idx_mv_order_summary_phase ON mv_order_summary (current_phase);
CREATE INDEX idx_mv_order_summary_customer ON mv_order_summary (customer_id);

-- Refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_order_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_summary;
END;
$$ LANGUAGE plpgsql;
```

#### 8.4.2 Inventory Hierarchy View
```sql
CREATE MATERIALIZED VIEW mv_inventory_hierarchy AS
WITH RECURSIVE hierarchy AS (
    -- Base case: top-level categories
    SELECT 
        category_id as id,
        'CATEGORY' as type,
        name,
        NULL as parent_id,
        1 as level,
        category_id::text as path
    FROM categories 
    WHERE parent_category_id IS NULL
    
    UNION ALL
    
    -- Recursive case: subcategories
    SELECT 
        s.subcategory_id,
        'SUBCATEGORY',
        s.name,
        s.category_id,
        h.level + 1,
        h.path || '.' || s.subcategory_id
    FROM subcategories s
    JOIN hierarchy h ON s.category_id = h.id
    
    UNION ALL
    
    -- Assemblies
    SELECT 
        a.assembly_id,
        'ASSEMBLY',
        a.name,
        a.subcategory_id,
        h.level + 1,
        h.path || '.' || a.assembly_id
    FROM assemblies a
    JOIN hierarchy h ON a.subcategory_id = h.id
)
SELECT * FROM hierarchy
ORDER BY path;

CREATE INDEX idx_mv_inventory_hierarchy_path ON mv_inventory_hierarchy (path);
CREATE INDEX idx_mv_inventory_hierarchy_level ON mv_inventory_hierarchy (level);
```

### 8.5 Performance Monitoring Views

#### 8.5.1 Query Performance Monitoring
```sql
CREATE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY total_time DESC;
```

#### 8.5.2 Table Size Monitoring
```sql
CREATE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stats
JOIN pg_tables ON pg_stats.tablename = pg_tables.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 8.6 Database Connection and Caching Strategy

#### 8.6.1 Connection Pooling Configuration
```sql
-- PgBouncer configuration for connection pooling
-- pool_mode = transaction
-- max_client_conn = 100
-- default_pool_size = 20
-- reserve_pool_size = 5
```

#### 8.6.2 Redis Caching Strategy
```javascript
// Cache frequently accessed data in Redis
const cacheStrategy = {
  // User sessions - 24 hour TTL
  userSessions: {
    keyPattern: 'session:{userId}',
    ttl: 86400
  },
  
  // BOM data - 1 hour TTL (updated when BOM changes)
  bomData: {
    keyPattern: 'bom:{bomId}',
    ttl: 3600
  },
  
  // Assembly component lists - 4 hour TTL
  assemblyComponents: {
    keyPattern: 'assembly_components:{assemblyId}',
    ttl: 14400
  },
  
  // Configuration rules - 24 hour TTL
  configRules: {
    keyPattern: 'config_rules:{assemblyType}',
    ttl: 86400
  }
};
```

---

## 9. DATA SECURITY & GOVERNANCE FRAMEWORK

### 9.1 Data Classification & Security Levels

**Data Classification:**
- **Public**: Marketing materials, general product information
- **Internal**: Standard operational data, non-sensitive BOMs
- **Restricted**: Customer financial data, proprietary designs
- **Confidential**: Strategic information, sensitive customer data

### 9.2 Encryption Strategy

#### 9.2.1 Encryption at Rest
```sql
-- Transparent Data Encryption (TDE) for PostgreSQL
-- Enable at database level
ALTER DATABASE torvan_workflow SET encryption = 'on';

-- Column-level encryption for sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive customer data
ALTER TABLE customers 
ADD COLUMN encrypted_credit_info BYTEA;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data text)
RETURNS bytea AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 9.2.2 Row Level Security (RLS)
```sql
-- Enable RLS on sensitive tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy for order access based on user role
CREATE POLICY order_access_policy ON orders
    FOR ALL TO application_role
    USING (
        -- Users can access orders they created or are assigned to
        created_by = current_user_id() OR 
        assigned_to = current_user_id() OR
        -- Or if they have admin role
        has_permission(current_user_id(), 'orders:read_all')
    );

-- Policy for customer data access
CREATE POLICY customer_access_policy ON customers
    FOR ALL TO application_role
    USING (
        -- Sales and admin can access all customers
        has_role(current_user_id(), 'ADMIN') OR
        has_role(current_user_id(), 'SALES_MANAGER') OR
        -- Others can only access customers from their orders
        customer_id IN (
            SELECT customer_id FROM orders 
            WHERE created_by = current_user_id() OR assigned_to = current_user_id()
        )
    );
```

### 9.3 Audit Trail System

#### 9.3.1 Audit Log Table
```sql
CREATE TABLE audit_log (
    audit_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    
    -- Change Details
    old_values JSON,
    new_values JSON,
    changed_columns TEXT[],
    
    -- User Context
    user_id BIGINT NOT NULL,
    user_ip INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Timestamp
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Data Classification
    data_classification ENUM('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL') DEFAULT 'INTERNAL',
    
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Partitioned by month for performance
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for audit queries
CREATE INDEX idx_audit_log_table_record ON audit_log (table_name, record_id);
CREATE INDEX idx_audit_log_user_date ON audit_log (user_id, changed_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log (action, changed_at DESC);
```

#### 9.3.2 Automatic Audit Trigger
```sql
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSON;
    new_data JSON;
    changed_cols TEXT[];
BEGIN
    -- Determine changed columns for UPDATE
    IF TG_OP = 'UPDATE' THEN
        SELECT array_agg(key) INTO changed_cols
        FROM json_each_text(to_json(NEW))
        WHERE value IS DISTINCT FROM json_extract_path_text(to_json(OLD), key);
        
        old_data := to_json(OLD);
        new_data := to_json(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_json(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_json(OLD);
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log (
        table_name, record_id, action, old_values, new_values, 
        changed_columns, user_id, user_ip, session_id
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::text,
        TG_OP,
        old_data,
        new_data,
        changed_cols,
        current_setting('app.current_user_id')::bigint,
        inet_client_addr(),
        current_setting('app.session_id', true)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to sensitive tables
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

### 9.4 Data Retention & Archival

#### 9.4.1 Data Retention Policies
```sql
CREATE TABLE data_retention_policies (
    policy_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(100) NOT NULL,
    retention_period_months INTEGER NOT NULL,
    archive_after_months INTEGER,
    
    -- Retention Rules
    retention_criteria JSON,              -- Additional criteria for retention
    
    -- Archival Configuration
    archive_to_cold_storage BOOLEAN DEFAULT false,
    cold_storage_location VARCHAR(500),
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Define retention policies
INSERT INTO data_retention_policies (table_name, retention_period_months, archive_after_months) VALUES
('orders', 84, 24),                      -- Keep orders for 7 years, archive after 2 years
('audit_log', 36, 12),                   -- Keep audit logs for 3 years, archive after 1 year
('qc_inspections', 60, 24),              -- Keep QC data for 5 years, archive after 2 years
('documents', 120, 36);                  -- Keep documents for 10 years, archive after 3 years
```

#### 9.4.2 Automated Archival Process
```sql
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS void AS $$
DECLARE
    policy RECORD;
    archive_date DATE;
    archive_count INTEGER;
BEGIN
    FOR policy IN SELECT * FROM data_retention_policies WHERE is_active = true LOOP
        archive_date := CURRENT_DATE - (policy.archive_after_months || ' months')::INTERVAL;
        
        -- Create archive table if it doesn't exist
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I_archive (LIKE %I INCLUDING ALL)', 
                      policy.table_name, policy.table_name);
        
        -- Move old records to archive
        EXECUTE format('
            WITH moved_rows AS (
                DELETE FROM %I 
                WHERE created_at < %L 
                RETURNING *
            )
            INSERT INTO %I_archive SELECT * FROM moved_rows',
            policy.table_name, archive_date, policy.table_name);
        
        GET DIAGNOSTICS archive_count = ROW_COUNT;
        
        -- Log archival activity
        INSERT INTO sync_log (system_id, sync_type, sync_direction, data_type, 
                             records_processed, sync_started_at, sync_completed_at, status)
        VALUES (1, 'ARCHIVAL', 'INTERNAL', policy.table_name, 
                archive_count, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'COMPLETED');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly archival
SELECT cron.schedule('monthly-archival', '0 2 1 * *', 'SELECT archive_old_data();');
```

### 9.5 Data Quality Framework

#### 9.5.1 Data Quality Rules
```sql
CREATE TABLE data_quality_rules (
    rule_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100),
    
    -- Rule Definition
    rule_type ENUM('NOT_NULL', 'UNIQUE', 'RANGE', 'FORMAT', 'REFERENCE', 'CUSTOM') NOT NULL,
    rule_expression TEXT,                     -- SQL expression for the rule
    expected_value JSON,                      -- Expected values or ranges
    
    -- Quality Thresholds
    warning_threshold DECIMAL(5,2) DEFAULT 95.0,  -- % threshold for warnings
    error_threshold DECIMAL(5,2) DEFAULT 90.0,    -- % threshold for errors
    
    -- Rule Status
    is_active BOOLEAN DEFAULT true,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Define quality rules
INSERT INTO data_quality_rules (rule_name, table_name, column_name, rule_type, rule_expression, created_by) VALUES
('Orders must have customer', 'orders', 'customer_id', 'NOT_NULL', 'customer_id IS NOT NULL', 1),
('Valid order phases', 'orders', 'current_phase', 'CUSTOM', 
 'current_phase IN (''DRAFT'', ''CONFIGURATION'', ''APPROVAL'', ''PRODUCTION'', ''QUALITY_CONTROL'', ''PACKAGING'', ''SHIPPING'', ''DELIVERED'')', 1),
('Positive quantities', 'order_items', 'quantity', 'RANGE', 'quantity > 0', 1),
('Valid email format', 'customers', 'primary_contact_email', 'FORMAT', 'primary_contact_email ~ ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$''', 1);
```

#### 9.5.2 Data Quality Monitoring
```sql
CREATE TABLE data_quality_results (
    result_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    rule_id BIGINT NOT NULL,
    
    -- Test Results
    total_records INTEGER NOT NULL,
    passed_records INTEGER NOT NULL,
    failed_records INTEGER NOT NULL,
    pass_percentage DECIMAL(5,2) NOT NULL,
    
    -- Quality Status
    quality_status ENUM('PASS', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    
    -- Execution Details
    execution_time_ms INTEGER,
    test_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Failed Records (sample)
    failed_record_sample JSON,               -- Sample of failed records for analysis
    
    FOREIGN KEY (rule_id) REFERENCES data_quality_rules(rule_id),
    
    INDEX idx_dq_results_rule (rule_id),
    INDEX idx_dq_results_timestamp (test_timestamp),
    INDEX idx_dq_results_status (quality_status)
);

-- Function to run data quality checks
CREATE OR REPLACE FUNCTION run_data_quality_check(rule_id_param BIGINT)
RETURNS void AS $$
DECLARE
    rule RECORD;
    total_count INTEGER;
    passed_count INTEGER;
    pass_pct DECIMAL(5,2);
    quality_status TEXT;
BEGIN
    SELECT * INTO rule FROM data_quality_rules WHERE rule_id = rule_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Execute the quality rule
    EXECUTE format('SELECT COUNT(*) FROM %I', rule.table_name) INTO total_count;
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE %s', rule.table_name, rule.rule_expression) INTO passed_count;
    
    pass_pct := (passed_count * 100.0) / NULLIF(total_count, 0);
    
    -- Determine quality status
    quality_status := CASE 
        WHEN pass_pct >= rule.warning_threshold THEN 'PASS'
        WHEN pass_pct >= rule.error_threshold THEN 'WARNING'
        WHEN rule.severity = 'CRITICAL' AND pass_pct < rule.error_threshold THEN 'CRITICAL'
        ELSE 'ERROR'
    END;
    
    -- Insert results
    INSERT INTO data_quality_results (
        rule_id, total_records, passed_records, failed_records, 
        pass_percentage, quality_status
    ) VALUES (
        rule_id_param, total_count, passed_count, total_count - passed_count,
        pass_pct, quality_status
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 10. MIGRATION STRATEGY & IMPLEMENTATION PLAN

### 10.1 Migration Overview

**Migration Approach**: Phased implementation with parallel systems during transition

**Key Principles:**
- **Zero-downtime migration** for critical operations
- **Data integrity validation** at each phase
- **Rollback capability** at each milestone
- **Gradual user migration** by department

### 10.2 Migration Phases

#### Phase 1: Foundation Setup (Weeks 1-2)
- Database server provisioning and configuration
- Core table creation and indexing
- Security framework implementation
- Basic user authentication system

#### Phase 2: Master Data Migration (Weeks 3-4)
- Categories and subcategories import
- Parts catalog migration with validation
- Assembly definitions import
- User accounts and role setup

#### Phase 3: Operational Data Migration (Weeks 5-6)
- Historical order data migration
- Customer data import with encryption
- Document management system setup
- QC process definitions

#### Phase 4: Integration & Testing (Weeks 7-8)
- ERP system integration testing
- Performance testing with full dataset
- User acceptance testing
- Security penetration testing

#### Phase 5: Go-Live & Monitoring (Weeks 9-10)
- Production deployment
- User training and onboarding
- Performance monitoring setup
- Issue resolution and optimization

### 10.3 Data Migration Scripts

#### 10.3.1 Categories Migration
```sql
-- Migration script for categories from JSON source
CREATE OR REPLACE FUNCTION migrate_categories_from_json()
RETURNS void AS $$
DECLARE
    category_data JSON;
    cat_record RECORD;
    subcat_record RECORD;
BEGIN
    -- Load JSON data (assuming it's stored in a temporary table)
    SELECT source_data INTO category_data FROM migration_temp WHERE data_type = 'categories';
    
    -- Migrate main categories
    FOR cat_record IN 
        SELECT key as category_id, value->>'name' as name, value->>'description' as description
        FROM json_each(category_data->'categories')
    LOOP
        INSERT INTO categories (category_id, name, description)
        VALUES (cat_record.category_id, cat_record.name, cat_record.description)
        ON CONFLICT (category_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    -- Migrate subcategories
    FOR subcat_record IN 
        SELECT 
            cat.key as category_id,
            subcat.key as subcategory_id,
            subcat.value->>'name' as name,
            subcat.value->>'description' as description
        FROM json_each(category_data->'categories') cat,
             json_each(cat.value->'subcategories') subcat
    LOOP
        INSERT INTO subcategories (subcategory_id, category_id, name, description)
        VALUES (subcat_record.subcategory_id, subcat_record.category_id, 
                subcat_record.name, subcat_record.description)
        ON CONFLICT (subcategory_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    RAISE NOTICE 'Categories migration completed successfully';
END;
$$ LANGUAGE plpgsql;
```

#### 10.3.2 Parts Migration with Validation
```sql
CREATE OR REPLACE FUNCTION migrate_parts_from_json()
RETURNS void AS $$
DECLARE
    parts_data JSON;
    part_record RECORD;
    validation_errors TEXT[];
    error_count INTEGER := 0;
BEGIN
    SELECT source_data INTO parts_data FROM migration_temp WHERE data_type = 'parts';
    
    -- Create temporary table for validation errors
    CREATE TEMP TABLE part_migration_errors (
        part_id VARCHAR(50),
        error_message TEXT
    );
    
    FOR part_record IN 
        SELECT 
            key as part_id,
            value->>'name' as name,
            value->>'manufacturer_part_number' as manufacturer_part_number,
            value->>'manufacturer_info' as manufacturer_info,
            value->>'type' as part_type,
            value->>'status' as status
        FROM json_each(parts_data->'parts')
    LOOP
        -- Validate part data
        validation_errors := ARRAY[]::TEXT[];
        
        IF part_record.name IS NULL OR length(part_record.name) = 0 THEN
            validation_errors := array_append(validation_errors, 'Name is required');
        END IF;
        
        IF part_record.part_type NOT IN ('COMPONENT', 'MATERIAL', 'HARDWARE', 'ELECTRONIC') THEN
            validation_errors := array_append(validation_errors, 'Invalid part type: ' || part_record.part_type);
        END IF;
        
        -- Log validation errors
        IF array_length(validation_errors, 1) > 0 THEN
            INSERT INTO part_migration_errors VALUES (part_record.part_id, array_to_string(validation_errors, '; '));
            error_count := error_count + 1;
            CONTINUE;
        END IF;
        
        -- Insert valid parts
        INSERT INTO parts (
            part_id, name, manufacturer_part_number, manufacturer_info, 
            part_type, status
        ) VALUES (
            part_record.part_id, part_record.name, part_record.manufacturer_part_number,
            part_record.manufacturer_info, part_record.part_type::part_type_enum, 
            part_record.status::status_enum
        ) ON CONFLICT (part_id) DO UPDATE SET
            name = EXCLUDED.name,
            manufacturer_part_number = EXCLUDED.manufacturer_part_number,
            manufacturer_info = EXCLUDED.manufacturer_info,
            part_type = EXCLUDED.part_type,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    -- Report migration results
    RAISE NOTICE 'Parts migration completed. Errors: %', error_count;
    
    IF error_count > 0 THEN
        RAISE NOTICE 'Check part_migration_errors table for details';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 10.4 Performance Testing Framework

#### 10.4.1 Load Testing Scripts
```sql
-- Generate test data for performance testing
CREATE OR REPLACE FUNCTION generate_test_data(num_orders INTEGER DEFAULT 1000)
RETURNS void AS $$
DECLARE
    i INTEGER;
    customer_ids BIGINT[];
    assembly_ids VARCHAR(50)[];
BEGIN
    -- Get existing customer and assembly IDs
    SELECT array_agg(customer_id) INTO customer_ids FROM customers LIMIT 100;
    SELECT array_agg(assembly_id) INTO assembly_ids FROM assemblies WHERE status = 'ACTIVE' LIMIT 50;
    
    -- Generate test orders
    FOR i IN 1..num_orders LOOP
        INSERT INTO orders (
            order_id, order_number, customer_id, order_date, current_phase,
            subtotal, total_amount, created_by, assigned_to
        ) VALUES (
            'TEST-' || i,
            'TEST-ORDER-' || lpad(i::text, 6, '0'),
            customer_ids[1 + (i % array_length(customer_ids, 1))],
            CURRENT_DATE - (random() * 365)::INTEGER,
            (ARRAY['DRAFT', 'CONFIGURATION', 'PRODUCTION', 'QUALITY_CONTROL'])[1 + (i % 4)],
            random() * 10000,
            random() * 12000,
            1,
            1 + (i % 5)
        );
        
        -- Add order items
        INSERT INTO order_items (
            order_id, line_number, assembly_id, quantity, unit_price, line_total
        ) VALUES (
            'TEST-' || i,
            1,
            assembly_ids[1 + (i % array_length(assembly_ids, 1))],
            1 + (random() * 5)::INTEGER,
            random() * 1000,
            random() * 2000
        );
    END LOOP;
    
    RAISE NOTICE 'Generated % test orders', num_orders;
END;
$$ LANGUAGE plpgsql;

-- Performance test queries
CREATE OR REPLACE FUNCTION run_performance_tests()
RETURNS TABLE(test_name TEXT, execution_time_ms NUMERIC, rows_returned INTEGER) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    row_count INTEGER;
BEGIN
    -- Test 1: Complex order search
    test_name := 'Complex Order Search';
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count FROM mv_order_summary 
    WHERE current_phase IN ('PRODUCTION', 'QUALITY_CONTROL') 
    AND completion_percentage < 80;
    
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    rows_returned := row_count;
    RETURN NEXT;
    
    -- Test 2: BOM generation simulation
    test_name := 'BOM Generation Simulation';
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count FROM assembly_components ac
    JOIN assemblies a ON ac.assembly_id = a.assembly_id
    WHERE a.status = 'ACTIVE' AND ac.component_type = 'PART';
    
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    rows_returned := row_count;
    RETURN NEXT;
    
    -- Test 3: Full-text search
    test_name := 'Full-text Part Search';
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count FROM parts 
    WHERE search_vector @@ to_tsquery('english', 'stainless & steel');
    
    end_time := clock_timestamp();
    execution_time_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    rows_returned := row_count;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;
```

### 10.5 Rollback Strategy

#### 10.5.1 Database Snapshot and Restore
```sql
-- Create database snapshot before migration
CREATE OR REPLACE FUNCTION create_migration_snapshot()
RETURNS text AS $$
DECLARE
    snapshot_name TEXT;
BEGIN
    snapshot_name := 'migration_snapshot_' || to_char(CURRENT_TIMESTAMP, 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Create database backup
    PERFORM pg_create_physical_replication_slot(snapshot_name, true);
    
    -- Log snapshot creation
    INSERT INTO migration_log (operation, status, details, created_at) 
    VALUES ('SNAPSHOT_CREATE', 'SUCCESS', 'Snapshot: ' || snapshot_name, CURRENT_TIMESTAMP);
    
    RETURN snapshot_name;
END;
$$ LANGUAGE plpgsql;

-- Rollback to snapshot
CREATE OR REPLACE FUNCTION rollback_to_snapshot(snapshot_name TEXT)
RETURNS void AS $$
BEGIN
    -- This would typically involve database-specific restore procedures
    -- Implementation depends on the specific database platform and backup strategy
    
    RAISE NOTICE 'Initiating rollback to snapshot: %', snapshot_name;
    
    -- Log rollback operation
    INSERT INTO migration_log (operation, status, details, created_at) 
    VALUES ('ROLLBACK', 'INITIATED', 'Rolling back to: ' || snapshot_name, CURRENT_TIMESTAMP);
    
    -- Actual rollback implementation would go here
    -- This might involve stopping services, restoring from backup, and restarting
END;
$$ LANGUAGE plpgsql;
```

### 10.6 Migration Monitoring and Logging

#### 10.6.1 Migration Log Table
```sql
CREATE TABLE migration_log (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    migration_phase VARCHAR(50),
    operation VARCHAR(100) NOT NULL,
    status ENUM('STARTED', 'IN_PROGRESS', 'SUCCESS', 'WARNING', 'ERROR', 'ROLLBACK') NOT NULL,
    
    -- Progress Tracking
    total_records INTEGER,
    processed_records INTEGER,
    success_records INTEGER,
    error_records INTEGER,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Details
    details TEXT,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_migration_log_phase (migration_phase),
    INDEX idx_migration_log_status (status),
    INDEX idx_migration_log_date (created_at)
);
```

---

## 11. IMPLEMENTATION RECOMMENDATIONS & NEXT STEPS

### 11.1 Technology Stack Recommendations

**Database Platform:** PostgreSQL 15+
- **Rationale**: Advanced JSON support, full-text search, table partitioning, row-level security
- **Alternatives**: MySQL 8.0+ (if PostgreSQL expertise is limited)

**Application Framework:** Next.js with tRPC (as specified)
- **Database ORM**: Prisma or Drizzle ORM for type-safe database operations
- **Caching**: Redis for session management and frequently accessed data
- **Search**: Elasticsearch for advanced product/part search capabilities

**Infrastructure:**
- **Database**: AWS RDS PostgreSQL or Azure Database for PostgreSQL
- **File Storage**: AWS S3 or Azure Blob Storage for documents and photos
- **Monitoring**: AWS CloudWatch or DataDog for performance monitoring

### 11.2 Development Approach

#### 11.2.1 Database-First Development
```sql
-- Use database migrations for schema management
-- Example migration file: 001_create_core_tables.sql

-- Start with core entities
CREATE TABLE categories ( ... );
CREATE TABLE subcategories ( ... );
CREATE TABLE assemblies ( ... );
CREATE TABLE parts ( ... );

-- Add relationships
CREATE TABLE assembly_components ( ... );

-- Create indexes and constraints
CREATE INDEX idx_assemblies_category ON assemblies(category_id);
ALTER TABLE assemblies ADD CONSTRAINT fk_assemblies_category 
    FOREIGN KEY (category_id) REFERENCES categories(category_id);
```

#### 11.2.2 API Layer Design
```typescript
// tRPC API structure for data access
export const inventoryRouter = router({
  // Get category hierarchy
  getCategoryHierarchy: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.category.findMany({
      include: {
        subcategories: {
          include: {
            assemblies: true
          }
        }
      }
    });
  }),
  
  // Generate BOM for configuration
  generateBOM: protectedProcedure
    .input(z.object({
      configurationId: z.number(),
      assemblyId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // BOM generation logic
      const configuration = await ctx.db.configuration.findUnique({
        where: { configurationId: input.configurationId }
      });
      
      // Apply configuration rules and generate BOM
      return await generateBOMFromConfiguration(configuration, input.assemblyId);
    }),
});
```

### 11.3 Performance Targets & Monitoring

**Key Performance Indicators:**
- **BOM Generation**: < 5 seconds for complex configurations
- **Order Search**: < 2 seconds for filtered results
- **Database Queries**: 95% under 100ms response time
- **Concurrent Users**: Support 50 simultaneous users
- **Data Import**: Process 1000 parts in < 30 seconds

**Monitoring Setup:**
```sql
-- Create performance monitoring views
CREATE VIEW v_performance_dashboard AS
SELECT 
    'Orders' as entity_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN current_phase = 'PRODUCTION' THEN 1 END) as active_records,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'BOMs' as entity_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_records,
    AVG(total_parts_count) as avg_parts_count
FROM boms
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### 11.4 Security Implementation Checklist

- [ ] **Database Security**
  - [ ] Row-level security policies implemented
  - [ ] Column-level encryption for sensitive data
  - [ ] Database user roles with minimal privileges
  - [ ] Regular security patches and updates

- [ ] **Application Security**  
  - [ ] JWT-based authentication with role validation
  - [ ] API rate limiting and throttling
  - [ ] Input validation and SQL injection prevention
  - [ ] HTTPS enforcement for all communications

- [ ] **Data Protection**
  - [ ] Audit trail for all data modifications
  - [ ] Data backup and recovery procedures
  - [ ] Data retention and archival policies
  - [ ] GDPR/privacy compliance measures

### 11.5 Quality Assurance Framework

#### 11.5.1 Data Validation Rules
```sql
-- Implement comprehensive data validation
ALTER TABLE orders ADD CONSTRAINT chk_order_dates 
    CHECK (requested_delivery_date >= order_date);

ALTER TABLE order_items ADD CONSTRAINT chk_positive_quantity 
    CHECK (quantity > 0);

ALTER TABLE bom_line_items ADD CONSTRAINT chk_positive_line_total 
    CHECK (line_total_cost >= 0);

-- Create validation functions
CREATE OR REPLACE FUNCTION validate_order_phase_transition(
    old_phase TEXT, 
    new_phase TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    -- Define valid phase transitions
    RETURN CASE 
        WHEN old_phase = 'DRAFT' AND new_phase IN ('CONFIGURATION', 'CANCELLED') THEN TRUE
        WHEN old_phase = 'CONFIGURATION' AND new_phase IN ('APPROVAL', 'DRAFT') THEN TRUE
        WHEN old_phase = 'APPROVAL' AND new_phase IN ('PRODUCTION', 'CONFIGURATION') THEN TRUE
        -- ... continue for all valid transitions
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql;
```

### 11.6 Documentation Requirements

**Technical Documentation:**
- Database schema documentation with ERD diagrams
- API documentation with request/response examples  
- Performance tuning guides and query optimization
- Security configuration and access control guides

**User Documentation:**
- System administration guides for each user role
- Order management workflow documentation
- BOM generation and configuration guides
- Quality control process documentation

**Operational Documentation:**
- Backup and recovery procedures
- Performance monitoring and alerting setup
- Data migration and deployment procedures
- Troubleshooting guides for common issues

---

## CONCLUSION

This comprehensive data architecture design provides a robust foundation for the TORVAN workflow management system. The architecture supports:

- **Scalable hierarchical inventory management** with 4-level hierarchy
- **Dynamic BOM generation** with configuration-driven rules
- **Complete order lifecycle tracking** through 8 phases
- **Multi-role security framework** with granular permissions
- **Quality control integration** with photo documentation
- **External system integration** for ERP and document management
- **Performance optimization** for 50 concurrent users and sub-5-second BOM generation

**Key Success Factors:**
1. **Phased implementation** with validation at each step
2. **Comprehensive testing** including performance and security
3. **User training** and change management support
4. **Continuous monitoring** and optimization post-deployment

The architecture is designed to be maintainable, scalable, and adaptable to future business requirements while ensuring data integrity, security, and performance at all levels.

**File References:**
- **Main Architecture Document**: `/media/selcuk/Vs_code_files/Claude_subagents/torvan-workflow/DATA_ARCHITECTURE_COMPREHENSIVE.md`
- **Supporting System Architecture**: `/media/selcuk/Vs_code_files/Claude_subagents/torvan-workflow/SYSTEM_ARCHITECTURE.md`
- **Source Data Files**: 
  - `/media/selcuk/Vs_code_files/Claude_subagents/resources/assemblies.json`
  - `/media/selcuk/Vs_code_files/Claude_subagents/resources/categories.json`
  - `/media/selcuk/Vs_code_files/Claude_subagents/resources/parts.json`

---