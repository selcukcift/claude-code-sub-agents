-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- CORE DATABASE FUNCTIONS AND STORED PROCEDURES
-- =====================================================
-- 
-- This file contains essential database functions for:
-- - BOM generation and calculation
-- - Order workflow management
-- - Configuration validation
-- - Performance optimization
-- - Business logic implementation
-- 
-- Key Functions:
-- - generate_bom_from_configuration()
-- - calculate_order_totals()
-- - validate_configuration()
-- - update_order_phase()
-- - calculate_production_metrics()
-- 
-- Performance Targets:
-- - BOM generation: <5s for complex configurations
-- - Order calculations: <1s
-- - Configuration validation: <500ms
-- =====================================================

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to generate sequential order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR(20) AS
$$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
    order_number VARCHAR(20);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Get next sequence number for the year
    SELECT COALESCE(MAX(
        CASE 
            WHEN order_number ~ ('^ORD-' || year_part || '-[0-9]+$') 
            THEN SUBSTRING(order_number FROM LENGTH('ORD-' || year_part || '-') + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1 INTO sequence_num
    FROM orders
    WHERE order_number LIKE 'ORD-' || year_part || '-%';
    
    order_number := 'ORD-' || year_part || '-' || LPAD(sequence_num::VARCHAR, 4, '0');
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate BOM numbers
CREATE OR REPLACE FUNCTION generate_bom_number()
RETURNS VARCHAR(50) AS
$$
DECLARE
    year_part VARCHAR(4);
    month_part VARCHAR(2);
    sequence_num INTEGER;
    bom_number VARCHAR(50);
BEGIN
    year_part := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    month_part := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::VARCHAR, 2, '0');
    
    -- Get next sequence number for the year-month
    SELECT COALESCE(MAX(
        CASE 
            WHEN bom_number ~ ('^BOM-' || year_part || month_part || '-[0-9]+$') 
            THEN SUBSTRING(bom_number FROM LENGTH('BOM-' || year_part || month_part || '-') + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1 INTO sequence_num
    FROM boms
    WHERE bom_number LIKE 'BOM-' || year_part || month_part || '-%';
    
    bom_number := 'BOM-' || year_part || month_part || '-' || LPAD(sequence_num::VARCHAR, 4, '0');
    
    RETURN bom_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BOM GENERATION FUNCTIONS
-- =====================================================

-- Main BOM generation function
CREATE OR REPLACE FUNCTION generate_bom_from_configuration(
    configuration_id_param BIGINT,
    generated_by_param BIGINT DEFAULT NULL
)
RETURNS JSONB AS
$$
DECLARE
    config_record RECORD;
    bom_record RECORD;
    new_bom_id BIGINT;
    component_record RECORD;
    line_number INTEGER := 0;
    total_cost DECIMAL(12,2) := 0;
    total_weight DECIMAL(10,3) := 0;
    total_parts INTEGER := 0;
    custom_parts_count INTEGER := 0;
    generation_start TIMESTAMP;
    generation_end TIMESTAMP;
    result JSONB;
BEGIN
    generation_start := clock_timestamp();
    
    -- Get configuration details
    SELECT * INTO config_record 
    FROM configurations 
    WHERE configuration_id = configuration_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Configuration not found',
            'configuration_id', configuration_id_param
        );
    END IF;
    
    -- Validate configuration
    IF NOT config_record.is_valid THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Configuration is not valid',
            'configuration_id', configuration_id_param,
            'validation_errors', config_record.validation_errors
        );
    END IF;
    
    -- Create new BOM
    INSERT INTO boms (
        bom_number,
        configuration_id,
        assembly_id,
        bom_type,
        status,
        generated_by,
        generation_method
    ) VALUES (
        generate_bom_number(),
        configuration_id_param,
        config_record.assembly_id,
        CASE WHEN config_record.requires_custom_parts THEN 'CUSTOM' ELSE 'STANDARD' END,
        'DRAFT',
        COALESCE(generated_by_param, current_user_id()),
        'AUTOMATIC'
    ) RETURNING bom_id INTO new_bom_id;
    
    -- Generate BOM line items based on assembly components
    FOR component_record IN
        SELECT 
            ac.component_id,
            ac.component_type,
            ac.quantity,
            ac.unit_of_measure,
            ac.waste_factor,
            ac.assembly_sequence,
            ac.installation_notes,
            ac.required_tools,
            ac.is_optional,
            CASE 
                WHEN ac.component_type = 'PART' THEN p.unit_cost
                WHEN ac.component_type = 'ASSEMBLY' THEN a.base_price
                ELSE 0
            END as unit_cost,
            CASE 
                WHEN ac.component_type = 'PART' THEN p.weight_kg
                WHEN ac.component_type = 'ASSEMBLY' THEN a.weight_kg
                ELSE 0
            END as component_weight,
            CASE 
                WHEN ac.component_type = 'PART' THEN p.is_custom_part
                ELSE false
            END as is_custom_part
        FROM assembly_components ac
        LEFT JOIN parts p ON ac.component_type = 'PART' AND ac.component_id = p.part_id
        LEFT JOIN assemblies a ON ac.component_type = 'ASSEMBLY' AND ac.component_id = a.assembly_id
        WHERE ac.assembly_id = config_record.assembly_id
          AND ac.is_active = true
          AND (ac.effective_date IS NULL OR ac.effective_date <= CURRENT_DATE)
          AND (ac.end_date IS NULL OR ac.end_date > CURRENT_DATE)
        ORDER BY ac.assembly_sequence, ac.component_id
    LOOP
        line_number := line_number + 1;
        
        -- Calculate adjusted quantity (including waste factor)
        DECLARE
            adjusted_qty DECIMAL(10,3);
            line_cost DECIMAL(12,2);
        BEGIN
            adjusted_qty := component_record.quantity * (1 + COALESCE(component_record.waste_factor, 0));
            line_cost := adjusted_qty * COALESCE(component_record.unit_cost, 0);
            
            -- Insert BOM line item
            INSERT INTO bom_line_items (
                bom_id,
                line_number,
                component_id,
                component_type,
                quantity,
                unit_of_measure,
                waste_factor,
                adjusted_quantity,
                unit_cost,
                extended_cost,
                assembly_sequence,
                installation_notes,
                required_tools,
                is_custom_part
            ) VALUES (
                new_bom_id,
                line_number,
                component_record.component_id,
                component_record.component_type,
                component_record.quantity,
                component_record.unit_of_measure,
                component_record.waste_factor,
                adjusted_qty,
                component_record.unit_cost,
                line_cost,
                component_record.assembly_sequence,
                component_record.installation_notes,
                component_record.required_tools,
                component_record.is_custom_part
            );
            
            -- Update totals
            total_cost := total_cost + line_cost;
            total_weight := total_weight + (adjusted_qty * COALESCE(component_record.component_weight, 0));
            total_parts := total_parts + 1;
            
            IF component_record.is_custom_part THEN
                custom_parts_count := custom_parts_count + 1;
            END IF;
        END;
    END LOOP;
    
    generation_end := clock_timestamp();
    
    -- Update BOM totals
    UPDATE boms SET
        total_parts_count = total_parts,
        unique_parts_count = line_number,
        custom_parts_count = custom_parts_count,
        total_estimated_cost = total_cost,
        total_estimated_weight_kg = total_weight,
        generation_duration_ms = EXTRACT(EPOCH FROM (generation_end - generation_start)) * 1000,
        updated_at = CURRENT_TIMESTAMP
    WHERE bom_id = new_bom_id;
    
    -- Build result
    result := jsonb_build_object(
        'success', true,
        'bom_id', new_bom_id,
        'configuration_id', configuration_id_param,
        'total_parts', total_parts,
        'custom_parts', custom_parts_count,
        'total_cost', total_cost,
        'total_weight_kg', total_weight,
        'generation_time_ms', EXTRACT(EPOCH FROM (generation_end - generation_start)) * 1000
    );
    
    -- Log BOM generation
    INSERT INTO audit_log (table_name, record_id, action, user_id, additional_info)
    VALUES ('boms', new_bom_id::text, 'GENERATE', 
            COALESCE(generated_by_param, current_user_id()), result);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate BOM totals
CREATE OR REPLACE FUNCTION recalculate_bom_totals(bom_id_param BIGINT)
RETURNS JSONB AS
$$
DECLARE
    total_cost DECIMAL(12,2) := 0;
    total_weight DECIMAL(10,3) := 0;
    total_parts INTEGER := 0;
    custom_parts INTEGER := 0;
    result JSONB;
BEGIN
    -- Calculate totals from line items
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN is_custom_part THEN 1 END),
        SUM(extended_cost),
        SUM(adjusted_quantity * 
            CASE 
                WHEN component_type = 'PART' THEN 
                    COALESCE((SELECT weight_kg FROM parts WHERE part_id = component_id), 0)
                ELSE 0
            END)
    INTO total_parts, custom_parts, total_cost, total_weight
    FROM bom_line_items
    WHERE bom_id = bom_id_param AND is_active = true;
    
    -- Update BOM
    UPDATE boms SET
        total_parts_count = total_parts,
        custom_parts_count = custom_parts,
        total_estimated_cost = COALESCE(total_cost, 0),
        total_estimated_weight_kg = COALESCE(total_weight, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE bom_id = bom_id_param;
    
    result := jsonb_build_object(
        'bom_id', bom_id_param,
        'total_parts', total_parts,
        'custom_parts', custom_parts,
        'total_cost', COALESCE(total_cost, 0),
        'total_weight_kg', COALESCE(total_weight, 0)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURATION VALIDATION FUNCTIONS
-- =====================================================

-- Main configuration validation function
CREATE OR REPLACE FUNCTION validate_configuration(configuration_id_param BIGINT)
RETURNS JSONB AS
$$
DECLARE
    config_record RECORD;
    rule_record RECORD;
    validation_errors TEXT[] := ARRAY[]::TEXT[];
    validation_warnings TEXT[] := ARRAY[]::TEXT[];
    validation_results JSONB;
    is_valid BOOLEAN := true;
BEGIN
    -- Get configuration
    SELECT * INTO config_record 
    FROM configurations 
    WHERE configuration_id = configuration_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Configuration not found'
        );
    END IF;
    
    -- Run validation rules
    FOR rule_record IN
        SELECT cr.rule_name, cr.rule_type, cr.conditions, cr.actions, cr.is_blocking, cr.error_message
        FROM configuration_rules cr
        WHERE cr.is_active = true
          AND (cr.applies_to_assemblies IS NULL OR config_record.assembly_id = ANY(cr.applies_to_assemblies))
        ORDER BY cr.priority, cr.execution_order
    LOOP
        -- Apply validation rule (simplified logic)
        DECLARE
            rule_passed BOOLEAN := true;
        BEGIN
            -- Basic validation examples
            CASE rule_record.rule_type
                WHEN 'VALIDATION' THEN
                    -- Basin count validation
                    IF rule_record.rule_name LIKE '%basin%count%' THEN
                        IF config_record.basin_count < 1 OR config_record.basin_count > 3 THEN
                            rule_passed := false;
                        END IF;
                    END IF;
                    
                    -- Dimension validation
                    IF rule_record.rule_name LIKE '%dimension%' THEN
                        IF config_record.sink_length_inches IS NOT NULL AND 
                           (config_record.sink_length_inches < 12 OR config_record.sink_length_inches > 120) THEN
                            rule_passed := false;
                        END IF;
                    END IF;
                    
                WHEN 'COMPATIBILITY' THEN
                    -- Lifter compatibility check
                    IF rule_record.rule_name LIKE '%lifter%compat%' THEN
                        IF config_record.has_lifter AND config_record.basin_count > 2 THEN
                            rule_passed := false;
                        END IF;
                    END IF;
                    
                ELSE
                    -- Default to passed for other rule types
                    rule_passed := true;
            END CASE;
            
            -- Handle rule failure
            IF NOT rule_passed THEN
                IF rule_record.is_blocking THEN
                    validation_errors := array_append(validation_errors, 
                        COALESCE(rule_record.error_message, rule_record.rule_name || ' validation failed'));
                    is_valid := false;
                ELSE
                    validation_warnings := array_append(validation_warnings, 
                        COALESCE(rule_record.error_message, rule_record.rule_name || ' validation warning'));
                END IF;
            END IF;
        END;
    END LOOP;
    
    -- Build validation results
    validation_results := jsonb_build_object(
        'configuration_id', configuration_id_param,
        'is_valid', is_valid,
        'errors', validation_errors,
        'warnings', validation_warnings,
        'validated_at', CURRENT_TIMESTAMP
    );
    
    -- Update configuration with validation results
    UPDATE configurations SET
        is_valid = is_valid,
        validation_errors = validation_errors,
        validation_warnings = validation_warnings,
        validation_results = validation_results,
        updated_at = CURRENT_TIMESTAMP
    WHERE configuration_id = configuration_id_param;
    
    RETURN validation_results;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ORDER MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to calculate order totals
CREATE OR REPLACE FUNCTION calculate_order_totals(order_id_param VARCHAR(20))
RETURNS JSONB AS
$$
DECLARE
    order_record RECORD;
    subtotal DECIMAL(12,2) := 0;
    tax_amount DECIMAL(12,2) := 0;
    shipping_amount DECIMAL(12,2) := 0;
    discount_amount DECIMAL(12,2) := 0;
    total_amount DECIMAL(12,2) := 0;
    tax_rate DECIMAL(5,4) := 0.0875; -- Default 8.75% tax rate
    result JSONB;
BEGIN
    -- Get order details
    SELECT o.*, c.tax_exempt 
    INTO order_record
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE o.order_id = order_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;
    
    -- Calculate subtotal from order items
    SELECT 
        COALESCE(SUM(oi.line_total), 0),
        COALESCE(SUM(oi.line_total * oi.discount_percentage / 100), 0)
    INTO subtotal, discount_amount
    FROM order_items oi
    WHERE oi.order_id = order_id_param;
    
    -- Calculate tax (if customer is not tax exempt)
    IF NOT order_record.tax_exempt THEN
        tax_amount := (subtotal - discount_amount) * tax_rate;
    END IF;
    
    -- Calculate shipping (simplified logic)
    shipping_amount := CASE 
        WHEN subtotal >= 5000 THEN 0 -- Free shipping over $5000
        WHEN subtotal >= 1000 THEN 150 -- $150 shipping for orders $1000-$4999
        ELSE 250 -- $250 shipping for orders under $1000
    END;
    
    -- Calculate total
    total_amount := subtotal - discount_amount + tax_amount + shipping_amount;
    
    -- Update order
    UPDATE orders SET
        subtotal = subtotal,
        tax_amount = tax_amount,
        shipping_amount = shipping_amount,
        discount_amount = discount_amount,
        total_amount = total_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE order_id = order_id_param;
    
    result := jsonb_build_object(
        'order_id', order_id_param,
        'subtotal', subtotal,
        'discount_amount', discount_amount,
        'tax_amount', tax_amount,
        'shipping_amount', shipping_amount,
        'total_amount', total_amount,
        'calculated_at', CURRENT_TIMESTAMP
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update order phase with validation
CREATE OR REPLACE FUNCTION update_order_phase(
    order_id_param VARCHAR(20),
    new_phase VARCHAR(20),
    changed_by_param BIGINT,
    change_reason_param TEXT DEFAULT NULL
)
RETURNS JSONB AS
$$
DECLARE
    order_record RECORD;
    workflow_rule RECORD;
    phase_allowed BOOLEAN := false;
    phase_duration DECIMAL(8,2);
    result JSONB;
BEGIN
    -- Get current order details
    SELECT * INTO order_record FROM orders WHERE order_id = order_id_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;
    
    -- Check if phase transition is allowed
    SELECT * INTO workflow_rule
    FROM order_workflow_rules
    WHERE from_phase = order_record.current_phase
      AND to_phase = new_phase
      AND is_active = true
    ORDER BY priority
    LIMIT 1;
    
    IF FOUND THEN
        phase_allowed := true;
        
        -- Additional validation could be added here based on workflow_rule.conditions
        
    ELSE
        -- Check if it's a valid direct transition (fallback)
        phase_allowed := CASE
            WHEN order_record.current_phase = 'DRAFT' AND new_phase IN ('CONFIGURATION', 'CANCELLED') THEN true
            WHEN order_record.current_phase = 'CONFIGURATION' AND new_phase IN ('APPROVAL', 'DRAFT') THEN true
            WHEN order_record.current_phase = 'APPROVAL' AND new_phase IN ('PRODUCTION', 'CONFIGURATION') THEN true
            WHEN order_record.current_phase = 'PRODUCTION' AND new_phase IN ('QUALITY_CONTROL', 'ON_HOLD') THEN true
            WHEN order_record.current_phase = 'QUALITY_CONTROL' AND new_phase IN ('PACKAGING', 'PRODUCTION') THEN true
            WHEN order_record.current_phase = 'PACKAGING' AND new_phase IN ('SHIPPING', 'QUALITY_CONTROL') THEN true
            WHEN order_record.current_phase = 'SHIPPING' AND new_phase IN ('DELIVERED') THEN true
            WHEN new_phase = 'CANCELLED' THEN true -- Can cancel from any phase
            WHEN new_phase = 'ON_HOLD' THEN true -- Can put on hold from any phase
            ELSE false
        END;
    END IF;
    
    IF NOT phase_allowed THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Phase transition not allowed',
            'from_phase', order_record.current_phase,
            'to_phase', new_phase
        );
    END IF;
    
    -- Calculate phase duration
    phase_duration := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - order_record.updated_at)) / 3600;
    
    -- Insert status history record
    INSERT INTO order_status_history (
        order_id,
        from_phase,
        to_phase,
        changed_by,
        change_reason,
        phase_duration_hours
    ) VALUES (
        order_id_param,
        order_record.current_phase,
        new_phase,
        changed_by_param,
        change_reason_param,
        phase_duration
    );
    
    -- Update order phase and timestamps
    UPDATE orders SET
        current_phase = new_phase,
        updated_at = CURRENT_TIMESTAMP,
        -- Update phase-specific timestamps
        configuration_started_at = CASE WHEN new_phase = 'CONFIGURATION' THEN CURRENT_TIMESTAMP ELSE configuration_started_at END,
        configuration_completed_at = CASE WHEN order_record.current_phase = 'CONFIGURATION' AND new_phase != 'CONFIGURATION' THEN CURRENT_TIMESTAMP ELSE configuration_completed_at END,
        production_started_at = CASE WHEN new_phase = 'PRODUCTION' THEN CURRENT_TIMESTAMP ELSE production_started_at END,
        production_completed_at = CASE WHEN order_record.current_phase = 'PRODUCTION' AND new_phase != 'PRODUCTION' THEN CURRENT_TIMESTAMP ELSE production_completed_at END,
        qc_started_at = CASE WHEN new_phase = 'QUALITY_CONTROL' THEN CURRENT_TIMESTAMP ELSE qc_started_at END,
        qc_completed_at = CASE WHEN order_record.current_phase = 'QUALITY_CONTROL' AND new_phase != 'QUALITY_CONTROL' THEN CURRENT_TIMESTAMP ELSE qc_completed_at END,
        actual_delivery_date = CASE WHEN new_phase = 'DELIVERED' THEN CURRENT_DATE ELSE actual_delivery_date END
    WHERE order_id = order_id_param;
    
    result := jsonb_build_object(
        'success', true,
        'order_id', order_id_param,
        'from_phase', order_record.current_phase,
        'to_phase', new_phase,
        'phase_duration_hours', phase_duration,
        'changed_by', changed_by_param,
        'changed_at', CURRENT_TIMESTAMP
    );
    
    -- Log the phase change
    INSERT INTO audit_log (table_name, record_id, action, user_id, additional_info)
    VALUES ('orders', order_id_param, 'PHASE_CHANGE', changed_by_param, result);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PRODUCTION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to calculate production metrics
CREATE OR REPLACE FUNCTION calculate_production_metrics(order_item_id_param BIGINT)
RETURNS JSONB AS
$$
DECLARE
    total_tasks INTEGER := 0;
    completed_tasks INTEGER := 0;
    in_progress_tasks INTEGER := 0;
    estimated_hours DECIMAL(8,2) := 0;
    actual_hours DECIMAL(8,2) := 0;
    completion_percentage DECIMAL(5,2) := 0;
    efficiency_percentage DECIMAL(5,2) := 100;
    result JSONB;
BEGIN
    -- Calculate task statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END),
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END),
        COALESCE(SUM(estimated_hours), 0),
        COALESCE(SUM(actual_hours), 0)
    INTO total_tasks, completed_tasks, in_progress_tasks, estimated_hours, actual_hours
    FROM production_tasks
    WHERE order_item_id = order_item_id_param;
    
    -- Calculate completion percentage
    IF total_tasks > 0 THEN
        completion_percentage := (completed_tasks * 100.0) / total_tasks;
    END IF;
    
    -- Calculate efficiency percentage
    IF estimated_hours > 0 AND actual_hours > 0 THEN
        efficiency_percentage := (estimated_hours / actual_hours) * 100;
    END IF;
    
    result := jsonb_build_object(
        'order_item_id', order_item_id_param,
        'total_tasks', total_tasks,
        'completed_tasks', completed_tasks,
        'in_progress_tasks', in_progress_tasks,
        'completion_percentage', completion_percentage,
        'estimated_hours', estimated_hours,
        'actual_hours', actual_hours,
        'efficiency_percentage', efficiency_percentage,
        'calculated_at', CURRENT_TIMESTAMP
    );
    
    -- Update order item production status
    UPDATE order_items SET
        production_status = CASE
            WHEN completion_percentage = 100 THEN 'COMPLETED'
            WHEN completion_percentage > 0 THEN 'IN_PROGRESS'
            ELSE 'PENDING'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE item_id = order_item_id_param;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =====================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS JSONB AS
