// src/app/api/chart-data/route.ts
//
// Builds portfolio vs KSE-100 ROI time series.
// - KSE-100 closes  → supabase kse_closes   (auto-synced if stale)
// - Stock closes    → supabase stock_ohlcv  (auto-synced if stale)
// Both tables are populated by their respective /api/*-sync routes.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getPsxPrice } from "@/lib/psx-scraper";
import { scrapeKseHistory } from "@/lib/kse-history-scraper";
import { scrapeAllSymbols } from "@/lib/stock-history-scraper";
import type { OrderRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// ── date helpers ──────────────────────────────────────────────────────────────

function isWeekday(d: string) {
  const day = new Date(d + "T00:00:00Z").getUTCDay();
  return day !== 0 && day !== 6;
}

function prevWeekday(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  do { dt.setUTCDate(dt.getUTCDate() - 1); }
  while (dt.getUTCDay() === 0 || dt.getUTCDay() === 6);
  return dt.toISOString().slice(0, 10);
}

function today() { return new Date().toISOString().slice(0, 10); }

// ── look up close on-or-before date ──────────────────────────────────────────

function closeOnDate(rows: { date: string; close: number }[], date: string): number {
  const prior = rows.filter((r) => r.date <= date);
  return prior.length ? prior[prior.length - 1].close : (rows[0]?.close ?? 0);
}

// ── ensure KSE closes are fresh ───────────────────────────────────────────────

async function ensureKseData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ date: string; close: number }[]> {
  const { data, error } = await supabase
    .from("kse_closes")
    .select("date, close")
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { date: string; close: number }[];
  const latest = rows[rows.length - 1];
  const expected = isWeekday(today()) ? today() : prevWeekday(today());
  const stale = !rows.length || !latest || latest.date < expected;

  if (!stale) return rows;

  const { closes, source } = await scrapeKseHistory();
  if (closes.length) {
    await supabase.from("kse_closes").upsert(
      closes.map((c) => ({ date: c.date, close: c.close, source, scraped_at: new Date().toISOString() })),
      { onConflict: "date" },
    );
    const merged = new Map(rows.map((r) => [r.date, r.close]));
    closes.forEach((c) => merged.set(c.date, c.close));
    return Array.from(merged.entries())
      .map(([date, close]) => ({ date, close }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  return rows;
}

// ── ensure stock OHLCV is fresh for all symbols ───────────────────────────────

async function ensureStockData(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  symbols: string[],
): Promise<Record<string, { date: string; open: number; close: number }[]>> {
  const { data, error } = await supabase
    .from("stock_ohlcv")
    .select("symbol, date, open, close")
    .in("symbol", symbols)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { symbol: string; date: string; open: number; close: number }[];

  // Check staleness per symbol
  const expected = isWeekday(today()) ? today() : prevWeekday(today());
  const staleSymbols = symbols.filter((sym) => {
    const symRows = rows.filter((r) => r.symbol === sym);
    const latest = symRows[symRows.length - 1];
    return !symRows.length || !latest || latest.date < expected;
  });

  if (staleSymbols.length) {
    const { allRows } = await scrapeAllSymbols(staleSymbols);
    if (allRows.length) {
      await supabase.from("stock_ohlcv").upsert(
        allRows.map((r) => ({
          symbol:     r.symbol,
          date:       r.date,
          open:       r.open,
          high:       r.high,
          low:        r.low,
          close:      r.close,
          volume:     r.volume,
          source:     "brecorder",
          scraped_at: new Date().toISOString(),
        })),
        { onConflict: "symbol,date" },
      );
      // Merge fresh rows into existing
      for (const r of allRows) {
        rows.push({ symbol: r.symbol, date: r.date, open: r.open, close: r.close });
      }
    }
  }

  // Group by symbol
  const bySymbol: Record<string, { date: string; open: number; close: number }[]> = {};
  for (const r of rows) {
    (bySymbol[r.symbol] ??= []).push(r);
  }
  // Sort each symbol's rows by date, dedupe
  for (const sym of Object.keys(bySymbol)) {
    const seen = new Set<string>();
    bySymbol[sym] = bySymbol[sym]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((r) => { if (seen.has(r.date)) return false; seen.add(r.date); return true; });
  }
  return bySymbol;
}

// ── main handler ──────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Orders
    const { data: ordersRaw, error: ordErr } = await supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: true });
    if (ordErr) throw new Error(ordErr.message);

    const orders = ((ordersRaw ?? []) as Array<Record<string, unknown> & { id: unknown }>)
      .map((r) => ({ ...r, id: String(r.id) })) as unknown as OrderRow[];

    if (!orders.length) {
      return NextResponse.json({ series: [], kseBase: 0, jan7CostBasis: 0, symbols: [], currentPrices: {} });
    }

    const symbols = Array.from(new Set(orders.map((o) => o.symbol.toUpperCase())));

    // 2. Fetch live prices (for today's endpoint of the chart + holdings table)
    const currentPrices: Record<string, number> = {};
    await Promise.all(
      symbols.map(async (sym) => {
        try {
          currentPrices[sym] = (await getPsxPrice(sym)).price;
        } catch {
          const last = [...orders].reverse().find((o) => o.symbol.toUpperCase() === sym);
          currentPrices[sym] = last ? Number(last.price) : 0;
        }
      }),
    );

    // 3. Ensure KSE + stock data is fresh in Supabase
    const [kseCloses, stockData] = await Promise.all([
      ensureKseData(supabase),
      ensureStockData(supabase, symbols),
    ]);

    if (!kseCloses.length) {
      return NextResponse.json({ error: "KSE-100 data unavailable" }, { status: 503 });
    }

    // 4. Chart date range: first order → latest KSE close we have
    const firstOrderDate = orders[0].order_date;
    const chartCloses = kseCloses.filter((c) => c.date >= firstOrderDate);
    if (!chartCloses.length) {
      return NextResponse.json({ error: "No KSE closes after first order date" }, { status: 500 });
    }

    const KSE_BASE = closeOnDate(kseCloses, firstOrderDate);

    // 5. Get per-symbol close price on a given date.
    //    Priority: real DB close → fallback to linear interpolation between
    //    nearest known anchors → fallback to live price.
    function stockCloseOnDate(sym: string, date: string): number {
      const symRows = stockData[sym];
      if (symRows?.length) {
        // Use real close if available on or before that date
        const prior = symRows.filter((r) => r.date <= date);
        if (prior.length) return prior[prior.length - 1].close;
      }
      // Fallback: interpolate between buy price anchors
      const symOrders = orders
        .filter((o) => o.symbol.toUpperCase() === sym && o.order_date <= date)
        .sort((a, b) => a.order_date.localeCompare(b.order_date));
      if (!symOrders.length) return 0;
      const last = symOrders[symOrders.length - 1];
      // Between last buy date and today → lerp to live price
      const t0 = new Date(last.order_date + "T00:00:00Z").getTime();
      const t1 = new Date(today()         + "T00:00:00Z").getTime();
      const tx = new Date(date            + "T00:00:00Z").getTime();
      if (t1 <= t0) return Number(last.price);
      const frac = Math.min(1, Math.max(0, (tx - t0) / (t1 - t0)));
      return Number(last.price) + frac * ((currentPrices[sym] ?? Number(last.price)) - Number(last.price));
    }

    // 6. Build series — one point per KSE trading day
    const series = chartCloses.map(({ date, close: kseClose }) => {
      const activeOrders = orders.filter((o) => o.order_date <= date);

      const marketValue = activeOrders.reduce(
        (acc, o) => acc + Number(o.quantity) * stockCloseOnDate(o.symbol.toUpperCase(), date),
        0,
      );

      const costBasis = activeOrders.reduce(
        (acc, o) => acc + Number(o.quantity) * Number(o.price),
        0,
      );

      const portfolioRoi = costBasis > 0 ? ((marketValue - costBasis) / costBasis) * 100 : 0;
      const kseRoi = KSE_BASE > 0 ? ((kseClose - KSE_BASE) / KSE_BASE) * 100 : 0;

      return {
        date,
        portfolioRoi:   Math.round(portfolioRoi * 100) / 100,
        kseRoi:         Math.round(kseRoi * 100)       / 100,
        portfolioValue: Math.round(marketValue),
        costBasis:      Math.round(costBasis),
        kseClose,
      };
    });

    const jan7CostBasis = orders
      .filter((o) => o.order_date <= "2026-01-07")
      .reduce((acc, o) => acc + Number(o.quantity) * Number(o.price), 0);

    const latestKse   = kseCloses[kseCloses.length - 1];
    const stockMeta: Record<string, { rows: number; latest: string }> = {};
    for (const sym of symbols) {
      const r = stockData[sym] ?? [];
      stockMeta[sym] = { rows: r.length, latest: r[r.length - 1]?.date ?? "—" };
    }

    return NextResponse.json({
      series,
      kseBase: KSE_BASE,
      jan7CostBasis: Math.round(jan7CostBasis),
      symbols,
      currentPrices,
      meta: {
        kseRows:        kseCloses.length,
        latestKseDate:  latestKse.date,
        latestKseClose: latestKse.close,
        stocks:         stockMeta,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
