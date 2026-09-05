import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db';
import { leaveTypes, type LeaveType } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { Settings, Plus, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';

import { TypesTableClient } from './types-table-client';

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
        <Link href="/time-off/types/new" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Time Off Type
        </Link>
      </div>

      <div className="section-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2a2d3e]">
          <Settings className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Configured Leave Types ({types.length})</h2>
        </div>

        <TypesTableClient types={types} />
      </div>
    </div>
  );
}
