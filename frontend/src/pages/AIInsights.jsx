import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel } from "@/components/common/ui";
import { AlertTriangle, TrendingUp, Sparkles } from "lucide-react";

export default function AIInsights() {
  const { appId } = useScope();
  const params = appId !== "all" ? { application_id: appId, days: 7 } : { days: 7 };
  const q = useQuery({
    queryKey: ["ai-insights", appId],
    queryFn: async () => (await api.get("/ai/insights", { params })).data,
  });
  const issues = q.data?.emerging_issues || [];

  const IMPACT = { High: "text-rose-400 bg-rose-400/10 border-rose-400/20", Medium: "text-amber-400 bg-amber-400/10 border-amber-400/20" };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="AI Insights" subtitle="Emerging issues detected from review data (last 7 days)" />

      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load insights"} onRetry={q.refetch}
        empty={!q.isLoading && issues.length === 0} emptyText="No emerging issues detected — reputation is stable.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((it, i) => (
            <Panel key={i} className="relative overflow-hidden p-5" data-testid={`emerging-${i}`}>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(244,63,94,0.08),transparent_55%)]" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-400" />
                    <span className="font-display font-semibold text-zinc-100">{it.topic}</span>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${IMPACT[it.impact] || IMPACT.Medium}`}>
                    {it.impact} impact
                  </span>
                </div>
                <div className="flex gap-6 mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Mentions</div>
                    <div className="mt-1 flex items-center gap-1 font-display text-xl font-bold text-rose-400">
                      <TrendingUp size={16} /> +{it.mentions_change}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Negative</div>
                    <div className="mt-1 font-display text-xl font-bold text-zinc-200">{it.negative_pct}%</div>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.06] p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-bold text-blue-400">
                    <Sparkles size={11} /> Recommended action
                  </div>
                  <p className="mt-1 text-sm text-zinc-200">{it.recommended_action}</p>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </StatePanel>
    </div>
  );
}
