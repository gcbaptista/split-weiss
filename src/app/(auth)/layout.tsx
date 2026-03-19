export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-background via-muted/20 to-muted/40 sm:p-8">
      <div className="mb-6 text-center">
        <span className="text-2xl font-bold">💸 split-weiss</span>
      </div>
      <div className="w-full sm:max-w-sm">{children}</div>
    </div>
  );
}
