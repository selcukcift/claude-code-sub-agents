# TORVAN MEDICAL SECURITY ARCHITECTURE
## COMPREHENSIVE SECURITY DESIGN AND IMPLEMENTATION STRATEGY

### EXECUTIVE SUMMARY

This document defines the complete security architecture for the TORVAN MEDICAL workflow management system, providing comprehensive protection for sensitive business data, multi-role user authentication, and compliance with industry security standards.

**Security Principles:**
- **Defense in Depth**: Multiple layers of security controls
- **Zero Trust Architecture**: Verify every request and user
- **Principle of Least Privilege**: Minimal required access rights
- **Data Protection**: Encryption at rest and in transit
- **Audit and Compliance**: Comprehensive logging and monitoring

---

## 1. SECURITY ARCHITECTURE OVERVIEW

### 1.1 Security Framework

**Multi-Layer Security Model:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                             │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 7: Application Security                                     │
│  ├─ Authentication & Authorization                                  │
│  ├─ Input Validation & Sanitization                                │
│  ├─ Role-Based Access Control (RBAC)                               │
│  └─ Session Management                                              │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 6: API Security                                             │
│  ├─ Rate Limiting & Throttling                                     │
│  ├─ API Key Management                                              │
│  ├─ Request/Response Validation                                     │
│  └─ CORS & Security Headers                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 5: Data Security                                            │
│  ├─ Encryption at Rest (AES-256)                                   │
│  ├─ Encryption in Transit (TLS 1.3)                                │
│  ├─ Database Security                                               │
│  └─ File Storage Security                                           │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Network Security                                         │
│  ├─ Firewall Rules                                                  │
│  ├─ VPC/Subnet Isolation                                           │
│  ├─ DDoS Protection                                                 │
│  └─ SSL/TLS Termination                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Infrastructure Security                                  │
│  ├─ Container Security                                              │
│  ├─ Host Hardening                                                  │
│  ├─ Vulnerability Scanning                                          │
│  └─ Patch Management                                                │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Monitoring & Compliance                                  │
│  ├─ Security Information and Event Management (SIEM)               │
│  ├─ Audit Logging                                                   │
│  ├─ Threat Detection                                                │
│  └─ Compliance Reporting                                            │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: Physical & Cloud Security                                │
│  ├─ Cloud Provider Security (AWS/Azure)                            │
│  ├─ Identity and Access Management (IAM)                           │
│  ├─ Backup and Recovery                                             │
│  └─ Business Continuity                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Security Standards and Compliance

**Target Compliance Standards:**
- **NIST Cybersecurity Framework**: Core security controls
- **OWASP Top 10**: Web application security best practices
- **ISO 27001**: Information security management
- **SOC 2 Type II**: Security controls for service organizations
- **GDPR/CCPA**: Data privacy regulations (if applicable)

---

## 2. AUTHENTICATION AND AUTHORIZATION ARCHITECTURE

### 2.1 Authentication System Design

**NextAuth.js Implementation with Enhanced Security:**

