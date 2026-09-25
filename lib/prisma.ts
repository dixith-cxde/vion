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
  let pool: Pool;

  try {
    const parsed = new URL(databaseUrl);
    const sslMode = parsed.searchParams.get("sslmode");

    pool = new Pool({
      connectionString: databaseUrl,
      ssl:
        sslMode && sslMode !== "disable"
          ? { rejectUnauthorized: sslMode === "verify-full" }
          : undefined,
    });
  } catch {
    pool = new Pool({ connectionString: databaseUrl });
  }

  pool.on("error", (err) => {
    console.error("Postgres pool error:", err);
  });

  return pool;
}

function getPool() {
  globalForPrisma.prismaPool ??= createPool();
  return globalForPrisma.prismaPool;
}

function getClient() {
  globalForPrisma.prisma ??= new PrismaClient({
    adapter: new PrismaPg(getPool()),
  });
  return globalForPrisma.prisma;
}

export const prisma: PrismaClient = getClient();
