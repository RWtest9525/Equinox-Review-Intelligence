import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel, StarRating } from "@/components/common/ui";
import { Info } from "lucide-react";
import { fmtNum } from "@/lib/format";

export default function CompetitorReviews() {
  const { appId } = useScope();
  const params = appId !== "all" ? { application_id: appId } : {};
  const q = useQuery({ queryKey: ["competitors", appId], queryFn: async () => (await api.get("/competitors", { params })).data });
  const comps = q.data?.competitors || [];

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Competitor Reviews" subtitle="Aggregate review signals across competitors" />
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2.5 text-xs text-blue-300">
        <Info size={14} /> Individual competitor reviews are ingested once store integrations are connected. Aggregate metrics below are computed from tracked snapshots.
      </div>
      <StatePanel loading={q.isLoading} empty={!q.isLoading && comps.length === 0} emptyText="No competitors tracked.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {comps.map((c) => {
            const m = c.metrics || {};
            return (
              <Panel key={c.id} className="p-5" data-testid={`comp-rev-${c.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-zinc-100">{c.name}</span>
                  <StarRating value={c.current_rating} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><div className="font-display font-bold text-emerald-400">{m.star5_pct || 0}%</div><div className="text-zinc-500">5★</div></div>
                  <div><div className="font-display font-bold text-rose-400">{m.star1_pct || 0}%</div><div className="text-zinc-500">1★</div></div>
                  <div><div className="font-display font-bold text-zinc-200">{fmtNum(m.reviews_30d)}</div><div className="text-zinc-500">30D</div></div>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="bg-emerald-400" style={{ width: `${m.positive_pct || 0}%` }} />
                  <div className="bg-rose-400" style={{ width: `${m.negative_pct || 0}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">{m.positive_pct}% positive · {m.negative_pct}% negative</div>
              </Panel>
            );
          })}
        </div>
      </StatePanel>
    </div>
  );
}
