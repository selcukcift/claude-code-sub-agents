# TORVAN MEDICAL COMPONENT ARCHITECTURE
## DETAILED COMPONENT DESIGN AND ORGANIZATION

### EXECUTIVE SUMMARY

This document defines the detailed component architecture for the TORVAN MEDICAL workflow management system, providing comprehensive specifications for frontend components, backend services, and module organization that supports the complex multi-role workflow requirements.

---

## 1. FRONTEND COMPONENT ARCHITECTURE

### 1.1 Component Hierarchy and Organization

**Directory Structure:**
```
src/
├── components/                   # Reusable UI components
│   ├── ui/                      # Base ShadCN UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── forms/                   # Business-specific form components
│   │   ├── order-creation/
│   │   │   ├── customer-info-form.tsx
│   │   │   ├── sink-selection-form.tsx
│   │   │   ├── configuration-form.tsx
│   │   │   ├── accessories-form.tsx
│   │   │   └── review-form.tsx
│   │   ├── inventory/
│   │   │   ├── part-form.tsx
│   │   │   ├── assembly-form.tsx
│   │   │   └── category-form.tsx
│   │   └── user/
│   │       ├── login-form.tsx
│   │       ├── register-form.tsx
│   │       └── profile-form.tsx
│   ├── layout/                  # Layout and navigation components
│   │   ├── main-layout.tsx
│   │   ├── dashboard-layout.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── breadcrumb.tsx
│   │   └── role-based-nav.tsx
│   ├── domain/                  # Business domain components
│   │   ├── order/
│   │   │   ├── order-card.tsx
│   │   │   ├── order-list.tsx
│   │   │   ├── order-details.tsx
│   │   │   ├── status-badge.tsx
│   │   │   └── timeline.tsx
│   │   ├── inventory/
│   │   │   ├── parts-hierarchy.tsx
│   │   │   ├── inventory-grid.tsx
│   │   │   ├── stock-indicator.tsx
│   │   │   └── search-filters.tsx
│   │   ├── bom/
│   │   │   ├── bom-viewer.tsx
│   │   │   ├── bom-generator.tsx
│   │   │   ├── parts-table.tsx
│   │   │   └── cost-calculator.tsx
│   │   ├── workflow/
│   │   │   ├── task-list.tsx
│   │   │   ├── task-card.tsx
│   │   │   ├── progress-tracker.tsx
│   │   │   └── status-updater.tsx
│   │   └── quality/
│   │       ├── qc-checklist.tsx
│   │       ├── photo-uploader.tsx
│   │       ├── approval-panel.tsx
│   │       └── defect-reporter.tsx
│   ├── charts/                  # Data visualization components
│   │   ├── order-metrics.tsx
│   │   ├── inventory-charts.tsx
│   │   ├── production-timeline.tsx
│   │   └── quality-dashboard.tsx
│   └── common/                  # Shared utility components
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       ├── data-table.tsx
│       ├── search-input.tsx
│       ├── filter-panel.tsx
│       ├── pagination.tsx
│       └── confirmation-dialog.tsx
```

### 1.2 Component Design Patterns

**1. Compound Components Pattern**
```typescript
// Order creation wizard using compound component pattern
export const OrderWizard = {
  Root: ({ children, ...props }: OrderWizardProps) => (
    <div className="order-wizard" {...props}>
      {children}
    </div>
  ),
  
  Steps: ({ children }: { children: React.ReactNode }) => (
    <div className="wizard-steps">
      {children}
    </div>
  ),
  
  Step: ({ title, isActive, isCompleted, children }: StepProps) => (
    <div className={cn("wizard-step", { active: isActive, completed: isCompleted })}>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  
  Navigation: ({ onNext, onPrev, canNext, canPrev }: NavigationProps) => (
    <div className="wizard-navigation">
      <Button onClick={onPrev} disabled={!canPrev}>Previous</Button>
      <Button onClick={onNext} disabled={!canNext}>Next</Button>
    </div>
  )
};

// Usage
<OrderWizard.Root>
  <OrderWizard.Steps>
    <OrderWizard.Step title="Customer Information" isActive={step === 1}>
      <CustomerInfoForm />
    </OrderWizard.Step>
    <OrderWizard.Step title="Sink Selection" isActive={step === 2}>
      <SinkSelectionForm />
    </OrderWizard.Step>
  </OrderWizard.Steps>
  <OrderWizard.Navigation onNext={handleNext} onPrev={handlePrev} />
</OrderWizard.Root>
```

