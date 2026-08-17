import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import { Star, MessageSquare, Gauge, SmilePlus, Reply, TrendingUp, Sparkles, ArrowRight, Mail } from "lucide-react";
import api from "@/lib/api";
import { useScope } from "@/context/AppScope";
import {
  PageHeader, DemoBanner, Kpi, TrendPill, ChartCard, StatePanel, Panel, Segmented, StarRating, CHART,
} from "@/components/common/ui";
import { fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useScoped } from "@/lib/useScoped";

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#18181B] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-medium text-zinc-300">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-zinc-400">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-medium text-zinc-100">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { appId, currentApp } = useScope();
  const [volMetric, setVolMetric] = useState("total");

  const dash = useScoped("dash", "/analytics/dashboard");
  const trend = useScoped("trend", "/analytics/rating-trend");
  const vol = useScoped("vol", "/analytics/review-volume");
  const dist = useScoped("dist", "/analytics/rating-distribution", { days: 90 });
  const summary = useScoped("exec", "/ai/executive-summary");

  const k = dash.data?.kpis;
  const f = dash.data?.forecast;

  // Build trend data with forecast continuation
  let trendData = [];
  if (trend.data?.series) {
    trendData = trend.data.series.map((s) => ({
      date: fmtDate(s.date), rating: s.rating, moving_avg: s.moving_avg, reviews: s.reviews, avg_incoming: s.avg_incoming,
    }));
    if (trend.data.forecast?.length && trendData.length) {
      trendData[trendData.length - 1].forecast = trendData[trendData.length - 1].rating;
      trend.data.forecast.slice(1).forEach((p) => trendData.push({ date: fmtDate(p.date), forecast: p.forecast }));
    }
  }

  const sentData = k
    ? [
        { name: "Positive", value: k.sentiment.positive, color: CHART.emerald },
        { name: "Neutral", value: k.sentiment.neutral, color: CHART.gold },
        { name: "Negative", value: k.sentiment.negative, color: CHART.rose },
      ]
    : [];

  return (
    <div>
      <DemoBanner />
      <PageHeader
        title="Dashboard"
        subtitle={currentApp ? `${currentApp.name} · reputation overview` : "Portfolio reputation overview"}
        actions={
          <span className="text-xs text-zinc-500">
            Data refreshed {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        }
      />

      {/* Client Services Inquiry Banner */}
      <div className="mb-6 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-950/40 via-[#121218] to-[#0D0D11] p-4 shadow-lg backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Mail size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400">Services & Inquiries</span>
              <span className="h-1 w-1 rounded-full bg-blue-400/50" />
              <span className="text-[11px] text-zinc-400">Dedicated Support</span>
            </div>
            <div className="mt-0.5 text-sm font-medium text-zinc-200">
              For Query Regarding Services{" "}
              <a
                href="mailto:info@equinox4review.in"
                className="font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
              >
                info@equinox4review.in
              </a>
            </div>
          </div>
        </div>
        <a
          href="mailto:info@equinox4review.in"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] hover:bg-blue-500 hover:shadow-[0_0_22px_rgba(59,130,246,0.55)] transition-all shrink-0"
        >
          <Mail size={14} />
          <span>info@equinox4review.in</span>
        </a>
      </div>

      {/* KPI ROW */}
      <StatePanel loading={dash.isLoading} error={dash.isError && "Could not load dashboard"} onRetry={dash.refetch} rows={2}>
        {k && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Kpi label="Current Rating" accent="gold" icon={Star} testId="kpi-rating"
              value={<StarRating value={k.current_rating} size={20} />}
              sub={<TrendPill value={k.rating_change} />} />
            <Kpi label="Reviews" accent="blue" icon={MessageSquare} testId="kpi-reviews"
              value={k.reviews_today}
              sub={<span className="text-zinc-500">Today · <b className="text-zinc-300">{k.reviews_7d}</b> 7d · <b className="text-zinc-300">{k.reviews_30d}</b> 30d</span>} />
            <Kpi label="Review Velocity" accent="blue" icon={Gauge} testId="kpi-velocity"
              value={<span>{k.velocity}<span className="text-base text-zinc-500">/day</span></span>}
              sub={<TrendPill value={k.velocity_change} suffix="/day" />} />
            <Kpi label="Sentiment" accent="emerald" icon={SmilePlus} testId="kpi-sentiment"
              value={<span className="text-emerald-400">{k.sentiment.positive_pct}%</span>}
              sub={<span className="text-zinc-500">Pos · <span className="text-zinc-300">{k.sentiment.neutral_pct}%</span> Neu · <span className="text-rose-400">{k.sentiment.negative_pct}%</span> Neg</span>} />
            <Kpi label="Reply Coverage" accent="blue" icon={Reply} testId="kpi-coverage"
              value={`${k.reply_coverage}%`}
              sub={<span className="text-zinc-500"><b className="text-zinc-300">{k.replied}</b> replied · {k.unreplied} open · {k.ai_replies} AI</span>} />
            <Kpi label="Rating Projection" accent="gold" icon={TrendingUp} testId="kpi-projection"
              value={<span className="text-amber-400">{f?.p30 ?? "—"} ⭐</span>}
              sub={<span className="text-zinc-500">30d est · <span className="text-zinc-300">{f?.p7} 7d</span> · {f?.confidence}</span>} />
          </div>
        )}
      </StatePanel>

      {/* AI EXECUTIVE SUMMARY */}
      <div className="mt-6">
        <Panel className="relative overflow-hidden p-6" data-testid="ai-summary">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),transparent_55%)]" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="font-display text-base font-semibold text-zinc-100">AI Reputation Summary</h3>
                {summary.data?.source === "ai" && (
                  <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">GPT-5.4</span>
                )}
              </div>
              <Button variant="ghost" size="sm" className="text-blue-400" onClick={() => navigate("/ai-insights")} data-testid="view-insights">
                AI Insights <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
            <StatePanel loading={summary.isLoading} rows={2}>
              {summary.data && (
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2.5">
                    {summary.data.insights?.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-300" data-testid={`insight-${i}`}>
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ins.level === "positive" ? "bg-emerald-400" : ins.level === "negative" ? "bg-rose-400" : "bg-amber-400"}`} />
                        {ins.text}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-blue-400">Recommended Action</div>
                    <p className="mt-2 text-sm text-zinc-200">{summary.data.recommended_action}</p>
                  </div>
                </div>
              )}
            </StatePanel>
          </div>
        </Panel>
      </div>

      {/* CHARTS GRID */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Rating Trend" subtitle="Actual, 7-day moving average & forecast" className="lg:col-span-2" testId="chart-rating-trend">
          <StatePanel loading={trend.isLoading} rows={2}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ left: -10, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis domain={["dataMin - 0.15", "dataMax + 0.15"]} tickLine={false} axisLine={false} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="rating" name="rating" stroke={CHART.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="moving_avg" name="moving avg" stroke={CHART.gold} strokeWidth={1.5} strokeDasharray="1 0" dot={false} opacity={0.7} />
                <Line type="monotone" dataKey="forecast" name="forecast" stroke={CHART.violet} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </StatePanel>
        </ChartCard>

        <ChartCard title="Rating Distribution" subtitle="Last 90 days" testId="chart-distribution">
          <StatePanel loading={dist.isLoading} rows={2}>
            <div className="space-y-3 pt-2">
              {dist.data?.distribution?.map((d) => (
                <div key={d.stars} className="flex items-center gap-3" data-testid={`dist-${d.stars}`}>
                  <span className="w-10 text-xs text-zinc-400">{d.stars} ★</span>
                  <div className="h-2.5 flex-1 rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${d.pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-medium text-zinc-300">{d.pct}%</span>
                </div>
              ))}
              <div className="pt-2 text-xs text-zinc-500">{dist.data?.total} reviews analyzed</div>
            </div>
          </StatePanel>
        </ChartCard>

        <ChartCard title="Review Volume" subtitle="Reviews received per day" className="lg:col-span-2" testId="chart-volume"
          right={<Segmented testId="vol-metric" value={volMetric} onChange={setVolMetric}
            options={[{ value: "total", label: "All" }, { value: "positive", label: "Pos" }, { value: "negative", label: "Neg" }, { value: "neutral", label: "Neu" }]} />}>
          <StatePanel loading={vol.isLoading} rows={2}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={(vol.data?.series || []).map((s) => ({ ...s, date: fmtDate(s.date) }))} margin={{ left: -14, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey={volMetric} name={volMetric} radius={[3, 3, 0, 0]}
                  fill={volMetric === "negative" ? CHART.rose : volMetric === "positive" ? CHART.emerald : volMetric === "neutral" ? CHART.gold : CHART.blue} />
              </BarChart>
            </ResponsiveContainer>
          </StatePanel>
        </ChartCard>

        <ChartCard title="Sentiment Mix" subtitle="Selected period" testId="chart-sentiment">
          <StatePanel loading={dash.isLoading} rows={2}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sentData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                  {sentData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 text-xs">
              {sentData.map((s) => (
                <span key={s.name} className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.name}
                </span>
              ))}
            </div>
          </StatePanel>
        </ChartCard>
      </div>
    </div>
  );
}
