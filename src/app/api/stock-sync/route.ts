// src/app/api/stock-sync/route.ts
//
// GET /api/stock-sync?symbols=SYS,FFC,MEBL  (or omit to sync all held symbols)
//   → Scrapes OHLCV history from Brecorder for each symbol
//   → Upserts into supabase stock_ohlcv table
//   → Returns per-symbol counts and latest dates

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { scrapeAllSymbols } from "@/lib/stock-history-scraper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Resolve symbols — from query param or from orders table
    const qsymbols = req.nextUrl.searchParams.get("symbols");
    let symbols: string[];

    if (qsymbols) {
      symbols = qsymbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else {
      const { data: orders, error: ordErr } = await supabase
        .from("orders")
        .select("symbol");
      if (ordErr) throw new Error(ordErr.message);
      symbols = Array.from(new Set((orders ?? []).map((o) => o.symbol.toUpperCase())));
    }

    if (!symbols.length) {
      return NextResponse.json({ error: "No symbols to sync" }, { status: 400 });
    }

    // Scrape all symbols
    const { results, allRows } = await scrapeAllSymbols(symbols);

    if (!allRows.length) {
      return NextResponse.json(
        { error: "Scrape returned no rows", results },
        { status: 502 },
      );
    }

    // Upsert into stock_ohlcv
    const upsertRows = allRows.map((r) => ({
      symbol:     r.symbol,
      date:       r.date,
      open:       r.open,
      high:       r.high,
      low:        r.low,
      close:      r.close,
      volume:     r.volume,
      source:     "brecorder",
      scraped_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from("stock_ohlcv")
      .upsert(upsertRows, { onConflict: "symbol,date" });

    if (upsertErr) throw new Error(upsertErr.message);

    // Build summary per symbol
    const summary: Record<string, { rows: number; latest: string; source: string; error?: string }> = {};
    for (const sym of symbols) {
      const symRows = allRows.filter((r) => r.symbol === sym);
      const latest  = symRows[symRows.length - 1]?.date ?? "—";
      summary[sym]  = { rows: symRows.length, latest, ...results[sym] };
    }

    return NextResponse.json({
      ok: true,
      totalRows: allRows.length,
      symbols: summary,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
