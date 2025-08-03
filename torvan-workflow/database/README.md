# TORVAN Medical Workflow Management System - Database Schema

## Overview

This directory contains the complete database schema and deployment scripts for the TORVAN Medical Workflow Management System. The database is designed to support complex medical equipment manufacturing workflows with hierarchical inventory management, dynamic BOM generation, and comprehensive order lifecycle tracking.

## Architecture Highlights

- **4-Level Hierarchical Data Model**: Categories → Subcategories → Assemblies → Parts
- **Dynamic BOM Generation**: Configuration-driven with sub-5 second performance
- **8-Phase Order Lifecycle**: Complete workflow from draft to delivery
- **Multi-Role Security**: 6 user types with granular permissions
- **Real-time Integration**: ERP, document management, and shipping systems
- **Performance Optimized**: Materialized views, intelligent indexing, caching strategies

## Database Requirements

### System Requirements
- **Database**: PostgreSQL 15+ (recommended)
- **Memory**: Minimum 4GB RAM, 8GB+ recommended
- **Storage**: Minimum 10GB available space
- **CPU**: 2+ cores recommended
- **Network**: Required for extension downloads and integrations

### Performance Targets
- **BOM Generation**: <5 seconds for complex configurations
- **Order Searches**: <2 seconds for filtered results
- **User Authentication**: <200ms
- **Database Queries**: 95% under 100ms response time
- **Concurrent Users**: Support for 50 simultaneous users

## Directory Structure

```
database/
├── README.md                          # This file
├── deploy_database.sql                # Master deployment script
├── schemas/                           # Schema definition files
│   ├── 01_inventory_management.sql    # Categories, assemblies, parts
│   ├── 02_order_management.sql        # Orders, workflow, customers
│   ├── 03_bom_configuration.sql       # BOM generation, configurations
│   ├── 04_user_management_security.sql # Users, roles, permissions
│   ├── 05_quality_control_production.sql # QC processes, production tasks
│   ├── 06_integration_external_systems.sql # External systems, documents
│   └── 07_data_security_audit.sql     # Security policies, audit trails
├── migrations/                        # Database migration scripts
│   ├── 01_initial_migration.sql       # Initial schema setup
│   └── 02_data_import.sql             # Sample data import
├── functions/                         # Database functions and procedures
│   └── core_functions.sql             # Core business logic functions
├── views/                            # Performance optimization views
│   └── performance_views.sql          # Materialized and regular views
├── indexes/                          # Additional performance indexes
├── testing/                          # Testing and validation scripts
│   └── performance_tests.sql          # Performance testing suite
└── seed/                             # Seed data files
```

## Quick Start Deployment

### 1. Database Preparation

```sql
-- Create database and user
CREATE DATABASE torvan_workflow;
CREATE USER torvan_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE torvan_workflow TO torvan_user;

-- Connect to the database
\c torvan_workflow;
```

### 2. Execute Master Deployment Script

```bash
# Deploy complete schema
psql -U torvan_user -d torvan_workflow -f deploy_database.sql
```

### 3. Verify Deployment

```sql
-- Check deployment status
SELECT * FROM deployment_log ORDER BY created_at DESC;

-- Verify core tables
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Test basic functionality
SELECT generate_order_number();
SELECT get_system_health_status();
```

## Schema Components

### 1. Inventory Management (`01_inventory_management.sql`)

**Core Tables:**
- `categories` - Top-level product categories (6 main categories)
- `subcategories` - Second-level organization (up to 27 per category)
- `assemblies` - Orderable products and assemblies (219 assemblies)
- `parts` - Individual components (481+ parts)
- `assembly_components` - Assembly composition relationships
- `product_variants` - Product configuration variants

**Key Features:**
- Hierarchical product organization
- Full-text search capabilities
- Version control and lifecycle management
- Custom part support (700-series)
- Performance-optimized indexing

### 2. Order Management (`02_order_management.sql`)

**Core Tables:**
- `customers` - Customer master data
- `orders` - Main orders with 8-phase workflow
- `order_items` - Order line items with configuration links
- `order_status_history` - Complete audit trail
- `order_workflow_rules` - Business rules engine
- `order_attachments` - File attachments
- `order_notes` - Timestamped communications
- `order_metrics` - Performance KPIs

**8-Phase Workflow:**
1. **DRAFT** - Initial order creation
2. **CONFIGURATION** - Product configuration and BOM generation
3. **APPROVAL** - Management approval
4. **PRODUCTION** - Manufacturing phase
5. **QUALITY_CONTROL** - QC inspection
6. **PACKAGING** - Final packaging
7. **SHIPPING** - Delivery preparation
8. **DELIVERED** - Order completion

### 3. BOM Generation & Configuration (`03_bom_configuration.sql`)

**Core Tables:**
- `configurations` - Product configurations with parameters
- `boms` - Bill of Materials with approval workflow
- `bom_line_items` - Individual BOM components
- `configuration_rules` - Business rules engine
- `custom_parts_registry` - 700-series custom parts

**Key Features:**
- Dynamic BOM generation from configurations
- Complex medical equipment configuration support
- Business rules validation
- Custom part creation and tracking
- Version control and approval workflows

### 4. User Management & Security (`04_user_management_security.sql`)

**Core Tables:**
- `users` - User accounts with authentication
- `roles` - System roles with hierarchical structure
- `user_roles` - Multi-role assignments with delegation
- `permissions` - Granular permission system
- `role_permissions` - Permission assignments
- `user_sessions` - Active session tracking
- `security_events` - Security audit trail

