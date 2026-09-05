import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  date,
  timestamp,
  time,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const employmentTypeEnum = pgEnum('employment_type_enum', [
  'full_time',
  'part_time',
  'contract',
  'intern',
]);

export const contractStatusEnum = pgEnum('contract_status_enum', [
  'draft',
  'active',
  'expired',
  'cancelled',
]);

export const dayOfWeekEnum = pgEnum('day_of_week_enum', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const attendanceStatusEnum = pgEnum('attendance_status_enum', [
  'present',
  'absent',
  'half_day',
  'holiday',
  'weekend',
  'on_leave',
]);

export const leaveStatusEnum = pgEnum('leave_status_enum', [
  'draft',
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const ruleCategoryEnum = pgEnum('rule_category_enum', [
  'BASIC',
  'ALW',
  'GROSS',
  'DED',
  'NET',
  'OTHER',
]);

export const computationTypeEnum = pgEnum('computation_type_enum', [
  'fixed',
  'formula',
  'python_code',
]);

export const payrunStatusEnum = pgEnum('payrun_status_enum', [
  'draft',
  'computed',
  'validated',
  'approved',
  'paid',
  'cancelled',
]);

export const anomalySeverityEnum = pgEnum('anomaly_severity_enum', [
  'info',
  'warning',
  'critical',
]);

export const userRoleEnum = pgEnum('user_role_enum', [
  'employee',
  'hr_manager',
  'hr_payroll_user',
  'hr_payroll_manager',
  'admin',
]);

export const auditActionEnum = pgEnum('audit_action_enum', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'EXECUTE_PAYRUN',
  'APPROVE',
  'LOCK',
]);

// ─────────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────────

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }),
  taxId: varchar('tax_id', { length: 100 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }).default('India'),
  currency: varchar('currency', { length: 10 }).default('INR'),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// BRANCHES
// ─────────────────────────────────────────────

