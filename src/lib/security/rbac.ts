/**
 * TORVAN ROLE-BASED ACCESS CONTROL (RBAC) UTILITIES
 * ================================================
 * 
 * Comprehensive RBAC system for medical device workflow management
 * - Role and permission validation
 * - Route and API protection
 * - Medical device security compliance
 */

import { User, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Medical device user roles
export enum TorvanUserRole {
  ADMIN = "ADMIN",
  PRODUCTION_COORDINATOR = "PRODUCTION_COORDINATOR",
  PROCUREMENT_MANAGER = "PROCUREMENT_MANAGER",
  QC_INSPECTOR = "QC_INSPECTOR",
  ASSEMBLER = "ASSEMBLER",
  SERVICE_DEPT = "SERVICE_DEPT"
}

// Permission categories for medical device operations
export enum PermissionCategory {
  USER_MANAGEMENT = "USER_MANAGEMENT",
  ORDER_MANAGEMENT = "ORDER_MANAGEMENT",
  INVENTORY_MANAGEMENT = "INVENTORY_MANAGEMENT",
  BOM_MANAGEMENT = "BOM_MANAGEMENT",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  PRODUCTION = "PRODUCTION",
  CONFIGURATION = "CONFIGURATION",
  REPORTING = "REPORTING",
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  DOCUMENT_MANAGEMENT = "DOCUMENT_MANAGEMENT"
}

// Standard CRUD permissions
export enum Permission {
  // User Management
  USER_CREATE = "USER_CREATE",
  USER_READ = "USER_READ",
  USER_UPDATE = "USER_UPDATE",
  USER_DELETE = "USER_DELETE",
  USER_ROLE_ASSIGN = "USER_ROLE_ASSIGN",

  // Order Management
  ORDER_CREATE = "ORDER_CREATE",
  ORDER_READ = "ORDER_READ",
  ORDER_UPDATE = "ORDER_UPDATE",
  ORDER_DELETE = "ORDER_DELETE",
  ORDER_APPROVE = "ORDER_APPROVE",
  ORDER_PHASE_TRANSITION = "ORDER_PHASE_TRANSITION",

  // Inventory Management
  INVENTORY_READ = "INVENTORY_READ",
  INVENTORY_UPDATE = "INVENTORY_UPDATE",
  PART_CREATE = "PART_CREATE",
  PART_UPDATE = "PART_UPDATE",
  PART_DELETE = "PART_DELETE",
  ASSEMBLY_CREATE = "ASSEMBLY_CREATE",
  ASSEMBLY_UPDATE = "ASSEMBLY_UPDATE",
  ASSEMBLY_DELETE = "ASSEMBLY_DELETE",

  // BOM Management
  BOM_CREATE = "BOM_CREATE",
  BOM_READ = "BOM_READ",
  BOM_UPDATE = "BOM_UPDATE",
  BOM_DELETE = "BOM_DELETE",
  BOM_APPROVE = "BOM_APPROVE",
  BOM_GENERATE = "BOM_GENERATE",

  // Configuration Management
  CONFIG_CREATE = "CONFIG_CREATE",
  CONFIG_READ = "CONFIG_READ",
  CONFIG_UPDATE = "CONFIG_UPDATE",
  CONFIG_DELETE = "CONFIG_DELETE",
  CONFIG_RULE_MANAGE = "CONFIG_RULE_MANAGE",

  // Quality Control
  QC_PROCESS_CREATE = "QC_PROCESS_CREATE",
  QC_PROCESS_READ = "QC_PROCESS_READ",
  QC_INSPECTION_CREATE = "QC_INSPECTION_CREATE",
  QC_INSPECTION_PERFORM = "QC_INSPECTION_PERFORM",
  QC_INSPECTION_APPROVE = "QC_INSPECTION_APPROVE",
  QC_REPORT_GENERATE = "QC_REPORT_GENERATE",

  // Production
  PRODUCTION_TASK_CREATE = "PRODUCTION_TASK_CREATE",
  PRODUCTION_TASK_READ = "PRODUCTION_TASK_READ",
  PRODUCTION_TASK_UPDATE = "PRODUCTION_TASK_UPDATE",
  PRODUCTION_TASK_COMPLETE = "PRODUCTION_TASK_COMPLETE",
  PRODUCTION_SCHEDULE = "PRODUCTION_SCHEDULE",

  // Document Management
  DOCUMENT_CREATE = "DOCUMENT_CREATE",
  DOCUMENT_READ = "DOCUMENT_READ",
  DOCUMENT_UPDATE = "DOCUMENT_UPDATE",
  DOCUMENT_DELETE = "DOCUMENT_DELETE",
  DOCUMENT_APPROVE = "DOCUMENT_APPROVE",

  // Reporting
  REPORT_VIEW_BASIC = "REPORT_VIEW_BASIC",
  REPORT_VIEW_DETAILED = "REPORT_VIEW_DETAILED",
  REPORT_VIEW_FINANCIAL = "REPORT_VIEW_FINANCIAL",
  REPORT_EXPORT = "REPORT_EXPORT",

  // System Administration
  SYSTEM_CONFIG = "SYSTEM_CONFIG",
  AUDIT_LOG_VIEW = "AUDIT_LOG_VIEW",
  EXTERNAL_SYSTEM_MANAGE = "EXTERNAL_SYSTEM_MANAGE"
}

/**
 * Role hierarchy and permission mapping for medical device compliance
 */
export const ROLE_PERMISSIONS: Record<TorvanUserRole, Permission[]> = {
  [TorvanUserRole.ADMIN]: [
    // Full system access
    ...Object.values(Permission)
  ],

  [TorvanUserRole.PRODUCTION_COORDINATOR]: [
    Permission.ORDER_READ,
    Permission.ORDER_UPDATE,
    Permission.ORDER_PHASE_TRANSITION,
    Permission.INVENTORY_READ,
    Permission.BOM_READ,
    Permission.BOM_GENERATE,
    Permission.CONFIG_READ,
    Permission.CONFIG_CREATE,
    Permission.CONFIG_UPDATE,
    Permission.PRODUCTION_TASK_CREATE,
    Permission.PRODUCTION_TASK_READ,
    Permission.PRODUCTION_TASK_UPDATE,
    Permission.PRODUCTION_SCHEDULE,
    Permission.QC_PROCESS_READ,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_CREATE,
    Permission.REPORT_VIEW_BASIC,
    Permission.REPORT_VIEW_DETAILED,
  ],

  [TorvanUserRole.PROCUREMENT_MANAGER]: [
    Permission.ORDER_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_UPDATE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_UPDATE,
    Permission.PART_CREATE,
    Permission.PART_UPDATE,
    Permission.ASSEMBLY_READ,
    Permission.BOM_READ,
    Permission.CONFIG_READ,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_CREATE,
    Permission.REPORT_VIEW_BASIC,
    Permission.REPORT_VIEW_DETAILED,
  ],

  [TorvanUserRole.QC_INSPECTOR]: [
    Permission.ORDER_READ,
    Permission.INVENTORY_READ,
    Permission.BOM_READ,
    Permission.CONFIG_READ,
    Permission.QC_PROCESS_READ,
    Permission.QC_INSPECTION_CREATE,
    Permission.QC_INSPECTION_PERFORM,
    Permission.QC_INSPECTION_APPROVE,
    Permission.QC_REPORT_GENERATE,
    Permission.PRODUCTION_TASK_READ,
    Permission.PRODUCTION_TASK_UPDATE,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_CREATE,
    Permission.REPORT_VIEW_BASIC,
  ],

  [TorvanUserRole.ASSEMBLER]: [
    Permission.ORDER_READ,
    Permission.INVENTORY_READ,
    Permission.BOM_READ,
    Permission.CONFIG_READ,
    Permission.PRODUCTION_TASK_READ,
    Permission.PRODUCTION_TASK_UPDATE,
    Permission.PRODUCTION_TASK_COMPLETE,
    Permission.QC_PROCESS_READ,
    Permission.DOCUMENT_READ,
    Permission.REPORT_VIEW_BASIC,
  ],

  [TorvanUserRole.SERVICE_DEPT]: [
    Permission.ORDER_READ,
    Permission.INVENTORY_READ,
    Permission.PART_READ,
    Permission.ASSEMBLY_READ,
    Permission.BOM_READ,
    Permission.CONFIG_READ,
    Permission.DOCUMENT_READ,
    Permission.DOCUMENT_CREATE,
    Permission.REPORT_VIEW_BASIC,
  ]
};

/**
 * Get current user session with RBAC data
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRoles: string[], requiredRole: TorvanUserRole): boolean {
  return userRoles.includes(requiredRole);
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRoles: string[], requiredRoles: TorvanUserRole[]): boolean {
  return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userPermissions: string[], requiredPermission: Permission): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(userPermissions: string[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Get user's effective permissions based on roles
 */
export function getUserEffectivePermissions(userRoles: string[]): Permission[] {
  const permissions = new Set<Permission>();
  
  userRoles.forEach(roleName => {
    const role = roleName as TorvanUserRole;
    if (ROLE_PERMISSIONS[role]) {
      ROLE_PERMISSIONS[role].forEach(permission => permissions.add(permission));
    }
  });
  
  return Array.from(permissions);
}

/**
 * Middleware function to check user authorization
 */
export async function requireAuth(requiredPermissions?: Permission[], requiredRoles?: TorvanUserRole[]) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Authentication required");
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(user.roles, requiredRoles)) {
      throw new Error("Insufficient role permissions");
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAllPermissions(user.permissions, requiredPermissions)) {
      throw new Error("Insufficient permissions");
    }
  }

  return user;
}

