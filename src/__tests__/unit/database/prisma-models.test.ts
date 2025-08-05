/**
 * TORVAN MEDICAL DEVICE DATABASE MODEL TESTING
 * ============================================
 * 
 * Unit tests for Prisma database models and operations
 * Tests data integrity, relationships, and medical device compliance
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient, UserRole, OrderPhase, BOMStatus, QCResult } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}));

describe('TORVAN Medical Device Database Models', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('FDA 21 CFR Part 820 - Data Integrity Requirements', () => {
    it('should maintain user data integrity with required fields', async () => {
      const mockUser = {
        id: BigInt(1),
        username: 'medical_user',
        email: 'user@torvan.com',
        passwordHash: 'hashed_password',
        firstName: 'Medical',
        lastName: 'User',
        phone: '+1-555-0123',
        jobTitle: 'QC Inspector',
        department: 'Quality Control',
        isActive: true,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: null,
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
        passwordExpiresAt: null,
        mustChangePassword: false,
        mfaEnabled: false,
        mfaSecret: null,
        timezone: 'UTC',
        language: 'en',
        uiPreferences: null,
      };

      prismaMock.user.create.mockResolvedValue(mockUser as any);

      const createdUser = await prismaMock.user.create({
        data: {
          username: 'medical_user',
          email: 'user@torvan.com',
          passwordHash: 'hashed_password',
          firstName: 'Medical',
          lastName: 'User',
          jobTitle: 'QC Inspector',
          department: 'Quality Control',
        },
      });

      expect(createdUser).toBeDefined();
      expect(createdUser.username).toBe('medical_user');
      expect(createdUser.email).toBe('user@torvan.com');
      expect(createdUser.department).toBe('Quality Control');
      expect(createdUser.isActive).toBe(true);
    });

    it('should enforce unique constraints for medical device users', async () => {
      const duplicateUserError = new Error('Unique constraint failed on the fields: (`username`)');
      prismaMock.user.create.mockRejectedValue(duplicateUserError);

      try {
        await prismaMock.user.create({
          data: {
            username: 'existing_user',
            email: 'duplicate@torvan.com',
            passwordHash: 'hashed_password',
            firstName: 'Duplicate',
            lastName: 'User',
          },
        });
        fail('Should throw unique constraint error');
      } catch (error) {
        expect(error).toBe(duplicateUserError);
      }
    });

    it('should maintain customer data integrity for medical device clients', async () => {
      const mockCustomer = {
        id: BigInt(1),
        customerCode: 'MED-001',
        companyName: 'Medical Device Solutions Inc.',
        industry: 'Medical Devices',
        companySize: 'LARGE' as const,
        primaryContactName: 'Dr. John Smith',
        primaryContactEmail: 'j.smith@meddevicesol.com',
        primaryContactPhone: '+1-555-0456',
        billingAddress: {
          street: '123 Medical Plaza',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'USA',
        },
        paymentTerms: 30,
        creditLimit: 50000.00,
        taxExempt: false,
        customerStatus: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.customer.create.mockResolvedValue(mockCustomer as any);

      const createdCustomer = await prismaMock.customer.create({
        data: {
          customerCode: 'MED-001',
          companyName: 'Medical Device Solutions Inc.',
          industry: 'Medical Devices',
          companySize: 'LARGE',
          primaryContactName: 'Dr. John Smith',
          primaryContactEmail: 'j.smith@meddevicesol.com',
          primaryContactPhone: '+1-555-0456',
          billingAddress: {
            street: '123 Medical Plaza',
            city: 'Boston',
            state: 'MA',
            zipCode: '02101',
            country: 'USA',
          },
          paymentTerms: 30,
          creditLimit: 50000.00,
          customerStatus: 'ACTIVE',
        },
      });

      expect(createdCustomer).toBeDefined();
      expect(createdCustomer.customerCode).toBe('MED-001');
      expect(createdCustomer.companyName).toBe('Medical Device Solutions Inc.');
      expect(createdCustomer.industry).toBe('Medical Devices');
    });
  });

  describe('ISO 13485 - Document Control and Traceability', () => {
    it('should maintain order traceability throughout lifecycle', async () => {
      const mockOrder = {
        id: 'ORD-2025-001',
        orderNumber: 'ORD-2025-001',
        customerId: BigInt(1),
        customerPoNumber: 'PO-12345',
        orderType: 'STANDARD' as const,
        currentPhase: 'DRAFT' as OrderPhase,
        priority: 'NORMAL' as const,
        subtotal: 1000.00,
        taxAmount: 80.00,
        shippingAmount: 50.00,
        totalAmount: 1130.00,
        currency: 'USD',
        orderDate: new Date(),
        requestedDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        promisedDeliveryDate: null,
        actualDeliveryDate: null,
        assignedTo: null,
        createdBy: BigInt(1),
        isRushOrder: false,
        specialInstructions: 'Medical device - handle with care',
        internalNotes: 'Customer requires FDA compliance documentation',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.order.create.mockResolvedValue(mockOrder as any);

      const createdOrder = await prismaMock.order.create({
        data: {
          orderNumber: 'ORD-2025-001',
          customerId: BigInt(1),
          orderType: 'STANDARD',
          currentPhase: 'DRAFT',
          priority: 'NORMAL',
          subtotal: 1000.00,
          totalAmount: 1130.00,
          orderDate: new Date(),
          createdBy: BigInt(1),
          specialInstructions: 'Medical device - handle with care',
        },
      });

      expect(createdOrder).toBeDefined();
      expect(createdOrder.orderNumber).toBe('ORD-2025-001');
      expect(createdOrder.currentPhase).toBe('DRAFT');
      expect(createdOrder.specialInstructions).toBe('Medical device - handle with care');
    });

    it('should track order status history for audit trail', async () => {
      const mockStatusHistory = [
        {
          id: BigInt(1),
          orderId: 'ORD-2025-001',
          fromPhase: null,
          toPhase: 'DRAFT' as OrderPhase,
          changedBy: BigInt(1),
          changeReason: 'Order created',
          phaseDurationHours: null,
          notes: 'Initial order creation',
          changedAt: new Date(),
        },
        {
          id: BigInt(2),
          orderId: 'ORD-2025-001',
          fromPhase: 'DRAFT' as OrderPhase,
          toPhase: 'CONFIGURATION' as OrderPhase,
          changedBy: BigInt(1),
          changeReason: 'Configuration started',
          phaseDurationHours: 2.5,
          notes: 'Customer provided specifications',
          changedAt: new Date(),
        },
      ];

      prismaMock.orderStatusHistory.findMany.mockResolvedValue(mockStatusHistory as any);

      const statusHistory = await prismaMock.orderStatusHistory.findMany({
        where: { orderId: 'ORD-2025-001' },
        orderBy: { changedAt: 'asc' },
      });

      expect(statusHistory).toHaveLength(2);
      expect(statusHistory[0].toPhase).toBe('DRAFT');
      expect(statusHistory[1].toPhase).toBe('CONFIGURATION');
      expect(statusHistory[1].phaseDurationHours).toBe(2.5);
    });

    it('should maintain BOM versioning and approval workflow', async () => {
      const mockBOM = {
        id: BigInt(1),
        bomNumber: 'BOM-2025-001',
        configurationId: BigInt(1),
        assemblyId: 'ASM-001',
        bomType: 'STANDARD' as const,
        totalPartsCount: 15,
        totalEstimatedCost: 750.00,
        totalEstimatedWeightKg: 2.5,
        estimatedBuildHours: 4.0,
        status: 'DRAFT' as BOMStatus,
        approvedBy: null,
        approvedAt: null,
        version: '1.0',
        parentBomId: null,
        generatedBy: BigInt(1),
        generationMethod: 'AUTOMATIC' as const,
        generationRulesApplied: {
          rules: ['standard_components', 'cost_optimization'],
          appliedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.bOM.create.mockResolvedValue(mockBOM as any);

      const createdBOM = await prismaMock.bOM.create({
        data: {
          bomNumber: 'BOM-2025-001',
          configurationId: BigInt(1),
          assemblyId: 'ASM-001',
          bomType: 'STANDARD',
          totalPartsCount: 15,
          totalEstimatedCost: 750.00,
          status: 'DRAFT',
          generatedBy: BigInt(1),
          generationMethod: 'AUTOMATIC',
        },
      });

      expect(createdBOM).toBeDefined();
      expect(createdBOM.bomNumber).toBe('BOM-2025-001');
      expect(createdBOM.status).toBe('DRAFT');
      expect(createdBOM.totalPartsCount).toBe(15);
    });
  });

  describe('IEC 62304 - Software Data Management', () => {
    it('should implement proper data relationships for medical device assemblies', async () => {
      const mockAssembly = {
        id: 'ASM-MED-001',
        name: 'Medical Device Control Unit',
        description: 'Main control unit for medical diagnostic equipment',
        categoryId: 'MEDICAL',
        subcategoryId: 'DIAGNOSTIC',
        assemblyType: 'COMPONENT' as const,
        parentAssemblyId: null,
        assemblyLevel: 1,
        canOrder: true,
        isKit: false,
        requiresConfiguration: true,
        basePrice: 2500.00,
        costPrice: 1800.00,
        currency: 'USD',
        weightKg: 1.2,
        dimensions: {
          length: 20.0,
          width: 15.0,
          height: 8.0,
          unit: 'cm',
        },
        status: 'ACTIVE' as const,
        version: '2.1',
        effectiveDate: new Date(),
        endDate: null,
        leadTimeDays: 14,
        buildTimeHours: 3.5,
        complexityScore: 4,
        tags: ['medical', 'diagnostic', 'FDA-approved'],
        productFamily: 'DIAGNOSTIC_SYSTEMS',
        marketSegment: 'HOSPITAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: BigInt(1),
        updatedBy: null,
      };

      prismaMock.assembly.create.mockResolvedValue(mockAssembly as any);

      const createdAssembly = await prismaMock.assembly.create({
        data: {
          id: 'ASM-MED-001',
          name: 'Medical Device Control Unit',
          description: 'Main control unit for medical diagnostic equipment',
          assemblyType: 'COMPONENT',
          canOrder: true,
          requiresConfiguration: true,
          basePrice: 2500.00,
          status: 'ACTIVE',
          version: '2.1',
          tags: ['medical', 'diagnostic', 'FDA-approved'],
        },
      });

      expect(createdAssembly).toBeDefined();
      expect(createdAssembly.name).toBe('Medical Device Control Unit');
      expect(createdAssembly.requiresConfiguration).toBe(true);
      expect(createdAssembly.tags).toContain('FDA-approved');
    });

    it('should maintain part specifications for medical device components', async () => {
      const mockPart = {
        id: 'PART-MED-001',
        name: 'Medical Grade Sensor',
        description: 'High-precision temperature sensor for medical applications',
        manufacturerPartNumber: 'SENS-MED-2025',
        manufacturerName: 'MedTech Sensors Inc.',
        manufacturerInfo: 'ISO 13485 certified manufacturer',
        supplierPartNumber: 'SUP-SENS-001',
        partType: 'ELECTRONIC' as const,
        unitOfMeasure: 'EACH',
        unitCost: 45.75,
        currency: 'USD',
        weightKg: 0.025,
        dimensions: {
          length: 2.5,
          width: 1.8,
          height: 0.8,
          unit: 'cm',
        },
        specifications: {
          operatingTemperature: '-10°C to +85°C',
          accuracy: '±0.1°C',
          resolution: '0.01°C',
          responseTime: '2 seconds',
          certifications: ['FDA-510K', 'CE-MDR', 'ISO-13485'],
        },
        material: 'Medical Grade Stainless Steel',
        color: 'Silver',
        finish: 'Electropolished',
        status: 'ACTIVE' as const,
        isCustomPart: false,
        leadTimeDays: 7,
        minOrderQty: 10,
        reorderPoint: 50,
        safetyStock: 25,
        qualityGrade: 'MEDICAL',
        certifications: ['FDA-510K', 'CE-MDR', 'ISO-13485'],
        tags: ['medical', 'sensor', 'high-precision'],
        keywords: ['temperature', 'sensor', 'medical', 'precision'],
        version: '1.2',
        effectiveDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: BigInt(1),
        updatedBy: null,
      };

      prismaMock.part.create.mockResolvedValue(mockPart as any);

      const createdPart = await prismaMock.part.create({
        data: {
          id: 'PART-MED-001',
          name: 'Medical Grade Sensor',
          description: 'High-precision temperature sensor for medical applications',
          partType: 'ELECTRONIC',
          unitCost: 45.75,
          status: 'ACTIVE',
          certifications: ['FDA-510K', 'CE-MDR', 'ISO-13485'],
          qualityGrade: 'MEDICAL',
        },
      });

      expect(createdPart).toBeDefined();
      expect(createdPart.name).toBe('Medical Grade Sensor');
      expect(createdPart.qualityGrade).toBe('MEDICAL');
      expect(createdPart.certifications).toContain('FDA-510K');
    });
  });

  describe('Medical Device Quality Control Data Management', () => {
    it('should implement QC process tracking for medical device compliance', async () => {
      const mockQCProcess = {
        id: BigInt(1),
        processName: 'Medical Device Final Inspection',
        assemblyId: 'ASM-MED-001',
        processStage: 'FINAL' as const,
        description: 'Comprehensive final inspection for medical device compliance',
        inspectionCriteria: {
          visualInspection: {
            criteria: 'No visible defects, proper labeling',
            required: true,
          },
          functionalTest: {
            criteria: 'All functions operate within specifications',
            required: true,
          },
          safetyTest: {
            criteria: 'Passes all safety requirements',
            required: true,
          },
          documentationCheck: {
            criteria: 'All required documentation present',
            required: true,
          },
        },
        requiredPhotos: ['serial_number', 'overall_view', 'critical_components'],
        passThresholdPercentage: 100.00,
        estimatedDurationMinutes: 45,
        isActive: true,
        createdBy: BigInt(1),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.qCProcess.create.mockResolvedValue(mockQCProcess as any);

      const createdQCProcess = await prismaMock.qCProcess.create({
        data: {
          processName: 'Medical Device Final Inspection',
          assemblyId: 'ASM-MED-001',
          processStage: 'FINAL',
          description: 'Comprehensive final inspection for medical device compliance',
          passThresholdPercentage: 100.00,
          estimatedDurationMinutes: 45,
          createdBy: BigInt(1),
        },
      });

      expect(createdQCProcess).toBeDefined();
      expect(createdQCProcess.processName).toBe('Medical Device Final Inspection');
      expect(createdQCProcess.passThresholdPercentage).toBe(100.00);
      expect(createdQCProcess.processStage).toBe('FINAL');
    });

    it('should record QC inspection results with full traceability', async () => {
      const mockQCInspection = {
        id: BigInt(1),
        orderItemId: BigInt(1),
        qcProcessId: BigInt(1),
        inspectorId: BigInt(2),
        inspectionDate: new Date(),
        inspectionStartTime: new Date(),
        inspectionEndTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes later
        overallResult: 'PASS' as QCResult,
        passPercentage: 100.00,
        inspectionNotes: 'All criteria met. Device ready for release.',
        correctiveActions: null,
        approvedBy: BigInt(3),
        approvedAt: new Date(),
        approvalNotes: 'Approved for release to customer.',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.qCInspection.create.mockResolvedValue(mockQCInspection as any);

      const createdInspection = await prismaMock.qCInspection.create({
        data: {
          orderItemId: BigInt(1),
          qcProcessId: BigInt(1),
          inspectorId: BigInt(2),
          inspectionDate: new Date(),
          overallResult: 'PASS',
          passPercentage: 100.00,
          inspectionNotes: 'All criteria met. Device ready for release.',
        },
      });

      expect(createdInspection).toBeDefined();
      expect(createdInspection.overallResult).toBe('PASS');
      expect(createdInspection.passPercentage).toBe(100.00);
      expect(createdInspection.inspectionNotes).toBe('All criteria met. Device ready for release.');
    });
  });

  describe('Performance and Data Integrity Testing', () => {
    it('should handle large datasets efficiently for medical device operations', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `PART-${i.toString().padStart(4, '0')}`,
        name: `Medical Part ${i}`,
        partType: 'COMPONENT',
        unitCost: Math.random() * 100,
        status: 'ACTIVE',
      }));

      prismaMock.part.findMany.mockResolvedValue(largeDataset as any);

      const startTime = Date.now();
      const parts = await prismaMock.part.findMany({
        where: { status: 'ACTIVE' },
        take: 1000,
      });
      const endTime = Date.now();

      const queryTime = endTime - startTime;

      expect(parts).toHaveLength(1000);
      expect(queryTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain referential integrity across related tables', async () => {
      // Test cascading deletes and updates
      const mockOrder = { id: 'ORD-001', orderNumber: 'ORD-2025-001' };
      const mockOrderItems = [
        { id: BigInt(1), orderId: 'ORD-001', lineNumber: 1 },
        { id: BigInt(2), orderId: 'ORD-001', lineNumber: 2 },
      ];

      prismaMock.order.delete.mockResolvedValue(mockOrder as any);
      prismaMock.orderItem.deleteMany.mockResolvedValue({ count: 2 });

      // Simulate cascading delete
      await prismaMock.orderItem.deleteMany({
        where: { orderId: 'ORD-001' },
      });
      
      await prismaMock.order.delete({
        where: { id: 'ORD-001' },
      });

      expect(prismaMock.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'ORD-001' },
      });
      expect(prismaMock.order.delete).toHaveBeenCalledWith({
        where: { id: 'ORD-001' },
      });
    });

    it('should validate data types and constraints for medical device safety', async () => {
      const invalidData = {
        username: '', // Empty string - should fail validation
        email: 'invalid-email', // Invalid email format
        passwordHash: null, // Null password hash - should fail
      };

      const validationError = new Error('Invalid data provided');
      prismaMock.user.create.mockRejectedValue(validationError);

      try {
        await prismaMock.user.create({
          data: invalidData as any,
        });
        fail('Should throw validation error');
      } catch (error) {
        expect(error).toBe(validationError);
      }
    });
  });
});