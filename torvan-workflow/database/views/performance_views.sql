-- =====================================================
-- TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
-- PERFORMANCE OPTIMIZATION VIEWS
-- =====================================================
-- 
-- This file contains materialized views and regular views for performance optimization:
-- - Order summary and dashboard views
-- - Inventory hierarchy views  
-- - Production and QC summary views
-- - System performance monitoring views
-- - Business intelligence and reporting views
-- 
-- Performance Targets:
-- - View queries: <2s for dashboard views
-- - Materialized view refreshes: <30s
-- - Complex reporting queries: <10s
-- =====================================================

-- =====================================================
-- ORDER SUMMARY MATERIALIZED VIEW
-- =====================================================
-- Pre-calculated order summary for dashboard performance

CREATE MATERIALIZED VIEW mv_order_summary AS
SELECT 
    o.order_id,
    o.order_number,
    o.customer_id,
    c.company_name,
    c.customer_code,
    o.current_phase,
    o.priority,
    o.order_type,
    o.order_date,
    o.promised_delivery_date,
    o.total_amount,
    o.currency,
    
    -- Order Item Statistics
    COUNT(oi.item_id) as total_items,
    COUNT(CASE WHEN oi.production_status = 'COMPLETED' THEN 1 END) as completed_items,
    COUNT(CASE WHEN oi.production_status = 'IN_PROGRESS' THEN 1 END) as in_progress_items,
    COUNT(CASE WHEN oi.production_status = 'PENDING' THEN 1 END) as pending_items,
    
    -- Progress Calculation
    CASE 
        WHEN COUNT(oi.item_id) = 0 THEN 0
        ELSE ROUND(COUNT(CASE WHEN oi.production_status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(oi.item_id), 2)
    END as completion_percentage,
    
    -- QC Status Summary
    COUNT(CASE WHEN oi.qc_status = 'PASSED' THEN 1 END) as qc_passed_items,
    COUNT(CASE WHEN oi.qc_status = 'FAILED' THEN 1 END) as qc_failed_items,
    
    -- Timing Analysis
    EXTRACT(EPOCH FROM (o.production_completed_at - o.production_started_at))/3600 as production_hours,
    EXTRACT(EPOCH FROM (o.qc_completed_at - o.qc_started_at))/3600 as qc_hours,
    
    -- Status Flags
    CASE WHEN o.promised_delivery_date < CURRENT_DATE AND o.current_phase != 'DELIVERED' 
         THEN true ELSE false END as is_overdue,
    CASE WHEN o.is_rush_order THEN true ELSE false END as is_rush,
    
    -- Assignment Information
    o.assigned_to,
    u.full_name as assigned_to_name,
    o.sales_rep_id,
    sr.full_name as sales_rep_name,
    
    -- Timestamps
    o.created_at,
    o.updated_at
    
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN users u ON o.assigned_to = u.user_id
LEFT JOIN users sr ON o.sales_rep_id = sr.user_id
WHERE o.current_phase != 'CANCELLED'
GROUP BY 
    o.order_id, o.order_number, o.customer_id, c.company_name, c.customer_code,
    o.current_phase, o.priority, o.order_type, o.order_date, o.promised_delivery_date,
    o.total_amount, o.currency, o.is_rush_order, o.assigned_to, u.full_name,
    o.sales_rep_id, sr.full_name, o.created_at, o.updated_at,
    o.production_started_at, o.production_completed_at, o.qc_started_at, o.qc_completed_at;

-- Indexes on materialized view
CREATE UNIQUE INDEX idx_mv_order_summary_order_id ON mv_order_summary (order_id);
CREATE INDEX idx_mv_order_summary_phase ON mv_order_summary (current_phase);
CREATE INDEX idx_mv_order_summary_customer ON mv_order_summary (customer_id);
CREATE INDEX idx_mv_order_summary_date ON mv_order_summary (order_date DESC);
CREATE INDEX idx_mv_order_summary_priority ON mv_order_summary (priority);
CREATE INDEX idx_mv_order_summary_overdue ON mv_order_summary (is_overdue) WHERE is_overdue = true;
CREATE INDEX idx_mv_order_summary_assigned ON mv_order_summary (assigned_to);

-- =====================================================
-- INVENTORY HIERARCHY MATERIALIZED VIEW
-- =====================================================
-- Pre-calculated inventory hierarchy for navigation performance

CREATE MATERIALIZED VIEW mv_inventory_hierarchy AS
WITH RECURSIVE hierarchy AS (
    -- Base case: top-level categories
    SELECT 
        category_id as id,
        'CATEGORY'::text as type,
        name,
        NULL::text as parent_id,
        1 as level,
        category_id::text as path,
        category_id::text as root_category,
        display_order,
        is_active
    FROM categories 
    WHERE parent_category_id IS NULL
    
    UNION ALL
    
    -- Recursive case: subcategories
    SELECT 
        s.subcategory_id as id,
        'SUBCATEGORY'::text as type,
        s.name,
        s.category_id as parent_id,
        h.level + 1,
        h.path || '.' || s.subcategory_id,
        h.root_category,
        s.display_order,
        s.is_active
    FROM subcategories s
    JOIN hierarchy h ON s.category_id = h.id AND h.type = 'CATEGORY'
    
    UNION ALL
    
    -- Assemblies
    SELECT 
        a.assembly_id as id,
        'ASSEMBLY'::text as type,
        a.name,
        a.subcategory_id as parent_id,
        h.level + 1,
        h.path || '.' || a.assembly_id,
        h.root_category,
        0 as display_order, -- Assemblies don't have display order
        CASE WHEN a.status = 'ACTIVE' THEN true ELSE false END as is_active
    FROM assemblies a
    JOIN hierarchy h ON a.subcategory_id = h.id AND h.type = 'SUBCATEGORY'
)
SELECT 
    id,
    type,
    name,
    parent_id,
    level,
    path,
    root_category,
    display_order,
    is_active,
    
    -- Additional calculated fields
    CASE 
        WHEN type = 'ASSEMBLY' THEN (
            SELECT COUNT(*) FROM assembly_components ac WHERE ac.assembly_id = h.id
        )
        ELSE 0
    END as component_count,
    
    CASE 
        WHEN type = 'CATEGORY' THEN (
            SELECT COUNT(*) FROM subcategories s WHERE s.category_id = h.id
        )
        WHEN type = 'SUBCATEGORY' THEN (
            SELECT COUNT(*) FROM assemblies a WHERE a.subcategory_id = h.id AND a.status = 'ACTIVE'
        )
        ELSE 0
    END as child_count
    
FROM hierarchy h
ORDER BY path, display_order;

-- Indexes on inventory hierarchy view
CREATE UNIQUE INDEX idx_mv_inventory_hierarchy_id_type ON mv_inventory_hierarchy (id, type);
CREATE INDEX idx_mv_inventory_hierarchy_path ON mv_inventory_hierarchy (path);
CREATE INDEX idx_mv_inventory_hierarchy_level ON mv_inventory_hierarchy (level);
CREATE INDEX idx_mv_inventory_hierarchy_parent ON mv_inventory_hierarchy (parent_id);
CREATE INDEX idx_mv_inventory_hierarchy_active ON mv_inventory_hierarchy (is_active);

-- =====================================================
-- PRODUCTION DASHBOARD VIEW
-- =====================================================
-- Real-time production status and metrics

CREATE VIEW v_production_dashboard AS
SELECT 
    pt.order_item_id,
    o.order_number,
    c.company_name,
    a.name as assembly_name,
    
    -- Task Statistics
    COUNT(pt.task_id) as total_tasks,
    COUNT(CASE WHEN pt.status = 'COMPLETED' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN pt.status = 'IN_PROGRESS' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN pt.status = 'PENDING' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN pt.status = 'ON_HOLD' THEN 1 END) as on_hold_tasks,
    
    -- Progress Metrics
    CASE 
        WHEN COUNT(pt.task_id) = 0 THEN 0
        ELSE ROUND(COUNT(CASE WHEN pt.status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(pt.task_id), 2)
    END as completion_percentage,
    
    -- Time Metrics
    SUM(pt.estimated_hours) as total_estimated_hours,
    SUM(pt.actual_hours) as total_actual_hours,
    
    -- Performance Metrics
    CASE 
        WHEN SUM(pt.estimated_hours) > 0 THEN 
            ROUND((SUM(pt.actual_hours) / SUM(pt.estimated_hours)) * 100, 2)
        ELSE NULL
    END as efficiency_percentage,
    
    -- Current Status
    CASE 
        WHEN COUNT(CASE WHEN pt.status = 'IN_PROGRESS' THEN 1 END) > 0 THEN 'IN_PROGRESS'
        WHEN COUNT(CASE WHEN pt.status = 'COMPLETED' THEN 1 END) = COUNT(pt.task_id) THEN 'COMPLETED'
        WHEN COUNT(CASE WHEN pt.status = 'ON_HOLD' THEN 1 END) > 0 THEN 'ON_HOLD'
        ELSE 'PENDING'
    END as overall_status,
    
    -- Assignment Information
    STRING_AGG(DISTINCT u.full_name, ', ') as assigned_workers,
    
    -- Timing Information
    MIN(pt.scheduled_start_date) as earliest_start_date,
    MAX(pt.scheduled_end_date) as latest_end_date,
    MIN(pt.actual_start_time) as actual_start,
    MAX(pt.actual_end_time) as actual_end

FROM production_tasks pt
JOIN order_items oi ON pt.order_item_id = oi.item_id
JOIN orders o ON oi.order_id = o.order_id
JOIN customers c ON o.customer_id = c.customer_id
JOIN assemblies a ON oi.assembly_id = a.assembly_id
LEFT JOIN users u ON pt.assigned_to = u.user_id
WHERE o.current_phase IN ('PRODUCTION', 'QUALITY_CONTROL', 'PACKAGING')
GROUP BY pt.order_item_id, o.order_number, c.company_name, a.name;

-- =====================================================
-- QC SUMMARY VIEW
-- =====================================================
-- Quality control metrics and status

CREATE VIEW v_qc_summary AS
SELECT 
    qi.order_item_id,
    o.order_number,
    c.company_name,
    a.name as assembly_name,
    
    -- Inspection Statistics
    COUNT(qi.inspection_id) as total_inspections,
    COUNT(CASE WHEN qi.overall_result = 'PASS' THEN 1 END) as passed_inspections,
    COUNT(CASE WHEN qi.overall_result = 'FAIL' THEN 1 END) as failed_inspections,
    COUNT(CASE WHEN qi.overall_result = 'PENDING' THEN 1 END) as pending_inspections,
    
    -- Quality Metrics
    CASE 
        WHEN COUNT(qi.inspection_id) = 0 THEN NULL
        ELSE ROUND(COUNT(CASE WHEN qi.overall_result = 'PASS' THEN 1 END) * 100.0 / COUNT(qi.inspection_id), 2)
    END as pass_rate_percentage,
    
    AVG(qi.pass_percentage) as average_pass_percentage,
    SUM(qi.defect_count) as total_defects,
    SUM(qi.critical_defects) as total_critical_defects,
    
    -- Inspector Information
    STRING_AGG(DISTINCT u.full_name, ', ') as inspectors,
    
    -- Latest Inspection Status
    MAX(qi.inspection_date) as latest_inspection_date,
    (SELECT qi2.overall_result 
     FROM qc_inspections qi2 
     WHERE qi2.order_item_id = qi.order_item_id 
     ORDER BY qi2.inspection_date DESC 
     LIMIT 1) as latest_result,
    
    -- First Pass Yield
    CASE 
        WHEN COUNT(qi.inspection_id) = 0 THEN NULL
        WHEN MIN(qi.inspection_date) IS NOT NULL THEN
            (SELECT CASE WHEN overall_result = 'PASS' THEN 100.0 ELSE 0.0 END
             FROM qc_inspections qi3
             WHERE qi3.order_item_id = qi.order_item_id
             ORDER BY qi3.inspection_date ASC
             LIMIT 1)
        ELSE NULL
    END as first_pass_yield

FROM qc_inspections qi
JOIN order_items oi ON qi.order_item_id = oi.item_id
JOIN orders o ON oi.order_id = o.order_id
JOIN customers c ON o.customer_id = c.customer_id
JOIN assemblies a ON oi.assembly_id = a.assembly_id
LEFT JOIN users u ON qi.inspector_id = u.user_id
GROUP BY qi.order_item_id, o.order_number, c.company_name, a.name;

-- =====================================================
-- SYSTEM PERFORMANCE MONITORING VIEW
-- =====================================================
-- System performance metrics and health indicators

CREATE VIEW v_system_performance AS
SELECT 
    'Orders' as metric_category,
    'Active Orders' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    CURRENT_TIMESTAMP as calculated_at
FROM orders 
WHERE current_phase NOT IN ('DELIVERED', 'CANCELLED')

UNION ALL

SELECT 
    'Orders' as metric_category,
    'Overdue Orders' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    CURRENT_TIMESTAMP as calculated_at
FROM orders 
WHERE promised_delivery_date < CURRENT_DATE 
  AND current_phase NOT IN ('DELIVERED', 'CANCELLED')

UNION ALL

SELECT 
    'Production' as metric_category,
    'Active Tasks' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    CURRENT_TIMESTAMP as calculated_at
FROM production_tasks 
WHERE status IN ('PENDING', 'IN_PROGRESS')

UNION ALL

SELECT 
    'Quality' as metric_category,
    'Pending Inspections' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    CURRENT_TIMESTAMP as calculated_at
FROM qc_inspections 
WHERE overall_result = 'PENDING'

UNION ALL

SELECT 
    'System' as metric_category,
    'Active Users' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    CURRENT_TIMESTAMP as calculated_at
FROM user_sessions 
WHERE is_active = true 
  AND expires_at > CURRENT_TIMESTAMP

UNION ALL

SELECT 
    'Integration' as metric_category,
    'Failed Syncs (24h)' as metric_name,
    COUNT(*) as metric_value,
    'count' as metric_unit,
    CURRENT_TIMESTAMP as calculated_at
FROM sync_log 
WHERE status = 'FAILED' 
  AND sync_started_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- =====================================================
-- BOM COST ANALYSIS VIEW
-- =====================================================
-- BOM cost breakdowns and analysis

CREATE VIEW v_bom_cost_analysis AS
SELECT 
    b.bom_id,
    b.bom_number,
    c.configuration_id,
    a.assembly_id,
    a.name as assembly_name,
    
    -- Cost Summary
    b.total_estimated_cost,
    COUNT(bli.line_item_id) as total_line_items,
    
    -- Cost Breakdowns
    SUM(CASE WHEN bli.component_type = 'PART' THEN bli.extended_cost ELSE 0 END) as parts_cost,
    SUM(CASE WHEN bli.component_type = 'ASSEMBLY' THEN bli.extended_cost ELSE 0 END) as assemblies_cost,
    SUM(CASE WHEN bli.is_custom_part = true THEN bli.extended_cost ELSE 0 END) as custom_parts_cost,
    
    -- Component Counts
    COUNT(CASE WHEN bli.component_type = 'PART' THEN 1 END) as parts_count,
    COUNT(CASE WHEN bli.component_type = 'ASSEMBLY' THEN 1 END) as assemblies_count,
    COUNT(CASE WHEN bli.is_custom_part = true THEN 1 END) as custom_parts_count,
    
    -- Cost per Unit
    CASE 
        WHEN COUNT(bli.line_item_id) > 0 THEN 
            ROUND(b.total_estimated_cost / COUNT(bli.line_item_id), 2)
        ELSE 0
    END as average_cost_per_line_item,
    
    -- Status Information
    b.status,
    b.approved_at,
    b.created_at,
    
    -- Configuration Details
    conf.sink_length_inches,
    conf.basin_count,
    conf.complexity_score

FROM boms b
JOIN configurations conf ON b.configuration_id = conf.configuration_id
JOIN assemblies a ON b.assembly_id = a.assembly_id
LEFT JOIN bom_line_items bli ON b.bom_id = bli.bom_id AND bli.is_active = true
GROUP BY 
    b.bom_id, b.bom_number, c.configuration_id, a.assembly_id, a.name,
    b.total_estimated_cost, b.status, b.approved_at, b.created_at,
    conf.sink_length_inches, conf.basin_count, conf.complexity_score;

-- =====================================================
-- CUSTOMER ORDER HISTORY VIEW
-- =====================================================
-- Customer order patterns and history

CREATE VIEW v_customer_order_history AS
SELECT 
    c.customer_id,
    c.company_name,
    c.customer_code,
    
    -- Order Statistics
    COUNT(o.order_id) as total_orders,
    COUNT(CASE WHEN o.current_phase = 'DELIVERED' THEN 1 END) as completed_orders,
    COUNT(CASE WHEN o.current_phase NOT IN ('DELIVERED', 'CANCELLED') THEN 1 END) as active_orders,
    
    -- Financial Metrics
    SUM(o.total_amount) as total_order_value,
    AVG(o.total_amount) as average_order_value,
    MAX(o.total_amount) as largest_order_value,
    
    -- Timing Metrics
    MIN(o.order_date) as first_order_date,
    MAX(o.order_date) as latest_order_date,
    
    -- Performance Metrics
    COUNT(CASE WHEN o.promised_delivery_date >= o.actual_delivery_date OR o.actual_delivery_date IS NULL THEN 1 END) as on_time_orders,
    CASE 
        WHEN COUNT(CASE WHEN o.actual_delivery_date IS NOT NULL THEN 1 END) > 0 THEN
            ROUND(COUNT(CASE WHEN o.promised_delivery_date >= o.actual_delivery_date THEN 1 END) * 100.0 / 
                  COUNT(CASE WHEN o.actual_delivery_date IS NOT NULL THEN 1 END), 2)
        ELSE NULL
    END as on_time_percentage,
    
    -- Product Preferences
    STRING_AGG(DISTINCT cat.name, ', ') as preferred_categories,
    
    -- Latest Activity
    MAX(o.created_at) as last_order_created,
    MAX(o.updated_at) as last_activity

FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
LEFT JOIN assemblies a ON oi.assembly_id = a.assembly_id
LEFT JOIN categories cat ON a.category_id = cat.category_id
GROUP BY c.customer_id, c.company_name, c.customer_code;

-- =====================================================
-- REFRESH PROCEDURES FOR MATERIALIZED VIEWS
-- =====================================================

-- Function to refresh order summary view
CREATE OR REPLACE FUNCTION refresh_order_summary()
RETURNS void AS
$$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_order_summary;
    
    -- Log the refresh
    INSERT INTO audit_log (table_name, record_id, action, user_id, additional_info)
    VALUES ('mv_order_summary', 'refresh', 'REFRESH', NULL, 
            jsonb_build_object('refresh_time', CURRENT_TIMESTAMP));
END;
$$ LANGUAGE plpgsql;

-- Function to refresh inventory hierarchy view
CREATE OR REPLACE FUNCTION refresh_inventory_hierarchy()
RETURNS void AS
$$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_hierarchy;
    
    -- Log the refresh
    INSERT INTO audit_log (table_name, record_id, action, user_id, additional_info)
    VALUES ('mv_inventory_hierarchy', 'refresh', 'REFRESH', NULL, 
            jsonb_build_object('refresh_time', CURRENT_TIMESTAMP));
END;
$$ LANGUAGE plpgsql;

-- Scheduled refresh function (to be called by cron job)
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS
$$
BEGIN
    -- Refresh all materialized views
    PERFORM refresh_order_summary();
    PERFORM refresh_inventory_hierarchy();
    
    -- Update statistics
    ANALYZE mv_order_summary;
    ANALYZE mv_inventory_hierarchy;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PERFORMANCE MONITORING VIEWS
-- =====================================================

-- View for monitoring slow queries
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

-- View for monitoring table sizes
CREATE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = schemaname) as column_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for monitoring index usage
CREATE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_tup_read = 0 THEN 0
        ELSE ROUND((idx_tup_fetch * 100.0) / idx_tup_read, 2)
    END as hit_ratio
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON MATERIALIZED VIEW mv_order_summary IS 'Pre-calculated order summary for dashboard performance';
COMMENT ON MATERIALIZED VIEW mv_inventory_hierarchy IS 'Pre-calculated inventory hierarchy for navigation performance';
COMMENT ON VIEW v_production_dashboard IS 'Real-time production status and metrics';
COMMENT ON VIEW v_qc_summary IS 'Quality control metrics and status summary';
COMMENT ON VIEW v_system_performance IS 'System performance metrics and health indicators';
COMMENT ON VIEW v_bom_cost_analysis IS 'BOM cost breakdowns and analysis';
COMMENT ON VIEW v_customer_order_history IS 'Customer order patterns and history';
COMMENT ON VIEW v_slow_queries IS 'Monitoring view for slow database queries';
COMMENT ON VIEW v_table_sizes IS 'Database table size monitoring';
COMMENT ON VIEW v_index_usage IS 'Database index usage statistics';

-- =====================================================
-- PERFORMANCE VALIDATION QUERIES
-- =====================================================

-- Dashboard query test (should execute in <2s)
-- SELECT * FROM mv_order_summary 
-- WHERE current_phase IN ('PRODUCTION', 'QUALITY_CONTROL') 
-- ORDER BY priority DESC, order_date DESC 
-- LIMIT 50;

-- Inventory hierarchy test (should execute in <1s)
-- SELECT * FROM mv_inventory_hierarchy 
-- WHERE level <= 3 AND is_active = true 
-- ORDER BY path;

-- Production status test (should execute in <2s)
-- SELECT * FROM v_production_dashboard 
-- WHERE overall_status IN ('IN_PROGRESS', 'ON_HOLD')
-- ORDER BY completion_percentage ASC;