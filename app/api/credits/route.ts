import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  console.log('API_CREDITS_ROUTE: Attempting to get userId from auth');
  const { userId } = await auth();
  console.log('API_CREDITS_ROUTE: userId from auth:', userId);

  if (!userId) {
    console.error('API_CREDITS_ROUTE: Unauthorized - userId is missing');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('API_CREDITS_ROUTE: Attempting to find user in DB with userId:', userId);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  console.log('API_CREDITS_ROUTE: User found in DB:', user);

  if (!user) {
    console.error('API_CREDITS_ROUTE: User not found in DB for userId:', userId);
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  console.log('API_CREDITS_ROUTE: Returning credits:', user.credits_remaining);
  return NextResponse.json({ credits: user.credits_remaining });
}
