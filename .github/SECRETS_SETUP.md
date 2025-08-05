# TORVAN MEDICAL DEVICE - SECRETS MANAGEMENT SETUP
# ================================================

This document provides a comprehensive guide for setting up secrets management for the TORVAN medical device workflow management system. All secrets must be properly configured to ensure secure deployment and compliance with medical device regulations.

## 🔐 Secrets Architecture

The TORVAN system uses a layered secrets management approach:

1. **GitHub Secrets**: For CI/CD pipeline and deployment credentials
2. **Environment Variables**: For non-sensitive configuration
3. **External Secret Managers**: For production secrets rotation
4. **Kubernetes Secrets**: For runtime application secrets

## 📋 Required Secrets by Environment

### 🏗️ Development Environment

```bash
# Database
DATABASE_URL="postgresql://dev_user:dev_pass@localhost:5432/torvan_dev"

# Authentication  
NEXTAUTH_SECRET="development-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# External Services (Test)
SMTP_HOST="localhost"
SMTP_USER="test@example.com"
SMTP_PASSWORD="test-password"
```

### 🧪 Staging Environment

Configure in GitHub Secrets (Settings > Secrets and variables > Actions):

```
Repository Secrets:
├── STAGING_DATABASE_URL
├── NEXTAUTH_SECRET
├── NEXTAUTH_URL
├── SMTP_HOST
├── SMTP_USER  
├── SMTP_PASSWORD
├── DATADOG_API_KEY
├── SENTRY_DSN
├── FDA_API_KEY
├── AUDIT_ENCRYPTION_KEY
├── STRIPE_SECRET_KEY
├── AWS_ACCESS_KEY_ID
└── AWS_SECRET_ACCESS_KEY
```

### 🏥 Production Environment

Configure in GitHub Secrets with additional security:

```
Repository Secrets (Production):
├── PROD_DATABASE_URL
├── DB_USER_PRODUCTION
├── DB_PASSWORD_PRODUCTION
├── DB_READONLY_USER
├── DB_READONLY_PASSWORD
├── NEXTAUTH_SECRET_PRODUCTION
├── NEXTAUTH_URL_PRODUCTION
├── JWT_SIGNING_KEY
├── OAUTH_CLIENT_SECRET
├── SMTP_HOST_PRODUCTION
├── SMTP_USER_PRODUCTION
├── SMTP_PASSWORD_PRODUCTION
├── DATADOG_API_KEY_PRODUCTION
├── SENTRY_DSN_PRODUCTION
├── NEW_RELIC_LICENSE_KEY
├── PROMETHEUS_TOKEN
├── FDA_API_KEY_PRODUCTION
├── AUDIT_ENCRYPTION_KEY_PRODUCTION
├── COMPLIANCE_REPORTING_KEY
├── RISK_MANAGEMENT_API_KEY
├── STRIPE_SECRET_KEY_PRODUCTION
├── STRIPE_WEBHOOK_SECRET
├── AWS_ACCESS_KEY_ID_PRODUCTION
├── AWS_SECRET_ACCESS_KEY_PRODUCTION
├── AWS_REGION
├── BACKUP_ENCRYPTION_KEY
├── DR_SITE_ACCESS_KEY
├── SSL_CERTIFICATE
└── SSL_PRIVATE_KEY
```

## 🔧 Secrets Setup Instructions

### Step 1: Generate Secure Secrets

```bash
#!/bin/bash
# Generate secure secrets for TORVAN medical device system

echo "🔐 Generating secure secrets for TORVAN..."

# Generate NextAuth secret (32 bytes, base64 encoded)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET: $NEXTAUTH_SECRET"

# Generate JWT signing key (256-bit for HS256)
JWT_SIGNING_KEY=$(openssl rand -base64 32)
echo "JWT_SIGNING_KEY: $JWT_SIGNING_KEY"

# Generate audit encryption key (AES-256)
AUDIT_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "AUDIT_ENCRYPTION_KEY: $AUDIT_ENCRYPTION_KEY"

# Generate backup encryption key
BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "BACKUP_ENCRYPTION_KEY: $BACKUP_ENCRYPTION_KEY"

# Generate compliance reporting key
COMPLIANCE_REPORTING_KEY=$(openssl rand -base64 32)
echo "COMPLIANCE_REPORTING_KEY: $COMPLIANCE_REPORTING_KEY"

echo "✅ Secrets generated successfully"
echo "⚠️  Store these secrets securely and add to GitHub Secrets"
```

