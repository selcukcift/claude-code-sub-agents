# TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
## COMPREHENSIVE SYSTEM ARCHITECTURE

### EXECUTIVE SUMMARY

This document defines the complete system architecture for the TORVAN MEDICAL workflow management system, supporting complex medical equipment manufacturing workflows with 6 user roles, hierarchical inventory management, dynamic BOM generation, and comprehensive order lifecycle management.

**Architecture Overview:**
- **Pattern**: Modular Monolith with API-first design
- **Frontend**: Next.js 15 with App Router, ShadCN UI components
- **Backend**: Next.js API Routes with tRPC for type-safe APIs
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with role-based access control
- **Deployment**: Containerized deployment on cloud infrastructure

---

## 1. OVERALL SYSTEM ARCHITECTURE

### 1.1 Architecture Pattern Selection

**DECISION: Modular Monolith Architecture**

**Rationale:**
- **Team Size**: Single development team, avoiding microservices complexity
- **Business Domain**: Tightly coupled business processes (order → BOM → production → QC)
- **Data Consistency**: Strong consistency requirements for inventory and order management
- **Development Speed**: Faster initial development and deployment
- **Operational Simplicity**: Single deployment unit, simplified monitoring and debugging

**Architecture Benefits:**
- Simplified deployment and testing
- Strong data consistency across modules
- Easier debugging and monitoring
- Lower operational overhead
- Clear module boundaries enable future service extraction

### 1.2 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                │
├─────────────────────────────────────────────────────────────────────┤
│  Web Browser (Desktop/Tablet)  │  Mobile PWA  │  Admin Dashboard   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                               HTTPS/WSS
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│           Next.js App Router with Server Components                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │  Role-Based     │ │   ShadCN UI     │ │   Responsive    │      │
│  │  UI Components  │ │   Components    │ │   Layout        │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                               tRPC API
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                      API LAYER                                     │
├─────────────────────────────────────────────────────────────────────┤
│                     tRPC Router Architecture                       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │   Order API     │ │ Inventory API   │ │   User API      │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │    BOM API      │ │    QC API       │ │  Service API    │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                            Service Layer
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                            │
├─────────────────────────────────────────────────────────────────────┤
│                      Domain Services                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │  Order Service  │ │Inventory Service│ │   BOM Service   │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │Workflow Service │ │   QC Service    │ │ Notification    │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                            Prisma ORM
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                      Prisma Client                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │   Repository    │ │    Repository   │ │   Repository    │      │
│  │    Pattern      │ │     Pattern     │ │     Pattern     │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                            Connection Pool
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                      PostgreSQL Database                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐      │
│  │   Primary DB    │ │   Read Replica  │ │   File Storage  │      │
│  │   (Write/Read)  │ │   (Read Only)   │ │   (Documents)   │      │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Technology Stack Architecture

**Frontend Stack:**
- **Next.js 15**: React framework with App Router for server-side rendering
- **TypeScript**: Type safety across the entire stack
- **ShadCN UI**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library for enhanced UX
- **React Hook Form**: Form handling with Zod validation
- **Zustand**: Lightweight state management for client state

**Backend Stack:**
- **Next.js API Routes**: Server-side API endpoints
- **tRPC**: End-to-end type safety for API calls
- **Prisma ORM**: Type-safe database access layer
- **NextAuth.js**: Authentication and session management
- **Zod**: Runtime type validation and schema definition
- **Node.js**: JavaScript runtime environment

**Database & Storage:**
- **PostgreSQL**: Primary relational database
- **Redis**: Caching and session storage
- **AWS S3**: File storage for documents and images
- **Prisma**: Database ORM and migration tool

**Infrastructure:**
- **Docker**: Containerization for consistent deployments
- **AWS/Azure**: Cloud infrastructure platform
- **GitHub Actions**: CI/CD pipeline
- **Vercel/AWS**: Deployment platform

---

## 2. COMPONENT ARCHITECTURE

### 2.1 Frontend Architecture

**Next.js App Router Structure:**
```
src/
├── app/                          # App Router directory
│   ├── (auth)/                   # Route groups for authentication
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── coordinator/          # Production Coordinator views
│   │   ├── procurement/          # Procurement views
│   │   ├── qc/                   # Quality Control views
│   │   ├── assembler/            # Assembler views
│   │   ├── service/              # Service Department views
│   │   └── admin/                # Admin views
│   ├── api/                      # API route handlers
│   │   ├── trpc/                 # tRPC router
│   │   └── auth/                 # NextAuth configuration
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # Reusable UI components
│   ├── ui/                       # ShadCN UI components
│   ├── forms/                    # Form components
│   ├── charts/                   # Data visualization
│   ├── layout/                   # Layout components
│   └── domain/                   # Business logic components
├── lib/                          # Shared utilities
│   ├── auth.ts                   # Auth configuration
│   ├── db.ts                     # Database connection
│   ├── utils.ts                  # Utility functions
│   └── validations.ts            # Zod schemas
├── server/                       # Server-side code
│   ├── api/                      # tRPC routers
│   ├── services/                 # Business logic services
│   └── repositories/             # Data access layer
└── types/                        # TypeScript type definitions
```

