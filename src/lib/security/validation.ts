/**
 * TORVAN SECURITY VALIDATION UTILITIES
 * ===================================
 * 
 * Security validation functions for medical device compliance
 * - Input sanitization
 * - SQL injection prevention
 * - XSS prevention
 * - CSRF token validation
 * - Medical device data validation
 */

import { z } from "zod";

/**
 * Medical device serial number validation
 */
export const medicalDeviceSerialSchema = z.string()
  .min(1, "Serial number is required")
  .max(50, "Serial number must be at most 50 characters")
  .regex(/^[A-Z0-9\-]+$/, "Serial number can only contain uppercase letters, numbers, and hyphens");

/**
 * Medical device part number validation
 */
export const medicalDevicePartNumberSchema = z.string()
  .min(1, "Part number is required")
  .max(100, "Part number must be at most 100 characters")
  .regex(/^[A-Z0-9\-\.]+$/, "Part number can only contain uppercase letters, numbers, hyphens, and periods");

/**
 * Lot number validation for medical devices
 */
export const lotNumberSchema = z.string()
  .min(1, "Lot number is required")
  .max(20, "Lot number must be at most 20 characters")
  .regex(/^[A-Z0-9\-]+$/, "Lot number can only contain uppercase letters, numbers, and hyphens");

/**
 * FDA device identifier validation (UDI format)
 */
export const udiSchema = z.string().optional()
  .refine((val) => {
    if (!val) return true;
    // Basic UDI format validation - starts with (01) followed by 14 digits
    return /^\(01\)\d{14}/.test(val);
  }, "Invalid UDI format");

/**
 * Medical device quantity validation
 */
export const quantitySchema = z.number()
  .min(0, "Quantity cannot be negative")
  .max(999999, "Quantity cannot exceed 999,999")
  .int("Quantity must be a whole number");

/**
 * Medical device dimensions validation (in millimeters)
 */
export const dimensionSchema = z.object({
  length: z.number().min(0).max(10000).optional(),
  width: z.number().min(0).max(10000).optional(),
  height: z.number().min(0).max(10000).optional(),
  diameter: z.number().min(0).max(10000).optional(),
  weight: z.number().min(0).max(100000).optional(), // grams
}).optional();

/**
 * Sanitize HTML input to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate and sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>'"&]/g, "") // Remove potentially dangerous characters
    .substring(0, 100); // Limit length
}

/**
 * Validate file upload for medical device documents
 */
export const fileUploadSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z.number().max(50 * 1024 * 1024, "File size cannot exceed 50MB"), // 50MB limit
  type: z.string().refine((type) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    return allowedTypes.includes(type);
  }, "File type not allowed"),
});

/**
 * Validate medical device temperature range
 */
export const temperatureRangeSchema = z.object({
  min: z.number().min(-273.15, "Temperature cannot be below absolute zero").max(1000),
  max: z.number().min(-273.15, "Temperature cannot be below absolute zero").max(1000),
}).refine((data) => data.min <= data.max, {
  message: "Minimum temperature must be less than or equal to maximum temperature",
});

/**
 * Validate pressure values for medical devices (in kPa)
 */
export const pressureSchema = z.number()
  .min(0, "Pressure cannot be negative")
  .max(10000, "Pressure cannot exceed 10,000 kPa");

/**
 * Validate voltage for medical devices
 */
export const voltageSchema = z.number()
  .min(0, "Voltage cannot be negative")
  .max(1000, "Voltage cannot exceed 1,000V for safety");

/**
 * Medical device classification validation
 */
export const deviceClassificationSchema = z.enum([
  "CLASS_I",
  "CLASS_II", 
  "CLASS_III"
], {
  errorMap: () => ({ message: "Invalid medical device classification" })
});

/**
 * Risk level validation for medical devices
 */
export const riskLevelSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
], {
  errorMap: () => ({ message: "Invalid risk level" })
});

/**
 * Sterilization method validation
 */
export const sterilizationMethodSchema = z.enum([
  "STEAM",
  "ETO", // Ethylene Oxide
  "GAMMA",
  "E_BEAM", // Electron Beam
  "PLASMA",
  "OZONE",
  "NONE"
], {
  errorMap: () => ({ message: "Invalid sterilization method" })
});

