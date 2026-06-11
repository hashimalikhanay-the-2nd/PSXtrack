import type { OrderRow } from "./types";

type PortfolioPoint = {
  date: string; // YYYY-MM-DD
  indexed: number; // index baseline at first point (100)
  raw: number; // value in PKR at that date
};

function parseNumber(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function computePortfolioSeries(
  orders: OrderRow[],
  currentPrices: Record<string, number>,
): PortfolioPoint[] {
  const earliest = orders
    .map((o) => o.order_date)
    .sort()[0];
  if (!earliest) return [];

  const uniqueDates = Array.from(new Set(orders.map((o) => o.order_date)))
    .sort()
    .filter((d) => d >= earliest);

  // Add "today" point so the line ends at the current portfolio snapshot.
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(today.getDate()).padStart(2, "0")}`;
  if (!uniqueDates.includes(todayIso)) uniqueDates.push(todayIso);
  uniqueDates.sort();

  // For each date: compute quantity held from orders up to that date,
  // then multiply by current price.
  const pointsRaw: PortfolioPoint[] = [];
  for (const date of uniqueDates) {
    let value = 0;
    for (const o of orders) {
      if (o.order_date <= date) {
        const sym = o.symbol.toUpperCase();
        const qty = parseNumber(o.quantity);
        const px = currentPrices[sym] ?? 0;
        value += qty * px;
      }
    }
    pointsRaw.push({ date, raw: value, indexed: 0 });
  }

  const base = pointsRaw[0]?.raw ?? 1;
  return pointsRaw.map((p) => ({
    ...p,
    indexed: base > 0 ? (p.raw / base) * 100 : 0,
  }));
}

export function computeKseFlatSeries(
  kseCurrent: number,
  dates: string[],
): { date: string; indexed: number }[] {
  // Without DPS index historical endpoints, we plot KSE as a flat indexed baseline.
  // This keeps the chart functional; once we locate historical-series JSON, we can
  // replace this with a true time series.
  const base = kseCurrent > 0 ? kseCurrent : 1;
  return dates.map((d) => ({ date: d, indexed: 100 * (kseCurrent / base) }));
}

