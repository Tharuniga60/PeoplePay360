import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { leaveAllocations, leaveTypes, employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Calendar, Plus, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';

import { AllocationsTableClient } from './allocations-table-client';

export const metadata: Metadata = { title: 'Leave Allocations' };

export default async function LeaveAllocationsPage() {
  const session = await auth();
  const isEmployee = session?.user?.role === 'employee';
  const canManage = canManageEmployees(session?.user?.role ?? '');

  let allocations;
  if (isEmployee && session?.user?.employeeId) {
    allocations = await db.query.leaveAllocations.findMany({
      where: eq(leaveAllocations.employeeId, session.user.employeeId),
      with: { leaveType: true, employee: true },
      orderBy: (la, { desc }) => [desc(la.year)],
    });
  } else {
    allocations = await db.query.leaveAllocations.findMany({
      with: { leaveType: true, employee: true },
      orderBy: (la, { desc }) => [desc(la.year), la.employeeId],
    });
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Leave Allocations</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">
            {isEmployee ? 'Your leave balances' : `${allocations.length} allocation(s)`}
          </p>
        </div>
        {canManage && (
          <Link href="/leave-allocations/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Allocate Leave
          </Link>
        )}
      </div>

      <div className="section-card">
        <AllocationsTableClient
          allocations={allocations.map((a) => ({
            id: a.id,
            year: a.year,
            totalDays: a.totalDays,
            usedDays: a.usedDays,
            status: a.status,
            employee: {
              id: a.employee.id,
              firstName: a.employee.firstName,
              lastName: a.employee.lastName,
              employeeCode: a.employee.employeeCode,
            },
            leaveType: {
              id: a.leaveType.id,
              name: a.leaveType.name,
              isPaid: a.leaveType.isPaid,
            },
          }))}
          isEmployee={isEmployee}
          currentYear={currentYear}
        />
      </div>
    </div>
  );
}
