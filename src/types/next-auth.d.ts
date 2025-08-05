/**
 * TORVAN NEXTAUTH TYPE DEFINITIONS
 * ==============================
 * 
 * Extended NextAuth types for medical device user management
 */

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      jobTitle?: string;
      department?: string;
      roles: string[];
      permissions: string[];
      emailVerified: boolean;
      timezone: string;
      language: string;
      uiPreferences?: any;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    department?: string;
    roles: string[];
    permissions: string[];
    emailVerified: boolean;
    timezone: string;
    language: string;
    uiPreferences?: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    department?: string;
    roles: string[];
    permissions: string[];
    emailVerified: boolean;
    timezone: string;
    language: string;
    uiPreferences?: any;
  }
}