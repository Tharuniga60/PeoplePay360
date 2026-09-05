import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { payruns } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { DollarSign, Plus, ChevronRight, Play } from 'lucide-react';
import { formatDate, formatCurrency, PAYRUN_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';
import { canAccessPayroll } from '@/lib/rbac';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Pay Runs' };

export default async function PayrunsPage() {
  const session = await auth();

  if (!canAccessPayroll(session?.user?.role || '')) {
    redirect('/?error=unauthorized');
  }

  const payrunList = await db.query.payruns.findMany({
    where: eq(payruns.companyId, session!.user.companyId),
    with: { salaryStructure: true },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });

  const STATUS_STEPS = ['draft', 'computed', 'validated', 'approved', 'paid'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pay Runs</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{payrunList.length} payrun(s)</p>
        </div>
        <Link href="/payruns/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          New Pay Run
        </Link>
      </div>

      <div className="section-card">
        {payrunList.length === 0 ? (
          <div className="py-20 text-center">
            <DollarSign className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
            <p className="text-[#4b5563] text-sm">No payruns created yet.</p>
            <Link href="/payruns/new" className="btn-primary mt-4 inline-flex">
              <Play className="w-4 h-4" />
              Create First Payrun
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Pay Run</th>
                <th>Period</th>
                <th>Structure</th>
                <th>Employees</th>
                <th>Gross</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payrunList.map((pr) => (
                <tr key={pr.id}>
                  <td className="font-medium text-white">{pr.name}</td>
                  <td className="text-[#6b7280] text-xs">
                    {formatDate(pr.periodStart)} – {formatDate(pr.periodEnd)}
                  </td>
                  <td>
                    <span className="text-xs text-[#4b5563] font-mono">
                      {pr.salaryStructure?.code ?? '—'}
                    </span>
                  </td>
                  <td className="text-center">{pr.totalEmployees ?? 0}</td>
                  <td className="font-mono text-sm">{formatCurrency(parseFloat(pr.totalGross?.toString() ?? '0'))}</td>
                  <td className="font-mono text-sm font-semibold text-emerald-400">
                    {formatCurrency(parseFloat(pr.totalNet?.toString() ?? '0'))}
                  </td>
                  <td>
                    <span className={cn('status-pill', PAYRUN_STATUS_COLORS[pr.status])}>
                      {snakeToTitle(pr.status)}
                    </span>
                  </td>
                  <td className="text-[#4b5563] text-xs">{formatDate(pr.createdAt)}</td>
                  <td>
                    <Link href={`/payruns/${pr.id}`} className="text-[#3b6ef0] hover:text-blue-300 text-xs flex items-center gap-0.5 justify-end">
                      View <ChevronRight className="w-3 h-3" />
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
