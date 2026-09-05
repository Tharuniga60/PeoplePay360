import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { salaryStructures } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SalaryRulesClient } from './salary-rules-client';

export default async function SalaryStructureDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  const structure = await db.query.salaryStructures.findFirst({
    where: and(eq(salaryStructures.id, params.id), eq(salaryStructures.companyId, session!.user.companyId)),
    with: {
      salaryRules: {
        orderBy: (r, { asc }) => [asc(r.sequence)],
      },
    },
  });

  if (!structure) notFound();

  const canManage = ['admin', 'hr_payroll_manager'].includes(session!.user.role);

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/salary-structures" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Salary Structures
      </Link>

      {/* Header */}
      <div className="section-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm bg-[#3b6ef0]/10 text-[#3b6ef0] border border-[#3b6ef0]/30 px-2.5 py-1 rounded-lg">
                {structure.code}
              </span>
              <h1 className="text-2xl font-bold text-white">{structure.name}</h1>
            </div>
            {structure.description && (
              <p className="text-[#6b7280] text-sm">{structure.description}</p>
            )}
            <p className="text-xs text-[#4b5563] mt-2">
              {structure.salaryRules.filter((r) => r.isActive).length} active rules ·{' '}
              {structure.salaryRules.length} total rules
            </p>
          </div>
          {canManage && (
            <SalaryRulesClient
              structureId={structure.id}
              companyId={session!.user.companyId}
            />
          )}
        </div>
      </div>

      {/* Rules Table */}
      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <BookOpen className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Salary Rules (execution order)</h2>
        </div>

        {structure.salaryRules.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
            <p className="text-[#4b5563] text-sm">No salary rules defined yet.</p>
            {canManage && (
              <p className="text-[#374151] text-xs mt-1">
                Add rules using the &quot;Add Rule&quot; button above.
              </p>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-16">Seq</th>
                <th>Code</th>
                <th>Rule Name</th>
                <th>Category</th>
                <th>Type</th>
                <th>Formula</th>
                <th>Condition</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {structure.salaryRules.map((rule) => (
                <tr key={rule.id} className={!rule.isActive ? 'opacity-40' : ''}>
                  <td className="font-mono text-[#6b7280] text-center">{rule.sequence}</td>
                  <td>
                    <span className={cn(
                      'font-mono text-xs px-1.5 py-0.5 rounded border',
                      rule.category === 'BASIC' ? 'bg-blue-500/10 text-blue-400 border-blue-800/40' :
                      rule.category === 'ALW' ? 'bg-purple-500/10 text-purple-400 border-purple-800/40' :
                      rule.category === 'GROSS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-800/40' :
                      rule.category === 'DED' ? 'bg-red-500/10 text-red-400 border-red-800/40' :
                      rule.category === 'NET' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-800/40' :
                      'bg-[#1e2235] text-[#6b7280] border-[#2a2d3e]'
                    )}>
                      {rule.code}
                    </span>
                  </td>
                  <td className="font-medium text-white">{rule.name}</td>
                  <td>
                    <span className={cn(
                      'font-mono text-xs px-2 py-0.5 rounded',
                      rule.category === 'BASIC' ? 'text-blue-400' :
                      rule.category === 'ALW' ? 'text-purple-400' :
                      rule.category === 'GROSS' ? 'text-emerald-400' :
                      rule.category === 'DED' ? 'text-red-400' :
                      rule.category === 'NET' ? 'text-yellow-400' :
                      'text-[#6b7280]'
                    )}>
                      {rule.category}
                    </span>
                  </td>
                  <td className="text-xs text-[#6b7280] capitalize">{rule.computationType.replace('_', ' ')}</td>
                  <td className="font-mono text-xs text-[#9ca3af] max-w-48 truncate" title={rule.formulaExpression}>
                    {rule.formulaExpression}
                  </td>
                  <td className="font-mono text-xs text-[#4b5563] max-w-32 truncate" title={rule.conditionExpression ?? ''}>
                    {rule.conditionExpression && rule.conditionExpression !== 'true'
                      ? rule.conditionExpression
                      : <span className="text-emerald-400/50">always</span>}
                  </td>
                  <td>
                    <span className={cn('status-pill text-xs', rule.isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                      : 'bg-[#1e2235] text-[#4b5563] border border-[#2a2d3e]')}>
                      {rule.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formula Reference Card */}
      <div className="section-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Formula Variable Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {[
            { var: 'contract.wage', desc: 'Monthly wage from contract' },
            { var: 'worked_days', desc: 'Days actually worked' },
            { var: 'planned_days', desc: 'Total scheduled working days' },
            { var: 'worked_hours', desc: 'Total worked hours' },
            { var: 'planned_hours', desc: 'Total planned hours' },
            { var: 'overtime_hours', desc: 'Overtime hours' },
            { var: 'loss_of_pay_days', desc: 'LOP days (absent without leave)' },
            { var: 'categories.BASIC', desc: 'Accumulated BASIC total' },
            { var: 'categories.ALW', desc: 'Accumulated allowances total' },
            { var: 'categories.GROSS', desc: 'Gross pay total' },
            { var: 'categories.DED', desc: 'Accumulated deductions' },
            { var: 'BASIC / ALW / GROSS / DED', desc: 'Shorthand aliases' },
          ].map((v) => (
            <div key={v.var} className="bg-[#111318] border border-[#2a2d3e] rounded-lg p-3">
              <code className="font-mono text-[#3b6ef0] text-xs">{v.var}</code>
              <p className="text-[#4b5563] text-xs mt-1">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