**2. Higher-Order Components for Role-Based Access**
```typescript
// Role-based access control HOC
export function withRoleGuard<T extends object>(
  Component: React.ComponentType<T>,
  allowedRoles: UserRole[]
) {
  return function RoleGuardedComponent(props: T) {
    const { user } = useAuth();
    
    if (!user) {
      return <LoginPrompt />;
    }
    
    if (!allowedRoles.includes(user.role)) {
      return (
        <AccessDenied 
          message={`This feature requires ${allowedRoles.join(' or ')} role`}
        />
      );
    }
    
    return <Component {...props} />;
  };
}

// Permission-based rendering hook
export function usePermission(resource: string, action: string) {
  const { user } = useAuth();
  
  return useMemo(() => {
    if (!user) return false;
    
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }, [user, resource, action]);
}

// Usage in components
const InventoryManagement = withRoleGuard(
  () => <InventoryGrid />,
  ['ADMIN', 'PROCUREMENT']
);

// Conditional rendering based on permissions
function OrderActions({ orderId }: { orderId: string }) {
  const canModify = usePermission('order', 'modify');
  const canDelete = usePermission('order', 'delete');
  
  return (
    <div className="order-actions">
      {canModify && <Button onClick={() => editOrder(orderId)}>Edit</Button>}
      {canDelete && <Button variant="destructive" onClick={() => deleteOrder(orderId)}>Delete</Button>}
    </div>
  );
}
```

**3. Form Components with Validation**
```typescript
// Reusable form component with Zod validation
interface FormComponentProps<T> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void>;
  defaultValues?: Partial<T>;
  children: (form: UseFormReturn<T>) => React.ReactNode;
}

export function FormComponent<T>({ 
  schema, 
  onSubmit, 
  defaultValues, 
  children 
}: FormComponentProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues
  });
  
  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      toast.success('Form submitted successfully');
    } catch (error) {
      toast.error('Failed to submit form');
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {children(form)}
      </form>
    </Form>
  );
}

// Customer information form implementation
const customerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  shippingAddress: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().min(5, 'Zip code is required')
  })
});

export function CustomerInfoForm({ onNext }: { onNext: (data: CustomerInfo) => void }) {
  return (
    <FormComponent
      schema={customerSchema}
      onSubmit={onNext}
      defaultValues={{}}
    >
      {(form) => (
        <>
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter contact name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Additional fields... */}
          
          <Button type="submit">Next Step</Button>
        </>
      )}
    </FormComponent>
  );
}
```

### 1.3 State Management Architecture

**Zustand Store Organization:**
```typescript
// stores/order-store.ts
interface OrderState {
  currentOrder: Partial<Order> | null;
  isCreating: boolean;
  currentStep: number;
  
  // Actions
  setCurrentOrder: (order: Partial<Order>) => void;
  updateCurrentOrder: (updates: Partial<Order>) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  currentOrder: null,
  isCreating: false,
  currentStep: 1,
  
  setCurrentOrder: (order) => set({ currentOrder: order }),
  
  updateCurrentOrder: (updates) => set((state) => ({
    currentOrder: state.currentOrder 
      ? { ...state.currentOrder, ...updates }
      : updates
  })),
  
  nextStep: () => set((state) => ({
    currentStep: Math.min(state.currentStep + 1, 5)
  })),
  
  prevStep: () => set((state) => ({
    currentStep: Math.max(state.currentStep - 1, 1)
  })),
  
  resetWizard: () => set({
    currentOrder: null,
    currentStep: 1,
    isCreating: false
  })
}));

// stores/ui-store.ts
interface UIState {
  sidebarOpen: boolean;
  currentTheme: 'light' | 'dark';
  notifications: Notification[];
  
  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentTheme: 'light',
  notifications: [],
  
  toggleSidebar: () => set((state) => ({ 
    sidebarOpen: !state.sidebarOpen 
  })),
  
  setTheme: (theme) => set({ currentTheme: theme }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, notification]
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  }))
}));
```

