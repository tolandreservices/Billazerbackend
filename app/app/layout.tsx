// app/layout.tsx
export const metadata = {
  title: "Billazer Backend",
  description: "API + Results renderer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
