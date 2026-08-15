import React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { useScoped } from "@/lib/useScoped";
import { PageHeader, DemoBanner, ChartCard, StatePanel, Panel, ChartTooltip, CHART } from "@/components/common/ui";
import { fmtDate } from "@/lib/format";

export default function Sentiment() {
  const s = useScoped("sent", "/analytics/sentiment");
  const b = s.data?.breakdown;
  const series = (s.data?.trend || []).map((x) => ({ ...x, date: fmtDate(x.date) }));

  const pie = b
    ? [
        { name: "Positive", value: b.positive, color: CHART.emerald },
        { name: "Neutral", value: b.neutral, color: CHART.gold },
        { name: "Negative", value: b.negative, color: CHART.rose },
      ]
    : [];

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Sentiment Analysis" subtitle="Every review auto-classified · trend over time" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Sentiment Distribution" testId="sent-pie">
          <StatePanel loading={s.isLoading} rows={2}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={56} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                  {pie.map((p, i) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {pie.map((p) => (
                <div key={p.name} className="text-center">
                  <div className="font-display text-lg font-bold" style={{ color: p.color }}>{p.value}</div>
                  <div className="text-[11px] text-zinc-500">{p.name}</div>
                </div>
              ))}
            </div>
          </StatePanel>
        </ChartCard>

        <ChartCard title="Sentiment Trend" subtitle="% share over time" className="lg:col-span-2" testId="sent-trend">
          <StatePanel loading={s.isLoading} rows={2}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series} margin={{ left: -14, right: 8, top: 8 }} stackOffset="expand">
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={(v) => `${Math.round(v * 100)}%`} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip unit="%" />} />
                <Area type="monotone" dataKey="positive_pct" name="positive" stackId="1" stroke={CHART.emerald} fill={CHART.emerald} fillOpacity={0.25} />
                <Area type="monotone" dataKey="neutral_pct" name="neutral" stackId="1" stroke={CHART.gold} fill={CHART.gold} fillOpacity={0.2} />
                <Area type="monotone" dataKey="negative_pct" name="negative" stackId="1" stroke={CHART.rose} fill={CHART.rose} fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </StatePanel>
        </ChartCard>
      </div>
    </div>
  );
}
