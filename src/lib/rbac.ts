// ─────────────────────────────────────────────
// RBAC Utility Functions
// ─────────────────────────────────────────────

export type UserRole =
  | 'employee'
  | 'hr_manager'
  | 'hr_payroll_user'
  | 'hr_payroll_manager'
  | 'admin';

/**
 * Check if a user's role is in the list of allowed roles.
 */
export function hasRole(userRole: string, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole as UserRole);
}

/**
 * Check if a user can access a specific payslip.
 * - Admins and payroll managers can access any payslip.
 * - Employees can only access their own payslip (matched via employeeId in session).
 */
export function assertCanAccessPayslip(
  session: { user: { role: string; employeeId: string | null } },
  targetPayslipEmployeeId: string
): boolean {
  const { role, employeeId } = session.user;

  if (hasRole(role, ['admin', 'hr_payroll_manager', 'hr_payroll_user', 'hr_manager'])) {
    return true;
  }

  if (role === 'employee' && employeeId === targetPayslipEmployeeId) {
    return true;
  }

  return false;
}

/**
 * Check if the user can manage (create/edit) employees.
 */
export function canManageEmployees(userRole: string): boolean {
  return hasRole(userRole, ['admin', 'hr_manager', 'hr_payroll_manager']);
}

/**
 * Check if the user can approve payruns.
 */
export function canApprovePayrun(userRole: string): boolean {
  return hasRole(userRole, ['admin', 'hr_payroll_manager']);
}

/**
 * Check if the user can compute/trigger payruns.
 */
export function canComputePayrun(userRole: string): boolean {
  return hasRole(userRole, ['admin', 'hr_payroll_manager', 'hr_payroll_user']);
}

/**
 * Check if the user can approve leave requests.
 */
export function canApproveLeave(userRole: string): boolean {
  return hasRole(userRole, ['admin', 'hr_manager', 'hr_payroll_manager']);
}
