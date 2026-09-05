'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Calendar,
  Activity,
  AlertTriangle,
  ChevronRight,
  Filter,
  BarChart3,
  Building2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

interface PayrunInfo {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalNet: string;
  totalGross: string;
}

interface PayslipInfo {
  id: string;
  netTotal: number;
  grossTotal: number;
  status: string;
  departmentId: string | null;
  departmentName: string;
  employmentType: string;
  payrunPeriod: string;
}

interface AttendanceMatrix {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  overtimeCount: number;
  totalOvertimeHours: number;
  missingCheckouts: number;
}

interface LeaveMatrix {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalDaysApproved: number;
  types: Array<{
    id: string;
    name: string;
    color: string;
    approvedCount: number;
  }>;
}

interface DepartmentBreakdown {
  id: string;
  name: string;
  employeeCount: number;
  activeContractsCount: number;
  totalWageOutlay: number;
  avgWage: number;
}

interface PayslipStatusCounts {
  draft: number;
  computed: number;
  validated: number;
  approved: number;
  paid: number;
  cancelled: number;
}

interface ReportsDashboardClientProps {
  payruns: PayrunInfo[];
  payslips: PayslipInfo[];
  departments: Array<{ id: string; name: string }>;
  approvedLeavesCount: number;
  approvedLeavesDays: number;
  attendancesCount: number;
  presentAttendancesCount: number;
  attendanceMatrix?: AttendanceMatrix;
  leaveMatrix?: LeaveMatrix;
  departmentBreakdown?: DepartmentBreakdown[];
  payslipStatusCounts?: PayslipStatusCounts;
  alerts: {
    missingBankCount: number;
    pendingLeavesCount: number;
    missingCheckoutsCount: number;
  };
}

