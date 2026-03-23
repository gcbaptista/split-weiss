import { NextRequest, NextResponse } from "next/server";

import { CURRENCIES } from "@/lib/currency/constants";
import { fetchRates } from "@/lib/currency/frankfurter";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const base = req.nextUrl.searchParams.get("base") ?? "EUR";
  const date = req.nextUrl.searchParams.get("date") ?? "latest";

  if (!(CURRENCIES as readonly string[]).includes(base)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  if (date !== "latest" && !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const rates = await fetchRates(base, date);
    return NextResponse.json(rates);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
