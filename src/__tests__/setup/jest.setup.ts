/**
 * TORVAN MEDICAL DEVICE TESTING SETUP
 * ===================================
 * 
 * Global Jest setup for medical device compliance testing
 * Configures testing environment with FDA and ISO 13485 requirements
 */

import '@testing-library/jest-dom';
import { expect } from '@jest/globals';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Next.js router for component testing
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
  withRouter: (Component: any) => Component,
}));

// Mock Next.js navigation for App Router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
}));

// Mock NextAuth for authentication testing
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/torvan_test';

// Medical Device Testing Configuration
const MEDICAL_DEVICE_TEST_CONFIG = {
  // FDA 21 CFR Part 820 Requirements
  FDA_COMPLIANCE: {
    REQUIRE_VALIDATION_PROTOCOLS: true,
    REQUIRE_AUDIT_TRAILS: true,
    REQUIRE_RISK_ANALYSIS: true,
    REQUIRE_USER_AUTHENTICATION: true,
  },
  
  // ISO 13485 Requirements
  ISO_13485_COMPLIANCE: {
    REQUIRE_DOCUMENT_CONTROL: true,
    REQUIRE_CHANGE_CONTROL: true,
    REQUIRE_RISK_MANAGEMENT: true,
    REQUIRE_CORRECTIVE_ACTIONS: true,
  },
  
  // Performance Requirements
  PERFORMANCE_REQUIREMENTS: {
    BOM_GENERATION_MAX_TIME_MS: 5000,
    PAGE_LOAD_MAX_TIME_MS: 3000,
    API_RESPONSE_MAX_TIME_MS: 2000,
  },
};

// Global test configuration
global.MEDICAL_DEVICE_TEST_CONFIG = MEDICAL_DEVICE_TEST_CONFIG;

// Custom Jest matchers for medical device testing
expect.extend({
  toMeetFDACompliance(received, expected) {
    const pass = this.equals(received, expected);
    return {
      message: () =>
        pass
          ? `Expected ${received} not to meet FDA compliance requirements`
          : `Expected ${received} to meet FDA compliance requirements: ${expected}`,
      pass,
    };
  },
  
  toMeetISO13485Compliance(received, expected) {
    const pass = this.equals(received, expected);
    return {
      message: () =>
        pass
          ? `Expected ${received} not to meet ISO 13485 compliance requirements`
          : `Expected ${received} to meet ISO 13485 compliance requirements: ${expected}`,
      pass,
    };
  },
  
  toBeWithinPerformanceLimit(received, limit) {
    const pass = received <= limit;
    return {
      message: () =>
        pass
          ? `Expected ${received} to exceed performance limit of ${limit}ms`
          : `Expected ${received} to be within performance limit of ${limit}ms, but got ${received}ms`,
      pass,
    };
  },
  
  toHaveValidAuditTrail(received) {
    const hasTimestamp = received.timestamp && typeof received.timestamp === 'string';
    const hasUserId = received.userId && typeof received.userId === 'string';
    const hasAction = received.action && typeof received.action === 'string';
    const hasTableName = received.tableName && typeof received.tableName === 'string';
    
    const pass = hasTimestamp && hasUserId && hasAction && hasTableName;
    
    return {
      message: () =>
        pass
          ? `Expected audit trail to be invalid`
          : `Expected audit trail to have timestamp, userId, action, and tableName properties`,
      pass,
    };
  },
});

// Global test utilities
global.testUtils = {
  createMockUser: (overrides = {}) => ({
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['PRODUCTION_COORDINATOR'],
    permissions: ['orders:read', 'orders:create'],
    department: 'Production',
    jobTitle: 'Coordinator',
    ...overrides,
  }),
  
  createMockSession: (user = null) => ({
    user: user || global.testUtils.createMockUser(),
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
  }),
  
  createMockOrder: (overrides = {}) => ({
    id: 'ORD-001',
    orderNumber: 'ORD-2025-001',
    customerId: BigInt(1),
    orderType: 'STANDARD',
    currentPhase: 'DRAFT',
    priority: 'NORMAL',
    subtotal: 1000.00,
    totalAmount: 1150.00,
    currency: 'USD',
    orderDate: new Date(),
    createdBy: BigInt(1),
    ...overrides,
  }),
  
  createMockBOM: (overrides = {}) => ({
    id: BigInt(1),
    bomNumber: 'BOM-001',
    configurationId: BigInt(1),
    assemblyId: 'ASM-001',
    bomType: 'STANDARD',
    status: 'DRAFT',
    totalPartsCount: 10,
    totalEstimatedCost: 500.00,
    generatedBy: BigInt(1),
    ...overrides,
  }),
  
  // Medical device specific test utilities
  validateSecurityCompliance: (component: any) => {
    // Validates that components meet medical device security requirements
    return {
      hasAuthentication: !!component.props?.requireAuth,
      hasAuthorization: !!component.props?.requiredPermissions,
      hasAuditLogging: !!component.props?.enableAuditLog,
      hasDataEncryption: !!component.props?.encryptData,
    };
  },
  
  validatePerformanceRequirements: async (operation: () => Promise<any>, maxTimeMs: number) => {
    const startTime = Date.now();
    await operation();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    return {
      duration,
      withinLimit: duration <= maxTimeMs,
      maxAllowed: maxTimeMs,
    };
  },
};

// Console log suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Suppress expected errors in tests
  if (typeof args[0] === 'string' && (
    args[0].includes('Warning: ReactDOM.render') ||
    args[0].includes('Warning: componentWillReceiveProps') ||
    args[0].includes('Error: Not implemented')
  )) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  // Suppress expected warnings in tests
  if (typeof args[0] === 'string' && (
    args[0].includes('componentWillReceiveProps') ||
    args[0].includes('componentWillMount')
  )) {
    return;
  }
  originalConsoleWarn(...args);
};

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});

// Test timeout configuration for medical device testing
jest.setTimeout(30000); // 30 seconds for complex medical workflows

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export {};