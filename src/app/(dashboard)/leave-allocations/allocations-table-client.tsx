'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AllocationRow {
  id: string;
  year: number;
  totalDays: string | number;
  usedDays: string | number;
  status: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  leaveType: {
    id: string;
    name: string;
    isPaid: boolean;
  };
}

interface AllocationsTableClientProps {
  allocations: AllocationRow[];
  isEmployee: boolean;
  currentYear: number;
}

export function AllocationsTableClient({
  allocations,
  isEmployee,
  currentYear,
}: AllocationsTableClientProps) {
  const router = useRouter();

  if (allocations.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[#4b5563]">
        No leave allocations found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {!isEmployee && <th>Employee</th>}
            <th>Leave Type</th>
            <th>Year</th>
            <th>Total Days</th>
            <th>Used Days</th>
            <th>Balance</th>
            <th>Status</th>
            <th className="text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((alloc) => {
            const total = parseFloat(alloc.totalDays.toString());
            const used = parseFloat(alloc.usedDays.toString());
            const balance = total - used;
            const pct = total > 0 ? (used / total) * 100 : 0;
            const isLow = balance > 0 && balance < 3;
            const isExhausted = balance <= 0;

            return (
              <tr
                key={alloc.id}
                onClick={() => router.push(`/time-off/allocations/${alloc.id}`)}
                className="hover:bg-[#1f2438]/50 transition-colors cursor-pointer group"
              >
                {!isEmployee && (
                  <td>
                    <span className="font-medium text-white group-hover:text-[#3b6ef0] transition-colors">
                      {alloc.employee.firstName} {alloc.employee.lastName}
                    </span>
                    <p className="text-xs text-[#4b5563]">{alloc.employee.employeeCode}</p>
                  </td>
                )}
                <td>
                  <p className="font-medium text-white">{alloc.leaveType.name}</p>
                  <p className="text-xs text-[#4b5563]">{alloc.leaveType.isPaid ? 'Paid' : 'Unpaid'}</p>
                </td>
                <td>
                  <span
                    className={cn(
                      'font-mono text-sm px-2 py-0.5 rounded border',
                      alloc.year === currentYear
                        ? 'bg-[#3b6ef0]/10 text-[#3b6ef0] border-[#3b6ef0]/30'
                        : 'bg-[#1e2235] text-[#4b5563] border-[#2a2d3e]'
                    )}
                  >
                    {alloc.year}
                  </span>
                </td>
                <td className="font-mono font-medium text-white">{total}</td>
                <td className="font-mono text-yellow-400">{used}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#2a2d3e] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          isExhausted ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'font-mono font-bold text-sm',
                        isExhausted ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-emerald-400'
                      )}
                    >
                      {balance}
                    </span>
                    {isLow && !isExhausted && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                  </div>
                </td>
                <td>
                  <span
                    className={cn(
                      'status-pill',
                      isExhausted
                        ? 'bg-red-500/10 text-red-400 border border-red-800/40'
                        : isLow
                        ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-800/40'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                    )}
                  >
                    {isExhausted ? 'Exhausted' : isLow ? 'Low' : 'Available'}
                  </span>
                </td>
                <td className="text-right">
                  <Link
                    href={`/time-off/allocations/${alloc.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded text-[#6b7280] hover:text-white inline-flex transition-colors"
                    title="View Allocation"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
