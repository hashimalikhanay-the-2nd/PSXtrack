import { NextResponse } from "next/server";

import { getPsxPrice } from "@/lib/psx-scraper";

export const runtime = "edge";

export async function GET(
  _req: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await context.params;
  const normalized = symbol?.toUpperCase();
  if (!normalized) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const price = await getPsxPrice(normalized);
    return NextResponse.json(price);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch PSX price";
    return NextResponse.json({ error: message, symbol: normalized }, { status: 500 });
  }
}

