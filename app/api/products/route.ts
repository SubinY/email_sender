import { NextRequest } from 'next/server';
import { db, products } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.select().from(products).limit(100);
    return Response.json({ products: rows });
  } catch (e) {
    return Response.json({ products: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const now = new Date();
    const [row] = await db
      .insert(products)
      .values({
        name: String(body.name ?? ''),
        status: 'active',
        price: String(body.price ?? '0'),
        stock: Number(body.stock ?? 0),
        imageUrl: 'https://dummyimage.com/64x64',
        availableAt: now
      })
      .returning();

    return Response.json(row, { status: 201 });
  } catch (e) {
    return Response.json({ message: 'DB not ready' }, { status: 400 });
  }
} 