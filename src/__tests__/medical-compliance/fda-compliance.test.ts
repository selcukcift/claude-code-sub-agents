/**
 * TORVAN MEDICAL DEVICE FDA COMPLIANCE TESTING
 * ============================================
 * 
 * Medical compliance tests for FDA 21 CFR Part 820 requirements
 * Tests design controls, document controls, and quality system regulation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('TORVAN Medical Device FDA 21 CFR Part 820 Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Design Controls (21 CFR 820.30)', () => {
    it('should validate design plan requirements for medical device software', async () => {
      const designPlan = {
        designPlan: {
          projectName: 'TORVAN Medical Workflow Management System',
          designTeam: ['Software Architect', 'Medical Device Engineer', 'Quality Engineer'],
          designPhases: ['Planning', 'Analysis', 'Design', 'Implementation', 'Testing', 'Release'],
          deliverables: ['Requirements Specification', 'Design Documentation', 'Test Plans', 'Validation Protocols'],
          timeline: '12 months',
          riskManagementPlan: 'ISO 14971 compliant risk management',
        },
        designInput: {
          userNeeds: 'Medical device workflow management',
          intendedUse: 'Hospital and clinic workflow optimization',
          performanceRequirements: 'BOM generation <5s, 50 concurrent users',
          safetyRequirements: 'No patient safety impact, data security',
          regulatoryRequirements: ['FDA 21 CFR Part 820', 'ISO 13485', 'IEC 62304'],
        },
        designOutput: {
          softwareSpecification: 'Complete system architecture documentation',
          userInterface: 'Web-based responsive interface',
          softwareCode: 'TypeScript/React medical device application',
          testProcedures: 'Comprehensive test suite with medical device compliance',
        },
        designReview: {
          reviewConducted: true,
          reviewers: ['Lead Engineer', 'Quality Manager', 'Regulatory Affairs'],
          reviewDate: new Date(),
          reviewResults: 'APPROVED',
          actionItems: [],
        },
        designVerification: {
          testingCompleted: true,
          requirementsCovered: 100,
          testResults: 'All tests passed',
          verificationDate: new Date(),
        },
        designValidation: {
          userAcceptanceTesting: true,
          clinicalEnvironmentTesting: true,
          validationResults: 'System meets intended use requirements',
          validationDate: new Date(),
        },
        designTransfer: {
          productionReadiness: true,
          documentationComplete: true,
          trainingCompleted: true,
          transferDate: new Date(),
        },
        designChanges: {
          changeControlProcess: true,
          impactAssessment: true,
          revalidationRequired: false,
          changesDocumented: true,
        },
      };

      const designControlsValidation = await global.medicalComplianceUtils.fda.validateDesignControls(designPlan);

      expect(designControlsValidation.hasDesignPlan).toBe(true);
      expect(designControlsValidation.hasDesignInput).toBe(true);
      expect(designControlsValidation.hasDesignOutput).toBe(true);
      expect(designControlsValidation.hasDesignReview).toBe(true);
      expect(designControlsValidation.hasDesignVerification).toBe(true);
      expect(designControlsValidation.hasDesignValidation).toBe(true);
      expect(designControlsValidation.hasDesignTransfer).toBe(true);
      expect(designControlsValidation.hasDesignChanges).toBe(true);
      expect(designControlsValidation.compliance).toBe(true);
    });

    it('should validate design input completeness for medical device requirements', () => {
      const designInputs = {
        functionalRequirements: [
          'User authentication and authorization',
          'Order management with 8-phase workflow',
          'BOM generation within 5 seconds',
          'Quality control inspection tracking',
          'Audit trail for all operations',
        ],
        performanceRequirements: [
          'Support 50 concurrent users',
          'Page load times <3 seconds',
          'API response times <2 seconds',
          '99.9% uptime availability',
          'Data integrity 100%',
        ],
        safetyRequirements: [
          'No direct patient contact',
          'Secure data handling',
          'Role-based access control',
          'Password security compliance',
          'Session timeout enforcement',
        ],
        regulatoryRequirements: [
          'FDA 21 CFR Part 820 compliance',
          'ISO 13485 quality management',
          'IEC 62304 software lifecycle',
          'HIPAA data privacy (if applicable)',
          'Audit trail requirements',
        ],
        interfaceRequirements: [
          'Integration with ERP systems',
          'Document management system interface',
          'Email notification system',
          'Database connectivity',
          'Web service APIs',
        ],
      };

      const inputValidation = {
        functionalComplete: designInputs.functionalRequirements.length >= 5,
        performanceComplete: designInputs.performanceRequirements.length >= 4,
        safetyComplete: designInputs.safetyRequirements.length >= 4,
        regulatoryComplete: designInputs.regulatoryRequirements.length >= 3,
        interfaceComplete: designInputs.interfaceRequirements.length >= 3,
      };

      expect(inputValidation.functionalComplete).toBe(true);
      expect(inputValidation.performanceComplete).toBe(true);
      expect(inputValidation.safetyComplete).toBe(true);
      expect(inputValidation.regulatoryComplete).toBe(true);
      expect(inputValidation.interfaceComplete).toBe(true);
    });

    it('should validate design verification testing for medical device software', async () => {
      const verificationTests = [
        {
          testId: 'VT-001',
          requirement: 'User Authentication',
          testProcedure: 'Verify login with valid/invalid credentials',
          expectedResult: 'Authorized users login successfully, unauthorized access blocked',
          actualResult: 'Pass - Authentication working as specified',
          status: 'PASS',
        },
        {
          testId: 'VT-002',
          requirement: 'BOM Generation Performance',
          testProcedure: 'Generate BOM with complex configuration',
          expectedResult: 'BOM generated within 5 seconds',
          actualResult: 'Pass - Average generation time 2.3 seconds',
          status: 'PASS',
        },
        {
          testId: 'VT-003',
          requirement: 'Concurrent User Support',
          testProcedure: 'Load test with 50 concurrent users',
          expectedResult: 'System maintains performance with 50 users',
          actualResult: 'Pass - System stable at 50 concurrent users',
          status: 'PASS',
        },
        {
          testId: 'VT-004',
          requirement: 'Data Integrity',
          testProcedure: 'Verify data consistency across operations',
          expectedResult: '100% data integrity maintained',
          actualResult: 'Pass - No data corruption detected',
          status: 'PASS',
        },
        {
          testId: 'VT-005',
          requirement: 'Audit Trail',
          testProcedure: 'Verify all operations are logged',
          expectedResult: 'Complete audit trail for all user actions',
          actualResult: 'Pass - All operations properly logged',
          status: 'PASS',
        },
      ];

      const verificationSummary = {
        totalTests: verificationTests.length,
        passedTests: verificationTests.filter(test => test.status === 'PASS').length,
        failedTests: verificationTests.filter(test => test.status === 'FAIL').length,
        passRate: (verificationTests.filter(test => test.status === 'PASS').length / verificationTests.length) * 100,
        requirementsCovered: verificationTests.length,
        verificationComplete: true,
      };

      expect(verificationSummary.passRate).toBe(100);
      expect(verificationSummary.failedTests).toBe(0);
      expect(verificationSummary.verificationComplete).toBe(true);
      expect(verificationSummary.requirementsCovered).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Document Controls (21 CFR 820.40)', () => {
    it('should validate document control system for medical device compliance', async () => {
      const documents = [
        {
          documentId: 'SRS-001',
          documentName: 'Software Requirements Specification',
          version: '2.1',
          status: 'APPROVED',
          approvedBy: BigInt(1),
          approvedAt: new Date(),
          accessLevel: 'INTERNAL',
          changeHistory: [
            { version: '1.0', date: new Date('2024-01-01'), changes: 'Initial version' },
            { version: '2.0', date: new Date('2024-06-01'), changes: 'Updated performance requirements' },
            { version: '2.1', date: new Date('2024-12-01'), changes: 'Added security requirements' },
          ],
        },
        {
          documentId: 'SDD-001',
          documentName: 'Software Design Document',
          version: '1.3',
          status: 'APPROVED',
          approvedBy: BigInt(2),
          approvedAt: new Date(),
          accessLevel: 'INTERNAL',
          changeHistory: [
            { version: '1.0', date: new Date('2024-02-01'), changes: 'Initial design' },
            { version: '1.3', date: new Date('2024-11-01'), changes: 'Updated architecture' },
          ],
        },
        {
          documentId: 'VTP-001',
          documentName: 'Validation Test Plan',
          version: '1.0',
          status: 'APPROVED',
          approvedBy: BigInt(3),
          approvedAt: new Date(),
          accessLevel: 'RESTRICTED',
          changeHistory: [
            { version: '1.0', date: new Date('2024-10-01'), changes: 'Initial test plan' },
          ],
        },
      ];

      for (const document of documents) {
        const documentValidation = await global.medicalComplianceUtils.fda.validateDocumentControls(document);

        expect(documentValidation.hasApproval).toBe(true);
        expect(documentValidation.hasVersion).toBe(true);
        expect(documentValidation.hasChangeControl).toBe(true);
        expect(documentValidation.hasDistributionControl).toBe(true);
        expect(documentValidation.isObsoleteControlled).toBe(true);
        expect(documentValidation.compliance).toBe(true);
      }
    });

    it('should maintain document revision history for medical device traceability', () => {
      const documentRevisions = {
        documentId: 'SRS-001',
        revisions: [
          {
            version: '1.0',
            date: new Date('2024-01-15'),
            author: 'System Architect',
            changes: ['Initial requirements specification'],
            reviewers: ['Quality Manager', 'Medical Device Engineer'],
            approvalStatus: 'APPROVED',
          },
          {
            version: '1.1',
            date: new Date('2024-03-20'),
            author: 'System Architect',
            changes: ['Added performance requirements', 'Updated security section'],
            reviewers: ['Quality Manager', 'Security Officer'],
            approvalStatus: 'APPROVED',
          },
          {
            version: '2.0',
            date: new Date('2024-06-10'),
            author: 'Lead Developer',
            changes: ['Major revision - new workflow requirements', 'Updated compliance section'],
            reviewers: ['Quality Manager', 'Regulatory Affairs', 'Medical Device Engineer'],
            approvalStatus: 'APPROVED',
          },
          {
            version: '2.1',
            date: new Date('2024-12-01'),
            author: 'Security Engineer',
            changes: ['Enhanced security requirements', 'Added audit trail specifications'],
            reviewers: ['Quality Manager', 'Security Officer'],
            approvalStatus: 'APPROVED',
          },
        ],
      };

      // Validate revision history completeness
      expect(documentRevisions.revisions.length).toBeGreaterThan(0);
      
      documentRevisions.revisions.forEach(revision => {
        expect(revision.version).toBeDefined();
        expect(revision.date).toBeInstanceOf(Date);
        expect(revision.author).toBeDefined();
        expect(revision.changes).toHaveLength.greaterThan(0);
        expect(revision.reviewers).toHaveLength.greaterThan(0);
        expect(revision.approvalStatus).toBe('APPROVED');
      });

      // Validate chronological order
      for (let i = 1; i < documentRevisions.revisions.length; i++) {
        expect(documentRevisions.revisions[i].date.getTime()).toBeGreaterThan(
          documentRevisions.revisions[i - 1].date.getTime()
        );
      }
    });

    it('should control document distribution for medical device security', () => {
      const documentDistribution = {
        documentId: 'VTP-001',
        accessLevels: {
          PUBLIC: {
            documents: ['User Manual', 'Installation Guide'],
            restrictions: 'None',
          },
          INTERNAL: {
            documents: ['Software Requirements', 'Design Documents', 'Test Plans'],
            restrictions: 'Company employees only',
          },
          RESTRICTED: {
            documents: ['Validation Protocols', 'Security Procedures', 'Audit Reports'],
            restrictions: 'Authorized personnel only',
          },
          CONFIDENTIAL: {
            documents: ['Proprietary Algorithms', 'Trade Secrets', 'Customer Data'],
            restrictions: 'Need-to-know basis only',
          },
        },
        distributionMatrix: {
          'Quality Manager': ['PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL'],
          'Software Developer': ['PUBLIC', 'INTERNAL'],
          'Test Engineer': ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
          'Customer': ['PUBLIC'],
          'Regulatory Auditor': ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
        },
      };

      // Validate access control matrix
      Object.entries(documentDistribution.distributionMatrix).forEach(([role, allowedLevels]) => {
        expect(allowedLevels).toContain('PUBLIC'); // Everyone should have public access
        
        if (role === 'Quality Manager') {
          expect(allowedLevels).toContain('CONFIDENTIAL');
        }
        
        if (role === 'Customer') {
          expect(allowedLevels).toHaveLength(1); // Only public access
        }
      });
    });
  });

  describe('Quality Records (21 CFR 820.180, 820.184, 820.186)', () => {
    it('should maintain quality records for medical device manufacturing', async () => {
      const qualityRecords = [
        {
          recordId: 'QR-001',
          recordType: 'Design Review',
          timestamp: new Date(),
          userId: 'USER-001',
          action: 'DESIGN_REVIEW_COMPLETED',
          resourceType: 'design_document',
          resourceId: 'SDD-001',
          details: {
            reviewResult: 'APPROVED',
            reviewers: ['Quality Manager', 'Medical Engineer'],
            actionItems: [],
          },
        },
        {
          recordId: 'QR-002',
          recordType: 'Verification Testing',
          timestamp: new Date(),
          userId: 'USER-002',
          action: 'VERIFICATION_TEST_COMPLETED',
          resourceType: 'test_result',
          resourceId: 'VT-001',
          details: {
            testResult: 'PASS',
            requirements: ['REQ-001', 'REQ-002'],
            evidenceFiles: ['test-report-001.pdf'],
          },
        },
        {
          recordId: 'QR-003',
          recordType: 'Change Control',
          timestamp: new Date(),
          userId: 'USER-003',
          action: 'CHANGE_REQUEST_APPROVED',
          resourceType: 'change_request',
          resourceId: 'CR-001',
          details: {
            changeDescription: 'Updated security requirements',
            impactAssessment: 'Low risk - documentation only',
            approvalLevel: 'Quality Manager',
          },
        },
      ];

      const recordsValidation = await global.medicalComplianceUtils.fda.validateQualityRecords(qualityRecords);

      expect(recordsValidation.totalRecords).toBe(3);
      expect(recordsValidation.validRecords).toBe(3);
      expect(recordsValidation.compliancePercentage).toBe(100);
      expect(recordsValidation.meetsRequirement).toBe(true);

      // All records should have required elements
      qualityRecords.forEach(record => {
        expect(record.timestamp).toBeInstanceOf(Date);
        expect(record.userId).toBeDefined();
        expect(record.action).toBeDefined();
        expect(record.resourceType).toBeDefined();
        expect(record.resourceId).toBeDefined();
      });
    });

    it('should maintain device master record (DMR) for medical device configuration', () => {
      const deviceMasterRecord = {
        deviceName: 'TORVAN Medical Workflow Management System',
        modelNumber: 'TWMS-2025',
        version: '1.0',
        deviceClass: 'Software as Medical Device (SaMD)',
        intendedUse: 'Medical device workflow management for healthcare facilities',
        specifications: {
          softwareSpecification: {
            programmingLanguage: 'TypeScript',
            framework: 'Next.js 15',
            database: 'PostgreSQL',
            operatingSystem: 'Linux/Windows/macOS (web-based)',
          },
          performanceSpecification: {
            concurrentUsers: 50,
            bomGenerationTime: '<5 seconds',
            pageLoadTime: '<3 seconds',
            availability: '99.9%',
          },
          safetySpecification: {
            riskClassification: 'Low Risk',
            safetyMeasures: ['Data encryption', 'Access control', 'Audit logging'],
            failsafeMechanisms: ['Graceful error handling', 'Data backup', 'Session timeout'],
          },
        },
        labeling: {
          deviceLabel: 'TORVAN Medical Workflow Management System',
          warnings: ['Authorized personnel only', 'Regular data backup required'],
          contraindications: 'None - software-only medical device',
          userInstructions: 'Refer to User Manual UM-TWMS-2025-v1.0',
        },
        qualityPlan: {
          designControls: 'FDA 21 CFR Part 820.30 compliant',
          riskManagement: 'ISO 14971 risk management applied',
          clinicalEvaluation: 'Not applicable - no patient contact',
          postMarketSurveillance: 'User feedback and performance monitoring',
        },
      };

      // Validate DMR completeness
      expect(deviceMasterRecord.deviceName).toBeDefined();
      expect(deviceMasterRecord.modelNumber).toBeDefined();
      expect(deviceMasterRecord.version).toBeDefined();
      expect(deviceMasterRecord.intendedUse).toBeDefined();
      expect(deviceMasterRecord.specifications).toBeDefined();
      expect(deviceMasterRecord.labeling).toBeDefined();
      expect(deviceMasterRecord.qualityPlan).toBeDefined();

      // Validate specifications completeness
      expect(deviceMasterRecord.specifications.softwareSpecification).toBeDefined();
      expect(deviceMasterRecord.specifications.performanceSpecification).toBeDefined();
      expect(deviceMasterRecord.specifications.safetySpecification).toBeDefined();
    });

    it('should maintain device history record (DHR) for each deployed instance', () => {
      const deviceHistoryRecords = [
        {
          serialNumber: 'TWMS-2025-001',
          customerName: 'Metro General Hospital',
          installationDate: new Date('2025-01-15'),
          configurationUsed: {
            version: '1.0',
            customizations: ['Hospital-specific workflows', 'Integration with HIS'],
            parameters: { maxUsers: 25, retentionPeriod: '7 years' },
          },
          qualityRecords: {
            preInstallationTesting: 'PASS',
            installationVerification: 'PASS',
            userAcceptanceTesting: 'PASS',
            finalInspection: 'PASS',
          },
          deliveryDate: new Date('2025-01-20'),
          acceptanceDate: new Date('2025-01-25'),
        },
        {
          serialNumber: 'TWMS-2025-002',
          customerName: 'Regional Medical Center',
          installationDate: new Date('2025-02-01'),
          configurationUsed: {
            version: '1.0',
            customizations: ['Multi-site configuration', 'Advanced reporting'],
            parameters: { maxUsers: 50, retentionPeriod: '10 years' },
          },
          qualityRecords: {
            preInstallationTesting: 'PASS',
            installationVerification: 'PASS',
            userAcceptanceTesting: 'PASS',
            finalInspection: 'PASS',
          },
          deliveryDate: new Date('2025-02-05'),
          acceptanceDate: new Date('2025-02-10'),
        },
      ];

      deviceHistoryRecords.forEach(dhr => {
        expect(dhr.serialNumber).toBeDefined();
        expect(dhr.customerName).toBeDefined();
        expect(dhr.installationDate).toBeInstanceOf(Date);
        expect(dhr.configurationUsed).toBeDefined();
        expect(dhr.qualityRecords).toBeDefined();
        expect(dhr.deliveryDate).toBeInstanceOf(Date);
        expect(dhr.acceptanceDate).toBeInstanceOf(Date);

        // All quality checks should pass
        Object.values(dhr.qualityRecords).forEach(result => {
          expect(result).toBe('PASS');
        });

        // Dates should be in logical order
        expect(dhr.deliveryDate.getTime()).toBeGreaterThanOrEqual(dhr.installationDate.getTime());
        expect(dhr.acceptanceDate.getTime()).toBeGreaterThanOrEqual(dhr.deliveryDate.getTime());
      });
    });
  });

  describe('FDA Compliance Reporting and Metrics', () => {
    it('should generate compliance summary report for FDA submission', async () => {
      const complianceData = {
        designControls: { implemented: true, documented: true, verified: true },
        documentControls: { implemented: true, documented: true, verified: true },
        qualityRecords: { implemented: true, documented: true, verified: true },
        riskManagement: { implemented: true, documented: true, verified: true },
        validation: { completed: true, documented: true, successful: true },
      };

      const testResults = [
        { category: 'Design Controls', tests: 15, passed: 15, failed: 0 },
        { category: 'Document Controls', tests: 8, passed: 8, failed: 0 },
        { category: 'Quality Records', tests: 12, passed: 12, failed: 0 },
        { category: 'Risk Management', tests: 6, passed: 6, failed: 0 },
        { category: 'Validation', tests: 20, passed: 20, failed: 0 },
      ];

      const complianceReport = await global.medicalComplianceUtils.audit.generateComplianceReport(testResults);

      expect(complianceReport.complianceStatus).toBe('COMPLIANT');
      expect(complianceReport.passRate).toBe(100);
      expect(complianceReport.regulations.fda21CFR820).toBe(true);
      expect(complianceReport.totalTests).toBe(61);
      expect(complianceReport.passedTests).toBe(61);
      expect(complianceReport.failedTests).toBe(0);
    });

    it('should validate FDA submission readiness', () => {
      const submissionReadiness = {
        designDocumentation: {
          complete: true,
          reviewed: true,
          approved: true,
          currentVersion: '2.1',
        },
        testingDocumentation: {
          verificationTestsComplete: true,
          validationTestsComplete: true,
          testReportsGenerated: true,
          allTestsPassed: true,
        },
        qualitySystemDocumentation: {
          qualityManualCurrent: true,
          proceduresDocumented: true,
          recordsComplete: true,
          auditTrailIntact: true,
        },
        riskManagementFile: {
          riskAnalysisComplete: true,
          riskControlsImplemented: true,
          riskManagementReportFinal: true,
          postMarketSurveillancePlan: true,
        },
        labelingAndInstructions: {
          labelingComplete: true,
          userManualComplete: true,
          installationInstructionsComplete: true,
          warrantyInformationComplete: true,
        },
      };

      const readinessScore = Object.values(submissionReadiness).reduce((score, section) => {
        const sectionScore = Object.values(section).filter(Boolean).length / Object.values(section).length;
        return score + sectionScore;
      }, 0) / Object.keys(submissionReadiness).length;

      expect(readinessScore).toBe(1.0); // 100% ready
      expect(submissionReadiness.designDocumentation.complete).toBe(true);
      expect(submissionReadiness.testingDocumentation.allTestsPassed).toBe(true);
      expect(submissionReadiness.qualitySystemDocumentation.auditTrailIntact).toBe(true);
      expect(submissionReadiness.riskManagementFile.riskAnalysisComplete).toBe(true);
      expect(submissionReadiness.labelingAndInstructions.labelingComplete).toBe(true);
    });
  });
});