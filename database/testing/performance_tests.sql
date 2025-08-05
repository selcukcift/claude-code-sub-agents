-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- PERFORMANCE TESTING AND MONITORING SCRIPTS
-- =====================================================
-- 
-- This file contains comprehensive performance testing scripts:
-- - Load testing data generation
-- - Performance benchmark queries
-- - Stress testing procedures
-- - Performance monitoring and alerting
-- - Query optimization validation
-- 
-- Performance Targets:
-- - BOM generation: <5s for complex configurations
-- - Order searches: <2s for filtered results
-- - Database queries: 95% under 100ms
-- - Support 50 concurrent users
-- - Data import: 1000 parts in <30s
-- =====================================================

-- =====================================================
-- PERFORMANCE TEST DATA GENERATION
-- =====================================================

-- Function to generate test data for performance testing
CREATE OR REPLACE FUNCTION generate_performance_test_data(
    num_orders INTEGER DEFAULT 1000,
    num_customers INTEGER DEFAULT 100,
    num_assemblies INTEGER DEFAULT 50,
    num_parts INTEGER DEFAULT 500
)
RETURNS JSONB AS
$$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    generation_time INTEGER;
    result JSONB;
    i INTEGER;
    customer_ids BIGINT[];
    assembly_ids VARCHAR(50)[];
    part_ids VARCHAR(50)[];