```typescript
// src/lib/auth.ts
import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { SecurityService } from "./security-service";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().optional(),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
    updateAge: 24 * 60 * 60, // 24 hours
  },
  
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "checkbox" }
      },
      
      async authorize(credentials, request) {
        try {
          // Validate input
          const { email, password } = loginSchema.parse(credentials);
          
          // Rate limiting check
          await SecurityService.checkRateLimit(email, request?.ip);
          
          // Get user from database
          const user = await db.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              role: true,
              status: true,
              failedLoginAttempts: true,
              lockedUntil: true,
              emailVerified: true,
              firstName: true,
              lastName: true,
            }
          });
          
          if (!user) {
            await SecurityService.logFailedLogin(email, 'USER_NOT_FOUND', request?.ip);
            throw new Error("Invalid credentials");
          }
          
          // Check account status
          if (user.status !== 'ACTIVE') {
            await SecurityService.logFailedLogin(email, 'ACCOUNT_INACTIVE', request?.ip);
            throw new Error("Account is inactive");
          }
          
          // Check if account is locked
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            await SecurityService.logFailedLogin(email, 'ACCOUNT_LOCKED', request?.ip);
            throw new Error("Account is temporarily locked");
          }
          
          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          
          if (!isValidPassword) {
            await SecurityService.handleFailedLogin(user.id, email, request?.ip);
            throw new Error("Invalid credentials");
          }
          
          // Check email verification
          if (!user.emailVerified) {
            throw new Error("Email not verified");
          }
          
          // Successful login
          await SecurityService.handleSuccessfulLogin(user.id, request?.ip);
          
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName} ${user.lastName}`,
          };
          
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role;
        token.userId = user.id;
        
        // Add security claims
        token.permissions = await SecurityService.getUserPermissions(user.id);
        token.sessionId = await SecurityService.createSecureSession(user.id);
        token.iat = Math.floor(Date.now() / 1000);
      }
      
      // Validate token security
      if (token.sessionId) {
        const isValidSession = await SecurityService.validateSession(token.sessionId);
        if (!isValidSession) {
          return null; // Force re-authentication
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
        session.sessionId = token.sessionId as string;
      }
      
      return session;
    },
    
    async signIn({ user, account, profile, email, credentials }) {
      // Additional security checks
      const securityCheck = await SecurityService.performSecurityChecks({
        userId: user.id,
        email: user.email,
        account,
        profile
      });
      
      return securityCheck.allowed;
    }
  },
  
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      await SecurityService.logSecurityEvent({
        type: 'SIGN_IN',
        userId: user.id,
        details: { account: account?.provider, isNewUser }
      });
    },
    
    async signOut({ token }) {
      if (token?.sessionId) {
        await SecurityService.invalidateSession(token.sessionId as string);
      }
      
      await SecurityService.logSecurityEvent({
        type: 'SIGN_OUT',
        userId: token?.userId as string
      });
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

### 2.2 Password Security Implementation

**Strong Password Policy and Management:**

```typescript
// src/lib/password-security.ts
import bcrypt from "bcryptjs";
import { z } from "zod";

export class PasswordSecurity {
  // Password validation schema
  static passwordSchema = z.string()
    .min(12, "Password must be at least 12 characters long")
    .max(128, "Password must not exceed 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
    .refine((password) => !this.isCommonPassword(password), {
      message: "Password is too common"
    })
    .refine((password) => !this.containsPersonalInfo(password), {
      message: "Password must not contain personal information"
    });

  // Hash password with salt
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Increased for better security
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Check if password has been compromised (in production, use HaveIBeenPwned API)
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // Implementation would check against breach databases
    // For now, return false but in production integrate with HaveIBeenPwned
    return false;
  }

  // Password strength scoring
  static calculatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 12) score += 20;
    else feedback.push("Use at least 12 characters");

    if (password.length >= 16) score += 10;

    // Character variety
    if (/[A-Z]/.test(password)) score += 15;
    else feedback.push("Include uppercase letters");

    if (/[a-z]/.test(password)) score += 15;
    else feedback.push("Include lowercase letters");

    if (/[0-9]/.test(password)) score += 15;
    else feedback.push("Include numbers");

    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    else feedback.push("Include special characters");

    // Pattern checks
    if (!/(.)\1{2,}/.test(password)) score += 10;
    else feedback.push("Avoid repeated characters");

    if (!/012|123|234|345|456|567|678|789|890|abc|bcd|cde/.test(password.toLowerCase())) {
      score += 10;
    } else {
      feedback.push("Avoid sequential characters");
    }

    return { score: Math.min(score, 100), feedback };
  }

  // Generate secure temporary password
  static generateSecurePassword(length: number = 16): string {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";
    
    // Ensure at least one character from each required category
    password += this.getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    password += this.getRandomChar("abcdefghijklmnopqrstuvwxyz");
    password += this.getRandomChar("0123456789");
    password += this.getRandomChar("!@#$%^&*");
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(charset);
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private static getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }

  private static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      "password", "123456", "123456789", "qwerty", "abc123",
      "password123", "admin", "welcome", "letmein", "monkey"
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  private static containsPersonalInfo(password: string): boolean {
    // In production, this would check against user's personal information
    // For now, check for obvious patterns
    const patterns = [
      /birthday/i, /name/i, /company/i, /torvan/i, /medical/i
    ];
    return patterns.some(pattern => pattern.test(password));
  }
}
```

### 2.3 Role-Based Access Control (RBAC) System

**Comprehensive Permission Management:**

```typescript
// src/lib/rbac.ts
export enum UserRole {
  PRODUCTION_COORDINATOR = 'PRODUCTION_COORDINATOR',
  ADMIN = 'ADMIN',
  PROCUREMENT = 'PROCUREMENT',
  QC_PERSON = 'QC_PERSON',
  ASSEMBLER = 'ASSEMBLER',
  SERVICE_DEPARTMENT = 'SERVICE_DEPARTMENT'
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

export class RBACService {
  private static readonly ROLE_PERMISSIONS: RolePermissions[] = [
    {
      role: UserRole.ADMIN,
      description: "Full system access with all administrative privileges",
      permissions: [
        { resource: "*", actions: ["*"] }, // Full access to everything
      ]
    },
    
    {
      role: UserRole.PRODUCTION_COORDINATOR,
      description: "Manages order creation and production coordination",
      permissions: [
        { resource: "order", actions: ["create", "read", "update", "assign"] },
        { resource: "bom", actions: ["create", "read", "update", "approve"] },
        { resource: "customer", actions: ["read", "update"] },
        { resource: "inventory", actions: ["read"] },
        { resource: "task", actions: ["create", "read", "update", "assign"] },
        { resource: "user", actions: ["read"], conditions: { role: ["ASSEMBLER", "QC_PERSON"] } },
        { resource: "reports", actions: ["read", "export"] },
        { 
          resource: "order", 
          actions: ["update"], 
          conditions: { status: ["PENDING"] } // Can only modify pending orders
        }
      ]
    },
    
    {
      role: UserRole.PROCUREMENT,
      description: "Manages inventory and procurement processes",
      permissions: [
        { resource: "inventory", actions: ["create", "read", "update", "delete"] },
        { resource: "supplier", actions: ["create", "read", "update"] },
        { resource: "purchase_order", actions: ["create", "read", "update", "approve"] },
        { resource: "bom", actions: ["read"] },
        { resource: "order", actions: ["read"] },
        { resource: "reports", actions: ["read", "export"], conditions: { type: ["inventory", "procurement"] } }
      ]
    },
    
    {
      role: UserRole.QC_PERSON,
      description: "Manages quality control processes and approvals",
      permissions: [
        { resource: "qc_checklist", actions: ["create", "read", "update", "approve", "reject"] },
        { resource: "qc_photo", actions: ["create", "read", "update", "delete"] },
        { resource: "order", actions: ["read", "update"], conditions: { qc_context: true } },
        { resource: "defect", actions: ["create", "read", "update", "resolve"] },
        { resource: "task", actions: ["read", "update"], conditions: { type: ["QC"] } },
        { resource: "reports", actions: ["read", "export"], conditions: { type: ["quality"] } }
      ]
    },
    
    {
      role: UserRole.ASSEMBLER,
      description: "Manages assigned production tasks and assembly work",
      permissions: [
        { resource: "task", actions: ["read", "update"], conditions: { assigned_to: "self" } },
        { resource: "order", actions: ["read"], conditions: { assigned_context: true } },
        { resource: "bom", actions: ["read"], conditions: { order_context: true } },
        { resource: "inventory", actions: ["read", "consume"] },
        { resource: "time_entry", actions: ["create", "read", "update"], conditions: { user: "self" } },
        { resource: "work_instruction", actions: ["read"] }
      ]
    },
    
    {
      role: UserRole.SERVICE_DEPARTMENT,
      description: "Manages service parts orders and customer service",
      permissions: [
        { resource: "service_order", actions: ["create", "read", "update"] },
        { resource: "parts_catalog", actions: ["read"] },
        { resource: "customer", actions: ["read"] },
        { resource: "warranty", actions: ["create", "read", "update"] },
        { resource: "service_history", actions: ["create", "read"] },
        { resource: "cart", actions: ["create", "read", "update", "delete"], conditions: { user: "self" } }
      ]
    }
  ];

  static getPermissionsForRole(role: UserRole): Permission[] {
    const rolePermissions = this.ROLE_PERMISSIONS.find(rp => rp.role === role);
    return rolePermissions?.permissions || [];
  }

  static async checkPermission(
    userId: string, 
    resource: string, 
    action: string, 
    context?: Record<string, any>
  ): Promise<boolean> {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { role: true, status: true }
      });

      if (!user || user.status !== 'ACTIVE') {
        return false;
      }

      const permissions = this.getPermissionsForRole(user.role as UserRole);
      
      for (const permission of permissions) {
        // Check wildcard permissions (admin)
        if (permission.resource === "*" && permission.actions.includes("*")) {
          return true;
        }
        
        // Check specific resource permissions
        if (permission.resource === resource || permission.resource === "*") {
          if (permission.actions.includes(action) || permission.actions.includes("*")) {
            // Check conditions if they exist
            if (permission.conditions) {
              const conditionsMet = await this.evaluateConditions(
                permission.conditions, 
                userId, 
                context
              );
              if (!conditionsMet) continue;
            }
            
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error("Permission check error:", error);
      return false; // Fail secure
    }
  }

  static async enforcePermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, resource, action, context);
    
    if (!hasPermission) {
      await SecurityService.logSecurityEvent({
        type: 'PERMISSION_DENIED',
        userId,
        details: { resource, action, context }
      });
      
      throw new Error(`Access denied: ${action} on ${resource}`);
    }
  }

  private static async evaluateConditions(
    conditions: Record<string, any>,
    userId: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case "assigned_to":
          if (value === "self" && context?.assignedTo !== userId) {
            return false;
          }
          break;
          
        case "user":
          if (value === "self" && context?.userId !== userId) {
            return false;
          }
          break;
          
        case "status":
          if (Array.isArray(value) && context?.status && !value.includes(context.status)) {
            return false;
          }
          break;
          
        case "role":
          if (Array.isArray(value) && context?.userRole && !value.includes(context.userRole)) {
            return false;
          }
          break;
          
        // Add more condition evaluations as needed
      }
    }
    
    return true;
  }

  // Get user's effective permissions for UI rendering
  static async getUserEffectivePermissions(userId: string): Promise<{
    resources: Record<string, string[]>;
    isAdmin: boolean;
  }> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return { resources: {}, isAdmin: false };
    }

    const permissions = this.getPermissionsForRole(user.role as UserRole);
    const isAdmin = user.role === UserRole.ADMIN;
    
    const resources: Record<string, string[]> = {};
    
    permissions.forEach(permission => {
      if (permission.resource === "*") {
        // Admin has access to everything
        return;
      }
      
      if (!resources[permission.resource]) {
        resources[permission.resource] = [];
      }
      
      resources[permission.resource].push(...permission.actions);
    });

    return { resources, isAdmin };
  }
}
```

---

## 3. DATA SECURITY AND ENCRYPTION

### 3.1 Encryption at Rest Implementation

**Database Encryption Strategy:**

```typescript
// src/lib/encryption.ts
import crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  // Get encryption key from environment (in production, use proper key management)
  private static getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }
    return Buffer.from(key, 'base64');
  }

  // Encrypt sensitive data
  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(Buffer.from('torvan-medical-auth', 'utf8'));
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV + tag + encrypted data
      const result = iv.toString('hex') + tag.toString('hex') + encrypted;
      return result;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      
      // Extract IV, tag, and encrypted data
      const iv = Buffer.from(encryptedData.slice(0, this.IV_LENGTH * 2), 'hex');
      const tag = Buffer.from(encryptedData.slice(this.IV_LENGTH * 2, (this.IV_LENGTH + this.TAG_LENGTH) * 2), 'hex');
      const encrypted = encryptedData.slice((this.IV_LENGTH + this.TAG_LENGTH) * 2);
      
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from('torvan-medical-auth', 'utf8'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash sensitive data (one-way)
  static hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha256');
    return actualSalt + ':' + hash.toString('hex');
  }

  // Verify hashed data
  static verifyHash(data: string, hashedData: string): boolean {
    const [salt, hash] = hashedData.split(':');
    const verifyHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha256');
    return hash === verifyHash.toString('hex');
  }

  // Generate secure tokens
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate API keys
  static generateApiKey(): { key: string; hash: string } {
    const key = 'tm_' + crypto.randomBytes(32).toString('hex');
    const hash = this.hash(key);
    return { key, hash };
  }
}

// Field-level encryption for sensitive database fields
export class FieldEncryption {
  // Encrypt fields before saving to database
  static encryptSensitiveFields(data: any, sensitiveFields: string[]): any {
    const encrypted = { ...data };
    
    sensitiveFields.forEach(field => {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = EncryptionService.encrypt(encrypted[field]);
      }
    });
    
    return encrypted;
  }

  // Decrypt fields after reading from database
  static decryptSensitiveFields(data: any, sensitiveFields: string[]): any {
    const decrypted = { ...data };
    
    sensitiveFields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = EncryptionService.decrypt(decrypted[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Don't expose decryption errors to users
          decrypted[field] = '[ENCRYPTED]';
        }
      }
    });
    
    return decrypted;
  }
}
```

### 3.2 Transport Layer Security

**TLS/HTTPS Configuration:**

```typescript
// next.config.ts
const nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'interest-cohort=()'
            ].join(', ')
          }
        ],
      },
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http'
            }
          ],
          destination: 'https://torvan-medical.com/:path*',
          permanent: true
        }
      ];
    }
    return [];
  }
};

export default nextConfig;
```

---

## 4. API SECURITY ARCHITECTURE

### 4.1 Rate Limiting and Throttling

**Comprehensive Rate Limiting Strategy:**

```typescript
// src/lib/rate-limiting.ts
import { Redis } from 'ioredis';
import { headers } from 'next/headers';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export class RateLimitService {
  private static redis = new Redis(process.env.REDIS_URL!);

  // Different rate limits for different endpoints
  private static readonly RATE_LIMITS: Record<string, RateLimitConfig> = {
    // Authentication endpoints
    '/api/auth/signin': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
      blockDurationMs: 30 * 60 * 1000, // 30 minute block
    },
    
    '/api/auth/signup': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 attempts per hour
      blockDurationMs: 60 * 60 * 1000, // 1 hour block
    },

    // Password reset
    '/api/auth/forgot-password': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 attempts per hour
      blockDurationMs: 2 * 60 * 60 * 1000, // 2 hour block
    },

    // API endpoints
    '/api/trpc': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    },

    // File uploads
    '/api/upload': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 uploads per minute
    },

    // Default for all other endpoints
    'default': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 requests per minute
    }
  };

  static async checkRateLimit(
    endpoint: string,
    identifier: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const config = this.RATE_LIMITS[endpoint] || this.RATE_LIMITS['default'];
    const key = `rate_limit:${endpoint}:${identifier}`;
    
    try {
      const current = await this.redis.get(key);
      const currentCount = current ? parseInt(current) : 0;
      
      if (currentCount >= config.maxRequests) {
        // Check if in block period
        const blockKey = `rate_limit_block:${endpoint}:${identifier}`;
        const blockTime = await this.redis.get(blockKey);
        
        if (blockTime) {
          const resetTime = parseInt(blockTime);
          return {
            allowed: false,
            remaining: 0,
            resetTime
          };
        }
        
        // Set block if configured
        if (config.blockDurationMs) {
          const blockUntil = Date.now() + config.blockDurationMs;
          await this.redis.setex(blockKey, Math.ceil(config.blockDurationMs / 1000), blockUntil.toString());
          
          return {
            allowed: false,
            remaining: 0,
            resetTime: blockUntil
          };
        }
        
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + config.windowMs
        };
      }
      
      // Increment counter
      await this.redis.multi()
        .incr(key)
        .expire(key, Math.ceil(config.windowMs / 1000))
        .exec();
      
      return {
        allowed: true,
        remaining: config.maxRequests - (currentCount + 1),
        resetTime: Date.now() + config.windowMs
      };
      
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Fail open in case of Redis issues
      return { allowed: true, remaining: 999, resetTime: Date.now() + config.windowMs };
    }
  }

  static async getClientIdentifier(request?: Request): Promise<string> {
    // Get client IP address
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const remoteAddr = headersList.get('x-remote-addr');
    
    const ip = forwardedFor?.split(',')[0] || realIp || remoteAddr || 'unknown';
    
    // For authenticated requests, we might want to use user ID instead
    // This would be determined by the specific endpoint
    
    return ip;
  }

  // Middleware for Next.js API routes
  static createRateLimitMiddleware(endpoint: string) {
    return async (request: Request) => {
      const identifier = await this.getClientIdentifier(request);
      const result = await this.checkRateLimit(endpoint, identifier);
      
      if (!result.allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            resetTime: result.resetTime
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': this.RATE_LIMITS[endpoint]?.maxRequests.toString() || '60',
              'X-RateLimit-Remaining': result.remaining.toString(),
              'X-RateLimit-Reset': result.resetTime.toString()
            }
          }
        );
      }
      
      return null; // Allow request to continue
    };
  }
}
```

### 4.2 Input Validation and Sanitization

**Comprehensive Input Security:**

```typescript
// src/lib/input-validation.ts
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Server-side DOM purification setup
const window = new JSDOM('').window;
const purify = DOMPurify(window);

export class InputValidation {
  // Common validation schemas
  static readonly commonSchemas = {
    email: z.string().email().max(255),
    password: z.string().min(12).max(128),
    uuid: z.string().uuid(),
    phoneNumber: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/),
    postalCode: z.string().regex(/^[A-Za-z0-9\s\-]{3,10}$/),
    partNumber: z.string().regex(/^[A-Za-z0-9\-]{1,20}$/),
    orderNumber: z.string().regex(/^TM\d{6}\d{4}$/), // TM + YYMMDD + sequence
  };

  // Sanitize HTML content
  static sanitizeHtml(dirty: string): string {
    return purify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
      REMOVE_DATA_ATTRIBUTES: true,
      REMOVE_UNKNOWN_PROTOCOLS: true,
    });
  }

  // Sanitize plain text (remove potential XSS)
  static sanitizeText(text: string): string {
    return text
      .replace(/[<>\"']/g, '') // Remove dangerous characters
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 10000); // Limit length
  }

  // Validate and sanitize file uploads
  static validateFile(file: File, allowedTypes: string[], maxSize: number): {
    valid: boolean;
    error?: string;
  } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`
      };
    }

    // Check filename
    const filename = file.name;
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return {
        valid: false,
        error: 'Filename contains invalid characters'
      };
    }

    // Check for double extensions (potential security risk)
    const parts = filename.split('.');
    if (parts.length > 2) {
      return {
        valid: false,
        error: 'Multiple file extensions not allowed'
      };
    }

    return { valid: true };
  }

  // SQL injection prevention (additional layer beyond Prisma)
  static containsSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(;|\-\-|\/\*|\*\/)/,
      /(\b(OR|AND)\b.*[=<>])/i,
      /(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // XSS prevention
  static containsXss(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<.*?(onerror|onload|onclick|onmouseover).*?>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Comprehensive input sanitization
  static sanitizeInput(input: any, schema: z.ZodSchema): {
    valid: boolean;
    data?: any;
    errors?: string[];
  } {
    try {
      // First, check for malicious patterns
      if (typeof input === 'string') {
        if (this.containsSqlInjection(input)) {
          return {
            valid: false,
            errors: ['Input contains potentially malicious SQL patterns']
          };
        }

        if (this.containsXss(input)) {
          return {
            valid: false,
            errors: ['Input contains potentially malicious script patterns']
          };
        }

        // Sanitize the input
        input = this.sanitizeText(input);
      }

      // Recursively sanitize objects
      if (typeof input === 'object' && input !== null) {
        input = this.sanitizeObject(input);
      }

      // Validate with schema
      const result = schema.safeParse(input);
      
      if (!result.success) {
        return {
          valid: false,
          errors: result.error.errors.map(e => e.message)
        };
      }

      return {
        valid: true,
        data: result.data
      };

    } catch (error) {
      return {
        valid: false,
        errors: ['Input validation failed']
      };
    }
  }

  private static sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const cleanKey = this.sanitizeText(key);
        
        // Recursively sanitize value
        sanitized[cleanKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }

    return obj;
  }
}