**tRPC Hooks for Server State:**
```typescript
// hooks/use-orders.ts
export function useOrders(filters?: OrderFilters) {
  return api.order.getAll.useQuery(filters, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useOrder(id: string) {
  return api.order.getById.useQuery(
    { id },
    {
      enabled: !!id,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
}

export function useCreateOrder() {
  const utils = api.useUtils();
  
  return api.order.create.useMutation({
    onSuccess: () => {
      // Invalidate orders list to refetch
      utils.order.getAll.invalidate();
      toast.success('Order created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create order: ${error.message}`);
    }
  });
}

export function useUpdateOrderStatus() {
  const utils = api.useUtils();
  
  return api.order.updateStatus.useMutation({
    onMutate: async ({ id, status }) => {
      // Optimistic update
      await utils.order.getById.cancel({ id });
      
      const previousOrder = utils.order.getById.getData({ id });
      
      utils.order.getById.setData({ id }, (old) =>
        old ? { ...old, status } : undefined
      );
      
      return { previousOrder };
    },
    
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        utils.order.getById.setData(
          { id: variables.id },
          context.previousOrder
        );
      }
      toast.error(`Failed to update order status: ${error.message}`);
    },
    
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      utils.order.getById.invalidate({ id: variables.id });
    }
  });
}
```

---

## 2. BACKEND SERVICE ARCHITECTURE

### 2.1 Service Layer Organization

**Domain Services Structure:**
```
src/server/
├── services/                    # Business logic services
│   ├── order-service.ts         # Order management logic
│   ├── inventory-service.ts     # Inventory operations
│   ├── bom-service.ts          # BOM generation and management
│   ├── workflow-service.ts      # Workflow state management
│   ├── user-service.ts         # User management
│   ├── auth-service.ts         # Authentication logic
│   ├── notification-service.ts  # Notification handling
│   ├── file-service.ts         # File upload/storage
│   └── audit-service.ts        # Audit logging
├── repositories/               # Data access layer
│   ├── order-repository.ts
│   ├── inventory-repository.ts
│   ├── user-repository.ts
│   └── audit-repository.ts
├── validators/                 # Input validation schemas
│   ├── order-schemas.ts
│   ├── inventory-schemas.ts
│   └── user-schemas.ts
├── utils/                     # Shared utilities
│   ├── encryption.ts
│   ├── file-utils.ts
│   ├── date-utils.ts
│   └── number-utils.ts
└── integrations/             # External service integrations
    ├── erp-integration.ts
    ├── shipping-integration.ts
    └── file-storage.ts
