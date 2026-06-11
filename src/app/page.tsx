import PortfolioCard from "@/components/PortfolioCard";
import RoiChart from "@/components/RoiChart";
import { getSupabaseAdmin } from "@/lib/supabase";
import { computePortfolio } from "@/lib/portfolio";
import { getPsxPrice, getKseIndex } from "@/lib/psx-scraper";
import type { OrderRow, KseIndexResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
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
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
        Supabase env vars are not configured yet. Deploy with the required
        environment variables.
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-300">
        Failed to load orders: {error.message}
      </div>
    );
  }

  const raw = (data ?? []) as Array<Record<string, unknown> & { id: unknown }>;
  const orders = raw.map((r) => {
    const id = String(r.id);
    return { ...(r as Record<string, unknown>), id } as unknown as OrderRow;
  });

  const symbols = Array.from(
    new Set(orders.map((o) => o.symbol.toUpperCase())),
  );

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

  let kseIndex: KseIndexResponse | undefined;
  try {
    kseIndex = await getKseIndex();
  } catch {
    kseIndex = { value: 0, change: 0, changePercent: 0, timestamp: "", error: "Failed to fetch" };
  }

  const portfolio = computePortfolio(orders, currentPrices);

  return (
    <div className="flex flex-col gap-5">
      <PortfolioCard
        summary={portfolio.summary}
        holdings={portfolio.holdings}
        kseIndex={kseIndex}
      />
      <RoiChart />
    </div>
  );
}
