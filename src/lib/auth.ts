/**
 * TORVAN MEDICAL WORKFLOW AUTHENTICATION CONFIGURATION
 * =================================================
 * 
 * NextAuth.js configuration with medical device security compliance
 * - Role-based access control (RBAC)
 * - JWT-based authentication with secure session management
 * - Integration with Prisma database
 * - Medical device industry security standards
 */

import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/security/password";
import { UserRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { 
          label: "Username", 
          type: "text",
          placeholder: "Enter your username"
        },
        password: { 
          label: "Password", 
          type: "password",
          placeholder: "Enter your password"
        }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username and password are required");
        }

        try {
          // Find user by username or email
          const user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: credentials.username },
                { email: credentials.username }
              ],
              isActive: true
            },
            include: {
              userRoles: {
                where: {
                  isActive: true,
                  OR: [
                    { effectiveUntil: null },
                    { effectiveUntil: { gte: new Date() } }
                  ]
                },
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          if (!user) {
            throw new Error("Invalid credentials");
          }

          // Check account lockout
          if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
            throw new Error("Account is temporarily locked. Please try again later.");
          }

          // Verify password
          const isValidPassword = await verifyPassword(credentials.password, user.passwordHash);
          
          if (!isValidPassword) {
            // Increment failed login attempts
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: { increment: 1 },
                // Lock account after 5 failed attempts for medical device security
                ...(user.failedLoginAttempts >= 4 && {
                  isLocked: true,
                  lockedUntil: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
                })
              }
            });
            throw new Error("Invalid credentials");
          }

          // Check if password expired (medical device compliance)
          if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) {
            throw new Error("Password has expired. Please reset your password.");
          }

          // Check if user must change password
          if (user.mustChangePassword) {
            throw new Error("Password change required. Please contact your administrator.");
          }

          // Reset failed login attempts and update last login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              isLocked: false,
              lockedUntil: null,
              lastLogin: new Date()
            }
          });

          // Extract roles and permissions
          const roles = user.userRoles.map(ur => ur.role.roleName);
          const permissions = user.userRoles.flatMap(ur => 
            ur.role.rolePermissions.map(rp => rp.permission.permissionCode)
          );

          return {
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            firstName: user.firstName,
            lastName: user.lastName,
            jobTitle: user.jobTitle,
            department: user.department,
            roles,
            permissions,
            emailVerified: user.emailVerified,
            timezone: user.timezone,
            language: user.language,
            uiPreferences: user.uiPreferences
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw error;
        }
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours for medical device security
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.username = user.username;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.jobTitle = user.jobTitle;
        token.department = user.department;
        token.roles = user.roles;
        token.permissions = user.permissions;
        token.emailVerified = user.emailVerified;
        token.timezone = user.timezone;
        token.language = user.language;
        token.uiPreferences = user.uiPreferences;
      }

      // Update session data if triggered
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      // Refresh user data on each request for medical device security
      if (token.id) {
        try {
          const refreshedUser = await prisma.user.findUnique({
            where: { 
              id: BigInt(token.id as string),
              isActive: true 
            },
            include: {
              userRoles: {
                where: {
                  isActive: true,
                  OR: [
                    { effectiveUntil: null },
                    { effectiveUntil: { gte: new Date() } }
                  ]
                },
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true
                        }
                      }
                    }
                  }
                }
              }
            }
          });

          if (!refreshedUser) {
            // User no longer exists or is inactive
            return null;
          }

          // Update token with fresh user data
          const roles = refreshedUser.userRoles.map(ur => ur.role.roleName);
          const permissions = refreshedUser.userRoles.flatMap(ur => 
            ur.role.rolePermissions.map(rp => rp.permission.permissionCode)
          );

          token.roles = roles;
          token.permissions = permissions;
          token.department = refreshedUser.department;
          token.jobTitle = refreshedUser.jobTitle;
        } catch (error) {
          console.error("Error refreshing user data:", error);
          // Return null to force re-authentication
          return null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.jobTitle = token.jobTitle as string;
        session.user.department = token.department as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
        session.user.emailVerified = token.emailVerified as boolean;
        session.user.timezone = token.timezone as string;
        session.user.language = token.language as string;
        session.user.uiPreferences = token.uiPreferences as any;
      }
      return session;
    },

    async signIn({ user, account, profile, email, credentials }) {
      // Additional sign-in validation for medical device security
      if (account?.provider === "credentials") {
        // User is already validated in the authorize callback
        return true;
      }
      return false;
    }
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user"
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User ${user.email} signed in`, {
        userId: user.id,
        account: account?.provider,
        timestamp: new Date().toISOString()
      });
    },
    async signOut({ token, session }) {
      console.log(`User signed out`, {
        userId: token?.id || session?.user?.id,
        timestamp: new Date().toISOString()
      });
    },
    async createUser({ user }) {
      console.log(`New user created: ${user.email}`, {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
  },

  debug: process.env.NODE_ENV === "development",
};