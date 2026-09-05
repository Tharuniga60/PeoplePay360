'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaveType } from '@/db/schema';

interface TypesTableClientProps {
  types: LeaveType[];
}

export function TypesTableClient({ types }: TypesTableClientProps) {
  const router = useRouter();

  if (types.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[#4b5563]">
        No leave types configured yet.
      </div>
    );
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Policy Name</th>
          <th>Code</th>
          <th>Unit</th>
          <th>Type</th>
          <th>Allocation</th>
          <th>Max Allowance</th>
          <th>Status</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {types.map((type) => (
          <tr
            key={type.id}
            onClick={() => router.push(`/time-off/types/${type.id}`)}
            className="hover:bg-[#1f2438]/50 transition-colors cursor-pointer group"
          >
            <td>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full border border-white/20 flex-shrink-0"
                  style={{ backgroundColor: type.color || '#3b6ef0' }}
                />
                <div>
                  <span className="font-medium text-white group-hover:text-[#3b6ef0] transition-colors">
                    {type.name}
                  </span>
                  {type.description && <p className="text-xs text-[#6b7280]">{type.description}</p>}
                </div>
              </div>
            </td>
            <td className="font-mono text-xs text-white">{type.code}</td>
            <td>
              <span className="text-xs font-medium uppercase text-[#a0aec0]">
                {type.unit || 'days'}
              </span>
            </td>
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
                {type.requiresAllocation ? 'Required' : 'Freely Requested'}
              </span>
            </td>
            <td className="font-mono text-xs text-white">
              {type.maxDaysPerYear ? `${type.maxDaysPerYear} ${type.unit || 'days'}` : 'Unlimited'}
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
            <td className="text-right">
              <Link
                href={`/time-off/types/${type.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-[#3b6ef0] hover:text-[#5887ff] font-medium transition-colors"
                title="Configure Policy"
              >
                <Settings className="w-3.5 h-3.5" />
                Configure
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