```

### 2.2 Service Implementation Patterns

**Order Service Implementation:**
```typescript
// src/server/services/order-service.ts
import { OrderRepository } from '../repositories/order-repository';
import { BOMService } from './bom-service';
import { WorkflowService } from './workflow-service';
import { AuditService } from './audit-service';

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private bomService: BOMService,
    private workflowService: WorkflowService,
    private auditService: AuditService
  ) {}

  async createOrder(data: CreateOrderInput, createdBy: string): Promise<Order> {
    try {
      // Validate order data
      const validatedData = createOrderSchema.parse(data);
      
      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();
      
      // Create order record
      const order = await this.orderRepo.create({
        ...validatedData,
        orderNumber,
        createdBy,
        status: 'PENDING'
      });
      
      // Generate initial BOM
      const bom = await this.bomService.generateBOM(order.id, data.configuration);
      
      // Initialize workflow
      await this.workflowService.initializeOrderWorkflow(order.id);
      
      // Log audit trail
      await this.auditService.logAction({
        userId: createdBy,
        action: 'ORDER_CREATED',
        resource: 'order',
        resourceId: order.id,
        details: { orderNumber: order.orderNumber }
      });
      
      return order;
    } catch (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async updateOrderStatus(
    orderId: string, 
    newStatus: OrderStatus, 
    userId: string,
    notes?: string
  ): Promise<Order> {
    // Get current order
    const currentOrder = await this.orderRepo.getById(orderId);
    if (!currentOrder) {
      throw new NotFoundError('Order not found');
    }
    
    // Validate status transition
    const isValidTransition = await this.workflowService.validateStatusTransition(
      currentOrder.status,
      newStatus,
      userId
    );
    
    if (!isValidTransition) {
      throw new ValidationError(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
    }
    
    // Update order status
    const updatedOrder = await this.orderRepo.updateStatus(orderId, newStatus);
    
    // Log status change
    await this.workflowService.logStatusChange(orderId, {
      fromStatus: currentOrder.status,
      toStatus: newStatus,
      changedBy: userId,
      notes
    });
    
    // Trigger workflow actions
    await this.workflowService.handleStatusChange(orderId, newStatus);
    
    return updatedOrder;
  }
  
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    const sequence = await this.orderRepo.getNextSequenceNumber(year, month);
    
    return `TM${year}${month}${sequence.toString().padStart(4, '0')}`;
  }
}
```

**BOM Service Implementation:**
```typescript
// src/server/services/bom-service.ts
export class BOMService {
  constructor(
    private bomRepo: BOMRepository,
    private inventoryRepo: InventoryRepository,
    private partNumberService: PartNumberService
  ) {}

  async generateBOM(orderId: string, configuration: SinkConfiguration): Promise<BOM> {
    try {
      // Get base configuration template
      const template = await this.getBOMTemplate(configuration.sinkFamily);
      
      // Generate dynamic parts based on configuration
      const dynamicParts = await this.generateDynamicParts(configuration);
      
      // Calculate quantities based on configuration
      const calculatedParts = await this.calculatePartQuantities(
        template.parts,
        configuration
      );
      
      // Combine template and dynamic parts
      const allParts = [...calculatedParts, ...dynamicParts];
      
      // Validate part availability
      await this.validatePartAvailability(allParts);
      
      // Create BOM record
      const bom = await this.bomRepo.create({
        orderId,
        version: 1,
        isActive: true,
        items: allParts
      });
      
      return bom;
    } catch (error) {
      throw new Error(`Failed to generate BOM: ${error.message}`);
    }
  }

  private async generateDynamicParts(config: SinkConfiguration): Promise<BOMItem[]> {
    const dynamicParts: BOMItem[] = [];
    
    // Generate custom pegboard if needed
    if (config.pegboard.isCustom) {
      const customPegboard = await this.createCustomPegboard(config.pegboard);
      dynamicParts.push({
        partId: customPegboard.id,
        partNumber: customPegboard.partNumber,
        quantity: config.pegboard.quantity,
        unitCost: customPegboard.cost
      });
    }
    
    // Generate custom legs if needed
    if (config.legs.isCustom) {
      const customLegs = await this.createCustomLegs(config.legs);
      dynamicParts.push({
        partId: customLegs.id,
        partNumber: customLegs.partNumber,
        quantity: config.legs.quantity,
        unitCost: customLegs.cost
      });
    }
    
    return dynamicParts;
  }

  private async createCustomPegboard(pegboardConfig: PegboardConfig): Promise<Part> {
    // Generate 700-series part number
    const partNumber = await this.partNumberService.generatePartNumber('PEGBOARD');
    
    // Calculate cost based on specifications
    const cost = this.calculatePegboardCost(pegboardConfig);
    
    // Create custom part record
    return await this.inventoryRepo.createPart({
      partNumber,
      name: `Custom Pegboard ${pegboardConfig.width}x${pegboardConfig.height}`,
      description: `Custom pegboard with ${pegboardConfig.holePattern} pattern`,
      cost,
      isCustom: true,
      specifications: pegboardConfig
    });
  }
}
```

### 2.3 Repository Pattern Implementation

**Base Repository Pattern:**
```typescript
// src/server/repositories/base-repository.ts
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(protected db: PrismaClient) {}

  async getById(id: string): Promise<T | null> {
    try {
      return await this.getModel().findUnique({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get ${this.getModelName()} by id: ${error.message}`);
    }
  }

  async getAll(filters?: Record<string, any>): Promise<T[]> {
    try {
      return await this.getModel().findMany({
        where: filters,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get all ${this.getModelName()}: ${error.message}`);
    }
  }

  async create(data: CreateInput): Promise<T> {
    try {
      return await this.getModel().create({
        data
      });
    } catch (error) {
      throw new DatabaseError(`Failed to create ${this.getModelName()}: ${error.message}`);
    }
  }

  async update(id: string, data: UpdateInput): Promise<T> {
    try {
      return await this.getModel().update({
        where: { id },
        data
      });
    } catch (error) {
      throw new DatabaseError(`Failed to update ${this.getModelName()}: ${error.message}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.getModel().delete({
        where: { id }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to delete ${this.getModelName()}: ${error.message}`);
    }
  }

  protected abstract getModel(): any;
  protected abstract getModelName(): string;
}

// Order Repository Implementation
export class OrderRepository extends BaseRepository<Order, CreateOrderData, UpdateOrderData> {
  protected getModel() {
    return this.db.order;
  }

  protected getModelName(): string {
    return 'Order';
  }

  async getByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.db.order.findUnique({
      where: { orderNumber },
      include: {
        customer: true,
        boms: {
          where: { isActive: true },
          include: { items: { include: { part: true } } }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return await this.db.order.findMany({
      where: { status },
      include: {
        customer: true,
        creator: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return await this.db.order.update({
      where: { id },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  async getNextSequenceNumber(year: string, month: string): Promise<number> {
    const prefix = `TM${year}${month}`;
    
    const lastOrder = await this.db.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix
        }
      },
      orderBy: { orderNumber: 'desc' }
    });

    if (!lastOrder) {
      return 1;
    }

    const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
    return lastSequence + 1;
  }
}
```

---

## 3. API ARCHITECTURE

### 3.1 tRPC Router Organization

**Main Router Structure:**
```typescript
// src/server/api/root.ts
import { createTRPCRouter } from './trpc';
import { orderRouter } from './routers/order';
import { inventoryRouter } from './routers/inventory';
import { bomRouter } from './routers/bom';
import { userRouter } from './routers/user';
import { workflowRouter } from './routers/workflow';
import { qcRouter } from './routers/qc';
import { serviceRouter } from './routers/service';
import { authRouter } from './routers/auth';

export const appRouter = createTRPCRouter({
  order: orderRouter,
  inventory: inventoryRouter,
  bom: bomRouter,
  user: userRouter,
  workflow: workflowRouter,
  qc: qcRouter,
  service: serviceRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

**Order Router Implementation:**
```typescript
// src/server/api/routers/order.ts
export const orderRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'IN_PRODUCTION', 'PRE_QC', 'PRODUCTION_COMPLETE', 'FINAL_QC', 'QC_COMPLETE', 'SHIPPED', 'DELIVERED']).optional(),
      customerId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      await ctx.permissions.enforcePermission(ctx.user.id, 'order', 'read');
      
      return await ctx.services.orderService.getAll({
        ...input,
        userId: ctx.user.id,
        userRole: ctx.user.role
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await ctx.permissions.enforcePermission(ctx.user.id, 'order', 'read');
      
      const order = await ctx.services.orderService.getById(input.id);
      
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found'
        });
      }
      
      return order;
    }),

  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.permissions.enforcePermission(ctx.user.id, 'order', 'create');
      
      try {
        const order = await ctx.services.orderService.createOrder(input, ctx.user.id);
        
        // Send notifications
        await ctx.services.notificationService.notifyOrderCreated(order);
        
        return order;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create order: ${error.message}`
        });
      }
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: orderStatusSchema,
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.permissions.enforcePermission(ctx.user.id, 'order', 'update');
      
      return await ctx.services.orderService.updateOrderStatus(
        input.id,
        input.status,
        ctx.user.id,
        input.notes
      );
    }),

  getMetrics: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ ctx, input }) => {
      await ctx.permissions.enforcePermission(ctx.user.id, 'order', 'read');
      
      return await ctx.services.orderService.getMetrics(input.startDate, input.endDate);
    })
});
```

### 3.2 Middleware and Context

**tRPC Context Setup:**
```typescript
// src/server/api/trpc.ts
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;
  
  // Get session from NextAuth
  const session = await getServerAuthSession({ req, res });
  
  // Initialize services
  const services = {
    orderService: new OrderService(
      new OrderRepository(db),
      new BOMService(new BOMRepository(db), new InventoryRepository(db)),
      new WorkflowService(new WorkflowRepository(db)),
      new AuditService(new AuditRepository(db))
    ),
    inventoryService: new InventoryService(new InventoryRepository(db)),
    userService: new UserService(new UserRepository(db)),
    // ... other services
  };
  
  // Initialize permission service
  const permissions = new PermissionService(new UserRepository(db));
  
  return {
    session,
    db,
    services,
    permissions,
    user: session?.user
  };
};

