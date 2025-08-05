"use client";

/**
 * TORVAN AUTHENTICATION GUARD COMPONENT
 * ====================================
 * 
 * Route protection component with role-based access control
 * - Authentication verification
 * - Role-based authorization
 * - Permission-based authorization
 * - Loading states
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { TorvanUserRole, Permission } from "@/lib/security/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, Lock } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredRoles?: TorvanUserRole[];
  requiredPermissions?: Permission[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requiredRoles = [],
  requiredPermissions = [],
  fallback,
  redirectTo = "/auth/signin"
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (requireAuth && status === "unauthenticated") {
      router.push(redirectTo);
      return;
    }

    if (session?.user && requiredRoles.length > 0) {
      const userRoles = session.user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        router.push("/unauthorized");
        return;
      }
    }

    if (session?.user && requiredPermissions.length > 0) {
      const userPermissions = session.user.permissions || [];
      const hasAllPermissions = requiredPermissions.every(
        permission => userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [status, session, requireAuth, requiredRoles, requiredPermissions, router, redirectTo]);

  // Loading state
  if (status === "loading") {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Shield className="h-12 w-12 text-blue-600 animate-pulse mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading TORVAN</h2>
            <p className="text-gray-600 text-center">
              Verifying your authentication and permissions...
            </p>
            <div className="mt-4 flex space-x-1">
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (requireAuth && status === "unauthenticated") {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Lock className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 text-center mb-4">
              You need to be signed in to access this page.
            </p>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Redirecting to sign in page...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role authorization
  if (session?.user && requiredRoles.length > 0) {
    const userRoles = session.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Shield className="h-12 w-12 text-orange-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Insufficient Role Permissions</h2>
              <p className="text-gray-600 text-center mb-4">
                You don't have the required role to access this page.
              </p>
              <div className="text-sm text-gray-500 text-center space-y-1">
                <p><strong>Your roles:</strong> {userRoles.join(", ") || "None"}</p>
                <p><strong>Required roles:</strong> {requiredRoles.join(" or ")}</p>
              </div>
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Contact your administrator for access.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Check permission authorization
  if (session?.user && requiredPermissions.length > 0) {
    const userPermissions = session.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        permission => !userPermissions.includes(permission)
      );

      return fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Lock className="h-12 w-12 text-red-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Insufficient Permissions</h2>
              <p className="text-gray-600 text-center mb-4">
                You don't have the required permissions to access this page.
              </p>
              <div className="text-sm text-gray-500 text-center space-y-1">
                <p><strong>Missing permissions:</strong></p>
                <ul className="list-disc list-inside">
                  {missingPermissions.map(permission => (
                    <li key={permission}>{permission.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Contact your administrator for access.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Hook to check if user has specific role
 */
export function useHasRole(role: TorvanUserRole): boolean {
  const { data: session } = useSession();
  return session?.user?.roles?.includes(role) || false;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: TorvanUserRole[]): boolean {
  const { data: session } = useSession();
  const userRoles = session?.user?.roles || [];
  return roles.some(role => userRoles.includes(role));
}

/**
 * Hook to check if user has specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { data: session } = useSession();
  return session?.user?.permissions?.includes(permission) || false;
}

/**
 * Hook to check if user has all specified permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { data: session } = useSession();
  const userPermissions = session?.user?.permissions || [];
  return permissions.every(permission => userPermissions.includes(permission));
}