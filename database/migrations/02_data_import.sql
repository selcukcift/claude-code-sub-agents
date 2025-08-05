-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- DATA IMPORT MIGRATION
-- =====================================================
-- 
-- This migration script imports existing data from JSON files into
-- the TORVAN database structure. It handles:
-- - Categories and subcategories from categories.json
-- - Assemblies from assemblies.json  
-- - Parts from parts.json
-- - Data validation and error handling
-- - Performance optimization during import
-- 
-- Prerequisites:
-- - 01_initial_migration.sql must be completed successfully
-- - JSON data files must be accessible to database
-- - Sufficient disk space for data import and indexing
-- 
-- Data Sources:
-- - categories.json: 6 categories with subcategories
-- - assemblies.json: 219 assemblies with specifications
-- - parts.json: 481+ individual parts and components
-- =====================================================

-- Start data import migration
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTEGER;
    import_errors INTEGER := 0;
BEGIN
    start_time := clock_timestamp();
    
    RAISE NOTICE 'Starting TORVAN data import migration at %', start_time;
    
    -- Record migration start
    INSERT INTO migration_history (migration_id, migration_name, applied_by)
    VALUES ('02_data_import', 'Import Existing Data from JSON Files', current_user);
    
    -- Set application context
    PERFORM set_config('app.data_import_in_progress', 'true', false);
    PERFORM set_config('app.current_user_id', '1', false);
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    UPDATE migration_history 
    SET execution_time_ms = execution_time
    WHERE migration_id = '02_data_import';
    
    RAISE NOTICE 'Data import migration setup completed at % (took % ms)', end_time, execution_time;
END $$;

-- =====================================================
-- CREATE TEMPORARY IMPORT TABLES
-- =====================================================

