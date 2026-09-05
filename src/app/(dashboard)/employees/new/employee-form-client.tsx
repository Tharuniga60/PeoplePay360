'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, User, Mail, Phone, Building2, Briefcase, Calendar, CreditCard, Clock } from 'lucide-react';

interface Department { id: string; name: string; }
interface JobPosition { id: string; title: string; }
interface WorkingSchedule { id: string; name: string; hoursPerWeek: string; }

interface EmployeeFormClientProps {
  companyId: string;
  departments: Department[];
  jobPositions: JobPosition[];
  workingSchedules: WorkingSchedule[];
}

export function EmployeeFormClient({ companyId, departments, jobPositions, workingSchedules }: EmployeeFormClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const getValue = (key: string) => {
      const v = formData.get(key) as string;
      return v && v.trim() !== '' ? v : undefined;
    };

    const data: Record<string, unknown> = {
      companyId,
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      employeeCode: formData.get('employeeCode'),
      dateOfJoining: formData.get('dateOfJoining'),
      employmentType: formData.get('employmentType') || 'full_time',
      phone: getValue('phone'),
      gender: getValue('gender'),
      dateOfBirth: getValue('dateOfBirth'),
      departmentId: getValue('departmentId'),
      jobPositionId: getValue('jobPositionId'),
      defaultScheduleId: getValue('defaultScheduleId'),
      panNumber: getValue('panNumber'),
      pfAccountNumber: getValue('pfAccountNumber'),
      bankName: getValue('bankName'),
      bankAccountNumber: getValue('bankAccountNumber'),
      bankIfscCode: getValue('bankIfscCode'),
      bankBranch: getValue('bankBranch'),
    };

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || JSON.stringify(result.issues) || 'Failed to create employee');
      } else {
        const result = await res.json();
        router.push(`/employees/${result.data.id}`);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  const sectionClass = 'section-card p-6 space-y-5';
  const labelClass = 'block text-xs font-medium text-[#9ca3af] mb-1.5 uppercase tracking-wide';
  const inputClass = 'form-input';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-800/40 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Personal Information */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2d3e]">
          <User className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Personal Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name *</label>
            <input type="text" name="firstName" required className={inputClass} placeholder="Priya" />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input type="text" name="lastName" required className={inputClass} placeholder="Sharma" />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" name="email" required className={inputClass} placeholder="priya@company.com" />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" name="phone" className={inputClass} placeholder="+91 98765 43210" />
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input type="date" name="dateOfBirth" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select name="gender" className={inputClass}>
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employment Details */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2d3e]">
          <Briefcase className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Employment Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Employee Code *</label>
            <input type="text" name="employeeCode" required className={inputClass} placeholder="EMP-001" />
          </div>
          <div>
            <label className={labelClass}>Employment Type</label>
            <select name="employmentType" className={inputClass}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Date of Joining *</label>
            <input type="date" name="dateOfJoining" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <select name="departmentId" className={inputClass}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Job Position</label>
            <select name="jobPositionId" className={inputClass}>
              <option value="">None</option>
              {jobPositions.map((jp) => (
                <option key={jp.id} value={jp.id}>{jp.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Default Working Schedule</label>
            <select name="defaultScheduleId" className={inputClass}>
              <option value="">None</option>
              {workingSchedules.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name} ({ws.hoursPerWeek}h/wk)</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statutory Information */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2d3e]">
          <Calendar className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Statutory Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>PAN Number</label>
            <input type="text" name="panNumber" className={inputClass} placeholder="ABCDE1234F" />
          </div>
          <div>
            <label className={labelClass}>PF Account Number</label>
            <input type="text" name="pfAccountNumber" className={inputClass} placeholder="MH/BN/12345/000001" />
          </div>
          <div>
            <label className={labelClass}>ESI Number</label>
            <input type="text" name="esiNumber" className={inputClass} placeholder="12-34-567890-000-0001" />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 pb-3 border-b border-[#2a2d3e]">
          <CreditCard className="w-4 h-4 text-[#3b6ef0]" />
          <h2 className="text-sm font-semibold text-white">Bank Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Bank Name</label>
            <input type="text" name="bankName" className={inputClass} placeholder="State Bank of India" />
          </div>
          <div>
            <label className={labelClass}>Account Number</label>
            <input type="text" name="bankAccountNumber" className={inputClass} placeholder="123456789012" />
          </div>
          <div>
            <label className={labelClass}>IFSC Code</label>
            <input type="text" name="bankIfscCode" className={inputClass} placeholder="SBIN0001234" />
          </div>
          <div>
            <label className={labelClass}>Branch</label>
            <input type="text" name="bankBranch" className={inputClass} placeholder="Koramangala Branch" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Employee'}
        </button>
      </div>
    </form>
  );
}
