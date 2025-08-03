# TORVAN MEDICAL CLEANSTATION WORKFLOW MANAGEMENT SYSTEM
## System Architecture Documentation

### 1. PROJECT OVERVIEW

**Purpose**: Digital workflow management system for TORVAN MEDICAL CLEANSTATION REPROCESSING SINKS production lifecycle.

**Technology Stack**:
- **Frontend**: Next.js 14+ with App Router
- **UI Framework**: ShadCN UI components + Tailwind CSS
- **Animation**: Framer Motion
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Local file system / AWS S3 (configurable)
- **QR Code Generation**: qrcode library
- **PDF Generation**: jsPDF / Puppeteer

### 2. SYSTEM ROLES & PERMISSIONS

**User Roles**:
1. **Production Coordinator** - Creates orders, manages workflow initiation, final shipping
2. **Admin** - Full system access, user management, system configuration
3. **Procurement** - BOM approval, parts ordering, supplier management
4. **QC Person** - Quality control processes (Pre-QC and Final QC)
5. **Assembler** - Production tasks, testing, packaging
6. **Service Department** - Service parts ordering (cart-style without prices)

### 3. DATABASE ARCHITECTURE

**Core Database Pools**:

#### 3.1 Orders Pool
- **orders**: Main order records with PO numbers, customer details, status tracking
- **order_items**: Individual sink configurations within orders
- **order_attachments**: Uploaded documents (PO, drawings, etc.)
- **order_status_history**: Audit trail of status changes

#### 3.2 Inventory Pool
- **categories**: 19 main categories (hierarchical structure)
- **assemblies**: 219 assemblies with parent-child relationships
- **sub_assemblies**: 481 sub-assemblies
- **parts**: Individual components with manufacturer details
- **inventory_relationships**: Parent-child mapping with dot notation support

#### 3.3 Work Instructions Pool
- **work_instructions**: Step-by-step assembly instructions
- **instruction_steps**: Individual steps within instructions
- **instruction_attachments**: Technical drawings, photos, videos

#### 3.4 Task Lists Pool
- **task_templates**: Template task lists based on sink configurations
- **task_instances**: Active task lists for specific orders
- **task_items**: Individual tasks within task lists
- **task_completions**: Task completion tracking with timestamps

#### 3.5 Tools Pool
- **tools**: Available tools and equipment
- **tool_requirements**: Tools needed for specific tasks
- **tool_assignments**: Tool allocation to workstations

#### 3.6 Quality Control Pool
- **qc_templates**: Pre-QC and Final QC form templates
- **qc_instances**: QC form instances for specific orders
- **qc_checks**: Individual checklist items
- **qc_results**: QC completion results and sign-offs

### 4. APPLICATION ARCHITECTURE

#### 4.1 Frontend Structure
```
/app
├── (auth)/
│   ├── login/
│   └── register/
├── dashboard/
│   ├── production-coordinator/
│   ├── admin/
│   ├── procurement/
│   ├── qc/
│   ├── assembler/
│   └── service/
├── orders/
│   ├── create/
│   │   ├── step-1-customer/
│   │   ├── step-2-configuration/
│   │   ├── step-3-basins/
│   │   ├── step-4-accessories/
│   │   └── step-5-review/
│   ├── [id]/
│   └── list/
├── inventory/
│   ├── categories/
│   ├── assemblies/
│   ├── parts/
│   └── search/
├── workflows/
│   ├── production/
│   ├── qc/
│   └── testing/
└── api/
    ├── orders/
    ├── inventory/
    ├── workflows/
    ├── qc/
    └── auth/
```

#### 4.2 Component Architecture
- **Layout Components**: Dashboard shells for each role
- **Form Components**: Multi-step order creation, configuration wizards
- **Data Components**: Tables, cards, lists with real-time updates
- **Workflow Components**: Kanban boards, status indicators, progress tracking
- **QC Components**: Checklist forms, signature capture, photo upload

### 5. WORKFLOW STATE MACHINE

**Order Lifecycle States**:
1. **Draft** - Initial order creation
2. **Parts Sent** - Procurement sent parts to outside company
3. **Waiting for Arrival** - Parts in transit
4. **Ready for Pre-QC** - Parts arrived, pending QC inspection
5. **Ready for Production** - Pre-QC passed, ready for assembly
6. **In Production** - Assembler assigned and working
7. **Testing** - End-of-line testing phase
8. **Packaging** - Final packaging and accessory preparation
9. **Ready for Final QC** - Awaiting final quality inspection
10. **Ready for Ship** - Final QC passed, ready for shipment
11. **Shipped** - Order completed and shipped

**State Transitions**:
- Each state transition requires specific role permissions
- Audit trail maintained for all status changes
- Automated BOM generation triggers on configuration completion
- Task list generation based on sink configuration

### 6. BOM GENERATION LOGIC

**Automated BOM Creation**:
- Based on sink family selection (MDRD, Endoscope CleanStation, InstroSink)
- Part numbers assigned from 700-series based on configuration
- Parent-child relationships maintained from inventory database
- Custom part number generation for custom dimensions
- Export capabilities (PDF, CSV, Excel)

### 7. QR CODE SYSTEM

**QR Code Generation**:
- Unique QR codes for all assemblies and sub-assemblies
- Contains hierarchical information and direct database links
- Printable labels for physical inventory management
- Mobile scanning capabilities for quick inventory lookup

### 8. SECURITY & AUTHENTICATION

**Security Features**:
- Role-based access control (RBAC)
- JWT-based authentication
- API rate limiting
- File upload validation
- SQL injection prevention
- XSS protection

### 9. PERFORMANCE CONSIDERATIONS

**Optimization Strategies**:
- Database indexing on frequently queried fields
- Caching for inventory lookups
- Lazy loading for large datasets
- Image optimization for technical drawings
- Progressive web app (PWA) capabilities

### 10. INTEGRATION POINTS

**External Systems**:
- Email notifications for workflow events
- Document management for technical drawings
- Barcode/QR scanning integration
- Potential ERP system integration

### 11. DEPLOYMENT ARCHITECTURE

**Production Environment**:
- Next.js application deployed on Vercel/AWS
- PostgreSQL database with connection pooling
- File storage with CDN for static assets
- Environment-based configuration
- Automated backups and monitoring

This architecture provides a solid foundation for the complex workflow management requirements while maintaining scalability and maintainability.