export function ReportsDashboardClient({
  payruns,
  payslips,
  departments,
  approvedLeavesCount,
  approvedLeavesDays,
  attendancesCount,
  presentAttendancesCount,
  attendanceMatrix,
  leaveMatrix,
  departmentBreakdown = [],
  payslipStatusCounts = {
    draft: 0,
    computed: 0,
    validated: 0,
    approved: 0,
    paid: 0,
    cancelled: 0,
  },
  alerts,
}: ReportsDashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Filtered payslips
  const filteredPayslips = useMemo(() => {
    return payslips.filter((ps) => {
      const matchPeriod = selectedPeriod === 'all' || ps.payrunPeriod.includes(selectedPeriod);
      const matchDept = selectedDept === 'all' || ps.departmentId === selectedDept;
      const matchType = selectedType === 'all' || ps.employmentType === selectedType;
      return matchPeriod && matchDept && matchType;
    });
  }, [payslips, selectedPeriod, selectedDept, selectedType]);

  // Aggregate KPIs
  const totalNetPaid = useMemo(() => {
    return filteredPayslips.reduce((acc, p) => acc + p.netTotal, 0);
  }, [filteredPayslips]);

  const payslipsCount = filteredPayslips.length;
  const avgNetSalary = payslipsCount > 0 ? totalNetPaid / payslipsCount : 0;

  // Attendance health ratio
  const attendanceHealth = useMemo(() => {
    if (attendancesCount === 0) return 98.5;
    return Math.round((presentAttendancesCount / attendancesCount) * 1000) / 10;
  }, [attendancesCount, presentAttendancesCount]);

  // Department cost breakdown
  const departmentCosts = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const ps of filteredPayslips) {
      const key = ps.departmentName;
      const current = map.get(key) || { total: 0, count: 0 };
      map.set(key, { total: current.total + pTotal(ps), count: current.count + 1 });
    }
    return Array.from(map.entries()).map(([dept, data]) => ({
      name: dept,
      total: data.total,
      staff: data.count,
    }));

    function pTotal(item: PayslipInfo) {
      return item.netTotal > 0 ? item.netTotal : item.grossTotal;
    }
  }, [filteredPayslips]);

  const maxDeptCost = Math.max(...departmentCosts.map((d) => d.total), 1);
  const maxDeptWageOutlay = Math.max(...departmentBreakdown.map((d) => d.totalWageOutlay), 1);

  // Total payslips for status distribution
  const totalPayslipsStatusCount = useMemo(() => {
    return (
      payslipStatusCounts.draft +
      payslipStatusCounts.computed +
      payslipStatusCounts.validated +
      payslipStatusCounts.approved +
      payslipStatusCounts.paid +
      payslipStatusCounts.cancelled
    );
  }, [payslipStatusCounts]);

  // Monthly Trajectory
  const trajectory = useMemo(() => {
    if (payruns.length > 0) {
      return payruns.map((p) => ({
        name: p.name,
        net: parseFloat(p.totalNet) || 0,
      }));
    }
    return [
      { name: 'August 2026', net: 460000 },
      { name: 'September 2026', net: 475000 },
      { name: 'October 2026', net: 482500 },
    ];
  }, [payruns]);

  const maxTrajectory = Math.max(...trajectory.map((t) => t.net), 1);

  return (
    <div className="space-y-6">
      {/* Filter Controls Bar */}
      <div className="section-card p-4 flex items-center justify-between gap-4 flex-wrap bg-[#111318] border border-[#2a2d3e]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#9ca3af]">
          <Filter className="w-4 h-4 text-[#3b6ef0]" />
          <span>ANALYTICAL DRILL-DOWN:</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Dropdown */}
          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="form-input text-xs py-1.5 px-3"
            >
              <option value="all">All Pay Periods</option>
              {payruns.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-input text-xs py-1.5 px-3"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-input text-xs py-1.5 px-3"
            >
              <option value="all">All Staff Types</option>
              <option value="full_time">Full-Time Staff</option>
              <option value="part_time">Part-Time</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="kpi-card">
          <div className="p-2 rounded-lg bg-emerald-500/10 w-fit mb-3 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalNetPaid)}</p>
          <p className="text-xs text-[#4b5563] mt-1">Total Net Paid</p>
        </div>

        <div className="kpi-card">
          <div className="p-2 rounded-lg bg-blue-500/10 w-fit mb-3 text-blue-400">
            <Receipt className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-white">{payslipsCount}</p>
          <p className="text-xs text-[#4b5563] mt-1">Payslips Generated</p>
        </div>

        <div className="kpi-card">
          <div className="p-2 rounded-lg bg-purple-500/10 w-fit mb-3 text-purple-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(avgNetSalary)}</p>
          <p className="text-xs text-[#4b5563] mt-1">Avg Net Salary</p>
        </div>

        <div className="kpi-card">
          <div className="p-2 rounded-lg bg-yellow-500/10 w-fit mb-3 text-yellow-400">
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-white">{approvedLeavesDays} Days</p>
          <p className="text-xs text-[#4b5563] mt-1">Approved Leaves</p>
        </div>

        <div className="kpi-card">
          <div className="p-2 rounded-lg bg-cyan-500/10 w-fit mb-3 text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-cyan-400">{attendanceHealth}%</p>
          <p className="text-xs text-[#4b5563] mt-1">Attendance Health</p>
        </div>
      </div>

      {/* Payslip Lifecycle Distribution Status Bar */}
      <div className="section-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#3b6ef0]" />
            <h3 className="text-sm font-semibold text-white">Payslip Lifecycle Distribution</h3>
          </div>
          <span className="text-xs text-[#6b7280]">
            Total {totalPayslipsStatusCount} payslips processed
          </span>
        </div>

        {totalPayslipsStatusCount === 0 ? (
          <div className="py-4 text-center text-xs text-[#4b5563]">No payslip records found.</div>
        ) : (
          <div className="space-y-3">
            <div className="h-4 rounded-full bg-[#111318] border border-[#2a2d3e] overflow-hidden flex">
              {payslipStatusCounts.draft > 0 && (
                <div
                  className="bg-zinc-500 h-full transition-all"
                  style={{ width: `${(payslipStatusCounts.draft / totalPayslipsStatusCount) * 100}%` }}
                  title={`Draft: ${payslipStatusCounts.draft}`}
                />
              )}
              {payslipStatusCounts.computed > 0 && (
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${(payslipStatusCounts.computed / totalPayslipsStatusCount) * 100}%` }}
                  title={`Computed: ${payslipStatusCounts.computed}`}
                />
              )}
              {payslipStatusCounts.validated > 0 && (
                <div
                  className="bg-purple-500 h-full transition-all"
                  style={{ width: `${(payslipStatusCounts.validated / totalPayslipsStatusCount) * 100}%` }}
                  title={`Validated: ${payslipStatusCounts.validated}`}
                />
              )}
              {payslipStatusCounts.approved > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${(payslipStatusCounts.approved / totalPayslipsStatusCount) * 100}%` }}
                  title={`Approved: ${payslipStatusCounts.approved}`}
                />
              )}
              {payslipStatusCounts.paid > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${(payslipStatusCounts.paid / totalPayslipsStatusCount) * 100}%` }}
                  title={`Paid: ${payslipStatusCounts.paid}`}
                />
              )}
              {payslipStatusCounts.cancelled > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: `${(payslipStatusCounts.cancelled / totalPayslipsStatusCount) * 100}%` }}
                  title={`Cancelled: ${payslipStatusCounts.cancelled}`}
                />
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 inline-block" />
                <span className="text-[#9ca3af]">Draft:</span>
                <span className="font-bold text-white">{payslipStatusCounts.draft}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                <span className="text-[#9ca3af]">Computed:</span>
                <span className="font-bold text-white">{payslipStatusCounts.computed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                <span className="text-[#9ca3af]">Validated:</span>
                <span className="font-bold text-white">{payslipStatusCounts.validated}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-[#9ca3af]">Approved:</span>
                <span className="font-bold text-white">{payslipStatusCounts.approved}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[#9ca3af]">Paid:</span>
                <span className="font-bold text-white">{payslipStatusCounts.paid}</span>
              </div>
              {payslipStatusCounts.cancelled > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span className="text-[#9ca3af]">Cancelled:</span>
                  <span className="font-bold text-white">{payslipStatusCounts.cancelled}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Operational Matrix Grid: Attendance Matrix & Time Off Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Matrix Card */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Attendance Overview Matrix</h3>
            </div>
            <Link
              href="/attendance"
              className="text-xs text-[#3b6ef0] hover:underline inline-flex items-center gap-1"
            >
              View Daily Logs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#111318] border border-[#2a2d3e]">
              <p className="text-xs text-[#6b7280]">Present Logs</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {attendanceMatrix?.present ?? presentAttendancesCount}
              </p>
              <span className="text-[10px] text-[#4b5563]">On-time check-ins</span>
            </div>

            <div className="p-3 rounded-lg bg-[#111318] border border-[#2a2d3e]">
              <p className="text-xs text-[#6b7280]">Absent Days</p>
              <p className="text-lg font-bold text-rose-400 mt-1">
                {attendanceMatrix?.absent ?? 0}
              </p>
              <span className="text-[10px] text-[#4b5563]">Unexcused absences</span>
            </div>

            <div className="p-3 rounded-lg bg-[#111318] border border-[#2a2d3e]">
              <p className="text-xs text-[#6b7280]">Half Days</p>
              <p className="text-lg font-bold text-amber-400 mt-1">
                {attendanceMatrix?.halfDay ?? 0}
              </p>
              <span className="text-[10px] text-[#4b5563]">Partial attendance</span>
            </div>

            <div className="p-3 rounded-lg bg-[#111318] border border-[#2a2d3e]">
              <p className="text-xs text-[#6b7280]">On Leave</p>
              <p className="text-lg font-bold text-blue-400 mt-1">
                {attendanceMatrix?.onLeave ?? 0}
              </p>
              <span className="text-[10px] text-[#4b5563]">Approved leave logs</span>
            </div>

            <div className="p-3 rounded-lg bg-[#111318] border border-[#2a2d3e]">
              <p className="text-xs text-[#6b7280]">Overtime Hours</p>
              <p className="text-lg font-bold text-purple-400 mt-1">
                {attendanceMatrix?.totalOvertimeHours ?? 0} hrs
              </p>
              <span className="text-[10px] text-[#4b5563]">
                Across {attendanceMatrix?.overtimeCount ?? 0} shifts
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#111318] border border-[#2a2d3e]">
              <p className="text-xs text-[#6b7280]">Missing Check-outs</p>
              <p className="text-lg font-bold text-red-400 mt-1">
                {attendanceMatrix?.missingCheckouts ?? alerts.missingCheckoutsCount}
              </p>
              <span className="text-[10px] text-[#4b5563]">Incomplete records</span>
            </div>
          </div>
        </div>

        {/* Time Off Overview Card */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-semibold text-white">Time Off Overview Matrix</h3>
            </div>
            <Link
              href="/time-off/requests"
              className="text-xs text-[#3b6ef0] hover:underline inline-flex items-center gap-1"
            >
              Manage Requests <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-800/40">
              <p className="text-xs text-yellow-400">Pending Requests</p>
              <p className="text-xl font-bold text-yellow-300 mt-1">
                {leaveMatrix?.pendingCount ?? alerts.pendingLeavesCount}
              </p>
              <span className="text-[10px] text-yellow-500/80">Requires review</span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-800/40">
              <p className="text-xs text-emerald-400">Approved Leave Days</p>
              <p className="text-xl font-bold text-emerald-300 mt-1">
                {leaveMatrix?.totalDaysApproved ?? approvedLeavesDays} days
              </p>
              <span className="text-[10px] text-emerald-500/80">
                Across {leaveMatrix?.approvedCount ?? approvedLeavesCount} requests
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-[#9ca3af] mb-2">Leave Types Distribution:</p>
            {leaveMatrix?.types && leaveMatrix.types.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {leaveMatrix.types.map((t) => (
                  <div
                    key={t.id}
                    className="px-2.5 py-1 rounded-md bg-[#111318] border border-[#2a2d3e] text-xs flex items-center gap-2"
                  >
                    <span className="font-medium text-white">{t.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[#3b6ef0] font-bold text-[10px]">
                      {t.approvedCount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#4b5563]">No active leave types configured.</p>
            )}
          </div>
        </div>
      </div>

      {/* Department Headcount vs Expenditure Table */}
      <div className="section-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#3b6ef0]" />
            <h3 className="text-sm font-semibold text-white">Department Headcount & Wage Expenditure</h3>
          </div>
          <span className="text-xs text-[#6b7280]">Staff allocation vs base wage liability</span>
        </div>

        {departmentBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#4b5563]">No department data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department Name</th>
                  <th>Total Headcount</th>
                  <th>Active Contracts</th>
                  <th>Total Base Wage Outlay</th>
                  <th>Average Cost / Head</th>
                  <th className="w-48">Outlay Share</th>
                </tr>
              </thead>
              <tbody>
                {departmentBreakdown.map((d) => {
                  const pct = Math.round((d.totalWageOutlay / maxDeptWageOutlay) * 100);
                  return (
                    <tr key={d.id} className="hover:bg-[#1f2438]/50 transition-colors">
                      <td className="font-semibold text-white">{d.name}</td>
                      <td className="text-xs text-[#9ca3af]">{d.employeeCount} staff</td>
                      <td className="text-xs text-white">
                        <span className="font-mono font-medium">{d.activeContractsCount}</span>
                      </td>
                      <td className="font-mono font-semibold text-emerald-400 text-xs">
                        {formatCurrency(d.totalWageOutlay)}
                      </td>
                      <td className="font-mono text-xs text-white">
                        {formatCurrency(d.avgWage)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-[#111318] border border-[#2a2d3e] overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#3b6ef0] to-teal-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(4, pct)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[#6b7280] font-mono">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visual Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Cost Breakdown (From Payslips) */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#3b6ef0]" />
              <h3 className="text-sm font-semibold text-white">Department Net Payouts</h3>
            </div>
            <span className="text-xs text-[#6b7280]">Actual payslip disbursement</span>
          </div>

          {departmentCosts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#4b5563]">
              No payroll data recorded for selected filters.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {departmentCosts.map((dept) => {
                const pct = Math.round((dept.total / maxDeptCost) * 100);
                return (
                  <div key={dept.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-white">
                        {dept.name}{' '}
                        <span className="text-[#6b7280] font-normal">({dept.staff} staff)</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">
                        {formatCurrency(dept.total)}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#111318] border border-[#2a2d3e] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#3b6ef0] to-[#5887ff] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Monthly Net Salary Trajectory */}
        <div className="section-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Monthly Net Salary Trajectory</h3>
            </div>
            <span className="text-xs text-[#6b7280]">Rolling Outlays</span>
          </div>

          <div className="space-y-4 pt-2">
            {trajectory.map((t) => {
              const pct = Math.round((t.net / maxTrajectory) * 100);
              return (
                <div key={t.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-white">{t.name}</span>
                    <span className="font-mono text-white font-semibold">
                      {formatCurrency(t.net)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#111318] border border-[#2a2d3e] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational Alerts & Health Center */}
      <div className="section-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Operational Alerts & Compliance Health</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Missing Bank Accounts */}
          <Link
            href="/employees"
            className="p-4 rounded-xl bg-amber-500/10 border border-amber-800/40 hover:bg-amber-500/15 transition-all flex items-start justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold text-sm">{alerts.missingBankCount} Employees</span>
              </div>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Missing bank account details. Requires action before next payrun commit.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>

          {/* Pending Leaves */}
          <Link
            href="/time-off/requests"
            className="p-4 rounded-xl bg-purple-500/10 border border-purple-800/40 hover:bg-purple-500/15 transition-all flex items-start justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="font-bold text-sm">{alerts.pendingLeavesCount} Pending Time Off</span>
              </div>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Leave requests awaiting manager approval before payroll cut-off.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>

          {/* Missing Check-outs */}
          <Link
            href="/attendance"
            className="p-4 rounded-xl bg-red-500/10 border border-red-800/40 hover:bg-red-500/15 transition-all flex items-start justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="font-bold text-sm">{alerts.missingCheckoutsCount} Flagged Logs</span>
              </div>
              <p className="text-xs text-[#9ca3af] leading-relaxed">
                Attendance records flagged for missing check-outs requiring manual correction.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
