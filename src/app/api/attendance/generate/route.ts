import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canComputePayrun } from '@/lib/rbac';
import { syncScheduleAttendance } from '@/lib/attendance';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canComputePayrun(session.user.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { startDate, endDate, employeeIds } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
  }

  try {
    const result = await syncScheduleAttendance({
      companyId: session.user.companyId,
      startDate,
      endDate,
      employeeIds,
    });

    return NextResponse.json({
      message: `Successfully synchronized schedule attendance for ${result.employeesProcessed} employee(s).`,
      generatedCount: result.generatedCount,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync schedule attendance' },
      { status: 500 }
    );
  }
}

