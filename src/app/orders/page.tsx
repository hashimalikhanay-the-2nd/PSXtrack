import OrderTable from "@/components/OrderTable";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { OrderRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_SYMBOLS = ["FFC", "MEBL", "SYS", "MARI", "EFERT"];

export default async function OrdersPage() {
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

  const symbols = Array.from(
    new Set([...DEFAULT_SYMBOLS, ...orders.map((o) => o.symbol.toUpperCase())]),
  ).sort((a, b) => a.localeCompare(b));

  return <OrderTable initialOrders={orders} symbols={symbols} />;
}

