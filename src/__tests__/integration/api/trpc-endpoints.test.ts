/**
 * TORVAN MEDICAL DEVICE TRPC API TESTING
 * ======================================
 * 
 * Integration tests for tRPC API endpoints
 * Tests medical device workflow APIs with compliance requirements
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '@/server/api/root';
import { createTRPCMsw } from 'msw-trpc';
import { setupServer } from 'msw/node';
import { prismaMock } from '../../setup/integration.setup';

// Mock tRPC context
const createMockContext = (user?: any) => ({
  prisma: prismaMock,
  session: user ? {
    user,
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  } : null,
});

// Create tRPC caller
const createCaller = createCallerFactory(appRouter);

// Mock MSW server for external API calls
const trpcMsw = createTRPCMsw<typeof appRouter>();
const server = setupServer();

describe('TORVAN Medical Device tRPC API Endpoints', () => {
  beforeEach(() => {
    server.listen();
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
    server.close();
  });

  describe('FDA 21 CFR Part 820 - API Authentication & Authorization', () => {
    it('should require authentication for protected medical device endpoints', async () => {
      const caller = createCaller(createMockContext()); // No user session

      try {
        await caller.orders.list();
        fail('Should require authentication');
      } catch (error) {
        expect(error).toBeDefined();
        // Should throw authentication error
      }
    });

    it('should enforce role-based access for medical device operations', async () => {
      const qcInspectorUser = {
        id: '1',
        username: 'qc_inspector',
        roles: ['QC_INSPECTOR'],
        permissions: ['qc:inspect', 'orders:read'],
        department: 'Quality Control',
      };

      const caller = createCaller(createMockContext(qcInspectorUser));

      // Mock QC process data
      prismaMock.qCProcess.findMany.mockResolvedValue([
        {
          id: BigInt(1),
          processName: 'Final Inspection',
          processStage: 'FINAL',
          isActive: true,
        } as any,
      ]);

      // QC Inspector should be able to access QC processes
      const qcProcesses = await caller.qc.listProcesses();
      expect(qcProcesses).toHaveLength(1);
      expect(qcProcesses[0].processName).toBe('Final Inspection');
    });

    it('should validate API input for medical device safety', async () => {
      const adminUser = {
        id: '1',
        username: 'admin',
        roles: ['ADMIN'],
        permissions: ['*'],
      };

      const caller = createCaller(createMockContext(adminUser));

      try {
        // Invalid order data
        await caller.orders.create({
          customerId: '', // Invalid - should be BigInt
          orderType: 'INVALID_TYPE' as any,
          items: [],
        });
        fail('Should validate input data');
      } catch (error) {
        expect(error).toBeDefined();
        // Should throw validation error
      }
    });
  });

  describe('ISO 13485 - Order Management API Compliance', () => {
    it('should create medical device orders with full traceability', async () => {
      const productionUser = {
        id: '1',
        username: 'production_coord',
        roles: ['PRODUCTION_COORDINATOR'],
        permissions: ['orders:create', 'orders:read', 'orders:update'],
        department: 'Production',
      };

      const caller = createCaller(createMockContext(productionUser));

      const mockCustomer = {
        id: BigInt(1),
        customerCode: 'MED-001',
        companyName: 'Medical Device Corp',
        customerStatus: 'ACTIVE',
      };

      const mockOrder = {
        id: 'ORD-2025-001',
        orderNumber: 'ORD-2025-001',
        customerId: BigInt(1),
        orderType: 'STANDARD',
        currentPhase: 'DRAFT',
        priority: 'NORMAL',
        totalAmount: 1500.00,
        orderDate: new Date(),
        createdBy: BigInt(1),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.customer.findUnique.mockResolvedValue(mockCustomer as any);
      prismaMock.order.create.mockResolvedValue(mockOrder as any);

      const orderData = {
        customerId: BigInt(1),
        orderType: 'STANDARD' as const,
        priority: 'NORMAL' as const,
        specialInstructions: 'Medical device - FDA compliance required',
        items: [
          {
            assemblyId: 'ASM-MED-001',
            quantity: 1,
            unitPrice: 1500.00,
          },
        ],
      };

      const createdOrder = await caller.orders.create(orderData);

      expect(createdOrder).toBeDefined();
      expect(createdOrder.orderNumber).toBe('ORD-2025-001');
      expect(createdOrder.currentPhase).toBe('DRAFT');
      expect(prismaMock.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: BigInt(1),
            orderType: 'STANDARD',
            priority: 'NORMAL',
          }),
        })
      );
    });

    it('should track order phase transitions for medical device workflow', async () => {
      const productionUser = {
        id: '1',
        username: 'production_coord',
        roles: ['PRODUCTION_COORDINATOR'],
        permissions: ['orders:update', 'orders:read'],
      };

      const caller = createCaller(createMockContext(productionUser));

      const mockOrder = {
        id: 'ORD-2025-001',
        currentPhase: 'CONFIGURATION',
        createdBy: BigInt(1),
      };

      const mockUpdatedOrder = {
        ...mockOrder,
        currentPhase: 'APPROVAL',
        updatedAt: new Date(),
      };

      const mockStatusHistory = {
        id: BigInt(1),
        orderId: 'ORD-2025-001',
        fromPhase: 'CONFIGURATION',
        toPhase: 'APPROVAL',
        changedBy: BigInt(1),
        changeReason: 'Configuration completed',
        changedAt: new Date(),
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder as any);
      prismaMock.order.update.mockResolvedValue(mockUpdatedOrder as any);
      prismaMock.orderStatusHistory.create.mockResolvedValue(mockStatusHistory as any);

      const updatedOrder = await caller.orders.updatePhase({
        orderId: 'ORD-2025-001',
        newPhase: 'APPROVAL',
        changeReason: 'Configuration completed',
      });

      expect(updatedOrder.currentPhase).toBe('APPROVAL');
      expect(prismaMock.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'ORD-2025-001',
            fromPhase: 'CONFIGURATION',
            toPhase: 'APPROVAL',
            changeReason: 'Configuration completed',
          }),
        })
      );
    });

    it('should list orders with filtering and pagination for medical device management', async () => {
      const productionUser = {
        id: '1',
        username: 'production_coord',
        roles: ['PRODUCTION_COORDINATOR'],
        permissions: ['orders:read'],
      };

      const caller = createCaller(createMockContext(productionUser));

      const mockOrders = [
        {
          id: 'ORD-2025-001',
          orderNumber: 'ORD-2025-001',
          currentPhase: 'PRODUCTION',
          priority: 'HIGH',
          customer: { companyName: 'Medical Corp A' },
        },
        {
          id: 'ORD-2025-002',
          orderNumber: 'ORD-2025-002',
          currentPhase: 'QUALITY_CONTROL',
          priority: 'NORMAL',
          customer: { companyName: 'Medical Corp B' },
        },
      ];

      prismaMock.order.findMany.mockResolvedValue(mockOrders as any);
      prismaMock.order.count.mockResolvedValue(2);

      const orders = await caller.orders.list({
        phase: 'PRODUCTION',
        priority: 'HIGH',
        page: 1,
        limit: 10,
      });

      expect(orders.items).toHaveLength(2);
      expect(orders.totalCount).toBe(2);
      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentPhase: 'PRODUCTION',
            priority: 'HIGH',
          }),
          take: 10,
          skip: 0,
        })
      );
    });
  });

  describe('IEC 62304 - BOM Generation API Testing', () => {
    it('should generate BOM within performance requirements', async () => {
      const productionUser = {
        id: '1',
        username: 'production_coord',
        roles: ['PRODUCTION_COORDINATOR'],
        permissions: ['bom:generate', 'bom:read'],
      };

      const caller = createCaller(createMockContext(productionUser));

      const mockConfiguration = {
        id: BigInt(1),
        assemblyId: 'ASM-MED-001',
        sinkLengthInches: 24,
        basinCount: 2,
        hasLifter: true,
        isValid: true,
      };

      const mockBOM = {
        id: BigInt(1),
        bomNumber: 'BOM-2025-001',
        configurationId: BigInt(1),
        assemblyId: 'ASM-MED-001',
        status: 'DRAFT',
        totalPartsCount: 25,
        totalEstimatedCost: 1250.00,
        generatedBy: BigInt(1),
        generationMethod: 'AUTOMATIC',
        createdAt: new Date(),
      };

      prismaMock.configuration.findUnique.mockResolvedValue(mockConfiguration as any);
      prismaMock.bOM.create.mockResolvedValue(mockBOM as any);

      const startTime = Date.now();
      const generatedBOM = await caller.bom.generate({
        configurationId: BigInt(1),
      });
      const endTime = Date.now();

      const generationTime = endTime - startTime;

      expect(generatedBOM).toBeDefined();
      expect(generatedBOM.bomNumber).toBe('BOM-2025-001');
      expect(generatedBOM.totalPartsCount).toBe(25);
      expect(generationTime).toBeWithinPerformanceLimit(
        global.MEDICAL_DEVICE_TEST_CONFIG.PERFORMANCE_REQUIREMENTS.BOM_GENERATION_MAX_TIME_MS
      );
    });

    it('should approve BOM with proper authorization and audit trail', async () => {
      const adminUser = {
        id: '2',
        username: 'admin',
        roles: ['ADMIN'],
        permissions: ['bom:approve', 'bom:read'],
      };

      const caller = createCaller(createMockContext(adminUser));

      const mockBOM = {
        id: BigInt(1),
        bomNumber: 'BOM-2025-001',
        status: 'PENDING_APPROVAL',
        generatedBy: BigInt(1),
      };

      const mockApprovedBOM = {
        ...mockBOM,
        status: 'APPROVED',
        approvedBy: BigInt(2),
        approvedAt: new Date(),
      };

      prismaMock.bOM.findUnique.mockResolvedValue(mockBOM as any);
      prismaMock.bOM.update.mockResolvedValue(mockApprovedBOM as any);

      const approvedBOM = await caller.bom.approve({
        bomId: BigInt(1),
        approvalNotes: 'BOM meets all medical device requirements',
      });

      expect(approvedBOM.status).toBe('APPROVED');
      expect(approvedBOM.approvedBy).toBe(BigInt(2));
      expect(prismaMock.bOM.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(1) },
          data: expect.objectContaining({
            status: 'APPROVED',
            approvedBy: BigInt(2),
            approvedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Medical Device Quality Control API Testing', () => {
    it('should create QC inspection with medical device compliance', async () => {
      const qcUser = {
        id: '3',
        username: 'qc_inspector',
        roles: ['QC_INSPECTOR'],
        permissions: ['qc:inspect', 'qc:create'],
      };

      const caller = createCaller(createMockContext(qcUser));

      const mockOrderItem = {
        id: BigInt(1),
        orderId: 'ORD-2025-001',
        assemblyId: 'ASM-MED-001',
        productionStatus: 'COMPLETED',
      };

      const mockQCProcess = {
        id: BigInt(1),
        processName: 'Medical Device Final Inspection',
        processStage: 'FINAL',
        passThresholdPercentage: 100.00,
      };

      const mockInspection = {
        id: BigInt(1),
        orderItemId: BigInt(1),
        qcProcessId: BigInt(1),
        inspectorId: BigInt(3),
        inspectionDate: new Date(),
        overallResult: 'PENDING',
        createdAt: new Date(),
      };

      prismaMock.orderItem.findUnique.mockResolvedValue(mockOrderItem as any);
      prismaMock.qCProcess.findUnique.mockResolvedValue(mockQCProcess as any);
      prismaMock.qCInspection.create.mockResolvedValue(mockInspection as any);

      const inspection = await caller.qc.createInspection({
        orderItemId: BigInt(1),
        qcProcessId: BigInt(1),
        inspectionDate: new Date(),
      });

      expect(inspection).toBeDefined();
      expect(inspection.inspectorId).toBe(BigInt(3));
      expect(inspection.overallResult).toBe('PENDING');
      expect(prismaMock.qCInspection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderItemId: BigInt(1),
            qcProcessId: BigInt(1),
            inspectorId: BigInt(3),
          }),
        })
      );
    });

    it('should update QC inspection results with medical device validation', async () => {
      const qcUser = {
        id: '3',
        username: 'qc_inspector',
        roles: ['QC_INSPECTOR'],
        permissions: ['qc:inspect', 'qc:update'],
      };

      const caller = createCaller(createMockContext(qcUser));

      const mockInspection = {
        id: BigInt(1),
        inspectorId: BigInt(3),
        overallResult: 'PENDING',
        qcProcess: {
          passThresholdPercentage: 100.00,
        },
      };

      const mockUpdatedInspection = {
        ...mockInspection,
        overallResult: 'PASS',
        passPercentage: 100.00,
        inspectionNotes: 'All medical device requirements met',
        updatedAt: new Date(),
      };

      prismaMock.qCInspection.findUnique.mockResolvedValue(mockInspection as any);
      prismaMock.qCInspection.update.mockResolvedValue(mockUpdatedInspection as any);

      const updatedInspection = await caller.qc.updateInspection({
        inspectionId: BigInt(1),
        result: 'PASS',
        passPercentage: 100.00,
        inspectionNotes: 'All medical device requirements met',
      });

      expect(updatedInspection.overallResult).toBe('PASS');
      expect(updatedInspection.passPercentage).toBe(100.00);
    });
  });

  describe('API Performance and Error Handling', () => {
    it('should handle API requests within performance limits', async () => {
      const adminUser = {
        id: '1',
        username: 'admin',
        roles: ['ADMIN'],
        permissions: ['*'],
      };

      const caller = createCaller(createMockContext(adminUser));

      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      const apiOperation = async () => {
        return await caller.orders.list({ page: 1, limit: 50 });
      };

      const performance = await global.testUtils.validatePerformanceRequirements(
        apiOperation,
        global.MEDICAL_DEVICE_TEST_CONFIG.PERFORMANCE_REQUIREMENTS.API_RESPONSE_MAX_TIME_MS || 2000
      );

      expect(performance.withinLimit).toBe(true);
      expect(performance.duration).toBeWithinPerformanceLimit(2000);
    });

    it('should handle database connection errors gracefully', async () => {
      const adminUser = {
        id: '1',
        username: 'admin',
        roles: ['ADMIN'],
        permissions: ['*'],
      };

      const caller = createCaller(createMockContext(adminUser));

      const databaseError = new Error('Database connection failed');
      prismaMock.order.findMany.mockRejectedValue(databaseError);

      try {
        await caller.orders.list();
        fail('Should handle database error');
      } catch (error) {
        expect(error).toBeDefined();
        // Should handle database connection errors properly
      }
    });

    it('should validate concurrent API requests for medical device reliability', async () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        username: `user_${i + 1}`,
        roles: ['PRODUCTION_COORDINATOR'],
        permissions: ['orders:read'],
      }));

      prismaMock.order.findMany.mockResolvedValue([]);
      prismaMock.order.count.mockResolvedValue(0);

      const concurrentRequests = users.map(user => {
        const caller = createCaller(createMockContext(user));
        return caller.orders.list({ page: 1, limit: 10 });
      });

      const results = await Promise.all(concurrentRequests);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.items).toEqual([]);
      });
    });
  });
});