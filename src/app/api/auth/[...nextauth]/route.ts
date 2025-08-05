/**
 * TORVAN NEXTAUTH.JS API ROUTE HANDLER
 * ===================================
 * 
 * NextAuth.js API route configuration for medical device authentication
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };