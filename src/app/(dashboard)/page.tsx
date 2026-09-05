import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  employees,
  payruns,
  leaveRequests,
  payslips,
  attendances,
  contracts,
  leaveAllocations,
} from '@/db/schema';
import { eq, and, count, sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import {
  Users,
  DollarSign,
  Calendar,
  Receipt,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Building2,
  CalendarDays,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Settings,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  PAYRUN_STATUS_COLORS,
  LEAVE_STATUS_COLORS,
  ATTENDANCE_STATUS_COLORS,
  snakeToTitle,
  cn,
} from '@/lib/utils';
import { format } from 'date-fns';

export const metadata: Metadata = { title: 'Overview' };

// ─── Data fetcher for Employee Self-Service ─────────────────────────────
async function getEmployeeData(companyId: string, employeeId: string | null) {
  if (!employeeId) return null;

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.companyId, companyId)),
    with: {
      department: true,
      jobPosition: true,
      contracts: {
        where: eq(contracts.status, 'active'),
        limit: 1,
      },
    },
  });

  if (!emp) return null;

  // Leave balance
  const allocations = await db.query.leaveAllocations.findMany({
    where: eq(leaveAllocations.employeeId, employeeId),
  });
  const totalBalance = allocations.reduce(
    (sum, a) => sum + (parseFloat(a.totalDays?.toString() ?? '0') - parseFloat(a.usedDays?.toString() ?? '0')),
    0
  );

  // Today attendance
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAtt = await db.query.attendances.findFirst({
    where: and(eq(attendances.employeeId, employeeId), eq(attendances.attendanceDate, todayStr)),
  });

  // Pending leave requests count
  const [pendingLeaves] = await db
    .select({ count: count() })
    .from(leaveRequests)
    .where(and(eq(leaveRequests.employeeId, employeeId), eq(leaveRequests.status, 'pending')));

  // Recent attendance entries (last 5)
  const recentAttendances = await db.query.attendances.findMany({
    where: eq(attendances.employeeId, employeeId),
    orderBy: [desc(attendances.attendanceDate)],
    limit: 5,
  });

  // Recent leave requests (last 5)
  const recentLeaves = await db.query.leaveRequests.findMany({
    where: eq(leaveRequests.employeeId, employeeId),
    orderBy: [desc(leaveRequests.createdAt)],
    with: { leaveType: true },
    limit: 5,
  });

  return {
    employee: emp,
    totalBalance: Math.max(0, totalBalance),
    todayAttendance: todayAtt,
    pendingLeavesCount: pendingLeaves?.count ?? 0,
    activeContract: emp.contracts[0] ?? null,
    recentAttendances,
    recentLeaves,
  };
}

// ─── Data fetcher for HR Manager (No Payroll Data) ──────────────────────
async function getHRManagerData(companyId: string) {
  const [empCount] = await db.select({ count: count() }).from(employees).where(eq(employees.companyId, companyId));
  const [pendingLeaves] = await db.select({ count: count() }).from(leaveRequests).where(eq(leaveRequests.status, 'pending'));
  const [activeContracts] = await db.select({ count: count() }).from(contracts).where(eq(contracts.status, 'active'));

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [presentToday] = await db
    .select({ count: count() })
    .from(attendances)
    .where(and(eq(attendances.attendanceDate, todayStr), eq(attendances.status, 'present')));

  const pendingLeaveList = await db.query.leaveRequests.findMany({
    where: eq(leaveRequests.status, 'pending'),
    with: {
      employee: true,
      leaveType: true,
    },
    orderBy: [desc(leaveRequests.createdAt)],
    limit: 5,
  });

  return {
    empCount: empCount?.count ?? 0,
    pendingLeaves: pendingLeaves?.count ?? 0,
    activeContractsCount: activeContracts?.count ?? 0,
    presentTodayCount: presentToday?.count ?? 0,
    pendingLeaveList,
  };
}

// ─── Data fetcher for Payroll Manager & Admin ───────────────────────────
async function getPayrollOperationsData(companyId: string) {
  const [empCount] = await db.select({ count: count() }).from(employees).where(eq(employees.companyId, companyId));
  const [pendingLeaves] = await db.select({ count: count() }).from(leaveRequests).where(eq(leaveRequests.status, 'pending'));
  const recentPayruns = await db.query.payruns.findMany({
    where: eq(payruns.companyId, companyId),
    orderBy: [desc(payruns.createdAt)],
    limit: 5,
    with: { salaryStructure: true },
  });
  const [totalPaidOut] = await db
    .select({ total: sql<string>`COALESCE(SUM(net_total::numeric), 0)` })
    .from(payslips)
    .where(eq(payslips.status, 'approved'));

  return {
    empCount: empCount?.count ?? 0,
    pendingLeaves: pendingLeaves?.count ?? 0,
    recentPayruns,
    totalPaidOut: totalPaidOut?.total ?? '0',
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const companyId = session!.user.companyId;
  const role = session?.user?.role || '';
  const employeeId = session?.user?.employeeId ?? null;

  // ══════════════════════════════════════════════════════════════════════
  // 1. EMPLOYEE SELF-SERVICE VIEW
  // ══════════════════════════════════════════════════════════════════════
  if (role === 'employee') {
    const empData = await getEmployeeData(companyId, employeeId);
    const emp = empData?.employee;

    const employeeKpis = [
      {
        label: 'Available Leave Balance',
        value: `${empData?.totalBalance ?? 0} Days`,
        subtext: 'Across assigned leave allocations',
        icon: CalendarDays,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        href: '/time-off/allocations',
      },
      {
        label: "Today's Attendance",
        value: empData?.todayAttendance ? snakeToTitle(empData.todayAttendance.status) : 'Not Checked In',
        subtext: empData?.todayAttendance?.checkIn
          ? `In at ${format(new Date(empData.todayAttendance.checkIn), 'hh:mm a')}`
          : 'Ready for today check-in',
        icon: Clock,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        href: '/attendance',
      },
      {
        label: 'Pending Leave Requests',
        value: empData?.pendingLeavesCount ?? 0,
        subtext: 'Awaiting manager review',
        icon: Calendar,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        href: '/time-off/requests',
      },
      {
        label: 'Employment Status',
        value: emp?.jobPosition?.title ?? 'Active Team Member',
        subtext: emp?.department?.name ?? 'Assigned Department',
        icon: Building2,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        href: `/employees/${emp?.id ?? ''}`,
      },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-medium">
                Employee Self-Service
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Welcome back, {emp ? emp.firstName : 'Employee'}
            </h1>
            <p className="text-[#6b7280] text-sm mt-0.5">
              {emp?.jobPosition?.title ?? 'Team Member'} · {emp?.department?.name ?? 'General'} · Here is your personal overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/time-off/requests/new" className="btn-secondary">
              <Calendar className="w-4 h-4" />
              Request Time Off
            </Link>
            <Link href="/attendance" className="btn-primary">
              <Clock className="w-4 h-4" />
              Log Attendance
            </Link>
          </div>
        </div>

        {/* Personal KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {employeeKpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="kpi-card group hover:border-[#3b6ef0]/40 transition-colors duration-200">
              <div className="flex items-start justify-between">
                <div className={cn('p-2.5 rounded-xl', kpi.bg)}>
                  <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#374151] group-hover:text-[#6b7280] transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-xl font-bold text-white truncate">{kpi.value}</p>
                <p className="text-xs text-[#9ca3af] font-medium mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-[#6b7280] mt-0.5 truncate">{kpi.subtext}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/attendance" className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors group">
            <Clock className="w-5 h-5 text-blue-400 mb-3" />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">Daily Attendance</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Check in, check out, and review your daily hours log</p>
          </Link>
          <Link href="/time-off/requests/new" className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors group">
            <Calendar className="w-5 h-5 text-emerald-400 mb-3" />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">Request Time Off</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Submit leave requests and track your approval status</p>
          </Link>
          <Link href={`/employees/${emp?.id ?? ''}`} className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors group">
            <User className="w-5 h-5 text-purple-400 mb-3" />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">My Employee Profile</p>
            <p className="text-xs text-[#6b7280] mt-0.5">View your job details, assigned schedule, and contract</p>
          </Link>
        </div>

        {/* Two Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Attendance */}
          <div className="section-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#3b6ef0]" />
                <h2 className="text-sm font-semibold text-white">My Recent Attendance</h2>
              </div>
              <Link href="/attendance" className="text-xs text-[#3b6ef0] hover:text-blue-300 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {(!empData?.recentAttendances || empData.recentAttendances.length === 0) ? (
              <div className="py-12 text-center text-[#6b7280] text-sm">No attendance records logged yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empData.recentAttendances.map((att) => (
                    <tr key={att.id}>
                      <td className="font-medium text-white">{formatDate(att.attendanceDate)}</td>
                      <td className="font-mono text-xs">{att.workedHours ? `${att.workedHours} hrs` : '—'}</td>
                      <td>
                        <span className={cn('status-pill text-[10px]', ATTENDANCE_STATUS_COLORS[att.status] ?? 'text-gray-400')}>
                          {snakeToTitle(att.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Recent Leaves */}
          <div className="section-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <h2 className="text-sm font-semibold text-white">My Time Off Requests</h2>
              </div>
              <Link href="/time-off/requests" className="text-xs text-[#3b6ef0] hover:text-blue-300 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {(!empData?.recentLeaves || empData.recentLeaves.length === 0) ? (
              <div className="py-12 text-center text-[#6b7280] text-sm">No leave requests submitted yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Period</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {empData.recentLeaves.map((req) => (
                    <tr key={req.id}>
                      <td className="font-medium text-white">{req.leaveType?.name ?? 'Leave'}</td>
                      <td className="text-xs text-[#9ca3af]">
                        {formatDate(req.startDate)} – {formatDate(req.endDate)} ({req.numberOfDays}d)
                      </td>
                      <td>
                        <span className={cn('status-pill text-[10px]', LEAVE_STATUS_COLORS[req.status] ?? 'text-gray-400')}>
                          {snakeToTitle(req.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. HR MANAGER VIEW (Strictly NO Payroll features)
  // ══════════════════════════════════════════════════════════════════════
  if (role === 'hr_manager') {
    const hrData = await getHRManagerData(companyId);

    const hrKpis = [
      {
        label: 'Total Employees',
        value: hrData.empCount,
        subtext: 'Active workforce directory',
        icon: Users,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        href: '/employees',
      },
      {
        label: 'Pending Leaves To Review',
        value: hrData.pendingLeaves,
        subtext: 'Awaiting HR approval',
        icon: Calendar,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        href: '/time-off/requests',
      },
      {
        label: 'Present Today',
        value: hrData.presentTodayCount,
        subtext: 'Attendance checked in',
        icon: Clock,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        href: '/attendance',
      },
      {
        label: 'Active Contracts',
        value: hrData.activeContractsCount,
        subtext: 'Current valid contracts',
        icon: FileText,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        href: '/contracts',
      },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 font-medium">
                HR Management Hub
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">HR Operations Overview</h1>
            <p className="text-[#6b7280] text-sm mt-0.5">
              Staffing, attendance verification, contracts, and leave approvals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/employees/new" className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Employee
            </Link>
          </div>
        </div>

        {/* HR KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {hrKpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="kpi-card group hover:border-[#3b6ef0]/40 transition-colors duration-200">
              <div className="flex items-start justify-between">
                <div className={cn('p-2.5 rounded-xl', kpi.bg)}>
                  <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#374151] group-hover:text-[#6b7280] transition-colors" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-white">{kpi.value}</p>
                <p className="text-xs text-[#9ca3af] font-medium mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">{kpi.subtext}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* HR Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/employees/new" className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors group">
            <Users className="w-5 h-5 text-blue-400 mb-3" />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">Onboard Employee</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Create employee record, set manager and working schedule</p>
          </Link>
          <Link href="/time-off/requests" className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors group">
            <Calendar className="w-5 h-5 text-yellow-400 mb-3" />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">Review Leaves</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Review and approve or reject employee leave requests</p>
          </Link>
          <Link href="/working-schedules" className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors group">
            <Settings className="w-5 h-5 text-purple-400 mb-3" />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">Working Schedules</p>
            <p className="text-xs text-[#6b7280] mt-0.5">Configure shifts, weekly working hours, and assign employees</p>
          </Link>
        </div>

        {/* Pending Leaves Table to Approve */}
        <div className="section-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-white">Pending Leave Requests Awaiting Review</h2>
            </div>
            <Link href="/time-off/requests" className="text-xs text-[#3b6ef0] hover:text-blue-300 flex items-center gap-1 transition-colors">
              View all requests <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {hrData.pendingLeaveList.length === 0 ? (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
              <p className="text-[#9ca3af] text-sm">All caught up! No pending leave requests to review.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hrData.pendingLeaveList.map((req) => (
                  <tr key={req.id}>
                    <td className="font-medium text-white">
                      {req.employee ? `${req.employee.firstName} ${req.employee.lastName}` : '—'}
                    </td>
                    <td>{req.leaveType?.name ?? 'Leave'}</td>
                    <td className="text-xs text-[#9ca3af]">
                      {formatDate(req.startDate)} – {formatDate(req.endDate)}
                    </td>
                    <td>{req.numberOfDays}d</td>
                    <td>
                      <span className={cn('status-pill text-[10px]', LEAVE_STATUS_COLORS[req.status])}>
                        {snakeToTitle(req.status)}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/time-off/requests/${req.id}`}
                        className="text-[#3b6ef0] hover:text-blue-300 text-xs flex items-center gap-0.5 justify-end"
                      >
                        Review <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. PAYROLL OPS / MANAGER / ADMIN VIEW
  // ══════════════════════════════════════════════════════════════════════
  const payrollData = await getPayrollOperationsData(companyId);

  const roleBadges: Record<string, { label: string; color: string }> = {
    admin: { label: 'System Administrator', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    hr_payroll_manager: { label: 'HR Payroll Manager', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    hr_payroll_user: { label: 'HR Payroll User', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  };

  const currentBadge = roleBadges[role] ?? { label: snakeToTitle(role), color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };

  const kpis = [
    {
      label: 'Total Employees',
      value: payrollData.empCount,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      href: '/employees',
    },
    {
      label: 'Pending Leaves',
      value: payrollData.pendingLeaves,
      icon: Calendar,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      href: '/time-off/requests',
    },
    {
      label: 'Total Paid Out',
      value: formatCurrency(parseFloat(payrollData.totalPaidOut ?? '0')),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      href: '/payroll/payruns',
    },
    {
      label: 'Total Payruns',
      value: payrollData.recentPayruns.length,
      icon: Receipt,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      href: '/payroll/payruns',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium', currentBadge.color)}>
              {currentBadge.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Welcome back. Here&apos;s what&apos;s happening across your organization and payroll operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll/payruns/new" className="btn-primary">
            <DollarSign className="w-4 h-4" />
            New Payrun
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="kpi-card group hover:border-[#3b6ef0]/40 transition-colors duration-200">
            <div className="flex items-start justify-between">
              <div className={cn('p-2.5 rounded-xl', kpi.bg)}>
                <kpi.icon className={cn('w-5 h-5', kpi.color)} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#374151] group-hover:text-[#6b7280] transition-colors" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-sm text-[#6b7280] mt-0.5">{kpi.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Payruns */}
      <div className="section-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3b6ef0]" />
            <h2 className="text-sm font-semibold text-white">Recent Pay Runs</h2>
          </div>
          <Link href="/payroll/payruns" className="text-xs text-[#3b6ef0] hover:text-blue-300 flex items-center gap-1 transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {payrollData.recentPayruns.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
            <p className="text-[#4b5563] text-sm">No payruns yet.</p>
            <Link href="/payroll/payruns/new" className="btn-primary mt-4 inline-flex">Create First Payrun</Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Period</th>
                <th>Employees</th>
                <th>Net Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payrollData.recentPayruns.map((payrun) => (
                <tr key={payrun.id}>
                  <td className="font-medium text-white">{payrun.name}</td>
                  <td className="text-[#6b7280]">
                    {formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}
                  </td>
                  <td>{payrun.totalEmployees ?? 0}</td>
                  <td className="font-mono">{formatCurrency(parseFloat(payrun.totalNet?.toString() ?? '0'))}</td>
                  <td>
                    <span className={cn('status-pill text-[10px]', PAYRUN_STATUS_COLORS[payrun.status])}>
                      {snakeToTitle(payrun.status)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/payroll/payruns/${payrun.id}`} className="text-[#3b6ef0] hover:text-blue-300 text-xs flex items-center gap-0.5 justify-end">
                      View <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'New Payrun', desc: 'Start a new pay cycle for your team', href: '/payroll/payruns/new', icon: DollarSign, color: 'text-blue-400' },
          { label: 'Add Employee', desc: 'Onboard a new team member', href: '/employees/new', icon: Users, color: 'text-emerald-400' },
          { label: 'Review Leaves', desc: 'Approve pending leave requests', href: '/time-off/requests', icon: Calendar, color: 'text-yellow-400' },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors duration-200 group"
          >
            <action.icon className={cn('w-5 h-5 mb-3', action.color)} />
            <p className="text-sm font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">{action.label}</p>
            <p className="text-xs text-[#4b5563] mt-0.5">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Admin Quick Section */}
      {role === 'admin' && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-rose-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">System Administration Controls</p>
              <p className="text-xs text-[#9ca3af]">Manage company users, assign permissions across the 5 roles, and reset credentials.</p>
            </div>
          </div>
          <Link href="/admin/users" className="btn-secondary text-xs text-rose-300 border-rose-500/30 hover:bg-rose-500/10">
            Open User Management →
          </Link>
        </div>
      )}
    </div>
  );
}
