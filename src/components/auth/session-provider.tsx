"use client";

/**
 * TORVAN SESSION PROVIDER COMPONENT
 * ================================
 * 
 * NextAuth.js session provider wrapper for medical device authentication
 */

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface AuthSessionProviderProps {
  children: ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}