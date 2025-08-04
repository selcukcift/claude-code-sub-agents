// User Roles and Authentication Types
export type UserRole = 
  | 'PRODUCTION_COORDINATOR'
  | 'ADMIN'
  | 'PROCUREMENT'
  | 'QC_PERSON'
  | 'ASSEMBLER'
  | 'SERVICE_DEPARTMENT';

// Order Status Types  
export type OrderStatus =
  | 'PENDING'
  | 'IN_PRODUCTION'
  | 'PRE_QC'
  | 'PRODUCTION_COMPLETE'
  | 'FINAL_QC'
  | 'QC_COMPLETE'
  | 'SHIPPED'
  | 'DELIVERED';

// Priority Levels
export type OrderPriority = 'STANDARD' | 'RUSH' | 'EMERGENCY';

// Basic Entity Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  shippingAddress: Address;
  orders: Order[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  status: OrderStatus;
  priority: OrderPriority;
  specialInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
  orderItems: OrderItem[];
  bom?: BOM;
}

export interface OrderItem {
  id: string;
  orderId: string;
  sinkId: string;
  quantity: number;
  configuration: SinkConfiguration;
  buildNumber: string;
}

export interface SinkConfiguration {
  bodyMaterial: string;
  bodySize: string;
  mountingOptions: string[];
  basinType: string;
  basinQuantity: number;
  pegboardOptions?: PegboardOptions;
  legConfiguration: LegConfiguration;
  additionalComponents: string[];
}

export interface PegboardOptions {
  size: string;
  holePattern: string;
  material: string;
}

export interface LegConfiguration {
  height: string;
  material: string;
  adjustable: boolean;
}

// Inventory Types
export interface Category {
  id: string;
  name: string;
  description: string;
  assemblies: Assembly[];
}

export interface Assembly {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  categoryId: string;
  subAssemblies: SubAssembly[];
}

export interface SubAssembly {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  assemblyId: string;
  parts: Part[];
}

export interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  subAssemblyId?: string;
  cost: number;
  inStock: number;
  minimumStock: number;
}

// BOM Types
export interface BOM {
  id: string;
  orderId: string;
  version: number;
  bomItems: BOMItem[];
  approved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface BOMItem {
  id: string;
  bomId: string;
  partId: string;
  part: Part;
  quantity: number;
  isCustomPart: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}