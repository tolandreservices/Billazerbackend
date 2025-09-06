// app/page.tsx
export default function Home() {
  return (
    <main style={{ fontFamily: "ui-sans-serif", padding: 24 }}>
      <h1>Billazer Backend</h1>
      <p>Welcome! Your API is running.</p>
      <ul>
        <li>
          Test results page:{" "}
          <a href="/results?name=Alex&current=1200&projected=900&savings=300&decision=switch">
            /results
          </a>
        </li>
        <li>API compute endpoint: <code>/api/compute</code> (POST only)</li>
      </ul>
    </main>
  );
}
