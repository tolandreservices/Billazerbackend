'use client';
import { useSearchParams } from 'next/navigation';

export default function ResultsPage() {
  const sp = useSearchParams();
  const name = sp.get('name') || 'there';
  const currentTotal = Number(sp.get('current')) || 0;
  const projectedTotal = Number(sp.get('projected')) || 0;
  const savings12m = Number(sp.get('savings')) || 0;
  const decision = sp.get('decision') || 'competitive';
  const calendarUrl = sp.get('cal') || '';

  return (
    <main style={{ fontFamily: 'ui-sans-serif', maxWidth: 720, margin: '24px auto' }}>
      <h2>Hi {name}, here’s your result</h2>
      <p>Current yearly cost: <b>${currentTotal.toFixed(2)}</b><br/>
         Our plan yearly cost: <b>${projectedTotal.toFixed(2)}</b><br/>
         Estimated savings (12 months): <b>${savings12m.toFixed(2)}</b></p>
      <hr/>
      {decision === 'competitive' ? (
        <p><b>You already have a competitive rate.</b> Check our new rate next month.</p>
      ) : (
        <div>
          <p><b>Great news!</b> You can save ${savings12m.toFixed(2)} this year.</p>
          {calendarUrl && (
            <iframe src={calendarUrl} width="100%" height={650} style={{ border: 0 }} />
          )}
        </div>
      )}
    </main>
  );
}
