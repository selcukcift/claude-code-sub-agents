# TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM
## COMPREHENSIVE BUSINESS REQUIREMENTS SPECIFICATION

### EXECUTIVE SUMMARY

The TORVAN MEDICAL WORKFLOW MANAGEMENT SYSTEM is a comprehensive web-based application designed to manage the complete lifecycle of medical sink orders from initial customer entry through final shipping. The system manages a complex inventory hierarchy of 6 categories, 219 assemblies, 481 sub-assemblies, and over 1000 parts with sophisticated configuration logic and dynamic BOM generation.

### 1. BUSINESS CONTEXT AND OBJECTIVES

**Business Domain**: Medical equipment manufacturing specializing in cleanstation reprocessing sinks
**Primary Business Objective**: Streamline order management workflow from customer entry to shipping
**Secondary Objectives**:
- Automate BOM generation based on sink configurations
- Implement role-based quality control processes
- Provide comprehensive inventory management
- Enable service parts ordering capabilities

### 2. STAKEHOLDER ANALYSIS AND USER ROLES

#### 2.1 User Roles and Responsibilities

**ROLE 1: PRODUCTION COORDINATOR**
- Primary entry point for all customer orders
- Responsible for 5-step order creation process
- Can view order status across all phases
- Authority: Create orders, modify pending orders, assign to production
- Restrictions: Cannot modify orders in production or QC phases

**ROLE 2: ADMIN**
- System administration and user management
- Full access to all system functions
- Can override order status in emergency situations
- Authority: Complete system access, user management, system configuration
- Restrictions: None (super-user role)

**ROLE 3: PROCUREMENT**
- Manages inventory levels and purchasing
- Views BOM requirements for planning
- Updates part availability status
- Authority: View all BOMs, update inventory status, generate procurement reports
- Restrictions: Cannot modify orders or production status

**ROLE 4: QC PERSON**
- Manages Pre-QC and Final QC processes
- Approves or rejects orders at quality checkpoints
- Documents quality issues and resolutions
- Authority: Modify QC status, add QC notes, approve/reject orders
- Restrictions: Cannot modify order details, limited to QC functions

**ROLE 5: ASSEMBLER**
- Views assigned production tasks
- Updates assembly progress and completion status
- Documents assembly issues
- Authority: Update task completion, add assembly notes
- Restrictions: Cannot modify order details, limited to assigned tasks

**ROLE 6: SERVICE DEPARTMENT**
- Creates service parts orders using shopping cart interface
- Manages warranty and service requests
- Authority: Create service orders, view parts catalog, manage service history
- Restrictions: Cannot access production orders, limited to service functions

### 3. FUNCTIONAL REQUIREMENTS

#### 3.1 Order Lifecycle Management

**FR-001: 8-Phase Order Status Workflow**
The system SHALL implement the following order status progression:

1. **PENDING** - Initial status after order creation
2. **IN PRODUCTION** - Order assigned to production team
3. **PRE-QC** - Initial quality control checkpoint
4. **PRODUCTION COMPLETE** - Assembly completed, ready for final QC
5. **FINAL QC** - Final quality control checkpoint
6. **QC COMPLETE** - Quality approved, ready for shipping
7. **SHIPPED** - Order dispatched to customer
8. **DELIVERED** - Order received by customer (optional tracking)

**FR-002: Status Transition Rules**
- Only Production Coordinator can move orders from PENDING to IN PRODUCTION
- Only Assemblers can move orders from IN PRODUCTION to PRE-QC
- Only QC Person can move orders through QC phases
- Only Admin can override status transitions
- All status changes SHALL be logged with timestamp and user

#### 3.2 5-Step Order Creation Process

**FR-003: Step 1 - Customer Information Entry**
- Customer name (required, max 100 characters)
- Contact information (phone, email)
- Shipping address (complete address with validation)
- Order priority level (Standard, Rush, Emergency)
- Special instructions (text field, max 500 characters)

**FR-004: Step 2 - Sink Selection**
- Select from available sink families
- Specify quantity for each sink type
- Assign unique build numbers for tracking
- Validate sink family availability

**FR-005: Step 3 - Sink Configuration**
- **Body Configuration**: Material, size, mounting options
- **Basin Selection**: Type, quantity, configuration
- **Pegboard Options**: Size, hole patterns, material
- **Leg Configuration**: Height, material, adjustability
- **Additional Components**: Based on sink family requirements

