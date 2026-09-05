import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { updateUserSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import { recordAuditEvent } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access strictly required' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.employeeId !== undefined) updateData.employeeId = parsed.data.employeeId || null;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(and(eq(users.id, params.id), eq(users.companyId, session.user.companyId)))
    .returning();

  if (!updatedUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Record audit log event
  await recordAuditEvent({
    companyId: session.user.companyId,
    actorId: session.user.id,
    entityName: 'user',
    entityId: params.id,
    action: parsed.data.password ? 'RESET_PASSWORD' : 'UPDATE',
    changes: {
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      employeeId: parsed.data.employeeId,
      passwordReset: !!parsed.data.password,
    },
  });

  return NextResponse.json({ data: updatedUser });
}
