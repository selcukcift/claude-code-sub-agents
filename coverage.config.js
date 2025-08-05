/**
 * TORVAN MEDICAL DEVICE TEST COVERAGE CONFIGURATION
 * =================================================
 * 
 * Test coverage configuration for medical device compliance
 * Implements FDA 21 CFR Part 820 and ISO 13485 coverage requirements
 */

module.exports = {
  // Medical Device Coverage Thresholds
  coverageThreshold: {
    // Global thresholds for medical device software
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
    
    // Authentication system - critical for medical device access control
    'src/lib/auth.ts': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    
    // Password security - critical for medical device compliance
    'src/lib/security/password.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    
    // Role-based access control - critical for medical device authorization
    'src/lib/security/rbac.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    
    // Data validation - critical for medical device data integrity
    'src/lib/security/validation.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    
    // Authentication components - critical UI for medical device access
    'src/components/auth/**/*.tsx': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    
    // BOM generation - critical for medical device manufacturing
    'src/components/bom/**/*.tsx': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    
    // Quality control - critical for medical device compliance
    'src/components/qc/**/*.tsx': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    
    // Order management - core medical device workflow
    'src/components/orders/**/*.tsx': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    
    // Database operations - critical for data integrity
    'src/lib/prisma.ts': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
    
    // tRPC API routes - critical for medical device communication
    'src/server/api/**/*.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },
  
  // Coverage collection configuration
  collectCoverageFrom: [
    // Include all source files
    'src/**/*.{ts,tsx}',
    
    // Exclude type definitions
    '!src/**/*.d.ts',
    
    // Exclude test files
    '!src/__tests__/**/*',
    '!src/**/__tests__/**/*',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    
    // Exclude Next.js specific files
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/globals.css',
    
    // Exclude configuration files
    '!src/types/**/*',
    '!src/**/*.stories.{ts,tsx}',
    
    // Critical medical device components require coverage
    'src/lib/security/**/*.ts',
    'src/lib/auth.ts',
    'src/components/auth/**/*.tsx',
    'src/lib/security/rbac.ts',
    'src/lib/security/password.ts',
    'src/lib/security/validation.ts',
    'src/components/bom/**/*.tsx',
    'src/components/qc/**/*.tsx',
  ],
  
  // Coverage reporters for medical device documentation
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief summary
    'html',           // HTML report for detailed analysis
    'lcov',           // LCOV format for CI/CD integration
    'json',           // JSON format for programmatic access
    'json-summary',   // JSON summary
    'cobertura',      // Cobertura XML for CI/CD tools
    'clover',         // Clover XML format
  ],
  
  // Coverage directory structure
  coverageDirectory: 'coverage',
  
  // Coverage path mapping
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/test-results/',
    '/public/',
    '/prisma/',
    '/database/',
  ],
  
  // Medical device specific coverage rules
  coverageProvider: 'v8', // Use V8 coverage for better accuracy
  
  // Branch coverage configuration
  collectCoverage: true,
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'cobertura',
    ['text-summary', { skipFull: false }],
    ['json', { file: 'coverage-summary.json' }],
    ['html', { subdir: 'html-report' }],
    ['lcov', { file: 'lcov.info' }],
    ['cobertura', { file: 'cobertura.xml' }],
  ],
  
  // Custom coverage configuration for medical device testing
  globals: {
    'ts-jest': {
      collectCoverage: true,
      coverageReporters: ['text', 'lcov', 'html'],
    },
  },
  
  // Medical device testing environment variables
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/jest.setup.ts',
  ],
  
  // Coverage watermarks for medical device quality gates
  coverageWatermarks: {
    statements: [85, 95],  // Minimum 85%, target 95%
    functions: [90, 98],   // Minimum 90%, target 98%
    branches: [85, 95],    // Minimum 85%, target 95%
    lines: [85, 95],       // Minimum 85%, target 95%
  },
  
  // Medical device compliance reporting
  testResultsProcessor: './test-results-processor.js',
  
  // Coverage exclusions for medical device specific files
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/dist/',
    '/coverage/',
    '/test-results/',
    '/public/',
    '/database/',
    '/prisma/',
    // Exclude mock files
    '/__mocks__/',
    '/src/__tests__/setup/',
    '/src/__tests__/fixtures/',
    // Exclude configuration files
    '/jest.config.js',
    '/next.config.ts',
    '/tailwind.config.ts',
  ],
  
  // Advanced coverage configuration for medical devices
  coverageReporters: [
    'default',
    ['html', { 
      outputDirectory: 'coverage/html',
      skipEmpty: false,
      skipFull: false,
    }],
    ['lcov', { 
      outputDirectory: 'coverage/lcov',
      reportFile: 'lcov.info',
    }],
    ['json', { 
      outputDirectory: 'coverage/json',
      reportFile: 'coverage.json',
    }],
    ['text-summary', {
      skipEmpty: false,
      skipFull: false,
    }],
    ['cobertura', {
      outputDirectory: 'coverage/cobertura',
      reportFile: 'cobertura.xml',
    }],
    // Custom medical device compliance reporter
    ['./src/__tests__/reporters/medical-compliance-reporter.js', {
      outputDirectory: 'coverage/medical-compliance',
      reportFile: 'compliance-report.json',
    }],
  ],
  
  // Medical device quality gates
  coverageThresholdEnforcement: 'strict',
  
  // Fail build if coverage thresholds are not met
  passWithNoTests: false,
  
  // Additional medical device testing configuration
  verbose: true,
  bail: 0, // Don't stop on first failure - collect all coverage data
  
  // Medical device specific test environment
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
  
  // Coverage collection timing
  collectCoverageOnlyFrom: {
    'src/**/*.{ts,tsx}': true,
  },
  
  // Medical device branch coverage configuration
  branchCoverage: true,
  functionCoverage: true,
  lineCoverage: true,
  statementCoverage: true,
};