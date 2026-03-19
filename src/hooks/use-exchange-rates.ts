"use client";
import { useQuery } from "@tanstack/react-query";
import type { ExchangeRates } from "@/types/currency";

async function fetchRates(base: string): Promise<ExchangeRates> {
  const res = await fetch(`/api/exchange-rates?base=${base}`);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  return res.json();
}

export function useExchangeRates(base: string = "EUR") {
  return useQuery({
    queryKey: ["exchange-rates", base],
    queryFn: () => fetchRates(base),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 2,
  });
}
