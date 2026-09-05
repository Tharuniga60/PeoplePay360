import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { leaveTypes, type LeaveType } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Settings, Plus, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';

export const metadata: Metadata = { title: 'Leave Types Configuration' };

export default async function LeaveTypesConfigPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  if (!canManageEmployees(role)) {
    redirect('/time-off/requests');
  }

  const types: LeaveType[] = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.companyId, session.user.companyId),
    orderBy: [asc(leaveTypes.name)],
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Time Off Policies & Types</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            Configure leave policies, paid/unpaid status, and allocation requirements.
          </p>
        </div>
      </div>

      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <Settings className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Configured Leave Types ({types.length})</h2>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Policy Name</th>
              <th>Code</th>
              <th>Type</th>
              <th>Allocation Required</th>
              <th>Max Days / Year</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {types.map((type) => (
              <tr key={type.id}>
                <td>
                  <p className="font-medium text-white">{type.name}</p>
                  {type.description && <p className="text-xs text-[#6b7280]">{type.description}</p>}
                </td>
                <td className="font-mono text-xs text-white">{type.code}</td>
                <td>
                  <span
                    className={cn(
                      'status-pill',
                      type.isPaid
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-800/40'
                    )}
                  >
                    {type.isPaid ? 'Paid Leave' : 'Unpaid (Loss of Pay)'}
                  </span>
                </td>
                <td>
                  <span className="text-xs text-[#9ca3af]">
                    {type.isPaid ? 'Yes (Requires Allocation)' : 'No (Freely requested)'}
                  </span>
                </td>
                <td className="font-mono text-xs text-white">
                  {type.maxDaysPerYear ? `${type.maxDaysPerYear} days` : 'Unlimited'}
                </td>
                <td>
                  <span
                    className={cn(
                      'status-pill',
                      type.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                        : 'bg-[#1e2235] text-[#4b5563]'
                    )}
                  >
                    {type.isActive ? 'Active' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
