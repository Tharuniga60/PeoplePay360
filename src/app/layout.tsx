import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from 'next-auth/react';

export const metadata: Metadata = {
  title: {
    default: 'PeoplePay360',
    template: '%s | PeoplePay360',
  },
  description: 'Audit-grade HR & Payroll platform with zero-storage payslip generation',
  keywords: ['HR', 'Payroll', 'Attendance', 'Leave Management', 'Payslip'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
