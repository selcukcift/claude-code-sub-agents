/**
 * TORVAN MEDICAL DEVICE TESTING CONFIGURATION
 * ==========================================
 * 
 * Jest configuration compliant with:
 * - FDA 21 CFR Part 820 Quality System Regulation
 * - ISO 13485 Medical Device Testing Requirements  
 * - IEC 62304 Medical Device Software Lifecycle
 * - FDA Software as Medical Device (SaMD) Guidelines
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Medical Device Testing Requirements Configuration
const customJestConfig = {
  displayName: 'TORVAN Medical Workflow Testing Suite',
  
  // Test Environment Configuration
  testEnvironment: 'jsdom', // Default for React components
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],
  
  // Medical Device Test Directory Structure
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/src/__tests__/**/*.spec.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/?(*.)(test|spec).{ts,tsx}'
  ],
  
  // Module Resolution for Testing
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  
  // Test Environment Setup
  projects: [
    {
      displayName: 'unit-tests',
      testMatch: ['<rootDir>/src/__tests__/unit/**/*.test.{ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],
    },
    {
      displayName: 'integration-tests',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/integration.setup.ts'],
    },
    {
      displayName: 'security-tests',
      testMatch: ['<rootDir>/src/__tests__/security/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/security.setup.ts'],
    },
    {
      displayName: 'medical-compliance',
      testMatch: ['<rootDir>/src/__tests__/medical-compliance/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/medical-compliance.setup.ts'],
    },
    {
      displayName: 'performance-tests',
      testMatch: ['<rootDir>/src/__tests__/performance/**/*.test.{ts,tsx}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/performance.setup.ts'],
    }
  ],
  
  // Coverage Configuration for Medical Device Compliance
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**/*',
    '!src/**/__tests__/**/*',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/globals.css',
    '!src/types/**/*',
    '!src/**/*.stories.{ts,tsx}',
    // Critical medical device components require 100% coverage
    'src/lib/security/**/*.ts',
    'src/lib/auth.ts',
    'src/components/auth/**/*.tsx',
    'src/lib/security/rbac.ts',
    'src/lib/security/password.ts',
    'src/lib/security/validation.ts',
  ],
  
  // Medical Device Testing Coverage Thresholds
  coverageThreshold: {
    global: {
      branches: 85,     // FDA requirement for critical software
      functions: 90,    // High function coverage for medical devices
      lines: 85,        // Industry standard for medical software
      statements: 85,   // Comprehensive statement coverage
    },
    // Critical medical device security components require 100% coverage
    'src/lib/security/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/lib/auth.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    // BOM generation is critical for medical device manufacturing
    'src/components/bom/**/*.tsx': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    // Quality control is critical for medical device compliance
    'src/components/qc/**/*.tsx': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    }
  },
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary',
    'cobertura', // For CI/CD integration
  ],
  
  // Test Execution Configuration
  verbose: true,
  maxWorkers: '50%', // Optimize for CI/CD environments
  testTimeout: 30000, // 30 seconds for complex medical device workflows
  
  // Mock Configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Medical Device Specific Transforms
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true, // Performance optimization
    }],
  },
  
  // File Extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test Results Configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results/junit',
      outputName: 'junit.xml',
      suiteName: 'TORVAN Medical Device Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/test-results/html',
      filename: 'test-report.html',
      openReport: false,
      pageTitle: 'TORVAN Medical Device Test Report',
    }],
  ],
  
  // Global Test Configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true,
    },
  },
  
  // Test Retry Configuration for Medical Device Reliability
  retry: {
    'src/__tests__/medical-compliance/**/*.test.{ts,tsx}': 2, // Retry critical compliance tests
    'src/__tests__/security/**/*.test.{ts,tsx}': 2, // Retry security tests
  },
  
  // Ignore Patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // Watch Mode Configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/test-results/',
    '<rootDir>/coverage/',
  ],
}

// Export Jest configuration with Next.js integration
module.exports = createJestConfig(customJestConfig)