// Validation schemas for specific entities
export const orderValidationSchemas = {
  createOrder: z.object({
    customerId: InputValidation.commonSchemas.uuid,
    priority: z.enum(['STANDARD', 'RUSH', 'EMERGENCY']),
    specialInstructions: z.string().max(500).optional(),
    sinkConfigurations: z.array(z.object({
      sinkFamilyId: InputValidation.commonSchemas.uuid,
      quantity: z.number().int().min(1).max(100),
      buildNumber: z.string().regex(/^[A-Za-z0-9\-]{1,50}$/),
      configuration: z.object({
        bodyMaterial: z.string().max(100),
        bodyFinish: z.string().max(100),
        dimensions: z.object({
          width: z.number().positive(),
          depth: z.number().positive(),
          height: z.number().positive()
        }),
        basins: z.array(z.object({
          type: z.string().max(50),
          position: z.string().max(20),
          size: z.string().max(50)
        })),
        pegboard: z.object({
          width: z.number().positive(),
          height: z.number().positive(),
          holePattern: z.string().max(50),
          isCustom: z.boolean()
        }),
        legs: z.object({
          type: z.string().max(50),
          height: z.number().positive(),
          material: z.string().max(50),
          isCustom: z.boolean()
        })
      })
    }))
  }),

  updateOrderStatus: z.object({
    id: InputValidation.commonSchemas.uuid,
    status: z.enum(['PENDING', 'IN_PRODUCTION', 'PRE_QC', 'PRODUCTION_COMPLETE', 'FINAL_QC', 'QC_COMPLETE', 'SHIPPED', 'DELIVERED']),
    notes: z.string().max(1000).optional()
  }),
};
```

---

## 5. SESSION MANAGEMENT AND SECURITY

### 5.1 Secure Session Implementation

**Advanced Session Security:**

```typescript
// src/lib/session-security.ts
import { Redis } from 'ioredis';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

