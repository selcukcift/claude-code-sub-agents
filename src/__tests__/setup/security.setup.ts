/**
 * TORVAN MEDICAL DEVICE SECURITY TESTING SETUP
 * ============================================
 * 
 * Security test setup for medical device compliance
 * Configures security testing, penetration testing, and vulnerability scanning
 */

import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import bcrypt from 'bcryptjs';

// Security Testing Configuration
const SECURITY_TEST_CONFIG = {
  // Password Security Requirements (Medical Device Standard)
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    MAX_AGE_DAYS: 90,
    PREVENT_REUSE_COUNT: 12,
  },
  
  // Authentication Security
  AUTH_SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    SESSION_TIMEOUT_HOURS: 8,
    REQUIRE_MFA: true,
    JWT_EXPIRY_HOURS: 8,
  },
  
  // Data Encryption Requirements
  ENCRYPTION_REQUIREMENTS: {
    ALGORITHM: 'AES-256-GCM',
    KEY_LENGTH: 256,
    SALT_ROUNDS: 12,
    REQUIRE_ENCRYPTION_AT_REST: true,
    REQUIRE_ENCRYPTION_IN_TRANSIT: true,
  },
  
  // Access Control Requirements
  ACCESS_CONTROL: {
    ENABLE_RBAC: true,
    REQUIRE_PERMISSIONS: true,
    AUDIT_ALL_ACTIONS: true,
    MINIMUM_PRIVILEGE_PRINCIPLE: true,
  },
};

// Global security test configuration
global.SECURITY_TEST_CONFIG = SECURITY_TEST_CONFIG;

// Mock security utilities
jest.mock('bcryptjs', () => ({
  hash: jest.fn((password: string, saltRounds: number) => 
    Promise.resolve(`hashed_${password}_${saltRounds}`)
  ),
  compare: jest.fn((password: string, hash: string) => 
    Promise.resolve(hash.includes(password))
  ),
  genSalt: jest.fn((rounds: number) => 
    Promise.resolve(`salt_${rounds}`)
  ),
}));

// Mock crypto for encryption testing
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn((size: number) => Buffer.alloc(size, 'a')),
  createCipher: jest.fn(() => ({
    update: jest.fn(() => 'encrypted_data'),
    final: jest.fn(() => '_final'),
  })),
  createDecipher: jest.fn(() => ({
    update: jest.fn(() => 'decrypted_data'),
    final: jest.fn(() => '_final'),
  })),
}));

