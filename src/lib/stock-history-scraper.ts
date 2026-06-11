// src/lib/stock-history-scraper.ts
//
// Scrapes daily OHLCV data for PSX stocks from Business Recorder.
// Same endpoint as KSE-100 but with the individual stock code.
//
// URL pattern:
//   https://markets.brecorder.com/index.html?action=getData&type=D&code=SYS&period=1Y
//
// Response: { status: 1, data: [[timestamp_ms, open, high, low, close, volume], ...] }
//
// Fallback: DPS company page for today's OHLCV only.

export type StockOhlcv = {
  symbol: string;
  date: string;   // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// ── Brecorder scraper ─────────────────────────────────────────────────────────

async function fetchFromBrecorder(symbol: string): Promise<StockOhlcv[]> {
  // Brecorder uses PSX ticker codes directly
  const url = `https://markets.brecorder.com/index.html?action=getData&type=D&code=${encodeURIComponent(symbol)}&period=3Y`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://markets.brecorder.com/",
      Accept: "application/json, text/javascript, */*",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Brecorder ${symbol} fetch failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  let json: { status: number; data: number[][] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Brecorder ${symbol} response not JSON: ${text.slice(0, 120)}`);
  }

  if (!json?.data?.length) {
    throw new Error(`Brecorder returned empty data for ${symbol}`);
  }

  const rows: StockOhlcv[] = [];
  for (const row of json.data) {
    const [ts, open, high, low, close, volume] = row;
    if (!ts || !close) continue;
    const d = new Date(ts);
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd   = String(d.getUTCDate()).padStart(2, "0");
    rows.push({
      symbol,
      date:   `${yyyy}-${mm}-${dd}`,
      open:   Math.round((open   ?? close) * 10000) / 10000,
      high:   Math.round((high   ?? close) * 10000) / 10000,
      low:    Math.round((low    ?? close) * 10000) / 10000,
      close:  Math.round(close             * 10000) / 10000,
      volume: Math.round(volume  ?? 0),
    });
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

// ── DPS fallback — today's OHLCV from company page ───────────────────────────

async function fetchTodayFromDps(symbol: string): Promise<StockOhlcv | null> {
  try {
    const url = `https://dps.psx.com.pk/company/${encodeURIComponent(symbol)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (PSXTrack/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract open, high, low, close from DPS company page
    function extractStat(label: string): number {
      // DPS layout: <dt>Open</dt><dd>Rs. 147.50</dd>
      const re = new RegExp(`${label}[\\s\\S]{1,60}?Rs?\\.?\\s*([0-9]+(?:\\.[0-9]+)?)`, "i");
      const m = html.match(re);
      return m?.[1] ? Number(m[1]) : 0;
    }

    const close = extractStat("Close|Last");
    if (!close) return null;

    const today = new Date().toISOString().slice(0, 10);
    return {
      symbol,
      date:   today,
      open:   extractStat("Open")  || close,
      high:   extractStat("High")  || close,
      low:    extractStat("Low")   || close,
      close,
      volume: 0,
    };
  } catch {
    return null;
  }
}

// ── Public: scrape one symbol ─────────────────────────────────────────────────

export async function scrapeStockHistory(symbol: string): Promise<{
  rows: StockOhlcv[];
  source: string;
  error?: string;
}> {
  try {
    const rows = await fetchFromBrecorder(symbol);

    // Patch today's row with DPS data if available (more accurate intraday)
    const todayDps = await fetchTodayFromDps(symbol);
    if (todayDps) {
      const idx = rows.findIndex((r) => r.date === todayDps.date);
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...todayDps };
      } else {
        rows.push(todayDps);
      }
    }

    return { rows, source: "brecorder" };
  } catch (err) {
    // Fallback: just today from DPS
    const todayDps = await fetchTodayFromDps(symbol);
    if (todayDps) {
      return { rows: [todayDps], source: "dps_fallback" };
    }
    return { rows: [], source: "failed", error: String(err) };
  }
}

// ── Public: scrape all symbols concurrently (rate-limited) ───────────────────

export async function scrapeAllSymbols(symbols: string[]): Promise<{
  results: Record<string, { count: number; source: string; error?: string }>;
  allRows: StockOhlcv[];
}> {
  // Process in small batches to avoid rate limiting
  const BATCH = 3;
  const allRows: StockOhlcv[] = [];
  const results: Record<string, { count: number; source: string; error?: string }> = {};

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (sym) => {
        const { rows, source, error } = await scrapeStockHistory(sym);
        results[sym] = { count: rows.length, source, error };
        allRows.push(...rows);
      }),
    );
    // Small delay between batches
    if (i + BATCH < symbols.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return { results, allRows };
}
