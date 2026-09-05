import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import { employees } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Users, Plus, ChevronRight, Search } from 'lucide-react';
import { formatDate, CONTRACT_STATUS_COLORS, cn, snakeToTitle, getInitials } from '@/lib/utils';

export const metadata: Metadata = { title: 'Employees' };

export default async function EmployeesPage() {
  const session = await auth();

  const empList = await db.query.employees.findMany({
    where: eq(employees.companyId, session!.user.companyId),
    with: {
      department: true,
      jobPosition: true,
      contracts: {
        where: (c, { eq: eqFn }) => eqFn(c.status, 'active'),
        limit: 1,
      },
    },
    orderBy: (e, { asc }) => [asc(e.firstName)],
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Employees</h1>
          <p className="text-[#6b7280] text-sm mt-0.5">{empList.length} team members</p>
        </div>
        <Link href="/employees/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Employee
        </Link>
      </div>

      {/* Employee Table */}
      <div className="section-card">
        {empList.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
            <p className="text-[#4b5563] text-sm">No employees found.</p>
            <p className="text-[#374151] text-xs mt-1">Add your first employee to get started.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Position</th>
                <th>Joined</th>
                <th>Contract</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {empList.map((emp) => {
                const activeContract = emp.contracts[0];
                return (
                  <tr key={emp.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3b6ef0]/20 flex items-center justify-center text-[#3b6ef0] text-xs font-bold flex-shrink-0">
                          {getInitials(emp.firstName, emp.lastName)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-[#4b5563]">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="font-mono text-xs text-[#6b7280]">{emp.employeeCode}</span></td>
                    <td>{emp.department?.name ?? '—'}</td>
                    <td>{emp.jobPosition?.title ?? '—'}</td>
                    <td className="text-[#6b7280]">{formatDate(emp.dateOfJoining)}</td>
                    <td>
                      {activeContract ? (
                        <span className={cn('status-pill', CONTRACT_STATUS_COLORS['active'])}>
                          Active
                        </span>
                      ) : (
                        <span className={cn('status-pill', CONTRACT_STATUS_COLORS['expired'])}>
                          No Contract
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={cn('status-pill', emp.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                        : 'bg-red-500/10 text-red-400 border border-red-800/40')}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/employees/${emp.id}`} className="text-[#3b6ef0] hover:text-blue-300 flex items-center gap-0.5 text-xs justify-end">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
