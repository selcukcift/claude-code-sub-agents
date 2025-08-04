# TORVAN Medical Workflow Management System

[![Medical Software](https://img.shields.io/badge/Medical%20Software-FDA%20Ready-blue)](https://www.fda.gov/medical-devices/software-medical-device-samd)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11.4.3-blue)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.13.0-darkblue)](https://www.prisma.io/)

A comprehensive medical workflow management system built with enterprise-grade architecture and medical device compliance standards.

## 🏥 Medical Software Compliance

This system is designed following:
- **FDA Software as Medical Device (SaMD)** guidelines
- **ISO 13485** medical device quality management
- **ISO 14971** risk management for medical devices
- **IEC 62304** medical device software lifecycle processes
- **HIPAA** privacy and security requirements

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm/yarn/pnpm
- PostgreSQL 15+ database
- Git with proper SSH keys configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd torvan-workflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials and API keys
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # Seed initial data
   npm run db:seed
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **UI Components**: Radix UI with shadcn/ui design system
- **Backend**: tRPC for type-safe APIs, NextAuth for authentication
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Vercel-ready with Docker support

### Project Structure

```
torvan-workflow/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # Reusable UI components
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Base UI components (shadcn/ui)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and configurations
│   ├── server/             # tRPC server and API routes
│   │   └── api/            # API route handlers
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper utilities
├── database/               # Database schemas, migrations, and seeds
├── public/                 # Static assets
├── .github/                # GitHub templates and workflows
└── docs/                   # Project documentation
```

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run clean            # Clean build cache and dependencies

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # Run TypeScript type checking
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run database migrations
npm run db:migrate:reset # Reset database and run all migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database with initial data

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

## 🌿 Git Workflow & Branching Strategy

### Branch Structure

- **`main`** - Production-ready code, always stable
- **`develop`** - Integration branch for features
- **`feature/*`** - Feature development branches
- **`release/*`** - Release preparation branches
- **`hotfix/*`** - Critical production fixes

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature-name
   ```

2. **Development Process**
   ```bash
   # Make changes, commit following conventional commits
   git add .
   git commit -m "feat: add new medical workflow feature"
   ```

3. **Create Pull Request**
   ```bash
   git push origin feature/new-feature-name
   # Create PR to develop branch via GitHub
   ```

4. **Code Review & Merge**
   - All PRs require code review
   - Automated tests must pass
   - Security scans must pass
   - Documentation must be updated

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/modifications
- `chore:` - Maintenance tasks

## 🔒 Security & Compliance

### Security Measures

- **Authentication**: NextAuth with OAuth2/OIDC
- **Authorization**: Role-based access control (RBAC)
- **Data Encryption**: At-rest and in-transit encryption
- **Audit Logging**: Comprehensive audit trail
- **Input Validation**: Zod schema validation
- **CSRF Protection**: Built-in Next.js protections

### Compliance Documentation

- **Risk Assessment**: See `COMPREHENSIVE_RISK_ASSESSMENT.md`
- **Security Architecture**: See `COMPREHENSIVE_SECURITY_ARCHITECTURE.md`
- **Risk Register**: See `RISK_REGISTER.md`
- **API Specification**: See `TORVAN_API_SPECIFICATION.md`

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and development process.

### Development Setup for Contributors

1. **Fork and Clone**
2. **Install Dependencies**
3. **Set up Pre-commit Hooks**
   ```bash
   npm run prepare
   ```
4. **Create Feature Branch**
5. **Make Changes with Tests**
6. **Submit Pull Request**

## 📋 Claude AI Development Agents

This project includes specialized Claude AI agents for enhanced development:

- **Next.js Frontend Architect** - Enterprise React development
- **Shadcn UI Specialist** - Accessible component development
- **Tailwind Design System** - Consistent medical UI/UX
- **tRPC API Architect** - Type-safe medical data APIs
- **Project Orchestrator** - Overall project coordination

See `.claude/agents/` directory for agent configurations.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Security**: Report security vulnerabilities via GitHub Security tab
- **Documentation**: Check the `docs/` directory for detailed documentation

## 🔄 Deployment

### Production Deployment

```bash
# Build and test
npm run build
npm run test

# Deploy to Vercel
vercel --prod

# Or deploy with Docker
docker build -t torvan-workflow .
docker run -p 3000:3000 torvan-workflow
```

### Environment Variables

Required environment variables for production:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-domain.com"
# Additional API keys and configurations
```

## 📊 Project Status

- ✅ **Project Setup**: Complete
- ✅ **Basic Architecture**: Complete
- 🚧 **Core Features**: In Development
- ⏳ **Testing Suite**: Planned
- ⏳ **Documentation**: In Progress
- ⏳ **Deployment**: Planned

---

**Built with ❤️ for medical professionals worldwide**