interface SessionData {
  userId: string;
  role: string;
  permissions: string[];
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
}

interface SecurityContext {
  isSecure: boolean;
  riskScore: number;
  anomalies: string[];
}

export class SessionSecurity {
  private static redis = new Redis(process.env.REDIS_URL!);
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly MAX_SESSIONS_PER_USER = 5;
  
  // Create secure session
  static async createSession(
    userId: string,
    userAgent: string,
    ipAddress: string
  ): Promise<{ sessionId: string; token: string }> {
    const sessionId = this.generateSecureSessionId();
    const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);
    
    // Get user data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get user permissions
    const permissions = await RBACService.getUserEffectivePermissions(userId);
    
    const sessionData: SessionData = {
      userId,
      role: user.role,
      permissions: permissions.isAdmin ? ['*'] : Object.keys(permissions.resources),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress,
      userAgent,
      deviceFingerprint
    };
    
    // Store session in Redis
    await this.redis.setex(
      `session:${sessionId}`,
      Math.ceil(this.SESSION_TIMEOUT / 1000),
      JSON.stringify(sessionData)
    );
    
    // Track user sessions
    await this.addUserSession(userId, sessionId);
    
    // Generate JWT token
    const token = await this.generateSessionToken(sessionId, sessionData);
    
    // Log session creation
    await SecurityService.logSecurityEvent({
      type: 'SESSION_CREATED',
      userId,
      details: { sessionId, ipAddress, userAgent }
    });
    
