// Server-only PSX price scraper.

import type { PsxPriceResponse, KseIndexResponse } from "./types";

export async function getPsxPrice(symbol: string): Promise<PsxPriceResponse> {
  const sym = symbol.trim().toUpperCase();
  if (!sym) throw new Error("Missing symbol");

  const url = `https://dps.psx.com.pk/company/${encodeURIComponent(sym)}`;

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PSXTrack/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        throw new Error(`DPS request failed: ${res.status}`);
      }

      const html = await res.text();
      const price = parseClosePriceFromHtml(html);
      const timestamp = parseTimestampFromHtml(html);

      return {
        symbol: sym,
        price,
        timestamp,
      };
    } catch (err) {
      lastErr = err;
      const delay = Math.min(600, 150 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const message =
    lastErr instanceof Error ? lastErr.message : "Unknown DPS scraping error";
  throw new Error(`Failed to fetch PSX price for ${sym}: ${message}`);
}

export async function getKseIndex(): Promise<KseIndexResponse> {
  const url = `https://dps.psx.com.pk/indices`;

  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PSXTrack/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (!res.ok) {
        throw new Error(`DPS indices request failed: ${res.status}`);
      }

      const html = await res.text();
      return parseKse100FromHtml(html);
    } catch (err) {
      lastErr = err;
      const delay = Math.min(600, 150 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const message =
    lastErr instanceof Error ? lastErr.message : "Unknown DPS scraping error";
  throw new Error(`Failed to fetch KSE-100: ${message}`);
}

function parseKse100FromHtml(html: string): KseIndexResponse {
  // DPS indices page — try multiple patterns
  // Pattern 1: KSE-100 in a table row or div with value
  // Look for KSE100 / KSE-100 label followed by a number
  const patterns = [
    /KSE[- ]?100[^<]*<[^>]+>\s*([0-9]{2,3}(?:,[0-9]{3})+(?:\.[0-9]+)?)/i,
    /KSE[- ]?100[\s\S]{1,200}?([0-9]{2,3}(?:,[0-9]{3})+(?:\.[0-9]+)?)/i,
    />([0-9]{2,3}(?:,[0-9]{3})+(?:\.[0-9]+)?)<[^>]*>[^<]*KSE[- ]?100/i,
  ];

  let valueStr: string | null = null;
  for (const pat of patterns) {
    const m = html.match(pat);
    if (m?.[1]) {
      valueStr = m[1];
      break;
    }
  }

  // Change pattern — look for +/- near KSE-100
  let change = 0;
  let changePercent = 0;

  const changePattern = /KSE[- ]?100[\s\S]{1,400}?([+-]?\s*[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*\(([+-]?\s*[0-9]+(?:\.[0-9]+)?)\s*%\)/i;
  const cm = html.match(changePattern);
  if (cm) {
    change = Number(cm[1].replace(/,/g, "").replace(/\s/g, ""));
    changePercent = Number(cm[2].replace(/\s/g, ""));
  }

  const timestamp = parseTimestampFromHtml(html);

  if (!valueStr) {
    return { value: 0, change, changePercent, timestamp, error: "Could not parse KSE-100 value" };
  }

  const value = Number(valueStr.replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) {
    return { value: 0, change, changePercent, timestamp, error: "Invalid KSE-100 value" };
  }

  return { value, change, changePercent, timestamp };
}

function parseClosePriceFromHtml(html: string): number {
  const closeMatch = html.match(
    /class="quote__close"[^>]*>\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)\s*</i,
  );
  if (!closeMatch) {
    const alt = html.match(/quote__close[^>]*>\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!alt) throw new Error("Could not find quote__close price");
    return Number(alt[1]);
  }
  const value = Number(closeMatch[1]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Parsed price is invalid");
  }
  return value;
}

function parseTimestampFromHtml(html: string): string {
  const asOf = html.match(/As of\s+([^<]{6,80})/i);
  if (asOf?.[1]) return asOf[1].trim();

  const lastUpdate = html.match(/Last update:\s*([^<]{6,80})/i);
  if (lastUpdate?.[1]) return lastUpdate[1].trim();

  return new Date().toISOString();
}
