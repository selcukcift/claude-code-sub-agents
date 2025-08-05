# TORVAN Database Migration & Setup Guide

## Quick Setup Steps

### 1. Environment Setup
```bash
# Copy environment template
cp .env.local.template .env.local

# Edit .env.local with your Windows PostgreSQL server details
# Replace WORK_COMPUTER_IP with actual IP address
# Replace passwords with secure values
```

### 2. Database Connection Test
```bash
# Test database connectivity
npm run db:generate

# If successful, you'll see Prisma client generated
```

### 3. Database Schema Migration
```bash
# Push schema to database (first time setup)
npm run db:push

# This creates all 26 tables for TORVAN system:
# - Users, Roles, Permissions (Authentication)
# - Categories, Assemblies, Sub-assemblies (Inventory)
# - Orders, OrderItems, BOM (Production)
# - AuditLogs, SystemSettings (Compliance)
```

### 4. Seed Database with Initial Data
```bash
# Run seeding script to populate initial data
npm run db:seed

# This creates:
# - Default admin user
# - 6 user roles (Admin, Production Coordinator, etc.)
# - 40+ permissions
# - Sample inventory categories
# - System configuration
```

## Detailed Migration Commands

### Development Workflow
```bash
# 1. Generate Prisma client (after schema changes)
npm run db:generate

# 2. Push changes to database (development)
npm run db:push

# 3. Reset database (if needed)
npm run db:migrate:reset

# 4. Create migration files (for production)
npm run db:migrate

# 5. Open database browser
npm run db:studio
```

### Database Verification

#### Check Tables Created
```sql
-- Connect to PostgreSQL and verify tables
\c torvan_workflow
\dt

-- Should show 26 tables:
-- Account, Assembly, AuditLog, BOM, BOMItem, Category
-- Component, ComponentStock, Notification, Order, OrderItem
-- PasswordReset, Permission, Role, RolePermission, Session
-- SubAssembly, SystemSetting, User, UserPassword, UserRole
-- UserSession, VerificationToken, WorkflowStep, WorkflowStepLog
-- ComponentCategory, Supplier
```

#### Verify Seeded Data
```bash
# Open Prisma Studio to browse data
npm run db:studio

# Check in browser at http://localhost:5555:
# - Users table should have admin user
# - Roles table should have 6 roles
# - Permissions table should have 40+ permissions
# - Categories should have sample data
```

## Database Schema Overview

### Core Tables Structure

#### Authentication & Authorization
- **User**: User accounts with medical device compliance
- **Role**: 6 predefined roles (Admin, Production Coordinator, QC Inspector, etc.)
- **Permission**: 40+ granular permissions
- **UserRole**: Many-to-many user-role assignments
- **RolePermission**: Role-based access control

#### Inventory Management
- **Category**: 6 main categories (Sink Components, Electrical, etc.)
- **Assembly**: 219 main assemblies
- **SubAssembly**: 481 sub-assemblies with hierarchical structure
- **Component**: Individual parts with 700-series numbering
- **ComponentStock**: Real-time inventory tracking

#### Production Workflow
- **Order**: Customer orders with 8-phase lifecycle
- **OrderItem**: Items within orders
- **BOM**: Bill of Materials with dynamic generation
- **BOMItem**: Individual BOM line items
- **WorkflowStep**: 8 workflow phases
- **WorkflowStepLog**: Audit trail for workflow changes

#### Compliance & Auditing
- **AuditLog**: FDA-compliant audit trail
- **SystemSetting**: Configuration management
- **UserSession**: Session management for security
- **PasswordReset**: Secure password reset workflow

## Troubleshooting

### Common Issues

#### "Database does not exist"
```bash
# Create database manually on Windows PostgreSQL
psql -U postgres -c "CREATE DATABASE torvan_workflow OWNER torvan_user;"
```

#### "Connection refused"
```bash
# Check PostgreSQL service on Windows
sc query postgresql-x64-14  # Replace 14 with your version

# Check if port 5432 is accessible
telnet WORK_COMPUTER_IP 5432
```

#### "Authentication failed"
```bash
# Verify user exists in PostgreSQL
psql -U postgres -c "SELECT * FROM pg_user WHERE usename='torvan_user';"
```

#### "Schema drift detected"
```bash
# Reset and resync schema
npm run db:migrate:reset
npm run db:push
npm run db:seed
```

### Performance Optimization

#### Database Indexing
The schema includes optimized indexes for:
- User authentication lookups
- Order workflow queries  
- BOM generation (sub-5 second requirement)
- Inventory searches
- Audit log filtering

#### Connection Pooling
```env
# Add to .env.local for production
DATABASE_URL="postgresql://torvan_user:password@ip:5432/torvan_workflow?connection_limit=20&pool_timeout=10"
```

## Data Migration Scripts

### Export Production Data
```bash
# Export orders and inventory (if migrating from existing system)
node scripts/export-production-data.js
```

### Import Legacy Data  
```bash
# Import from existing ERP/inventory systems
node scripts/import-legacy-data.js
```

## Medical Device Compliance

### Audit Trail Verification
```sql
-- Verify audit logging is working
SELECT COUNT(*) FROM "AuditLog" WHERE "createdAt" > NOW() - INTERVAL '24 hours';

-- Check user activity tracking  
SELECT "action", "userId", "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;
```

### Data Retention Policies
```bash
# Set up automated cleanup (add to cron/task scheduler)
node scripts/cleanup-audit-logs.js --days=2555  # 7 years FDA requirement
```

## Backup & Recovery

### Daily Backup (Windows)
```batch
# Add to Windows Task Scheduler
pg_dump -h WORK_COMPUTER_IP -U torvan_user torvan_workflow > backup_%date%.sql
```

### Point-in-Time Recovery
```bash
# Restore to specific point in time
pg_restore -h WORK_COMPUTER_IP -U torvan_user -d torvan_workflow backup_file.sql
```

## Next Steps After Migration

1. **Verify Data Integrity**: Run test queries to ensure all data migrated correctly
2. **Test Application**: Start development server and test key workflows
3. **Performance Testing**: Verify BOM generation meets <5 second requirement
4. **Security Testing**: Validate authentication and authorization
5. **Compliance Check**: Ensure audit logging is functioning

```bash
# Start development server
npm run dev

# Open application at http://localhost:3000
# Default admin login will be created during seeding
```