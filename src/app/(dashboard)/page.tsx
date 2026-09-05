import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { employees, payruns, leaveRequests, payslips } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Users, DollarSign, Calendar, Receipt, TrendingUp, AlertTriangle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDate, PAYRUN_STATUS_COLORS, snakeToTitle, cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Overview' };

async function getDashboardStats(companyId: string) {
  const [empCount] = await db.select({ count: count() }).from(employees).where(eq(employees.companyId, companyId));
  const [pendingLeaves] = await db.select({ count: count() }).from(leaveRequests).where(eq(leaveRequests.status, 'pending'));
  const recentPayruns = await db.query.payruns.findMany({
    where: eq(payruns.companyId, companyId),
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    limit: 5,
    with: { salaryStructure: true },
  });
  const [totalPaidOut] = await db
    .select({ total: sql<string>`COALESCE(SUM(net_total::numeric), 0)` })
    .from(payslips)
    .where(eq(payslips.status, 'approved'));

  return { empCount: empCount.count, pendingLeaves: pendingLeaves.count, recentPayruns, totalPaidOut: totalPaidOut.total };
}

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats(session!.user.companyId);

  const role = session?.user?.role || '';
  const isEmployee = role === 'employee';

  const kpis = [
    ...(!isEmployee
      ? [
          {
            label: 'Total Employees',
            value: stats.empCount,
            icon: Users,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            href: '/employees',
          },
        ]
      : []),
    {
      label: 'Pending Leaves',
      value: stats.pendingLeaves,
      icon: Calendar,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      href: '/leaves',
    },
    {
      label: 'Total Paid Out',
      value: formatCurrency(parseFloat(stats.totalPaidOut ?? '0')),
      icon: DollarSign,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      href: '/payruns',
    },
    {
      label: 'Total Payruns',
      value: stats.recentPayruns.length,
      icon: Receipt,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      href: '/payruns',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Welcome back. Here&apos;s what&apos;s happening across your organization.
        </p>
      </div>

      {/* KPI Cards */}
      <div className={cn('grid gap-4', isEmployee ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4')}>
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
          <Link href="/payruns" className="text-xs text-[#3b6ef0] hover:text-blue-300 flex items-center gap-1 transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {stats.recentPayruns.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
            <p className="text-[#4b5563] text-sm">No payruns yet.</p>
            <Link href="/payruns/new" className="btn-primary mt-4 inline-flex">Create First Payrun</Link>
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
              {stats.recentPayruns.map((payrun) => (
                <tr key={payrun.id}>
                  <td className="font-medium text-white">{payrun.name}</td>
                  <td className="text-[#6b7280]">
                    {formatDate(payrun.periodStart)} – {formatDate(payrun.periodEnd)}
                  </td>
                  <td>{payrun.totalEmployees ?? 0}</td>
                  <td className="font-mono">{formatCurrency(parseFloat(payrun.totalNet?.toString() ?? '0'))}</td>
                  <td>
                    <span className={cn('status-pill', PAYRUN_STATUS_COLORS[payrun.status])}>
                      {snakeToTitle(payrun.status)}
                    </span>
                  </td>
                  <td>
                    <Link href={`/payruns/${payrun.id}`} className="text-[#3b6ef0] hover:text-blue-300 text-xs flex items-center gap-0.5 justify-end">
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
          { label: 'New Payrun', desc: 'Start a new pay cycle for your team', href: '/payruns/new', icon: DollarSign, color: 'text-blue-400' },
          { label: 'Add Employee', desc: 'Onboard a new team member', href: '/employees', icon: Users, color: 'text-emerald-400' },
          { label: 'Review Leaves', desc: 'Approve pending leave requests', href: '/leaves', icon: Calendar, color: 'text-yellow-400' },
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
    </div>
  );
}