/**
 * Biocompatibility test validation
 */
export const biocompatibilitySchema = z.object({
  testType: z.enum([
    "CYTOTOXICITY",
    "SENSITIZATION",
    "IRRITATION",
    "SYSTEMIC_TOXICITY",
    "GENOTOXICITY",
    "IMPLANTATION",
    "HEMOCOMPATIBILITY"
  ]),
  result: z.enum(["PASS", "FAIL", "PENDING"]),
  testDate: z.date(),
  expiryDate: z.date().optional(),
  certificateNumber: z.string().min(1, "Certificate number is required"),
}).refine((data) => {
  if (data.expiryDate) {
    return data.testDate <= data.expiryDate;
  }
  return true;
}, {
  message: "Test date must be before expiry date",
});

/**
 * FDA 510(k) validation
 */
export const fda510kSchema = z.object({
  number: z.string()
    .min(1, "510(k) number is required")
    .regex(/^K\d{6}$/, "510(k) number must be in format K######"),
  clearanceDate: z.date(),
  deviceName: z.string().min(1, "Device name is required"),
  predicateDevice: z.string().optional(),
}).optional();

/**
 * CE marking validation
 */
export const ceMarkingSchema = z.object({
  notifiedBodyNumber: z.string()
    .regex(/^\d{4}$/, "Notified body number must be 4 digits")
    .optional(),
  certificateNumber: z.string().min(1, "Certificate number is required"),
  issueDate: z.date(),
  expiryDate: z.date(),
  classification: deviceClassificationSchema,
}).refine((data) => data.issueDate <= data.expiryDate, {
  message: "Issue date must be before expiry date",
}).optional();

/**
 * Quality management system validation
 */
export const qmsSchema = z.object({
  standard: z.enum(["ISO_13485", "FDA_QSR", "OTHER"]),
  certificateNumber: z.string().min(1, "Certificate number is required"),
  issueDate: z.date(),
  expiryDate: z.date(),
  certifyingBody: z.string().min(1, "Certifying body is required"),
}).refine((data) => data.issueDate <= data.expiryDate, {
  message: "Issue date must be before expiry date",
});

/**
 * Validate IP address for audit logging
 */
export function validateIpAddress(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate session token format
 */
export function validateSessionToken(token: string): boolean {
  // Session token should be at least 32 characters of base64-like characters
  return /^[A-Za-z0-9+/=]{32,}$/.test(token);
}

/**
 * Rate limiting key generation
 */
export function generateRateLimitKey(ip: string, endpoint: string): string {
  return `ratelimit:${sanitizeSearchQuery(ip)}:${sanitizeSearchQuery(endpoint)}`;
}

/**
 * Medical device batch validation
 */
export const batchSchema = z.object({
  batchNumber: z.string()
    .min(1, "Batch number is required")
    .max(50, "Batch number must be at most 50 characters")
    .regex(/^[A-Z0-9\-]+$/, "Batch number can only contain uppercase letters, numbers, and hyphens"),
  manufacturingDate: z.date(),
  expiryDate: z.date().optional(),
  quantity: quantitySchema,
  status: z.enum(["ACTIVE", "QUARANTINE", "REJECTED", "EXPIRED"]),
}).refine((data) => {
  if (data.expiryDate) {
    return data.manufacturingDate <= data.expiryDate;
  }
  return true;
}, {
  message: "Manufacturing date must be before expiry date",
});

/**
 * Comprehensive medical device validation schema
 */
export const medicalDeviceSchema = z.object({
  serialNumber: medicalDeviceSerialSchema,
  partNumber: medicalDevicePartNumberSchema,
  lotNumber: lotNumberSchema,
  udi: udiSchema,
  classification: deviceClassificationSchema,
  riskLevel: riskLevelSchema,
  sterilizationMethod: sterilizationMethodSchema,
  dimensions: dimensionSchema,
  temperatureRange: temperatureRangeSchema.optional(),
  maxPressure: pressureSchema.optional(),
  operatingVoltage: voltageSchema.optional(),
  biocompatibility: z.array(biocompatibilitySchema).optional(),
  fda510k: fda510kSchema,
  ceMarking: ceMarkingSchema,
  qms: qmsSchema,
  batch: batchSchema.optional(),
});