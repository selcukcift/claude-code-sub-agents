/**
 * TORVAN SECURITY MIDDLEWARE
 * =========================
 * 
 * Security middleware for API protection and medical device compliance
 * - Rate limiting
 * - Request validation
 * - CORS handling
 * - Security headers
 * - Audit logging
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { TorvanUserRole, Permission } from "@/lib/security/rbac";

// Rate limiting store (in production, use Redis or external service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware for medical device security
 */
export function rateLimit(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  return (request: NextRequest) => {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < windowStart) {
        rateLimitStore.delete(key);
      }
    }

    const current = rateLimitStore.get(ip) || { count: 0, resetTime: now + windowMs };
    
    if (current.resetTime < now) {
      // Reset window
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }

    rateLimitStore.set(ip, current);

    if (current.count > maxRequests) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString()
          }
        }
      );
    }

    return null; // Continue processing
  };
}

/**
 * Security headers middleware for medical device compliance
 */
export function securityHeaders(response: NextResponse): NextResponse {
  // HIPAA and medical device security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Strict Transport Security for medical device security
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Content Security Policy for medical devices
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
  );

  return response;
}

/**
 * CORS middleware for API endpoints
 */
export function corsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

/**
 * Authentication middleware
 */
export async function requireAuthentication(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  return token;
}

/**
 * Role-based authorization middleware
 */
export async function requireRole(
  request: NextRequest, 
  requiredRoles: TorvanUserRole[]
) {
  const token = await requireAuthentication(request);
  
  if (token instanceof NextResponse) {
    return token; // Authentication failed
  }

  const userRoles = token.roles as string[] || [];
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

  if (!hasRequiredRole) {
    return NextResponse.json(
      { error: "Insufficient role permissions" },
      { status: 403 }
    );
  }

  return token;
}

/**
 * Permission-based authorization middleware
 */
export async function requirePermission(
  request: NextRequest,
  requiredPermissions: Permission[]
) {
  const token = await requireAuthentication(request);
  
  if (token instanceof NextResponse) {
    return token; // Authentication failed
  }

  const userPermissions = token.permissions as string[] || [];
  const hasAllPermissions = requiredPermissions.every(
    permission => userPermissions.includes(permission)
  );

  if (!hasAllPermissions) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return token;
}

/**
 * Input validation middleware
 */
export function validateInput(request: NextRequest, allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']) {
  const method = request.method;
  
  if (!allowedMethods.includes(method)) {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  // Validate content type for POST/PUT requests
  if (['POST', 'PUT'].includes(method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }
  }

  return null; // Continue processing
}

/**
 * Audit logging middleware for medical device compliance
 */
export async function auditLog(
  request: NextRequest,
  response: NextResponse,
  userId?: string,
  action?: string,
  resourceType?: string,
  resourceId?: string
) {
  try {
    if (!userId) {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });
      userId = token?.id as string;
    }

    if (userId) {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      await prisma.auditLog.create({
        data: {
          userId: BigInt(userId),
          action: action || request.method as any,
          tableName: resourceType || 'API',
          recordId: resourceId || request.url,
          userIp: ip,
          userAgent,
          changedAt: new Date(),
          dataClassification: 'INTERNAL'
        }
      });
    }
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Combined security middleware for API routes
 */
export async function apiSecurityMiddleware(
  request: NextRequest,
  options: {
    rateLimit?: { windowMs?: number; maxRequests?: number };
    requireAuth?: boolean;
    requiredRoles?: TorvanUserRole[];
    requiredPermissions?: Permission[];
    allowedMethods?: string[];
    audit?: boolean;
  } = {}
) {
  // Rate limiting
  if (options.rateLimit !== false) {
    const rateLimitResult = rateLimit(
      options.rateLimit?.windowMs,
      options.rateLimit?.maxRequests
    )(request);
    
    if (rateLimitResult) {
      return rateLimitResult;
    }
  }

  // Input validation
  const validationResult = validateInput(request, options.allowedMethods);
  if (validationResult) {
    return validationResult;
  }

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    return corsHeaders(request, securityHeaders(response));
  }

  // Authentication
  let token = null;
  if (options.requireAuth || options.requiredRoles || options.requiredPermissions) {
    const authResult = await requireAuthentication(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    token = authResult;
  }

  // Role-based authorization
  if (options.requiredRoles && options.requiredRoles.length > 0) {
    const roleResult = await requireRole(request, options.requiredRoles);
    if (roleResult instanceof NextResponse) {
      return roleResult;
    }
  }

  // Permission-based authorization
  if (options.requiredPermissions && options.requiredPermissions.length > 0) {
    const permissionResult = await requirePermission(request, options.requiredPermissions);
    if (permissionResult instanceof NextResponse) {
      return permissionResult;
    }
  }

  return token; // Return token for further processing
}

/**
 * Wrap API response with security headers
 */
export function secureApiResponse(
  data: any,
  request: NextRequest,
  status: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  const response = NextResponse.json(data, { status, headers });
  return corsHeaders(request, securityHeaders(response));
}