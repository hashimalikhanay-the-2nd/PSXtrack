"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  indexed: number;
};

export default function PerformanceVsKseChart({
  portfolioSeries,
  kseSeries,
}: {
  portfolioSeries: Point[];
  kseSeries: Point[];
}) {
  const data = portfolioSeries.map((p, idx) => ({
    x: p.date,
    portfolio: p.indexed,
    kse: kseSeries[idx]?.indexed ?? 100,
  }));

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-white/90">
            Performance Since Entry
          </div>
          <div className="text-xs text-white/60">
            Indexed to 100 at first order date (KSE-100 baseline)
          </div>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.85)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.8)" }}
              formatter={(value, name) => {
                const num =
                  typeof value === "number" ? value : Number(value ?? 0);
                const label =
                  name === "portfolio" ? "Portfolio" : "KSE-100";
                return [`${num.toFixed(2)}`, label] as const;
              }}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="portfolio"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "#60a5fa" }}
            />
            <Line
              type="monotone"
              dataKey="kse"
              name="kse"
              stroke="#fbbf24"
              strokeWidth={2.0}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0, fill: "#fbbf24" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

