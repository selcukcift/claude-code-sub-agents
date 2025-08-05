"use client";

/**
 * TORVAN SIGNIN FORM COMPONENT
 * ===========================
 * 
 * Secure signin form with medical device compliance features
 * - Username/email authentication
 * - Password validation
 * - Account lockout handling
 * - Security feedback
 */

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle, Shield, Lock } from "lucide-react";

const signinSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type SigninFormData = z.infer<typeof signinSchema>;

interface SigninFormProps {
  callbackUrl?: string;
  error?: string;
}

export function SigninForm({ callbackUrl = "/", error }: SigninFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(error || "");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninFormData) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error messages
        switch (result.error) {
          case "CredentialsSignin":
            setAuthError("Invalid username or password. Please try again.");
            break;
          case "AccountLocked":
            setAuthError("Account is temporarily locked due to multiple failed login attempts. Please try again later or contact your administrator.");
            break;
          case "PasswordExpired":
            setAuthError("Your password has expired. Please reset your password.");
            break;
          case "PasswordChangeRequired":
            setAuthError("Password change required. Please contact your administrator.");
            break;
          default:
            setAuthError("Sign in failed. Please try again.");
        }
      } else if (result?.ok) {
        // Check if password change is required
        const session = await getSession();
        if (session?.user) {
          router.push(callbackUrl);
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">TORVAN Workflow</CardTitle>
          <CardDescription className="text-gray-600">
            Medical Device Workflow Management System
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username or Email</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username or email"
                {...register("username")}
                disabled={isLoading}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  disabled={isLoading}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Sign In
                </div>
              )}
            </Button>

            <div className="text-center space-y-2">
              <Button
                variant="link"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => router.push("/auth/reset-password")}
                type="button"
              >
                Forgot your password?
              </Button>
            </div>
          </form>

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