// Protected procedure middleware
export const protectedProcedure = publicProcedure.use(
  ({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
        user: ctx.session.user
      },
    });
  }
);

// Role-based procedure middleware
export const createRoleProcedure = (allowedRoles: UserRole[]) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!allowedRoles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    
    return next({ ctx });
  });

// Usage examples
export const adminProcedure = createRoleProcedure(['ADMIN']);
export const coordinatorProcedure = createRoleProcedure(['PRODUCTION_COORDINATOR', 'ADMIN']);
export const qcProcedure = createRoleProcedure(['QC_PERSON', 'ADMIN']);
```

---

## 4. WORKFLOW ENGINE ARCHITECTURE

### 4.1 State Machine Implementation

**Order Status State Machine:**
```typescript
// src/server/services/workflow-service.ts
export class WorkflowService {
  private statusTransitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['IN_PRODUCTION'],
    IN_PRODUCTION: ['PRE_QC'],
    PRE_QC: ['PRODUCTION_COMPLETE', 'IN_PRODUCTION'], // Can go back if QC fails
    PRODUCTION_COMPLETE: ['FINAL_QC'],
    FINAL_QC: ['QC_COMPLETE', 'PRODUCTION_COMPLETE'], // Can go back if final QC fails
    QC_COMPLETE: ['SHIPPED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [] // Terminal state
  };