BEGIN
    start_time := clock_timestamp();
    
    RAISE NOTICE 'Starting performance test data generation...';
    RAISE NOTICE 'Target: % orders, % customers, % assemblies, % parts', 
                 num_orders, num_customers, num_assemblies, num_parts;
    
    -- Generate test customers
    FOR i IN 1..num_customers LOOP
        INSERT INTO customers (
            customer_code, company_name, industry, primary_contact_name,
            primary_contact_email, primary_contact_phone, customer_status, created_by
        ) VALUES (
            'TESTCUST' || LPAD(i::text, 6, '0'),
            'Test Company ' || i,
            'Healthcare',
            'Test Contact ' || i,
            'test' || i || '@testcompany.com',
            '555-' || LPAD((1000 + i)::text, 4, '0'),
            'ACTIVE',
            1
        ) ON CONFLICT (customer_code) DO NOTHING;
    END LOOP;
    
    -- Get customer IDs for orders
    SELECT array_agg(customer_id) INTO customer_ids 
    FROM customers 
    WHERE customer_code LIKE 'TESTCUST%' 
    LIMIT num_customers;
    
    -- Generate test parts
    FOR i IN 1..num_parts LOOP
        INSERT INTO parts (
            part_id, name, description, manufacturer_part_number,
            part_type, unit_cost, weight_kg, status, created_by
        ) VALUES (
            'TESTPART' || LPAD(i::text, 6, '0'),
            'Test Part ' || i,
            'Test part description for part ' || i,
            'MPN-' || LPAD(i::text, 6, '0'),
            (ARRAY['COMPONENT', 'MATERIAL', 'HARDWARE', 'ELECTRONIC'])[1 + (i % 4)],
            (random() * 1000)::DECIMAL(10,2),
            (random() * 10)::DECIMAL(8,3),
            'ACTIVE',
            1
        ) ON CONFLICT (part_id) DO NOTHING;
    END LOOP;
    
    -- Get part IDs for assemblies
    SELECT array_agg(part_id) INTO part_ids 
    FROM parts 
    WHERE part_id LIKE 'TESTPART%' 
    LIMIT num_parts;
    
    -- Generate test assemblies
    FOR i IN 1..num_assemblies LOOP
        INSERT INTO assemblies (
            assembly_id, name, description, category_id, subcategory_id,
            assembly_type, can_order, base_price, weight_kg, 
            complexity_score, lead_time_days, status, created_by
        ) VALUES (
            'TESTASSY' || LPAD(i::text, 6, '0'),
            'Test Assembly ' || i,
            'Test assembly description for assembly ' || i,
            (ARRAY['718', '719', '720', '721', '722', '723'])[1 + (i % 6)],
            (ARRAY['718.001', '719.001', '720.001', '721.001', '722.001', '723.001'])[1 + (i % 6)],
            'COMPONENT',
            true,
            (random() * 5000 + 500)::DECIMAL(12,2),
            (random() * 50 + 5)::DECIMAL(8,3),
            1 + (i % 10),
            (random() * 30 + 5)::INTEGER,
            'ACTIVE',
            1
        ) ON CONFLICT (assembly_id) DO NOTHING;
    END LOOP;
    
    -- Get assembly IDs for orders
    SELECT array_agg(assembly_id) INTO assembly_ids 
    FROM assemblies 
    WHERE assembly_id LIKE 'TESTASSY%' 
    LIMIT num_assemblies;
    
    -- Generate assembly components (2-10 parts per assembly)
    FOR i IN 1..num_assemblies LOOP
        DECLARE
            assembly_id_val VARCHAR(50);
            parts_per_assembly INTEGER;
            j INTEGER;
        BEGIN
            assembly_id_val := assembly_ids[i];
            parts_per_assembly := 2 + (random() * 8)::INTEGER; -- 2-10 parts
            
            FOR j IN 1..parts_per_assembly LOOP
                INSERT INTO assembly_components (
                    assembly_id, component_id, component_type, quantity,
                    position_sequence, created_by
                ) VALUES (
                    assembly_id_val,
                    part_ids[1 + (random() * (array_length(part_ids, 1) - 1))::INTEGER],
                    'PART',
                    1 + (random() * 5)::INTEGER,
                    j,
                    1
                ) ON CONFLICT (assembly_id, component_id, component_type, effective_date) DO NOTHING;
            END LOOP;
        END;
    END LOOP;
    
    -- Generate test orders
    FOR i IN 1..num_orders LOOP
        DECLARE
            order_id_val VARCHAR(20);
            customer_id_val BIGINT;
            items_per_order INTEGER;
            j INTEGER;
        BEGIN
            order_id_val := 'TESTORD' || LPAD(i::text, 6, '0');
            customer_id_val := customer_ids[1 + (random() * (array_length(customer_ids, 1) - 1))::INTEGER];
            items_per_order := 1 + (random() * 4)::INTEGER; -- 1-5 items per order
            
            -- Create order
            INSERT INTO orders (
                order_id, order_number, customer_id, order_type, current_phase,
                priority, order_date, promised_delivery_date, created_by, assigned_to
            ) VALUES (
                order_id_val,
                'TEST-' || LPAD(i::text, 6, '0'),
                customer_id_val,
                (ARRAY['STANDARD', 'CUSTOM', 'RUSH'])[1 + (i % 3)],
                (ARRAY['DRAFT', 'CONFIGURATION', 'PRODUCTION', 'QUALITY_CONTROL'])[1 + (i % 4)],
                (ARRAY['LOW', 'NORMAL', 'HIGH'])[1 + (i % 3)],
                CURRENT_DATE - (random() * 90)::INTEGER,
                CURRENT_DATE + (random() * 30 + 10)::INTEGER,
                1,
                1 + (i % 5)
            ) ON CONFLICT (order_id) DO NOTHING;
            
            -- Create order items
            FOR j IN 1..items_per_order LOOP
                DECLARE
                    assembly_id_val VARCHAR(50);
                    unit_price_val DECIMAL(10,2);
                BEGIN
                    assembly_id_val := assembly_ids[1 + (random() * (array_length(assembly_ids, 1) - 1))::INTEGER];
                    
                    SELECT base_price INTO unit_price_val 
                    FROM assemblies 
                    WHERE assembly_id = assembly_id_val;
                    
                    INSERT INTO order_items (
                        order_id, line_number, assembly_id, quantity,
                        unit_price, line_total, production_status, qc_status
                    ) VALUES (
                        order_id_val,
                        j,
                        assembly_id_val,
                        1 + (random() * 3)::INTEGER,
                        unit_price_val,
                        unit_price_val * (1 + (random() * 3)::INTEGER),
                        (ARRAY['PENDING', 'IN_PROGRESS', 'COMPLETED'])[1 + (i % 3)],
                        (ARRAY['PENDING', 'PASSED', 'FAILED'])[1 + (i % 3)]
                    );
                END;
            END LOOP;
        END;
    END LOOP;
    
    end_time := clock_timestamp();
    generation_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    result := jsonb_build_object(
        'success', true,
        'customers_generated', num_customers,
        'parts_generated', num_parts,
        'assemblies_generated', num_assemblies,
        'orders_generated', num_orders,
        'generation_time_ms', generation_time,
        'generated_at', end_time
    );
    
    RAISE NOTICE 'Test data generation completed in % ms', generation_time;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE BENCHMARK TESTS
-- =====================================================

