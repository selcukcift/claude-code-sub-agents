"use client";

/**
 * TORVAN PASSWORD RESET FORM COMPONENT
 * ===================================
 * 
 * Secure password reset form with medical device compliance
 * - Token-based password reset
 * - Strong password validation
 * - Multi-step process
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle, Shield, Mail, Key, CheckCircle, XCircle } from "lucide-react";
import { passwordSchema, analyzePasswordStrength, type PasswordStrength } from "@/lib/security/password";

// Schema for requesting password reset
const resetRequestSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
});

// Schema for confirming password reset
const resetConfirmSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ResetRequestData = z.infer<typeof resetRequestSchema>;
type ResetConfirmData = z.infer<typeof resetConfirmSchema>;

export function ResetPasswordForm() {
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  // If token is in URL, go directly to confirm step
  useState(() => {
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setStep('confirm');
    }
  }, [tokenFromUrl]);

  const requestForm = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
  });

  const confirmForm = useForm<ResetConfirmData>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: {
      token: tokenFromUrl || "",
    },
  });

  const password = confirmForm.watch("newPassword");

  // Update password strength in real-time
  useState(() => {
    if (password) {
      const strength = analyzePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const onRequestSubmit = async (data: ResetRequestData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to send reset email");
        return;
      }

      setSuccess("If an account with that username/email exists, a password reset email has been sent.");
      
      // In development, show the token for testing
      if (process.env.NODE_ENV === "development" && result.resetToken) {
        setResetToken(result.resetToken);
        setTimeout(() => {
          setStep('confirm');
          confirmForm.setValue('token', result.resetToken);
        }, 2000);
      }

    } catch (error) {
      console.error("Password reset request error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onConfirmSubmit = async (data: ResetConfirmData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to reset password");
        return;
      }

      setSuccess("Password reset successfully! You can now sign in with your new password.");
      
      setTimeout(() => {
        router.push("/auth/signin?message=password-reset-success");
      }, 3000);

    } catch (error) {
      console.error("Password reset confirmation error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordStrength = () => {
    if (!passwordStrength || !password) return null;

    const getStrengthColor = (score: number) => {
      if (score <= 1) return "text-red-600";
      if (score <= 2) return "text-orange-600";
      if (score <= 3) return "text-yellow-600";
      return "text-green-600";
    };

    const getStrengthText = (score: number) => {
      if (score <= 1) return "Weak";
      if (score <= 2) return "Fair";
      if (score <= 3) return "Good";
      return "Strong";
    };

    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                passwordStrength.score <= 1 ? "bg-red-500" :
                passwordStrength.score <= 2 ? "bg-orange-500" :
                passwordStrength.score <= 3 ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${getStrengthColor(passwordStrength.score)}`}>
            {getStrengthText(passwordStrength.score)}
          </span>
        </div>
        
        {passwordStrength.feedback.length > 0 && (
          <div className="space-y-1">
            {passwordStrength.feedback.map((feedback, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <XCircle className="h-3 w-3 text-red-500 mr-1" />
                {feedback}
              </div>
            ))}
          </div>
        )}

        {passwordStrength.isValid && (
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Password meets medical device security requirements
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 'request' ? 'Reset Password' : 'Set New Password'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {step === 'request' 
              ? 'Enter your username or email to reset your password'
              : 'Enter your new password'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 text-green-700 mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {step === 'request' ? (
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username or email"
                  {...requestForm.register("username")}
                  disabled={isLoading}
                  className={requestForm.formState.errors.username ? "border-red-500" : ""}
                />
                {requestForm.formState.errors.username && (
                  <p className="text-sm text-red-600">
                    {requestForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending reset email...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reset Email
                  </div>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => router.push("/auth/signin")}
                  type="button"
                >
                  Back to Sign In
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">Reset Token</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Enter the reset token from your email"
                  {...confirmForm.register("token")}
                  disabled={isLoading}
                  className={confirmForm.formState.errors.token ? "border-red-500" : ""}
                />
                {confirmForm.formState.errors.token && (
                  <p className="text-sm text-red-600">
                    {confirmForm.formState.errors.token.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    {...confirmForm.register("newPassword")}
                    disabled={isLoading}
                    className={confirmForm.formState.errors.newPassword ? "border-red-500 pr-10" : "pr-10"}
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
                {confirmForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-600">
                    {confirmForm.formState.errors.newPassword.message}
                  </p>
                )}
                {renderPasswordStrength()}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    {...confirmForm.register("confirmPassword")}
                    disabled={isLoading}
                    className={confirmForm.formState.errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {confirmForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">
                    {confirmForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || (passwordStrength && !passwordStrength.isValid)}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resetting password...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    Reset Password
                  </div>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => setStep('request')}
                  type="button"
                >
                  Request new reset email
                </Button>
              </div>
            </form>
          )}

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