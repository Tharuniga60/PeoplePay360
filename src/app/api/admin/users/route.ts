import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, employees } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { createUserSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access strictly required' }, { status: 403 });
  }

  const result = await db.query.users.findMany({
    where: eq(users.companyId, session.user.companyId),
    with: {
      employee: {
        with: {
          department: true,
          jobPosition: true,
        },
      },
    },
    orderBy: [desc(users.createdAt)],
  });

  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access strictly required' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
  }

  const { email, password, role, employeeId, isActive } = parsed.data;

  // Check email conflict
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
  if (existing) {
    return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [createdUser] = await db
    .insert(users)
    .values({
      companyId: session.user.companyId,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      employeeId: employeeId || null,
      isActive,
    })
    .returning();

  return NextResponse.json({ data: createdUser }, { status: 201 });
}