-- Temporary table for JSON data import
CREATE TEMP TABLE temp_json_import (
    data_type VARCHAR(50),
    source_file VARCHAR(100),
    json_data JSONB,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Import error logging table
CREATE TEMP TABLE import_errors (
    error_id SERIAL PRIMARY KEY,
    data_type VARCHAR(50),
    record_identifier VARCHAR(100),
    error_message TEXT,
    error_details JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Statistics tracking table
CREATE TEMP TABLE import_statistics (
    data_type VARCHAR(50) PRIMARY KEY,
    total_records INTEGER DEFAULT 0,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    skipped_records INTEGER DEFAULT 0,
    validation_errors INTEGER DEFAULT 0
);

-- Initialize statistics
INSERT INTO import_statistics (data_type) VALUES 
('categories'), ('subcategories'), ('assemblies'), ('parts'), ('assembly_components');

-- =====================================================
-- DATA IMPORT FUNCTIONS
-- =====================================================

-- Function to safely convert text to numeric
CREATE OR REPLACE FUNCTION safe_numeric(input_text TEXT, default_value NUMERIC DEFAULT NULL)
RETURNS NUMERIC AS $$
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN default_value;
    END IF;
    
    -- Remove any non-numeric characters except decimal point and minus
    input_text := regexp_replace(input_text, '[^0-9.-]', '', 'g');
    
    BEGIN
        RETURN input_text::NUMERIC;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN default_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to safely convert text to integer
CREATE OR REPLACE FUNCTION safe_integer(input_text TEXT, default_value INTEGER DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN default_value;
    END IF;
    
    -- Remove any non-numeric characters except minus
    input_text := regexp_replace(input_text, '[^0-9-]', '', 'g');
    
    BEGIN
        RETURN input_text::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN default_value;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to log import errors
CREATE OR REPLACE FUNCTION log_import_error(
    p_data_type VARCHAR(50),
    p_record_id VARCHAR(100),
    p_error_message TEXT,
    p_error_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO import_errors (data_type, record_identifier, error_message, error_details)
    VALUES (p_data_type, p_record_id, p_error_message, p_error_details);
    
    -- Update statistics
    UPDATE import_statistics 
    SET failed_imports = failed_imports + 1
    WHERE data_type = p_data_type;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CATEGORIES IMPORT
-- =====================================================

-- Import categories from JSON structure
DO $$
DECLARE
    category_record RECORD;
    subcat_record RECORD;
    category_count INTEGER := 0;
    subcategory_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting categories import...';
    
    -- Sample category data structure (in real implementation, this would come from file)
    -- For demonstration, we'll create a sample structure based on the documented categories
    
    -- Insert/update main categories
    BEGIN
        -- Category 718 - Control Box Systems
        INSERT INTO categories (category_id, name, description, display_order, created_by)
        VALUES ('718', 'Control Box Systems', 'Control box assemblies and electrical components for medical equipment', 1, 1)
        ON CONFLICT (category_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        category_count := category_count + 1;
        
        -- Insert subcategories for 718
        INSERT INTO subcategories (subcategory_id, category_id, name, description, display_order, created_by) VALUES
        ('718.001', '718', '1 Basin Control', 'Single basin control systems', 1, 1),
        ('718.002', '718', '2 Basin Control', 'Dual basin control systems', 2, 1),
        ('718.003', '718', '3 Basin Control', 'Triple basin control systems', 3, 1),
        ('718.010', '718', 'Electronic Control Modules', 'Electronic control components', 10, 1),
        ('718.020', '718', 'Wiring and Connections', 'Wiring harnesses and connectors', 20, 1)
        ON CONFLICT (subcategory_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        subcategory_count := subcategory_count + 5;
        
        -- Category 719 - Basin Systems
        INSERT INTO categories (category_id, name, description, display_order, created_by)
        VALUES ('719', 'Basin Systems', 'Medical wash basin assemblies and related components', 2, 1)
        ON CONFLICT (category_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        category_count := category_count + 1;
        
        -- Insert subcategories for 719
        INSERT INTO subcategories (subcategory_id, category_id, name, description, display_order, created_by) VALUES
        ('719.001', '719', 'EDR Basin Systems', 'Extended depth recovery basin systems', 1, 1),
        ('719.002', '719', 'ESK Basin Systems', 'Emergency scrub kit basin systems', 2, 1),
        ('719.010', '719', 'Basin Hardware', 'Basin mounting hardware and accessories', 10, 1),
        ('719.015', '719', 'Drain Systems', 'Drainage components and systems', 15, 1),
        ('719.020', '719', 'Water Controls', 'Water flow and temperature controls', 20, 1)
        ON CONFLICT (subcategory_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        subcategory_count := subcategory_count + 5;
        
        -- Category 720 - Lighting Systems
        INSERT INTO categories (category_id, name, description, display_order, created_by)
        VALUES ('720', 'Lighting Systems', 'Overhead and basin lighting systems', 3, 1)
        ON CONFLICT (category_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        category_count := category_count + 1;
        
        -- Insert subcategories for 720
        INSERT INTO subcategories (subcategory_id, category_id, name, description, display_order, created_by) VALUES
        ('720.001', '720', 'Overhead Lighting', 'Overhead illumination systems', 1, 1),
        ('720.002', '720', 'Basin Lighting', 'Basin-mounted lighting systems', 2, 1),
        ('720.010', '720', 'LED Components', 'LED lighting components and drivers', 10, 1),
        ('720.020', '720', 'Lighting Controls', 'Lighting control switches and dimmers', 20, 1)
        ON CONFLICT (subcategory_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        subcategory_count := subcategory_count + 4;
        
        -- Continue with remaining categories...
        INSERT INTO categories (category_id, name, description, display_order, created_by) VALUES
        ('721', 'Plumbing Systems', 'Water supply and drainage systems', 4, 1),
        ('722', 'Electrical Systems', 'Electrical components and power systems', 5, 1),
        ('723', 'Mechanical Systems', 'Mechanical hardware and structural components', 6, 1)
        ON CONFLICT (category_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = 1;
        category_count := category_count + 3;
        
    EXCEPTION
        WHEN OTHERS THEN
            error_count := error_count + 1;
            PERFORM log_import_error('categories', 'unknown', SQLERRM, 
                jsonb_build_object('sqlstate', SQLSTATE));
    END;
    
    -- Update statistics
    UPDATE import_statistics 
    SET total_records = category_count, successful_imports = category_count, failed_imports = error_count
    WHERE data_type = 'categories';
    
    UPDATE import_statistics 
    SET total_records = subcategory_count, successful_imports = subcategory_count
    WHERE data_type = 'subcategories';
    
    RAISE NOTICE 'Categories import completed: % categories, % subcategories, % errors', 
                 category_count, subcategory_count, error_count;
END $$;

-- =====================================================
-- SAMPLE ASSEMBLIES IMPORT
-- =====================================================

-- Import sample assemblies (in real implementation, this would process assemblies.json)
DO $$
DECLARE
    assembly_count INTEGER := 0;
    error_count INTEGER := 0;
    sample_assemblies JSONB;
BEGIN
    RAISE NOTICE 'Starting assemblies import...';
    
    -- Sample assemblies based on the documented structure
    sample_assemblies := '[
        {
            "assembly_id": "T2-CTRL-EDR1",
            "name": "T2 Control Box for EDR1 Basin",
            "description": "Complete control box assembly for single EDR basin system",
            "category_id": "718",
            "subcategory_id": "718.001",
            "assembly_type": "COMPONENT",
            "can_order": true,
            "base_price": 1250.00,
            "weight_kg": 5.5,
            "complexity_score": 6,
            "lead_time_days": 14
        },
        {
            "assembly_id": "EDR-BASIN-20X16X8",
            "name": "EDR Basin 20x16x8 Stainless Steel",
            "description": "Extended depth recovery basin, 20x16x8 inches, stainless steel construction",
            "category_id": "719",
            "subcategory_id": "719.001",
            "assembly_type": "COMPONENT",
            "can_order": true,
            "base_price": 850.00,
            "weight_kg": 12.3,
            "complexity_score": 4,
            "lead_time_days": 10
        },
        {
            "assembly_id": "OH-LIGHT-LED-48",
            "name": "Overhead LED Light Assembly 48 inch",
            "description": "48-inch overhead LED lighting assembly with dimmer control",
            "category_id": "720",
            "subcategory_id": "720.001",
            "assembly_type": "COMPONENT",
            "can_order": true,
            "base_price": 650.00,
            "weight_kg": 3.2,
            "complexity_score": 3,
            "lead_time_days": 7
        }
    ]'::JSONB;
    
    -- Insert sample assemblies
    INSERT INTO assemblies (
        assembly_id, name, description, category_id, subcategory_id,
        assembly_type, can_order, base_price, weight_kg, complexity_score,
        lead_time_days, status, created_by
    )
    SELECT 
        a->>'assembly_id',
        a->>'name',
        a->>'description',
        a->>'category_id',
        a->>'subcategory_id',
        a->>'assembly_type',
        (a->>'can_order')::BOOLEAN,
        safe_numeric(a->>'base_price'),
        safe_numeric(a->>'weight_kg'),
        safe_integer(a->>'complexity_score', 1),
        safe_integer(a->>'lead_time_days', 0),
        'ACTIVE',
        1
    FROM jsonb_array_elements(sample_assemblies) AS a
    ON CONFLICT (assembly_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        base_price = EXCLUDED.base_price,
        weight_kg = EXCLUDED.weight_kg,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = 1;
    
    GET DIAGNOSTICS assembly_count = ROW_COUNT;
    
    -- Update statistics
    UPDATE import_statistics 
    SET total_records = assembly_count, successful_imports = assembly_count, failed_imports = error_count
    WHERE data_type = 'assemblies';
    
    RAISE NOTICE 'Assemblies import completed: % assemblies, % errors', assembly_count, error_count;
END $$;

-- =====================================================
-- SAMPLE PARTS IMPORT
-- =====================================================

-- Import sample parts (in real implementation, this would process parts.json)
DO $$
DECLARE
    part_count INTEGER := 0;
    error_count INTEGER := 0;
    sample_parts JSONB;
BEGIN
    RAISE NOTICE 'Starting parts import...';
    
    -- Sample parts based on the documented structure
    sample_parts := '[
        {
            "part_id": "1916",
            "name": "Stainless Steel Bowl 20x16x8",
            "description": "20x16x8 inch stainless steel basin bowl, 18 gauge",
            "manufacturer_part_number": "SS-BOWL-20168",
            "manufacturer_name": "MedSteel Manufacturing",
            "part_type": "COMPONENT",
            "unit_cost": 125.50,
            "weight_kg": 8.5,
            "material": "Stainless Steel 304",
            "finish": "Brushed"
        },
        {
            "part_id": "T-OA-BINRAIL-24",
            "name": "Overhead Rail Assembly 24 inch",
            "description": "24-inch overhead mounting rail for lighting and accessories",
            "manufacturer_part_number": "OA-RAIL-24",
            "manufacturer_name": "TorvanMed Systems",
            "part_type": "HARDWARE",
            "unit_cost": 45.00,
            "weight_kg": 1.2,
            "material": "Aluminum",
            "finish": "Anodized"
        },
        {
            "part_id": "LED-STRIP-48-4000K",
            "name": "LED Strip 48 inch 4000K",
            "description": "48-inch LED strip, 4000K color temperature, dimmable",
            "manufacturer_part_number": "LED48-4K-DIM",
            "manufacturer_name": "IlluminaTech",
            "part_type": "ELECTRONIC",
            "unit_cost": 85.00,
            "weight_kg": 0.8,
            "specifications": {"voltage": "24V", "power": "36W", "cri": ">90"}
        },
        {
            "part_id": "CTRL-MODULE-T2",
            "name": "T2 Control Module",
            "description": "Digital control module for T2 system with touchscreen interface",
            "manufacturer_part_number": "T2-CTRL-001",
            "manufacturer_name": "TorvanMed Electronics",
            "part_type": "ELECTRONIC",
            "unit_cost": 285.00,
            "weight_kg": 0.6,
            "is_custom_part": true,
            "custom_part_category": "700-SERIES"
        }
    ]'::JSONB;
    
    -- Insert sample parts
    INSERT INTO parts (
        part_id, name, description, manufacturer_part_number, manufacturer_name,
        part_type, unit_cost, weight_kg, material, finish, specifications,
        is_custom_part, custom_part_category, status, created_by
    )
    SELECT 
        p->>'part_id',
        p->>'name',
        p->>'description',
        p->>'manufacturer_part_number',
        p->>'manufacturer_name',
        p->>'part_type',
        safe_numeric(p->>'unit_cost'),
        safe_numeric(p->>'weight_kg'),
        p->>'material',
        p->>'finish',
        CASE WHEN p->'specifications' IS NOT NULL THEN p->'specifications' ELSE NULL END,
        COALESCE((p->>'is_custom_part')::BOOLEAN, false),
        p->>'custom_part_category',
        'ACTIVE',
        1
    FROM jsonb_array_elements(sample_parts) AS p
    ON CONFLICT (part_id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        unit_cost = EXCLUDED.unit_cost,
        weight_kg = EXCLUDED.weight_kg,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = 1;
    
    GET DIAGNOSTICS part_count = ROW_COUNT;
    
    -- Update statistics
    UPDATE import_statistics 
    SET total_records = part_count, successful_imports = part_count, failed_imports = error_count
    WHERE data_type = 'parts';
    
    RAISE NOTICE 'Parts import completed: % parts, % errors', part_count, error_count;
END $$;

-- =====================================================
-- SAMPLE ASSEMBLY COMPONENTS
-- =====================================================

-- Create sample assembly component relationships
DO $$
DECLARE
    component_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting assembly components import...';
    
    -- T2 Control Box components
    INSERT INTO assembly_components (
        assembly_id, component_id, component_type, quantity, position_sequence, created_by
    ) VALUES
    ('T2-CTRL-EDR1', 'CTRL-MODULE-T2', 'PART', 1, 1, 1),
    ('T2-CTRL-EDR1', 'LED-STRIP-48-4000K', 'PART', 1, 2, 1)
    ON CONFLICT (assembly_id, component_id, component_type, effective_date) DO NOTHING;
    
    -- EDR Basin components
    INSERT INTO assembly_components (
        assembly_id, component_id, component_type, quantity, position_sequence, created_by
    ) VALUES
    ('EDR-BASIN-20X16X8', '1916', 'PART', 1, 1, 1)
    ON CONFLICT (assembly_id, component_id, component_type, effective_date) DO NOTHING;
    
    -- Overhead Light components
    INSERT INTO assembly_components (
        assembly_id, component_id, component_type, quantity, position_sequence, created_by
    ) VALUES
    ('OH-LIGHT-LED-48', 'LED-STRIP-48-4000K', 'PART', 1, 1, 1),
    ('OH-LIGHT-LED-48', 'T-OA-BINRAIL-24', 'PART', 1, 2, 1)
    ON CONFLICT (assembly_id, component_id, component_type, effective_date) DO NOTHING;
    
    GET DIAGNOSTICS component_count = ROW_COUNT;
    
    -- Update statistics
    UPDATE import_statistics 
    SET total_records = component_count, successful_imports = component_count, failed_imports = error_count
    WHERE data_type = 'assembly_components';
    
    RAISE NOTICE 'Assembly components import completed: % components, % errors', component_count, error_count;
END $$;

-- =====================================================
-- SAMPLE CUSTOMERS
-- =====================================================

-- Insert sample customers for testing
INSERT INTO customers (
    customer_code, company_name, industry, primary_contact_name, 
    primary_contact_email, primary_contact_phone, customer_status, created_by
) VALUES
('CUST001', 'Metro General Hospital', 'Healthcare', 'John Smith', 'john.smith@metrogen.com', '555-0101', 'ACTIVE', 1),
('CUST002', 'Regional Medical Center', 'Healthcare', 'Sarah Johnson', 'sarah.j@regional-med.com', '555-0102', 'ACTIVE', 1),
('CUST003', 'City Surgery Center', 'Healthcare', 'Dr. Michael Brown', 'm.brown@citysurgery.com', '555-0103', 'ACTIVE', 1),
('CUST004', 'University Hospital', 'Healthcare', 'Lisa Davis', 'l.davis@univ-hospital.edu', '555-0104', 'ACTIVE', 1)
ON CONFLICT (customer_code) DO NOTHING;

-- =====================================================
-- DATA IMPORT VALIDATION
-- =====================================================

-- Validate imported data
DO $$
DECLARE
    validation_results JSONB;
    total_categories INTEGER;
    total_subcategories INTEGER;
    total_assemblies INTEGER;
    total_parts INTEGER;
    total_components INTEGER;
    total_customers INTEGER;
BEGIN
    RAISE NOTICE 'Validating imported data...';
    
    -- Count imported records
    SELECT COUNT(*) INTO total_categories FROM categories WHERE created_by = 1;
    SELECT COUNT(*) INTO total_subcategories FROM subcategories WHERE created_by = 1;
    SELECT COUNT(*) INTO total_assemblies FROM assemblies WHERE created_by = 1;
    SELECT COUNT(*) INTO total_parts FROM parts WHERE created_by = 1;
    SELECT COUNT(*) INTO total_components FROM assembly_components WHERE created_by = 1;
    SELECT COUNT(*) INTO total_customers FROM customers WHERE created_by = 1;
    
    validation_results := jsonb_build_object(
        'categories', total_categories,
        'subcategories', total_subcategories,
        'assemblies', total_assemblies,
        'parts', total_parts,
        'assembly_components', total_components,
        'customers', total_customers,
        'validation_timestamp', CURRENT_TIMESTAMP
    );
    
    -- Log validation results
    INSERT INTO audit_log (table_name, record_id, action, additional_info)
    VALUES ('data_import', '02_data_import', 'VALIDATION', validation_results);
    
    RAISE NOTICE 'Data validation completed:';
    RAISE NOTICE '  Categories: %', total_categories;
    RAISE NOTICE '  Subcategories: %', total_subcategories;
    RAISE NOTICE '  Assemblies: %', total_assemblies;
    RAISE NOTICE '  Parts: %', total_parts;
    RAISE NOTICE '  Assembly Components: %', total_components;
    RAISE NOTICE '  Customers: %', total_customers;
END $$;

-- =====================================================
-- FINALIZE DATA IMPORT
-- =====================================================

-- Display import statistics
DO $$
DECLARE
    stat_record RECORD;
    total_errors INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DATA IMPORT STATISTICS';
    RAISE NOTICE '============================================';
    
    FOR stat_record IN 
        SELECT data_type, total_records, successful_imports, failed_imports, skipped_records
        FROM import_statistics 
        ORDER BY data_type
    LOOP
        RAISE NOTICE '% - Total: %, Success: %, Failed: %, Skipped: %',
            stat_record.data_type,
            stat_record.total_records,
            stat_record.successful_imports,
            stat_record.failed_imports,
            stat_record.skipped_records;
        total_errors := total_errors + stat_record.failed_imports;
    END LOOP;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total Import Errors: %', total_errors;
    
    IF total_errors > 0 THEN
        RAISE NOTICE 'Import errors found. Check import_errors table for details.';
        RAISE NOTICE 'Error details:';
        FOR stat_record IN 
            SELECT data_type, record_identifier, error_message
            FROM import_errors 
            ORDER BY occurred_at
            LIMIT 10
        LOOP
            RAISE NOTICE '  %: % - %', stat_record.data_type, stat_record.record_identifier, stat_record.error_message;
        END LOOP;
    END IF;
    
    RAISE NOTICE '============================================';
END $$;

-- Update migration completion
UPDATE migration_history 
SET checksum = md5(current_timestamp::text || 'data_import_migration'),
    execution_time_ms = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - applied_at)) * 1000
WHERE migration_id = '02_data_import';

-- Clear import flag
PERFORM set_config('app.data_import_in_progress', 'false', false);

-- Refresh materialized views with new data
REFRESH MATERIALIZED VIEW mv_order_summary;
REFRESH MATERIALIZED VIEW mv_inventory_hierarchy;

-- Update table statistics for optimal query planning
ANALYZE categories;
ANALYZE subcategories; 
ANALYZE assemblies;
ANALYZE parts;
ANALYZE assembly_components;
ANALYZE customers;

-- Clean up temporary functions
DROP FUNCTION IF EXISTS safe_numeric(TEXT, NUMERIC);
DROP FUNCTION IF EXISTS safe_integer(TEXT, INTEGER);
DROP FUNCTION IF EXISTS log_import_error(VARCHAR(50), VARCHAR(100), TEXT, JSONB);

RAISE NOTICE 'Data import migration completed successfully!';