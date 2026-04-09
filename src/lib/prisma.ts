import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const needsSsl = url.includes("render.com") || url.includes("neon.tech") || url.includes("supabase");
  const adapter = new PrismaPg({
    connectionString: url,
    ...(needsSsl && { ssl: { rejectUnauthorized: false } }),
  });
  return new PrismaClient({ adapter });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient();
    }
    return (globalForPrisma.prisma as unknown as Record<string | symbol, unknown>)[prop];
  },
});