  private roleTransitionPermissions: Record<OrderStatus, UserRole[]> = {
    PENDING: ['PRODUCTION_COORDINATOR', 'ADMIN'],
    IN_PRODUCTION: ['ASSEMBLER', 'ADMIN'],
    PRE_QC: ['QC_PERSON', 'ADMIN'],
    PRODUCTION_COMPLETE: ['QC_PERSON', 'ADMIN'],
    FINAL_QC: ['QC_PERSON', 'ADMIN'],
    QC_COMPLETE: ['ADMIN'],
    SHIPPED: ['ADMIN'],
    DELIVERED: ['ADMIN']
  };

  async validateStatusTransition(
    currentStatus: OrderStatus,
    newStatus: OrderStatus,
    userId: string
  ): Promise<boolean> {
    // Check if transition is valid
    const allowedTransitions = this.statusTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      return false;
    }

    // Check if user has permission for this transition
    const user = await this.userService.getById(userId);
    const allowedRoles = this.roleTransitionPermissions[newStatus];
    
    return allowedRoles.includes(user.role);
  }

  async handleStatusChange(orderId: string, newStatus: OrderStatus): Promise<void> {
    switch (newStatus) {
      case 'IN_PRODUCTION':
        await this.onProductionStart(orderId);
        break;
      case 'PRE_QC':
        await this.onPreQCReady(orderId);
        break;
      case 'FINAL_QC':
        await this.onFinalQCReady(orderId);
        break;
      case 'QC_COMPLETE':
        await this.onQCComplete(orderId);
        break;
      case 'SHIPPED':
        await this.onOrderShipped(orderId);
        break;
    }
  }

  private async onProductionStart(orderId: string): Promise<void> {
    // Generate production tasks
    const order = await this.orderService.getById(orderId);
    const bom = await this.bomService.getActiveBOM(orderId);
    
    const tasks = await this.generateProductionTasks(order, bom);
    
    // Assign tasks to assemblers
    await this.taskService.createTasks(tasks);
    
    // Notify production team
    await this.notificationService.notifyProductionStart(orderId);
  }

  private async onPreQCReady(orderId: string): Promise<void> {
    // Notify QC team
    await this.notificationService.notifyQCRequired(orderId, 'PRE_QC');
    
    // Create QC checklist
    await this.qcService.createQCChecklist(orderId, 'PRE_QC');
  }
}
```

### 4.2 Task Generation and Management

**Production Task Generator:**
```typescript
// src/server/services/task-service.ts
export class TaskService {
  async generateProductionTasks(order: Order, bom: BOM): Promise<Task[]> {
    const tasks: Task[] = [];
    
    // Group BOM items by assembly sequence
    const assemblyGroups = this.groupBOMByAssembly(bom.items);
    
    for (const [assemblyId, parts] of assemblyGroups) {
      const assembly = await this.inventoryService.getAssemblyById(assemblyId);
      
      // Create assembly task
      tasks.push({
        orderId: order.id,
        title: `Assemble ${assembly.name}`,
        description: `Complete assembly of ${assembly.name} using required parts`,
        type: 'ASSEMBLY',
        priority: this.calculateTaskPriority(assembly),
        estimatedDuration: this.estimateAssemblyTime(assembly, parts),
        requiredParts: parts,
        workInstructions: await this.getWorkInstructions(assembly.id),
        assignedTo: null, // Will be assigned by production coordinator
        status: 'PENDING'
      });
    }
    
    // Add final integration task
    tasks.push({
      orderId: order.id,
      title: 'Final Integration and Testing',
      description: 'Complete final assembly integration and functional testing',
      type: 'INTEGRATION',
      priority: 'HIGH',
      estimatedDuration: 120, // 2 hours
      dependencies: tasks.map(t => t.id),
      status: 'PENDING'
    });
    
    return tasks;
  }

