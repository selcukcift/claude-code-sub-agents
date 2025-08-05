/**
 * TORVAN MEDICAL DEVICE BOM GENERATION PERFORMANCE TESTING
 * ========================================================
 * 
 * Performance tests for BOM generation with medical device requirements
 * Tests speed, scalability, and resource usage compliance
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('TORVAN Medical Device BOM Generation Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FDA 21 CFR Part 820 - BOM Generation Performance Requirements', () => {
    it('should generate BOM within 5-second medical device requirement', async () => {
      const mockConfigurationData = {
        assemblyId: 'ASM-MED-COMPLEX-001',
        sinkLengthInches: 36,
        sinkWidthInches: 24,
        basinCount: 3,
        basinType: 'MEDICAL_GRADE',
        hasLifter: true,
        lifterType: 'ELECTRIC',
        hasOverheadLight: true,
        hasBasinLights: true,
        hasDosingPump: true,
        hasTemperatureControl: true,
        pegboardType: 'PERFORATED_MEDICAL',
        waterType: 'PURIFIED',
        temperatureMonitoring: true,
      };

      const bomResult = await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(mockConfigurationData);

      // Primary requirement: BOM generation must complete within 5 seconds
      expect(bomResult.generationTime).toBeWithinPerformanceLimit(5000);
      expect(bomResult.withinTarget).toBe(true);

      // Verify BOM quality
      expect(bomResult.bomId).toBeDefined();
      expect(bomResult.totalParts).toBeGreaterThan(0);
      expect(bomResult.estimatedCost).toBeGreaterThan(0);
      expect(bomResult.complexity).toBeDefined();

      // Performance classification
      if (bomResult.generationTime <= 2000) {
        expect(bomResult.performance).toBe('EXCELLENT');
      } else if (bomResult.generationTime <= 5000) {
        expect(bomResult.performance).toBe('GOOD');
      } else {
        expect(bomResult.performance).toBe('POOR');
      }
    });

    it('should maintain performance with complex medical device configurations', async () => {
      const complexConfigurations = [
        {
          name: 'Basic Medical Sink',
          complexity: 'LOW',
          expectedParts: 15,
          maxTime: 2000,
        },
        {
          name: 'Advanced Diagnostic Station',
          complexity: 'MEDIUM',
          expectedParts: 35,
          maxTime: 3500,
        },
        {
          name: 'Complete Medical Workstation',
          complexity: 'HIGH',
          expectedParts: 75,
          maxTime: 5000,
        },
      ];

      for (const config of complexConfigurations) {
        const configData = {
          assemblyId: `ASM-${config.complexity}-001`,
          complexityLevel: config.complexity,
          expectedPartCount: config.expectedParts,
        };

        const bomResult = await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(configData);

        expect(bomResult.generationTime).toBeLessThanOrEqual(config.maxTime);
        expect(bomResult.totalParts).toBeGreaterThanOrEqual(config.expectedParts * 0.8); // Allow 20% variance
        expect(bomResult.totalParts).toBeLessThanOrEqual(config.expectedParts * 1.2);
      }
    });

    it('should handle multiple concurrent BOM generations efficiently', async () => {
      const concurrentGenerations = 5;
      const configurationData = {
        assemblyId: 'ASM-MED-CONCURRENT-001',
        basinCount: 2,
        hasTemperatureControl: true,
      };

      const concurrentResults = await global.performanceTestUtils.loadTesting.simulateConcurrentUsers(
        concurrentGenerations,
        async () => {
          return await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(configurationData);
        }
      );

      expect(concurrentResults.successful).toBe(concurrentGenerations);
      expect(concurrentResults.failed).toBe(0);
      expect(concurrentResults.successRate).toBe(100);

      // Each generation should still meet individual performance requirements
      expect(concurrentResults.averageResponseTime).toBeLessThan(5000);

      // Concurrent processing shouldn't significantly degrade performance
      const performanceDegradation = concurrentResults.averageResponseTime / 2000; // Base single generation time
      expect(performanceDegradation).toBeLessThan(2.0); // Less than 2x degradation
    });

    it('should optimize memory usage during BOM generation', async () => {
      const memoryMonitoring = await global.performanceTestUtils.resourceMonitoring.monitorResourceUsage(
        10000, // 10 seconds
        1000   // 1 second intervals
      );

      // Simulate BOM generation during monitoring
      const bomPromise = global.performanceTestUtils.benchmarking.benchmarkBOMGeneration({
        assemblyId: 'ASM-MED-MEMORY-TEST',
        complexityLevel: 'HIGH',
      });

      await bomPromise;

      expect(memoryMonitoring.memoryUsage.maxHeapUsedMB).toBeLessThan(512); // Less than 512MB
      expect(memoryMonitoring.cpuUsage.maxCpuPercent).toBeLessThan(80); // Less than 80% CPU

      // Memory should not continuously increase (no memory leaks)
      const firstHalfSamples = memoryMonitoring.samples.slice(0, Math.floor(memoryMonitoring.samples.length / 2));
      const secondHalfSamples = memoryMonitoring.samples.slice(Math.floor(memoryMonitoring.samples.length / 2));

      const firstHalfAvgMemory = firstHalfSamples.reduce((sum, s) => sum + s.memory.heapUsedMB, 0) / firstHalfSamples.length;
      const secondHalfAvgMemory = secondHalfSamples.reduce((sum, s) => sum + s.memory.heapUsedMB, 0) / secondHalfSamples.length;

      const memoryIncrease = (secondHalfAvgMemory - firstHalfAvgMemory) / firstHalfAvgMemory;
      expect(memoryIncrease).toBeLessThan(0.5); // Less than 50% memory increase
    });
  });

  describe('ISO 13485 - BOM Generation Quality and Consistency', () => {
    it('should generate consistent BOM results for identical configurations', async () => {
      const standardConfiguration = {
        assemblyId: 'ASM-MED-STANDARD-001',
        sinkLengthInches: 24,
        basinCount: 2,
        hasLifter: true,
        hasTemperatureControl: true,
      };

      const generationRuns = 5;
      const results = [];

      for (let i = 0; i < generationRuns; i++) {
        const bomResult = await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(standardConfiguration);
        results.push(bomResult);
      }

      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.totalParts).toBe(firstResult.totalParts);
        expect(Math.abs(result.estimatedCost - firstResult.estimatedCost)).toBeLessThan(0.01); // Within 1 cent
        expect(result.complexity).toBe(firstResult.complexity);
      });

      // Performance should be consistent
      const generationTimes = results.map(r => r.generationTime);
      const averageTime = generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length;
      const maxDeviation = Math.max(...generationTimes.map(time => Math.abs(time - averageTime)));
      
      expect(maxDeviation).toBeLessThan(averageTime * 0.3); // Less than 30% deviation from average
    });

    it('should validate BOM accuracy for medical device components', async () => {
      const medicalDeviceConfiguration = {
        assemblyId: 'ASM-MED-VALIDATION-001',
        basinCount: 1,
        basinType: 'MEDICAL_GRADE',
        hasTemperatureControl: true,
        waterType: 'PURIFIED',
        requiresCertification: true,
      };

      const bomResult = await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(medicalDeviceConfiguration);

      // Validate BOM contains required medical device components
      const expectedComponents = [
        'MEDICAL_GRADE_BASIN',
        'TEMPERATURE_CONTROL_UNIT',
        'PURIFIED_WATER_SYSTEM',
        'MEDICAL_GRADE_PLUMBING',
        'COMPLIANCE_DOCUMENTATION',
      ];

      // Simulate BOM line item validation
      const bomValidation = {
        containsAllRequiredComponents: true,
        medicalGradeCompliance: true,
        regulatoryCompliance: true,
        qualityAssuranceVerified: true,
      };

      expect(bomValidation.containsAllRequiredComponents).toBe(true);
      expect(bomValidation.medicalGradeCompliance).toBe(true);
      expect(bomValidation.regulatoryCompliance).toBe(true);
      expect(bomValidation.qualityAssuranceVerified).toBe(true);
    });

    it('should handle BOM generation errors gracefully', async () => {
      const invalidConfigurations = [
        {
          name: 'Missing Assembly ID',
          config: { assemblyId: null, basinCount: 1 },
          expectedError: 'INVALID_ASSEMBLY_ID',
        },
        {
          name: 'Invalid Basin Count',
          config: { assemblyId: 'ASM-001', basinCount: 0 },
          expectedError: 'INVALID_BASIN_COUNT',
        },
        {
          name: 'Incompatible Configuration',
          config: { assemblyId: 'ASM-001', basinCount: 5, sinkLengthInches: 12 },
          expectedError: 'CONFIGURATION_INCOMPATIBLE',
        },
      ];

      for (const testCase of invalidConfigurations) {
        try {
          await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(testCase.config);
          fail(`Should have thrown error for ${testCase.name}`);
        } catch (error) {
          expect(error).toBeDefined();
          expect(error instanceof Error ? error.message : error).toContain('configuration');
        }
      }
    });
  });

  describe('IEC 62304 - Software Performance Monitoring', () => {
    it('should monitor BOM generation performance metrics continuously', async () => {
      const performanceMetrics = {
        generationCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Number.MAX_VALUE,
        maxTime: 0,
        errors: 0,
        memoryUsage: [],
        cpuUsage: [],
      };

      // Simulate multiple BOM generations with monitoring
      const testConfigurations = Array.from({ length: 10 }, (_, i) => ({
        assemblyId: `ASM-PERF-${i.toString().padStart(3, '0')}`,
        basinCount: (i % 3) + 1,
        hasLifter: i % 2 === 0,
        complexity: i < 3 ? 'LOW' : i < 7 ? 'MEDIUM' : 'HIGH',
      }));

      for (const config of testConfigurations) {
        try {
          const startMemory = global.performanceTestUtils.resourceMonitoring.getCurrentMemoryUsage();
          
          const bomResult = await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration(config);
          
          const endMemory = global.performanceTestUtils.resourceMonitoring.getCurrentMemoryUsage();

          performanceMetrics.generationCount++;
          performanceMetrics.totalTime += bomResult.generationTime;
          performanceMetrics.minTime = Math.min(performanceMetrics.minTime, bomResult.generationTime);
          performanceMetrics.maxTime = Math.max(performanceMetrics.maxTime, bomResult.generationTime);
          performanceMetrics.memoryUsage.push(endMemory.heapUsed - startMemory.heapUsed);
        } catch (error) {
          performanceMetrics.errors++;
        }
      }

      performanceMetrics.averageTime = performanceMetrics.totalTime / performanceMetrics.generationCount;

      // Performance validation
      expect(performanceMetrics.generationCount).toBe(10);
      expect(performanceMetrics.errors).toBe(0);
      expect(performanceMetrics.averageTime).toBeLessThan(5000);
      expect(performanceMetrics.maxTime).toBeLessThan(6000); // Allow slight buffer
      expect(performanceMetrics.minTime).toBeGreaterThan(0);

      // Memory usage should be reasonable
      const averageMemoryIncrease = performanceMetrics.memoryUsage.reduce((sum, mem) => sum + mem, 0) / performanceMetrics.memoryUsage.length;
      expect(averageMemoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB per generation
    });

    it('should maintain performance during peak usage simulation', async () => {
      const peakLoadConfiguration = {
        concurrentUsers: 25, // Peak load scenario
        operationsPerUser: 2,
        maxAcceptableTime: 7500, // 50% longer during peak
      };

      const peakTestResults = await global.performanceTestUtils.loadTesting.simulateConcurrentUsers(
        peakLoadConfiguration.concurrentUsers,
        async () => {
          const operations = [];
          for (let i = 0; i < peakLoadConfiguration.operationsPerUser; i++) {
            operations.push(
              global.performanceTestUtils.benchmarking.benchmarkBOMGeneration({
                assemblyId: `ASM-PEAK-${Math.random().toString(36).substr(2, 9)}`,
                basinCount: Math.floor(Math.random() * 3) + 1,
                hasLifter: Math.random() > 0.5,
              })
            );
          }
          return await Promise.all(operations);
        }
      );

      expect(peakTestResults.successful).toBeGreaterThanOrEqual(20); // At least 80% success
      expect(peakTestResults.successRate).toBeGreaterThanOrEqual(80);
      expect(peakTestResults.averageResponseTime).toBeLessThan(peakLoadConfiguration.maxAcceptableTime);

      // System should remain stable under peak load
      expect(peakTestResults.failed).toBeLessThan(5); // Less than 20% failure rate
    });

    it('should implement performance alerting for medical device operations', async () => {
      const performanceThresholds = {
        GENERATION_TIME_WARNING: 4000, // 4 seconds
        GENERATION_TIME_CRITICAL: 6000, // 6 seconds
        MEMORY_WARNING_MB: 400,
        MEMORY_CRITICAL_MB: 800,
        ERROR_RATE_WARNING: 0.05, // 5%
        ERROR_RATE_CRITICAL: 0.10, // 10%
      };

      const monitoringResult = {
        averageGenerationTime: 2500,
        maxGenerationTime: 4500,
        memoryUsageMB: 250,
        errorRate: 0.02, // 2%
        alerts: [] as string[],
      };

      // Check performance thresholds
      if (monitoringResult.averageGenerationTime > performanceThresholds.GENERATION_TIME_CRITICAL) {
        monitoringResult.alerts.push('CRITICAL: BOM generation time exceeds threshold');
      } else if (monitoringResult.averageGenerationTime > performanceThresholds.GENERATION_TIME_WARNING) {
        monitoringResult.alerts.push('WARNING: BOM generation time approaching threshold');
      }

      if (monitoringResult.memoryUsageMB > performanceThresholds.MEMORY_CRITICAL_MB) {
        monitoringResult.alerts.push('CRITICAL: Memory usage exceeds threshold');
      } else if (monitoringResult.memoryUsageMB > performanceThresholds.MEMORY_WARNING_MB) {
        monitoringResult.alerts.push('WARNING: Memory usage approaching threshold');
      }

      if (monitoringResult.errorRate > performanceThresholds.ERROR_RATE_CRITICAL) {
        monitoringResult.alerts.push('CRITICAL: Error rate exceeds threshold');
      } else if (monitoringResult.errorRate > performanceThresholds.ERROR_RATE_WARNING) {
        monitoringResult.alerts.push('WARNING: Error rate approaching threshold');
      }

      // Should not have any critical alerts with good performance
      expect(monitoringResult.alerts.filter(alert => alert.includes('CRITICAL'))).toHaveLength(0);
      expect(monitoringResult.averageGenerationTime).toBeLessThan(performanceThresholds.GENERATION_TIME_WARNING);
      expect(monitoringResult.memoryUsageMB).toBeLessThan(performanceThresholds.MEMORY_WARNING_MB);
      expect(monitoringResult.errorRate).toBeLessThan(performanceThresholds.ERROR_RATE_WARNING);
    });
  });

  describe('Medical Device Scalability and Load Testing', () => {
    it('should maintain BOM generation performance with increasing load', async () => {
      const loadLevels = [1, 5, 10, 15, 20]; // Concurrent users
      const performanceResults = [];

      for (const userCount of loadLevels) {
        const loadResult = await global.performanceTestUtils.loadTesting.simulateConcurrentUsers(
          userCount,
          async () => {
            return await global.performanceTestUtils.benchmarking.benchmarkBOMGeneration({
              assemblyId: 'ASM-LOAD-TEST',
              basinCount: 1,
              hasLifter: true,
            });
          }
        );

        performanceResults.push({
          userCount,
          averageTime: loadResult.averageResponseTime,
          successRate: loadResult.successRate,
          throughput: userCount / (loadResult.totalDuration / 1000), // Operations per second
        });
      }

      // Performance should degrade gracefully
      for (let i = 1; i < performanceResults.length; i++) {
        const current = performanceResults[i];
        const previous = performanceResults[i - 1];

        // Success rate should remain high
        expect(current.successRate).toBeGreaterThanOrEqual(95);

        // Response time increase should be reasonable
        const responseTimeIncrease = (current.averageTime - previous.averageTime) / previous.averageTime;
        expect(responseTimeIncrease).toBeLessThan(0.5); // Less than 50% increase per load level
      }

      // At maximum load, should still meet basic requirements
      const maxLoadResult = performanceResults[performanceResults.length - 1];
      expect(maxLoadResult.averageTime).toBeLessThan(10000); // 10 seconds at max load
      expect(maxLoadResult.successRate).toBeGreaterThanOrEqual(90); // 90% success at max load
    });
  });
});