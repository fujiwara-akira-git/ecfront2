import { NextResponse } from 'next/server';
import { createVoucherForOrder, ensurePartner } from '../../../../lib/integrations/freee';

export async function POST(req: Request) {
  const body = await req.json();

  // Basic validation
  if (!body || !body.id) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

  // Ensure partner exists
  if (body.customer) {
    try {
      const partner = await ensurePartner(body.customer);
      body.customer.freee_partner_id = partner.id;
    } catch (err) {
      return NextResponse.json({ error: 'partner create failed', detail: String(err) }, { status: 500 });
    }
  }

  try {
    const res = await createVoucherForOrder(body);
    return NextResponse.json({ ok: true, res });
  } catch (err) {
    return NextResponse.json({ error: 'create voucher failed', detail: String(err) }, { status: 500 });
  }
}
