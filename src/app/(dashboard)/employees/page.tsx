import type { Metadata } from 'next';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  employees,
  contracts,
  type Employee,
  type Department,
  type JobPosition,
  type Contract,
} from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { Users, Plus, ChevronRight, Search } from 'lucide-react';
import { formatDate, CONTRACT_STATUS_COLORS, cn, snakeToTitle, getInitials } from '@/lib/utils';
import { canManageEmployees } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { EmployeeListClient } from './employee-list-client';

export const metadata: Metadata = { title: 'Employees' };

type EmployeeWithRelations = Employee & {
  department: Department | null;
  jobPosition: JobPosition | null;
  contracts: Contract[];
};

export default async function EmployeesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role || '';
  if (!canManageEmployees(role)) {
    if (session.user.employeeId) {
      redirect(`/employees/${session.user.employeeId}`);
    } else {
      redirect('/?error=unauthorized');
    }
  }

  const empList: EmployeeWithRelations[] = (await db.query.employees.findMany({
    where: eq(employees.companyId, session!.user.companyId),
    with: {
      department: true,
      jobPosition: true,
      contracts: {
        where: eq(contracts.status, 'active'),
        limit: 1,
      },
    },
    orderBy: [asc(employees.firstName)],
  })) as EmployeeWithRelations[];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Employees</h1>
        </div>
        <Link href="/employees/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Employee
        </Link>
      </div>

      {/* Employee List with Kanban & Table Views */}
      <EmployeeListClient
        employees={empList.map((emp) => ({
          id: emp.id,
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          dateOfJoining: emp.dateOfJoining,
          department: emp.department ? { name: emp.department.name } : null,
          jobPosition: emp.jobPosition ? { title: emp.jobPosition.title } : null,
          contracts: emp.contracts.map((c) => ({
            id: c.id,
            status: c.status,
            name: c.name,
          })),
        }))}
      />
    </div>
  );
}
