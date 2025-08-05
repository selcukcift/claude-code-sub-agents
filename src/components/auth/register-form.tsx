"use client";

/**
 * TORVAN REGISTRATION FORM COMPONENT
 * =================================
 * 
 * Secure user registration form with medical device compliance
 * - Strong password validation
 * - Real-time password strength feedback
 * - Role assignment (admin only)
 * - Medical device security standards
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, AlertCircle, Shield, UserPlus, CheckCircle, XCircle } from "lucide-react";
import { passwordSchema, analyzePasswordStrength, type PasswordStrength } from "@/lib/security/password";
import { TorvanUserRole } from "@/lib/security/rbac";

const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be at most 50 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  language: z.string().default("en"),
  timezone: z.string().default("UTC"),
  roles: z.array(z.nativeEnum(TorvanUserRole)).optional(),
  acceptTerms: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  isAdminCreating?: boolean;
  onSuccess?: () => void;
}

export function RegisterForm({ isAdminCreating = false, onSuccess }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      language: "en",
      timezone: "UTC",
      roles: isAdminCreating ? [] : undefined,
    },
  });

  const password = watch("password");

  // Update password strength in real-time
  useState(() => {
    if (password) {
      const strength = analyzePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          createdByAdmin: isAdminCreating,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details) {
          setError(`Registration failed: ${result.details.map((d: any) => d.message).join(", ")}`);
        } else {
          setError(result.error || "Registration failed");
        }
        return;
      }

      setSuccess("User registered successfully!");
      
      if (onSuccess) {
        onSuccess();
      } else if (!isAdminCreating) {
        // Redirect to signin for self-registration
        setTimeout(() => {
          router.push("/auth/signin?message=registration-success");
        }, 2000);
      }

    } catch (error) {
      console.error("Registration error:", error);
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
    <div className={isAdminCreating ? "" : "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4"}>
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          {!isAdminCreating && (
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {isAdminCreating ? "Create New User" : "Register for TORVAN"}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isAdminCreating 
              ? "Create a new user account with appropriate roles"
              : "Medical Device Workflow Management System"
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  {...register("firstName")}
                  disabled={isLoading}
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Enter last name"
                  {...register("lastName")}
                  disabled={isLoading}
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  {...register("username")}
                  disabled={isLoading}
                  className={errors.username ? "border-red-500" : ""}
                />
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  {...register("email")}
                  disabled={isLoading}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Job Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="Enter job title"
                  {...register("jobTitle")}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="Enter department"
                  {...register("department")}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password (min 12 characters)"
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
              {renderPasswordStrength()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  {...register("confirmPassword")}
                  disabled={isLoading}
                  className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
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
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Role Selection (Admin Only) */}
            {isAdminCreating && (
              <div className="space-y-2">
                <Label>User Roles</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(TorvanUserRole).map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        onCheckedChange={(checked) => {
                          const currentRoles = watch("roles") || [];
                          if (checked) {
                            setValue("roles", [...currentRoles, role]);
                          } else {
                            setValue("roles", currentRoles.filter(r => r !== role));
                          }
                        }}
                      />
                      <Label htmlFor={role} className="text-sm font-normal">
                        {role.replace(/_/g, " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            {!isAdminCreating && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptTerms"
                  {...register("acceptTerms")}
                />
                <Label htmlFor="acceptTerms" className="text-sm">
                  I accept the terms and conditions and privacy policy
                </Label>
              </div>
            )}
            {errors.acceptTerms && (
              <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || (passwordStrength && !passwordStrength.isValid)}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                <div className="flex items-center">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {isAdminCreating ? "Create User" : "Create Account"}
                </div>
              )}
            </Button>

            {!isAdminCreating && (
              <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => router.push("/auth/signin")}
                  type="button"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            )}
          </form>

          {!isAdminCreating && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>🔒 Secure medical device authentication</p>
                <p>HIPAA compliant • FDA validated</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}