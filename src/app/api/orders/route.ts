import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import type { OrderCreateInput, OrderUpdateInput } from "@/lib/types";

type OrderRow = {
  id: string;
  user_id: string | null;
  symbol: string;
  quantity: string;
  price: string;
  order_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function listOrders(): Promise<NextResponse> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("order_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const raw = (data ?? []) as Array<Record<string, unknown> & { id: unknown }>;
  const rows = raw.map((r) => {
    const id = String(r.id);
    return { ...(r as Record<string, unknown>), id } as unknown as OrderRow;
  });

  return NextResponse.json(rows);
}

async function createOrder(req: Request): Promise<NextResponse> {
  const supabaseAdmin = getSupabaseAdmin();
  const body = (await req.json()) as OrderCreateInput;
  if (!body?.symbol) return badRequest("Missing symbol");
  if (!body?.quantity) return badRequest("Missing quantity");
  if (!body?.price) return badRequest("Missing price");
  if (!body?.order_date) return badRequest("Missing order_date");

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(
      {
        user_id: null,
        symbol: body.symbol.toUpperCase(),
        quantity: body.quantity,
        price: body.price,
        order_date: body.order_date,
        notes: body.notes ?? null,
      } as unknown as never,
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = (data ?? null) as Record<string, unknown> & { id: unknown };
  return NextResponse.json({ ...row, id: String(row.id) });
}

async function updateOrder(req: Request): Promise<NextResponse> {
  const supabaseAdmin = getSupabaseAdmin();
  const body = (await req.json()) as OrderUpdateInput;
  if (!body?.id) return badRequest("Missing id");
  if (!body?.symbol) return badRequest("Missing symbol");
  if (!body?.quantity) return badRequest("Missing quantity");
  if (!body?.price) return badRequest("Missing price");
  if (!body?.order_date) return badRequest("Missing order_date");

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update(
      {
        symbol: body.symbol.toUpperCase(),
        quantity: body.quantity,
        price: body.price,
        order_date: body.order_date,
        notes: body.notes ?? null,
        updated_at: new Date().toISOString(),
      } as unknown as never,
    )
    .eq("id", body.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = (data ?? null) as Record<string, unknown> & { id: unknown };
  return NextResponse.json({ ...row, id: String(row.id) });
}

async function deleteOrder(req: Request): Promise<NextResponse> {
  const supabaseAdmin = getSupabaseAdmin();
  const body = (await req.json()) as { id: string };
  if (!body?.id) return badRequest("Missing id");

  const { error } = await supabaseAdmin.from("orders").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return listOrders();
}

export async function POST(req: Request) {
  return createOrder(req);
}

export async function PATCH(req: Request) {
  return updateOrder(req);
}

export async function DELETE(req: Request) {
  return deleteOrder(req);
}

