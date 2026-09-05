'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-4">
      {/* Background Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3b6ef0] mb-4 shadow-lg shadow-blue-500/25">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PeoplePay360</h1>
          <p className="text-[#6b7280] text-sm mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1d26] rounded-2xl border border-[#2a2d3e] p-8 shadow-2xl">
          {error && (
            <div className="flex items-start gap-3 mb-5 p-3.5 bg-red-500/10 border border-red-800/40 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <div className="font-semibold text-white mb-1">📱 Employee Direct Login (200 Staff Active)</div>
            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              • <strong>Login ID:</strong> Phone Number (e.g. <span className="font-mono text-white">9876500001</span> to <span className="font-mono text-white">9876500200</span>)<br />
              • <strong>Password:</strong> First Name + Employee ID (e.g. <span className="font-mono text-white">JohnEMP001</span>, <span className="font-mono text-white">AaravEMP005</span>)
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#e2e8f0] mb-1.5">
                Phone Number or Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. 9876500001 or admin@peoplepay360.com"
                  required
                  className="form-input pl-10"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#e2e8f0] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (e.g. JohnEMP001)"
                  required
                  className="form-input pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo credentials with all 5 roles */}
          <div className="mt-6 pt-5 border-t border-[#2a2d3e]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#4b5563] font-medium uppercase tracking-wider">Demo Accounts (5 Roles)</p>
              <span className="text-[10px] text-[#3b6ef0] bg-[#3b6ef0]/10 border border-[#3b6ef0]/20 px-1.5 py-0.5 rounded font-mono">1-Click Login</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                {
                  role: 'Employee (EMP001)',
                  tag: 'Phone Login',
                  loginId: '9876500001',
                  email: 'john@peoplepay360.com',
                  pass: 'JohnEMP001',
                  badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  desc: 'Login ID: 9876500001 | Pass: JohnEMP001 (firstname + emp id)',
                },
                {
                  role: 'HR Manager',
                  tag: 'HR Operations',
                  email: 'hrmanager@peoplepay360.com',
                  pass: 'hrmanager123',
                  badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  desc: 'Full CRUD on Employees, Attendance, Contracts, Schedules, Leaves. No payroll.',
                },
                {
                  role: 'HR Payroll User',
                  tag: 'Payroll Ops',
                  email: 'payrolluser@peoplepay360.com',
                  pass: 'payrolluser123',
                  badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                  desc: 'HR CRUD + Payruns/Payslips CRUD. Read-only on Salary Structures & Rules.',
                },
                {
                  role: 'HR Payroll Manager',
                  tag: 'Payroll Lead',
                  email: 'payroll@peoplepay360.com',
                  pass: 'payroll123',
                  badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  desc: 'Full CRUD on Payruns, Payslips, Salary Structures & Rules + Payrun Approval.',
                },
                {
                  role: 'Admin',
                  tag: 'Super Admin',
                  email: 'admin@peoplepay360.com',
                  pass: 'admin123',
                  badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  desc: 'Full system control, User Management (/admin/users), Role & Credential resets.',
                },
              ].map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  onClick={async () => {
                    const identifier = (cred as any).loginId ?? cred.email;
                    setEmail(identifier);
                    setPassword(cred.pass);
                    setError('');
                    setLoading(true);
                    try {
                      const res = await signIn('credentials', {
                        email: identifier,
                        password: cred.pass,
                        redirect: false,
                      });
                      if (res?.error) {
                        setError('Failed to login with demo account.');
                      } else {
                        router.push(callbackUrl);
                        router.refresh();
                      }
                    } catch {
                      setError('Unexpected login error.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-[#111318] border border-[#2a2d3e]
                             hover:border-[#3b6ef0]/50 hover:bg-[#151922] transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-white group-hover:text-[#3b6ef0] transition-colors">{cred.role}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium', cred.badgeColor)}>
                      {cred.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6b7280] line-clamp-1 mb-1">{cred.desc}</p>
                  <p className="text-[10px] font-mono text-[#4b5563] group-hover:text-[#9ca3af] transition-colors">{cred.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#374151] mt-6">
          © 2025 PeoplePay360. Audit-grade HR & Payroll Platform.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3b6ef0]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
