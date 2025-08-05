/**
 * TORVAN UNAUTHORIZED ACCESS PAGE
 * ==============================
 * 
 * Page displayed when user lacks required permissions or roles
 */

"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-600">
            Access Denied
          </CardTitle>
          <CardDescription className="text-gray-600">
            TORVAN Workflow Management System
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have the required permissions to access this page.
            </AlertDescription>
          </Alert>

          {session?.user && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Your Account Details:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Username:</strong> {session.user.username}</p>
                <p><strong>Name:</strong> {session.user.firstName} {session.user.lastName}</p>
                <p><strong>Department:</strong> {session.user.department || "Not assigned"}</p>
                <p><strong>Job Title:</strong> {session.user.jobTitle || "Not assigned"}</p>
                <p><strong>Current Roles:</strong> {session.user.roles?.join(", ") || "None"}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-gray-600 text-center">
              If you believe you should have access to this resource, please contact your system administrator or department manager.
            </p>
            
            <div className="text-xs text-gray-500 text-center">
              <p>This access attempt has been logged for security purposes.</p>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/auth/signin">
                Sign In as Different User
              </Link>
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>🔒 Medical device security compliance</p>
              <p>Role-based access control • Audit logging</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}