/**
 * Check if user can access a specific resource
 */
export async function canAccessResource(
  resourceType: string,
  resourceId: string,
  action: Permission
): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (!user) {
    return false;
  }

  // Admin has access to everything
  if (hasRole(user.roles, TorvanUserRole.ADMIN)) {
    return true;
  }

  // Check basic permission
  if (!hasPermission(user.permissions, action)) {
    return false;
  }

  // Additional resource-specific checks can be added here
  // For example, checking if user belongs to the same department
  // or has access to specific orders, etc.

  return true;
}

/**
 * Get filtered permissions for a user role (for UI rendering)
 */
export function getPermissionsForRole(role: TorvanUserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user is in the same department (for data isolation)
 */
export async function isSameDepartment(userId: string, targetUserId: string): Promise<boolean> {
  const [user, targetUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { department: true }
    }),
    prisma.user.findUnique({
      where: { id: BigInt(targetUserId) },
      select: { department: true }
    })
  ]);

  return user?.department === targetUser?.department;
}

/**
 * Audit user action for medical device compliance
 */
export async function auditUserAction(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: BigInt(userId),
        action: action as any,
        tableName: resourceType,
        recordId: resourceId,
        newValues: details,
        changedAt: new Date(),
        dataClassification: "INTERNAL"
      }
    });
  } catch (error) {
    console.error("Failed to audit user action:", error);
  }
}