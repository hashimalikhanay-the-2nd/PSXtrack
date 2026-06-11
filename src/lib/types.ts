export type OrderRow = {
  id: string;
  user_id: string | null;
  symbol: string;
  quantity: string; // numeric(12,2) serialized as string
  price: string; // numeric(10,2) serialized as string
  order_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderCreateInput = {
  symbol: string;
  quantity: string;
  price: string;
  order_date: string;
  notes?: string | null;
};

export type OrderUpdateInput = {
  id: string;
  symbol: string;
  quantity: string;
  price: string;
  order_date: string;
  notes?: string | null;
};

export type PsxPriceResponse = {
  symbol: string;
  price: number;
  timestamp: string;
};

export type KseIndexResponse = {
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
  error?: string;
};

export type PortfolioHolding = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  investedTotal: number;
  currentPrice: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
};

export type PortfolioSummary = {
  investedTotal: number;
  currentTotal: number;
  profit: number;
  profitPercent: number;
};
