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
 * Check if a user can access payroll modules (payruns, structures, rules).
 * HR Manager is strictly excluded.
 */
export function canAccessPayroll(userRole: string): boolean {
  return hasRole(userRole, ['admin', 'hr_payroll_manager', 'hr_payroll_user']);
}

/**
 * Check if user can edit/configure salary structures and salary rules.
 * HR Payroll User is read-only; only Admin and HR Payroll Manager can manage.
 */
export function canManagePayrollConfig(userRole: string): boolean {
  return hasRole(userRole, ['admin', 'hr_payroll_manager']);
}

/**
 * Check if a user can access a specific payslip.
 * - Admins, payroll managers, and payroll users can access any payslip.
 * - HR Manager is NOT granted access.
 * - Employees can only access their own payslip (matched via employeeId in session).
 */
export function assertCanAccessPayslip(
  session: { user: { role: string; employeeId: string | null } },
  targetPayslipEmployeeId: string
): boolean {
  const { role, employeeId } = session.user;

  if (hasRole(role, ['admin', 'hr_payroll_manager', 'hr_payroll_user'])) {
    return true;
  }

  if (role === 'employee' && employeeId && employeeId === targetPayslipEmployeeId) {
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

/**
 * Check if user is system administrator.
 */
export function isAdmin(userRole: string): boolean {
  return userRole === 'admin';
}

import { NextResponse } from 'next/server';

export interface AuthSessionUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
  employeeId: string | null;
}

export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = 'Forbidden: Access denied'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Validate that user has one of the allowed roles.
 */
export function requireRole(
  session: { user?: Partial<AuthSessionUser> | null } | null,
  allowedRoles: UserRole[]
): { authorized: true; user: AuthSessionUser } | { authorized: false; response: NextResponse } {
  if (!session?.user?.id || !session.user.role || !session.user.companyId) {
    return { authorized: false, response: unauthorizedResponse('Authentication required') };
  }

  const user = session.user as AuthSessionUser;
  if (!hasRole(user.role, allowedRoles)) {
    return {
      authorized: false,
      response: forbiddenResponse(`Role '${user.role}' is not authorized for this operation`),
    };
  }

  return { authorized: true, user };
}

/**
 * Validate that an employee can only query or mutate their own record.
 * Admins / Managers with appropriate roles can access any employee's record.
 */
export function requireSelfOrRole(
  session: { user?: Partial<AuthSessionUser> | null } | null,
  targetEmployeeId: string | undefined | null,
  managerRoles: UserRole[]
): { authorized: true; user: AuthSessionUser } | { authorized: false; response: NextResponse } {
  if (!session?.user?.id || !session.user.role || !session.user.companyId) {
    return { authorized: false, response: unauthorizedResponse('Authentication required') };
  }

  const user = session.user as AuthSessionUser;
  if (hasRole(user.role, managerRoles)) {
    return { authorized: true, user };
  }

  if (user.role === 'employee') {
    if (!user.employeeId) {
      return {
        authorized: false,
        response: forbiddenResponse('User account is not linked to an employee profile'),
      };
    }
    if (targetEmployeeId && targetEmployeeId !== user.employeeId) {
      return {
        authorized: false,
        response: forbiddenResponse('Employees can only access their own data'),
      };
    }
    return { authorized: true, user };
  }

  return { authorized: false, response: forbiddenResponse('Access denied') };
}