$$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_ms INTEGER;
    result JSONB;
BEGIN
    start_time := clock_timestamp();
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_hierarchy;
    
    -- Update table statistics
    ANALYZE mv_order_summary;
    ANALYZE mv_inventory_hierarchy;
    
    end_time := clock_timestamp();
    duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    result := jsonb_build_object(
        'success', true,
        'views_refreshed', 2,
        'duration_ms', duration_ms,
        'refreshed_at', end_time
    );
    
    -- Log the refresh
    INSERT INTO audit_log (table_name, record_id, action, additional_info)
    VALUES ('materialized_views', 'refresh_all', 'REFRESH', result);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get system health status
CREATE OR REPLACE FUNCTION get_system_health_status()
RETURNS JSONB AS
$$
DECLARE
    active_orders INTEGER;
    overdue_orders INTEGER;
    pending_tasks INTEGER;
    failed_syncs INTEGER;  
    active_users INTEGER;
    db_size TEXT;
    result JSONB;
BEGIN
    -- Gather system metrics
    SELECT COUNT(*) INTO active_orders 
    FROM orders WHERE current_phase NOT IN ('DELIVERED', 'CANCELLED');
    
    SELECT COUNT(*) INTO overdue_orders 
    FROM orders WHERE promised_delivery_date < CURRENT_DATE 
      AND current_phase NOT IN ('DELIVERED', 'CANCELLED');
    
    SELECT COUNT(*) INTO pending_tasks 
    FROM production_tasks WHERE status IN ('PENDING', 'IN_PROGRESS');
    
    SELECT COUNT(*) INTO failed_syncs 
    FROM sync_log WHERE status = 'FAILED' 
      AND sync_started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    SELECT COUNT(*) INTO active_users 
    FROM user_sessions WHERE is_active = true 
      AND expires_at > CURRENT_TIMESTAMP;
    
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
    
    result := jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'metrics', jsonb_build_object(
            'active_orders', active_orders,
            'overdue_orders', overdue_orders,
            'pending_tasks', pending_tasks,
            'failed_syncs_24h', failed_syncs,
            'active_users', active_users,
            'database_size', db_size
        ),
        'health_status', CASE
            WHEN overdue_orders > 10 OR failed_syncs > 5 THEN 'CRITICAL'
            WHEN overdue_orders > 5 OR failed_syncs > 2 THEN 'WARNING'
            ELSE 'HEALTHY'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION generate_order_number IS 'Generates sequential order numbers in format ORD-YYYY-NNNN';
