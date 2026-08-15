import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Star, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import api from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, SentimentBadge, StatePanel } from "@/components/common/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_LABEL, timeAgo } from "@/lib/format";
import ReviewDialog from "@/components/reviews/ReviewDialog";
import { cn } from "@/lib/utils";

const QUICK = [
  { id: "all", label: "All" },
  { id: "unreplied", label: "Unreplied" },
  { id: "1_star", label: "1 Star" },
  { id: "2_star", label: "2 Star" },
  { id: "negative", label: "Negative" },
  { id: "ai_ready", label: "AI Ready" },
  { id: "high_priority", label: "High Priority" },
];

export default function Reviews() {
  const { appId, platform } = useScope();
  const qc = useQueryClient();
  const [quick, setQuick] = useState("all");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ rating: "", sentiment: "", topic: "", country: "", language: "", reply_status: "" });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const opts = useQuery({ queryKey: ["review-filters"], queryFn: async () => (await api.get("/reviews/filters")).data });

  const params = { page, page_size: 20, sort: "recent" };
  if (appId !== "all") params.application_id = appId;
  if (platform !== "all") params.platform = platform;
  if (quick !== "all") params.quick_filter = quick;
  if (search) params.search = search;
  Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });

  const q = useQuery({
    queryKey: ["reviews", params],
    queryFn: async () => (await api.get("/reviews", { params })).data,
    keepPreviousData: true,
  });

  const reviews = q.data?.reviews || [];
  const total = q.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v === "any" ? "" : v })); setPage(1); };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Reviews" subtitle={`Unified inbox · ${total} reviews`} />

      {/* Search + quick filters */}
      <Panel className="p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search reviews, reviewers, topics…"
              className="pl-9 bg-[#0A0A0B] border-white/10"
              data-testid="review-search"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((qf) => (
            <button
              key={qf.id}
              onClick={() => { setQuick(qf.id); setPage(1); }}
              data-testid={`quick-${qf.id}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                quick === qf.id ? "border-blue-500/40 bg-blue-500/15 text-blue-400" : "border-white/10 text-zinc-400 hover:text-zinc-200"
              )}
            >
              {qf.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <FilterSelect label="Rating" value={filters.rating} onChange={(v) => setF("rating", v)} options={[["5", "5 ★"], ["4", "4 ★"], ["3", "3 ★"], ["2", "2 ★"], ["1", "1 ★"]]} testId="filter-rating" />
          <FilterSelect label="Sentiment" value={filters.sentiment} onChange={(v) => setF("sentiment", v)} options={[["positive", "Positive"], ["neutral", "Neutral"], ["negative", "Negative"]]} testId="filter-sentiment" />
          <FilterSelect label="Topic" value={filters.topic} onChange={(v) => setF("topic", v)} options={(opts.data?.topics || []).map((t) => [t, t])} testId="filter-topic" />
          <FilterSelect label="Country" value={filters.country} onChange={(v) => setF("country", v)} options={(opts.data?.countries || []).map((t) => [t, t])} testId="filter-country" />
          <FilterSelect label="Language" value={filters.language} onChange={(v) => setF("language", v)} options={(opts.data?.languages || []).map((t) => [t, t.toUpperCase()])} testId="filter-language" />
          <FilterSelect label="Reply Status" value={filters.reply_status} onChange={(v) => setF("reply_status", v)} options={[["unreplied", "Unreplied"], ["published", "Replied"]]} testId="filter-reply" />
        </div>
      </Panel>

      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load reviews"} onRetry={q.refetch} empty={!q.isLoading && reviews.length === 0} emptyText="No reviews match these filters.">
        <div className="space-y-2">
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              data-testid={`review-row-${r.id}`}
              className="group w-full text-left rounded-xl border border-white/[0.06] bg-[#121214] p-4 transition-colors hover:border-white/[0.14]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"} />
                      ))}
                    </span>
                    <SentimentBadge sentiment={r.sentiment} />
                    <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">{r.topic}</span>
                    {r.priority === "high" && <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-400">High</span>}
                  </div>
                  <p className="truncate text-sm text-zinc-200">{r.text}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-zinc-500">
                    <span>{r.reviewer_name}</span>
                    <span>{PLATFORM_LABEL[r.platform]}</span>
                    <span>{r.country}</span>
                    <span>{timeAgo(r.created_at)}</span>
                  </div>
                </div>
                <span className={cn("shrink-0 rounded-md px-2 py-1 text-[11px] font-medium",
                  r.reply_status === "published" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400")}>
                  {r.reply_status === "published" ? "Replied" : "Unreplied"}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="prev-page"><ChevronLeft size={14} /></Button>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} data-testid="next-page"><ChevronRight size={14} /></Button>
          </div>
        </div>
      </StatePanel>

      <ReviewDialog
        review={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["reviews"] })}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, testId }) {
  return (
    <Select value={value || "any"} onValueChange={onChange}>
      <SelectTrigger className="h-9 bg-[#0A0A0B] border-white/10 text-xs" data-testid={testId}>
        <SelectValue placeholder={label}>{value ? (options.find((o) => o[0] === value)?.[1] || value) : label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="any">{label}: Any</SelectItem>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
