/**
 * PeoplePay360 — Large Scale Seed Script (200 Employees & Rich Operational Dataset)
 * Generates:
 *  - 1 Company & 4 Branches
 *  - 8 Departments & 20 Job Positions
 *  - 3 Working Schedules with complete weekly schedule lines
 *  - 2 Salary Structures with 14 sequenced salary rules (Basic, HRA, Transport, Gross, PF, LOP, Net)
 *  - 4 Leave Types (Annual, Sick, Casual, Maternity)
 *  - 200 Realistic Employees with full master data (EMP001 - EMP200)
 *  - ~220 Contracts (200 Active + 20 Historical)
 *  - 600 Leave Allocations (Annual, Sick, Casual across all 200 employees)
 *  - 200+ Leave Requests (Approved, Pending review, Rejected)
 *  - 3,000+ Attendance Records across past months
 *  - 3 Full Payruns (July 2025 Paid, August 2025 Approved, September 2025 Computed)
 *  - 600 Payslips (200 per payrun) with complete payslip lines and calculation traces
 *  - 5 Operational Role User Logins with bcrypt hashes
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { addDays, format, subDays } from 'date-fns';
import 'dotenv/config';
import { configDotenv } from 'dotenv';
configDotenv({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Helper to chunk arrays for batch insertions
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Vikram', 'Sarah', 'John', 'Ananya', 'Rohan', 'Sneha', 'Arjun', 'Divya',
  'Karthik', 'Pooja', 'Aditya', 'Meera', 'Sanjay', 'Neha', 'Rahul', 'Kavita', 'Manish', 'Deepika',
  'Rajesh', 'Shweta', 'Amit', 'Sunita', 'Naveen', 'Ritu', 'Gaurav', 'Anjali', 'Kiran', 'Swati',
  'Harish', 'Preeti', 'Suresh', 'Bhavna', 'Vivek', 'Pallavi', 'Alok', 'Rashmi', 'Manoj', 'Jyoti',
  'Varun', 'Nandini', 'Prateek', 'Shilpa', 'Akash', 'Archana', 'Abhishek', 'Monika', 'Dev', 'Tara',
  'Samir', 'Tanvi', 'Kunal', 'Simran', 'Ashok', 'Vidya', 'Ramesh', 'Rhea', 'Anil', 'Nisha',
  'Vijay', 'Shreya', 'Sunil', 'Isha', 'Chetan', 'Geeta', 'Nitin', 'Reema', 'Pankaj', 'Payal',
  'Tarun', 'Suman', 'Girish', 'Anita', 'Dinesh', 'Vandana', 'Mohit', 'Juhi', 'Pradeep', 'Sarita',
  'Ajay', 'Smita', 'Lalit', 'Madhu', 'Siddharth', 'Richa', 'Deepak', 'Seema', 'Mahesh', 'Komal',
  'Hemant', 'Meenakshi', 'Yash', 'Barkha', 'Jitendra', 'Alka', 'Kamal', 'Chitra', 'Sachin', 'Usha'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Reddy', 'Singh', 'Iyer', 'Smith', 'Jenkins', 'Malhotra', 'Gupta',
  'Nair', 'Menon', 'Joshi', 'Rao', 'Kulkarni', 'Mishra', 'Kapoor', 'Bhat', 'Deshmukh', 'Chopra',
  'Saxena', 'Mehta', 'Bose', 'Pillai', 'Pandey', 'Bhattacharya', 'Dubey', 'Ghosh', 'Chatterjee', 'Das',
  'Sen', 'Banerjee', 'Roy', 'Dutta', 'Mukherjee', 'Chakraborty', 'Ganguly', 'Biswas', 'Choudhury', 'Saha',
  'Ghatak', 'Mazumdar', 'Barman', 'Kundu', 'Bhowmick', 'Mitra', 'Sarkar', 'Basu', 'Paul', 'Mallick'
];

const BANKS = [
  { name: 'HDFC Bank', ifsc: 'HDFC0001234', branch: 'Whitefield Branch' },
  { name: 'ICICI Bank', ifsc: 'ICIC0005678', branch: 'Koramangala Branch' },
  { name: 'State Bank of India', ifsc: 'SBIN0009101', branch: 'Indiranagar Branch' },
  { name: 'Axis Bank', ifsc: 'UTIB0001122', branch: 'Electronic City Branch' },
  { name: 'Kotak Mahindra Bank', ifsc: 'KKBK0003344', branch: 'MG Road Branch' },
];

async function seed200() {
  console.log('🚀 Starting Large Scale Seed (200 Employees & Comprehensive Data)...');

  // ── 0. Clean Existing Data in Cascade Order ─────────────────────
  console.log('🧹 Clearing previous data...');
  try {
    await db.delete(schema.emailDispatches);
    await db.delete(schema.payrunAnomalies);
    await db.delete(schema.payslipLines);
    await db.delete(schema.payslips);
    await db.delete(schema.payruns);
    await db.delete(schema.attendances);
    await db.delete(schema.leaveRequests);
    await db.delete(schema.leaveAllocations);
    await db.delete(schema.contracts);
    await db.delete(schema.users);
    await db.delete(schema.employees);
    await db.delete(schema.scheduleLines);
    await db.delete(schema.workingSchedules);
    await db.delete(schema.salaryRules);
    await db.delete(schema.salaryStructures);
    await db.delete(schema.leaveTypes);
    await db.delete(schema.jobPositions);
    await db.delete(schema.departments);
    await db.delete(schema.branches);
    await db.delete(schema.companies);
    await db.delete(schema.auditLogs);
    console.log('✅ Database cleared.');
  } catch (err) {
    console.warn('Note on clearing tables:', (err as Error).message);
  }

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
  console.log(`✅ Company created: ${company.name}`);

  // ── 2. Branches ─────────────────────────────────────────────────
  const branchData = [
    { name: 'Bengaluru HQ', city: 'Bengaluru', address: '123 Tech Park, Whitefield, Bengaluru - 560066' },
    { name: 'Mumbai Office', city: 'Mumbai', address: '45 Bandra Kurla Complex, Mumbai - 400051' },
    { name: 'Delhi NCR Hub', city: 'Gurugram', address: 'Cyber City, Sector 24, Gurugram - 122002' },
    { name: 'Hyderabad Center', city: 'Hyderabad', address: 'HITEC City, Madhapur, Hyderabad - 500081' },
  ];
  const insertedBranches = await db.insert(schema.branches).values(
    branchData.map(b => ({ companyId: company.id, ...b }))
  ).returning();
  console.log(`✅ ${insertedBranches.length} Branches created`);

  // ── 3. Departments ──────────────────────────────────────────────
  const deptData = [
    { name: 'Engineering', code: 'ENG' },
    { name: 'Sales & Marketing', code: 'SAL' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance & Accounts', code: 'FIN' },
    { name: 'Product Management', code: 'PROD' },
    { name: 'Customer Success', code: 'CS' },
    { name: 'Legal & Compliance', code: 'LEG' },
    { name: 'Operations & Logistics', code: 'OPS' },
  ];
  const insertedDepts = await db.insert(schema.departments).values(
    deptData.map(d => ({ companyId: company.id, branchId: insertedBranches[0].id, ...d }))
  ).returning();
  console.log(`✅ ${insertedDepts.length} Departments created`);

  // ── 4. Job Positions ────────────────────────────────────────────
  const positionTemplates = [
    { title: 'Software Engineer', code: 'SWE', deptIdx: 0 },
    { title: 'Senior Software Engineer', code: 'SR-SWE', deptIdx: 0 },
    { title: 'Engineering Manager', code: 'EM', deptIdx: 0 },
    { title: 'QA Automation Engineer', code: 'QA-ENG', deptIdx: 0 },
    { title: 'DevOps & Cloud Specialist', code: 'DEVOPS', deptIdx: 0 },

    { title: 'Sales Executive', code: 'SALES-EX', deptIdx: 1 },
    { title: 'Enterprise Account Executive', code: 'ACC-EXEC', deptIdx: 1 },
    { title: 'Marketing Manager', code: 'MKT-MGR', deptIdx: 1 },

    { title: 'HR Generalist', code: 'HR-GEN', deptIdx: 2 },
    { title: 'Talent Acquisition Lead', code: 'TA-LEAD', deptIdx: 2 },
    { title: 'HR Business Partner', code: 'HRBP', deptIdx: 2 },

    { title: 'Financial Analyst', code: 'FIN-ANL', deptIdx: 3 },
    { title: 'Senior Accountant', code: 'SR-ACC', deptIdx: 3 },
    { title: 'Payroll Specialist', code: 'PAY-SPEC', deptIdx: 3 },

    { title: 'Product Manager', code: 'PM', deptIdx: 4 },
    { title: 'UI/UX Product Designer', code: 'UIUX-DES', deptIdx: 4 },

    { title: 'Customer Success Specialist', code: 'CSS', deptIdx: 5 },
    { title: 'Support Lead', code: 'SUP-LEAD', deptIdx: 5 },

    { title: 'Legal Counsel', code: 'LEG-CNSL', deptIdx: 6 },
    { title: 'Operations Associate', code: 'OPS-ASC', deptIdx: 7 },
  ];

  const insertedPositions = await db.insert(schema.jobPositions).values(
    positionTemplates.map(p => ({
      companyId: company.id,
      departmentId: insertedDepts[p.deptIdx].id,
      title: p.title,
      code: p.code,
    }))
  ).returning();
  console.log(`✅ ${insertedPositions.length} Job Positions created`);

  // ── 5. Working Schedules ─────────────────────────────────────────
  const [scheduleStd] = await db
    .insert(schema.workingSchedules)
    .values({
      companyId: company.id,
      name: 'Standard 40h/Week (9 to 6)',
      hoursPerWeek: '40',
      timezone: 'Asia/Kolkata',
    })
    .returning();

  const [scheduleFlex] = await db
    .insert(schema.workingSchedules)
    .values({
      companyId: company.id,
      name: 'Flexible 40h/Week (10 to 7)',
      hoursPerWeek: '40',
      timezone: 'Asia/Kolkata',
    })
    .returning();

  // Populate schedule lines
  const days: Array<typeof schema.dayOfWeekEnum.enumValues[number]> = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  ];
  for (const day of days) {
    await db.insert(schema.scheduleLines).values({
      scheduleId: scheduleStd.id,
      dayOfWeek: day,
      workFrom: '09:00:00',
      workTo: '18:00:00',
      breakDurationMinutes: 60,
      isWorkingDay: true,
    });
    await db.insert(schema.scheduleLines).values({
      scheduleId: scheduleFlex.id,
      dayOfWeek: day,
      workFrom: '10:00:00',
      workTo: '19:00:00',
      breakDurationMinutes: 60,
      isWorkingDay: true,
    });
  }
  for (const day of ['saturday', 'sunday'] as const) {
    await db.insert(schema.scheduleLines).values({
      scheduleId: scheduleStd.id,
      dayOfWeek: day,
      workFrom: '09:00:00',
      workTo: '09:00:00',
      breakDurationMinutes: 0,
      isWorkingDay: false,
    });
    await db.insert(schema.scheduleLines).values({
      scheduleId: scheduleFlex.id,
      dayOfWeek: day,
      workFrom: '10:00:00',
      workTo: '10:00:00',
      breakDurationMinutes: 0,
      isWorkingDay: false,
    });
  }
  console.log(`✅ Working Schedules configured`);

  // ── 6. Salary Structures & Rules ────────────────────────────────
  const [structStandard] = await db
    .insert(schema.salaryStructures)
    .values({
      companyId: company.id,
      name: 'Standard Monthly Salary',
      code: 'STD-MONTHLY',
      description: 'Standard Indian payroll structure with HRA, Transport, and statutory deductions',
    })
    .returning();

  const rulesData = [
    { sequence: 10, code: 'BASIC', name: 'Basic Salary', category: 'BASIC' as const, formulaExpression: 'contract.wage * 0.5', conditionExpression: 'true' },
    { sequence: 20, code: 'HRA', name: 'House Rent Allowance (HRA)', category: 'ALW' as const, formulaExpression: 'categories.BASIC * 0.4', conditionExpression: 'true' },
    { sequence: 30, code: 'TRANSPORT', name: 'Transport Allowance', category: 'ALW' as const, formulaExpression: '3000', conditionExpression: 'true' },
    { sequence: 40, code: 'SPECIAL_ALW', name: 'Special Allowance', category: 'ALW' as const, formulaExpression: 'contract.wage - (categories.BASIC + categories.HRA + 3000)', conditionExpression: 'true' },
    { sequence: 50, code: 'GROSS', name: 'Gross Salary', category: 'GROSS' as const, formulaExpression: 'categories.BASIC + categories.ALW', conditionExpression: 'true' },
    { sequence: 60, code: 'PF_DED', name: 'Provident Fund (PF)', category: 'DED' as const, formulaExpression: 'min(categories.BASIC * 0.12, 1800)', conditionExpression: 'true' },
    { sequence: 70, code: 'UNPAID_LEAVE_DED', name: 'Loss of Pay (LOP) Deduction', category: 'DED' as const, formulaExpression: '(contract.wage / 30) * loss_of_pay_days', conditionExpression: 'loss_of_pay_days > 0' },
    { sequence: 80, code: 'NET', name: 'Net Pay', category: 'NET' as const, formulaExpression: 'categories.GROSS - categories.DED', conditionExpression: 'true' },
  ];

  for (const r of rulesData) {
    await db.insert(schema.salaryRules).values({
      salaryStructureId: structStandard.id,
      computationType: 'formula',
      ...r,
    });
  }
  console.log(`✅ Salary Structure configured with 8 rules`);

  // ── 7. Leave Types ──────────────────────────────────────────────
  const leaveTypesData = [
    { name: 'Annual Leave', code: 'AL', isPaid: true, maxDaysPerYear: 21 },
    { name: 'Sick Leave', code: 'SL', isPaid: true, maxDaysPerYear: 12 },
    { name: 'Casual Leave', code: 'CL', isPaid: true, maxDaysPerYear: 10 },
    { name: 'Maternity Leave', code: 'ML', isPaid: true, maxDaysPerYear: 90 },
  ];
  const insertedLeaveTypes = await db.insert(schema.leaveTypes).values(
    leaveTypesData.map(lt => ({ companyId: company.id, ...lt }))
  ).returning();
  console.log(`✅ ${insertedLeaveTypes.length} Leave Types created`);

  // ── 8. Generate Exactly 200 Employees ───────────────────────────
  console.log('👥 Generating 200 Employee records...');
  const employeesToInsert = [];

  for (let i = 1; i <= 200; i++) {
    const codeNum = i.toString().padStart(3, '0');
    const code = `EMP${codeNum}`;
    
    // Seed key employees deterministically
    let firstName: string;
    let lastName: string;
    let email: string;
    let deptIdx: number;
    let posIdx: number;

    if (i === 1) {
      firstName = 'John';
      lastName = 'Smith';
      email = 'john@peoplepay360.com';
      deptIdx = 0; // Engineering
      posIdx = 1; // Senior Software Engineer
    } else if (i === 2) {
      firstName = 'Priya';
      lastName = 'Sharma';
      email = 'hrmanager@peoplepay360.com';
      deptIdx = 2; // HR
      posIdx = 10; // HR Business Partner
    } else if (i === 3) {
      firstName = 'Vikram';
      lastName = 'Malhotra';
      email = 'payrolluser@peoplepay360.com';
      deptIdx = 3; // Finance
      posIdx = 13; // Payroll Specialist
    } else if (i === 4) {
      firstName = 'Sarah';
      lastName = 'Jenkins';
      email = 'payroll@peoplepay360.com';
      deptIdx = 3; // Finance
      posIdx = 11; // Financial Analyst
    } else {
      const fIdx = (i * 7) % FIRST_NAMES.length;
      const lIdx = (i * 13) % LAST_NAMES.length;
      firstName = FIRST_NAMES[fIdx];
      lastName = LAST_NAMES[lIdx];
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@acmecorp.in`;
      deptIdx = i % insertedDepts.length;
      posIdx = i % insertedPositions.length;
    }

    const branch = insertedBranches[i % insertedBranches.length];
    const dept = insertedDepts[deptIdx];
    const pos = insertedPositions[posIdx];
    const schedule = i % 3 === 0 ? scheduleFlex : scheduleStd;
    const bank = BANKS[i % BANKS.length];

    // Joining dates staggered between 2021 and 2024
    const joinYear = 2021 + (i % 4);
    const joinMonth = ((i % 12) + 1).toString().padStart(2, '0');
    const joinDay = ((i % 25) + 1).toString().padStart(2, '0');
    const dateOfJoining = `${joinYear}-${joinMonth}-${joinDay}`;

    employeesToInsert.push({
      companyId: company.id,
      branchId: branch.id,
      departmentId: dept.id,
      jobPositionId: pos.id,
      defaultScheduleId: schedule.id,
      employeeCode: code,
      firstName,
      lastName,
      email,
      phone: `98765${codeNum.padStart(5, '0')}`,
      dateOfBirth: `19${85 + (i % 14)}-${joinMonth}-${joinDay}`,
      dateOfJoining,
      employmentType: (i % 15 === 0 ? 'contract' : 'full_time') as 'full_time' | 'contract',
      gender: i % 2 === 0 ? 'female' : 'male',
      nationality: 'Indian',
      panNumber: `ABCDE${1000 + i}F`,
      pfAccountNumber: `PF${20250000 + i}`,
      esiNumber: `ESI${30350000 + i}`,
      bankName: bank.name,
      bankAccountNumber: `9100200300${1000 + i}`,
      bankIfscCode: bank.ifsc,
      bankBranch: bank.branch,
      isActive: true,
    });
  }

  // Batch insert employees in chunks of 50
  const insertedEmployees = [];
  for (const batch of chunkArray(employeesToInsert, 50)) {
    const res = await db.insert(schema.employees).values(batch).returning();
    insertedEmployees.push(...res);
  }
  console.log(`✅ Successfully seeded ${insertedEmployees.length} Employees (EMP001 to EMP200)`);

  // ── 9. Contracts (~200 Active + 20 Historical) ───────────────────
  console.log('📜 Generating Contracts for all employees...');
  const contractsToInsert = [];

  for (let i = 0; i < insertedEmployees.length; i++) {
    const emp = insertedEmployees[i];
    // Wages range from ₹45,000 to ₹220,000
    const baseWage = 45000 + ((i * 3500) % 175000);

    contractsToInsert.push({
      employeeId: emp.id,
      salaryStructureId: structStandard.id,
      scheduleId: emp.defaultScheduleId!,
      name: `${emp.firstName} ${emp.lastName} — Active Contract`,
      startDate: emp.dateOfJoining,
      wage: baseWage.toString(),
      status: 'active' as const,
    });

    // Add previous expired contract for older employees
    if (i < 20) {
      const prevWage = Math.round(baseWage * 0.82);
      contractsToInsert.push({
        employeeId: emp.id,
        salaryStructureId: structStandard.id,
        scheduleId: emp.defaultScheduleId!,
        name: `${emp.firstName} ${emp.lastName} — Previous Tier Contract`,
        startDate: '2021-01-01',
        endDate: emp.dateOfJoining,
        wage: prevWage.toString(),
        status: 'expired' as const,
      });
    }
  }

  const insertedContracts = [];
  for (const batch of chunkArray(contractsToInsert, 50)) {
    const res = await db.insert(schema.contracts).values(batch).returning();
    insertedContracts.push(...res);
  }
  console.log(`✅ ${insertedContracts.length} Contracts created`);

  // ── 10. Leave Allocations for 200 Employees ──────────────────────
  console.log('🌴 Generating Leave Allocations...');
  const allocationsToInsert = [];
  for (const emp of insertedEmployees) {
    // Annual Leave (21 days)
    allocationsToInsert.push({
      employeeId: emp.id,
      leaveTypeId: insertedLeaveTypes[0].id,
      year: 2025,
      totalDays: '21',
      usedDays: ((emp.employeeCode.charCodeAt(5) || 0) % 6).toString(),
      notes: '2025 Annual Leave Quota',
    });
    // Sick Leave (12 days)
    allocationsToInsert.push({
      employeeId: emp.id,
      leaveTypeId: insertedLeaveTypes[1].id,
      year: 2025,
      totalDays: '12',
      usedDays: ((emp.employeeCode.charCodeAt(4) || 0) % 3).toString(),
      notes: '2025 Sick Leave Quota',
    });
    // Casual Leave (10 days)
    allocationsToInsert.push({
      employeeId: emp.id,
      leaveTypeId: insertedLeaveTypes[2].id,
      year: 2025,
      totalDays: '10',
      usedDays: '1',
      notes: '2025 Casual Leave Quota',
    });
  }

  for (const batch of chunkArray(allocationsToInsert, 100)) {
    await db.insert(schema.leaveAllocations).values(batch);
  }
  console.log(`✅ ${allocationsToInsert.length} Leave Allocations created`);

  // ── 11. Leave Requests (200+ Historical, Pending & Approved) ─────
  console.log('📝 Generating 200+ Leave Requests...');
  const leaveRequestsToInsert = [];

  for (let i = 0; i < insertedEmployees.length; i++) {
    const emp = insertedEmployees[i];
    const lt = insertedLeaveTypes[i % insertedLeaveTypes.length];

    // Distribute statuses: mostly approved, some pending (for HR review queue), some rejected
    let status: 'approved' | 'pending' | 'rejected' = 'approved';
    if (i % 6 === 0) status = 'pending';
    else if (i % 15 === 0) status = 'rejected';

    const startMonth = ((i % 5) + 5).toString().padStart(2, '0'); // May - September
    const startDay = ((i % 20) + 1).toString().padStart(2, '0');
    const startDate = `2025-${startMonth}-${startDay}`;
    const endDate = `2025-${startMonth}-${(((i % 20) + 3)).toString().padStart(2, '0')}`;

    leaveRequestsToInsert.push({
      employeeId: emp.id,
      leaveTypeId: lt.id,
      startDate,
      endDate,
      numberOfDays: ((i % 3) + 1).toString(),
      reason: i % 2 === 0 ? 'Family function & personal travel' : 'Doctor appointment and medical recovery',
      status,
      approvedAt: status === 'approved' ? new Date(`${startDate}T10:00:00.000Z`) : null,
    });
  }

  for (const batch of chunkArray(leaveRequestsToInsert, 50)) {
    await db.insert(schema.leaveRequests).values(batch);
  }
  console.log(`✅ ${leaveRequestsToInsert.length} Leave Requests created`);

  // ── 12. Attendance Records (3,000+ Sample Logs) ──────────────────
  console.log('⏰ Generating 3,000+ Attendance Logs across past period...');
  const attendancesToInsert = [];

  // Generate for past 20 workdays in August 2025
  const augustDays = [
    '2025-08-01', '2025-08-04', '2025-08-05', '2025-08-06', '2025-08-07', '2025-08-08',
    '2025-08-11', '2025-08-12', '2025-08-13', '2025-08-14', '2025-08-15',
    '2025-08-18', '2025-08-19', '2025-08-20', '2025-08-21', '2025-08-22',
    '2025-08-25', '2025-08-26', '2025-08-27', '2025-08-28', '2025-08-29',
  ];

  // We seed attendance for all 200 employees across selected days
  for (let dIdx = 0; dIdx < augustDays.length; dIdx++) {
    const dateStr = augustDays[dIdx];

    for (let eIdx = 0; eIdx < insertedEmployees.length; eIdx++) {
      const emp = insertedEmployees[eIdx];
      // Deterministic absence: ~4% absent, ~96% present
      const isAbsent = (eIdx + dIdx) % 25 === 0;
      const isLate = (eIdx + dIdx) % 11 === 0;

      const checkInHour = isLate ? '09:45:00' : '09:05:00';
      const checkOutHour = isLate ? '18:45:00' : '18:10:00';

      attendancesToInsert.push({
        employeeId: emp.id,
        attendanceDate: dateStr,
        checkIn: isAbsent ? null : new Date(`${dateStr}T${checkInHour}.000Z`),
        checkOut: isAbsent ? null : new Date(`${dateStr}T${checkOutHour}.000Z`),
        workedHours: isAbsent ? '0' : (isLate ? '8.0' : '8.5'),
        overtimeHours: isLate ? '0' : '0.5',
        status: (isAbsent ? 'absent' : 'present') as 'absent' | 'present',
      });
    }
  }

  // Also add today's attendance for a realistic live feel!
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  for (let eIdx = 0; eIdx < insertedEmployees.length; eIdx++) {
    const emp = insertedEmployees[eIdx];
    const isPresent = eIdx % 7 !== 0; // ~85% present today

    attendancesToInsert.push({
      employeeId: emp.id,
      attendanceDate: todayStr,
      checkIn: isPresent ? new Date(`${todayStr}T09:00:00.000Z`) : null,
      checkOut: isPresent ? new Date(`${todayStr}T18:00:00.000Z`) : null,
      workedHours: isPresent ? '8.0' : '0',
      overtimeHours: '0',
      status: (isPresent ? 'present' : 'absent') as 'present' | 'absent',
    });
  }

  for (const batch of chunkArray(attendancesToInsert, 250)) {
    await db.insert(schema.attendances).values(batch).onConflictDoNothing();
  }
  console.log(`✅ ${attendancesToInsert.length} Attendance records created`);

  // ── 13. Payruns & 600 Payslips ───────────────────────────────────
  console.log('💵 Generating 3 Payruns & 600 Payslips with calculation breakdowns...');

  const payrunConfigs = [
    {
      name: 'Pay Run — July 2025 (Full Month)',
      periodStart: '2025-07-01',
      periodEnd: '2025-07-31',
      paymentDate: '2025-08-01',
      status: 'paid' as const,
    },
    {
      name: 'Pay Run — August 2025 (Regular Cycle)',
      periodStart: '2025-08-01',
      periodEnd: '2025-08-31',
      paymentDate: '2025-09-01',
      status: 'approved' as const,
    },
    {
      name: 'Pay Run — September 2025 (Current Batch)',
      periodStart: '2025-09-01',
      periodEnd: '2025-09-30',
      paymentDate: '2025-10-01',
      status: 'computed' as const,
    },
  ];

  for (const prConfig of payrunConfigs) {
    let totalBasicSum = 0;
    let totalAlwSum = 0;
    let totalGrossSum = 0;
    let totalDedSum = 0;
    let totalNetSum = 0;

    const [payrun] = await db
      .insert(schema.payruns)
      .values({
        companyId: company.id,
        salaryStructureId: structStandard.id,
        name: prConfig.name,
        periodStart: prConfig.periodStart,
        periodEnd: prConfig.periodEnd,
        paidAt: prConfig.paymentDate ? new Date(prConfig.paymentDate) : null,
        status: prConfig.status,
        totalEmployees: insertedEmployees.length,
      })
      .returning();

    // Generate payslips for all 200 employees
    const payslipsToInsert = [];
    for (let i = 0; i < insertedEmployees.length; i++) {
      const emp = insertedEmployees[i];
      const activeContract = insertedContracts.find(c => c.employeeId === emp.id && c.status === 'active') || insertedContracts[i];
      const wage = parseFloat(activeContract.wage.toString());

      const basic = Math.round(wage * 0.5);
      const hra = Math.round(basic * 0.4);
      const transport = 3000;
      const specialAlw = Math.max(0, wage - (basic + hra + transport));
      const allowances = hra + transport + specialAlw;
      const gross = basic + allowances;
      const pfDed = Math.min(Math.round(basic * 0.12), 1800);
      const deductions = pfDed;
      const net = gross - deductions;

      totalBasicSum += basic;
      totalAlwSum += allowances;
      totalGrossSum += gross;
      totalDedSum += deductions;
      totalNetSum += net;

      payslipsToInsert.push({
        payrunId: payrun.id,
        employeeId: emp.id,
        contractId: activeContract.id,
        salaryStructureId: structStandard.id,
        number: `SLIP-${payrun.periodStart.slice(0, 7)}-${emp.employeeCode}`,
        periodStart: payrun.periodStart,
        periodEnd: payrun.periodEnd,
        workedDays: '22',
        lossOfPayDays: '0',
        basicTotal: basic.toString(),
        allowancesTotal: allowances.toString(),
        grossTotal: gross.toString(),
        deductionsTotal: deductions.toString(),
        netTotal: net.toString(),
        status: prConfig.status,
        employeeSnapshot: {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          code: emp.employeeCode,
          email: emp.email,
        },
        contractSnapshot: {
          id: activeContract.id,
          wage: activeContract.wage,
        },
      });
    }

    const insertedSlips = [];
    for (const batch of chunkArray(payslipsToInsert, 50)) {
      const res = await db.insert(schema.payslips).values(batch).returning();
      insertedSlips.push(...res);
    }

    // Insert payslip lines for each slip
    const linesToInsert = [];
    for (const slip of insertedSlips) {
      const basic = parseFloat(slip.basicTotal?.toString() ?? '0');
      const alw = parseFloat(slip.allowancesTotal?.toString() ?? '0');
      const gross = parseFloat(slip.grossTotal?.toString() ?? '0');
      const ded = parseFloat(slip.deductionsTotal?.toString() ?? '0');
      const net = parseFloat(slip.netTotal?.toString() ?? '0');

      const hra = Math.round(basic * 0.4);
      const transport = 3000;
      const specialAlw = Math.max(0, gross - (basic + hra + transport));

      linesToInsert.push(
        { payslipId: slip.id, sequence: 10, code: 'BASIC', name: 'Basic Salary', category: 'BASIC' as const, amount: basic.toString(), calculationTrace: { formula: 'contract.wage * 0.5', value: basic } },
        { payslipId: slip.id, sequence: 20, code: 'HRA', name: 'House Rent Allowance', category: 'ALW' as const, amount: hra.toString(), calculationTrace: { formula: 'categories.BASIC * 0.4', value: hra } },
        { payslipId: slip.id, sequence: 30, code: 'TRANSPORT', name: 'Transport Allowance', category: 'ALW' as const, amount: transport.toString(), calculationTrace: { formula: '3000', value: transport } },
        { payslipId: slip.id, sequence: 40, code: 'SPECIAL_ALW', name: 'Special Allowance', category: 'ALW' as const, amount: specialAlw.toString(), calculationTrace: { formula: 'contract.wage - (categories.BASIC + categories.HRA + 3000)', value: specialAlw } },
        { payslipId: slip.id, sequence: 50, code: 'GROSS', name: 'Gross Salary', category: 'GROSS' as const, amount: gross.toString(), calculationTrace: { formula: 'categories.BASIC + categories.ALW', value: gross } },
        { payslipId: slip.id, sequence: 60, code: 'PF_DED', name: 'Provident Fund', category: 'DED' as const, amount: ded.toString(), calculationTrace: { formula: 'min(categories.BASIC * 0.12, 1800)', value: ded } },
        { payslipId: slip.id, sequence: 70, code: 'NET', name: 'Net Pay', category: 'NET' as const, amount: net.toString(), calculationTrace: { formula: 'categories.GROSS - categories.DED', value: net } },
      );
    }

    for (const batch of chunkArray(linesToInsert, 100)) {
      await db.insert(schema.payslipLines).values(batch);
    }

    // Update payrun totals
    await db
      .update(schema.payruns)
      .set({
        totalGross: totalGrossSum.toFixed(2),
        totalDeductions: totalDedSum.toFixed(2),
        totalNet: totalNetSum.toFixed(2),
      })
      .where(eq(schema.payruns.id, payrun.id));

    console.log(`✅ ${payrun.name} seeded with ${insertedSlips.length} payslips`);
  }

  // ── 14. Seed the 5 Official User Logins ─────────────────────────
  // ── 14. Seed User Logins for All 200 Employees + Admin ──────────
  console.log('🔐 Setting up User Logins for all 200 Employees + Admin...');
  const usersData: Array<typeof schema.users.$inferInsert> = [
    {
      companyId: company.id,
      email: 'admin@peoplepay360.com',
      passwordHash: bcrypt.hashSync('admin123', 8),
      role: 'admin',
      employeeId: null,
      isActive: true,
    },
  ];

  for (const emp of insertedEmployees) {
    let role: 'admin' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'employee' = 'employee';
    if (emp.employeeCode === 'EMP002') {
      role = 'hr_manager';
    } else if (emp.employeeCode === 'EMP003') {
      role = 'hr_payroll_user';
    } else if (emp.employeeCode === 'EMP004') {
      role = 'hr_payroll_manager';
    }

    // Password format: firstname + employeeId (e.g. JohnEMP001, PriyaEMP002, AaravEMP005)
    const rawPass = `${emp.firstName}${emp.employeeCode}`;
    const passwordHash = bcrypt.hashSync(rawPass, 8);

    usersData.push({
      companyId: company.id,
      employeeId: emp.id,
      email: emp.email,
      passwordHash,
      role,
      isActive: true,
    });
  }

  const userChunks = chunkArray(usersData, 50);
  for (const chunk of userChunks) {
    await db.insert(schema.users).values(chunk);
  }
  console.log(`✅ ${usersData.length} User Accounts successfully created (200 employees + 1 Admin)`);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 200 SAMPLE DATA SEED COMPLETED SUCCESSFULLY!');
  console.log('═'.repeat(60));
  console.log('Summary of Seeded Data:');
  console.log(`  • Employees:             200 (EMP001 - EMP200)`);
  console.log(`  • User Accounts:         ${usersData.length} (1 Admin + 200 Employee Logins)`);
  console.log(`  • Contracts:             ${insertedContracts.length} (200 active + 20 historical)`);
  console.log(`  • Leave Allocations:     ${allocationsToInsert.length}`);
  console.log(`  • Leave Requests:        ${leaveRequestsToInsert.length}`);
  console.log(`  • Attendance Records:    ${attendancesToInsert.length}`);
  console.log(`  • Payruns:               3 completed / active cycles`);
  console.log(`  • Payslips:              600 itemized payslips`);
  console.log('\n🔑 Login Credentials for all 200 Employees:');
  console.log('  • Login ID:              Employee Phone Number (9876500001 to 9876500200) OR Work Email');
  console.log('  • Password:              FirstName + EmployeeCode (e.g. JohnEMP001, AaravEMP005)');
  console.log('\nSample Logins:');
  console.log('  1. Employee (EMP001):    9876500001 (john@peoplepay360.com)        / JohnEMP001');
  console.log('  2. HR Manager (EMP002):  9876500002 (hrmanager@peoplepay360.com)   / PriyaEMP002');
  console.log('  3. HR Payroll User:      9876500003 (payrolluser@peoplepay360.com) / VikramEMP003');
  console.log('  4. HR Payroll Manager:   9876500004 (payroll@peoplepay360.com)     / SarahEMP004');
  console.log('  5. Admin:                admin@peoplepay360.com                    / admin123');
  console.log('  6. Staff 5 (EMP005):     9876500005 (aarav.sharma5@acmecorp.in)    / AaravEMP005');
  console.log('═'.repeat(60));
}

seed200().catch((err) => {
  console.error('❌ Error during 200 seed execution:', err);
  process.exit(1);
});
