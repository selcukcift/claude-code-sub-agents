/**
 * TORVAN PASSWORD SECURITY UTILITIES
 * =================================
 * 
 * Password hashing, validation, and security utilities
 * compliant with medical device security standards
 */

import bcrypt from "bcryptjs";
import { z } from "zod";

// Medical device password policy - NIST and FDA compliance
export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters long")
  .max(128, "Password must be at most 128 characters long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
  .refine((password) => {
    // Check for common patterns that should be avoided
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
      /123|abc|qwerty/i, // Common sequences
      /password|admin|user|torvan/i, // Common words
    ];
    return !commonPatterns.some(pattern => pattern.test(password));
  }, "Password contains prohibited patterns or common words");

/**
 * Hash a password using bcrypt with medical device security standards
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password strength first
  const validation = passwordSchema.safeParse(password);
  if (!validation.success) {
    throw new Error(`Password validation failed: ${validation.error.errors[0].message}`);
  }

  // Use bcrypt with 12 rounds for medical device security
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error("Password verification error:", error);
    return false;
  }
}

/**
 * Generate a secure random password for temporary use
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  
  // Ensure at least one character from each category
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if password has expired based on medical device security policies
 */
export function isPasswordExpired(passwordExpiresAt: Date | null): boolean {
  if (!passwordExpiresAt) {
    return false;
  }
  return passwordExpiresAt < new Date();
}

/**
 * Calculate password expiration date (90 days for medical device compliance)
 */
export function calculatePasswordExpirationDate(): Date {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 90); // 90 days
  return expirationDate;
}

/**
 * Generate a secure password reset token
 */
export function generateResetToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Password strength meter for UI feedback
 */
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export function analyzePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 12) {
    score += 1;
  } else {
    feedback.push("Use at least 12 characters");
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push("Add special characters");

  // Bonus points for length
  if (password.length >= 16) score += 1;
  if (password.length >= 20) score += 1;

  // Penalty for common patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters
    /123|abc|qwerty/i, // Common sequences
    /password|admin|user|torvan/i, // Common words
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push("Avoid common patterns and words");
  }

  // Cap the score at 4
  score = Math.min(4, score);

  const validation = passwordSchema.safeParse(password);
  const isValid = validation.success;

  return {
    score,
    feedback,
    isValid
  };
}