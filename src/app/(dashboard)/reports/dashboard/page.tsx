import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import {
  payruns,
  payslips,
  employees,
  departments,
  attendances,
  leaveRequests,
  contracts,
} from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { canComputePayrun } from '@/lib/rbac';
import { ReportsDashboardClient } from './reports-dashboard-client';

export const metadata: Metadata = { title: 'Executive Reports Dashboard' };

export default async function ReportsDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  if (!canComputePayrun(role)) {
    redirect('/');
  }

  const [
    allPayruns,
    allPayslips,
    allEmployees,
    allDepartments,
    allLeaves,
    allAttendances,
  ] = await Promise.all([
    db.query.payruns.findMany({
      where: eq(payruns.companyId, session.user.companyId),
      orderBy: [desc(payruns.createdAt)],
    }),
    db.query.payslips.findMany({
      with: {
        employee: {
          with: { department: true },
        },
        payrun: true,
      },
      orderBy: [desc(payslips.createdAt)],
    }),
    db.query.employees.findMany({
      where: eq(employees.companyId, session.user.companyId),
      with: { department: true },
    }),
    db.query.departments.findMany({
      where: eq(departments.companyId, session.user.companyId),
    }),
    db.query.leaveRequests.findMany({
      orderBy: [desc(leaveRequests.createdAt)],
    }),
    db.query.attendances.findMany({
      orderBy: [desc(attendances.attendanceDate)],
      limit: 500,
    }),
  ]);

  // Operational Alerts:
  // 1. Missing bank account details
  const missingBankAccounts = allEmployees.filter(
    (e) => !e.bankAccountNumber || !e.bankName
  );

  // 2. Pending Time Off requests awaiting manager approval
  const pendingLeaves = allLeaves.filter((l) => l.status === 'pending');

  // 3. Attendance records flagged for missing check-outs
  const missingCheckouts = allAttendances.filter(
    (a) => a.checkIn && !a.checkOut && a.status === 'present'
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Executive Payroll & HR Dashboard</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Live workforce analytics, payroll outlay trajectories, attendance health, and compliance alerts.
        </p>
      </div>

      <ReportsDashboardClient
        payruns={allPayruns.map((p) => ({
          id: p.id,
          name: p.name,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          status: p.status,
          totalNet: p.totalNet?.toString() ?? '0',
          totalGross: p.totalGross?.toString() ?? '0',
        }))}
        payslips={allPayslips.map((ps) => ({
          id: ps.id,
          netTotal: parseFloat(ps.netTotal?.toString() ?? '0'),
          grossTotal: parseFloat(ps.grossTotal?.toString() ?? '0'),
          status: ps.status,
          departmentId: ps.employee.departmentId,
          departmentName: ps.employee.department?.name ?? 'General',
          employmentType: ps.employee.employmentType,
          payrunPeriod: ps.payrun?.name ?? 'Off-cycle',
        }))}
        departments={allDepartments.map((d) => ({ id: d.id, name: d.name }))}
        approvedLeavesCount={allLeaves.filter((l) => l.status === 'approved').length}
        approvedLeavesDays={allLeaves
          .filter((l) => l.status === 'approved')
          .reduce((sum, l) => sum + parseFloat(l.numberOfDays.toString()), 0)}
        attendancesCount={allAttendances.length}
        presentAttendancesCount={allAttendances.filter((a) => a.status === 'present').length}
        alerts={{
          missingBankCount: missingBankAccounts.length,
          pendingLeavesCount: pendingLeaves.length,
          missingCheckoutsCount: missingCheckouts.length,
        }}
      />
    </div>
  );
}
