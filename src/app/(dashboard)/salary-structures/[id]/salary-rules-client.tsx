'use client';

import { useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';

interface SalaryRulesClientProps {
  structureId: string;
  companyId: string;
}

const CATEGORIES = ['BASIC', 'ALW', 'GROSS', 'DED', 'NET', 'OTHER'] as const;
const COMP_TYPES = ['formula', 'fixed'] as const;

export function SalaryRulesClient({ structureId, companyId }: SalaryRulesClientProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);

    const data = {
      salaryStructureId: structureId,
      sequence: parseInt(formData.get('sequence') as string),
      code: formData.get('code'),
      name: formData.get('name'),
      category: formData.get('category'),
      computationType: formData.get('computationType') || 'formula',
      conditionExpression: (formData.get('conditionExpression') as string) || 'true',
      formulaExpression: formData.get('formulaExpression'),
      description: formData.get('description') || undefined,
      appearsOnPayslip: true,
    };

    try {
      const res = await fetch('/api/salary-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed to create rule');
      } else {
        setOpen(false);
        window.location.reload();
      }
    } catch {
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Rule
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-[#2a2d3e] rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3e]">
              <h2 className="text-lg font-semibold text-white">Add Salary Rule</h2>
              <button onClick={() => setOpen(false)} className="text-[#4b5563] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Sequence * (execution order)</label>
                  <input type="number" name="sequence" required min="1" step="10" className="form-input" placeholder="10" />
                </div>
                <div>
                  <label className={labelClass}>Code * (unique short ID)</label>
                  <input type="text" name="code" required className="form-input" placeholder="BASIC" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Rule Name *</label>
                  <input type="text" name="name" required className="form-input" placeholder="Basic Salary" />
                </div>
                <div>
                  <label className={labelClass}>Category *</label>
                  <select name="category" required className="form-input">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Computation Type</label>
                  <select name="computationType" className="form-input">
                    {COMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Formula Expression *</label>
                  <input type="text" name="formulaExpression" required className="form-input font-mono" placeholder="e.g. contract.wage or categories.BASIC * 0.40" />
                  <p className="text-[10px] text-[#374151] mt-1">Use: contract.wage, categories.BASIC, categories.ALW, categories.GROSS, categories.DED, worked_days, loss_of_pay_days, etc.</p>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Condition (leave blank or &apos;true&apos; to always run)</label>
                  <input type="text" name="conditionExpression" className="form-input font-mono" placeholder="true" defaultValue="true" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Description</label>
                  <input type="text" name="description" className="form-input" placeholder="Optional description..." />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#2a2d3e]">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