### Step 2: Configure GitHub Secrets

1. **Navigate to Repository Settings**
   ```
   GitHub Repository > Settings > Secrets and variables > Actions
   ```

2. **Add Repository Secrets**
   - Click "New repository secret"
   - Enter secret name (exactly as shown above)
   - Enter secret value
   - Click "Add secret"

3. **Add Environment Secrets**
   ```
   GitHub Repository > Settings > Environments
   Select environment (staging/production)
   Add environment-specific secrets
   ```

### Step 3: Configure Database Secrets

#### PostgreSQL Database URLs

```bash
# Staging Database URL Format
STAGING_DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

# Production Database URL Format (with SSL)
PROD_DATABASE_URL="postgresql://username:password@prod-db.torvan.dev:5432/torvan_production?sslmode=require&sslcert=client-cert.pem&sslkey=client-key.pem&sslrootcert=ca-cert.pem"

# Read-only user for reporting
DB_READONLY_USER="torvan_readonly"
DB_READONLY_PASSWORD="<secure-readonly-password>"
```

#### Database Secret Security

- Use strong passwords (minimum 32 characters)
- Enable SSL/TLS connections
- Use certificate-based authentication for production
- Rotate passwords quarterly
- Use connection pooling credentials

### Step 4: Configure External Service Secrets

#### SMTP Configuration

```bash
# Production SMTP (using AWS SES)
SMTP_HOST_PRODUCTION="email-smtp.us-east-1.amazonaws.com"
SMTP_USER_PRODUCTION="<SMTP-USERNAME>"
SMTP_PASSWORD_PRODUCTION="<SMTP-PASSWORD>"
```

#### Monitoring Services

```bash
# Datadog
DATADOG_API_KEY_PRODUCTION="<datadog-api-key>"

# Sentry
SENTRY_DSN_PRODUCTION="https://<key>@<organization>.ingest.sentry.io/<project>"

# New Relic
NEW_RELIC_LICENSE_KEY="<newrelic-license-key>"
```

#### Medical Device Compliance APIs

```bash
# FDA API access
FDA_API_KEY_PRODUCTION="<fda-api-key>"

# Risk management system
RISK_MANAGEMENT_API_KEY="<risk-mgmt-api-key>"

# Compliance reporting
COMPLIANCE_REPORTING_KEY="<compliance-key>"
```

### Step 5: Configure Cloud Infrastructure Secrets

#### AWS Configuration

```bash
# Production AWS credentials
AWS_ACCESS_KEY_ID_PRODUCTION="<aws-access-key>"
AWS_SECRET_ACCESS_KEY_PRODUCTION="<aws-secret-key>"
AWS_REGION="us-east-1"

# Backup and DR
DR_SITE_ACCESS_KEY="<disaster-recovery-key>"
```

#### SSL Certificates

```bash
# Production SSL certificate
SSL_CERTIFICATE="-----BEGIN CERTIFICATE-----
<certificate-content>
-----END CERTIFICATE-----"

SSL_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
<private-key-content>
-----END PRIVATE KEY-----"
```

## 🔄 Secrets Rotation Policy

### Medical Device Compliance Requirements

1. **Rotation Frequency**
   - Critical secrets: Monthly
   - Database passwords: Quarterly  
   - API keys: Quarterly
   - SSL certificates: Annually

2. **Rotation Process**
   ```bash
   # Automated rotation workflow
   1. Generate new secret
   2. Update staging environment
   3. Validate staging deployment
   4. Update production environment
   5. Verify production health
   6. Revoke old secret
   7. Update audit documentation
   ```

3. **Emergency Rotation**
   - Immediate rotation for compromised secrets
   - 24/7 on-call response
   - Incident documentation required

### Rotation Automation

```yaml
# .github/workflows/secrets-rotation.yml
name: Secrets Rotation
on:
  schedule:
    - cron: '0 2 1 * *'  # Monthly on 1st at 2 AM
  workflow_dispatch:

jobs:
  rotate-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Rotate database passwords
        run: |
          # Automated rotation logic
          echo "Rotating database passwords..."
      
      - name: Update API keys
        run: |
          # API key rotation logic
          echo "Rotating API keys..."
      
      - name: Notify compliance team
        run: |
          # Compliance notification
          echo "Secrets rotation completed"
```