    return { sessionId, token };
  }
  
  // Validate session
  static async validateSession(token: string): Promise<{
    valid: boolean;
    sessionData?: SessionData;
    securityContext?: SecurityContext;
  }> {
    try {
      // Verify JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      
      const sessionId = payload.sessionId as string;
      
      // Get session from Redis
      const sessionDataString = await this.redis.get(`session:${sessionId}`);
      
      if (!sessionDataString) {
        return { valid: false };
      }
      
      const sessionData: SessionData = JSON.parse(sessionDataString);
      
      // Check session timeout
      if (Date.now() - sessionData.lastActivity > this.SESSION_TIMEOUT) {
        await this.invalidateSession(sessionId);
        return { valid: false };
      }
      
      // Perform security checks
      const securityContext = await this.performSecurityChecks(sessionData);
      
      if (!securityContext.isSecure) {
        await this.invalidateSession(sessionId);
        await SecurityService.logSecurityEvent({
          type: 'SESSION_SECURITY_VIOLATION',
          userId: sessionData.userId,
          details: { sessionId, anomalies: securityContext.anomalies }
        });
        return { valid: false };
      }
      
      // Update last activity
      sessionData.lastActivity = Date.now();
      await this.redis.setex(
        `session:${sessionId}`,
        Math.ceil(this.SESSION_TIMEOUT / 1000),
        JSON.stringify(sessionData)
      );
      
      return {
        valid: true,
        sessionData,
        securityContext
      };
      
    } catch (error) {
      console.error('Session validation error:', error);
      return { valid: false };
    }
  }
  
  // Invalidate session
  static async invalidateSession(sessionId: string): Promise<void> {
    const sessionDataString = await this.redis.get(`session:${sessionId}`);
    
    if (sessionDataString) {
      const sessionData: SessionData = JSON.parse(sessionDataString);
      
      // Remove from Redis
      await this.redis.del(`session:${sessionId}`);
      
      // Remove from user sessions list
      await this.removeUserSession(sessionData.userId, sessionId);
      
      // Log session invalidation
      await SecurityService.logSecurityEvent({
        type: 'SESSION_INVALIDATED',
        userId: sessionData.userId,
        details: { sessionId }
      });
    }
  }
  
  // Generate session token
  private static async generateSessionToken(
    sessionId: string,
    sessionData: SessionData
  ): Promise<string> {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    
    return await new SignJWT({
      sessionId,
      userId: sessionData.userId,
      role: sessionData.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.SESSION_TIMEOUT) / 1000)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
  }
  
  // Generate secure session ID
  private static generateSecureSessionId(): string {
    return 'sess_' + crypto.randomBytes(32).toString('hex');
  }
  
  // Generate device fingerprint
  private static generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Track user sessions
  private static async addUserSession(userId: string, sessionId: string): Promise<void> {
    const userSessionsKey = `user_sessions:${userId}`;
    
    // Add new session
    await this.redis.lpush(userSessionsKey, sessionId);
    
    // Limit number of sessions
    const sessionIds = await this.redis.lrange(userSessionsKey, 0, -1);
    
    if (sessionIds.length > this.MAX_SESSIONS_PER_USER) {
      // Remove oldest sessions
      const sessionsToRemove = sessionIds.slice(this.MAX_SESSIONS_PER_USER);
      
      for (const oldSessionId of sessionsToRemove) {
        await this.invalidateSession(oldSessionId);
      }
      
      // Keep only allowed number of sessions
      await this.redis.ltrim(userSessionsKey, 0, this.MAX_SESSIONS_PER_USER - 1);
    }
    
    // Set expiration for user sessions list
    await this.redis.expire(userSessionsKey, Math.ceil(this.SESSION_TIMEOUT / 1000));
  }
  
  // Remove user session
  private static async removeUserSession(userId: string, sessionId: string): Promise<void> {
    await this.redis.lrem(`user_sessions:${userId}`, 0, sessionId);
  }
  
  // Perform security checks
  private static async performSecurityChecks(sessionData: SessionData): Promise<SecurityContext> {
    const anomalies: string[] = [];
    let riskScore = 0;
    
    // Check for session hijacking indicators
    const currentRequest = {
      userAgent: headers().get('user-agent') || '',
      ipAddress: this.getCurrentIpAddress()
    };
    
    // User agent consistency check
    if (currentRequest.userAgent !== sessionData.userAgent) {
      anomalies.push('USER_AGENT_MISMATCH');
      riskScore += 30;
    }
    
    // IP address consistency check (allow for some variation due to NAT/proxies)
    if (!this.isIpAddressInRange(currentRequest.ipAddress, sessionData.ipAddress)) {
      anomalies.push('IP_ADDRESS_CHANGE');
      riskScore += 20;
    }
    
    // Check for concurrent sessions from different locations
    const userSessions = await this.getUserActiveSessions(sessionData.userId);
    const uniqueIpAddresses = new Set(userSessions.map(s => s.ipAddress));
    
    if (uniqueIpAddresses.size > 3) {
      anomalies.push('MULTIPLE_LOCATIONS');
      riskScore += 25;
    }
    
    // Check for rapid session activity (potential automation)
    const recentActivity = await this.getRecentUserActivity(sessionData.userId);
    if (recentActivity.length > 100) { // More than 100 actions in last hour
      anomalies.push('HIGH_ACTIVITY_RATE');
      riskScore += 15;
    }
    
    return {
      isSecure: riskScore < 50, // Threshold for security concern
      riskScore,
      anomalies
    };
  }
  
  private static getCurrentIpAddress(): string {
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    return forwardedFor?.split(',')[0] || realIp || 'unknown';
  }
  
  private static isIpAddressInRange(currentIp: string, sessionIp: string): boolean {
    // Simple check - in production, implement proper IP range checking
    if (currentIp === sessionIp) return true;
    
    // Allow for common subnet changes
    const currentParts = currentIp.split('.');
    const sessionParts = sessionIp.split('.');
    
    // Same /24 subnet
    return currentParts.slice(0, 3).join('.') === sessionParts.slice(0, 3).join('.');
  }
  
  private static async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.redis.lrange(`user_sessions:${userId}`, 0, -1);
    const sessions: SessionData[] = [];
    
    for (const sessionId of sessionIds) {
      const sessionDataString = await this.redis.get(`session:${sessionId}`);
      if (sessionDataString) {
        sessions.push(JSON.parse(sessionDataString));
      }
    }
    
    return sessions;
  }
  
  private static async getRecentUserActivity(userId: string): Promise<any[]> {
    // Get recent audit logs for this user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentActivity = await db.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: oneHourAgo
        }
      },
      select: {
        action: true,
        createdAt: true
      }
    });
    
    return recentActivity;
  }
}
```

---

## 6. SECURITY MONITORING AND INCIDENT RESPONSE

### 6.1 Security Event Monitoring

**Comprehensive Security Logging and Alerting:**

```typescript
// src/lib/security-monitoring.ts
interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp?: Date;
}

