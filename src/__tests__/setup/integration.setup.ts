/**
 * TORVAN MEDICAL DEVICE INTEGRATION TESTING SETUP
 * ===============================================
 * 
 * Integration test setup for medical device compliance
 * Configures database connections, API mocking, and external system integration
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma Client for integration testing
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
  default: prismaMock,
}));

// Test Database Configuration
const TEST_DATABASE_CONFIG = {
  url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/torvan_test',
  shadow_database_url: process.env.TEST_SHADOW_DATABASE_URL || 'postgresql://test:test@localhost:5432/torvan_test_shadow',
};

// Medical Device Integration Test Configuration
const INTEGRATION_TEST_CONFIG = {
  // External System Integration Testing
  EXTERNAL_SYSTEMS: {
    ERP_SYSTEM: {
      enabled: false, // Mock in tests
      endpoint: 'http://localhost:3001/api/erp',
      timeout: 5000,
    },
    DOCUMENT_MANAGEMENT: {
      enabled: false, // Mock in tests
      endpoint: 'http://localhost:3002/api/docs',
      timeout: 3000,
    },
    SHIPPING_SYSTEM: {
      enabled: false, // Mock in tests
      endpoint: 'http://localhost:3003/api/shipping',
      timeout: 3000,
    },
  },
  
  // API Testing Configuration
  API_CONFIG: {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    retries: 2,
  },
  
  // Database Testing Configuration
  DATABASE_CONFIG: {
    transactionTimeout: 30000,
    queryTimeout: 10000,
    maxConnections: 10,
  },
};

// Global integration test configuration
global.INTEGRATION_TEST_CONFIG = INTEGRATION_TEST_CONFIG;

// Mock external API calls
jest.mock('node-fetch', () => {
  return jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: {} }),
      text: () => Promise.resolve('{}'),
    })
  );
});

// Mock tRPC for integration testing
jest.mock('@/lib/trpc/server', () => ({
  appRouter: {
    createCaller: jest.fn(() => ({
      auth: {
        login: jest.fn(),
        logout: jest.fn(),
        register: jest.fn(),
      },
      orders: {
        create: jest.fn(),
        list: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      bom: {
        generate: jest.fn(),
        approve: jest.fn(),
        list: jest.fn(),
      },
      qc: {
        createInspection: jest.fn(),
        updateInspection: jest.fn(),
        listInspections: jest.fn(),
      },
    })),
  },
}));

// Integration test utilities
global.integrationTestUtils = {
  // Database utilities
  database: {
    async seedTestData() {
      // Mock seeding test data
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          username: 'admin',
          email: 'admin@torvan.com',
          firstName: 'Admin',
          lastName: 'User',
          passwordHash: 'hashed_password',
          isActive: true,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);
      
      prismaMock.customer.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          customerCode: 'CUST-001',
          companyName: 'Test Medical Corp',
          primaryContactEmail: 'contact@testmedical.com',
          customerStatus: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);
      
      prismaMock.assembly.findMany.mockResolvedValue([
        {
          id: 'ASM-001',
          name: 'Test Assembly',
          description: 'Test assembly for integration testing',
          assemblyType: 'COMPONENT',
          canOrder: true,
          status: 'ACTIVE',
          basePrice: 100.00,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);
    },
    
    async cleanupTestData() {
      // Mock cleanup for test data
      mockReset(prismaMock);
    },
    
    async createTransaction<T>(operation: () => Promise<T>): Promise<T> {
      // Mock database transaction
      return await operation();
    },
  },
  
  // API testing utilities
  api: {
    async makeRequest(method: string, endpoint: string, data?: any) {
      // Mock API request
      return {
        status: 200,
        data: { success: true, result: data },
      };
    },
    
    async authenticatedRequest(method: string, endpoint: string, token: string, data?: any) {
      // Mock authenticated API request
      return {
        status: 200,
        data: { success: true, result: data },
        headers: { authorization: `Bearer ${token}` },
      };
    },
  },
  
  // External system mocks
  externalSystems: {
    mockERPSystem: {
      async createOrder(orderData: any) {
        return { success: true, erpOrderId: 'ERP-001', orderData };
      },
      
      async updateInventory(inventoryData: any) {
        return { success: true, inventoryData };
      },
    },
    
    mockDocumentSystem: {
      async uploadDocument(document: any) {
        return { success: true, documentId: 'DOC-001', url: 'http://docs.test/doc-001' };
      },
      
      async retrieveDocument(documentId: string) {
        return { success: true, document: { id: documentId, content: 'mock content' } };
      },
    },
    
    mockShippingSystem: {
      async createShipment(shipmentData: any) {
        return { success: true, trackingNumber: 'TRACK-001', shipmentData };
      },
      
      async getShippingStatus(trackingNumber: string) {
        return { success: true, status: 'IN_TRANSIT', estimatedDelivery: new Date() };
      },
    },
  },
  
  // Medical device workflow testing
  medicalWorkflows: {
    async simulateOrderWorkflow(orderData: any) {
      const steps = [
        'DRAFT',
        'CONFIGURATION', 
        'APPROVAL',
        'PRODUCTION',
        'QUALITY_CONTROL',
        'PACKAGING',
        'SHIPPING',
        'DELIVERED'
      ];
      
      const results = [];
      for (const step of steps) {
        // Mock each workflow step
        results.push({
          phase: step,
          timestamp: new Date(),
          success: true,
          duration: Math.random() * 1000, // Random duration for testing
        });
      }
      
      return results;
    },
    
    async simulateBOMGeneration(configurationId: string) {
      // Mock BOM generation process
      return {
        bomId: 'BOM-001',
        configurationId,
        totalParts: 15,
        estimatedCost: 750.00,
        generationTime: 2500, // Should be < 5000ms per requirements
        success: true,
      };
    },
    
    async simulateQCInspection(orderItemId: string) {
      // Mock quality control inspection
      return {
        inspectionId: 'QC-001',
        orderItemId,
        inspectorId: 'USER-002',
        result: 'PASS',
        passPercentage: 98.5,
        completedAt: new Date(),
        success: true,
      };
    },
  },
};

// Setup before all integration tests
beforeAll(async () => {
  // Initialize test database
  await global.integrationTestUtils.database.seedTestData();
});

// Cleanup after all integration tests
afterAll(async () => {
  // Cleanup test database
  await global.integrationTestUtils.database.cleanupTestData();
});

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

export {};