import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { makeRefCode } from '@/lib/partners';
import { upsertPartner } from '@/lib/sheets';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: NextRequest) {
  const sig = headers().get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = (session.customer_details?.email || '').toLowerCase();

    // You can detect exact plan from line items/price IDs if you want:
    let plan = 'Regular';
    let status: 'Active'|'Canceled' = 'Active';

    const refCode = makeRefCode(email);
    const calendarUrl = process.env.DEFAULT_CALENDAR_URL || '';

    await upsertPartner({ email, plan, refCode, calendarUrl, status });
  }

  return NextResponse.json({ received: true });
}
