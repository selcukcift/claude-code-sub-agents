/**
 * TORVAN SECURITY TESTING UTILITIES
 * ================================
 * 
 * Security testing and validation utilities for medical device compliance
 * - Authentication testing
 * - Authorization testing
 * - Input validation testing
 * - SQL injection detection
 * - XSS prevention testing
 */

import { hashPassword, verifyPassword, analyzePasswordStrength } from "./password";
import { sanitizeHtml, sanitizeSearchQuery, validateIpAddress } from "./validation";

/**
 * Security test results interface
 */
export interface SecurityTestResult {
  testName: string;
  passed: boolean;
  message: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  details?: any;
}

/**
 * Comprehensive security test suite
 */
export class SecurityTester {
  private results: SecurityTestResult[] = [];

  /**
   * Run all security tests
   */
  async runAllTests(): Promise<SecurityTestResult[]> {
    this.results = [];

    await this.testPasswordSecurity();
    await this.testInputValidation();
    await this.testSqlInjectionPrevention();
    await this.testXssPrevention();
    await this.testAuthenticationSecurity();
    this.testSessionSecurity();

    return this.results;
  }

  private addResult(
    testName: string,
    passed: boolean,
    message: string,
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM",
    details?: any
  ) {
    this.results.push({
      testName,
      passed,
      message,
      severity,
      details,
    });
  }

  /**
   * Test password security implementation
   */
  private async testPasswordSecurity() {
    // Test weak password rejection
    try {
      const weakPasswords = [
        "password",
        "12345678",
        "admin",
        "qwerty",
        "password123",
        "torvan",
      ];

      for (const weakPassword of weakPasswords) {
        try {
          await hashPassword(weakPassword);
          this.addResult(
            "Password Strength Validation",
            false,
            `Weak password "${weakPassword}" was not rejected`,
            "HIGH"
          );
          return;
        } catch (error) {
          // Expected to fail
        }
      }

      this.addResult(
        "Password Strength Validation",
        true,
        "Weak passwords are properly rejected",
        "MEDIUM"
      );
    } catch (error) {
      this.addResult(
        "Password Strength Validation",
        false,
        "Error testing password validation",
        "CRITICAL",
        error
      );
    }

    // Test strong password acceptance
    try {
      const strongPassword = "MedicalDevice2024!@#";
      const hashedPassword = await hashPassword(strongPassword);
      const isValid = await verifyPassword(strongPassword, hashedPassword);

      this.addResult(
        "Strong Password Handling",
        isValid,
        isValid ? "Strong passwords are properly handled" : "Strong password handling failed",
        isValid ? "LOW" : "HIGH"
      );
    } catch (error) {
      this.addResult(
        "Strong Password Handling",
        false,
        "Error testing strong password handling",
        "HIGH",
        error
      );
    }

    // Test password strength analyzer
    try {
      const testPasswords = [
        { password: "weak", expectedScore: 0 },
        { password: "StrongPassword123!", expectedMinScore: 3 },
      ];

      let analyzerWorking = true;
      for (const test of testPasswords) {
        const strength = analyzePasswordStrength(test.password);
        if ("expectedMinScore" in test && strength.score < test.expectedMinScore) {
          analyzerWorking = false;
          break;
        }
        if ("expectedScore" in test && strength.score !== test.expectedScore) {
          analyzerWorking = false;
          break;
        }
      }

      this.addResult(
        "Password Strength Analyzer",
        analyzerWorking,
        analyzerWorking ? "Password strength analyzer working correctly" : "Password strength analyzer issues detected",
        analyzerWorking ? "LOW" : "MEDIUM"
      );
    } catch (error) {
      this.addResult(
        "Password Strength Analyzer",
        false,
        "Error testing password strength analyzer",
        "MEDIUM",
        error
      );
    }
  }

  /**
   * Test input validation
   */
  private async testInputValidation() {
    // Test HTML sanitization
    try {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>',
        "javascript:alert('xss')",
      ];

      let sanitizationWorking = true;
      for (const input of maliciousInputs) {
        const sanitized = sanitizeHtml(input);
        if (sanitized.includes("<script>") || sanitized.includes("javascript:")) {
          sanitizationWorking = false;
          break;
        }
      }

      this.addResult(
        "HTML Sanitization",
        sanitizationWorking,
        sanitizationWorking ? "HTML sanitization working correctly" : "HTML sanitization vulnerabilities detected",
        sanitizationWorking ? "LOW" : "CRITICAL"
      );
    } catch (error) {
      this.addResult(
        "HTML Sanitization",
        false,
        "Error testing HTML sanitization",
        "CRITICAL",
        error
      );
    }

