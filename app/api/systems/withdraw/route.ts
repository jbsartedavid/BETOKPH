import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const list = await prisma.systemWithdraw.findMany({ orderBy: { id: 'asc' } });
    const gcashList = list.map((item) => ({ ...item, name: 'GCash' }));
    return NextResponse.json({ success: true, systems: gcashList });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
