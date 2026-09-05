import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Neon HTTP driver — works in both Edge and Node runtimes
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export type DB = typeof db;
