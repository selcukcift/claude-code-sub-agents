# TORVAN WORKFLOW DATABASE SETUP

This document provides setup instructions for the TORVAN Medical Workflow Management System database.

## Prerequisites

1. **PostgreSQL 15+** installed and running
2. **Node.js 18+** with npm
3. **Prisma CLI** (installed as project dependency)

## Database Setup Steps

### 1. Create Database

Connect to PostgreSQL and create the database:

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE torvan_workflow;

-- Create user (optional, for better security)
CREATE USER torvan_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE torvan_workflow TO torvan_user;

-- Exit PostgreSQL
\q
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and update the DATABASE_URL:

```env
# For default postgres user
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/torvan_workflow?schema=public"

# Or for custom user
DATABASE_URL="postgresql://torvan_user:secure_password@localhost:5432/torvan_workflow?schema=public"
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run Database Migration

This will create all tables and indexes:

```bash
npm run db:push
```

### 5. Seed Initial Data

This will populate the database with initial categories, roles, permissions, and admin user:

```bash
npm run db:seed
```

### 6. Verify Setup

Test the database connection:

```bash
npx tsx scripts/test-db.ts
```

## Database Schema Overview

The database consists of several main domains:

### 1. User Management & Security
- **users** - User accounts with authentication
- **roles** - Role definitions (Admin, Production Coordinator, etc.)
- **permissions** - Granular permission system
- **user_roles** - User-role assignments
- **role_permissions** - Role-permission mappings

### 2. Inventory Management (4-Level Hierarchy)
- **categories** - Top-level product categories (718, 719, 720, etc.)
- **subcategories** - Second-level organization
- **assemblies** - Third-level orderable products
- **parts** - Individual components and materials
- **assembly_components** - Junction table for assembly composition

### 3. Order Management
- **customers** - Customer information
- **orders** - Order header with 8-phase lifecycle
- **order_items** - Individual line items
- **order_status_history** - Complete audit trail

### 4. BOM Generation & Configuration
- **configurations** - Product configuration parameters
- **boms** - Generated Bill of Materials
- **bom_line_items** - Individual BOM components
- **configuration_rules** - Business rules engine

### 5. Quality Control & Production
- **qc_processes** - Quality control definitions
- **qc_inspections** - Inspection records
- **qc_inspection_items** - Individual inspection items
- **production_tasks** - Task assignments and tracking

### 6. Integration & External Systems
- **external_systems** - External system configurations
- **sync_log** - Data synchronization history
- **documents** - Document management
- **audit_log** - Complete audit trail

## Performance Features

- **Optimized Indexes** - Comprehensive indexing for <2s query performance
- **Full-Text Search** - GIN indexes for parts and assemblies
- **JSON Support** - Configuration and specification storage
- **Hierarchical Queries** - Efficient category/assembly traversal

## Initial Data

After seeding, the system includes:

- **6 Categories** - 718-723 product categories
- **6 Subcategories** - Example subcategory structure
- **6 User Roles** - Complete role hierarchy
- **15 Permissions** - Granular access control
- **1 Admin User** - Default administrator account
- **1 Sample Customer** - Example customer record
- **2 Configuration Rules** - Example business rules
- **2 External Systems** - ERP and Document Management placeholders

## Admin Login

After seeding, you can log in with:

- **Username:** admin
- **Email:** admin@torvan.com
- **Password:** admin123 (must change on first login)

## Development Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create and apply migrations
npm run db:migrate

# Reset database (development only)
npm run db:migrate:reset

# Open Prisma Studio
npm run db:studio

# Run database tests
npx tsx scripts/test-db.ts
```

## Troubleshooting

### Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check database exists: `sudo -u postgres psql -l`
3. Verify user permissions: `sudo -u postgres psql -c "\du"`
4. Test connection: `psql -h localhost -U torvan_user -d torvan_workflow`

### Migration Issues

1. Check schema syntax: `npx prisma format`
2. Validate schema: `npx prisma validate`
3. Reset and retry: `npm run db:migrate:reset`

### Performance Issues

1. Check active connections: `SELECT * FROM pg_stat_activity;`
2. Analyze slow queries: `SELECT * FROM pg_stat_statements ORDER BY total_time DESC;`
3. Update table statistics: `ANALYZE;`

## Security Considerations

1. **Use environment variables** - Never commit DATABASE_URL to version control
2. **Create dedicated user** - Don't use postgres superuser in production
3. **Enable SSL** - Add `?sslmode=require` for production
4. **Regular backups** - Implement automated backup strategy
5. **Monitor access** - Review audit logs regularly

## Backup & Recovery

### Create Backup
```bash
pg_dump -h localhost -U torvan_user -d torvan_workflow > backup.sql
```

### Restore Backup
```bash
psql -h localhost -U torvan_user -d torvan_workflow < backup.sql
```

For production systems, implement automated backup strategies with tools like pgBackRest or similar.