import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance for the API server.
export const prisma = new PrismaClient();