  private groupBOMByAssembly(bomItems: BOMItem[]): Map<string, BOMItem[]> {
    const groups = new Map<string, BOMItem[]>();
    
    for (const item of bomItems) {
      const assemblyId = item.part.subAssembly?.assemblyId || 'standalone';
      
      if (!groups.has(assemblyId)) {
        groups.set(assemblyId, []);
      }
      
      groups.get(assemblyId)!.push(item);
    }
    
    return groups;
  }
}
```

---

## 5. QUALITY CONTROL COMPONENT ARCHITECTURE

### 5.1 QC Checklist System

**Dynamic QC Checklist Generator:**
```typescript
// src/server/services/qc-service.ts
export class QCService {
  async createQCChecklist(orderId: string, phase: 'PRE_QC' | 'FINAL_QC'): Promise<QCChecklist> {
    const order = await this.orderService.getById(orderId);
    const bom = await this.bomService.getActiveBOM(orderId);
    
    // Get base checklist template for sink type
    const template = await this.getQCTemplate(order.sinkFamily, phase);
    
    // Generate dynamic checklist items based on configuration
    const dynamicItems = this.generateDynamicQCItems(order.configuration, bom);
    
    // Combine template and dynamic items
    const checklistItems = [...template.items, ...dynamicItems];
    
    return await this.qcRepository.createChecklist({
      orderId,
      phase,
      items: checklistItems,
      requiredPhotos: this.getRequiredPhotos(order.sinkFamily, phase),
      status: 'PENDING'
    });
  }

