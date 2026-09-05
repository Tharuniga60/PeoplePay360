'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, FileText, ChevronRight, X } from 'lucide-react';
import { formatDate, formatCurrency, CONTRACT_STATUS_COLORS, cn, snakeToTitle } from '@/lib/utils';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface ContractItem {
  id: string;
  name: string;
  wage: string;
  startDate: string;
  endDate: string | null;
  status: 'active' | 'draft' | 'expired' | 'cancelled';
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  salaryStructure: { name: string } | null;
  schedule: { name: string } | null;
}

interface ContractsFilterClientProps {
  contracts: ContractItem[];
  selectedStatus?: string;
  isFilteredByEmployee: boolean;
}

export function ContractsFilterClient({
  contracts,
  selectedStatus = 'all',
  isFilteredByEmployee,
}: ContractsFilterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');

  const currentStatus = searchParams.get('status') || 'all';

  function handleStatusChange(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearEmployeeFilter() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('employee_id');
    params.delete('employeeId');
    router.push(`${pathname}?${params.toString()}`);
  }

  const filtered = contracts.filter((c) => {
    const empName = `${c.employee.firstName} ${c.employee.lastName}`.toLowerCase();
    const code = c.employee.employeeCode.toLowerCase();
    const cName = c.name.toLowerCase();
    const query = search.toLowerCase();
    return empName.includes(query) || code.includes(query) || cName.includes(query);
  });

  return (
    <div className="section-card">
      <div className="p-4 border-b border-[#2a2d3e] flex items-center justify-between gap-4 flex-wrap">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 bg-[#111318] p-1 rounded-xl border border-[#2a2d3e]">
          {['all', 'active', 'draft', 'expired'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                currentStatus === s
                  ? 'bg-[#3b6ef0] text-white'
                  : 'text-[#6b7280] hover:text-white'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search & Employee Filter Clear */}
        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          {isFilteredByEmployee && (
            <button
              onClick={clearEmployeeFilter}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#1e2235] text-white border border-[#2a2d3e] hover:bg-[#2a2d3e] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear Employee Filter
            </button>
          )}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6b7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search contract, employee or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 text-xs py-2 w-full"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="w-10 h-10 text-[#2a2d3e] mx-auto mb-3" />
          <p className="text-[#4b5563] text-sm">No contracts found.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Contract Name</th>
              <th>Salary Structure</th>
              <th>Wage</th>
              <th>Period</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <Link
                    href={`/employees/${contract.employee.id}`}
                    className="font-medium text-white hover:text-[#3b6ef0] transition-colors"
                  >
                    {contract.employee.firstName} {contract.employee.lastName}
                  </Link>
                  <p className="text-xs text-[#4b5563]">{contract.employee.employeeCode}</p>
                </td>
                <td className="text-white font-medium">{contract.name}</td>
                <td className="text-[#6b7280] text-xs">{contract.salaryStructure?.name ?? '—'}</td>
                <td className="font-mono font-bold text-white">
                  {formatCurrency(parseFloat(contract.wage))}
                </td>
                <td className="text-xs text-[#6b7280]">
                  {formatDate(contract.startDate)} → {contract.endDate ? formatDate(contract.endDate) : 'Permanent'}
                </td>
                <td>
                  <span className={cn('status-pill', CONTRACT_STATUS_COLORS[contract.status])}>
                    {snakeToTitle(contract.status)}
                  </span>
                </td>
                <td>
                  <Link
                    href={`/employees/${contract.employee.id}?tab=contracts`}
                    className="text-[#6b7280] hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
