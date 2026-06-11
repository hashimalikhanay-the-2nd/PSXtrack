"use client";

import type { PortfolioHolding, PortfolioSummary, KseIndexResponse } from "@/lib/types";

function formatPKR(value: number, showSign = false): string {
  const abs = Math.abs(value);
  const sign = showSign ? (value >= 0 ? "+" : "−") : value < 0 ? "−" : "";

  if (abs >= 10_000_000) {
    return `${sign}PKR ${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}PKR ${(abs / 1_000_000).toFixed(3)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}PKR ${(abs / 1_000).toFixed(2)}K`;
  }
  return `${sign}PKR ${abs.toLocaleString("en-PK", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function formatPKRFull(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  return `${sign}PKR ${abs.toLocaleString("en-PK", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

export default function PortfolioCard({
  summary,
  holdings,
  kseIndex,
}: {
  summary: PortfolioSummary;
  holdings: PortfolioHolding[];
  kseIndex?: KseIndexResponse;
}) {
  const isProfit = summary.profit >= 0;

  return (
    <div className="portfolio-wrapper">

      {/* ─── Section label ─── */}
      <div className="section-label">
        <span className="section-label-line" />
        <span className="section-label-text">Portfolio Overview</span>
        <span className="section-label-line" />
      </div>

      {/* ─── Top metrics row ─── */}
      <div className="metrics-grid">
        <MetricCard
          label="Total Invested"
          value={formatPKRFull(summary.investedTotal)}
          sub={null}
          accent="neutral"
        />
        <MetricCard
          label="Current Value"
          value={formatPKRFull(summary.currentTotal)}
          sub={null}
          accent="neutral"
        />
        <MetricCard
          label="Unrealised P/L"
          value={formatPKR(summary.profit, true)}
          sub={`${summary.profitPercent >= 0 ? "+" : ""}${summary.profitPercent.toFixed(2)}%`}
          accent={isProfit ? "green" : "red"}
        />
        <MetricCard
          label="KSE-100 Index"
          value={
            kseIndex && kseIndex.value > 0
              ? kseIndex.value.toLocaleString("en-PK", { maximumFractionDigits: 2 })
              : "—"
          }
          sub={
            kseIndex && kseIndex.value > 0
              ? `${kseIndex.change >= 0 ? "+" : ""}${kseIndex.change.toFixed(2)} (${kseIndex.changePercent >= 0 ? "+" : ""}${kseIndex.changePercent.toFixed(2)}%)`
              : kseIndex?.error ?? "Unavailable"
          }
          accent={
            !kseIndex || kseIndex.value === 0
              ? "neutral"
              : kseIndex.change >= 0
              ? "green"
              : "red"
          }
          badge="LIVE"
        />
      </div>

      {/* ─── Holdings table ─── */}
      <div className="holdings-card">
        <div className="holdings-header">
          <div className="holdings-title-group">
            <div className="holdings-title">Holdings</div>
            <div className="holdings-count">{holdings.length} positions</div>
          </div>
          {kseIndex && kseIndex.value > 0 && (
            <div className="kse-badge">
              <span className="kse-dot-sm" />
              KSE-100: {kseIndex.value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}
              <span className={kseIndex.change >= 0 ? "kse-chg-pos" : "kse-chg-neg"}>
                &nbsp;{kseIndex.changePercent >= 0 ? "+" : ""}{kseIndex.changePercent.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="table-wrapper">
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th className="right">Qty</th>
                <th className="right">Avg Cost</th>
                <th className="right">Current</th>
                <th className="right">Invested</th>
                <th className="right">Value</th>
                <th className="right">P/L (PKR)</th>
                <th className="right">P/L %</th>
                <th className="right">vs KSE</th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row">
                    No holdings yet. Add orders to get started.
                  </td>
                </tr>
              ) : (
                holdings.map((h) => {
                  const pos = h.profit >= 0;
                  const vsKse =
                    kseIndex && kseIndex.changePercent !== 0
                      ? h.profitPercent - kseIndex.changePercent
                      : null;
                  return (
                    <tr key={h.symbol} className="holding-row">
                      <td className="symbol-cell">{h.symbol}</td>
                      <td className="right mono">{Math.round(h.quantity).toLocaleString()}</td>
                      <td className="right mono">PKR {h.avgPrice.toFixed(2)}</td>
                      <td className="right mono">PKR {h.currentPrice > 0 ? h.currentPrice.toFixed(2) : "—"}</td>
                      <td className="right mono">{formatPKR(h.investedTotal)}</td>
                      <td className="right mono">{formatPKR(h.currentValue)}</td>
                      <td className={`right mono ${pos ? "profit" : "loss"}`}>
                        {pos ? "+" : "−"}PKR {Math.abs(h.profit).toFixed(2)}
                      </td>
                      <td className={`right mono pct ${pos ? "profit" : "loss"}`}>
                        {pos ? "+" : ""}{h.profitPercent.toFixed(2)}%
                      </td>
                      <td className={`right mono ${vsKse === null ? "" : vsKse >= 0 ? "profit" : "loss"}`}>
                        {vsKse === null
                          ? "—"
                          : `${vsKse >= 0 ? "+" : ""}${vsKse.toFixed(2)}%`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {kseIndex && kseIndex.value > 0 && (
          <div className="kse-note">
            <span className="kse-dot" />
            vs KSE-100 shows stock P/L relative to the index daily move ({kseIndex.changePercent >= 0 ? "+" : ""}{kseIndex.changePercent.toFixed(2)}% today).
            {kseIndex.timestamp && (
              <span className="kse-ts"> As of {kseIndex.timestamp}.</span>
            )}
          </div>
        )}
      </div>

      <style>{`
        .portfolio-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          font-family: var(--font-inter), 'Inter', sans-serif;
        }

        /* ── Section label ── */
        .section-label {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.25rem;
        }
        .section-label-line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }
        .section-label-text {
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.28);
          white-space: nowrap;
        }

        /* ── Metrics grid ── */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        @media (max-width: 900px) {
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 520px) {
          .metrics-grid { grid-template-columns: 1fr; }
        }

        .metric-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .metric-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1.5px;
          border-radius: 16px 16px 0 0;
        }
        .metric-card::after {
          content: '';
          position: absolute;
          bottom: 0; right: 0;
          width: 60px; height: 60px;
          border-radius: 50%;
          opacity: 0.04;
        }
        .metric-card.accent-green::before { background: linear-gradient(90deg, #10b981, #34d399, transparent); }
        .metric-card.accent-green::after  { background: #34d399; }
        .metric-card.accent-red::before   { background: linear-gradient(90deg, #ef4444, #f87171, transparent); }
        .metric-card.accent-red::after    { background: #ef4444; }
        .metric-card.accent-neutral::before { background: linear-gradient(90deg, rgba(100,206,251,0.4), transparent); }
        .metric-card:hover {
          border-color: rgba(255,255,255,0.12);
          transform: translateY(-1px);
        }

        .metric-label {
          font-size: 0.67rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: var(--font-inter), 'Inter', sans-serif;
        }
        .live-badge {
          font-size: 0.52rem;
          letter-spacing: 0.08em;
          padding: 1px 5px;
          border-radius: 3px;
          background: rgba(16,185,129,0.15);
          color: #34d399;
          border: 1px solid rgba(16,185,129,0.25);
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
        }
        .metric-value {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .metric-card.accent-green .metric-value { color: #6ee7b7; }
        .metric-card.accent-red   .metric-value { color: #fca5a5; }

        .metric-sub {
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
          font-size: 0.75rem;
          margin-top: 0.35rem;
          color: rgba(255,255,255,0.35);
        }
        .metric-card.accent-green .metric-sub { color: #34d399; }
        .metric-card.accent-red   .metric-sub { color: #f87171; }

        /* ── Holdings card ── */
        .holdings-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          overflow: hidden;
        }
        .holdings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem 0.9rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .holdings-title-group {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
        }
        .holdings-title {
          font-family: var(--font-syne), 'Syne', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.88);
        }
        .holdings-count {
          font-size: 0.68rem;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
        }

        .kse-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9999px;
          padding: 0.25rem 0.75rem;
        }
        .kse-dot-sm {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 5px #34d399;
        }
        .kse-chg-pos { color: #34d399; }
        .kse-chg-neg { color: #f87171; }

        .table-wrapper {
          overflow-x: auto;
        }
        .holdings-table {
          width: 100%;
          min-width: 860px;
          border-collapse: collapse;
          font-size: 0.8rem;
        }
        .holdings-table thead tr {
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .holdings-table th {
          padding: 0.65rem 1.1rem;
          font-weight: 500;
          font-size: 0.64rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          text-align: left;
          white-space: nowrap;
          font-family: var(--font-inter), 'Inter', sans-serif;
        }
        .holdings-table th.right { text-align: right; }

        .holding-row {
          border-bottom: 1px solid rgba(255,255,255,0.035);
          transition: background 0.12s;
        }
        .holding-row:last-child { border-bottom: none; }
        .holding-row:hover { background: rgba(100,206,251,0.03); }
        .holdings-table td {
          padding: 0.8rem 1.1rem;
          color: rgba(255,255,255,0.65);
          white-space: nowrap;
          text-align: left;
        }
        .holdings-table td.right { text-align: right; }
        .holdings-table td.mono {
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
          font-size: 0.77rem;
        }

        .symbol-cell {
          font-family: var(--font-syne), 'Syne', sans-serif !important;
          font-weight: 700 !important;
          font-size: 0.85rem !important;
          color: rgba(255,255,255,0.88) !important;
          letter-spacing: 0.04em;
        }

        .profit { color: #6ee7b7 !important; }
        .loss   { color: #fca5a5 !important; }
        .pct    { font-weight: 500; }

        .empty-row {
          text-align: center !important;
          padding: 3.5rem !important;
          color: rgba(255,255,255,0.2) !important;
          font-style: italic;
          font-size: 0.82rem;
        }

        .kse-note {
          padding: 0.7rem 1.25rem;
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 0.67rem;
          color: rgba(255,255,255,0.24);
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: var(--font-dm-mono), 'DM Mono', monospace;
        }
        .kse-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #34d399;
          flex-shrink: 0;
          box-shadow: 0 0 5px #34d399;
        }
        .kse-ts { color: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
  badge,
}: {
  label: string;
  value: string;
  sub: string | null;
  accent: "green" | "red" | "neutral";
  badge?: string;
}) {
  return (
    <div className={`metric-card accent-${accent}`}>
      <div className="metric-label">
        {label}
        {badge && <span className="live-badge">{badge}</span>}
      </div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