**User Roles:**
- **Administrator** - Full system access
- **Sales Manager** - Order creation and customer management
- **Production Manager** - Production workflow and resource allocation
- **QC Inspector** - Quality control processes and approvals
- **Assembly Technician** - Task execution and progress updates
- **Customer Service** - Order status and customer communication

### 5. Quality Control & Production (`05_quality_control_production.sql`)

**Core Tables:**
- `qc_processes` - Quality control process definitions
- `qc_inspections` - Individual inspection instances
- `qc_inspection_items` - Detailed inspection checkpoints
- `production_tasks` - Individual production tasks
- `production_resources` - Equipment and resource management

**Key Features:**
- Multi-stage QC inspections
- Digital checklists with photo documentation
- Production task scheduling and tracking
- Resource allocation and capacity planning
- Performance metrics and KPIs

### 6. Integration & External Systems (`06_integration_external_systems.sql`)

**Core Tables:**
- `external_systems` - Integration system registry
- `sync_log` - Data synchronization history
- `documents` - Document management with version control
- `audit_log` - Comprehensive system audit trail
- `notifications` - Multi-channel notification system

**Integration Support:**
- ERP systems (financial and inventory sync)
- Document management systems
- Shipping and logistics systems
- Customer portals and communication

### 7. Data Security & Audit (`07_data_security_audit.sql`)

**Security Features:**
- Row-level security (RLS) policies
- Column-level encryption for sensitive data
- Automatic audit triggers for all tables
- Data retention and archival policies
- PII detection and protection
- GDPR/CCPA compliance support

**Key Components:**
- Encryption functions for sensitive data
- Permission checking functions
- Audit trail with complete change tracking
- Data quality monitoring and validation
- Automated retention policy execution

## Performance Optimization

### Materialized Views
- `mv_order_summary` - Pre-calculated order dashboard data
- `mv_inventory_hierarchy` - Cached product hierarchy

### Key Indexes
- Composite indexes for common query patterns
- Full-text search indexes for products and documents
- Partial indexes for active records only
- GIN indexes for JSONB and array fields

### Performance Monitoring
- Slow query analysis and optimization
- Table and index usage statistics
- Automated performance alerting
- System health monitoring

## Security Implementation

### Authentication & Authorization
- Role-based access control (RBAC)
- Multi-factor authentication support
- Session management with timeout
- Password policy enforcement

### Data Protection
- Row-level security policies
- Column-level encryption
- Audit logging for all changes
- Data retention and archival

### Compliance
- GDPR data protection features
- PII detection and masking
- Comprehensive audit trails
- Data quality monitoring

## Testing and Validation

### Performance Testing
```sql
-- Generate test data
SELECT generate_performance_test_data(1000, 100, 50, 500);

-- Run performance benchmarks
SELECT run_performance_benchmarks();

-- Simulate concurrent load
SELECT simulate_concurrent_load(25, 100);

-- Generate performance report
SELECT generate_performance_report();
```

### Data Quality Testing
```sql
-- Run data quality checks
SELECT * FROM data_quality_rules WHERE is_active = true;

-- Check system health
SELECT get_system_health_status();
```

## Maintenance Procedures

### Regular Maintenance
```sql
-- Update table statistics (weekly)
ANALYZE;

-- Refresh materialized views (daily)  
SELECT refresh_all_materialized_views();

-- Check performance thresholds (daily)
SELECT check_performance_thresholds();

-- Execute retention policies (monthly)
SELECT execute_retention_policy(policy_id) FROM data_retention_policies WHERE is_active = true;
```

### Backup Procedures
```bash
# Daily backup
pg_dump -U torvan_user -d torvan_workflow -f torvan_backup_$(date +%Y%m%d).sql

# Archive old backups (keep last 30 days)
find /backup/path -name "torvan_backup_*.sql" -mtime +30 -delete
```

## Troubleshooting

### Common Issues

1. **Slow BOM Generation**
   - Check assembly_components indexes
   - Validate configuration complexity
   - Review business rules performance

2. **High Memory Usage**
   - Check for long-running queries
   - Review materialized view refresh frequency
   - Monitor connection pool usage

3. **Authentication Issues**
   - Verify user_roles assignments
   - Check session timeout settings
   - Review security event logs

### Performance Diagnostics
```sql
-- Check slow queries
SELECT * FROM v_slow_queries LIMIT 10;

-- Monitor table sizes
SELECT * FROM v_table_sizes ORDER BY size_bytes DESC LIMIT 10;

-- Review index usage
SELECT * FROM v_index_usage WHERE idx_tup_read > 1000 ORDER BY idx_tup_read DESC;
```

## Support and Documentation

### Additional Resources
- System Architecture Document: `SYSTEM_ARCHITECTURE.md`
- Data Architecture Document: `DATA_ARCHITECTURE_COMPREHENSIVE.md`
- Security Architecture Document: `SECURITY_ARCHITECTURE.md`
- Performance Architecture Document: `PERFORMANCE_SCALABILITY_ARCHITECTURE.md`

### Contact Information
For database schema questions or issues:
- Technical Architecture Team
- Database Administrator Team
- System Integration Team

## Version History

- **v1.0.0** - Initial database schema release
  - Complete schema implementation
  - Performance optimization
  - Security framework
  - Testing and validation suite

## License

Copyright © 2025 TORVAN Medical Systems. All rights reserved.

---

**⚠️ IMPORTANT SECURITY NOTES:**
1. Change default admin password immediately after deployment
2. Configure proper network security and firewall rules
3. Set up regular backup procedures
4. Enable SSL/TLS for all database connections
5. Review and customize security policies for your environment