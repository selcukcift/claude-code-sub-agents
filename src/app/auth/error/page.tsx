/**
 * TORVAN AUTHENTICATION ERROR PAGE
 * ===============================
 * 
 * Error page for authentication failures
 */

"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification: "The verification token has expired or is invalid.",
  Default: "An error occurred during authentication.",
  CredentialsSignin: "Invalid credentials. Please check your username and password.",
  SessionRequired: "Please sign in to access this page.",
  Callback: "Error in authentication callback.",
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Default";
  
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Authentication Error
          </CardTitle>
          <CardDescription className="text-gray-600">
            TORVAN Workflow Management System
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 text-center">
              If you continue to experience issues, please contact your system administrator.
            </p>
            
            <div className="text-xs text-gray-500 text-center">
              <p><strong>Error Code:</strong> {error}</p>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                Go to Home
              </Link>
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>🔒 Secure medical device authentication</p>
              <p>HIPAA compliant • FDA validated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}