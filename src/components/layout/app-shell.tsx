import { Sidebar, MobileNav } from "./sidebar";

interface AppShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null };
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto bg-muted/10 pb-16 md:pb-0">
        <div className="container mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </main>
      <MobileNav user={user} />
    </div>
  );
}
