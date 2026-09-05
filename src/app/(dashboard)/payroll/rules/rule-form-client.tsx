'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sliders,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Parser } from 'expr-eval';

interface RuleFormClientProps {
  initialData?: any;
  structures: any[];
  canEdit: boolean;
  isNew?: boolean;
}

const parser = new Parser();

export function RuleFormClient({
  initialData,
  structures,
  canEdit,
  isNew = false,
}: RuleFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [category, setCategory] = useState<'BASIC' | 'ALW' | 'GROSS' | 'DED' | 'NET' | 'OTHER'>(
    initialData?.category || 'ALW'
  );
  const [sequence, setSequence] = useState(initialData?.sequence || 10);
  const [salaryStructureId, setSalaryStructureId] = useState(
    initialData?.salaryStructureId || (structures[0]?.id ?? '')
  );
  const [conditionExpression, setConditionExpression] = useState(
    initialData?.conditionExpression || 'true'
  );
  const [computationType, setComputationType] = useState(
    initialData?.computationType || 'formula'
  );
  const [formulaExpression, setFormulaExpression] = useState(
    initialData?.formulaExpression || 'contract.wage * 0.10'
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [appearsOnPayslip, setAppearsOnPayslip] = useState(
    initialData?.appearsOnPayslip ?? true
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // Live Sandbox Testing State
  const [sandboxWage, setSandboxWage] = useState(50000);
  const [sandboxBasic, setSandboxBasic] = useState(25000);
  const [sandboxGross, setSandboxGross] = useState(45000);
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);

  function runSandboxTest() {
    setSandboxError(null);
    try {
      // 1. Evaluate condition
      const condExpr = parser.parse(conditionExpression);
      const condValid = condExpr.evaluate({
        contract: { wage: sandboxWage },
        categories: { BASIC: sandboxBasic, GROSS: sandboxGross },
        worked_days: 22,
        loss_of_pay_days: 0,
      });

      if (!condValid) {
        setSandboxResult('Condition evaluated to FALSE — Rule will be skipped.');
        return;
      }

      // 2. Evaluate formula
      const formulaExpr = parser.parse(formulaExpression);
      const res = formulaExpr.evaluate({
        contract: { wage: sandboxWage },
        categories: { BASIC: sandboxBasic, GROSS: sandboxGross },
        worked_days: 22,
        planned_days: 22,
        worked_hours: 176,
        planned_hours: 176,
        loss_of_pay_days: 0,
        BASIC: sandboxBasic,
        GROSS: sandboxGross,
      });

      setSandboxResult(`Computed Value: ₹${Number(res).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } catch (err: any) {
      setSandboxError(err.message || 'Syntax error in expression');
      setSandboxResult(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      salaryStructureId,
      name,
      code: code.toUpperCase(),
      category,
      sequence: parseInt(sequence.toString(), 10),
      computationType,
      conditionExpression,
      formulaExpression,
      description,
      appearsOnPayslip,
      isActive,
    };

    try {
      const url = isNew ? '/api/salary-rules' : `/api/salary-rules/${initialData.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save salary rule');

      setSuccess('Salary rule saved successfully.');
      setTimeout(() => {
        router.push('/payroll/rules');
      }, 700);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this salary rule?')) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/salary-rules/${initialData.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete rule');

      router.push('/payroll/rules');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/payroll/rules"
            className="p-2 rounded-xl bg-[#1e2235] hover:bg-[#2a2d3e] text-[#a0aec0] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {isNew ? 'New Salary Rule' : name}
              </h1>
              <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-800/40">
                Seq: {sequence}
              </span>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              {isNew ? 'Define a computational salary rule' : `Rule Code: ${code}`}
            </p>
          </div>
        </div>

        {!isNew && canEdit && (
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete Rule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
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

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="section-card p-6 space-y-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
              <Sliders className="w-4 h-4 text-blue-400" />
              Rule Parameters & Definition
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Rule Name *</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. House Rent Allowance (HRA)"
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label">Rule Code *</label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. HRA, PF, DA, TDS"
                  className="form-input w-full font-mono uppercase"
                />
              </div>

              <div>
                <label className="form-label">Category *</label>
                <select
                  disabled={!canEdit}
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="BASIC">BASIC (Base Pay)</option>
                  <option value="ALW">ALW (Allowance)</option>
                  <option value="GROSS">GROSS (Gross Salary)</option>
                  <option value="DED">DED (Deduction)</option>
                  <option value="NET">NET (Net Salary)</option>
                  <option value="OTHER">OTHER (Reimbursements/Tax)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Sequence (Execution Order) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  disabled={!canEdit}
                  value={sequence}
                  onChange={(e) => setSequence(parseInt(e.target.value) || 1)}
                  className="form-input w-full font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Salary Structure Assignment *</label>
                <select
                  required
                  disabled={!canEdit}
                  value={salaryStructureId}
                  onChange={(e) => setSalaryStructureId(e.target.value)}
                  className="form-input w-full"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#2a2d3e] space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0">Condition Expression</label>
                  <span className="text-[11px] text-[#6b7280]">Returns true or false</span>
                </div>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={conditionExpression}
                  onChange={(e) => setConditionExpression(e.target.value)}
                  placeholder="e.g. true OR contract.wage > 30000"
                  className="form-input w-full font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label mb-0">Computation Formula Expression *</label>
                  <span className="text-[11px] text-[#6b7280]">Sandboxed math parser</span>
                </div>
                <textarea
                  rows={3}
                  required
                  disabled={!canEdit}
                  value={formulaExpression}
                  onChange={(e) => setFormulaExpression(e.target.value)}
                  placeholder="e.g. contract.wage * 0.40 OR categories.BASIC * 0.12"
                  className="form-input w-full font-mono text-xs"
                />
                <p className="text-[11px] text-[#4b5563] mt-1">
                  Available variables: <code className="text-blue-400">contract.wage</code>,{' '}
                  <code className="text-blue-400">categories.BASIC</code>,{' '}
                  <code className="text-blue-400">categories.GROSS</code>,{' '}
                  <code className="text-blue-400">worked_days</code>,{' '}
                  <code className="text-blue-400">loss_of_pay_days</code>
                </p>
              </div>

              <div>
                <label className="form-label">Rule Description</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes regarding statutory reference or formula basis"
                  className="form-input w-full text-xs"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={appearsOnPayslip}
                    onChange={(e) => setAppearsOnPayslip(e.target.checked)}
                    className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
                  />
                  <span className="text-xs text-[#e2e8f0]">Appears on Printed Payslip</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-[#374151] text-[#3b6ef0] bg-[#1e2235]"
                  />
                  <span className="text-xs text-[#e2e8f0]">Active Rule</span>
                </label>
              </div>
            </div>

            {canEdit && (
              <div className="pt-3 border-t border-[#2a2d3e] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/payroll/rules')}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary inline-flex items-center gap-2 text-xs"
                >
                  <Save className="w-4 h-4" />
                  {isNew ? 'Create Salary Rule' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Sandbox Simulator */}
        <div className="space-y-6">
          <div className="section-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-[#2a2d3e] pb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              Formula Sandbox Simulator
            </h3>
            <p className="text-xs text-[#6b7280]">
              Test your rule expressions in real-time against mock contract and category variables.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#6b7280]">Mock Monthly Wage</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">₹</span>
                  <input
                    type="number"
                    value={sandboxWage}
                    onChange={(e) => setSandboxWage(parseFloat(e.target.value) || 0)}
                    className="form-input pl-7 text-xs font-mono w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6b7280]">Mock BASIC Category</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">₹</span>
                  <input
                    type="number"
                    value={sandboxBasic}
                    onChange={(e) => setSandboxBasic(parseFloat(e.target.value) || 0)}
                    className="form-input pl-7 text-xs font-mono w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6b7280]">Mock GROSS Category</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">₹</span>
                  <input
                    type="number"
                    value={sandboxGross}
                    onChange={(e) => setSandboxGross(parseFloat(e.target.value) || 0)}
                    className="form-input pl-7 text-xs font-mono w-full"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={runSandboxTest}
                className="btn-primary w-full inline-flex items-center justify-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-500 text-white mt-2"
              >
                <Play className="w-3.5 h-3.5" />
                Simulate Calculation
              </button>

              {sandboxResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  {sandboxResult}
                </div>
              )}

              {sandboxError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                  {sandboxError}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