## 🛡️ Security Best Practices

### Secret Generation

1. **Use cryptographically secure random generators**
   ```bash
   # Good: OpenSSL random
   openssl rand -base64 32
   
   # Good: /dev/urandom
   head -c 32 /dev/urandom | base64
   
   # Bad: Simple random functions
   echo $RANDOM  # Never use this
   ```

2. **Minimum Secret Strength**
   - Passwords: 32+ characters
   - API keys: Provider-specific format
   - Encryption keys: 256-bit minimum
   - Certificates: 2048-bit RSA minimum

### Secret Storage

1. **Never commit secrets to version control**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   secrets/
   *.key
   *.pem
   ```

2. **Use environment-specific secrets**
   - Separate secrets for each environment
   - Never share production secrets with staging
   - Use different encryption keys per environment

3. **Implement secrets scanning**
   ```bash
   # Pre-commit hook for secret detection
   #!/bin/bash
   detect-secrets scan --all-files --baseline .secrets.baseline
   ```

### Access Control

1. **Principle of Least Privilege**
   - Grant minimal necessary access
   - Use service-specific credentials
   - Regular access reviews

2. **Multi-factor Authentication**
   - Enable MFA for all secret management systems
   - Use hardware security keys where possible
   - Regular MFA token rotation

### Monitoring and Auditing

1. **Secret Access Logging**
   ```bash
   # Monitor secret access patterns
   - Unusual access times
   - Unexpected geographic locations
   - Failed authentication attempts
   - Bulk secret retrievals
   ```

2. **Automated Alerts**
   ```yaml
   alerts:
     - name: "Secret Access Anomaly"
       condition: "unusual_access_pattern"
       severity: "critical"
       notify: ["security-team"]
   ```

## 📋 Compliance Requirements

### FDA 21 CFR Part 820

- **Document Control**: All secret changes documented
- **Change Control**: Formal approval process for secret updates
- **Risk Management**: Risk assessment for secret compromise
- **Audit Trail**: Complete logging of secret lifecycle

### HIPAA Compliance

- **Administrative Safeguards**: Access control procedures
- **Physical Safeguards**: Secure storage of secret materials
- **Technical Safeguards**: Encryption and access controls
- **Audit Controls**: Comprehensive logging and monitoring

### ISO 13485 Requirements

- **Quality Management**: Secret management procedures
- **Risk Management**: ISO 14971 risk management process
- **Design Controls**: Secret security by design
- **Corrective Actions**: Response to secret incidents

## 🚨 Incident Response

### Secret Compromise Response

1. **Immediate Actions** (0-15 minutes)
   - Revoke compromised secret
   - Change authentication credentials
   - Alert security team
   - Begin incident documentation

2. **Short-term Actions** (15 minutes - 1 hour)
   - Generate new secrets
   - Update all systems
   - Verify system integrity
   - Notify compliance team

3. **Long-term Actions** (1-24 hours)
   - Complete incident report
   - Update security procedures
   - Regulatory notification if required
   - Lessons learned documentation

### Emergency Contacts

```
Security Team: security@torvan.dev
Compliance Team: compliance@torvan.dev
Engineering On-call: +1-555-TORVAN-1
Regulatory Affairs: regulatory@torvan.dev
```

## ✅ Verification Checklist

Before deploying to production, verify:

- [ ] All required secrets configured in GitHub
- [ ] Secrets follow naming conventions
- [ ] Strong secret generation methods used
- [ ] Environment-specific secrets separated
- [ ] Access controls properly configured
- [ ] Monitoring and alerting enabled
- [ ] Rotation schedule documented
- [ ] Incident response procedures tested
- [ ] Compliance requirements met
- [ ] Backup and recovery procedures documented

## 📞 Support and Documentation

For questions about secrets management:

- **Technical Support**: engineering@torvan.dev
- **Security Questions**: security@torvan.dev  
- **Compliance Questions**: compliance@torvan.dev
- **Emergency Support**: +1-555-TORVAN-1

**Last Updated**: December 2024  
**Next Review**: March 2025  
**Document Owner**: Security Team  
**Approval**: Medical Device Quality Assurance