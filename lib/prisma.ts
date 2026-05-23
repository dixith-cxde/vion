import { PrismaClient } from "@/lib/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim().replace(/^['"]|['"]$/g, "");

  if (!value) {
    throw new Error("DATABASE_URL is not configured");
  }

  return value;
}

function createPool() {
  const databaseUrl = getDatabaseUrl();
  const parsed = new URL(databaseUrl);
  const sslMode = parsed.searchParams.get("sslmode");

  return new Pool({
    connectionString: databaseUrl,
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    ssl:
      sslMode && sslMode !== "disable"
        ? { rejectUnauthorized: sslMode === "verify-full" }
        : undefined,
  });
}

const pool = globalForPrisma.prismaPool ?? createPool();
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = prisma;
}