COMMENT ON FUNCTION generate_bom_number IS 'Generates sequential BOM numbers in format BOM-YYYYMM-NNNN';
COMMENT ON FUNCTION generate_bom_from_configuration IS 'Main BOM generation function with performance optimization';
COMMENT ON FUNCTION validate_configuration IS 'Validates product configuration against business rules';
COMMENT ON FUNCTION calculate_order_totals IS 'Calculates order subtotal, tax, shipping, and total amounts';
COMMENT ON FUNCTION update_order_phase IS 'Updates order phase with workflow validation and history tracking';
COMMENT ON FUNCTION calculate_production_metrics IS 'Calculates production progress and efficiency metrics';
COMMENT ON FUNCTION refresh_all_materialized_views IS 'Refreshes all materialized views for performance';
COMMENT ON FUNCTION get_system_health_status IS 'Returns overall system health and key metrics';

-- =====================================================
-- FUNCTION USAGE EXAMPLES
-- =====================================================

-- Example BOM generation:
-- SELECT generate_bom_from_configuration(1, 1);

-- Example order totals calculation:
-- SELECT calculate_order_totals('ORD-2025-0001');

-- Example order phase update:
-- SELECT update_order_phase('ORD-2025-0001', 'PRODUCTION', 1, 'Moving to production phase');

-- Example system health check:
-- SELECT get_system_health_status();