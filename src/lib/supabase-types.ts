import type { OrderRow } from "./types";

// Minimal Supabase database typing for strict mode.
// Add more tables/columns here if you expand the app.

export type KseCloseRow = {
  date: string;
  close: number;
  source: string;
  scraped_at: string;
};

export type StockOhlcvRow = {
  symbol: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  source: string;
  scraped_at: string;
};

export type Database = {
  public: {
    Tables: {
      orders: {
        Row: OrderRow;
        Insert: {
          user_id?: string | null;
          symbol: string;
          quantity: string;
          price: string;
          order_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          symbol?: string;
          quantity?: string;
          price?: string;
          order_date?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      kse_closes: {
        Row: KseCloseRow;
        Insert: KseCloseRow;
        Update: Partial<KseCloseRow>;
        Relationships: [];
      };
      stock_ohlcv: {
        Row: StockOhlcvRow;
        Insert: StockOhlcvRow;
        Update: Partial<StockOhlcvRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

