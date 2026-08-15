import React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useScoped } from "@/lib/useScoped";
import { PageHeader, DemoBanner, ChartCard, StatePanel, Panel, ChartTooltip, CHART } from "@/components/common/ui";
import { fmtDate } from "@/lib/format";
import { TrendingUp } from "lucide-react";

export default function RatingAnalytics() {
  const trend = useScoped("ra-trend", "/analytics/rating-trend");
  const dist = useScoped("ra-dist", "/analytics/rating-distribution", { days: 90 });
  const fc = useScoped("ra-fc", "/analytics/forecast");
  const f = fc.data;

  let data = [];
  if (trend.data?.series) {
    data = trend.data.series.map((s) => ({ date: fmtDate(s.date), rating: s.rating, moving_avg: s.moving_avg }));
    if (trend.data.forecast?.length && data.length) {
      data[data.length - 1].forecast = data[data.length - 1].rating;
      trend.data.forecast.slice(1).forEach((p) => data.push({ date: fmtDate(p.date), forecast: p.forecast }));
    }
  }

  const cards = [
    { label: "Current", val: f?.current, tone: "text-zinc-50" },
    { label: "7-Day Projection", val: f?.p7, tone: "text-amber-400" },
    { label: "30-Day Projection", val: f?.p30, tone: "text-amber-400" },
    { label: "90-Day Projection", val: f?.p90, tone: "text-amber-400" },
  ];

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Rating Analytics" subtitle="Rating movement, distribution & forecast" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => (
          <Panel key={c.label} className="p-5" data-testid={`forecast-${c.label}`}>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-zinc-500">{c.label}</div>
            <div className={`mt-2 font-display text-3xl font-bold ${c.tone}`}>{c.val ?? "—"} <span className="text-lg">⭐</span></div>
          </Panel>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-xs text-amber-300 flex items-center gap-2">
        <TrendingUp size={14} /> Projections are statistical estimates based on recent review velocity & incoming ratings — not guaranteed outcomes. Confidence: <b>{f?.confidence || "—"}</b>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Rating Trend & Forecast" subtitle="Actual, moving average & projection" className="lg:col-span-2" testId="ra-chart-trend">
          <StatePanel loading={trend.isLoading} rows={2}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis domain={["dataMin - 0.15", "dataMax + 0.15"]} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="rating" name="rating" stroke={CHART.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="moving_avg" name="moving avg" stroke={CHART.gold} strokeWidth={1.5} dot={false} opacity={0.7} />
                <Line type="monotone" dataKey="forecast" name="forecast" stroke={CHART.violet} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </StatePanel>
        </ChartCard>

        <ChartCard title="Rating Distribution" subtitle="Last 90 days" testId="ra-chart-dist">
          <StatePanel loading={dist.isLoading} rows={2}>
            <div className="space-y-3 pt-2">
              {dist.data?.distribution?.map((d) => (
                <div key={d.stars} className="flex items-center gap-3">
                  <span className="w-10 text-xs text-zinc-400">{d.stars} ★</span>
                  <div className="h-2.5 flex-1 rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-16 text-right text-xs text-zinc-300">{d.count} · {d.pct}%</span>
                </div>
              ))}
            </div>
          </StatePanel>
        </ChartCard>
      </div>
    </div>
  );
}
