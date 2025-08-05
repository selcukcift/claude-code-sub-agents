/**
 * TORVAN MEDICAL DEVICE E2E TESTING CONFIGURATION
 * ==============================================
 * 
 * Playwright configuration for medical device end-to-end testing
 * Compliant with FDA and ISO 13485 testing requirements
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Medical Device E2E Testing Configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/__tests__/e2e',
  
  // Medical Device Testing Requirements
  fullyParallel: false, // Sequential testing for medical device workflows
  forbidOnly: !!process.env.CI, // Prevent .only() in CI
  retries: process.env.CI ? 2 : 1, // Retry failed tests for reliability
  workers: process.env.CI ? 1 : 2, // Limited workers for medical device testing
  
  // Test Reporter Configuration
  reporter: [
    ['html', { 
      outputFolder: 'test-results/playwright-report',
      open: 'on-failure',
    }],
    ['json', { 
      outputFile: 'test-results/playwright/results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results/playwright/junit.xml' 
    }],
    ['line'],
  ],
  
  // Test Output Configuration
  outputDir: 'test-results/playwright-artifacts',
  
  // Global Test Configuration
  use: {
    // Base URL for testing
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    
    // Trace configuration for medical device compliance
    trace: 'on-first-retry', // Enable tracing for debugging
    video: 'retain-on-failure', // Record videos for failed tests
    screenshot: 'only-on-failure', // Screenshots for failed tests
    
    // Medical Device Security Requirements
    ignoreHTTPSErrors: false, // Enforce HTTPS security
    
    // Timeout configuration
    actionTimeout: 30000, // 30 seconds for medical device operations
    navigationTimeout: 30000, // 30 seconds for page navigation
    
    // User agent and locale
    locale: 'en-US',
    timezoneId: 'America/New_York',
    
    // Viewport for consistent testing
    viewport: { width: 1280, height: 720 },
    
    // Performance testing
    launchOptions: {
      slowMo: process.env.CI ? 0 : 100, // Slow down for debugging
    },
  },
  
  // Test Environment Configuration
  projects: [
    // Desktop Chrome - Primary medical device testing environment
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Medical device specific configuration
        contextOptions: {
          recordVideo: {
            dir: 'test-results/videos/',
            size: { width: 1280, height: 720 },
          },
        },
      },
    },
    
    // Desktop Firefox - Cross-browser compatibility
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    // Desktop Safari - macOS compatibility
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile Chrome - Mobile responsiveness testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    // Mobile Safari - iOS compatibility
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Tablet testing
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },
  ],
  
  // Web Server Configuration for Testing
  webServer: {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes for server startup
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/torvan_test',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'test-secret-key-for-e2e-testing',
    },
  },
  
  // Test Timeout Configuration
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },
  
  // Global Setup and Teardown
  globalSetup: './src/__tests__/e2e/global.setup.ts',
  globalTeardown: './src/__tests__/e2e/global.teardown.ts',
  
  // Test Metadata
  metadata: {
    testEnvironment: 'medical-device-e2e',
    compliance: ['FDA-21-CFR-820', 'ISO-13485', 'IEC-62304'],
    system: 'TORVAN Medical Workflow Management',
    version: '1.0.0',
  },
});