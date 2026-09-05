/**
 * PeoplePay360 — Deterministic Demo Seed
 * Run: npx tsx src/db/seed.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { addDays, format, subDays } from 'date-fns';

// Load env
import 'dotenv/config';
import { configDotenv } from 'dotenv';
configDotenv({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Starting seed...');

  // ── 1. Company ──────────────────────────────────────────────────
  const [company] = await db
    .insert(schema.companies)
    .values({
      name: 'Acme Corp',
      legalName: 'Acme Corporation Private Limited',
      taxId: 'AACCA1234C',
      email: 'hr@acmecorp.in',
      phone: '+91-80-4000-1234',
      address: '123 Tech Park, Whitefield',
      city: 'Bengaluru',
      country: 'India',
      currency: 'INR',
    })
    .returning();
  console.log(`✅ Company: ${company.name} (${company.id})`);

  // ── 2. Branch ───────────────────────────────────────────────────
  const [branch] = await db
    .insert(schema.branches)
    .values({
      companyId: company.id,
      name: 'Bengaluru HQ',
      city: 'Bengaluru',
      address: '123 Tech Park, Whitefield, Bengaluru - 560066',
    })
    .returning();

  // ── 3. Departments ───────────────────────────────────────────────
  const [engDept] = await db
    .insert(schema.departments)
    .values({
      companyId: company.id,
      branchId: branch.id,
      name: 'Engineering',
      code: 'ENG',
    })
    .returning();

  const [salesDept] = await db
    .insert(schema.departments)
    .values({
      companyId: company.id,
      branchId: branch.id,
      name: 'Sales',
      code: 'SAL',
    })
    .returning();
  console.log(`✅ Departments: Engineering, Sales`);

  // ── 4. Job Positions ─────────────────────────────────────────────
  const [softwareEngineerPos] = await db
    .insert(schema.jobPositions)
    .values({
      companyId: company.id,
      departmentId: engDept.id,
      title: 'Software Engineer',
      code: 'SWE',
    })
    .returning();

  const [salesExecPos] = await db
    .insert(schema.jobPositions)
    .values({
      companyId: company.id,
      departmentId: salesDept.id,
      title: 'Sales Executive',
      code: 'SALES-EX',
    })
    .returning();

  // ── 5. Working Schedule (Mon–Fri, 9:00–18:00, 1h break) ─────────
  const [schedule] = await db
    .insert(schema.workingSchedules)
    .values({
      companyId: company.id,
      name: 'Standard 40h/Week',
      hoursPerWeek: '40',
      timezone: 'Asia/Kolkata',
    })
    .returning();

  const workingDays: Array<typeof schema.dayOfWeekEnum.enumValues[number]> = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  ];
  for (const day of workingDays) {
    await db.insert(schema.scheduleLines).values({
      scheduleId: schedule.id,
      dayOfWeek: day,
      workFrom: '09:00:00',
      workTo: '18:00:00',
      breakDurationMinutes: 60,
      isWorkingDay: true,
    });
  }
  // Weekend
  for (const day of ['saturday', 'sunday'] as const) {
    await db.insert(schema.scheduleLines).values({
      scheduleId: schedule.id,
      dayOfWeek: day,
      workFrom: '09:00:00',
      workTo: '09:00:00',
      breakDurationMinutes: 0,
      isWorkingDay: false,
    });
  }
  console.log(`✅ Working Schedule: ${schedule.name}`);

  // ── 6. Salary Structure ──────────────────────────────────────────
  const [structure] = await db
    .insert(schema.salaryStructures)
    .values({
      companyId: company.id,
      name: 'Standard Monthly',
      code: 'STD-MONTHLY',
      description: 'Standard monthly salary structure with HRA and LOP deduction',
    })
    .returning();

  // 7 Sequential Salary Rules
  const rules = [
    {
      sequence: 10,
      code: 'BASIC',
      name: 'Basic Salary',
      category: 'BASIC' as const,
      formulaExpression: 'contract.wage',
      conditionExpression: 'true',
    },
    {
      sequence: 20,
      code: 'HRA',
      name: 'House Rent Allowance',
      category: 'ALW' as const,
      formulaExpression: 'categories.BASIC * 0.40',
      conditionExpression: 'true',
    },
    {
      sequence: 30,
      code: 'OTHER_ALW',
      name: 'Other Allowance',
      category: 'ALW' as const,
      formulaExpression: '200',
      conditionExpression: 'true',
    },
    {
      sequence: 40,
      code: 'GROSS',
      name: 'Gross Salary',
      category: 'GROSS' as const,
      formulaExpression: 'categories.BASIC + categories.ALW',
      conditionExpression: 'true',
    },
    {
      sequence: 50,
      code: 'UNPAID_LEAVE_DED',
      name: 'Unpaid Leave Deduction',
      category: 'DED' as const,
      formulaExpression: '(contract.wage / 30) * loss_of_pay_days',
      conditionExpression: 'loss_of_pay_days > 0',
    },
    {
      sequence: 60,
      code: 'OTHER_DED',
      name: 'Other Deductions',
      category: 'DED' as const,
      formulaExpression: '50',
      conditionExpression: 'true',
    },
    {
      sequence: 70,
      code: 'NET',
      name: 'Net Pay',
      category: 'NET' as const,
      formulaExpression: 'categories.GROSS - categories.DED',
      conditionExpression: 'true',
    },
  ];

  for (const rule of rules) {
    await db.insert(schema.salaryRules).values({
      salaryStructureId: structure.id,
      ...rule,
      computationType: 'formula',
    });
  }
  console.log(`✅ Salary Structure: ${structure.name} with 7 rules`);

  // ── 8. Leave Types ───────────────────────────────────────────────
  const [annualLeave] = await db
    .insert(schema.leaveTypes)
    .values({
      companyId: company.id,
      name: 'Annual Leave',
      code: 'AL',
      isPaid: true,
      maxDaysPerYear: 21,
    })
    .returning();

  const [sickLeave] = await db
    .insert(schema.leaveTypes)
    .values({
      companyId: company.id,
      name: 'Sick Leave',
      code: 'SL',
      isPaid: true,
      maxDaysPerYear: 12,
    })
    .returning();

  // ── 9. Employees ─────────────────────────────────────────────────
  const [john] = await db
    .insert(schema.employees)
    .values({
      companyId: company.id,
      branchId: branch.id,
      departmentId: engDept.id,
      jobPositionId: softwareEngineerPos.id,
      defaultScheduleId: schedule.id,
      employeeCode: 'EMP001',
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acmecorp.in',
      phone: '+91-98765-43210',
      dateOfJoining: '2022-01-15',
      employmentType: 'full_time',
      gender: 'male',
      panNumber: 'AAAPJ1234C',
      bankName: 'HDFC Bank',
      bankAccountNumber: '50100123456789',
      bankIfscCode: 'HDFC0001234',
      bankBranch: 'Whitefield',
    })
    .returning();

  const [priya] = await db
    .insert(schema.employees)
    .values({
      companyId: company.id,
      branchId: branch.id,
      departmentId: salesDept.id,
      jobPositionId: salesExecPos.id,
      defaultScheduleId: schedule.id,
      employeeCode: 'EMP002',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@acmecorp.in',
      phone: '+91-99887-65432',
      dateOfJoining: '2022-06-01',
      employmentType: 'full_time',
      gender: 'female',
      panNumber: 'BBBPS5678D',
      bankName: 'ICICI Bank',
      bankAccountNumber: '123400056789',
      bankIfscCode: 'ICIC0001234',
      bankBranch: 'Indiranagar',
    })
    .returning();
  console.log(`✅ Employees: John Smith, Priya Sharma`);

  // ── 10. Active Contracts ─────────────────────────────────────────
  await db.insert(schema.contracts).values({
    employeeId: john.id,
    salaryStructureId: structure.id,
    scheduleId: schedule.id,
    name: 'John Smith — Full-Time Contract',
    startDate: '2022-01-15',
    wage: '85000',
    status: 'active',
  });

  await db.insert(schema.contracts).values({
    employeeId: priya.id,
    salaryStructureId: structure.id,
    scheduleId: schedule.id,
    name: 'Priya Sharma — Full-Time Contract',
    startDate: '2022-06-01',
    wage: '70000',
    status: 'active',
  });
  console.log(`✅ Contracts: Active for both employees`);

  // ── 11. Attendance — Last 30 Days (July 2025) ────────────────────
  const attendancePeriodStart = new Date('2025-07-01');
  const attendancePeriodEnd = new Date('2025-07-31');

  for (const emp of [john, priya]) {
    let d = attendancePeriodStart;
    while (d <= attendancePeriodEnd) {
      const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = format(d, 'yyyy-MM-dd');

      // Skip weekends
      if (!isWeekend) {
        // John: absent on 15th (LOP), Priya: absent on 20th
        const isAbsent =
          (emp.id === john.id && dateStr === '2025-07-15') ||
          (emp.id === priya.id && dateStr === '2025-07-20');

        await db.insert(schema.attendances).values({
          employeeId: emp.id,
          attendanceDate: dateStr,
          checkIn: isAbsent ? undefined : new Date(`${dateStr}T09:00:00.000Z`),
          checkOut: isAbsent ? undefined : new Date(`${dateStr}T18:00:00.000Z`),
          workedHours: isAbsent ? '0' : '8',
          overtimeHours: '0',
          status: isAbsent ? 'absent' : 'present',
        }).onConflictDoNothing();
      }

      d = addDays(d, 1);
    }
  }
  console.log(`✅ Attendance: July 2025 records created`);

  // ── 12. Leave Allocations ────────────────────────────────────────
  await db.insert(schema.leaveAllocations).values([
    { employeeId: john.id, leaveTypeId: annualLeave.id, year: 2025, totalDays: '21', usedDays: '2' },
    { employeeId: john.id, leaveTypeId: sickLeave.id, year: 2025, totalDays: '12', usedDays: '0' },
    { employeeId: priya.id, leaveTypeId: annualLeave.id, year: 2025, totalDays: '21', usedDays: '1' },
    { employeeId: priya.id, leaveTypeId: sickLeave.id, year: 2025, totalDays: '12', usedDays: '0' },
  ]);

  // ── 13. Approved Leave Request (John: 2 days in June) ───────────
  await db.insert(schema.leaveRequests).values({
    employeeId: john.id,
    leaveTypeId: annualLeave.id,
    startDate: '2025-06-09',
    endDate: '2025-06-10',
    numberOfDays: '2',
    reason: 'Family vacation',
    status: 'approved',
    approvedAt: new Date('2025-06-05'),
  });
  console.log(`✅ Leave: Approved leave for John`);

  // ── 14. Auth Users ───────────────────────────────────────────────
  const adminHash = bcrypt.hashSync('admin123', 12);
  const employeeHash = bcrypt.hashSync('employee123', 12);

  await db.insert(schema.users).values([
    {
      companyId: company.id,
      email: 'admin@peoplepay360.com',
      passwordHash: adminHash,
      role: 'admin',
      isActive: true,
    },
    {
      companyId: company.id,
      employeeId: priya.id,
      email: 'hrmanager@peoplepay360.com',
      passwordHash: bcrypt.hashSync('hrmanager123', 12),
      role: 'hr_manager',
      isActive: true,
    },
    {
      companyId: company.id,
      email: 'payrolluser@peoplepay360.com',
      passwordHash: bcrypt.hashSync('payrolluser123', 12),
      role: 'hr_payroll_user',
      isActive: true,
    },
    {
      companyId: company.id,
      email: 'payroll@peoplepay360.com',
      passwordHash: bcrypt.hashSync('payroll123', 12),
      role: 'hr_payroll_manager',
      isActive: true,
    },
    {
      companyId: company.id,
      employeeId: john.id,
      email: 'john@peoplepay360.com',
      passwordHash: employeeHash,
      role: 'employee',
      isActive: true,
    },
  ]);
  console.log(`✅ Users: 5 roles initialized (Admin, HR Manager, HR Payroll User, HR Payroll Manager, Employee)`);

  console.log('\n🎉 Seed complete!');
  console.log('─'.repeat(50));
  console.log('Login credentials:');
  console.log('  1. Employee:           john@peoplepay360.com        / employee123');
  console.log('  2. HR Manager:         hrmanager@peoplepay360.com   / hrmanager123');
  console.log('  3. HR Payroll User:    payrolluser@peoplepay360.com / payrolluser123');
  console.log('  4. HR Payroll Manager: payroll@peoplepay360.com     / payroll123');
  console.log('  5. Admin:              admin@peoplepay360.com       / admin123');
  console.log('─'.repeat(50));
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
