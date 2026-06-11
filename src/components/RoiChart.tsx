"use client";

import { useEffect, useRef, useState } from "react";

type ChartPoint = {
  date: string;
  portfolioRoi: number;
  kseRoi: number;
  portfolioValue: number;
  costBasis: number;
  kseClose: number;
};

type ChartMeta = {
  kseRows: number;
  latestKseDate: string;
  latestKseClose: number;
  stocks?: Record<string, { rows: number; latest: string }>;
};

type ChartData = {
  series: ChartPoint[];
  kseBase: number;
  jan7CostBasis: number;
  symbols: string[];
  currentPrices?: Record<string, number>;
  meta?: ChartMeta;
  error?: string;
};

function fmtDate(iso: string) {
  const [, mm, dd] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  const sign = value > 0 ? "+" : "";
  const cls = value > 0 ? "stat-green" : value < 0 ? "stat-red" : "stat-neutral";
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-val ${cls}`}>{sign}{value.toFixed(2)}%</div>
    </div>
  );
}

export default function RoiChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  function loadChart() {
    setLoading(true);
    setFetchError(null);
    fetch("/api/chart-data")
      .then((r) => r.json())
      .then((d: ChartData) => {
        if (d.error) { setFetchError(d.error); return; }
        setData(d);
      })
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleManualSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      // Sync KSE closes and stock OHLCV in parallel
      const [kseRes, stockRes] = await Promise.all([
        fetch("/api/kse-sync").then((r) => r.json()),
        fetch("/api/stock-sync").then((r) => r.json()),
      ]);

      const errs: string[] = [];
      if (kseRes.error) errs.push(`KSE: ${kseRes.error}`);
      if (stockRes.error) errs.push(`Stocks: ${stockRes.error}`);

      if (errs.length) {
        setSyncMsg(`Sync failed — ${errs.join(" · ")}`);
      } else {
        const stockSummary = Object.entries(
          (stockRes.symbols ?? {}) as Record<string, { rows: number; latest: string }>
        )
          .map(([sym, s]) => `${sym} (${s.rows}d)`)
          .join(", ");
        setSyncMsg(
          `KSE: ${kseRes.scraped} closes to ${kseRes.latestDate} · Stocks: ${stockSummary}`
        );
        loadChart();
      }
    } catch (e) {
      setSyncMsg(`Sync error: ${String(e)}`);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { loadChart(); }, []);

  useEffect(() => {
    if (!data?.series?.length || !canvasRef.current) return;

    function build() {
      if (!canvasRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Chart = (window as any).Chart;
      if (!Chart) return;
      if (chartRef.current) chartRef.current.destroy();

      const labels    = data!.series.map((p) => fmtDate(p.date));
      const portfolio = data!.series.map((p) => p.portfolioRoi);
      const kse       = data!.series.map((p) => p.kseRoi);

      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const grid   = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
      const zero   = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)";
      const tick   = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.45)";
      const tipBg  = isDark ? "rgba(8,12,26,0.97)"     : "rgba(255,255,255,0.97)";
      const tipBdr = isDark ? "rgba(255,255,255,0.1)"  : "rgba(0,0,0,0.1)";
      const tipTit = isDark ? "rgba(255,255,255,0.8)"  : "rgba(0,0,0,0.8)";
      const tipBod = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

      chartRef.current = new Chart(canvasRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Portfolio ROI",
              data: portfolio,
              borderColor: "#60a5fa",
              backgroundColor: "rgba(96,165,250,0.06)",
              borderWidth: 2.5,
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: "#60a5fa",
              pointHoverBorderColor: isDark ? "#060810" : "#fff",
              pointHoverBorderWidth: 2,
              tension: 0.3,
              fill: true,
            },
            {
              label: "KSE-100 ROI",
              data: kse,
              borderColor: "#fbbf24",
              borderWidth: 2,
              borderDash: [6, 4],
              pointRadius: 0,
              pointHoverRadius: 5,
              pointHoverBackgroundColor: "#fbbf24",
              pointHoverBorderColor: isDark ? "#060810" : "#fff",
              pointHoverBorderWidth: 2,
              tension: 0.3,
              fill: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tipBg,
              borderColor: tipBdr,
              borderWidth: 1,
              titleColor: tipTit,
              bodyColor: tipBod,
              padding: 12,
              cornerRadius: 10,
              callbacks: {
                title: (items: { label: string }[]) => items[0]?.label ?? "",
                label: (ctx: { dataset: { label: string }; parsed: { y: number } }) => {
                  const v = ctx.parsed.y;
                  return `  ${ctx.dataset.label}: ${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: grid, lineWidth: 0.5 },
              ticks: {
                color: tick,
                font: { size: 11, family: "'DM Mono', monospace" },
                maxRotation: 45,
                autoSkip: true,
                maxTicksLimit: 14,
              },
              border: { color: grid },
            },
            y: {
              grid: {
                color: (ctx: { tick: { value: number } }) =>
                  ctx.tick.value === 0 ? zero : grid,
                lineWidth: (ctx: { tick: { value: number } }) =>
                  ctx.tick.value === 0 ? 1.5 : 0.5,
              },
              ticks: {
                color: tick,
                font: { size: 11, family: "'DM Mono', monospace" },
                callback: (v: number | string) => {
                  const n = Number(v);
                  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
                },
              },
              border: { color: grid },
            },
          },
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Chart) {
      build();
    } else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      s.onload = build;
      document.head.appendChild(s);
    }

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  const latest  = data?.series?.[data.series.length - 1];
  const portRoi = latest?.portfolioRoi ?? 0;
  const kseRoi  = latest?.kseRoi ?? 0;
  const alpha   = Math.round((portRoi - kseRoi) * 100) / 100;

  return (
    <div className="roi-wrap">
      {/* Header */}
      <div className="roi-head">
        <div>
          <div className="roi-title">Performance vs KSE-100</div>
          <div className="roi-sub">
            ROI % since first order date — anchored to 0%
            {data?.meta && (
              <span className="roi-kse-meta">
                {" "}· {data.meta.kseRows} trading days · latest {data.meta.latestKseDate}
              </span>
            )}
          </div>
        </div>
        <div className="roi-head-right">
          {latest && (
            <div className="roi-stats">
              <Stat label="Portfolio" value={portRoi} />
              <Stat label="KSE-100"  value={kseRoi} />
              <Stat label="Alpha"    value={alpha} />
            </div>
          )}
          <button
            className={`sync-btn ${syncing ? "sync-btn-loading" : ""}`}
            onClick={handleManualSync}
            disabled={syncing}
            title="Re-sync KSE-100 closes from Brecorder"
          >
            <span className={`sync-icon ${syncing ? "spin" : ""}`}>↻</span>
            {syncing ? "Syncing…" : "Sync KSE"}
          </button>
        </div>
      </div>

      {/* Sync message */}
      {syncMsg && (
        <div className={`sync-msg ${syncMsg.startsWith("Sync fail") || syncMsg.startsWith("Sync err") ? "sync-msg-err" : "sync-msg-ok"}`}>
          {syncMsg}
        </div>
      )}

      {/* Legend */}
      {!fetchError && !loading && (
        <div className="roi-legend">
          <span className="leg-item">
            <span className="leg-solid" style={{ background: "#60a5fa" }} />
            Portfolio ROI
          </span>
          <span className="leg-item">
            <span className="leg-dashed" />
            KSE-100 ROI
          </span>
        </div>
      )}

      {/* Canvas */}
      <div className="roi-canvas-wrap">
        {loading && (
          <div className="roi-state">
            <span className="roi-spinner" />
            Loading market data…
          </div>
        )}
        {!loading && fetchError && (
          <div className="roi-state roi-err">
            <div style={{ marginBottom: "0.4rem" }}>⚠ Failed to load chart data</div>
            <div style={{ fontSize: "0.68rem", opacity: 0.7, wordBreak: "break-all", maxWidth: 540, textAlign: "center" }}>
              {fetchError}
            </div>
            <button className="sync-btn" style={{ marginTop: "0.75rem" }} onClick={handleManualSync}>
              Retry Sync
            </button>
          </div>
        )}
        {!loading && !fetchError && !data?.series?.length && (
          <div className="roi-state">No data yet. Add orders and sync KSE data.</div>
        )}
        {!loading && !fetchError && !!data?.series?.length && (
          <canvas ref={canvasRef} />
        )}
      </div>

      {/* Footnote */}
      {data && !fetchError && (
        <div className="roi-foot">
          Portfolio ROI uses real daily closes from Brecorder (open + close saved to Supabase).
          Fallback to linear interpolation when no DB close exists for a date.
          KSE-100 &amp; stock OHLCV cached in Supabase · live prices via <code>dps.psx.com.pk</code>.
          {data.meta && (
            <>
              {" "}· <span className="kse-close-tag">KSE {data.meta.latestKseDate}: {data.meta.latestKseClose?.toLocaleString("en-PK")}</span>
              {data.meta.stocks && (
                <span className="stock-meta-row">
                  {" "}· {Object.entries(data.meta.stocks).map(([sym, s]) => `${sym} ${s.rows}d→${s.latest}`).join(" · ")}
                </span>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=Inter:wght@400;500&display=swap');

        .roi-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          font-family: 'Inter', sans-serif;
        }

        .roi-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .roi-head-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
        }
        .roi-title {
          font-family: 'Syne', sans-serif;
          font-size: 0.95rem;
          font-weight: 700;
          color: rgba(255,255,255,0.88);
        }
        .roi-sub {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.3);
          margin-top: 0.2rem;
          font-family: 'DM Mono', monospace;
        }
        .roi-kse-meta { color: rgba(255,255,255,0.2); }

        .roi-stats { display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .stat { display: flex; flex-direction: column; align-items: flex-end; gap: 0.1rem; }
        .stat-label {
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          font-family: 'DM Mono', monospace;
        }
        .stat-val {
          font-family: 'Syne', sans-serif;
          font-size: 1.05rem;
          font-weight: 700;
        }
        .stat-green   { color: #6ee7b7; }
        .stat-red     { color: #fca5a5; }
        .stat-neutral { color: rgba(255,255,255,0.5); }

        /* Sync button */
        .sync-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9999px;
          padding: 0.3rem 0.8rem;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .sync-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.8);
          border-color: rgba(255,255,255,0.18);
        }
        .sync-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sync-icon { font-size: 0.85rem; line-height: 1; display: inline-block; }
        .spin { animation: spin 0.75s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Sync message */
        .sync-msg {
          font-family: 'DM Mono', monospace;
          font-size: 0.68rem;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          border: 1px solid;
        }
        .sync-msg-ok  { color: #6ee7b7; background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.2); }
        .sync-msg-err { color: #fca5a5; background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.2); }

        .roi-legend { display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .leg-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.38);
          font-family: 'DM Mono', monospace;
        }
        .leg-solid {
          display: inline-block;
          width: 20px; height: 2.5px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .leg-dashed {
          display: inline-block;
          width: 20px; height: 0;
          border-top: 2px dashed #fbbf24;
          flex-shrink: 0;
        }

        .roi-canvas-wrap {
          position: relative;
          width: 100%;
          height: 300px;
        }
        .roi-canvas-wrap canvas {
          position: absolute;
          inset: 0;
          width: 100% !important;
          height: 100% !important;
        }

        .roi-state {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.35);
          font-family: 'DM Mono', monospace;
          padding: 1rem;
          text-align: center;
        }
        .roi-err { color: #fca5a5; }

        .roi-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
          flex-shrink: 0;
        }

        .roi-foot {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.18);
          font-family: 'DM Mono', monospace;
          line-height: 1.65;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 0.7rem;
        }
        .roi-foot code {
          background: rgba(255,255,255,0.05);
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 0.62rem;
        }
        .kse-close-tag {
          color: rgba(251,191,36,0.5);
        }
        .stock-meta-row {
          color: rgba(100,206,251,0.35);
        }
      `}</style>
    </div>
  );
}
