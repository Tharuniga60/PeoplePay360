'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  Mail,
  Building2,
  Briefcase,
  FileText,
} from 'lucide-react';
import { formatDate, CONTRACT_STATUS_COLORS, cn, snakeToTitle, getInitials } from '@/lib/utils';

interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfJoining: string;
  department: { name: string } | null;
  jobPosition: { title: string } | null;
  contracts: Array<{
    id: string;
    status: 'active' | 'draft' | 'expired' | 'cancelled';
    name: string;
  }>;
}

interface EmployeeListClientProps {
  employees: EmployeeItem[];
}

export function EmployeeListClient({ employees }: EmployeeListClientProps) {
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [search, setSearch] = useState('');

  const filtered = employees.filter((emp) => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const code = emp.employeeCode.toLowerCase();
    const dept = (emp.department?.name ?? '').toLowerCase();
    const pos = (emp.jobPosition?.title ?? '').toLowerCase();
    const query = search.toLowerCase();
    return fullName.includes(query) || code.includes(query) || dept.includes(query) || pos.includes(query);
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-[#111318] p-3 rounded-2xl border border-[#2a2d3e]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name, code, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 text-xs py-2 w-full"
          />
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#0d0f14] p-1 rounded-xl border border-[#2a2d3e]">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              viewMode === 'kanban'
                ? 'bg-[#3b6ef0] text-white'
                : 'text-[#6b7280] hover:text-white'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              viewMode === 'table'
                ? 'bg-[#3b6ef0] text-white'
                : 'text-[#6b7280] hover:text-white'
            )}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center section-card">
          <Users className="w-12 h-12 text-[#2a2d3e] mx-auto mb-4" />
          <p className="text-[#4b5563] text-sm">No employees match your search.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => {
            const activeContract = emp.contracts[0];
            return (
              <Link
                key={emp.id}
                href={`/employees/${emp.id}`}
                className="section-card p-5 hover:border-[#3b6ef0]/60 transition-all hover:scale-[1.01] hover:shadow-xl group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#3b6ef0]/20 flex items-center justify-center text-[#3b6ef0] text-sm font-bold flex-shrink-0 group-hover:bg-[#3b6ef0] group-hover:text-white transition-colors">
                        {getInitials(emp.firstName, emp.lastName)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-[#3b6ef0] transition-colors text-sm">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <p className="text-xs text-[#6b7280] font-mono">{emp.employeeCode}</p>
                      </div>
                    </div>
                    {activeContract ? (
                      <span className="status-pill bg-emerald-500/10 text-emerald-400 border border-emerald-800/40 text-[10px]">
                        Active Contract
                      </span>
                    ) : (
                      <span className="status-pill bg-yellow-500/10 text-yellow-400 border border-yellow-800/40 text-[10px]">
                        No Contract
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-[#9ca3af] pt-1 border-t border-[#1e2235]">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-[#4b5563]" />
                      <span>{emp.jobPosition?.title ?? 'No Position Assigned'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#4b5563]" />
                      <span>{emp.department?.name ?? 'No Department'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#6b7280]">
                      <Mail className="w-3.5 h-3.5 text-[#4b5563]" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e2235] flex items-center justify-between text-[11px] text-[#4b5563]">
                  <span>Joined {formatDate(emp.dateOfJoining)}</span>
                  <span className="flex items-center gap-1 text-[#3b6ef0] font-medium group-hover:translate-x-0.5 transition-transform">
                    View 360 Profile <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="section-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Position</th>
                <th>Joined</th>
                <th>Contract</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
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
                        <span className="status-pill bg-emerald-500/10 text-emerald-400 border border-emerald-800/40">
                          Active
                        </span>
                      ) : (
                        <span className="status-pill bg-[#1e2235] text-[#4b5563] border border-[#2a2d3e]">
                          None
                        </span>
                      )}
                    </td>
                    <td>
                      <Link
                        href={`/employees/${emp.id}`}
                        className="text-[#3b6ef0] hover:text-white text-xs font-medium flex items-center gap-1"
                      >
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
