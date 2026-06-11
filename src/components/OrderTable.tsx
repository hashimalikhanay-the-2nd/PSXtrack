"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { OrderRow } from "@/lib/types";

const OrderFormSchema = z.object({
  symbol: z.string().min(1),
  quantity: z
    .string()
    .min(1)
    .refine((v) => Number(v) > 0, "Quantity must be > 0"),
  price: z
    .string()
    .min(1)
    .refine((v) => Number(v) > 0, "Price must be > 0"),
  order_date: z.string().min(1),
  notes: z.string().optional().nullable(),
});

type OrderFormValues = z.infer<typeof OrderFormSchema>;

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function OrderTable({
  initialOrders,
  symbols,
}: {
  initialOrders: OrderRow[];
  symbols: string[];
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues: OrderFormValues = useMemo(
    () => ({
      symbol: symbols[0] ?? "FFC",
      quantity: "",
      price: "",
      order_date: toISODate(new Date()),
      notes: "",
    }),
    [symbols],
  );

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(OrderFormSchema),
    defaultValues,
  });

  function resetForAdd() {
    setEditingId(null);
    setSubmitError(null);
    form.reset(defaultValues);
  }

  function openForEdit(order: OrderRow) {
    setEditingId(order.id);
    setSubmitError(null);
    form.reset({
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price,
      order_date: order.order_date,
      notes: order.notes ?? "",
    });
    setOpen(true);
  }

  async function onSubmit(values: OrderFormValues) {
    setSubmitting(true);
    setSubmitError(null);

    try {
      if (editingId) {
        const prev = orders;
        setOrders((curr) =>
          curr.map((o) =>
            o.id === editingId
              ? {
                  ...o,
                  symbol: values.symbol.toUpperCase(),
                  quantity: values.quantity,
                  price: values.price,
                  order_date: values.order_date,
                  notes: values.notes ?? null,
                }
              : o,
          ),
        );

        const res = await fetch("/api/orders", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editingId, ...values }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          setOrders(prev);
          throw new Error(err?.error ?? "Failed to update order");
        }

        const saved = (await res.json()) as OrderRow;
        setOrders((curr) => curr.map((o) => (o.id === editingId ? saved : o)));
        setOpen(false);
      } else {
        const tempId = `temp_${Date.now()}`;
        const optimistic: OrderRow = {
          id: tempId,
          user_id: null,
          symbol: values.symbol.toUpperCase(),
          quantity: values.quantity,
          price: values.price,
          order_date: values.order_date,
          notes: values.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const prev = orders;
        setOrders((curr) => [optimistic, ...curr]);

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          setOrders(prev);
          throw new Error(err?.error ?? "Failed to add order");
        }

        const saved = (await res.json()) as OrderRow;
        setOrders((curr) => curr.map((o) => (o.id === tempId ? saved : o)));
        setOpen(false);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    const prev = orders;
    setOrders((curr) => curr.filter((o) => o.id !== id));
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to delete order");
      }
    } catch (err) {
      setOrders(prev);
      setSubmitError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const totalInvested = orders.reduce(
    (acc, o) => acc + Number(o.quantity) * Number(o.price),
    0,
  );

  return (
    <>
      <div className="orders-page">
        {/* Header */}
        <div className="orders-header">
          <div>
            <h1 className="orders-title">Orders</h1>
            <p className="orders-meta">
              {orders.length} orders ·{" "}
              PKR {totalInvested.toLocaleString("en-PK", { maximumFractionDigits: 2 })} invested
            </p>
          </div>
          <button
            className="add-btn"
            onClick={() => { resetForAdd(); setOpen(true); }}
          >
            + Add Order
          </button>
        </div>

        {submitError && (
          <div className="err-banner">{submitError}</div>
        )}

        {/* Table */}
        <div className="orders-card">
          <div className="table-scroll">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th className="right">Qty</th>
                  <th className="right">Price (PKR)</th>
                  <th className="right">Value (PKR)</th>
                  <th className="right">Date</th>
                  <th>Notes</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">No orders yet.</td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="order-row">
                      <td className="sym">{o.symbol}</td>
                      <td className="right mono">{Number(o.quantity).toLocaleString()}</td>
                      <td className="right mono">{Number(o.price).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="right mono">
                        {(Number(o.quantity) * Number(o.price)).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="right mono date-col">{o.order_date}</td>
                      <td className="notes-col">{o.notes ?? "—"}</td>
                      <td className="right actions-col">
                        <button className="action-edit" onClick={() => openForEdit(o)}>Edit</button>
                        <button
                          className="action-del"
                          disabled={submitting}
                          onClick={() => {
                            if (window.confirm(`Delete ${o.symbol} order (${o.order_date})?`)) {
                              void onDelete(o.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setSubmitError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Order" : "Add Order"}</DialogTitle>
            <DialogDescription>Each buy is stored as an individual order.</DialogDescription>
          </DialogHeader>

          <form className="order-form" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="form-field">
              <Label>Symbol</Label>
              <Select value={form.watch("symbol")} onValueChange={(v) => form.setValue("symbol", v)}>
                <SelectTrigger><SelectValue placeholder="Select symbol" /></SelectTrigger>
                <SelectContent>
                  {symbols.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.formState.errors.symbol && <div className="field-err">{form.formState.errors.symbol.message}</div>}
            </div>

            <div className="form-row">
              <div className="form-field">
                <Label>Quantity</Label>
                <Input inputMode="decimal" placeholder="0" {...form.register("quantity")} />
                {form.formState.errors.quantity && <div className="field-err">{form.formState.errors.quantity.message}</div>}
              </div>
              <div className="form-field">
                <Label>Price (PKR)</Label>
                <Input inputMode="decimal" placeholder="0.00" {...form.register("price")} />
                {form.formState.errors.price && <div className="field-err">{form.formState.errors.price.message}</div>}
              </div>
            </div>

            <div className="form-field">
              <Label>Date</Label>
              <Input type="date" {...form.register("order_date")} />
            </div>

            <div className="form-field">
              <Label>Notes</Label>
              <Textarea placeholder="Optional note" {...form.register("notes")} />
            </div>

            {submitError && <div className="field-err">{submitError}</div>}

            <div className="form-actions">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save Order"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

        .orders-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          font-family: 'DM Sans', sans-serif;
        }
        .orders-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .orders-title {
          font-family: 'Syne', sans-serif;
          font-size: 1.4rem;
          font-weight: 800;
          color: rgba(255,255,255,0.92);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .orders-meta {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.35);
          margin: 0.2rem 0 0;
          font-family: 'DM Mono', monospace;
        }
        .add-btn {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          color: #060810;
          background: linear-gradient(135deg, #34d399, #10b981);
          border: none;
          border-radius: 9px;
          padding: 0.55rem 1.1rem;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
          box-shadow: 0 2px 12px rgba(16,185,129,0.3);
        }
        .add-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .add-btn:active { transform: translateY(0); }

        .err-banner {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px;
          padding: 0.65rem 1rem;
          font-size: 0.82rem;
          color: #fca5a5;
        }

        .orders-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
        }
        .table-scroll { overflow-x: auto; }
        .orders-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          font-size: 0.82rem;
        }
        .orders-table thead tr {
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .orders-table th {
          padding: 0.7rem 1.1rem;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          text-align: left;
          white-space: nowrap;
        }
        .orders-table th.right { text-align: right; }
        .order-row {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.12s;
        }
        .order-row:last-child { border-bottom: none; }
        .order-row:hover { background: rgba(255,255,255,0.025); }
        .orders-table td {
          padding: 0.8rem 1.1rem;
          color: rgba(255,255,255,0.7);
          text-align: left;
          white-space: nowrap;
        }
        .orders-table td.right { text-align: right; }
        .orders-table td.mono { font-family: 'DM Mono', monospace; font-size: 0.79rem; }
        .sym {
          font-family: 'Syne', sans-serif !important;
          font-weight: 700 !important;
          color: rgba(255,255,255,0.9) !important;
          letter-spacing: 0.04em;
        }
        .notes-col {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          color: rgba(255,255,255,0.4) !important;
          font-size: 0.76rem !important;
        }
        .date-col { color: rgba(255,255,255,0.55) !important; }
        .empty-row {
          text-align: center !important;
          padding: 3rem !important;
          color: rgba(255,255,255,0.2) !important;
          font-style: italic;
        }
        .actions-col { display: flex; gap: 0.4rem; justify-content: flex-end; }
        .action-edit, .action-del {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 500;
          border-radius: 7px;
          padding: 0.3rem 0.7rem;
          cursor: pointer;
          border: 1px solid;
          transition: background 0.12s, opacity 0.12s;
        }
        .action-edit {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7);
        }
        .action-edit:hover { background: rgba(255,255,255,0.08); }
        .action-del {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.2);
          color: #fca5a5;
        }
        .action-del:hover { background: rgba(239,68,68,0.14); }
        .action-del:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Form */
        .order-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .field-err { font-size: 0.72rem; color: #fca5a5; }
        .form-actions { display: flex; justify-content: flex-end; gap: 0.6rem; padding-top: 0.25rem; }
      `}</style>
    </>
  );
}