**Component Architecture Patterns:**

1. **Server Components**: Default for data fetching and static content
2. **Client Components**: For interactivity and state management
3. **Compound Components**: For complex UI like forms and modals
4. **Higher-Order Components**: For role-based rendering and permissions

### 2.2 State Management Architecture

**Multi-Layer State Management:**

1. **Server State**: Managed by tRPC with React Query
   - Automatic caching and synchronization
   - Optimistic updates for better UX
   - Background refetching and error handling

2. **Client State**: Managed by Zustand stores
   - UI state (modals, loading states)
   - Form state (multi-step workflows)
   - User preferences and settings

3. **URL State**: Managed by Next.js router
   - Search filters and pagination
   - Navigation state and deep linking
   - Route-based data loading

### 2.3 Role-Based UI Architecture

**Permission-Based Component Rendering:**
```typescript
// Higher-order component for role-based access
function withRoleAccess<T>(
  Component: React.ComponentType<T>,
  allowedRoles: UserRole[]
) {
  return function RoleProtectedComponent(props: T) {
    const { user } = useAuth();
    
    if (!allowedRoles.includes(user.role)) {
      return <AccessDenied />;
    }
    
    return <Component {...props} />;
  };
}

// Usage example
const AdminOnlyComponent = withRoleAccess(AdminPanel, ['ADMIN']);
```

---

## 3. MULTI-ROLE SYSTEM ARCHITECTURE

### 3.1 Authentication & Authorization Design

**NextAuth.js Configuration:**
```typescript
// Authentication flow architecture
export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Custom authentication logic
        // Password hashing with bcryptjs
        // Role assignment and validation
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add role and permissions to JWT token
      if (user) {
        token.role = user.role;
        token.permissions = await getUserPermissions(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      // Add role to session object
      session.user.role = token.role;
      session.user.permissions = token.permissions;
      return session;
    }
  }
};
```

**Role-Based Access Control (RBAC) Matrix:**

| Function | Production Coordinator | Admin | Procurement | QC Person | Assembler | Service |
|----------|----------------------|-------|-------------|-----------|-----------|---------|
| Create Orders | ✓ | ✓ | ✗ | ✗ | ✗ | Service Only |
| Modify Pending Orders | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| View All Orders | ✓ | ✓ | ✓ | ✓ | Assigned Only | Service Only |
| Update Order Status | Limited | ✓ | ✗ | QC Only | Production Only | ✗ |
| Manage Inventory | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Generate BOMs | ✓ | ✓ | View Only | ✗ | ✗ | ✗ |
| QC Approval | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| User Management | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

### 3.2 Dashboard Architecture by Role

**Production Coordinator Dashboard:**
- Order creation wizard (5-step process)
- Order status overview with filtering
- BOM generation and review
- Production scheduling interface
- Customer communication tools

**Quality Control Dashboard:**
- Pre-QC task queue with checklists
- Final QC inspection interface
- Photo documentation upload
- Quality metrics and reporting
- Non-conformance tracking

**Assembler Dashboard:**
- Personal task queue
- Work instruction display
- Progress tracking interface
- Issue reporting system
- Time tracking capabilities

**Service Department Dashboard:**
- Parts catalog with search
- Shopping cart functionality
- Service order history
- Warranty tracking
- Customer service tools

**Procurement Dashboard:**
- Inventory level monitoring
- BOM requirements analysis
- Supplier management
- Purchase order generation
- Cost tracking and reporting

**Admin Dashboard:**
- User management interface
- System configuration
- Audit log viewing
- Override capabilities
- System health monitoring

---

## 4. DATA ARCHITECTURE

### 4.1 Database Design Architecture

**PostgreSQL Schema Design:**