    // Test search query sanitization
    try {
      const maliciousQueries = [
        "'; DROP TABLE users; --",
        "<script>alert('xss')</script>",
        "' UNION SELECT * FROM passwords --",
      ];

      let querySanitizationWorking = true;
      for (const query of maliciousQueries) {
        const sanitized = sanitizeSearchQuery(query);
        if (sanitized.includes("DROP TABLE") || sanitized.includes("<script>")) {
          querySanitizationWorking = false;
          break;
        }
      }

      this.addResult(
        "Search Query Sanitization",
        querySanitizationWorking,
        querySanitizationWorking ? "Search query sanitization working correctly" : "Search query sanitization vulnerabilities detected",
        querySanitizationWorking ? "LOW" : "HIGH"
      );
    } catch (error) {
      this.addResult(
        "Search Query Sanitization",
        false,
        "Error testing search query sanitization",
        "HIGH",
        error
      );
    }
  }

  /**
   * Test SQL injection prevention
   */
  private async testSqlInjectionPrevention() {
    const sqlInjectionPatterns = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
      "' OR 1=1 --",
      "'; UPDATE users SET password='hacked' WHERE id=1; --",
    ];

    try {
      // Test that our sanitization functions catch these patterns
      let preventionWorking = true;
      const vulnerablePatterns: string[] = [];

      for (const pattern of sqlInjectionPatterns) {
        const sanitized = sanitizeSearchQuery(pattern);
        
        // Check if dangerous SQL keywords are still present
        const dangerousKeywords = ["DROP", "INSERT", "UPDATE", "DELETE", "UNION", "SELECT"];
        const containsDangerous = dangerousKeywords.some(keyword => 
          sanitized.toUpperCase().includes(keyword)
        );

        if (containsDangerous) {
          preventionWorking = false;
          vulnerablePatterns.push(pattern);
        }
      }

      this.addResult(
        "SQL Injection Prevention",
        preventionWorking,
        preventionWorking 
          ? "SQL injection patterns are properly sanitized" 
          : `SQL injection vulnerabilities detected in patterns: ${vulnerablePatterns.join(", ")}`,
        preventionWorking ? "LOW" : "CRITICAL",
        { vulnerablePatterns }
      );
    } catch (error) {
      this.addResult(
        "SQL Injection Prevention",
        false,
        "Error testing SQL injection prevention",
        "CRITICAL",
        error
      );
    }
  }

  /**
   * Test XSS prevention
   */
  private async testXssPrevention() {
    const xssPatterns = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">click me</div>',
    ];

    try {
      let preventionWorking = true;
      const vulnerablePatterns: string[] = [];

      for (const pattern of xssPatterns) {
        const sanitized = sanitizeHtml(pattern);
        
        // Check if dangerous elements/attributes are still present
        const dangerousElements = ["<script", "<iframe", "javascript:", "onload=", "onerror=", "onclick="];
        const containsDangerous = dangerousElements.some(element => 
          sanitized.toLowerCase().includes(element.toLowerCase())
        );

        if (containsDangerous) {
          preventionWorking = false;
          vulnerablePatterns.push(pattern);
        }
      }

      this.addResult(
        "XSS Prevention",
        preventionWorking,
        preventionWorking 
          ? "XSS patterns are properly sanitized" 
          : `XSS vulnerabilities detected in patterns: ${vulnerablePatterns.join(", ")}`,
        preventionWorking ? "LOW" : "CRITICAL",
        { vulnerablePatterns }
      );
    } catch (error) {
      this.addResult(
        "XSS Prevention",
        false,
        "Error testing XSS prevention",
        "CRITICAL",
        error
      );
    }
  }

  /**
   * Test authentication security
   */
  private async testAuthenticationSecurity() {
    // Test password verification with timing attacks
    try {
      const correctPassword = "TestPassword123!";
      const hashedPassword = await hashPassword(correctPassword);
      
      // Test with correct password
      const startTime1 = Date.now();
      const result1 = await verifyPassword(correctPassword, hashedPassword);
      const time1 = Date.now() - startTime1;

      // Test with incorrect password
      const startTime2 = Date.now();
      const result2 = await verifyPassword("WrongPassword123!", hashedPassword);
      const time2 = Date.now() - startTime2;

      // Timing difference should be minimal (within reasonable bounds)
      const timingDifference = Math.abs(time1 - time2);
      const timingAttackResistant = timingDifference < 100; // 100ms threshold

      this.addResult(
        "Password Verification Security",
        result1 && !result2,
        result1 && !result2 ? "Password verification working correctly" : "Password verification failed",
        result1 && !result2 ? "LOW" : "CRITICAL"
      );

      this.addResult(
        "Timing Attack Resistance",
        timingAttackResistant,
        timingAttackResistant 
          ? "Password verification appears resistant to timing attacks" 
          : `Potential timing attack vulnerability: ${timingDifference}ms difference`,
        timingAttackResistant ? "LOW" : "MEDIUM",
        { timingDifference, time1, time2 }
      );
    } catch (error) {
      this.addResult(
        "Authentication Security Test",
        false,
        "Error testing authentication security",
        "CRITICAL",
        error
      );
    }
  }

  /**
   * Test session security
   */
  private testSessionSecurity() {
    // Test IP validation
    try {
      const validIPs = ["192.168.1.1", "10.0.0.1", "127.0.0.1"];
      const invalidIPs = ["999.999.999.999", "not.an.ip", "192.168.1"];

      let ipValidationWorking = true;
      
      for (const ip of validIPs) {
        if (!validateIpAddress(ip)) {
          ipValidationWorking = false;
          break;
        }
      }

      for (const ip of invalidIPs) {
        if (validateIpAddress(ip)) {
          ipValidationWorking = false;
          break;
        }
      }

      this.addResult(
        "IP Address Validation",
        ipValidationWorking,
        ipValidationWorking ? "IP address validation working correctly" : "IP address validation issues detected",
        ipValidationWorking ? "LOW" : "MEDIUM"
      );
    } catch (error) {
      this.addResult(
        "IP Address Validation",
        false,
        "Error testing IP address validation",
        "MEDIUM",
        error
      );
    }
  }

  /**
   * Generate security report
   */
  generateReport(): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    results: SecurityTestResult[];
    recommendations: string[];
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    
    const critical = this.results.filter(r => r.severity === "CRITICAL").length;
    const high = this.results.filter(r => r.severity === "HIGH").length;
    const medium = this.results.filter(r => r.severity === "MEDIUM").length;
    const low = this.results.filter(r => r.severity === "LOW").length;

    const recommendations: string[] = [];

    // Generate recommendations based on failed tests
    const failedTests = this.results.filter(r => !r.passed);
    for (const test of failedTests) {
      switch (test.testName) {
        case "Password Strength Validation":
          recommendations.push("Implement stronger password validation with minimum complexity requirements");
          break;
        case "HTML Sanitization":
          recommendations.push("Review and strengthen HTML sanitization to prevent XSS attacks");
          break;
        case "SQL Injection Prevention":
          recommendations.push("Implement parameterized queries and input validation to prevent SQL injection");
          break;
        case "XSS Prevention":
          recommendations.push("Enhance XSS prevention measures including CSP headers and input sanitization");
          break;
        case "Authentication Security":
          recommendations.push("Review authentication implementation for security vulnerabilities");
          break;
        case "Timing Attack Resistance":
          recommendations.push("Implement constant-time comparison functions to prevent timing attacks");
          break;
        default:
          recommendations.push(`Address security issues in ${test.testName}`);
      }
    }

    // Add general recommendations
    if (failed > 0) {
      recommendations.push("Conduct regular security audits and penetration testing");
      recommendations.push("Implement comprehensive logging and monitoring for security events");
      recommendations.push("Review and update security policies and procedures");
    }

    return {
      summary: {
        total,
        passed,
        failed,
        critical,
        high,
        medium,
        low,
      },
      results: this.results,
      recommendations,
    };
  }
}

/**
 * Run security tests and return results
 */
export async function runSecurityTests(): Promise<{
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  results: SecurityTestResult[];
  recommendations: string[];
}> {
  const tester = new SecurityTester();
  await tester.runAllTests();
  return tester.generateReport();
}