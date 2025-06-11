import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/user-actions';

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
    console.log('API_CREDITS_ROUTE: User not found in DB for userId:', userId);
    console.log('API_CREDITS_ROUTE: Attempting to create user with getOrCreateUser');
    
    // Tự động tạo người dùng nếu không tìm thấy
    const result = await getOrCreateUser();
    
    if (!result.success) {
      console.error('API_CREDITS_ROUTE: Failed to create user:', result.error);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
    
    // Kiểm tra result.data trước khi truy cập credits_remaining
    if (!result.data) {
      console.error('API_CREDITS_ROUTE: User created but data is undefined');
      return NextResponse.json({ error: 'Failed to fetch credits' }, { status: 500 });
    }
    
    console.log('API_CREDITS_ROUTE: User created successfully:', result.data);
    return NextResponse.json({ credits: result.data.credits_remaining });
  }

  console.log('API_CREDITS_ROUTE: Returning credits:', user.credits_remaining);
  return NextResponse.json({ credits: user.credits_remaining });
}
