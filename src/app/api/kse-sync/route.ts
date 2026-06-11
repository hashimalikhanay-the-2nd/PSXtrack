// src/app/api/kse-sync/route.ts
//
// GET /api/kse-sync
//   Scrapes KSE-100 historical closes from Brecorder, upserts into supabase.
//   Returns { inserted, total, latestDate, latestClose }

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { scrapeKseHistory } from "@/lib/kse-history-scraper";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { closes, source, error: scrapeError } = await scrapeKseHistory();

    if (!closes.length) {
      return NextResponse.json(
        { error: scrapeError ?? "No data scraped", source },
        { status: 502 },
      );
    }

    const rows = closes.map((c) => ({
      date: c.date,
      close: c.close,
      source,
      scraped_at: new Date().toISOString(),
    }));

    const { error: upsertError, count } = await supabase
      .from("kse_closes")
      .upsert(rows, { onConflict: "date", count: "exact" });

    if (upsertError) throw new Error(upsertError.message);

    const latest = closes[closes.length - 1];
    const { count: total } = await supabase
      .from("kse_closes")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      ok: true,
      scraped: closes.length,
      upserted: count ?? closes.length,
      total: total ?? 0,
      source,
      latestDate: latest.date,
      latestClose: latest.close,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
