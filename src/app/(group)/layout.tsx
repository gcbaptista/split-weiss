export default function PublicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/10">
      <div className="container mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </div>
    </main>
  );
}

