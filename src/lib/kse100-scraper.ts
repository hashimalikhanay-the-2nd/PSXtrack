export type KseIndexResponse = {
  symbol: "KSE100" | "KSE100PR";
  value: number;
  timestamp: string;
};

function parseKseValueFromGraphicalView(
  html: string,
  symbol: "KSE100" | "KSE100PR",
): number {
  // Example substring (from DPS graphical view page):
  // topIndices__item__name">KSE100</div><div class="topIndices__item__val">152,740.37
  const re = new RegExp(
    `topIndices__item__name\">${symbol}<.*?topIndices__item__val[^>]*>\\s*([0-9,]+(?:\\.[0-9]+)?)`,
    "i",
  );
  const m = html.match(re);
  if (!m?.[1]) throw new Error(`Could not parse ${symbol} value`);
  return Number(m[1].replace(/,/g, ""));
}

function parseGraphicalTimestamp(html: string): string {
  // DPS graphical view has: <div class="topbar__status__label">Mar 23, 2026 3:24 PM</div>
  const m = html.match(
    /topbar__status__label\">\s*([^<]{6,60})\s*<\/div>/i,
  );
  if (m?.[1]) return m[1].trim();
  // Fallback: current time
  return new Date().toISOString();
}

export async function getKse100(
  variant: "KSE100" | "KSE100PR" = "KSE100",
): Promise<KseIndexResponse> {
  const url = "https://dps.psx.com.pk/graphical-view";

  const res = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      "user-agent": "Mozilla/5.0 (PSXTrack/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`DPS graphical-view request failed: ${res.status}`);
  }

  const html = await res.text();
  return {
    symbol: variant,
    value: parseKseValueFromGraphicalView(html, variant),
    timestamp: parseGraphicalTimestamp(html),
  };
}