-- Function to run comprehensive performance benchmarks
CREATE OR REPLACE FUNCTION run_performance_benchmarks()
RETURNS JSONB AS
$$
DECLARE
    test_results JSONB := '[]'::JSONB;
    test_result JSONB;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTEGER;
    row_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting performance benchmarks...';
    
    -- Test 1: Complex Order Search
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM mv_order_summary 
    WHERE current_phase IN ('PRODUCTION', 'QUALITY_CONTROL') 
      AND completion_percentage < 80
      AND order_date >= CURRENT_DATE - INTERVAL '90 days';
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    test_result := jsonb_build_object(
        'test_name', 'Complex Order Search',
        'execution_time_ms', execution_time,
        'rows_returned', row_count,
        'target_ms', 2000,
        'passed', execution_time <= 2000
    );
    test_results := test_results || jsonb_build_array(test_result);
    
    -- Test 2: BOM Generation Simulation
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM assembly_components ac
    JOIN assemblies a ON ac.assembly_id = a.assembly_id
    WHERE a.status = 'ACTIVE' 
      AND ac.component_type = 'PART'
      AND ac.is_active = true;
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    test_result := jsonb_build_object(
        'test_name', 'BOM Component Lookup',
        'execution_time_ms', execution_time,
        'rows_returned', row_count,
        'target_ms', 1000,
        'passed', execution_time <= 1000
    );
    test_results := test_results || jsonb_build_array(test_result);
    
    -- Test 3: Full-text Part Search
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM parts 
    WHERE (name ILIKE '%test%' OR description ILIKE '%test%')
      AND status = 'ACTIVE';
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    test_result := jsonb_build_object(
        'test_name', 'Full-text Part Search',
        'execution_time_ms', execution_time,
        'rows_returned', row_count,
        'target_ms', 500,
        'passed', execution_time <= 500
    );
    test_results := test_results || jsonb_build_array(test_result);
    
    -- Test 4: Inventory Hierarchy Navigation
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM mv_inventory_hierarchy 
    WHERE level <= 3 AND is_active = true;
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    test_result := jsonb_build_object(
        'test_name', 'Inventory Hierarchy Navigation',
        'execution_time_ms', execution_time,
        'rows_returned', row_count,
        'target_ms', 100,
        'passed', execution_time <= 100
    );
    test_results := test_results || jsonb_build_array(test_result);
    
    -- Test 5: Order Total Calculation
    start_time := clock_timestamp();
    
    WITH order_totals AS (
        SELECT 
            o.order_id,
            SUM(oi.line_total) as order_total
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.order_id LIKE 'TESTORD%'
        GROUP BY o.order_id
        LIMIT 100
    )
    SELECT COUNT(*) INTO row_count FROM order_totals;
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    test_result := jsonb_build_object(
        'test_name', 'Order Total Calculation',
        'execution_time_ms', execution_time,
        'rows_returned', row_count,
        'target_ms', 1000,
        'passed', execution_time <= 1000
    );
    test_results := test_results || jsonb_build_array(test_result);
    
    -- Test 6: Production Dashboard Query
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM v_production_dashboard
    WHERE overall_status IN ('IN_PROGRESS', 'ON_HOLD');
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    test_result := jsonb_build_object(
        'test_name', 'Production Dashboard Query',
        'execution_time_ms', execution_time,
        'rows_returned', row_count,
        'target_ms', 2000,
        'passed', execution_time <= 2000
    );
    test_results := test_results || jsonb_build_array(test_result);
    
    -- Calculate overall results
    DECLARE
        total_tests INTEGER;
        passed_tests INTEGER;
        avg_execution_time DECIMAL(8,2);
    BEGIN
        SELECT 
            jsonb_array_length(test_results),
            (SELECT COUNT(*) FROM jsonb_array_elements(test_results) WHERE (value->>'passed')::BOOLEAN = true),
            (SELECT AVG((value->>'execution_time_ms')::INTEGER) FROM jsonb_array_elements(test_results))
        INTO total_tests, passed_tests, avg_execution_time;
        
        test_results := jsonb_build_object(
            'benchmark_timestamp', CURRENT_TIMESTAMP,
            'total_tests', total_tests,
            'passed_tests', passed_tests,
            'failed_tests', total_tests - passed_tests,
            'pass_rate', ROUND((passed_tests * 100.0) / total_tests, 2),
            'average_execution_time_ms', avg_execution_time,
            'overall_status', CASE WHEN passed_tests = total_tests THEN 'PASS' ELSE 'FAIL' END,
            'test_results', test_results
        );
    END;
    
    RETURN test_results;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STRESS TESTING FUNCTIONS
-- =====================================================

