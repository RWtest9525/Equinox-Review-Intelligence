import React from "react";
import { useScoped } from "@/lib/useScoped";
import { PageHeader, DemoBanner, Panel, StatePanel, TrendPill } from "@/components/common/ui";

export default function Topics() {
  const t = useScoped("topics", "/analytics/topics");
  const topics = t.data?.topics || [];

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Topics" subtitle="AI-classified topics across reviews" />
      <StatePanel loading={t.isLoading} error={t.isError && "Failed to load topics"} onRetry={t.refetch} empty={!t.isLoading && topics.length === 0}>
        <Panel className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/[0.06] px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-bold text-zinc-500">
            <div className="col-span-5">Topic</div>
            <div className="col-span-2 text-right">Reviews</div>
            <div className="col-span-3">Sentiment</div>
            <div className="col-span-2 text-right">Trend</div>
          </div>
          {topics.map((tp) => (
            <div key={tp.topic} className="grid grid-cols-12 items-center gap-2 border-b border-white/[0.04] px-5 py-3.5 hover:bg-white/[0.02]" data-testid={`topic-${tp.topic}`}>
              <div className="col-span-5 text-sm font-medium text-zinc-200">{tp.topic}</div>
              <div className="col-span-2 text-right text-sm text-zinc-300">{tp.count}</div>
              <div className="col-span-3">
                <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="bg-emerald-400" style={{ width: `${tp.positive_pct}%` }} />
                  <div className="bg-rose-400" style={{ width: `${tp.negative_pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">{tp.negative_pct}% negative</div>
              </div>
              <div className="col-span-2 flex justify-end">
                <TrendPill value={tp.trend} suffix="%" invert={tp.negative_pct > 50} />
              </div>
            </div>
          ))}
        </Panel>
      </StatePanel>
    </div>
  );
}
