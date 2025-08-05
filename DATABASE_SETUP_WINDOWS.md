# TORVAN PostgreSQL Database Setup Guide - Windows Computer

## Overview
This guide covers setting up PostgreSQL connection for the TORVAN Medical Workflow Management System on a Windows work computer.

## Prerequisites
- PostgreSQL installed on Windows work computer
- Network access between development machine and work computer
- Admin access to configure PostgreSQL server

## Windows PostgreSQL Server Setup

### 1. Install PostgreSQL on Windows
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use chocolatey
choco install postgresql
```

### 2. Configure PostgreSQL for Remote Access

#### Edit postgresql.conf
Location: `C:\Program Files\PostgreSQL\[version]\data\postgresql.conf`

```ini
# Connection Settings
listen_addresses = '*'          # Listen on all interfaces
port = 5432                    # Default PostgreSQL port

# Memory Settings (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 64MB
maintenance_work_mem = 256MB

# Logging for development
log_statement = 'all'
log_min_duration_statement = 1000  # Log slow queries (1 second)
```

#### Edit pg_hba.conf
Location: `C:\Program Files\PostgreSQL\[version]\data\pg_hba.conf`

Add entries for your development machine:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    torvan_workflow torvan_user     192.168.1.0/24         md5
host    torvan_test     torvan_user     192.168.1.0/24         md5
```

### 3. Create Database and User

Open Command Prompt as Administrator and run:
```cmd
# Connect to PostgreSQL
psql -U postgres

# Create database user
CREATE USER torvan_user WITH PASSWORD 'your_secure_password_here';

# Create databases
CREATE DATABASE torvan_workflow OWNER torvan_user;
CREATE DATABASE torvan_test OWNER torvan_user;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE torvan_workflow TO torvan_user;
GRANT ALL PRIVILEGES ON DATABASE torvan_test TO torvan_user;

# Exit psql
\q
```

### 4. Windows Firewall Configuration

```cmd
# Allow PostgreSQL through Windows Firewall
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432
```

### 5. Restart PostgreSQL Service

```cmd
# Stop PostgreSQL service
net stop postgresql-x64-[version]

# Start PostgreSQL service  
net start postgresql-x64-[version]
```

## Environment Configuration

### 1. Create .env.local on Development Machine

```env
# Database Configuration - Windows Work Computer
DATABASE_URL="postgresql://torvan_user:your_secure_password_here@WORK_COMPUTER_IP:5432/torvan_workflow"

# Test Database
TEST_DATABASE_URL="postgresql://torvan_user:your_secure_password_here@WORK_COMPUTER_IP:5432/torvan_test"

# NextAuth.js Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here-minimum-32-characters"

# Application Configuration
NODE_ENV="development"
PORT="3000"

# Medical Device Compliance
MEDICAL_DEVICE_MODE="true" 
HIPAA_COMPLIANCE="true"
FDA_VALIDATION="true"
AUDIT_LOGGING_ENABLED="true"

# Security Configuration
ALLOWED_ORIGINS="http://localhost:3000"
SESSION_MAX_AGE="28800"
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Password Policy
PASSWORD_MIN_LENGTH="12"
PASSWORD_EXPIRY_DAYS="90" 
PASSWORD_HISTORY_COUNT="5"
MAX_LOGIN_ATTEMPTS="5"
ACCOUNT_LOCKOUT_DURATION="1800"
```

### 2. Network Configuration

#### Find Windows Computer IP Address
```cmd
# On Windows work computer
ipconfig

# Look for IPv4 Address under your active network adapter
# Example: 192.168.1.100
```

#### Test Connection from Development Machine
```bash
# Test PostgreSQL connection
psql -h WORK_COMPUTER_IP -p 5432 -U torvan_user -d torvan_workflow

# Or use telnet to test port
telnet WORK_COMPUTER_IP 5432
```

## Database Migration and Seeding

### 1. Generate Prisma Client
```bash
npm run db:generate
```

### 2. Push Database Schema
```bash
npm run db:push
```

### 3. Seed Database with Initial Data
```bash
npm run db:seed
```

### 4. Verify Connection
```bash
# Open Prisma Studio to verify
npm run db:studio
```

## Troubleshooting

### Common Issues

#### Connection Refused
- Check Windows Firewall settings
- Verify PostgreSQL service is running
- Confirm listen_addresses in postgresql.conf

#### Authentication Failed
- Verify user credentials
- Check pg_hba.conf entries
- Ensure password is correct

#### Network Issues
- Test port 5432 connectivity
- Check corporate firewall/VPN settings
- Verify IP addresses are correct

### Windows-Specific Commands

#### Check PostgreSQL Service Status
```cmd
sc query postgresql-x64-[version]
```

#### View PostgreSQL Logs
```cmd
# Default log location
type "C:\Program Files\PostgreSQL\[version]\data\log\postgresql-*.log"
```

#### PostgreSQL Configuration Test
```cmd
# Test configuration
"C:\Program Files\PostgreSQL\[version]\bin\postgres.exe" --config-file="C:\Program Files\PostgreSQL\[version]\data\postgresql.conf" -D "C:\Program Files\PostgreSQL\[version]\data" -t
```

## Security Considerations

### Production Deployment
1. Change default passwords
2. Restrict pg_hba.conf to specific IP addresses
3. Enable SSL/TLS encryption
4. Regular security updates
5. Monitor connection logs

### Medical Device Compliance
1. Enable audit logging
2. Implement backup procedures
3. Document all configuration changes
4. Regular security assessments

## Backup Strategy

### Automated Backup Script (Windows)
```batch
@echo off
set PGPASSWORD=your_secure_password_here
set BACKUP_DIR=C:\Database_Backups
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%

"C:\Program Files\PostgreSQL\[version]\bin\pg_dump.exe" -h localhost -U torvan_user torvan_workflow > "%BACKUP_DIR%\torvan_workflow_%DATE%.sql"

echo Backup completed: %BACKUP_DIR%\torvan_workflow_%DATE%.sql
```

## Next Steps
1. Configure .env.local with your Windows computer's IP address
2. Run database migrations
3. Test connection with Prisma Studio
4. Begin development with connected database