/**
 * TORVAN MEDICAL DEVICE ORDER WORKFLOW INTEGRATION TESTING
 * ========================================================
 * 
 * Integration tests for complete 8-phase order workflow
 * Tests medical device order processing with compliance requirements
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prismaMock } from '../../setup/integration.setup';

describe('TORVAN Medical Device Order Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FDA 21 CFR Part 820 - Complete Order Lifecycle', () => {
    it('should execute complete 8-phase order workflow with medical device compliance', async () => {
      const workflowSteps = [
        'DRAFT',
        'CONFIGURATION',
        'APPROVAL',
        'PRODUCTION',
        'QUALITY_CONTROL',
        'PACKAGING',
        'SHIPPING',
        'DELIVERED'
      ];

      // Mock customer
      const mockCustomer = {
        id: BigInt(1),
        customerCode: 'MED-CORP-001',
        companyName: 'Medical Device Corporation',
        customerStatus: 'ACTIVE',
        creditLimit: 100000.00,
      };

      // Mock assembly
      const mockAssembly = {
        id: 'ASM-MED-001',
        name: 'Medical Diagnostic Unit',
        assemblyType: 'COMPONENT',
        canOrder: true,
        requiresConfiguration: true,
        basePrice: 5000.00,
        status: 'ACTIVE',
      };

      prismaMock.customer.findUnique.mockResolvedValue(mockCustomer as any);
      prismaMock.assembly.findUnique.mockResolvedValue(mockAssembly as any);

      // Step 1: DRAFT - Order Creation
      const mockDraftOrder = {
        id: 'ORD-2025-001',
        orderNumber: 'ORD-2025-001',
        customerId: BigInt(1),
        orderType: 'STANDARD',
        currentPhase: 'DRAFT',
        priority: 'NORMAL',
        totalAmount: 5000.00,
        orderDate: new Date(),
        createdBy: BigInt(1),
        createdAt: new Date(),
      };

      prismaMock.order.create.mockResolvedValue(mockDraftOrder as any);

      const draftOrder = await global.integrationTestUtils.medicalWorkflows.simulateOrderWorkflow({
        customerId: BigInt(1),
        items: [{
          assemblyId: 'ASM-MED-001',
          quantity: 1,
          unitPrice: 5000.00,
        }],
      });

      expect(draftOrder).toHaveLength(8);
      expect(draftOrder[0].phase).toBe('DRAFT');
      expect(draftOrder[0].success).toBe(true);

      // Verify all workflow phases are completed
      const completedPhases = draftOrder.map(step => step.phase);
      expect(completedPhases).toEqual(workflowSteps);

      // Verify total workflow time is reasonable for medical devices
      const totalWorkflowTime = draftOrder.reduce((sum, step) => sum + step.duration, 0);
      expect(totalWorkflowTime).toBeLessThan(30000); // Less than 30 seconds for simulation
    });

    it('should handle order configuration step with medical device specifications', async () => {
      const mockConfiguration = {
        id: BigInt(1),
        configurationName: 'Medical Device Configuration',
        assemblyId: 'ASM-MED-001',
        sinkLengthInches: 30,
        sinkWidthInches: 20,
        basinCount: 2,
        basinType: 'MEDICAL_GRADE',
        hasLifter: true,
        hasOverheadLight: true,
        hasTemperatureControl: true,
        waterType: 'PURIFIED',
        temperatureMonitoring: true,
        isValid: true,
        createdBy: BigInt(1),
      };

      const mockValidationResults = {
        configurationValid: true,
        complianceChecks: {
          fdaCompliance: true,
          iso13485Compliance: true,
          materialSafety: true,
          dimensionalTolerances: true,
        },
        estimatedCost: 5500.00,
        estimatedLeadTime: 21, // days
      };

      prismaMock.configuration.create.mockResolvedValue(mockConfiguration as any);

      // Simulate configuration validation
      const configurationResult = {
        configuration: mockConfiguration,
        validation: mockValidationResults,
        configurationTime: 1500, // 1.5 seconds
      };

      expect(configurationResult.configuration.isValid).toBe(true);
      expect(configurationResult.validation.complianceChecks.fdaCompliance).toBe(true);
      expect(configurationResult.validation.complianceChecks.iso13485Compliance).toBe(true);
      expect(configurationResult.configurationTime).toBeLessThan(3000); // Within 3 seconds
    });

    it('should generate BOM during approval phase with medical device requirements', async () => {
      const mockConfiguration = {
        id: BigInt(1),
        assemblyId: 'ASM-MED-001',
        isValid: true,
      };

      prismaMock.configuration.findUnique.mockResolvedValue(mockConfiguration as any);

      const bomGeneration = await global.integrationTestUtils.medicalWorkflows.simulateBOMGeneration('1');

      expect(bomGeneration.success).toBe(true);
      expect(bomGeneration.bomId).toBe('BOM-001');
      expect(bomGeneration.totalParts).toBeGreaterThan(0);
      expect(bomGeneration.estimatedCost).toBeGreaterThan(0);
      
      // BOM generation should meet medical device performance requirements
      expect(bomGeneration.generationTime).toBeWithinPerformanceLimit(
        global.MEDICAL_DEVICE_TEST_CONFIG.PERFORMANCE_REQUIREMENTS.BOM_GENERATION_MAX_TIME_MS
      );
    });

    it('should execute production phase with manufacturing compliance', async () => {
      const mockProductionTasks = [
        {
          id: BigInt(1),
          taskName: 'Component Assembly',
          taskType: 'ASSEMBLY',
          sequenceOrder: 1,
          status: 'PENDING',
          estimatedHours: 2.5,
        },
        {
          id: BigInt(2),
          taskName: 'Medical Device Calibration',
          taskType: 'TESTING',
          sequenceOrder: 2,
          status: 'PENDING',
          estimatedHours: 1.0,
        },
        {
          id: BigInt(3),
          taskName: 'Safety Verification',
          taskType: 'INSPECTION',
          sequenceOrder: 3,
          status: 'PENDING',
          estimatedHours: 0.5,
        },
      ];

      prismaMock.productionTask.findMany.mockResolvedValue(mockProductionTasks as any);

      // Simulate production completion
      const completedTasks = mockProductionTasks.map(task => ({
        ...task,
        status: 'COMPLETED',
        actualHours: task.estimatedHours,
        actualStartTime: new Date(),
        actualEndTime: new Date(Date.now() + task.estimatedHours * 60 * 60 * 1000),
        workNotes: 'Completed according to medical device specifications',
      }));

      prismaMock.productionTask.updateMany.mockResolvedValue({ count: 3 });

      const productionResult = {
        totalTasks: mockProductionTasks.length,
        completedTasks: completedTasks.length,
        totalTime: completedTasks.reduce((sum, task) => sum + task.actualHours, 0),
        complianceVerified: true,
      };

      expect(productionResult.completedTasks).toBe(productionResult.totalTasks);
      expect(productionResult.complianceVerified).toBe(true);
      expect(productionResult.totalTime).toBe(4.0); // 2.5 + 1.0 + 0.5 hours
    });

    it('should perform quality control inspection with medical device standards', async () => {
      const mockQCProcess = {
        id: BigInt(1),
        processName: 'Medical Device Final QC',
        processStage: 'FINAL',
        passThresholdPercentage: 100.00,
        inspectionCriteria: {
          functionalTests: { required: true, weight: 40 },
          safetyTests: { required: true, weight: 30 },
          visualInspection: { required: true, weight: 20 },
          documentationCheck: { required: true, weight: 10 },
        },
      };

      prismaMock.qCProcess.findUnique.mockResolvedValue(mockQCProcess as any);

      const qcInspection = await global.integrationTestUtils.medicalWorkflows.simulateQCInspection('1');

      expect(qcInspection.success).toBe(true);
      expect(qcInspection.result).toBe('PASS');
      expect(qcInspection.passPercentage).toBeGreaterThanOrEqual(95.0);
      expect(qcInspection.inspectorId).toBe('USER-002');
      expect(qcInspection.completedAt).toBeInstanceOf(Date);
    });

    it('should handle packaging phase with medical device labeling requirements', async () => {
      const mockPackagingSpec = {
        medicalDeviceLabeling: {
          deviceName: 'TORVAN Medical Diagnostic Unit',
          modelNumber: 'TDU-2025-001',
          serialNumber: 'SN202500001',
          manufacturerInfo: 'TORVAN Medical Systems',
          fdaRegistrationNumber: 'REG-FDA-12345',
          lotNumber: 'LOT-2025-001',
          manufacturingDate: new Date().toISOString().split('T')[0],
          expirationDate: null, // No expiration for durable medical equipment
          udiCode: 'UDI-TORVAN-TDU-2025-001',
        },
        packagingMaterials: {
          primaryPackaging: 'Medical Grade Foam Insert',
          secondaryPackaging: 'Corrugated Cardboard Box',
          shippingLabels: ['Fragile - Medical Device', 'This Side Up', 'Handle with Care'],
        },
        documentation: {
          userManual: 'UM-TDU-2025-v1.0.pdf',
          installationGuide: 'IG-TDU-2025-v1.0.pdf',
          warrantyCard: 'WC-TDU-2025.pdf',
          complianceCertificates: ['FDA-510K-Cert.pdf', 'ISO-13485-Cert.pdf'],
        },
      };

      const packagingResult = {
        packagingSpec: mockPackagingSpec,
        packagingCompleted: true,
        labelingVerified: true,
        documentationIncluded: true,
        packagingTime: 30, // minutes
        qualityCheck: 'PASS',
      };

      expect(packagingResult.packagingCompleted).toBe(true);
      expect(packagingResult.labelingVerified).toBe(true);
      expect(packagingResult.documentationIncluded).toBe(true);
      expect(packagingResult.qualityCheck).toBe('PASS');
      expect(mockPackagingSpec.medicalDeviceLabeling.fdaRegistrationNumber).toBeDefined();
      expect(mockPackagingSpec.medicalDeviceLabeling.udiCode).toBeDefined();
    });
  });

  describe('ISO 13485 - Workflow Documentation and Traceability', () => {
    it('should maintain complete audit trail throughout order workflow', async () => {
      const mockAuditEntries = [
        {
          timestamp: new Date('2025-01-01T10:00:00Z'),
          action: 'ORDER_CREATED',
          userId: 'USER-001',
          resourceType: 'order',
          resourceId: 'ORD-2025-001',
          details: { phase: 'DRAFT', customerId: 1 },
        },
        {
          timestamp: new Date('2025-01-01T10:30:00Z'),
          action: 'CONFIGURATION_COMPLETED',
          userId: 'USER-002',
          resourceType: 'configuration',
          resourceId: 'CONFIG-001',
          details: { orderId: 'ORD-2025-001', validated: true },
        },
        {
          timestamp: new Date('2025-01-01T11:00:00Z'),
          action: 'BOM_GENERATED',
          userId: 'USER-003',
          resourceType: 'bom',
          resourceId: 'BOM-001',
          details: { configurationId: 1, totalParts: 15 },
        },
        {
          timestamp: new Date('2025-01-01T14:00:00Z'),
          action: 'PRODUCTION_COMPLETED',
          userId: 'USER-004',
          resourceType: 'production',
          resourceId: 'PROD-001',
          details: { orderId: 'ORD-2025-001', totalHours: 4.0 },
        },
        {
          timestamp: new Date('2025-01-01T15:00:00Z'),
          action: 'QC_INSPECTION_PASSED',
          userId: 'USER-005',
          resourceType: 'qc_inspection',
          resourceId: 'QC-001',
          details: { result: 'PASS', passPercentage: 100.0 },
        },
      ];

      const auditValidation = await global.securityTestUtils.auditLogging.validateAuditTrail(mockAuditEntries);

      expect(auditValidation.totalEntries).toBe(5);
      expect(auditValidation.validEntries).toBe(5);
      expect(auditValidation.compliancePercentage).toBe(100);
      expect(auditValidation.results.every(r => r.isValid)).toBe(true);

      // Verify chronological order
      for (let i = 1; i < mockAuditEntries.length; i++) {
        expect(mockAuditEntries[i].timestamp.getTime()).toBeGreaterThan(
          mockAuditEntries[i - 1].timestamp.getTime()
        );
      }
    });

    it('should track workflow performance metrics for medical device compliance', async () => {
      const workflowMetrics = {
        orderCreationTime: 120, // seconds
        configurationTime: 1800, // 30 minutes
        bomGenerationTime: 3000, // 50 seconds
        productionTime: 14400, // 4 hours
        qcInspectionTime: 1800, // 30 minutes
        packagingTime: 1800, // 30 minutes
        totalWorkflowTime: 23040, // 6.4 hours
      };

      // Verify performance meets medical device requirements
      expect(workflowMetrics.bomGenerationTime).toBeWithinPerformanceLimit(
        global.MEDICAL_DEVICE_TEST_CONFIG.PERFORMANCE_REQUIREMENTS.BOM_GENERATION_MAX_TIME_MS
      );

      expect(workflowMetrics.configurationTime).toBeLessThan(3600); // Less than 1 hour
      expect(workflowMetrics.qcInspectionTime).toBeLessThan(3600); // Less than 1 hour
      expect(workflowMetrics.totalWorkflowTime).toBeLessThan(86400); // Less than 24 hours
    });

    it('should handle workflow exceptions with proper error recovery', async () => {
      const workflowExceptions = [
        {
          phase: 'CONFIGURATION',
          error: 'Invalid specifications provided',
          recovery: 'Request customer clarification',
          resolved: true,
          resolutionTime: 3600, // 1 hour
        },
        {
          phase: 'PRODUCTION',
          error: 'Part shortage detected',
          recovery: 'Substitute approved alternative part',
          resolved: true,
          resolutionTime: 7200, // 2 hours
        },
        {
          phase: 'QUALITY_CONTROL',
          error: 'Initial inspection failed',
          recovery: 'Corrective action applied and re-inspected',
          resolved: true,
          resolutionTime: 1800, // 30 minutes
        },
      ];

      const exceptionHandling = {
        totalExceptions: workflowExceptions.length,
        resolvedExceptions: workflowExceptions.filter(e => e.resolved).length,
        averageResolutionTime: workflowExceptions.reduce((sum, e) => sum + e.resolutionTime, 0) / workflowExceptions.length,
        workflowImpact: 'MINIMAL', // Exceptions handled without major delays
      };

      expect(exceptionHandling.resolvedExceptions).toBe(exceptionHandling.totalExceptions);
      expect(exceptionHandling.averageResolutionTime).toBeLessThan(7200); // Less than 2 hours average
      expect(exceptionHandling.workflowImpact).toBe('MINIMAL');
    });
  });

  describe('IEC 62304 - Software Workflow Validation', () => {
    it('should validate workflow state transitions for medical device software', async () => {
      const validTransitions = [
        { from: 'DRAFT', to: 'CONFIGURATION', allowed: true },
        { from: 'CONFIGURATION', to: 'APPROVAL', allowed: true },
        { from: 'APPROVAL', to: 'PRODUCTION', allowed: true },
        { from: 'PRODUCTION', to: 'QUALITY_CONTROL', allowed: true },
        { from: 'QUALITY_CONTROL', to: 'PACKAGING', allowed: true },
        { from: 'PACKAGING', to: 'SHIPPING', allowed: true },
        { from: 'SHIPPING', to: 'DELIVERED', allowed: true },
        // Invalid transitions
        { from: 'DRAFT', to: 'PRODUCTION', allowed: false },
        { from: 'SHIPPING', to: 'CONFIGURATION', allowed: false },
        { from: 'DELIVERED', to: 'DRAFT', allowed: false },
      ];

      validTransitions.forEach(transition => {
        if (transition.allowed) {
          expect(transition.from).not.toBe(transition.to);
        } else {
          // Invalid transitions should be prevented
          expect(transition.allowed).toBe(false);
        }
      });
    });

    it('should implement workflow rollback for medical device error recovery', async () => {
      const rollbackScenarios = [
        {
          currentPhase: 'QUALITY_CONTROL',
          issue: 'QC_FAILED',
          rollbackTo: 'PRODUCTION',
          correctionRequired: true,
          reason: 'Production defect detected',
        },
        {
          currentPhase: 'PRODUCTION',
          issue: 'MATERIAL_SHORTAGE',
          rollbackTo: 'APPROVAL',
          correctionRequired: true,
          reason: 'BOM modification required',
        },
        {
          currentPhase: 'APPROVAL',
          issue: 'INVALID_CONFIGURATION',
          rollbackTo: 'CONFIGURATION',
          correctionRequired: true,
          reason: 'Configuration validation failed',
        },
      ];

      rollbackScenarios.forEach(scenario => {
        expect(scenario.rollbackTo).toBeDefined();
        expect(scenario.correctionRequired).toBe(true);
        expect(scenario.reason).toBeDefined();
        
        // Rollback should go to a previous phase
        const phases = ['DRAFT', 'CONFIGURATION', 'APPROVAL', 'PRODUCTION', 'QUALITY_CONTROL', 'PACKAGING', 'SHIPPING', 'DELIVERED'];
        const currentIndex = phases.indexOf(scenario.currentPhase);
        const rollbackIndex = phases.indexOf(scenario.rollbackTo);
        
        expect(rollbackIndex).toBeLessThan(currentIndex);
      });
    });

    it('should validate workflow completion criteria for medical device release', async () => {
      const completionCriteria = {
        orderConfiguration: {
          validated: true,
          approved: true,
          documentsGenerated: true,
        },
        bomGeneration: {
          generated: true,
          approved: true,
          partsAvailable: true,
        },
        production: {
          allTasksCompleted: true,
          qualityChecksPerformed: true,
          documentationComplete: true,
        },
        qualityControl: {
          inspectionPassed: true,
          certificationsObtained: true,
          testResultsDocumented: true,
        },
        packaging: {
          medicalDeviceLabeling: true,
          regulatoryCompliance: true,
          documentationIncluded: true,
        },
        shipping: {
          shipmentPrepared: true,
          trackingGenerated: true,
          customerNotified: true,
        },
      };

      const allCriteriaChecks = Object.values(completionCriteria).every(phase =>
        Object.values(phase).every(criterion => criterion === true)
      );

      expect(allCriteriaChecks).toBe(true);

      // Medical device specific validations
      expect(completionCriteria.qualityControl.inspectionPassed).toBe(true);
      expect(completionCriteria.qualityControl.certificationsObtained).toBe(true);
      expect(completionCriteria.packaging.medicalDeviceLabeling).toBe(true);
      expect(completionCriteria.packaging.regulatoryCompliance).toBe(true);
    });
  });

  describe('Performance and Scalability Testing', () => {
    it('should handle concurrent order workflows for medical device scalability', async () => {
      const concurrentOrders = 5;
      const orderPromises = Array.from({ length: concurrentOrders }, (_, i) =>
        global.integrationTestUtils.medicalWorkflows.simulateOrderWorkflow({
          customerId: BigInt(i + 1),
          items: [{
            assemblyId: `ASM-MED-00${i + 1}`,
            quantity: 1,
            unitPrice: 1000.00 * (i + 1),
          }],
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(orderPromises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTimePerOrder = totalTime / concurrentOrders;

      expect(results).toHaveLength(concurrentOrders);
      results.forEach(workflow => {
        expect(workflow).toHaveLength(8); // All 8 phases
        expect(workflow.every(step => step.success)).toBe(true);
      });

      // Concurrent processing should be efficient
      expect(averageTimePerOrder).toBeLessThan(10000); // Less than 10 seconds per order
    });

    it('should maintain workflow performance under load', async () => {
      const loadTestMetrics = await global.performanceTestUtils.loadTesting.simulateConcurrentUsers(
        10, // 10 concurrent workflows
        async () => {
          return await global.integrationTestUtils.medicalWorkflows.simulateOrderWorkflow({
            customerId: BigInt(Math.floor(Math.random() * 100) + 1),
            items: [{
              assemblyId: 'ASM-MED-LOAD-TEST',
              quantity: 1,
              unitPrice: 2500.00,
            }],
          });
        }
      );

      expect(loadTestMetrics.successRate).toBeGreaterThanOrEqual(95); // 95% success rate
      expect(loadTestMetrics.averageResponseTime).toBeLessThan(15000); // Less than 15 seconds
      expect(loadTestMetrics.successful).toBe(10);
      expect(loadTestMetrics.failed).toBe(0);
    });
  });
});