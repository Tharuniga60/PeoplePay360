'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertCircle,
  FileText,
  Building2,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { formatDate, cn, snakeToTitle } from '@/lib/utils';

interface RequestDetailProps {
  request: any;
  canApprove: boolean;
}

export function RequestDetailClient({
  request: initialRequest,
  canApprove,
}: RequestDetailProps) {
  const router = useRouter();
  const [request, setRequest] = useState(initialRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Refusal modal state
  const [showRefusalModal, setShowRefusalModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  async function handleStatusTransition(targetStatus: string, reasonText?: string) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/leaves/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          rejectionReason: reasonText || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update request');

      setRequest(data.data);
      setShowRefusalModal(false);
      setSuccess(`Request status updated to ${targetStatus.toUpperCase()}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { key: 'pending', label: 'To Approve / Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Refused' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/time-off/requests"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Time Off Request</h1>
              <span
                className={cn(
                  'status-pill',
                  request.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-800/40'
                    : request.status === 'rejected'
                    ? 'bg-red-500/10 text-red-400 border border-red-800/40'
                    : request.status === 'cancelled'
                    ? 'bg-gray-500/10 text-gray-400 border border-gray-800/40'
                    : 'bg-yellow-500/10 text-yellow-400 border border-yellow-800/40'
                )}
              >
                {request.status === 'rejected' ? 'Refused' : snakeToTitle(request.status)}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Requested on {formatDate(request.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {request.status === 'pending' && canApprove && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleStatusTransition('approved')}
                className="btn-primary inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowRefusalModal(true)}
                className="btn-secondary text-red-400 hover:text-red-300 inline-flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                Refuse
              </button>
            </>
          )}

          {(request.status === 'rejected' || request.status === 'cancelled') && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusTransition('pending')}
              className="btn-secondary inline-flex items-center gap-1.5 text-blue-400"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Draft
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Employee Info */}
      <div className="section-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-base font-bold">
            {request.employee?.firstName?.[0]}
            {request.employee?.lastName?.[0]}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {request.employee?.firstName} {request.employee?.lastName}
            </h3>
            <p className="text-xs text-[#6b7280]">
              {request.employee?.employeeCode} · {request.employee?.department?.name || 'No Dept'} ·{' '}
              {request.employee?.jobPosition?.name || 'No Position'}
            </p>
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div className="section-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
          <Calendar className="w-4 h-4 text-purple-400" />
          Leave Allocation & Period Specifications
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-3.5 bg-[#111318] rounded-xl border border-[#2a2d3e]">
            <p className="text-xs text-[#6b7280]">Time Off Type</p>
            <p className="text-base font-semibold text-white mt-1">
              {request.leaveType?.name || 'Paid Time Off'}
            </p>
            <p className="text-[11px] text-[#4b5563]">Code: {request.leaveType?.code || 'PTO'}</p>
          </div>

          <div className="p-3.5 bg-[#111318] rounded-xl border border-[#2a2d3e]">
            <p className="text-xs text-[#6b7280]">Duration Requested</p>
            <p className="text-base font-bold text-purple-400 font-mono mt-1">
              {parseFloat(request.numberOfDays)} Days
            </p>
            <p className="text-[11px] text-[#4b5563]">Working schedule days</p>
          </div>

          <div className="p-3.5 bg-[#111318] rounded-xl border border-[#2a2d3e]">
            <p className="text-xs text-[#6b7280]">Dates</p>
            <p className="text-xs font-semibold text-white mt-1">
              {formatDate(request.startDate)}
            </p>
            <p className="text-xs text-[#6b7280]">to {formatDate(request.endDate)}</p>
          </div>
        </div>

        {request.reason && (
          <div>
            <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">
              Employee Stated Reason
            </label>
            <div className="mt-1 p-3.5 rounded-xl bg-[#111318] border border-[#2a2d3e] text-xs text-[#e2e8f0]">
              {request.reason}
            </div>
          </div>
        )}

        {request.rejectionReason && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xs font-semibold text-red-400 mb-1">Refusal Reason Note:</p>
            <p className="text-xs text-[#e2e8f0]">{request.rejectionReason}</p>
          </div>
        )}

        {request.approvedAt && (
          <div className="p-3.5 rounded-xl bg-[#111318] border border-[#2a2d3e] flex items-center justify-between text-xs">
            <span className="text-[#6b7280]">
              Validated & Approved by {request.approvedBy?.name || 'HR Manager'}
            </span>
            <span className="text-[#a0aec0] font-mono">{formatDate(request.approvedAt)}</span>
          </div>
        )}
      </div>

      {/* Refusal Modal */}
      {showRefusalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="section-card w-full max-w-md p-6 border border-[#2a2d3e] space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              Refuse Time Off Request
            </h3>
            <p className="text-xs text-[#6b7280]">
              Please state the reason for refusing this leave request for the employee to review.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Critical project deadline / Insufficient team coverage"
              className="form-input w-full text-xs"
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefusalModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !rejectionReason.trim()}
                onClick={() => handleStatusTransition('rejected', rejectionReason)}
                className="btn-primary text-xs bg-red-600 hover:bg-red-500 text-white"
              >
                {loading ? 'Refusing...' : 'Confirm Refusal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
