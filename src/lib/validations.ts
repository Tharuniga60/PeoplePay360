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
  bankName: z.string().max(255).optional(),
  bankAccountNumber: z.string().max(100).optional(),
  bankIfscCode: z.string().max(20).optional(),
  bankBranch: z.string().max(255).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

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
  status: z.enum(['draft', 'active', 'expired', 'cancelled']).default('draft'),
  notes: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;

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
