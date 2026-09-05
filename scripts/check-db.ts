import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables:', tables.map((t: any) => t.table_name));

  const columns = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'payruns'`;
  console.log('Payruns columns:', columns.map((c: any) => c.column_name));

  const auditCols = await sql`SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'audit_logs'`;
  console.log('audit_logs columns:', auditCols);
}

main().catch(console.error);
