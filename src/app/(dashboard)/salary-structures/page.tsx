import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { salaryStructures } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Settings, ChevronRight, BookOpen, Plus, CheckCircle } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';

import { canManagePayrollConfig } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Salary Structures' };

export default async function SalaryStructuresPage() {
  const session = await auth();
  const role = session?.user?.role || '';
  const isConfigManager = canManagePayrollConfig(role);

  const structures = await db.query.salaryStructures.findMany({
    where: eq(salaryStructures.companyId, session!.user.companyId),
    with: { salaryRules: true },
    orderBy: (s, { asc }) => [asc(s.name)],
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Salary Structures</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">Configure salary rules and computation formulas</p>
        </div>
        {isConfigManager ? (
          <Link href="/salary-structures/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Structure
          </Link>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 font-medium">
            Read-Only (HR Payroll User)
          </span>
        )}
      </div>

      {structures.length === 0 ? (
        <div className="section-card py-20 text-center">
          <Settings className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
          <p className="text-[#4b5563] text-sm">No salary structures found.</p>
          <p className="text-[#374151] text-xs mt-1">Create a salary structure to define how payroll is computed.</p>
          <Link href="/salary-structures/new" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" />
            Create First Structure
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {structures.map((s) => {
            const activeRules = s.salaryRules.filter((r) => r.isActive);
            const categories = Array.from(new Set(s.salaryRules.map((r) => r.category))).sort();
            return (
              <div key={s.id} className="section-card p-5 hover:border-[#3b6ef0]/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-xs bg-[#3b6ef0]/10 text-[#3b6ef0] border border-[#3b6ef0]/30 px-2 py-0.5 rounded">
                        {s.code}
                      </span>
                      <h2 className="font-semibold text-white">{s.name}</h2>
                      <span className={cn(
                        'status-pill',
                        s.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                          : 'bg-[#1e2235] text-[#4b5563] border border-[#2a2d3e]'
                      )}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {s.description && <p className="text-sm text-[#6b7280] mb-3">{s.description}</p>}

                    <div className="flex flex-wrap gap-3 text-xs text-[#4b5563]">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#3b6ef0]" />
                        {activeRules.length} active rules
                      </span>
                      {categories.map((cat) => (
                        <span key={cat} className="font-mono bg-[#1e2235] border border-[#2a2d3e] px-1.5 py-0.5 rounded text-[#6b7280]">
                          {cat}
                        </span>
                      ))}
                    </div>

                    {/* Rules preview (sorted by sequence) */}
                    {s.salaryRules.length > 0 && (
                      <div className="mt-4 space-y-1">
                        {s.salaryRules
                          .sort((a, b) => a.sequence - b.sequence)
                          .slice(0, 5)
                          .map((rule) => (
                            <div key={rule.id} className="flex items-center gap-2 text-xs">
                              <span className="w-8 text-right font-mono text-[#374151]">{rule.sequence}</span>
                              <span className={cn(
                                'font-mono px-1.5 py-0.5 rounded border',
                                rule.category === 'BASIC' ? 'bg-blue-500/10 text-blue-400 border-blue-800/40' :
                                rule.category === 'ALW' ? 'bg-purple-500/10 text-purple-400 border-purple-800/40' :
                                rule.category === 'GROSS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-800/40' :
                                rule.category === 'DED' ? 'bg-red-500/10 text-red-400 border-red-800/40' :
                                'bg-yellow-500/10 text-yellow-400 border-yellow-800/40'
                              )}>
                                {rule.category}
                              </span>
                              <span className="text-white font-medium">{rule.name}</span>
                              <span className="text-[#374151] font-mono truncate max-w-48">{rule.formulaExpression}</span>
                              {!rule.isActive && <span className="text-[#374151] italic">(disabled)</span>}
                            </div>
                          ))}
                        {s.salaryRules.length > 5 && (
                          <p className="text-[10px] text-[#374151] pl-10">+{s.salaryRules.length - 5} more rules...</p>
                        )}
                      </div>
                    )}
                  </div>

                  <Link
                    href={`/salary-structures/${s.id}`}
                    className="flex-shrink-0 btn-secondary text-xs"
                  >
                    Manage Rules
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
