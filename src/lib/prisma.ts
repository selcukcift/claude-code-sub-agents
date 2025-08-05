/**
 * TORVAN PRISMA CLIENT CONFIGURATION
 * ================================
 * 
 * Prisma client setup with connection pooling and error handling
 * for medical device workflow management system
 */

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["error", "warn"],
    errorFormat: "minimal",
  });
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = new PrismaClient({
      log: ["query", "error", "warn", "info"],
      errorFormat: "pretty",
    });
  }
  prisma = global.cachedPrisma;
}

export { prisma };