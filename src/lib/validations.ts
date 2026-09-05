import { z } from 'zod';

// ─────────────────────────────────────────────
// COMMON
// ─────────────────────────────────────────────

export const uuidSchema = z.string().uuid();

// ─────────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  jobPositionId: z.string().uuid().optional(),
  defaultScheduleId: z.string().uuid().optional(),
  employeeCode: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  dateOfBirth: z.string().optional(),
  dateOfJoining: z.string().min(1),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'intern']).default('full_time'),
  gender: z.string().max(20).optional(),
  panNumber: z.string().max(20).optional(),
  pfAccountNumber: z.string().max(50).optional(),
  esiNumber: z.string().max(50).optional(),
  bankName: z.string().max(255).optional(),
  bankAccountNumber: z.string().max(100).optional(),
  bankIfscCode: z.string().max(20).optional(),
  bankBranch: z.string().max(255).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ─────────────────────────────────────────────
// CONTRACTS
// ─────────────────────────────────────────────

export const createContractSchema = z.object({
  employeeId: z.string().uuid(),
  salaryStructureId: z.string().uuid(),
  scheduleId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  wage: z.number().positive(),
  status: z.enum(['draft', 'active', 'expired', 'cancelled']).default('active'),
  notes: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;

export const updateContractSchema = createContractSchema.partial();
export type UpdateContractInput = z.infer<typeof updateContractSchema>;

// ─────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────

export const createAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  attendanceDate: z.string().min(1),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  workedHours: z.number().min(0).max(24).optional(),
  overtimeHours: z.number().min(0).optional(),
  status: z.enum(['present', 'absent', 'half_day', 'holiday', 'weekend', 'on_leave']).default('present'),
  notes: z.string().optional(),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;

// ─────────────────────────────────────────────
// LEAVES
// ─────────────────────────────────────────────

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  numberOfDays: z.number().positive(),
  reason: z.string().optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const updateLeaveStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'cancelled']),
  rejectionReason: z.string().optional(),
  approvedById: z.string().uuid().optional(),
});

// ─────────────────────────────────────────────
// PAYRUN WIZARD
// ─────────────────────────────────────────────

export const wizardStep1Schema = z.object({
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  salaryStructureId: z.string().uuid(),
  companyId: z.string().uuid(),
  autoSyncAttendance: z.boolean().optional(),
});

export type WizardStep1Input = z.infer<typeof wizardStep1Schema>;

// ─────────────────────────────────────────────
// PAYRUN
// ─────────────────────────────────────────────

export const createPayrunSchema = z.object({
  companyId: z.string().uuid(),
  salaryStructureId: z.string().uuid(),
  name: z.string().min(1).max(255),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  employeeIds: z.array(z.string().uuid()).min(1),
  createdById: z.string().uuid().optional(),
});

export type CreatePayrunInput = z.infer<typeof createPayrunSchema>;

// ─────────────────────────────────────────────
// CONFIGURATION & MASTER DATA
// ─────────────────────────────────────────────

export const createDepartmentSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  managerId: z.string().uuid().optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const createJobPositionSchema = z.object({
  companyId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
});
export type CreateJobPositionInput = z.infer<typeof createJobPositionSchema>;

export const createWorkingScheduleSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  hoursPerWeek: z.number().min(0).max(168).default(40),
  timezone: z.string().max(100).default('Asia/Kolkata'),
});
export type CreateWorkingScheduleInput = z.infer<typeof createWorkingScheduleSchema>;

export const createSalaryStructureSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
});
export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>;

export const createSalaryRuleSchema = z.object({
  salaryStructureId: z.string().uuid(),
  sequence: z.number().int().positive(),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  category: z.enum(['BASIC', 'ALW', 'GROSS', 'DED', 'NET', 'OTHER']),
  computationType: z.enum(['fixed', 'formula', 'python_code']).default('formula'),
  conditionExpression: z.string().default('true'),
  formulaExpression: z.string().min(1),
  description: z.string().optional(),
  appearsOnPayslip: z.boolean().default(true),
});
export type CreateSalaryRuleInput = z.infer<typeof createSalaryRuleSchema>;

export const updateSalaryRuleSchema = createSalaryRuleSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateSalaryRuleInput = z.infer<typeof updateSalaryRuleSchema>;

export const createLeaveTypeSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  unit: z.enum(['days', 'hours']).default('days'),
  requiresAllocation: z.boolean().default(true),
  approvalWorkflow: z.string().default('manager'),
  color: z.string().default('blue'),
  isPaid: z.boolean().default(true),
  maxDaysPerYear: z.number().int().min(0).default(0),
});
export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial();
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;

export const createLeaveAllocationSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100),
  totalDays: z.number().positive(),
  status: z.enum(['to_approve', 'approved', 'refused']).default('approved'),
  validityStart: z.string().optional(),
  validityEnd: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateLeaveAllocationInput = z.infer<typeof createLeaveAllocationSchema>;

// ─────────────────────────────────────────────
// USERS (Admin)
// ─────────────────────────────────────────────

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[0-9]/, 'Password must include at least one numeric digit'),
  role: z.enum(['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']),
  employeeId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  role: z.enum(['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin']).optional(),
  employeeId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[0-9]/, 'Password must include at least one numeric digit')
    .optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