**FR-006: Step 4 - Accessories Selection**
- Browse accessories by category
- Add multiple accessories with quantities
- Validate compatibility with selected sink configuration
- Calculate total accessory cost

**FR-007: Step 5 - Review and Submission**
- Display complete order summary
- Show calculated total cost
- Allow final modifications before submission
- Generate unique order number upon submission
- Send confirmation to customer and internal stakeholders

#### 3.3 Inventory Management System

**FR-008: Hierarchical Inventory Structure**
The system SHALL manage a 4-level hierarchy:
- **Level 1**: 6 Categories (Sinks, Assemblies, Sub-Assemblies, Parts, Accessories, Service Parts)
- **Level 2**: 219 Primary Assemblies
- **Level 3**: 481 Sub-Assemblies
- **Level 4**: Individual Parts (700-series numbering system)

**FR-009: Part Numbering System**
- All custom/configured parts use 700-series numbering
- Format: 7XX-XXXX where XX represents category/type codes
- System SHALL auto-generate part numbers for custom configurations
- Maintain part number uniqueness across entire system

**FR-010: Parent-Child Relationships**
- Each assembly can have multiple sub-assemblies
- Each sub-assembly can contain multiple parts
- System SHALL maintain referential integrity
- Support for recursive assembly structures

#### 3.4 Dynamic BOM Generation

**FR-011: Configuration-Based BOM Creation**
- Automatically generate BOM based on sink configuration selections
- Include all required parts, assemblies, and sub-assemblies
- Calculate quantities based on configuration rules
- Handle custom parts with auto-generated part numbers

**FR-012: BOM Business Rules**
- Standard sink configurations use predefined BOMs
- Custom configurations trigger dynamic BOM generation
- System SHALL validate part availability before BOM finalization
- Support for substitute parts when primary parts unavailable

**FR-013: BOM Versioning**
- Maintain version history for all BOMs
- Link BOM versions to specific orders
- Support for BOM modifications during production (with approval)

#### 3.5 Quality Control Processes

**FR-014: Pre-QC Workflow**
- QC Person receives notification when order reaches PRE-QC status
- Standardized checklist based on sink type and configuration
- Required photo documentation for specific components
- Pass/Fail decision with mandatory comments for failures
- Automatic return to production if failed

**FR-015: Final QC Workflow**
- Comprehensive final inspection checklist
- Functional testing requirements based on sink features
- Customer-specific quality requirements validation
- Final approval signature (digital)
- Automatic progression to shipping preparation

#### 3.6 Production Assembly Management

**FR-016: Auto-Generated Task Lists**
- System generates assembly tasks based on BOM
- Tasks organized by assembly sequence
- Include work instructions and specifications
- Assign tasks to specific assemblers
- Track completion status and time

**FR-017: Assembly Progress Tracking**
- Real-time progress updates
- Issue reporting and resolution tracking
- Photo documentation capabilities
- Parts consumption tracking

#### 3.7 Service Parts Ordering

**FR-018: Service Shopping Cart**
- Browse parts catalog by category
- Search functionality with multiple filters
- Add items to cart with quantities
- Calculate pricing and availability
- Support for recurring service orders

**FR-019: Service Order Management**
- Separate workflow from production orders
- Expedited processing for service parts
- Integration with warranty tracking
- Service history maintenance

### 4. NON-FUNCTIONAL REQUIREMENTS

#### 4.1 Performance Requirements

**NFR-001: Response Time**
- Page load times SHALL not exceed 3 seconds
- Search operations SHALL complete within 2 seconds
- BOM generation SHALL complete within 5 seconds
- File uploads SHALL support up to 10MB files

**NFR-002: Scalability**
- Support minimum 50 concurrent users
- Handle up to 1000 orders per month
- Database SHALL support growth to 100,000+ parts

#### 4.2 Security Requirements

**NFR-003: Authentication and Authorization**
- Role-based access control (RBAC) implementation
- Strong password requirements
- Session timeout after 30 minutes of inactivity
- Failed login attempt lockout after 5 attempts

**NFR-004: Data Security**
- All sensitive data encrypted at rest
- HTTPS required for all communications
- Regular automated backups
- Audit trail for all user actions

#### 4.3 Usability Requirements

**NFR-005: User Interface**
- Responsive design supporting desktop and tablet devices
- Intuitive navigation with maximum 3 clicks to any function
- Consistent design patterns throughout application
- Accessibility compliance (WCAG 2.1 Level AA)

