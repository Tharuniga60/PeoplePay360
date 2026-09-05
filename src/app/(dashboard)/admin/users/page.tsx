import type { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, employees } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { UsersClient } from './users-client';

export const metadata: Metadata = { title: 'User Management & RBAC' };

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  const [allUsers, allEmployees] = await Promise.all([
    db.query.users.findMany({
      where: eq(users.companyId, session.user.companyId),
      with: {
        employee: {
          with: {
            department: true,
            jobPosition: true,
          },
        },
      },
      orderBy: [desc(users.createdAt)],
    }),
    db.query.employees.findMany({
      where: eq(employees.companyId, session.user.companyId),
      orderBy: [desc(employees.firstName)],
    }),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Accounts &amp; Access Control</h1>
        <p className="text-[#6b7280] text-sm mt-0.5">
          Manage system users, assign role-based permissions, and link accounts to employee records.
        </p>
      </div>

      <UsersClient
        initialUsers={allUsers}
        employees={allEmployees.map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`,
          code: e.employeeCode,
          email: e.email,
        }))}
      />
    </div>
  );
}
