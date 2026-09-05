import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { salaryRules, salaryStructures, type SalaryRule, type SalaryStructure } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { BookOpen, ExternalLink, Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canComputePayrun } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Salary Rules' };

type RuleWithStructure = SalaryRule & {
  salaryStructure: SalaryStructure | null;
};

export default async function SalaryRulesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  if (!canComputePayrun(role)) {
    redirect('/payroll/payruns');
  }

  const rules: RuleWithStructure[] = (await db.query.salaryRules.findMany({
    with: { salaryStructure: true },
    orderBy: [asc(salaryRules.sequence)],
  })) as RuleWithStructure[];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Salary Rules Catalog</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Ordered sequence of calculation rules powering the deterministic salary computation engine.
          </p>
        </div>
        <Link href="/payroll/structures" className="btn-secondary">
          <BookOpen className="w-4 h-4" />
          Manage Structures
        </Link>
      </div>

      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <Sliders className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">All Active Rules ({rules.length})</h2>
        </div>

        {rules.length === 0 ? (
          <div className="py-16 text-center text-[#4b5563] text-sm">
            No salary rules defined yet.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Rule Code</th>
                <th>Rule Name</th>
                <th>Category</th>
                <th>Calculation Formula</th>
                <th>Structure</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs text-[#6b7280]">{r.sequence}</td>
                  <td className="font-mono font-bold text-xs text-[#3b6ef0]">{r.code}</td>
                  <td className="font-medium text-white">{r.name}</td>
                  <td>
                    <span
                      className={cn(
                        'status-pill text-[10px]',
                        r.category === 'BASIC'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-800/40'
                          : r.category === 'ALW'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                          : r.category === 'GROSS'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-800/40'
                          : r.category === 'DED'
                          ? 'bg-red-500/10 text-red-400 border border-red-800/40'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-800/40'
                      )}
                    >
                      {r.category}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-white max-w-xs truncate" title={r.formulaExpression}>
                    {r.formulaExpression}
                  </td>
                  <td>
                    {r.salaryStructure ? (
                      <Link
                        href={`/payroll/structures/${r.salaryStructure.id}`}
                        className="text-xs text-[#9ca3af] hover:text-white inline-flex items-center gap-1 transition-colors"
                      >
                        {r.salaryStructure.name}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <span
                      className={cn(
                        'status-pill text-[10px]',
                        r.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                          : 'bg-[#1e2235] text-[#4b5563]'
                      )}
                    >
                      {r.isActive ? 'Active' : 'Disabled'}
                    </span>
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