-- Function to simulate concurrent user load
CREATE OR REPLACE FUNCTION simulate_concurrent_load(
    num_users INTEGER DEFAULT 10,
    operations_per_user INTEGER DEFAULT 50
)
RETURNS JSONB AS
$$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    total_operations INTEGER;
    successful_operations INTEGER := 0;
    failed_operations INTEGER := 0;
    result JSONB;
    i INTEGER;
    j INTEGER;
BEGIN
    start_time := clock_timestamp();
    total_operations := num_users * operations_per_user;
    
    RAISE NOTICE 'Starting concurrent load simulation: % users, % operations each', 
                 num_users, operations_per_user;
    
    -- Simulate concurrent operations
    FOR i IN 1..num_users LOOP
        FOR j IN 1..operations_per_user LOOP
            BEGIN
                -- Simulate random database operations
                CASE (random() * 4)::INTEGER
                    WHEN 0 THEN
                        -- Order search
                        PERFORM COUNT(*) FROM orders WHERE customer_id = (random() * 100)::BIGINT + 1;
                    WHEN 1 THEN
                        -- Part lookup
                        PERFORM * FROM parts WHERE part_id LIKE 'TESTPART%' LIMIT 10;
                    WHEN 2 THEN
                        -- Assembly component lookup
                        PERFORM COUNT(*) FROM assembly_components WHERE assembly_id LIKE 'TESTASSY%';
                    ELSE
                        -- Customer lookup
                        PERFORM * FROM customers WHERE customer_code LIKE 'TESTCUST%' LIMIT 5;
                END CASE;
                
                successful_operations := successful_operations + 1;
                
            EXCEPTION
                WHEN OTHERS THEN
                    failed_operations := failed_operations + 1;
            END;
        END LOOP;
    END LOOP;
    
    end_time := clock_timestamp();
    
    result := jsonb_build_object(
        'test_type', 'Concurrent Load Simulation',
        'simulated_users', num_users,
        'operations_per_user', operations_per_user,
        'total_operations', total_operations,
        'successful_operations', successful_operations,
        'failed_operations', failed_operations,
        'success_rate', ROUND((successful_operations * 100.0) / total_operations, 2),
        'total_duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
        'operations_per_second', ROUND(total_operations / EXTRACT(EPOCH FROM (end_time - start_time)), 2),
        'started_at', start_time,
        'completed_at', end_time
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- QUERY OPTIMIZATION ANALYSIS
-- =====================================================

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries(threshold_ms INTEGER DEFAULT 100)
RETURNS JSONB AS
$$
DECLARE
    slow_queries JSONB;
    analysis_result JSONB;
BEGIN
    -- Get slow queries from pg_stat_statements if available
    BEGIN
        SELECT jsonb_agg(
            jsonb_build_object(
                'query', LEFT(query, 200),
                'calls', calls,
                'total_time_ms', ROUND(total_time, 2),
                'mean_time_ms', ROUND(mean_time, 2),
                'max_time_ms', ROUND(max_time, 2),
                'rows_avg', ROUND(rows::DECIMAL / calls, 2),
                'hit_percent', ROUND(100.0 * shared_blks_hit / 
                    NULLIF(shared_blks_hit + shared_blks_read, 0), 2)
            )
        ) INTO slow_queries
        FROM pg_stat_statements 
        WHERE mean_time > threshold_ms
        ORDER BY total_time DESC
        LIMIT 20;
        
    EXCEPTION
        WHEN OTHERS THEN
            slow_queries := jsonb_build_array(
                jsonb_build_object(
                    'error', 'pg_stat_statements not available',
                    'message', 'Enable pg_stat_statements extension for query analysis'
                )
            );
    END;
    
    analysis_result := jsonb_build_object(
        'analysis_timestamp', CURRENT_TIMESTAMP,
        'threshold_ms', threshold_ms,
        'slow_queries_count', COALESCE(jsonb_array_length(slow_queries), 0),
        'slow_queries', COALESCE(slow_queries, '[]'::JSONB)
    );
    
    RETURN analysis_result;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze table and index usage
CREATE OR REPLACE FUNCTION analyze_table_usage()
RETURNS JSONB AS
$$
DECLARE
    table_stats JSONB;
    index_stats JSONB;
    analysis_result JSONB;
BEGIN
    -- Get table statistics
    SELECT jsonb_agg(
        jsonb_build_object(
            'schema', schemaname,
            'table', tablename,
            'size_pretty', pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)),
            'size_bytes', pg_total_relation_size(schemaname||'.'||tablename),
            'seq_scan', seq_scan,
            'seq_tup_read', seq_tup_read,
            'idx_scan', COALESCE(idx_scan, 0),
            'idx_tup_fetch', COALESCE(idx_tup_fetch, 0),
            'n_tup_ins', n_tup_ins,
            'n_tup_upd', n_tup_upd,
            'n_tup_del', n_tup_del
        )
    ) INTO table_stats
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 20;
    
    -- Get index usage statistics
    SELECT jsonb_agg(
        jsonb_build_object(
            'schema', schemaname,
            'table', tablename,
            'index', indexname,
            'idx_scan', idx_scan,
            'idx_tup_read', idx_tup_read,
            'idx_tup_fetch', idx_tup_fetch,
            'size_pretty', pg_size_pretty(pg_relation_size(indexrelid))
        )
    ) INTO index_stats
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan > 0
    ORDER BY idx_scan DESC
    LIMIT 20;
    
    analysis_result := jsonb_build_object(
        'analysis_timestamp', CURRENT_TIMESTAMP,
        'table_count', jsonb_array_length(table_stats),
        'index_count', jsonb_array_length(index_stats),
        'table_statistics', table_stats,
        'index_statistics', index_stats
    );
    
    RETURN analysis_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING AND ALERTING
