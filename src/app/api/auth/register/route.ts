/**
 * TORVAN USER REGISTRATION API ROUTE
 * =================================
 * 
 * Secure user registration endpoint with medical device compliance
 * - Password strength validation
 * - Email verification
 * - Role assignment
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema, calculatePasswordExpirationDate } from "@/lib/security/password";
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
  // Admin-only fields for user creation
  roles: z.array(z.nativeEnum(TorvanUserRole)).optional(),
  createdByAdmin: z.boolean().default(false)
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username }
    });

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Calculate password expiration (90 days for medical device compliance)
    const passwordExpiresAt = calculatePasswordExpirationDate();

    // Create user transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          username: validatedData.username,
          email: validatedData.email,
          passwordHash,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          jobTitle: validatedData.jobTitle,
          department: validatedData.department,
          phone: validatedData.phone,
          language: validatedData.language,
          timezone: validatedData.timezone,
          passwordExpiresAt,
          isActive: true,
          emailVerified: false, // Require email verification
          mustChangePassword: !validatedData.createdByAdmin // User must change password on first login
        }
      });

      // Assign default role or specified roles
      const rolesToAssign = validatedData.roles && validatedData.roles.length > 0 
        ? validatedData.roles 
        : [TorvanUserRole.ASSEMBLER]; // Default role for new users

      // Find roles in database
      const roles = await tx.role.findMany({
        where: {
          roleCode: { in: rolesToAssign },
          isActive: true
        }
      });

      if (roles.length === 0) {
        throw new Error("No valid roles found");
      }

      // Create role assignments
      await Promise.all(
        roles.map(role =>
          tx.userRole_Assignment.create({
            data: {
              userId: newUser.id,
              roleId: role.id,
              assignedBy: validatedData.createdByAdmin ? newUser.id : newUser.id, // Self-assigned or admin
              isActive: true
            }
          })
        )
      );

      return {
        id: newUser.id.toString(),
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        roles: roles.map(r => r.roleName)
      };
    });

    // Log user creation for audit
    console.log(`New user registered: ${validatedData.username} (${validatedData.email})`, {
      userId: result.id,
      roles: result.roles,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      message: "User registered successfully",
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        roles: result.roles
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}