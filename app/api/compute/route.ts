import { NextRequest, NextResponse } from 'next/server';
import { getAdminRates, appendSubmission, getCalendarForRef } from '../../../lib/sheets';
import { computeSavings } from '../../../lib/logic';
import { renderHtmlResult } from '../../../lib/partners';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      name = '',
      email = '',
      phone = '',
      provider = '',
      kwhRate = 0,
      gjRate = 0,
      elecAdminFee = 0,
      gasAdminFee = 0,
      kwhUsage = 0,
      gjUsage = 0,
      ref = null,
    } = data || {};

    const rates = await getAdminRates();
    const result = computeSavings({
      kwhUsage: Number(kwhUsage),
      gjUsage: Number(gjUsage),
      curKwh: Number(kwhRate),
      curGj: Number(gjRate),
      elecAdmin: Number(elecAdminFee),
      gasAdmin: Number(gasAdminFee),
      promoKwh: rates.promoKwh,
      regKwh: rates.regKwh,
      promoGj: rates.promoGj,
      regGj: rates.regGj,
      ourElecAdmin: rates.ourElecAdmin,
      ourGasAdmin: rates.ourGasAdmin,
      gst: rates.gst,
    });

    const calendarUrl = await getCalendarForRef(ref);

    const now = new Date().toISOString();
    await appendSubmission([
      now,
      name,
      email,
      phone,
      provider,
      Number(kwhRate),
      Number(gjRate),
      Number(elecAdminFee),
      Number(gasAdminFee),
      Number(kwhUsage),
      Number(gjUsage),
      result.currentTotal,
      result.projectedTotal,
      result.savings12m,
      result.decision,
      ref,
      calendarUrl,
    ]);

    const html = renderHtmlResult({
      name,
      currentTotal: result.currentTotal,
      projectedTotal: result.projectedTotal,
      savings12m: result.savings12m,
      decision: result.decision,
      calendarUrl,
    });

    return NextResponse.json({ ok: true, ...result, calendarUrl, html });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
