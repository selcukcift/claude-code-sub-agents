/**
 * TORVAN tRPC SERVER CONFIGURATION
 * ===============================
 * 
 * tRPC server setup with security middleware for medical device compliance
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "./context";
import { TorvanUserRole, Permission } from "@/lib/security/rbac";
import superjson from "superjson";

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Include zodError for validation errors
        zodError: error.cause?.name === 'ZodError' ? error.cause.flatten() : null,
      },
    };
  },
});

// Export tRPC router and procedure helpers
export const router = t.router;
export const middleware = t.middleware;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Authentication middleware - requires valid user session
 */
const authMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Role-based authorization middleware
 */
const createRoleMiddleware = (requiredRoles: TorvanUserRole[]) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userRoles = ctx.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient role permissions. Required: ${requiredRoles.join(', ')}`,
      });
    }

    return next({ ctx });
  });
};

/**
 * Permission-based authorization middleware
 */
const createPermissionMiddleware = (requiredPermissions: Permission[]) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    const userPermissions = ctx.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      });
    }

    return next({ ctx });
  });
};

/**
 * Audit logging middleware for medical device compliance
 */
const auditMiddleware = middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;

  // Log the operation for audit trail
  if (ctx.user) {
    try {
      await ctx.prisma.auditLog.create({
        data: {
          userId: BigInt(ctx.user.id),
          action: type === 'mutation' ? 'UPDATE' : 'SELECT',
          tableName: 'TRPC',
          recordId: path,
          newValues: {
            procedure: path,
            type,
            duration,
            timestamp: new Date().toISOString()
          },
          changedAt: new Date(),
          dataClassification: 'INTERNAL'
        }
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't fail the request if audit logging fails
    }
  }

  return result;
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(auditMiddleware);

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = t.procedure
  .use(authMiddleware)
  .use(createRoleMiddleware([TorvanUserRole.ADMIN]))
  .use(auditMiddleware);

/**
 * Production coordinator procedure
 */
export const productionCoordinatorProcedure = t.procedure
  .use(authMiddleware)
  .use(createRoleMiddleware([
    TorvanUserRole.ADMIN,
    TorvanUserRole.PRODUCTION_COORDINATOR
  ]))
  .use(auditMiddleware);

/**
 * QC inspector procedure
 */
export const qcInspectorProcedure = t.procedure
  .use(authMiddleware)
  .use(createRoleMiddleware([
    TorvanUserRole.ADMIN,
    TorvanUserRole.QC_INSPECTOR
  ]))
  .use(auditMiddleware);

/**
 * Procurement manager procedure
 */
export const procurementManagerProcedure = t.procedure
  .use(authMiddleware)
  .use(createRoleMiddleware([
    TorvanUserRole.ADMIN,
    TorvanUserRole.PROCUREMENT_MANAGER
  ]))
  .use(auditMiddleware);

/**
 * Create role-specific procedure
 */
export const createRoleProcedure = (roles: TorvanUserRole[]) => {
  return t.procedure
    .use(authMiddleware)
    .use(createRoleMiddleware(roles))
    .use(auditMiddleware);
};

/**
 * Create permission-specific procedure
 */
export const createPermissionProcedure = (permissions: Permission[]) => {
  return t.procedure
    .use(authMiddleware)
    .use(createPermissionMiddleware(permissions))
    .use(auditMiddleware);
};

/**
 * Create combined role and permission procedure
 */
export const createSecureProcedure = (
  roles?: TorvanUserRole[],
  permissions?: Permission[]
) => {
  let procedure = t.procedure.use(authMiddleware);

  if (roles && roles.length > 0) {
    procedure = procedure.use(createRoleMiddleware(roles));
  }

  if (permissions && permissions.length > 0) {
    procedure = procedure.use(createPermissionMiddleware(permissions));
  }

  return procedure.use(auditMiddleware);
};