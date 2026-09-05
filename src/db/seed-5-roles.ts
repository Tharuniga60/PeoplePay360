import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import 'dotenv/config';
import { configDotenv } from 'dotenv';
configDotenv({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log('🔄 Ensuring 5 demo users exist with active status and correct roles...');

  const [company] = await db.select().from(schema.companies).limit(1);
  if (!company) {
    console.error('No company found!');
    return;
  }

  const allEmployees = await db.select().from(schema.employees);
  console.log(`Found ${allEmployees.length} employees`);

  const john = allEmployees.find(e => e.email.includes('john') || e.firstName === 'John') || allEmployees[0];
  const priya = allEmployees.find(e => e.email.includes('priya') || e.firstName === 'Priya') || allEmployees[1] || allEmployees[0];

  const demoAccounts = [
    {
      email: 'admin@peoplepay360.com',
      password: 'admin123',
      role: 'admin' as const,
      employeeId: null,
    },
    {
      email: 'hrmanager@peoplepay360.com',
      password: 'hrmanager123',
      role: 'hr_manager' as const,
      employeeId: priya?.id ?? null,
    },
    {
      email: 'payrolluser@peoplepay360.com',
      password: 'payrolluser123',
      role: 'hr_payroll_user' as const,
      employeeId: null,
    },
    {
      email: 'payroll@peoplepay360.com',
      password: 'payroll123',
      role: 'hr_payroll_manager' as const,
      employeeId: null,
    },
    {
      email: 'john@peoplepay360.com',
      password: 'employee123',
      role: 'employee' as const,
      employeeId: john?.id ?? null,
    },
  ];

  for (const acc of demoAccounts) {
    const passwordHash = bcrypt.hashSync(acc.password, 12);
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, acc.email));

    if (existing) {
      await db
        .update(schema.users)
        .set({
          passwordHash,
          role: acc.role,
          isActive: true,
          employeeId: acc.employeeId,
          companyId: company.id,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existing.id));
      console.log(`✅ Updated existing user: ${acc.email} (${acc.role})`);
    } else {
      await db.insert(schema.users).values({
        companyId: company.id,
        email: acc.email,
        passwordHash,
        role: acc.role,
        isActive: true,
        employeeId: acc.employeeId,
      });
      console.log(`✅ Created user: ${acc.email} (${acc.role})`);
    }
  }

  console.log('🎉 All 5 roles verified and ready!');
}

main().catch(console.error);
