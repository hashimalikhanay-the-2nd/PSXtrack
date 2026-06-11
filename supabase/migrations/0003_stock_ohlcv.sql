-- Stock daily OHLCV table
-- Stores scraped open/high/low/close/volume for each PSX symbol

CREATE TABLE IF NOT EXISTS public.stock_ohlcv (
  symbol      TEXT        NOT NULL,
  date        DATE        NOT NULL,
  open        NUMERIC(12, 4),
  high        NUMERIC(12, 4),
  low         NUMERIC(12, 4),
  close       NUMERIC(12, 4) NOT NULL,
  volume      BIGINT,
  source      TEXT        NOT NULL DEFAULT 'brecorder',
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (symbol, date)
);

CREATE INDEX IF NOT EXISTS stock_ohlcv_symbol_date_idx
  ON public.stock_ohlcv (symbol, date ASC);

COMMENT ON TABLE public.stock_ohlcv IS
  'Daily OHLCV data for PSX-held stocks. Populated by /api/stock-sync.';