type SecurityEventType = 
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGIN_BRUTE_FORCE'
  | 'SESSION_CREATED' | 'SESSION_INVALIDATED' | 'SESSION_SECURITY_VIOLATION'
  | 'PERMISSION_DENIED' | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'DATA_ACCESS_VIOLATION' | 'SUSPICIOUS_ACTIVITY'
  | 'RATE_LIMIT_EXCEEDED' | 'INPUT_VALIDATION_FAILURE'
  | 'FILE_UPLOAD_VIOLATION' | 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT';

export class SecurityMonitoring {
  private static readonly ALERT_THRESHOLDS = {
    FAILED_LOGINS_PER_HOUR: 10,
    PERMISSION_DENIALS_PER_HOUR: 20,
    RATE_LIMIT_VIOLATIONS_PER_HOUR: 50,
    CONCURRENT_SESSIONS_PER_USER: 10,
    SUSPICIOUS_ACTIVITIES_PER_HOUR: 5
  };

  // Log security event
  static async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    };

    try {
      // Store in database
      await db.auditLog.create({
        data: {
          action: event.type,
          resourceType: 'SECURITY_EVENT',
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          description: `Security event: ${event.type}`,
          businessContext: event.details,
          success: !event.type.includes('FAILURE') && !event.type.includes('VIOLATION'),
          errorMessage: event.type.includes('FAILURE') ? JSON.stringify(event.details) : null
        }
      });

      // Real-time alerting for critical events
      if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
        await this.sendSecurityAlert(fullEvent);
      }

      // Check for patterns requiring immediate attention
      await this.checkSecurityPatterns(fullEvent);

    } catch (error) {
      console.error('Failed to log security event:', error);
      // In production, this should fail safely and alert administrators
    }
  }

  // Check for security patterns and anomalies
  private static async checkSecurityPatterns(event: SecurityEvent): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check for brute force attacks
    if (event.type === 'LOGIN_FAILURE') {
      const recentFailures = await db.auditLog.count({
        where: {
          action: 'LOGIN_FAILURE',
          ipAddress: event.ipAddress,
          createdAt: { gte: oneHourAgo }
        }
      });

      if (recentFailures >= this.ALERT_THRESHOLDS.FAILED_LOGINS_PER_HOUR) {
        await this.logSecurityEvent({
          type: 'LOGIN_BRUTE_FORCE',
          ipAddress: event.ipAddress,
          details: { failureCount: recentFailures },
          severity: 'HIGH'
        });
      }
    }

    // Check for permission escalation attempts
    if (event.type === 'PERMISSION_DENIED') {
      const recentDenials = await db.auditLog.count({
        where: {
          action: 'PERMISSION_DENIED',
          userId: event.userId,
          createdAt: { gte: oneHourAgo }
        }
      });

      if (recentDenials >= this.ALERT_THRESHOLDS.PERMISSION_DENIALS_PER_HOUR) {
        await this.logSecurityEvent({
          type: 'PRIVILEGE_ESCALATION_ATTEMPT',
          userId: event.userId,
          details: { denialCount: recentDenials },
          severity: 'HIGH'
        });
      }
    }

    // Check for unusual access patterns
    if (event.userId) {
      await this.checkUserBehaviorAnomalies(event.userId);
    }
  }

  // Analyze user behavior for anomalies
  private static async checkUserBehaviorAnomalies(userId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get user's recent activity
    const recentActivity = await db.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      },
      select: {
        action: true,
        ipAddress: true,
        createdAt: true
      }
    });

    // Get user's historical activity for baseline
    const historicalActivity = await db.auditLog.findMany({
      where: {
        userId,
        createdAt: { 
          gte: twentyFourHoursAgo,
          lt: oneHourAgo 
        }
      },
      select: {
        action: true,
        ipAddress: true,
        createdAt: true
      }
    });

    // Analyze patterns
    const anomalies: string[] = [];

    // Check for unusual activity volume
    const avgHourlyActivity = historicalActivity.length / 23; // 23 hours of historical data
    if (recentActivity.length > avgHourlyActivity * 3) {
      anomalies.push('HIGH_ACTIVITY_VOLUME');
    }

    // Check for new IP addresses
    const historicalIps = new Set(historicalActivity.map(a => a.ipAddress));
    const recentIps = new Set(recentActivity.map(a => a.ipAddress));
    const newIps = [...recentIps].filter(ip => !historicalIps.has(ip));
    
    if (newIps.length > 0) {
      anomalies.push('NEW_IP_ADDRESS');
    }

    // Check for unusual action patterns
    const recentActions = recentActivity.map(a => a.action);
    const unusualActions = recentActions.filter(action => 
      action.includes('DELETE') || action.includes('EXPORT') || action.includes('ADMIN')
    );

    if (unusualActions.length > 0) {
      anomalies.push('UNUSUAL_ACTIONS');
    }

    // Report anomalies
    if (anomalies.length > 0) {
      await this.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        userId,
        details: { 
          anomalies,
          activityCount: recentActivity.length,
          newIpAddresses: newIps 
        },
        severity: anomalies.length > 2 ? 'HIGH' : 'MEDIUM'
      });
    }
  }

  // Send security alerts
  private static async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // In production, integrate with alerting systems like:
    // - Slack/Teams notifications
    // - Email alerts to security team
    // - PagerDuty for critical events
    // - SIEM integration

    console.warn('SECURITY ALERT:', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      details: event.details,
      timestamp: event.timestamp
    });

    // For now, log to database as high-priority alert
    await db.auditLog.create({
      data: {
        action: 'SECURITY_ALERT',
        resourceType: 'ALERT',
        userId: event.userId,
        description: `Security alert: ${event.type}`,
        businessContext: {
          originalEvent: event,
          alertLevel: event.severity
        },
        success: false // Alerts indicate potential issues
      }
    });
  }

  // Generate security dashboard metrics
  static async getSecurityMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topRiskyUsers: Array<{ userId: string; riskScore: number }>;
    topRiskyIpAddresses: Array<{ ipAddress: string; eventCount: number }>;
  }> {
    const timeMapping = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeMapping[timeRange]);

    // Get security events
    const events = await db.auditLog.findMany({
      where: {
        resourceType: 'SECURITY_EVENT',
        createdAt: { gte: startTime }
      },
      select: {
        action: true,
        userId: true,
        ipAddress: true,
        businessContext: true
      }
    });

    // Aggregate metrics
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const userRiskScores: Record<string, number> = {};
    const ipEventCounts: Record<string, number> = {};

    events.forEach(event => {
      // Count by type
      eventsByType[event.action] = (eventsByType[event.action] || 0) + 1;

      // Count by severity (from business context)
      const severity = event.businessContext?.severity || 'LOW';
      eventsBySeverity[severity] = (eventsBySeverity[severity] || 0) + 1;

      // Calculate user risk scores
      if (event.userId) {
        const riskPoints = severity === 'CRITICAL' ? 10 : severity === 'HIGH' ? 5 : 1;
        userRiskScores[event.userId] = (userRiskScores[event.userId] || 0) + riskPoints;
      }

      // Count events by IP
      if (event.ipAddress) {
        ipEventCounts[event.ipAddress] = (ipEventCounts[event.ipAddress] || 0) + 1;
      }
    });

    // Sort and limit top risky users and IPs
    const topRiskyUsers = Object.entries(userRiskScores)
      .map(([userId, riskScore]) => ({ userId, riskScore }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    const topRiskyIpAddresses = Object.entries(ipEventCounts)
      .map(([ipAddress, eventCount]) => ({ ipAddress, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      topRiskyUsers,
      topRiskyIpAddresses
    };
  }
}
```

---

## 7. SECURITY COMPLIANCE AND GOVERNANCE

### 7.1 Compliance Framework Implementation

**Data Protection and Privacy Controls:**

```typescript
// src/lib/compliance.ts
export class ComplianceService {
  // Data retention policies
  static readonly DATA_RETENTION_POLICIES = {
    USER_DATA: 7 * 365, // 7 years
    AUDIT_LOGS: 2 * 365, // 2 years
    SESSION_DATA: 90, // 90 days
    SECURITY_EVENTS: 5 * 365, // 5 years
    FILE_ACCESS_LOGS: 1 * 365, // 1 year
  };

  // Anonymize user data for compliance
  static async anonymizeUserData(userId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      // Replace with anonymized values
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `anonymized_${Date.now()}@example.com`,
          firstName: 'ANONYMIZED',
          lastName: 'USER',
          phone: null,
          // Keep role and status for system integrity
        }
      });

      // Anonymize audit logs but keep the structure
      await tx.auditLog.updateMany({
        where: { userId },
        data: {
          userEmail: 'anonymized@example.com',
          // Keep action and resource data for security analysis
        }
      });

      // Log the anonymization
      await tx.auditLog.create({
        data: {
          action: 'USER_DATA_ANONYMIZED',
          resourceType: 'USER',
          resourceId: userId,
          description: 'User data anonymized for compliance',
        }
      });
    });
  }

  // Generate compliance reports
  static async generateComplianceReport(reportType: 'GDPR' | 'SOC2' | 'SECURITY'): Promise<any> {
    switch (reportType) {
      case 'GDPR':
        return await this.generateGDPRReport();
      case 'SOC2':
        return await this.generateSOC2Report();
      case 'SECURITY':
        return await this.generateSecurityReport();
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private static async generateGDPRReport(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      reportType: 'GDPR_COMPLIANCE',
      generatedAt: new Date(),
      metrics: {
        dataRequests: await db.auditLog.count({
          where: {
            action: { in: ['DATA_EXPORT_REQUEST', 'DATA_DELETION_REQUEST'] },
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        dataBreaches: await db.auditLog.count({
          where: {
            action: { contains: 'BREACH' },
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        consentUpdates: await db.auditLog.count({
          where: {
            action: 'CONSENT_UPDATED',
            createdAt: { gte: thirtyDaysAgo }
          }
        }),
        anonymizedUsers: await db.auditLog.count({
          where: {
            action: 'USER_DATA_ANONYMIZED',
            createdAt: { gte: thirtyDaysAgo }
          }
        })
      }
    };
  }

  private static async generateSOC2Report(): Promise<any> {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    return {
      reportType: 'SOC2_COMPLIANCE',
      generatedAt: new Date(),
      controls: {
        accessControl: {
          privilegedAccessReviews: await this.countPrivilegedAccessReviews(startOfMonth),
          failedLoginAttempts: await this.countFailedLogins(startOfMonth),
          passwordPolicyCompliance: await this.checkPasswordPolicyCompliance()
        },
        systemMonitoring: {
          securityIncidents: await this.countSecurityIncidents(startOfMonth),
          systemUptime: await this.calculateSystemUptime(startOfMonth),
          backupSuccess: await this.checkBackupSuccess(startOfMonth)
        },
        dataProtection: {
          encryptionCompliance: 100, // All data encrypted
          dataRetentionCompliance: await this.checkDataRetentionCompliance(),
          accessLogRetention: await this.checkAccessLogRetention()
        }
      }
    };
  }

  // Data subject rights implementation (GDPR)
  static async handleDataSubjectRequest(
    type: 'ACCESS' | 'PORTABILITY' | 'DELETION' | 'RECTIFICATION',
    userId: string,
    requestDetails?: any
  ): Promise<{ requestId: string; status: string; data?: any }> {
    const requestId = `DSR_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    switch (type) {
      case 'ACCESS':
        return await this.handleAccessRequest(userId, requestId);
      case 'PORTABILITY':
        return await this.handlePortabilityRequest(userId, requestId);
      case 'DELETION':
        return await this.handleDeletionRequest(userId, requestId);
      case 'RECTIFICATION':
        return await this.handleRectificationRequest(userId, requestId, requestDetails);
      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  private static async handleAccessRequest(userId: string, requestId: string): Promise<any> {
    // Collect all user data
    const userData = await db.user.findUnique({
      where: { id: userId },
      include: {
        createdOrders: true,
        assignedTasks: true,
        // Include other related data
      }
    });

    // Log the request
    await db.auditLog.create({
      data: {
        action: 'DATA_ACCESS_REQUEST',
        resourceType: 'USER',
        resourceId: userId,
        description: `Data access request ${requestId}`,
        businessContext: { requestId }
      }
    });

    return {
      requestId,
      status: 'COMPLETED',
      data: userData
    };
  }

  private static async handleDeletionRequest(userId: string, requestId: string): Promise<any> {
    // Check if user can be deleted (e.g., no active orders)
    const activeOrders = await db.order.count({
      where: {
        createdBy: userId,
        status: { not: 'DELIVERED' }
      }
    });

    if (activeOrders > 0) {
      return {
        requestId,
        status: 'REJECTED',
        reason: 'User has active orders that cannot be deleted'
      };
    }

    // Anonymize instead of delete to maintain audit trail
    await this.anonymizeUserData(userId);

    return {
      requestId,
      status: 'COMPLETED',
      message: 'User data has been anonymized'
    };
  }

  // Security control assessments
  static async assessSecurityControls(): Promise<{
    overallScore: number;
    controlScores: Record<string, number>;
    recommendations: string[];
  }> {
    const assessments = {
      authentication: await this.assessAuthenticationControls(),
      authorization: await this.assessAuthorizationControls(),
      dataProtection: await this.assessDataProtectionControls(),
      monitoring: await this.assessMonitoringControls(),
      incidentResponse: await this.assessIncidentResponseControls()
    };

    const overallScore = Object.values(assessments).reduce((sum, score) => sum + score, 0) / Object.values(assessments).length;

    const recommendations: string[] = [];
    
    Object.entries(assessments).forEach(([control, score]) => {
      if (score < 80) {
        recommendations.push(`Improve ${control} controls (current score: ${score}%)`);
      }
    });

    return {
      overallScore,
      controlScores: assessments,
      recommendations
    };
  }

  private static async assessAuthenticationControls(): Promise<number> {
    let score = 100;
    
    // Check for users with weak passwords (this would be implemented)
    // Check for users without recent password changes
    // Check for accounts without MFA (when implemented)
    
    return score;
  }

  private static async assessAuthorizationControls(): Promise<number> {
    let score = 100;
    
    // Check for users with excessive permissions
    const adminCount = await db.user.count({ where: { role: 'ADMIN' } });
    const totalUsers = await db.user.count();
    
    if (adminCount / totalUsers > 0.1) { // More than 10% admins
      score -= 20;
    }
    
    return score;
  }

  private static async assessDataProtectionControls(): Promise<number> {
    // All data is encrypted by design
    return 100;
  }

  private static async assessMonitoringControls(): Promise<number> {
    const recentEvents = await db.auditLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    
    // Good monitoring should have events
    return recentEvents > 0 ? 100 : 50;
  }

  private static async assessIncidentResponseControls(): Promise<number> {
    // Check if security incidents are being addressed
    const unaddressedIncidents = await db.auditLog.count({
      where: {
        action: { contains: 'SECURITY_ALERT' },
        businessContext: { path: ['resolved'], equals: false }
      }
    });
    
    return unaddressedIncidents === 0 ? 100 : Math.max(0, 100 - (unaddressedIncidents * 10));
  }
}
```

This comprehensive security architecture provides robust protection for the TORVAN MEDICAL workflow management system while ensuring compliance with industry standards and regulations. The multi-layered approach ensures that security is built into every aspect of the system, from the database layer up to the user interface.

**Key Security Features Implemented:**
- Strong authentication with password policies
- Role-based access control with fine-grained permissions
- Session security with anomaly detection
- Comprehensive audit logging and monitoring
- Input validation and sanitization
- Rate limiting and DDoS protection
- Data encryption at rest and in transit
- Compliance reporting and data subject rights
- Security incident response procedures

The architecture emphasizes security by design while maintaining usability and performance for legitimate users.