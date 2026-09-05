import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  console.log('Running DDL migrations...');

  // 1. Add enum values to audit_action_enum
  const enumValues = ['VALIDATE', 'MARK_PAID', 'RESET_PASSWORD', 'CORRECT', 'SEND_EMAIL'];
  for (const val of enumValues) {
    try {
      await sql.query(`ALTER TYPE audit_action_enum ADD VALUE IF NOT EXISTS '${val}'`);
      console.log(`Enum value added/verified: ${val}`);
    } catch (e: any) {
      console.log(`Enum note for ${val}:`, e.message);
    }
  }

  // 2. Add paid_at column to payruns
  await sql`ALTER TABLE payruns ADD COLUMN IF NOT EXISTS paid_at timestamp;`;
  console.log('Verified column payruns.paid_at');

  // 3. Create email_dispatches table
  await sql`
    CREATE TABLE IF NOT EXISTS email_dispatches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      payrun_id uuid REFERENCES payruns(id) ON DELETE CASCADE,
      payslip_id uuid REFERENCES payslips(id) ON DELETE CASCADE,
      recipient_email varchar(255) NOT NULL,
      recipient_name varchar(255),
      status varchar(50) NOT NULL DEFAULT 'queued',
      provider_message_id varchar(255),
      error_message text,
      attempts integer NOT NULL DEFAULT 1,
      last_attempt_at timestamp,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_dispatches_payrun ON email_dispatches(payrun_id, status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_email_dispatches_payslip ON email_dispatches(payslip_id);`;
  console.log('Verified table email_dispatches and its indexes');

  // 4. Safe backfill for leave_allocations
  const updatedAlloc = await sql`UPDATE leave_allocations SET status = 'approved' WHERE status IS NULL;`;
  console.log('Leave allocations backfill verified.');

  console.log('Migration completed successfully!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