export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }),
  address: text('address'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  managerId: uuid('manager_id'), // self-ref resolved later via relations
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// JOB POSITIONS
// ─────────────────────────────────────────────

export const jobPositions = pgTable('job_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// WORKING SCHEDULES
// ─────────────────────────────────────────────

export const workingSchedules = pgTable('working_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  hoursPerWeek: numeric('hours_per_week', { precision: 5, scale: 2 }).notNull().default('40'),
  timezone: varchar('timezone', { length: 100 }).default('Asia/Kolkata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const scheduleLines = pgTable('schedule_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id')
    .notNull()
    .references(() => workingSchedules.id, { onDelete: 'cascade' }),
  dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),
  workFrom: time('work_from').notNull(),
  workTo: time('work_to').notNull(),
  breakDurationMinutes: integer('break_duration_minutes').notNull().default(60),
  isWorkingDay: boolean('is_working_day').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// HOLIDAY CALENDARS
// ─────────────────────────────────────────────

export const holidayCalendars = pgTable('holiday_calendars', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  holidayDate: date('holiday_date').notNull(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────────

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  jobPositionId: uuid('job_position_id').references(() => jobPositions.id, { onDelete: 'set null' }),
  defaultScheduleId: uuid('default_schedule_id').references(() => workingSchedules.id, { onDelete: 'set null' }),
  employeeCode: varchar('employee_code', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  dateOfBirth: date('date_of_birth'),
  dateOfJoining: date('date_of_joining').notNull(),
  dateOfLeaving: date('date_of_leaving'),
  employmentType: employmentTypeEnum('employment_type').notNull().default('full_time'),
  gender: varchar('gender', { length: 20 }),
  nationality: varchar('nationality', { length: 100 }),
  panNumber: varchar('pan_number', { length: 20 }),
  pfAccountNumber: varchar('pf_account_number', { length: 50 }),
  esiNumber: varchar('esi_number', { length: 50 }),
  // Bank details
  bankName: varchar('bank_name', { length: 255 }),
  bankAccountNumber: varchar('bank_account_number', { length: 100 }),
  bankIfscCode: varchar('bank_ifsc_code', { length: 20 }),
  bankBranch: varchar('bank_branch', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// SALARY STRUCTURES
// ─────────────────────────────────────────────

export const salaryStructures = pgTable('salary_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  salaryStructureId: uuid('salary_structure_id')
    .notNull()
    .references(() => salaryStructures.id),
  scheduleId: uuid('schedule_id').references(() => workingSchedules.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  wage: numeric('wage', { precision: 14, scale: 2 }).notNull(),
  status: contractStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// SALARY RULES
// ─────────────────────────────────────────────

export const salaryRules = pgTable('salary_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  salaryStructureId: uuid('salary_structure_id')
    .notNull()
    .references(() => salaryStructures.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: ruleCategoryEnum('category').notNull(),
  computationType: computationTypeEnum('computation_type').notNull().default('formula'),
  conditionExpression: text('condition_expression').default('true'),
  formulaExpression: text('formula_expression').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  appearsOnPayslip: boolean('appears_on_payslip').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// ATTENDANCES
// ─────────────────────────────────────────────

export const attendances = pgTable('attendances', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  attendanceDate: date('attendance_date').notNull(),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  workedHours: numeric('worked_hours', { precision: 5, scale: 2 }),
  overtimeHours: numeric('overtime_hours', { precision: 5, scale: 2 }).default('0'),
  status: attendanceStatusEnum('status').notNull().default('present'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqEmployeeDate: unique().on(table.employeeId, table.attendanceDate),
}));

// ─────────────────────────────────────────────
// LEAVE TYPES
// ─────────────────────────────────────────────

export const leaveTypes = pgTable('leave_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),
  isPaid: boolean('is_paid').notNull().default(true),
  maxDaysPerYear: integer('max_days_per_year').default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// LEAVE ALLOCATIONS
// ─────────────────────────────────────────────

export const leaveAllocations = pgTable('leave_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  totalDays: numeric('total_days', { precision: 6, scale: 2 }).notNull(),
  usedDays: numeric('used_days', { precision: 6, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// LEAVE REQUESTS
// ─────────────────────────────────────────────

export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  leaveTypeId: uuid('leave_type_id')
    .notNull()
    .references(() => leaveTypes.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  numberOfDays: numeric('number_of_days', { precision: 6, scale: 2 }).notNull(),
  reason: text('reason'),
  status: leaveStatusEnum('status').notNull().default('pending'),
  approvedById: uuid('approved_by_id'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PAYRUNS
// ─────────────────────────────────────────────

export const payruns = pgTable('payruns', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  salaryStructureId: uuid('salary_structure_id')
    .notNull()
    .references(() => salaryStructures.id),
  name: varchar('name', { length: 255 }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: payrunStatusEnum('status').notNull().default('draft'),
  totalEmployees: integer('total_employees').default(0),
  totalGross: numeric('total_gross', { precision: 16, scale: 2 }).default('0'),
  totalDeductions: numeric('total_deductions', { precision: 16, scale: 2 }).default('0'),
  totalNet: numeric('total_net', { precision: 16, scale: 2 }).default('0'),
  computedAt: timestamp('computed_at'),
  approvedAt: timestamp('approved_at'),
  approvedById: uuid('approved_by_id'),
  notes: text('notes'),
  createdById: uuid('created_by_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PAYSLIPS
// ─────────────────────────────────────────────

export const payslips = pgTable('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrunId: uuid('payrun_id')
    .notNull()
    .references(() => payruns.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),
  // Time metrics
  plannedDays: numeric('planned_days', { precision: 6, scale: 2 }).default('0'),
  plannedHours: numeric('planned_hours', { precision: 8, scale: 2 }).default('0'),
  workedDays: numeric('worked_days', { precision: 6, scale: 2 }).default('0'),
  workedHours: numeric('worked_hours', { precision: 8, scale: 2 }).default('0'),
  overtimeHours: numeric('overtime_hours', { precision: 8, scale: 2 }).default('0'),
  lopDays: numeric('lop_days', { precision: 6, scale: 2 }).default('0'),
  // Category totals
  basicTotal: numeric('basic_total', { precision: 14, scale: 2 }).default('0'),
  allowancesTotal: numeric('allowances_total', { precision: 14, scale: 2 }).default('0'),
  grossTotal: numeric('gross_total', { precision: 14, scale: 2 }).default('0'),
  deductionsTotal: numeric('deductions_total', { precision: 14, scale: 2 }).default('0'),
  netTotal: numeric('net_total', { precision: 14, scale: 2 }).default('0'),
  // Snapshot
  employeeSnapshot: jsonb('employee_snapshot'),
  contractSnapshot: jsonb('contract_snapshot'),
  status: payrunStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PAYSLIP LINES
// ─────────────────────────────────────────────

export const payslipLines = pgTable('payslip_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  payslipId: uuid('payslip_id')
    .notNull()
    .references(() => payslips.id, { onDelete: 'cascade' }),
  salaryRuleId: uuid('salary_rule_id').references(() => salaryRules.id, { onDelete: 'set null' }),
  sequence: integer('sequence').notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: ruleCategoryEnum('category').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  // Audit trace: stores formula, resolved variables, intermediate values
  calculationTrace: jsonb('calculation_trace').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PAYRUN ANOMALIES
// ─────────────────────────────────────────────

export const payrunAnomalies = pgTable('payrun_anomalies', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrunId: uuid('payrun_id')
    .notNull()
    .references(() => payruns.id, { onDelete: 'cascade' }),
  payslipId: uuid('payslip_id').references(() => payslips.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  severity: anomalySeverityEnum('severity').notNull(),
  anomalyType: varchar('anomaly_type', { length: 100 }).notNull(),
  message: text('message').notNull(),
  details: jsonb('details'),
  isResolved: boolean('is_resolved').notNull().default(false),
  resolvedById: uuid('resolved_by_id'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PAYRUN WIZARD TRANSIENTS
// ─────────────────────────────────────────────

export const payrunWizardTransients = pgTable('payrun_wizard_transients', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  step: integer('step').notNull().default(1),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  salaryStructureId: uuid('salary_structure_id').references(() => salaryStructures.id),
  candidateData: jsonb('candidate_data'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// USERS (Auth)
// ─────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('employee'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull(),
  entityName: varchar('entity_name', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  action: auditActionEnum('action').notNull(),
  changes: jsonb('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  branches: many(branches),
  departments: many(departments),
  employees: many(employees),
  salaryStructures: many(salaryStructures),
  workingSchedules: many(workingSchedules),
  payruns: many(payruns),
  users: many(users),
  auditLogs: many(auditLogs),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  company: one(companies, { fields: [branches.companyId], references: [companies.id] }),
  employees: many(employees),
  departments: many(departments),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(companies, { fields: [departments.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [departments.branchId], references: [branches.id] }),
  employees: many(employees),
  jobPositions: many(jobPositions),
  manager: one(employees, { fields: [departments.managerId], references: [employees.id] }),
}));

export const jobPositionsRelations = relations(jobPositions, ({ one }) => ({
  company: one(companies, { fields: [jobPositions.companyId], references: [companies.id] }),
  department: one(departments, { fields: [jobPositions.departmentId], references: [departments.id] }),
}));

export const workingSchedulesRelations = relations(workingSchedules, ({ one, many }) => ({
  company: one(companies, { fields: [workingSchedules.companyId], references: [companies.id] }),
  scheduleLines: many(scheduleLines),
  contracts: many(contracts),
  employees: many(employees),
}));

export const scheduleLinesRelations = relations(scheduleLines, ({ one }) => ({
  schedule: one(workingSchedules, { fields: [scheduleLines.scheduleId], references: [workingSchedules.id] }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, { fields: [employees.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [employees.branchId], references: [branches.id] }),
  department: one(departments, { fields: [employees.departmentId], references: [departments.id] }),
  jobPosition: one(jobPositions, { fields: [employees.jobPositionId], references: [jobPositions.id] }),
  defaultSchedule: one(workingSchedules, { fields: [employees.defaultScheduleId], references: [workingSchedules.id] }),
  contracts: many(contracts),
  attendances: many(attendances),
  leaveAllocations: many(leaveAllocations),
  leaveRequests: many(leaveRequests),
  payslips: many(payslips),
  user: many(users),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one, many }) => ({
  company: one(companies, { fields: [salaryStructures.companyId], references: [companies.id] }),
  salaryRules: many(salaryRules),
  contracts: many(contracts),
  payruns: many(payruns),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  employee: one(employees, { fields: [contracts.employeeId], references: [employees.id] }),
  salaryStructure: one(salaryStructures, { fields: [contracts.salaryStructureId], references: [salaryStructures.id] }),
  schedule: one(workingSchedules, { fields: [contracts.scheduleId], references: [workingSchedules.id] }),
  payslips: many(payslips),
}));

export const salaryRulesRelations = relations(salaryRules, ({ one, many }) => ({
  salaryStructure: one(salaryStructures, { fields: [salaryRules.salaryStructureId], references: [salaryStructures.id] }),
  payslipLines: many(payslipLines),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  employee: one(employees, { fields: [attendances.employeeId], references: [employees.id] }),
}));

export const leaveTypesRelations = relations(leaveTypes, ({ one, many }) => ({
  company: one(companies, { fields: [leaveTypes.companyId], references: [companies.id] }),
  leaveAllocations: many(leaveAllocations),
  leaveRequests: many(leaveRequests),
}));

export const leaveAllocationsRelations = relations(leaveAllocations, ({ one }) => ({
  employee: one(employees, { fields: [leaveAllocations.employeeId], references: [employees.id] }),
  leaveType: one(leaveTypes, { fields: [leaveAllocations.leaveTypeId], references: [leaveTypes.id] }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, { fields: [leaveRequests.employeeId], references: [employees.id] }),
  leaveType: one(leaveTypes, { fields: [leaveRequests.leaveTypeId], references: [leaveTypes.id] }),
}));

export const payrunsRelations = relations(payruns, ({ one, many }) => ({
  company: one(companies, { fields: [payruns.companyId], references: [companies.id] }),
  salaryStructure: one(salaryStructures, { fields: [payruns.salaryStructureId], references: [salaryStructures.id] }),
  payslips: many(payslips),
  anomalies: many(payrunAnomalies),
}));

export const payslipsRelations = relations(payslips, ({ one, many }) => ({
  payrun: one(payruns, { fields: [payslips.payrunId], references: [payruns.id] }),
  employee: one(employees, { fields: [payslips.employeeId], references: [employees.id] }),
  contract: one(contracts, { fields: [payslips.contractId], references: [contracts.id] }),
  lines: many(payslipLines),
  anomalies: many(payrunAnomalies),
}));

export const payslipLinesRelations = relations(payslipLines, ({ one }) => ({
  payslip: one(payslips, { fields: [payslipLines.payslipId], references: [payslips.id] }),
  salaryRule: one(salaryRules, { fields: [payslipLines.salaryRuleId], references: [salaryRules.id] }),
}));

export const payrunAnomaliesRelations = relations(payrunAnomalies, ({ one }) => ({
  payrun: one(payruns, { fields: [payrunAnomalies.payrunId], references: [payruns.id] }),
  payslip: one(payslips, { fields: [payrunAnomalies.payslipId], references: [payslips.id] }),
  employee: one(employees, { fields: [payrunAnomalies.employeeId], references: [employees.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  employee: one(employees, { fields: [users.employeeId], references: [employees.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, { fields: [auditLogs.companyId], references: [companies.id] }),
}));

// ─────────────────────────────────────────────
// INFERRED TYPES
// ─────────────────────────────────────────────

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Branch = typeof branches.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type JobPosition = typeof jobPositions.$inferSelect;
export type WorkingSchedule = typeof workingSchedules.$inferSelect;
export type ScheduleLine = typeof scheduleLines.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type SalaryRule = typeof salaryRules.$inferSelect;
export type Attendance = typeof attendances.$inferSelect;
export type LeaveType = typeof leaveTypes.$inferSelect;
export type LeaveAllocation = typeof leaveAllocations.$inferSelect;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type Payrun = typeof payruns.$inferSelect;
export type NewPayrun = typeof payruns.$inferInsert;
export type Payslip = typeof payslips.$inferSelect;
export type NewPayslip = typeof payslips.$inferInsert;
export type PayslipLine = typeof payslipLines.$inferSelect;
export type NewPayslipLine = typeof payslipLines.$inferInsert;
export type PayrunAnomaly = typeof payrunAnomalies.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
