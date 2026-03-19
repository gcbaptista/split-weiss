import { NextRequest, NextResponse } from "next/server";
import { fetchRates } from "@/lib/currency/frankfurter";

export async function GET(req: NextRequest) {
  const base = req.nextUrl.searchParams.get("base") ?? "EUR";
  const date = req.nextUrl.searchParams.get("date") ?? "latest";
  try {
    const rates = await fetchRates(base, date);
    return NextResponse.json(rates);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch rates" },
      { status: 500 }
    );
  }
}
