'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  X,
  Loader2,
  Lock,
  Mail,
  UserCheck,
  Building,
} from 'lucide-react';
import { cn, snakeToTitle } from '@/lib/utils';

export interface UserRow {
  id: string;
  email: string;
  role: 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';
  isActive: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
    jobPosition?: { title: string } | null;
  } | null;
}

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
  email: string;
}

interface UsersClientProps {
  initialUsers: UserRow[];
  employees: EmployeeOption[];
}

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin (Super)', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-800/40' },
  hr_payroll_manager: { label: 'HR Payroll Manager', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-800/40' },
  hr_payroll_user: { label: 'HR Payroll User', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-800/40' },
  hr_manager: { label: 'HR Manager', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-800/40' },
  employee: { label: 'Employee (Self)', color: 'text-[#9ca3af]', bg: 'bg-[#1e2235] border-[#2a2d3e]' },
};

export function UsersClient({ initialUsers, employees }: UsersClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [usersList, setUsersList] = useState<UserRow[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin'>('employee');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function openCreateDrawer() {
    setEditingUser(null);
    setSelectedEmpId('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setIsActive(true);
    setError('');
    setIsDrawerOpen(true);
  }

  function openEditDrawer(u: UserRow) {
    setEditingUser(u);
    setSelectedEmpId(u.employee?.id || '');
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setIsActive(u.isActive);
    setError('');
    setIsDrawerOpen(true);
  }

  function handleSelectEmployee(empId: string) {
    setSelectedEmpId(empId);
    if (!editingUser) {
      const emp = employees.find((e) => e.id === empId);
      if (emp?.email) {
        setEmail(emp.email);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            employeeId: selectedEmpId || null,
            isActive,
            ...(password ? { password } : {}),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to update user');
      } else {
        // Create user
        if (!password) {
          throw new Error('Password is required when creating a new user');
        }
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            role,
            employeeId: selectedEmpId || null,
            isActive,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to create user');
      }

      setIsDrawerOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = usersList.filter((u) => {
    const nameMatch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.employee &&
        `${u.employee.firstName} ${u.employee.lastName} ${u.employee.employeeCode}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));
    const roleMatch = roleFilter === 'all' || u.role === roleFilter;
    return nameMatch && roleMatch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="section-card p-4 flex items-center justify-between gap-4 flex-wrap bg-[#111318] border border-[#2a2d3e]">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5563]" />
            <input
              type="text"
              placeholder="Search user by email, employee name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-9 text-xs"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-input text-xs w-48"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hr_payroll_manager">HR Payroll Manager</option>
            <option value="hr_payroll_user">HR Payroll User</option>
            <option value="hr_manager">HR Manager</option>
            <option value="employee">Employee</option>
          </select>
        </div>

        <button onClick={openCreateDrawer} className="btn-primary text-xs flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          + New User
        </button>
      </div>

      {/* Users Table */}
      <div className="section-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d3e]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#3b6ef0]" />
            <h2 className="text-sm font-semibold text-white">System Users ({filteredUsers.length})</h2>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>User / Login</th>
              <th>Linked Employee</th>
              <th>Role</th>
              <th>Status</th>
              <th>Department / Position</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const rBadge = ROLE_BADGES[u.role] || ROLE_BADGES.employee;
              return (
                <tr key={u.id}>
                  <td>
                    <p className="font-medium text-white text-xs">{u.email}</p>
                    <p className="text-[10px] text-[#6b7280]">Created: {new Date(u.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td>
                    {u.employee ? (
                      <div>
                        <span className="font-medium text-white text-xs">
                          {u.employee.firstName} {u.employee.lastName}
                        </span>
                        <span className="font-mono text-[10px] text-[#4b5563] ml-1.5">
                          ({u.employee.employeeCode})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#6b7280] italic">Unlinked (System Account)</span>
                    )}
                  </td>
                  <td>
                    <span className={cn('status-pill text-[10px] border', rBadge.bg, rBadge.color)}>
                      {rBadge.label}
                    </span>
                  </td>
                  <td>
                    <span
                      className={cn(
                        'status-pill text-[10px]',
                        u.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                          : 'bg-red-500/10 text-red-400 border border-red-800/40'
                      )}
                    >
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="text-xs text-[#9ca3af]">
                    {u.employee?.department?.name || '—'}
                    {u.employee?.jobPosition?.title && ` • ${u.employee.jobPosition.title}`}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => openEditDrawer(u)}
                      className="inline-flex items-center gap-1 text-xs text-[#3b6ef0] hover:text-[#5887ff] px-2 py-1 rounded hover:bg-[#3b6ef0]/10 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Access
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* User Modal */}
      {mounted && isDrawerOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
              onClick={(e) => {
                if (e.target === e.currentTarget) setIsDrawerOpen(false);
              }}
            >
              <div className="w-full max-w-lg bg-[#13151f] border border-[#2a2d3e] rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#2a2d3e]">
                  <div>
                    <h3 className="font-semibold text-white text-base">
                      {editingUser ? 'Edit User Credentials & Role' : 'Create System User'}
                    </h3>
                    <p className="text-xs text-[#9ca3af] mt-0.5">
                      Assign role-based permissions and link to employee master record.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#1e2235] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto px-6 py-4">
                  {error && (
                    <div className="mb-3 p-2.5 bg-red-500/10 border border-red-800/40 rounded-lg text-xs text-red-400">
                      {error}
                    </div>
                  )}

                  <form id="user-modal-form" onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                    {/* Linked Employee */}
                    <div>
                      <label className="block font-medium text-[#cbd5e1] mb-1">
                        Linked Employee (Optional)
                      </label>
                      <select
                        value={selectedEmpId}
                        onChange={(e) => handleSelectEmployee(e.target.value)}
                        className="form-input text-xs"
                      >
                        <option value="">No linked employee (System Only)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Work Email */}
                    <div>
                      <label className="block font-medium text-[#cbd5e1] mb-1">
                        Work Email (Login Username) *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                        <input
                          type="email"
                          required
                          disabled={Boolean(editingUser)}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@company.com"
                          className="form-input pl-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block font-medium text-[#cbd5e1] mb-1">
                        {editingUser ? 'New Password (Leave blank to keep current)' : 'Password *'}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280]" />
                        <input
                          type="password"
                          required={!editingUser}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="form-input pl-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Role Radio Picker (Section 0 Mockup) */}
                    <div>
                      <label className="block font-medium text-[#cbd5e1] mb-1.5">
                        Assigned Role &amp; Permissions *
                      </label>
                      <div className="space-y-1.5 border border-[#2a2d3e] rounded-xl p-2.5 bg-[#111318]">
                        {[
                          { id: 'employee', label: 'Employee', desc: 'Own attendance, leaves, and payslips only' },
                          { id: 'hr_manager', label: 'HR Manager', desc: 'CRUD on HR master data & leaves. No payroll access.' },
                          { id: 'hr_payroll_user', label: 'HR Payroll User', desc: 'Can run & view payruns. Read-only on structures & rules.' },
                          { id: 'hr_payroll_manager', label: 'HR Payroll Manager', desc: 'Full CRUD on Payruns, Payslips, Rules & Structures.' },
                          { id: 'admin', label: 'Admin', desc: 'Unrestricted system-wide access and user administration.' },
                        ].map((r) => (
                          <label
                            key={r.id}
                            className={cn(
                              'flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors',
                              role === r.id ? 'bg-[#3b6ef0]/15 border border-[#3b6ef0]/40' : 'hover:bg-[#1a1d27]'
                            )}
                          >
                            <input
                              type="radio"
                              name="roleSelection"
                              value={r.id}
                              checked={role === r.id}
                              onChange={() => setRole(r.id as any)}
                              className="mt-0.5 text-[#3b6ef0] focus:ring-0"
                            />
                            <div>
                              <p className="font-semibold text-white text-xs">{r.label}</p>
                              <p className="text-[11px] text-[#6b7280]">{r.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded border-[#2a2d3e] bg-[#111318] text-[#3b6ef0] focus:ring-0 w-4 h-4"
                        />
                        <span className="font-medium text-white text-xs">Account is Active</span>
                      </label>
                    </div>
                  </form>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 bg-[#0e1017] border-t border-[#2a2d3e] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[#9ca3af] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="user-modal-form"
                    disabled={loading}
                    className="btn-primary text-xs"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editingUser ? 'Update User' : 'Save User'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