```sql
-- Core entity tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    status order_status NOT NULL DEFAULT 'PENDING',
    priority order_priority NOT NULL DEFAULT 'STANDARD',
    special_instructions TEXT,
    total_amount DECIMAL(10,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Hierarchical inventory structure
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER
);

CREATE TABLE assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE sub_assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id UUID REFERENCES assemblies(id),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_assembly_id UUID REFERENCES sub_assemblies(id),
    part_number VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    quantity_on_hand INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- BOM management
CREATE TABLE boms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    version INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID REFERENCES boms(id),
    part_id UUID REFERENCES parts(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2)
);

-- Workflow and task management
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    from_status order_status,
    to_status order_status NOT NULL,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    assigned_to UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'PENDING',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Data Access Layer Architecture

**Prisma Schema Design:**
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         UserRole
  firstName    String   @map("first_name")
  lastName     String   @map("last_name")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  createdOrders Order[] @relation("CreatedOrders")
  assignedTasks Task[]  @relation("AssignedTasks")

  @@map("users")
}

enum UserRole {
  PRODUCTION_COORDINATOR
  ADMIN
  PROCUREMENT
  QC_PERSON
  ASSEMBLER
  SERVICE_DEPARTMENT
}

model Order {
  id                   String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderNumber         String      @unique @map("order_number")
  customerId          String      @map("customer_id") @db.Uuid
  status              OrderStatus @default(PENDING)
  priority            OrderPriority @default(STANDARD)
  specialInstructions String?     @map("special_instructions")
  totalAmount         Decimal?    @map("total_amount") @db.Decimal(10, 2)
  createdBy           String      @map("created_by") @db.Uuid
  createdAt           DateTime    @default(now()) @map("created_at")
  updatedAt           DateTime    @updatedAt @map("updated_at")

  // Relations
  customer      Customer             @relation(fields: [customerId], references: [id])
  creator       User                 @relation("CreatedOrders", fields: [createdBy], references: [id])
  boms         BOM[]
  statusHistory OrderStatusHistory[]
  tasks        Task[]

  @@map("orders")
}
```

### 4.3 Caching Strategy Architecture

**Multi-Level Caching Design:**

1. **Database Query Caching** (Redis)
   - Frequently accessed inventory data
   - User sessions and permissions
   - BOM templates and configurations

2. **Application-Level Caching**
   - Computed BOM results
   - User preference data
   - Static configuration data

3. **CDN Caching**
   - Static assets and images
   - User-uploaded documents
   - Application bundle files

**Cache Invalidation Strategy:**
- Time-based expiration for static data
- Event-driven invalidation for dynamic data
- Cache warming for critical queries

---

## 5. INTEGRATION ARCHITECTURE

### 5.1 API Architecture Design

**tRPC Router Organization:**
```typescript
// src/server/api/root.ts
export const appRouter = createTRPCRouter({
  // Core business domain routers
  order: orderRouter,
  inventory: inventoryRouter,
  bom: bomRouter,
  user: userRouter,
  workflow: workflowRouter,
  qc: qcRouter,
  service: serviceRouter,
  
  // System routers
  auth: authRouter,
  admin: adminRouter,
  notification: notificationRouter,
});

// Example: Order router with procedures
export const orderRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.services.orderService.create(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.services.orderService.getById(input.id);
    }),

  updateStatus: protectedProcedure
    .input(updateOrderStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.services.workflowService.updateOrderStatus(input);
    }),
});
```

### 5.2 External System Integration

**ERP Integration Architecture:**
```typescript
// src/server/integrations/erp.ts
export class ERPIntegrationService {
  async syncCustomerData(customerId: string) {
    // REST API integration with ERP system
    // Data transformation and validation
    // Error handling and retry logic
  }

  async exportOrderData(orderId: string) {
    // Transform order data to ERP format
    // Secure API communication
    // Status tracking and confirmation
  }
}
```

**File Storage Integration:**
```typescript
// src/server/services/file-storage.ts
export class FileStorageService {
  async uploadDocument(file: File, metadata: DocumentMetadata) {
    // Upload to AWS S3 or similar
    // Generate secure URLs
    // Metadata storage in database
  }

  async getSecureUrl(documentId: string) {
    // Generate time-limited access URLs
    // Permission validation
    // Audit logging
  }
}
```

---

## 6. PERFORMANCE & SCALABILITY ARCHITECTURE

### 6.1 Performance Optimization Strategy

**Database Performance:**
- Proper indexing strategy for frequent queries
- Connection pooling for optimal resource usage
- Read replicas for read-heavy operations
- Query optimization and monitoring

**Application Performance:**
- Server-side rendering for initial page loads
- Code splitting and lazy loading
- Image optimization and CDN usage
- Efficient state management and memoization

