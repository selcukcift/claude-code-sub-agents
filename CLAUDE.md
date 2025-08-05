# TORVAN MEDICAL WORKFLOW MANAGEMENT WEB APPLICATION

## Project Overview
Comprehensive workflow management web application for TORVAN MEDICAL CLEANSTATION REPROCESSING SINKS production digitalization process.

## Business Context
- **Company**: TORVAN MEDICAL (www.torvanmedical.com)
- **Product Focus**: CLEANSTATION REPROCESSING SINKS for medical facilities
- **Objective**: Digitalize entire production workflow from order creation to shipping

## Project Scope
- **Multi-role system**: 5 user types (Production Coordinator, Admin, Procurement, QC, Assembler, Service Dept)
- **Full lifecycle**: 8 order status phases from creation to shipping
- **Complex inventory**: 6 categories, 219 assemblies, 481 sub-assemblies with hierarchical relationships
- **Dynamic BOM generation**: Auto-generated based on sink configurations
- **5-step order process**: Customer info → Sink selection → Configuration → Accessories → Review

## Technology Stack
- **Frontend**: Next.js 15 with ShadCN UI components
- **Styling**: Tailwind CSS with professional dashboard design
- **Animations**: Framer Motion for smooth interactions
- **Database**: PostgreSQL with Prisma ORM (complete schemas implemented)
- **Backend**: tRPC for type-safe APIs (complete implementation)
- **Authentication**: NextAuth.js with 6-role RBAC system
- **Testing**: Jest, React Testing Library, Playwright E2E
- **CI/CD**: GitHub Actions with medical device compliance

## Key Features
1. **Order Management**: Complete lifecycle from PO creation to shipping
2. **Role-based Dashboards**: Customized views for each user type
3. **Automated BOM Generation**: Based on sink configurations and part numbers (700s series)
4. **Inventory Management**: Hierarchical structure with parent-child relationships
5. **Quality Control**: Pre-QC and Final QC workflows with tailored checklists
6. **Production Assembly**: Auto-generated task lists and work instructions
7. **Service Parts Ordering**: Shopping cart-like interface without pricing

## Implementation Phases
1. **Requirements & Analysis** (Weeks 1-2)
2. **System Design & Architecture** (Weeks 3-4)
3. **Project Planning & Setup** (Week 5)
4. **Core Development** (Weeks 6-12)
5. **Quality Assurance & Testing** (Weeks 13-14)
6. **Deployment & Operations** (Week 15)

## Resources
- `/resources/before sparc _sink prompt .txt` - Main requirements document
- `/resources/assemblies.json` - Assembly data (219 items)
- `/resources/categories.json` - Category structure (6 categories)
- `/resources/parts.json` - Parts catalog (283 components)
- `/resources/sink configuration and bom.txt` - Configuration logic
- Quality/testing procedures in additional resource files

## Current Status
- **Phase**: PHASES 1-4 COMPLETE - Full Implementation Complete
- **Working Directory**: `/media/selcuk/Vs_code_files/Claude_subagents` (moved from torvan-workflow subdirectory)
- **Status**: Production-ready medical device workflow management system
- **Next Action**: Ready for deployment and go-live

## CRITICAL AGENT COORDINATION RULE
⚠️ **PROJECT-ORCHESTRATOR DELEGATION REQUIREMENT**:
- project-orchestrator MUST use Agent tool to delegate to specialized sub-agents
- project-orchestrator should NEVER do implementation work directly
- project-orchestrator role is COORDINATION ONLY, not execution
- If project-orchestrator fails to delegate, use specialized agents directly
- Available agents: dependency-manager, interface-designer, security-analyzer, code-reviewer, test-suite-generator, performance-optimizer, git-manager, documentation-generator, cicd-builder

## Success Criteria
- All 5 user roles can complete their workflows
- <3 second page loads, <1 second BOM generation
- Multi-role authentication with proper authorization
- Accurate parent-child inventory relationships
- Successful UAT with all stakeholder groups

## Notes
- Focus on MDRD sink family implementation (other families: TODO pages)
- Part numbers starting with 700s indicate implementation logic
- Custom configurations generate new part numbers automatically
- QR code generation required for assemblies and sub-assemblies