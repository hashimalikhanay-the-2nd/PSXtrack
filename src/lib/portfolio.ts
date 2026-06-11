import type { OrderRow, PortfolioHolding, PortfolioSummary } from "./types";

function toNumber(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n;
}

export function computePortfolio(
  orders: OrderRow[],
  currentPrices: Record<string, number>,
): { summary: PortfolioSummary; holdings: PortfolioHolding[] } {
  const bySymbol = new Map<
    string,
    { symbol: string; quantity: number; investedTotal: number }
  >();

  for (const o of orders) {
    const symbol = o.symbol.toUpperCase();
    const qty = toNumber(o.quantity);
    const price = toNumber(o.price);
    const invested = qty * price;

    const prev = bySymbol.get(symbol) ?? {
      symbol,
      quantity: 0,
      investedTotal: 0,
    };
    prev.quantity += qty;
    prev.investedTotal += invested;
    bySymbol.set(symbol, prev);
  }

  const holdings: PortfolioHolding[] = [];
  for (const h of bySymbol.values()) {
    const avgPrice = h.quantity > 0 ? h.investedTotal / h.quantity : 0;
    const currentPrice = currentPrices[h.symbol] ?? 0;
    const currentValue = currentPrice * h.quantity;
    const profit = currentValue - h.investedTotal;
    const profitPercent =
      h.investedTotal > 0 ? (profit / h.investedTotal) * 100 : 0;

    holdings.push({
      symbol: h.symbol,
      quantity: h.quantity,
      avgPrice,
      investedTotal: h.investedTotal,
      currentPrice,
      currentValue,
      profit,
      profitPercent,
    });
  }

  holdings.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const investedTotal = holdings.reduce((acc, h) => acc + h.investedTotal, 0);
  const currentTotal = holdings.reduce((acc, h) => acc + h.currentValue, 0);
  const profit = currentTotal - investedTotal;
  const profitPercent = investedTotal > 0 ? (profit / investedTotal) * 100 : 0;

  return {
    summary: {
      investedTotal,
      currentTotal,
      profit,
      profitPercent,
    },
    holdings,
  };
}

