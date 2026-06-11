// src/lib/kse-history-scraper.ts
//
// Scrapes KSE-100 daily close prices from Business Recorder
// (brecorder.com/stock-market-data/PSX/KSE100)
// and the PSX DPS graphical view for the current/latest value.
//
// Strategy:
//   1. Business Recorder has a downloadable CSV / table with historical closes
//   2. We parse whatever we can get and normalise to { date, close }
//   3. Results are upserted into supabase kse_closes table
//   4. Returns the full series from Supabase (covers all history we have)

export type KseClose = {
  date: string;   // YYYY-MM-DD
  close: number;
};

// ── Business Recorder scraper ─────────────────────────────────────────────────
// URL: https://markets.brecorder.com/index.html?action=getData&type=D&code=KSE100&period=1Y
// Returns JSON with daily OHLCV data.

async function fetchFromBrecorder(): Promise<KseClose[]> {
  const url =
    "https://markets.brecorder.com/index.html?action=getData&type=D&code=KSE100&period=1Y";

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://markets.brecorder.com/",
      Accept: "application/json, text/javascript, */*",
    },
    // No Next.js cache — we want fresh data
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Brecorder fetch failed: ${res.status} ${res.statusText}`);
  }

  // brecorder returns: {"status":1,"data":[[timestamp_ms, open, high, low, close, vol], ...]}
  const text = await res.text();
  let json: { status: number; data: number[][] };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Brecorder response not JSON. First 200 chars: ${text.slice(0, 200)}`);
  }

  if (!json?.data?.length) {
    throw new Error("Brecorder returned empty data array");
  }

  const closes: KseClose[] = [];
  for (const row of json.data) {
    const ts = row[0];
    const close = row[4];
    if (!ts || !close) continue;
    const d = new Date(ts);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    closes.push({ date: `${yyyy}-${mm}-${dd}`, close: Math.round(close * 100) / 100 });
  }

  return closes.sort((a, b) => a.date.localeCompare(b.date));
}

// ── Fallback: PSX DPS graphical view (today's value only) ────────────────────
async function fetchTodayFromDps(): Promise<KseClose | null> {
  try {
    const res = await fetch("https://dps.psx.com.pk/graphical-view", {
      headers: { "User-Agent": "Mozilla/5.0 (PSXTrack/1.0)" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(
      /topIndices__item__name">KSE100<[\s\S]*?topIndices__item__val[^>]*>\s*([0-9,]+(?:\.[0-9]+)?)/i,
    );
    if (!m?.[1]) return null;
    const value = Number(m[1].replace(/,/g, ""));
    const today = new Date().toISOString().slice(0, 10);
    return { date: today, close: Math.round(value * 100) / 100 };
  } catch {
    return null;
  }
}

// ── Public: fetch and return all scraped closes ───────────────────────────────
export async function scrapeKseHistory(): Promise<{
  closes: KseClose[];
  source: string;
  error?: string;
}> {
  try {
    const closes = await fetchFromBrecorder();
    // Also grab today from DPS and upsert if we have it
    const today = await fetchTodayFromDps();
    if (today && !closes.find((c) => c.date === today.date)) {
      closes.push(today);
    }
    return { closes, source: "brecorder" };
  } catch (brecorderErr) {
    // Fallback: just get today from DPS
    const today = await fetchTodayFromDps();
    if (today) {
      return { closes: [today], source: "dps_fallback" };
    }
    return {
      closes: [],
      source: "failed",
      error: String(brecorderErr),
    };
  }
}
