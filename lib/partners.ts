export function makeRefCode(email: string) {
  const prefix = process.env.REF_CODE_PREFIX || 'BLZ';
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${base}${rand}`.toUpperCase();
}

export function renderHtmlResult(params: {
  name: string;
  currentTotal: number;
  projectedTotal: number;
  savings12m: number;
  decision: 'competitive'|'switch';
  calendarUrl: string;
}) {
  const { name, currentTotal, projectedTotal, savings12m, decision, calendarUrl } = params;
  const currency = (n: number) => `$${n.toFixed(2)}`;
  const body = decision === 'competitive'
    ? `<p><b>You already have a competitive rate.</b> Check our new rate next month.</p>`
    : `<p><b>Great news!</b> You can save ${currency(savings12m)} this year.</p>
       <h3>Book a 20-minute call</h3>
       <iframe src="${calendarUrl}" width="100%" height="650" frameborder="0"></iframe>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your Savings Report</title></head>
<body style="font-family:ui-sans-serif,system-ui;margin:24px;max-width:720px">
  <h2>Hi ${name || 'there'}, here’s your result</h2>
  <p>Current yearly cost: <b>${currency(currentTotal)}</b><br>
     Our plan yearly cost: <b>${currency(projectedTotal)}</b><br>
     Estimated savings (12 months): <b>${currency(savings12m)}</b></p>
  <hr/>${body}
</body></html>`;
}
