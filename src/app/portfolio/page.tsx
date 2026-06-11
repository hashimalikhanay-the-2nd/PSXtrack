import PortfolioCard from "@/components/PortfolioCard";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computePortfolio } from "@/lib/portfolio";
import { getPsxPrice } from "@/lib/psx-scraper";
import type { OrderRow } from "@/lib/types";
import { getKse100 } from "@/lib/kse100-scraper";
import { computeKseFlatSeries, computePortfolioSeries } from "@/lib/performance-series";
import PerformanceVsKseChart from "@/components/PerformanceVsKseChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function PortfolioRoutePage() {
  let data: unknown[] | null = null;
  let error: { message: string } | null = null;
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const res = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false })
      .order("id", { ascending: false });
    data = res.data as unknown[] | null;
    error = res.error ? { message: res.error.message } : null;
  } catch {
    return (
      <div className="rounded-md border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80">
        Supabase env vars are not configured yet. Deploy with the required
        environment variables.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-200">
        Failed to load orders: {error.message}
      </div>
    );
  }

  const raw = (data ?? []) as Array<Record<string, unknown> & { id: unknown }>;
  const orders = raw.map((r) => {
    const id = String(r.id);
    return { ...(r as Record<string, unknown>), id } as unknown as OrderRow;
  });

  const symbols = Array.from(new Set(orders.map((o) => o.symbol.toUpperCase())));

  const currentPrices: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      try {
        const p = await getPsxPrice(sym);
        currentPrices[sym] = p.price;
      } catch {
        currentPrices[sym] = 0;
      }
    }),
  );

  const portfolio = computePortfolio(orders, currentPrices);
  const portfolioSeries = computePortfolioSeries(orders, currentPrices);
  let kseValue = 0;
  try {
    const kse = await getKse100("KSE100");
    kseValue = kse.value;
  } catch {
    kseValue = 0;
  }

  const kseSeries = computeKseFlatSeries(
    kseValue,
    portfolioSeries.map((p) => p.date),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button asChild={true}>
          <Link href="/orders">Add Order</Link>
        </Button>
      </div>
      <PortfolioCard summary={portfolio.summary} holdings={portfolio.holdings} />
      <PerformanceVsKseChart
        portfolioSeries={portfolioSeries}
        kseSeries={kseSeries}
      />
    </div>
  );
}

