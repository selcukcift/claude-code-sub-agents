/**
 * TORVAN tRPC CONTEXT CONFIGURATION
 * ================================
 * 
 * tRPC context with authentication and security for medical device compliance
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TorvanUserRole, Permission } from "@/lib/security/rbac";

/**
 * Create tRPC context with user session and security data
 */
export async function createTRPCContext(opts: { req: Request }) {
  const session = await getServerSession(authOptions);
  
  return {
    session,
    user: session?.user || null,
    prisma,
    // Helper functions for authorization
    hasRole: (role: TorvanUserRole) => {
      return session?.user?.roles?.includes(role) || false;
    },
    hasPermission: (permission: Permission) => {
      return session?.user?.permissions?.includes(permission) || false;
    },
    hasAnyRole: (roles: TorvanUserRole[]) => {
      return roles.some(role => session?.user?.roles?.includes(role)) || false;
    },
    hasAnyPermission: (permissions: Permission[]) => {
      return permissions.some(permission => session?.user?.permissions?.includes(permission)) || false;
    },
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;