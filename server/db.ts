import pkg from 'pg';
const { Pool } = pkg;
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Conditionally import Neon driver if DATABASE_URL indicates a Neon connection
let dbClient;
let drizzle;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (process.env.DATABASE_URL.includes('?sslmode=require')) {
  // Assume Neon serverless if sslmode=require is present
  const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
  const ws = await import('ws');
  neonConfig.webSocketConstructor = ws.default; // Use .default for ESM compatibility
  const pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  dbClient = pool;
  drizzle = (await import('drizzle-orm/neon-serverless')).drizzle;
} else {
  // Otherwise, use standard node-postgres
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  dbClient = pool;
  drizzle = drizzlePg;
}

export const pool = dbClient;
export const db = drizzle({ client: pool, schema });