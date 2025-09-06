// app/results/page.tsx (server component version – no hooks needed)
export default function ResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const getNum = (k: string) => Number(searchParams[k] ?? 0);

  const name = (searchParams.name as string) || "there";
  const currentTotal = getNum("current");
  const projectedTotal = getNum("projected");
  const savings12m = getNum("savings");
  const decision = (searchParams.decision as string) || "competitive";
  const calendarUrl = (searchParams.cal as string) || "";

  return (
    <main style={{ fontFamily: "ui-sans-serif", maxWidth: 720, margin: "24px auto" }}>
      <h2>Hi {name}, here’s your result</h2>
      <p>
        Current yearly cost: <b>${currentTotal.toFixed(2)}</b>
        <br />
        Our plan yearly cost: <b>${projectedTotal.toFixed(2)}</b>
        <br />
        Estimated savings (12 months): <b>${savings12m.toFixed(2)}</b>
      </p>
      <hr />
      {decision === "competitive" ? (
        <p>
          <b>You already have a competitive rate.</b> Check our new rate next month.
        </p>
      ) : (
        <div>
          <p>
            <b>Great news!</b> You can save ${savings12m.toFixed(2)} this year.
          </p>
          {calendarUrl ? (
            <iframe src={calendarUrl} width="100%" height={650} style={{ border: 0 }} />
          ) : null}
        </div>
      )}
    </main>
  );
}