  private generateDynamicQCItems(config: SinkConfiguration, bom: BOM): QCItem[] {
    const items: QCItem[] = [];
    
    // Add pegboard-specific checks if custom pegboard
    if (config.pegboard.isCustom) {
      items.push({
        category: 'PEGBOARD',
        description: `Verify custom pegboard dimensions: ${config.pegboard.width}" x ${config.pegboard.height}"`,
        type: 'MEASUREMENT',
        required: true,
        tolerance: '±0.125"',
        expectedValue: `${config.pegboard.width}x${config.pegboard.height}`
      });
      
      items.push({
        category: 'PEGBOARD',
        description: 'Verify hole pattern matches specification',
        type: 'VISUAL_INSPECTION',
        required: true,
        photoRequired: true
      });
    }
    
    // Add basin-specific checks
    for (const basin of config.basins) {
      items.push({
        category: 'BASIN',
        description: `Test basin ${basin.position} drainage`,
        type: 'FUNCTIONAL_TEST',
        required: true,
        testProcedure: 'Fill basin with water and verify complete drainage within 30 seconds'
      });
    }
    
    return items;
  }
}
```

### 5.2 Photo Documentation System

**Photo Upload and Management:**
```typescript
// src/components/domain/quality/photo-uploader.tsx
interface PhotoUploaderProps {
  qcItemId: string;
  required: boolean;
  existingPhotos?: QCPhoto[];
  onPhotosUploaded: (photos: QCPhoto[]) => void;
}

export function PhotoUploader({ 
  qcItemId, 
  required, 
  existingPhotos = [], 
  onPhotosUploaded 
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<QCPhoto[]>(existingPhotos);
  
  const uploadPhoto = api.qc.uploadPhoto.useMutation({
    onSuccess: (photo) => {
      const updatedPhotos = [...photos, photo];
      setPhotos(updatedPhotos);
      onPhotosUploaded(updatedPhotos);
    }
  });

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
          toast.error('Only image files are allowed');
          continue;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          toast.error('File size must be less than 10MB');
          continue;
        }
        
        // Upload to server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('qcItemId', qcItemId);
        
        await uploadPhoto.mutateAsync({
          file: formData,
          qcItemId,
          filename: file.name,
          description: ''
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="photo-uploader">
      <div className="upload-area">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id={`photo-upload-${qcItemId}`}
        />
        
        <label 
          htmlFor={`photo-upload-${qcItemId}`}
          className="upload-button"
        >
          {uploading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Camera className="w-6 h-6" />
              Upload Photos {required && <span className="text-red-500">*</span>}
            </>
          )}
        </label>
      </div>
      
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-item">
              <img 
                src={photo.thumbnailUrl} 
                alt={photo.description || 'QC Photo'}
                className="thumbnail"
                onClick={() => openPhotoViewer(photo.fullUrl)}
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removePhoto(photo.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 6. SERVICE LAYER INTEGRATION

### 6.1 Service Container and Dependency Injection

**Service Container Implementation:**
```typescript
// src/server/container.ts
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }

  get<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found`);
    }
    return factory();
  }
}

// Service registration
export function setupServices(db: PrismaClient) {
  const container = ServiceContainer.getInstance();
  
  // Register repositories
  container.register('orderRepository', () => new OrderRepository(db));
  container.register('inventoryRepository', () => new InventoryRepository(db));
  container.register('userRepository', () => new UserRepository(db));
  
  // Register services
  container.register('orderService', () => new OrderService(
    container.get('orderRepository'),
    container.get('bomService'),
    container.get('workflowService'),
    container.get('auditService')
  ));
  
  container.register('bomService', () => new BOMService(
    container.get('bomRepository'),
    container.get('inventoryRepository'),
    container.get('partNumberService')
  ));
  
  // ... other service registrations
}
```

This comprehensive component architecture provides a solid foundation for implementing all the TORVAN MEDICAL workflow management system requirements. The modular design ensures maintainability, scalability, and testability while supporting the complex multi-role workflow requirements.

The architecture emphasizes:
- Type safety throughout the stack
- Clear separation of concerns
- Reusable component patterns
- Comprehensive error handling
- Performance optimization
- Security best practices
- Comprehensive testing capabilities

All components are designed to work together seamlessly while maintaining independence for future modifications and enhancements.