-- KSE-100 daily close prices table
-- Stores scraped historical closes so we don't re-scrape every request

CREATE TABLE IF NOT EXISTS public.kse_closes (
  date        DATE        PRIMARY KEY,
  close       NUMERIC(12, 2) NOT NULL,
  source      TEXT        NOT NULL DEFAULT 'brecorder',
  scraped_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for range queries (chart series)
CREATE INDEX IF NOT EXISTS kse_closes_date_idx ON public.kse_closes (date ASC);

-- Comment
COMMENT ON TABLE public.kse_closes IS 
  'KSE-100 daily close prices. Populated by /api/kse-sync on first load then cached.';