**Caching Strategy:**
```typescript
// Multi-level caching implementation
class CacheService {
  // L1: In-memory cache for frequently accessed data
  private memoryCache = new Map();
  
  // L2: Redis cache for shared data across instances
  private redisCache: Redis;
  
  // L3: Database query result caching
  async getCachedOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Check Redis cache
    const cached = await this.redisCache.get(key);
    if (cached) {
      const data = JSON.parse(cached);
      this.memoryCache.set(key, data);
      return data;
    }
    
    // Fetch from source and cache
    const data = await fetcher();
    await this.redisCache.setex(key, ttl, JSON.stringify(data));
    this.memoryCache.set(key, data);
    return data;
  }
}
```

### 6.2 Scalability Design

**Horizontal Scaling Preparation:**
- Stateless application design
- Database connection pooling
- Session storage in Redis
- File storage on external services

**Performance Monitoring:**
- Application performance monitoring (APM)
- Database query performance tracking
- Real-time error tracking
- User experience metrics

---

## 7. SECURITY ARCHITECTURE

### 7.1 Application Security Design

**Authentication Security:**
- Strong password requirements with bcrypt hashing
- Session management with secure cookies
- CSRF protection for all forms
- Rate limiting for authentication endpoints

**Authorization Security:**
```typescript
// Permission-based access control
export class AuthorizationService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const user = await this.getUserWithRole(userId);
    const permissions = this.getRolePermissions(user.role);
    
    return permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }

  async enforcePermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, resource, action);
    if (!hasPermission) {
      throw new UnauthorizedError(`Access denied for ${action} on ${resource}`);
    }
  }
}
```

**Data Security:**
- Encryption at rest for sensitive data
- HTTPS enforcement for all communications
- Input validation and sanitization
- SQL injection prevention through Prisma ORM

### 7.2 Audit and Compliance

**Audit Logging:**
```typescript
// Comprehensive audit trail
export class AuditService {
  async logAction(action: AuditAction) {
    await this.db.auditLog.create({
      data: {
        userId: action.userId,
        action: action.type,
        resource: action.resource,
        resourceId: action.resourceId,
        oldValues: action.before,
        newValues: action.after,
        ipAddress: action.ipAddress,
        userAgent: action.userAgent,
        timestamp: new Date(),
      }
    });
  }
}
```

---

## 8. DEPLOYMENT ARCHITECTURE

### 8.1 Infrastructure Design

**Container Architecture:**
```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Cloud Infrastructure:**
```yaml
# Docker Compose for development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/torvan
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: torvan
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 8.2 CI/CD Pipeline Architecture

**GitHub Actions Workflow:**
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test
      - name: Type checking
        run: npm run type-check
      - name: Linting
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Build and deploy to cloud provider
          # Database migrations
          # Health checks
```

---

## 9. MONITORING AND OBSERVABILITY

### 9.1 Application Monitoring

**Health Check System:**
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalAPIs(),
    }
  };

  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  
  return Response.json(health, {
    status: allHealthy ? 200 : 503
  });
}
```

**Performance Metrics:**
- Response time monitoring
- Database query performance
- Memory and CPU usage
- Error rates and types
- User activity metrics

### 9.2 Logging Architecture

**Structured Logging:**
```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

---

## 10. TESTING ARCHITECTURE

### 10.1 Testing Strategy

**Test Pyramid Implementation:**
1. **Unit Tests**: Business logic and utility functions
2. **Integration Tests**: API endpoints and database operations
3. **End-to-End Tests**: Critical user workflows
4. **Performance Tests**: Load testing for scalability

**Testing Tools:**
- Jest for unit and integration tests
- Playwright for E2E testing
- MSW for API mocking
- Testing Library for component testing

---

## 11. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Weeks 1-4)
- Database schema design and setup
- Authentication and authorization system
- Basic user management
- Core UI components and layout

### Phase 2: Core Features (Weeks 5-8)
- Order creation workflow
- Inventory management system
- Basic BOM generation
- Role-based dashboards

### Phase 3: Advanced Features (Weeks 9-12)
- Quality control workflows
- Production task management
- Service department functionality
- Reporting and analytics

### Phase 4: Integration & Polish (Weeks 13-16)
- External system integrations
- Performance optimization
- Security hardening
- User acceptance testing

---

## 12. CONCLUSION

This comprehensive system architecture provides a robust foundation for the TORVAN MEDICAL workflow management system. The modular monolith approach balances simplicity with scalability, while the chosen technology stack ensures type safety, performance, and maintainability.

Key architectural decisions support the complex business requirements:
- Role-based access control for multi-user workflows
- Hierarchical inventory management with dynamic BOM generation
- Comprehensive audit trails for compliance
- Scalable infrastructure for future growth

The architecture is designed to support all 37 user stories across 8 epics while maintaining performance targets and security requirements.