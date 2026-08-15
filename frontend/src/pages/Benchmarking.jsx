import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import api from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel, ChartCard, ChartTooltip, CHART } from "@/components/common/ui";
import { Trophy, Zap, TrendingDown, Sparkles } from "lucide-react";
import { fmtNum } from "@/lib/format";

export default function Benchmarking() {
  const { appId, currentApp } = useScope();

  const cmp = useQuery({
    queryKey: ["comparison", appId],
    queryFn: async () => (await api.get("/competitors/comparison", { params: { application_id: appId } })).data,
    enabled: appId !== "all",
  });
  const ins = useQuery({
    queryKey: ["comp-insights", appId],
    queryFn: async () => (await api.get("/competitors/insights", { params: { application_id: appId } })).data,
    enabled: appId !== "all",
  });

  if (appId === "all") {
    return (
      <div>
        <DemoBanner />
        <PageHeader title="Benchmarking" subtitle="Compare your app against tracked competitors" />
        <Panel className="p-10 text-center text-sm text-zinc-400">Select a specific application in the top bar to view benchmarking.</Panel>
      </div>
    );
  }

  const rows = cmp.data?.rows || [];
  const highlights = cmp.data?.highlights || {};
  const ratingData = rows.map((r) => ({ name: r.name, rating: r.rating, you: r.is_you }));
  const velData = rows.map((r) => ({ name: r.name, velocity: r.velocity || 0, you: r.is_you }));

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Benchmarking" subtitle={`${currentApp?.name} vs competitors`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Highlight icon={Trophy} tone="text-amber-400" label="Best Rating" value={highlights.best_rating} />
        <Highlight icon={Zap} tone="text-blue-400" label="Highest Velocity" value={highlights.highest_velocity} />
        <Highlight icon={TrendingDown} tone="text-rose-400" label="Most Negative" value={highlights.most_negative} />
      </div>

      <StatePanel loading={cmp.isLoading} error={cmp.isError && "Failed to load comparison"} onRetry={cmp.refetch}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Rating Comparison" testId="bench-rating">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ratingData} margin={{ left: -14, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                  {ratingData.map((d, i) => <Cell key={i} fill={d.you ? CHART.blue : "#3f3f46"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Review Velocity (per day)" testId="bench-velocity">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={velData} margin={{ left: -14, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="velocity" radius={[4, 4, 0, 0]}>
                  {velData.map((d, i) => <Cell key={i} fill={d.you ? CHART.gold : "#3f3f46"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <Panel className="overflow-hidden mb-6">
          <div className="grid grid-cols-12 gap-2 border-b border-white/[0.06] px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-bold text-zinc-500">
            <div className="col-span-3">App</div>
            <div className="col-span-2 text-right">Rating</div>
            <div className="col-span-2 text-right">Reviews</div>
            <div className="col-span-2 text-right">30D</div>
            <div className="col-span-3 text-right">Sentiment</div>
          </div>
          {rows.map((r) => (
            <div key={r.name} className={`grid grid-cols-12 items-center gap-2 border-b border-white/[0.04] px-5 py-3 ${r.is_you ? "bg-blue-500/[0.06]" : ""}`}>
              <div className="col-span-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
                {r.name} {r.is_you && <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-400">You</span>}
              </div>
              <div className="col-span-2 text-right text-sm text-amber-400 font-medium">{r.rating}</div>
              <div className="col-span-2 text-right text-sm text-zinc-300">{fmtNum(r.review_count)}</div>
              <div className="col-span-2 text-right text-sm text-zinc-300">{fmtNum(r.reviews_30d)}</div>
              <div className="col-span-3 text-right text-sm text-zinc-400">{r.positive_pct}% pos</div>
            </div>
          ))}
        </Panel>
      </StatePanel>

      <Panel className="relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.08),transparent_55%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4"><Sparkles size={16} className="text-amber-400" /><h3 className="font-display font-semibold text-zinc-100">Competitor AI Insights</h3></div>
          <StatePanel loading={ins.isLoading} rows={2}>
            <ul className="space-y-2.5">
              {(ins.data?.insights || []).map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300" data-testid={`comp-insight-${i}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" /> {t}
                </li>
              ))}
            </ul>
          </StatePanel>
        </div>
      </Panel>
    </div>
  );
}

function Highlight({ icon: Icon, tone, label, value }) {
  return (
    <Panel className="p-4 flex items-center gap-3">
      <span className={`grid h-10 w-10 place-items-center rounded-lg bg-white/[0.05] ${tone}`}><Icon size={18} /></span>
      <div>
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">{label}</div>
        <div className="font-display font-bold text-zinc-100">{value || "—"}</div>
      </div>
    </Panel>
  );
}