**NFR-006: System Reliability**
- 99.5% uptime during business hours
- Automated error recovery where possible
- Graceful degradation of non-critical features
- Maximum 4-hour recovery time from system failures

### 5. BUSINESS RULES AND CONSTRAINTS

#### 5.1 Order Processing Rules

**BR-001**: Orders cannot be modified once they enter IN PRODUCTION status without Admin approval
**BR-002**: All orders must have complete customer information before submission
**BR-003**: BOM must be validated and approved before production can begin
**BR-004**: QC failures require documented reasons and corrective actions
**BR-005**: Service orders have priority over standard production orders for parts allocation

#### 5.2 Inventory Management Rules

**BR-006**: Part numbers in 700-series are reserved for custom/configured items
**BR-007**: All assemblies must have at least one sub-assembly or part
**BR-008**: Parts cannot be deleted if referenced in any active order
**BR-009**: Inventory levels must be updated in real-time during production

#### 5.3 User Access Rules

**BR-010**: Users can only access functions appropriate to their assigned role
**BR-011**: All order modifications must be logged with user and timestamp
**BR-012**: QC approvals require digital signature
**BR-013**: Production status updates can only be made by assigned assemblers

### 6. INTEGRATION REQUIREMENTS

#### 6.1 External System Integrations

**INT-001: ERP Integration**
- Synchronize customer data with existing ERP system
- Export order data for financial processing
- Import part costs and availability

**INT-002: Shipping Integration**
- Generate shipping labels and tracking numbers
- Update order status based on carrier information
- Calculate shipping costs automatically

#### 6.2 Internal System Integrations

**INT-003: Document Management**
- Integration with document storage system for work instructions
- Photo storage and retrieval for QC documentation
- Drawing and specification access

### 7. DATA REQUIREMENTS

#### 7.1 Data Entities

**Customer Data**: Name, contact information, shipping addresses, order history
**Order Data**: Order details, status, timeline, assignments, notes
**Product Data**: Sink families, configurations, specifications, pricing
**Inventory Data**: Parts, assemblies, quantities, locations, costs
**User Data**: Role assignments, permissions, activity logs, preferences

#### 7.2 Data Retention

- Order data retained for 7 years
- User activity logs retained for 2 years
- Customer data retained per privacy policy requirements
- Daily automated backups with 30-day retention

### 8. ACCEPTANCE CRITERIA

#### 8.1 Order Management Acceptance Criteria

**AC-001**: Production Coordinator can create complete order in under 15 minutes
**AC-002**: Order status updates are visible to appropriate users within 30 seconds
**AC-003**: BOM generation produces accurate parts list for any valid configuration
**AC-004**: QC workflows enforce all required checkpoints and documentation

#### 8.2 System Performance Acceptance Criteria

**AC-005**: System supports 50 concurrent users without performance degradation
**AC-006**: All search operations return results within 2 seconds
**AC-007**: Data backups complete successfully every 24 hours
**AC-008**: User role restrictions enforced 100% of the time

#### 8.3 User Experience Acceptance Criteria

**AC-009**: New users can complete basic tasks after 2 hours of training
**AC-010**: Error messages provide clear guidance for resolution
**AC-011**: System maintains session state during temporary network interruptions
**AC-012**: Mobile interface supports core functions on tablet devices

### 9. RISK ASSESSMENT

#### 9.1 Technical Risks

- **Complex BOM Logic**: Risk of incorrect BOMs due to configuration complexity
- **Data Migration**: Risk during transition from existing systems
- **Integration Complexity**: Challenges with ERP and shipping system integration

#### 9.2 Business Risks

- **User Adoption**: Risk of resistance to new workflow processes
- **Training Requirements**: Extensive training needed for multiple user roles
- **Business Continuity**: Risk of production delays during system implementation

#### 9.3 Mitigation Strategies

- Comprehensive testing of BOM generation logic with all configuration scenarios
- Phased rollout with parallel system operation during transition
- Extensive user training program with role-specific documentation
- Fallback procedures for critical business processes

### 10. SUCCESS CRITERIA AND KPIs

- Order processing time reduced by 40%
- BOM accuracy improved to 99.5%
- User satisfaction rating above 4.0/5.0
- System uptime exceeding 99.5%
- Reduced training time for new users by 50%