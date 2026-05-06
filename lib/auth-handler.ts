import { NextResponse } from 'next/server';
import { getCurrentDBUser, getOrCreateUser } from '@/lib/services/user.service';

export async function requireUser() {
  const user = await getOrCreateUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

export async function authorizeUser() {
  const user = await getCurrentDBUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return true;
}
