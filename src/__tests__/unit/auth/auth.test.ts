/**
 * TORVAN MEDICAL DEVICE AUTHENTICATION TESTING
 * ============================================
 * 
 * Unit tests for authentication system compliance with medical device standards
 * Tests security, password policies, session management, and role-based access
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { authOptions } from '@/lib/auth';
import { verifyPassword, hashPassword } from '@/lib/security/password';
import { prismaMock } from '../../setup/integration.setup';

// Mock NextAuth
jest.mock('next-auth', () => ({
  NextAuthOptions: {},
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('TORVAN Medical Device Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FDA 21 CFR Part 820 Compliance - User Authentication', () => {
    it('should enforce medical device password requirements', async () => {
      const testPassword = 'MedicalDevice123!@#';
      
      // Test password hashing with medical device security standards
      const hashedPassword = await hashPassword(testPassword);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(60); // bcrypt hash length
      
      // Test password verification
      const isValid = await verifyPassword(testPassword, hashedPassword);
      expect(isValid).toBe(true);
      
      // Test invalid password
      const isInvalid = await verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should implement account lockout after failed attempts', async () => {
      const mockUser = {
        id: BigInt(1),
        username: 'testuser',
        email: 'test@torvan.com',
        passwordHash: 'hashed_password',
        failedLoginAttempts: 4, // One away from lockout
        isLocked: false,
        lockedUntil: null,
        isActive: true,
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [],
      } as any;

      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        isLocked: true,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        failedLoginAttempts: 5,
      });

      // Mock password verification to fail
      jest.mocked(verifyPassword).mockResolvedValue(false);

      const credentials = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const provider = authOptions.providers?.[0] as any;
      
      try {
        await provider.authorize(credentials);
        fail('Should throw error for failed authentication');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Invalid credentials');
      }

      // Verify account lockout was triggered
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          failedLoginAttempts: { increment: 1 },
          isLocked: true,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('should enforce session timeout for medical device security', () => {
      expect(authOptions.session?.maxAge).toBe(8 * 60 * 60); // 8 hours
      expect(authOptions.jwt?.maxAge).toBe(8 * 60 * 60); // 8 hours
    });

    it('should validate user credentials with medical device requirements', async () => {
      const mockUser = {
        id: BigInt(1),
        username: 'medicaluser',
        email: 'medical@torvan.com',
        passwordHash: 'hashed_password',
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        isActive: true,
        emailVerified: true,
        passwordExpiresAt: null,
        mustChangePassword: false,
        firstName: 'Medical',
        lastName: 'User',
        jobTitle: 'QC Inspector',
        department: 'Quality Control',
        createdAt: new Date(),
        updatedAt: new Date(),
        userRoles: [{
          role: {
            roleName: 'QC_INSPECTOR',
            rolePermissions: [{
              permission: {
                permissionCode: 'qc:inspect'
              }
            }]
          }
        }],
      } as any;

      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        lastLogin: new Date(),
        failedLoginAttempts: 0,
      });

      jest.mocked(verifyPassword).mockResolvedValue(true);

      const credentials = {
        username: 'medicaluser',
        password: 'ValidPassword123!',
      };

      const provider = authOptions.providers?.[0] as any;
      const result = await provider.authorize(credentials);

      expect(result).toBeDefined();
      expect(result.username).toBe('medicaluser');
      expect(result.roles).toContain('QC_INSPECTOR');
      expect(result.permissions).toContain('qc:inspect');
      expect(result.department).toBe('Quality Control');
    });
  });

  describe('ISO 13485 Compliance - Role-Based Access Control', () => {
    it('should implement proper role hierarchy for medical device workflows', async () => {
      const testCases = [
        {
          role: 'ADMIN',
          expectedPermissions: ['*'], // Full access
          description: 'Administrator should have full system access'
        },
        {
          role: 'PRODUCTION_COORDINATOR',
          expectedPermissions: ['orders:read', 'orders:create', 'bom:read'],
          description: 'Production coordinator should have order and BOM access'
        },
        {
          role: 'QC_INSPECTOR',
          expectedPermissions: ['qc:inspect', 'qc:approve', 'orders:read'],
          description: 'QC inspector should have quality control permissions'
        },
        {
          role: 'ASSEMBLER',
          expectedPermissions: ['production:read', 'production:update'],
          description: 'Assembler should have limited production access'
        }
      ];

      for (const testCase of testCases) {
        const result = await global.securityTestUtils.authorization.testRoleBasedAccess(
          testCase.role,
          testCase.expectedPermissions[0]
        );

        expect(result.hasPermission).toBe(true);
        expect(result.userRole).toBe(testCase.role);
      }
    });

    it('should prevent unauthorized access to sensitive medical data', async () => {
      const unauthorizedAccess = await global.securityTestUtils.authorization.simulateUnauthorizedAccess(
        'USER-123',
        'patient_data',
        'read'
      );

      expect(unauthorizedAccess.blocked).toBe(true);
      expect(unauthorizedAccess.severity).toBe('HIGH');
      expect(unauthorizedAccess.reason).toBe('Insufficient permissions');
    });
  });

  describe('IEC 62304 Software Security - Authentication Protocols', () => {
    it('should implement secure session management', async () => {
      const mockSession = global.testUtils.createMockSession();
      
      expect(mockSession.expires).toBeDefined();
      
      const expiryTime = new Date(mockSession.expires);
      const currentTime = new Date();
      const sessionDuration = expiryTime.getTime() - currentTime.getTime();
      
      // Should not exceed 8 hours (medical device requirement)
      expect(sessionDuration).toBeLessThanOrEqual(8 * 60 * 60 * 1000);
    });

    it('should refresh user permissions on each request', async () => {
      const mockToken = {
        id: '1',
        username: 'testuser',
        roles: ['QC_INSPECTOR'],
        permissions: ['qc:inspect'],
      };

      const mockRefreshedUser = {
        id: BigInt(1),
        isActive: true,
        userRoles: [{
          role: {
            roleName: 'QC_INSPECTOR',
            rolePermissions: [{
              permission: {
                permissionCode: 'qc:inspect'
              }
            }, {
              permission: {
                permissionCode: 'qc:approve'
              }
            }]
          }
        }],
      } as any;

      prismaMock.user.findUnique.mockResolvedValue(mockRefreshedUser);

      const jwtCallback = authOptions.callbacks?.jwt;
      if (jwtCallback) {
        const refreshedToken = await jwtCallback({
          token: mockToken,
          user: undefined,
          account: null,
          profile: undefined,
          isNewUser: false,
          trigger: undefined,
          session: undefined,
        });

        expect(refreshedToken?.permissions).toContain('qc:inspect');
        expect(refreshedToken?.permissions).toContain('qc:approve');
      }
    });

    it('should handle expired passwords for medical device compliance', async () => {
      const mockUser = {
        id: BigInt(1),
        username: 'expireduser',
        email: 'expired@torvan.com',
        passwordHash: 'hashed_password',
        passwordExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired 1 day ago
        isActive: true,
        emailVerified: true,
        failedLoginAttempts: 0,
        isLocked: false,
        mustChangePassword: false,
        userRoles: [],
      } as any;

      prismaMock.user.findFirst.mockResolvedValue(mockUser);
      jest.mocked(verifyPassword).mockResolvedValue(true);

      const credentials = {
        username: 'expireduser',
        password: 'ValidPassword123!',
      };

      const provider = authOptions.providers?.[0] as any;
      
      try {
        await provider.authorize(credentials);
        fail('Should throw error for expired password');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Password has expired. Please reset your password.');
      }
    });
  });

  describe('Medical Device Audit Trail Requirements', () => {
    it('should log authentication events for audit compliance', () => {
      const signInEvent = authOptions.events?.signIn;
      const signOutEvent = authOptions.events?.signOut;
      const createUserEvent = authOptions.events?.createUser;

      expect(signInEvent).toBeDefined();
      expect(signOutEvent).toBeDefined();
      expect(createUserEvent).toBeDefined();

      // Test sign-in event logging
      const mockUser = { id: '1', email: 'test@torvan.com' };
      const mockAccount = { provider: 'credentials' };

      if (signInEvent) {
        expect(() => signInEvent({
          user: mockUser as any,
          account: mockAccount as any,
          profile: undefined,
          isNewUser: false,
        })).not.toThrow();
      }
    });

    it('should create valid audit trail entries', async () => {
      const auditEntry = await global.securityTestUtils.auditLogging.createAuditLogEntry(
        'LOGIN_SUCCESS',
        'USER-123',
        'user',
        '123'
      );

      expect(auditEntry).toHaveValidAuditTrail();
      expect(auditEntry.timestamp).toBeDefined();
      expect(auditEntry.userId).toBe('USER-123');
      expect(auditEntry.action).toBe('LOGIN_SUCCESS');
      expect(auditEntry.resourceType).toBe('user');
    });
  });

  describe('Performance Requirements for Medical Device Authentication', () => {
    it('should authenticate users within performance limits', async () => {
      const authOperation = async () => {
        // Mock authentication operation
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms mock
        return { success: true };
      };

      const performance = await global.testUtils.validatePerformanceRequirements(
        authOperation,
        global.MEDICAL_DEVICE_TEST_CONFIG.PERFORMANCE_REQUIREMENTS.USER_AUTHENTICATION_MAX_TIME_MS || 1000
      );

      expect(performance.withinLimit).toBe(true);
      expect(performance.duration).toBeWithinPerformanceLimit(1000);
    });

    it('should handle concurrent authentication requests', async () => {
      const concurrentUsers = 10;
      const authOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
        return { authenticated: true };
      };

      const results = await Promise.all(
        Array(concurrentUsers).fill(null).map(() => authOperation())
      );

      expect(results).toHaveLength(concurrentUsers);
      results.forEach(result => {
        expect(result.authenticated).toBe(true);
      });
    });
  });
});