// Security test utilities
global.securityTestUtils = {
  // Password testing utilities
  password: {
    async generateSecurePassword(): Promise<string> {
      return 'TestPass123!@#';
    },
    
    async generateWeakPassword(): Promise<string> {
      return 'weak';
    },
    
    async testPasswordStrength(password: string) {
      const tests = {
        hasMinLength: password.length >= SECURITY_TEST_CONFIG.PASSWORD_REQUIREMENTS.MIN_LENGTH,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };
      
      const score = Object.values(tests).filter(Boolean).length;
      
      return {
        ...tests,
        score,
        isSecure: score === 5,
        strength: score >= 4 ? 'strong' : score >= 3 ? 'medium' : 'weak',
      };
    },
    
    async hashPassword(password: string): Promise<string> {
      return bcrypt.hash(password, SECURITY_TEST_CONFIG.ENCRYPTION_REQUIREMENTS.SALT_ROUNDS);
    },
    
    async verifyPassword(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    },
  },
  
  // Authentication testing utilities
  authentication: {
    async simulateLoginAttempts(username: string, attempts: number) {
      const results = [];
      for (let i = 0; i < attempts; i++) {
        results.push({
          attempt: i + 1,
          timestamp: new Date(),
          success: i === 0, // Only first attempt succeeds
          ip: '192.168.1.100',
          userAgent: 'Test Agent',
        });
      }
      return results;
    },
    
    async simulateAccountLockout(username: string) {
      return {
        username,
        isLocked: true,
        lockedAt: new Date(),
        lockedUntil: new Date(Date.now() + SECURITY_TEST_CONFIG.AUTH_SECURITY.LOCKOUT_DURATION_MINUTES * 60 * 1000),
        failedAttempts: SECURITY_TEST_CONFIG.AUTH_SECURITY.MAX_LOGIN_ATTEMPTS,
      };
    },
    
    async createMockJWT(payload: any) {
      return {
        token: `mock.jwt.token.${Date.now()}`,
        payload,
        expiresAt: new Date(Date.now() + SECURITY_TEST_CONFIG.AUTH_SECURITY.JWT_EXPIRY_HOURS * 60 * 60 * 1000),
      };
    },
  },
  
  // Authorization testing utilities
  authorization: {
    async testRoleBasedAccess(userRole: string, requiredPermission: string) {
      const rolePermissions = {
        ADMIN: ['*'],
        PRODUCTION_COORDINATOR: ['orders:read', 'orders:create', 'orders:update', 'bom:read'],
        PROCUREMENT_MANAGER: ['orders:read', 'parts:read', 'parts:create', 'suppliers:read'],
        QC_INSPECTOR: ['orders:read', 'qc:read', 'qc:create', 'qc:update'],
        ASSEMBLER: ['orders:read', 'production:read', 'production:update'],
        SERVICE_DEPT: ['orders:read', 'documents:read'],
      };
      
      const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
      const hasPermission = permissions.includes('*') || permissions.includes(requiredPermission);
      
      return {
        userRole,
        requiredPermission,
        hasPermission,
        userPermissions: permissions,
      };
    },
    
    async simulateUnauthorizedAccess(userId: string, resource: string, action: string) {
      return {
        userId,
        resource,
        action,
        timestamp: new Date(),
        blocked: true,
        reason: 'Insufficient permissions',
        severity: 'HIGH',
      };
    },
  },
  
  // Data encryption testing utilities
  encryption: {
    async encryptSensitiveData(data: string) {
      // Mock encryption
      return {
        encrypted: `encrypted_${data}`,
        algorithm: SECURITY_TEST_CONFIG.ENCRYPTION_REQUIREMENTS.ALGORITHM,
        keyLength: SECURITY_TEST_CONFIG.ENCRYPTION_REQUIREMENTS.KEY_LENGTH,
      };
    },
    
    async decryptSensitiveData(encryptedData: string) {
      // Mock decryption
      return {
        decrypted: encryptedData.replace('encrypted_', ''),
        verified: true,
      };
    },
    
    async testDataEncryption(sensitiveFields: string[]) {
      const results = [];
      for (const field of sensitiveFields) {
        const encrypted = await this.encryptSensitiveData(field);
        const decrypted = await this.decryptSensitiveData(encrypted.encrypted);
        
        results.push({
          field,
          encrypted: encrypted.encrypted,
          decrypted: decrypted.decrypted,
          successful: decrypted.decrypted === field,
        });
      }
      return results;
    },
  },
  
  // Security vulnerability testing
  vulnerabilities: {
    async testSQLInjection(input: string) {
      const sqlInjectionPatterns = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM orders; --",
        "' UNION SELECT * FROM users --",
      ];
      
      const isSqlInjection = sqlInjectionPatterns.some(pattern => 
        input.toLowerCase().includes(pattern.toLowerCase())
      );
      
      return {
        input,
        isSqlInjection,
        blocked: isSqlInjection,
        severity: isSqlInjection ? 'CRITICAL' : 'LOW',
      };
    },
    
    async testXSSAttack(input: string) {
      const xssPatterns = [
        '<script>',
        'javascript:',
        'onload=',
        'onerror=',
        '<iframe>',
      ];
      
      const isXSS = xssPatterns.some(pattern => 
        input.toLowerCase().includes(pattern.toLowerCase())
      );
      
      return {
        input,
        isXSS,
        blocked: isXSS,
        severity: isXSS ? 'HIGH' : 'LOW',
      };
    },
    
    async testCSRFProtection(requestType: string, hasToken: boolean) {
      const requiresCSRFProtection = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(requestType);
      
      return {
        requestType,
        requiresCSRFProtection,
        hasToken,
        protected: !requiresCSRFProtection || hasToken,
        vulnerability: requiresCSRFProtection && !hasToken,
      };
    },
  },
  
  // Audit logging testing
  auditLogging: {
    async createAuditLogEntry(action: string, userId: string, resourceType: string, resourceId: string) {
      return {
        timestamp: new Date().toISOString(),
        action,
        userId,
        resourceType,
        resourceId,
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent',
        sessionId: 'test-session-123',
        result: 'SUCCESS',
      };
    },
    
    async validateAuditTrail(entries: any[]) {
      const validationResults = entries.map(entry => ({
        ...entry,
        hasTimestamp: !!entry.timestamp,
        hasUserId: !!entry.userId,
        hasAction: !!entry.action,
        hasResourceInfo: !!(entry.resourceType && entry.resourceId),
        isValid: !!(entry.timestamp && entry.userId && entry.action && entry.resourceType),
      }));
      
      return {
        totalEntries: entries.length,
        validEntries: validationResults.filter(r => r.isValid).length,
        invalidEntries: validationResults.filter(r => !r.isValid).length,
        compliancePercentage: (validationResults.filter(r => r.isValid).length / entries.length) * 100,
        results: validationResults,
      };
    },
  },
};

// Security-specific test setup
beforeEach(() => {
  // Reset security mocks
  jest.clearAllMocks();
});

export {};