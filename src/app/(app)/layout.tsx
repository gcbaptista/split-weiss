import ShellLayout from "@/app/_layouts/shell-layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ShellLayout>{children}</ShellLayout>;
}
