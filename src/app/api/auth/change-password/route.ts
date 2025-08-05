/**
 * TORVAN PASSWORD CHANGE API ROUTE
 * ===============================
 * 
 * Secure password change endpoint for authenticated users
 * - Current password verification
 * - Password strength validation
 * - Medical device security compliance
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, passwordSchema, calculatePasswordExpirationDate } from "@/lib/security/password";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords do not match",
  path: ["confirmPassword"]
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"]
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Get user with current password hash
    const user = await prisma.user.findUnique({
      where: { 
        id: BigInt(session.user.id),
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        mustChangePassword: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(
      currentPassword, 
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    const passwordExpiresAt = calculatePasswordExpirationDate();

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordExpiresAt,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null
      }
    });

    // Log password change for audit
    console.log(`Password changed for user: ${user.username}`, {
      userId: user.id.toString(),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      message: "Password changed successfully"
    }, { status: 200 });

  } catch (error) {
    console.error("Password change error:", error);

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
      { error: "Password change failed. Please try again." },
      { status: 500 }
    );
  }
}