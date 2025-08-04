# Contributing to TORVAN Medical Workflow Management System

Welcome to the TORVAN project! This document outlines our development workflow and contribution guidelines for medical software development.

## 🏥 Medical Software Compliance

TORVAN is a medical device workflow management system subject to regulatory requirements including:
- FDA 21 CFR Part 820 (Quality System Regulation)
- ISO 13485 (Medical devices - Quality management systems)
- IEC 62304 (Medical device software - Software life cycle processes)
- HIPAA compliance for Protected Health Information (PHI)

All contributions must maintain these compliance standards.

## 📋 Prerequisites

- Node.js 18+ and npm
- Git 2.30+
- Understanding of medical software development principles
- Familiarity with TypeScript, Next.js, and tRPC

## 🌿 Branching Strategy

### Branch Types

1. **main** - Production-ready code, always deployable
2. **develop** - Integration branch for features (when using GitFlow)
3. **feature/** - New features and enhancements
4. **fix/** - Bug fixes
5. **hotfix/** - Critical production fixes
6. **release/** - Release preparation
7. **medical/** - Medical device specific features
8. **regulatory/** - Regulatory compliance updates

### Branch Naming Convention

```
<type>/<issue-number>-<short-description>

Examples:
feature/123-barcode-scanning
fix/456-authentication-timeout
medical/789-patient-monitoring-dashboard
regulatory/101-fda-compliance-update
hotfix/critical-security-patch
```

### Branch Workflow

1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/123-new-feature
   ```

2. **Work on Feature**
   - Make atomic commits with descriptive messages
   - Follow commit message conventions
   - Run tests frequently

3. **Stay Updated**
   ```bash
   git fetch origin
   git rebase origin/main
   ```

4. **Push and Create PR**
   ```bash
   git push -u origin feature/123-new-feature
   # Create pull request via GitHub
   ```

## 📝 Commit Message Standards

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `security`: Security-related changes
- `medical`: Medical device functionality
- `regulatory`: Regulatory compliance
- `compliance`: General compliance
- `audit`: Audit trail changes

### Examples
```
feat(inventory): add barcode scanning for medical devices

Implements QR and Data Matrix barcode scanning to improve
inventory tracking accuracy and reduce manual entry errors.

Closes #123
Risk-Level: Low
FDA-Reference: 21CFR820.70
```

```
fix(auth): resolve authentication timeout for surgical staff

Authentication sessions were timing out during long surgical
procedures, causing workflow interruptions.

Fixes #456
Risk-Level: Medium
Tested-By: QA Team
```

### Medical Software Guidelines
- Include regulatory context when applicable
- Specify risk level for medical device changes
- Reference quality management system documents
- Consider patient safety impact
- Maintain audit trail completeness

## 🔄 Development Workflow

### 1. Setup Development Environment
```bash
# Clone repository
git clone <repository-url>
cd torvan-workflow

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Configure database and other services

# Run development server
npm run dev
```

### 2. Code Quality Standards

#### Pre-commit Checks
Our Git hooks automatically run:
- Prettier code formatting
- ESLint linting
- TypeScript type checking
- Sensitive data detection
- PHI/PII pattern scanning

#### Manual Quality Checks
```bash
# Format code
npm run format

# Lint code
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Run tests
npm run test
npm run test:coverage

# Build check
npm run build
```

### 3. Testing Requirements

#### Test Categories
- **Unit Tests**: Individual components and functions
- **Integration Tests**: API endpoints and database interactions
- **E2E Tests**: Complete user workflows
- **Security Tests**: Authentication and authorization
- **Compliance Tests**: Medical software requirements

#### Testing Standards
```bash
# Run all tests
npm run test

# Watch mode during development
npm run test:watch

# Coverage reporting (minimum 80% for medical software)
npm run test:coverage
```

### 4. Code Review Process

#### Pull Request Requirements
- [ ] Descriptive title and detailed description
- [ ] All CI checks passing
- [ ] Test coverage maintained or improved
- [ ] Documentation updated if needed
- [ ] No sensitive data exposure
- [ ] Medical software compliance verified
- [ ] Security implications assessed

#### Review Checklist
- [ ] Code follows project conventions
- [ ] Tests are comprehensive and meaningful
- [ ] Error handling is appropriate
- [ ] Security best practices followed
- [ ] Medical device requirements met
- [ ] Regulatory compliance maintained
- [ ] Performance impact considered
- [ ] Documentation is clear and complete

## 🚀 Release Process

### Version Numbering
Following Semantic Versioning (SemVer) with medical software considerations:
- **MAJOR.MINOR.PATCH**
- **MAJOR**: Breaking changes or significant medical device updates
- **MINOR**: New features, non-breaking changes
- **PATCH**: Bug fixes, security patches

### Release Types
1. **Development Release** (alpha): Internal testing
2. **Beta Release**: Limited external testing
3. **Release Candidate**: Final testing before production
4. **Production Release**: Full deployment
5. **Hotfix Release**: Critical security or safety fixes

### Release Workflow
```bash
# Create release branch
git checkout -b release/v1.2.0

# Update version and changelog
npm version minor
# Update CHANGELOG.md

# Test thoroughly
npm run test
npm run build
npm run test:e2e

# Merge to main
git checkout main
git merge release/v1.2.0
git tag v1.2.0

# Deploy to production
# (Following medical device deployment procedures)
```

## 🔒 Security Guidelines

### Sensitive Data Protection
- Never commit passwords, API keys, or credentials
- Use environment variables for configuration
- Encrypt PHI/PII data at rest and in transit
- Follow HIPAA compliance requirements
- Regular security audits and penetration testing

### Code Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure authentication and authorization
- Regular dependency updates

## 📊 Medical Device Compliance

### Documentation Requirements
- Design controls documentation
- Risk management files (ISO 14971)
- Software life cycle processes (IEC 62304)
- Usability engineering files (IEC 62366)
- Clinical evaluation documentation

### Change Control Process
1. **Change Request**: Document proposed changes
2. **Impact Assessment**: Evaluate safety and efficacy impact
3. **Review and Approval**: Quality assurance review
4. **Implementation**: Follow controlled development process
5. **Verification**: Confirm changes meet requirements
6. **Documentation**: Update all relevant documentation

### Audit Trail Requirements
- All commits are part of the audit trail
- Commit messages must provide regulatory context
- Code reviews documented and traceable
- Testing results maintained
- Deployment records preserved

## 🆘 Support and Resources

### Getting Help
- Internal documentation: `/docs` directory
- Team lead: [Contact Information]
- QA Team: [Contact Information]
- Regulatory Affairs: [Contact Information]

### External Resources
- [FDA Software Guidelines](https://www.fda.gov/medical-devices/software-medical-device-samd)
- [ISO 13485 Standards](https://www.iso.org/standard/59752.html)
- [IEC 62304 Guidelines](https://www.iec.ch/webstore/publication.htm?csnumber=38421)

## 📋 Issue Reporting

### Bug Reports
Use the bug report template with:
- Detailed reproduction steps
- Expected vs actual behavior
- Environment information
- Screenshots/logs when applicable
- Medical device impact assessment

### Feature Requests
Use the feature request template with:
- Medical use case description
- Regulatory requirements consideration
- User story format
- Acceptance criteria
- Risk assessment

### Security Issues
Report security vulnerabilities privately:
- Email: security@torvan.medical
- Include detailed vulnerability description
- Provide proof of concept if safe to do so
- Allow reasonable time for fixes before disclosure

---

## ⚖️ License and Compliance

This project contains medical device software subject to regulatory oversight. All contributions must comply with applicable medical device regulations and quality management systems.

By contributing, you agree to maintain confidentiality of patient data and comply with all applicable regulations including but not limited to FDA, HIPAA, and ISO standards.

---

*This document is maintained by the TORVAN development team and updated regularly to reflect current medical software development best practices.*