-- =====================================================

-- Function to check performance thresholds and generate alerts
CREATE OR REPLACE FUNCTION check_performance_thresholds()
RETURNS JSONB AS
$$
DECLARE
    alerts JSONB := '[]'::JSONB;
    alert JSONB;
    db_size_bytes BIGINT;
    active_connections INTEGER;
    long_running_queries INTEGER;
    lock_waits INTEGER;
BEGIN
    -- Check database size
    SELECT pg_database_size(current_database()) INTO db_size_bytes;
    IF db_size_bytes > 10 * 1024 * 1024 * 1024 THEN -- 10GB threshold
        alert := jsonb_build_object(
            'alert_type', 'DATABASE_SIZE',
            'severity', 'WARNING',
            'message', 'Database size exceeds 10GB',
            'current_size', pg_size_pretty(db_size_bytes),
            'threshold', '10GB'
        );
        alerts := alerts || jsonb_build_array(alert);
    END IF;
    
    -- Check active connections
    SELECT COUNT(*) INTO active_connections 
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    IF active_connections > 40 THEN
        alert := jsonb_build_object(
            'alert_type', 'HIGH_CONNECTIONS',
            'severity', 'WARNING',
            'message', 'High number of active connections',
            'current_connections', active_connections,
            'threshold', 40
        );
        alerts := alerts || jsonb_build_array(alert);
    END IF;
    
    -- Check for long-running queries
    SELECT COUNT(*) INTO long_running_queries
    FROM pg_stat_activity 
    WHERE state = 'active' 
      AND query_start < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
      AND query NOT ILIKE '%pg_stat_activity%';
    
    IF long_running_queries > 0 THEN
        alert := jsonb_build_object(
            'alert_type', 'LONG_RUNNING_QUERIES',
            'severity', 'WARNING',
            'message', 'Queries running longer than 5 minutes detected',
            'count', long_running_queries
        );
        alerts := alerts || jsonb_build_array(alert);
    END IF;
    
    -- Check for lock waits
    SELECT COUNT(*) INTO lock_waits
    FROM pg_stat_activity 
    WHERE wait_event_type = 'Lock' AND state = 'active';
    
    IF lock_waits > 5 THEN
        alert := jsonb_build_object(
            'alert_type', 'LOCK_WAITS',
            'severity', 'CRITICAL',
            'message', 'High number of processes waiting for locks',
            'waiting_processes', lock_waits
        );
        alerts := alerts || jsonb_build_array(alert);
    END IF;
    
    RETURN jsonb_build_object(
        'check_timestamp', CURRENT_TIMESTAMP,
        'alerts_count', jsonb_array_length(alerts),
        'alerts', alerts,
        'system_healthy', jsonb_array_length(alerts) = 0
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up test data
CREATE OR REPLACE FUNCTION cleanup_test_data()
RETURNS JSONB AS
$$
DECLARE
    deleted_orders INTEGER;
    deleted_customers INTEGER;
    deleted_assemblies INTEGER;
    deleted_parts INTEGER;
    result JSONB;
BEGIN
    -- Delete test orders and related data
    DELETE FROM order_items WHERE order_id LIKE 'TESTORD%';
    DELETE FROM orders WHERE order_id LIKE 'TESTORD%';
    GET DIAGNOSTICS deleted_orders = ROW_COUNT;
    
    -- Delete test customers
    DELETE FROM customers WHERE customer_code LIKE 'TESTCUST%';
    GET DIAGNOSTICS deleted_customers = ROW_COUNT;
    
    -- Delete test assembly components and assemblies
    DELETE FROM assembly_components WHERE assembly_id LIKE 'TESTASSY%';
    DELETE FROM assemblies WHERE assembly_id LIKE 'TESTASSY%';
    GET DIAGNOSTICS deleted_assemblies = ROW_COUNT;
    
    -- Delete test parts
    DELETE FROM parts WHERE part_id LIKE 'TESTPART%';
    GET DIAGNOSTICS deleted_parts = ROW_COUNT;
    
    -- Refresh materialized views
    REFRESH MATERIALIZED VIEW mv_order_summary;
    REFRESH MATERIALIZED VIEW mv_inventory_hierarchy;
    
    -- Update statistics
    ANALYZE;
    
    result := jsonb_build_object(
        'cleanup_timestamp', CURRENT_TIMESTAMP,
        'deleted_orders', deleted_orders,
        'deleted_customers', deleted_customers,
        'deleted_assemblies', deleted_assemblies,
        'deleted_parts', deleted_parts,
        'total_deleted', deleted_orders + deleted_customers + deleted_assemblies + deleted_parts
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPREHENSIVE PERFORMANCE REPORT
-- =====================================================

-- Function to generate comprehensive performance report
CREATE OR REPLACE FUNCTION generate_performance_report()
RETURNS JSONB AS
$$
DECLARE
    benchmark_results JSONB;
    slow_query_analysis JSONB;
    table_usage_analysis JSONB;
    threshold_alerts JSONB;
    system_health JSONB;
    report JSONB;
BEGIN
    -- Run all performance checks
    SELECT run_performance_benchmarks() INTO benchmark_results;
    SELECT analyze_slow_queries(50) INTO slow_query_analysis;
    SELECT analyze_table_usage() INTO table_usage_analysis;
    SELECT check_performance_thresholds() INTO threshold_alerts;
    SELECT get_system_health_status() INTO system_health;
    
    -- Compile comprehensive report
    report := jsonb_build_object(
        'report_timestamp', CURRENT_TIMESTAMP,
        'report_type', 'Comprehensive Performance Analysis',
        'system_health', system_health,
        'performance_benchmarks', benchmark_results,
        'slow_query_analysis', slow_query_analysis,
        'table_usage_analysis', table_usage_analysis,
        'threshold_alerts', threshold_alerts,
        'recommendations', jsonb_build_array(
            'Monitor queries exceeding 100ms execution time',
            'Consider partitioning large tables for better performance',
            'Regularly update table statistics with ANALYZE',
            'Monitor index usage and remove unused indexes',
            'Set up automated performance monitoring alerts'
        )
    );
    
    -- Log the report
    INSERT INTO audit_log (table_name, record_id, action, additional_info)
    VALUES ('system_performance', 'performance_report', 'GENERATE', report);
    
    RETURN report;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION generate_performance_test_data IS 'Generates test data for performance testing and load simulation';
COMMENT ON FUNCTION run_performance_benchmarks IS 'Runs comprehensive performance benchmarks against target metrics';
COMMENT ON FUNCTION simulate_concurrent_load IS 'Simulates concurrent user load for stress testing';
COMMENT ON FUNCTION analyze_slow_queries IS 'Analyzes slow queries using pg_stat_statements';
COMMENT ON FUNCTION analyze_table_usage IS 'Analyzes table and index usage statistics';
COMMENT ON FUNCTION check_performance_thresholds IS 'Checks performance thresholds and generates alerts';
COMMENT ON FUNCTION cleanup_test_data IS 'Cleans up test data generated for performance testing';
COMMENT ON FUNCTION generate_performance_report IS 'Generates comprehensive performance analysis report';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Generate test data:
-- SELECT generate_performance_test_data(1000, 100, 50, 500);

-- Run performance benchmarks:
-- SELECT run_performance_benchmarks();

-- Simulate concurrent load:
-- SELECT simulate_concurrent_load(25, 100);

-- Generate performance report:
-- SELECT generate_performance_report();

-- Cleanup test data:
-- SELECT cleanup_test_data();

RAISE NOTICE 'Performance testing and monitoring scripts loaded successfully!';