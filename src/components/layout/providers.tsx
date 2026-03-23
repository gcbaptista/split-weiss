"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PullToRefresh />
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
