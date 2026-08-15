import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiErr, getToken } from "@/lib/api";
import { PageHeader, StatePanel, StarRating, SentimentBadge, Segmented } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radio, Download, Star, ChevronLeft, ChevronRight, Info, Sparkles, RefreshCw, Play, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import GooglePlaySync from "@/components/integrations/GooglePlaySync";
import { timeAgo, fmtNum } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STAR_OPTS = [
  { value: "all", label: "All" },
  { value: "5", label: "5 ★" },
  { value: "4", label: "4 ★" },
  { value: "3", label: "3 ★" },
  { value: "2", label: "2 ★" },
  { value: "1", label: "1 ★" },
];

export default function LiveReviews() {
  const qc = useQueryClient();
  const [appId, setAppId] = useState("");
  const [star, setStar] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const appsQ = useQuery({ queryKey: ["applications"], queryFn: async () => (await api.get("/applications")).data.applications });
  const liveApps = useMemo(
    () => (appsQ.data || []).filter((a) => a.source === "google_play_live" || a.google_play_status === "connected"),
    [appsQ.data]
  );

  useEffect(() => {
    if (!appId && liveApps.length) setAppId(liveApps[0].id);
  }, [liveApps]);

  const baseParams = () => {
    const p = { application_id: appId };
    if (star !== "all") p.rating = Number(star);
    if (from) p.date_from = from;
    if (to) p.date_to = to;
    return p;
  };

  const summaryQ = useQuery({
    queryKey: ["live-summary", appId, star, from, to],
    queryFn: async () => (await api.get("/reviews/summary", { params: baseParams() })).data,
    enabled: !!appId,
  });

  const reviewsQ = useQuery({
    queryKey: ["live-reviews", appId, star, from, to, page],
    queryFn: async () => (await api.get("/reviews", { params: { ...baseParams(), page, page_size: 25, sort: "recent" } })).data,
    enabled: !!appId,
    keepPreviousData: true,
  });

  const reviews = reviewsQ.data?.reviews || [];
  const total = reviewsQ.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  const currentApp = liveApps.find((a) => a.id === appId);

  const resetPage = (fn) => (v) => { fn(v); setPage(1); };

  const exportSheet = async (fmt = "csv") => {
    if (!appId) return;
    setExporting(true);
    try {
      const res = await api.get("/reviews/export", { params: { ...baseParams(), format: fmt }, responseType: "blob" });
      const mime = fmt === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv";
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a = document.createElement("a");
      a.href = url;
      const label = `${currentApp?.name || "reviews"}${from ? `_${from}` : ""}${to ? `_to_${to}` : ""}${star !== "all" ? `_${star}star` : ""}`;
      a.download = `${label.replace(/\s+/g, "_")}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${res.headers["x-total-rows"] || total} reviews to ${fmt === "xlsx" ? "Excel" : "CSV"} sheet`);
    } catch (e) { toast.error(apiErr(e)); } finally { setExporting(false); }
  };

  const glassBtn = <Button className="glass-btn text-emerald-300 hover:text-emerald-200 bg-emerald-500/10" data-testid="gplay-sync-btn"><Play size={14} className="mr-1.5" /> Sync a Google Play App</Button>;

  return (
    <div>
      {/* Glassmorphic hero */}
      <div className="glass-card relative mb-6 overflow-hidden rounded-2xl p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.14),transparent_55%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400">
              <Radio size={16} className="animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Live · Google Play</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Live Reviews</h1>
            <p className="mt-1 text-sm text-zinc-400 max-w-xl">
              Real reviews & ratings pulled directly from Google Play's public data. Filter by date and star rating, then export a clean sheet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GooglePlaySync trigger={glassBtn} />
          </div>
        </div>
      </div>

      {liveApps.length === 0 ? (
        <StatePanel loading={appsQ.isLoading} empty={!appsQ.isLoading} emptyText="No live apps synced yet. Use “Sync a Google Play App” above to fetch real reviews for any app by URL or name." />
      ) : (
        <>
          {/* Controls */}
          <div className="glass-card mb-5 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <Label className="text-xs text-zinc-400">Application</Label>
                <Select value={appId} onValueChange={resetPage(setAppId)}>
                  <SelectTrigger className="mt-1 glass-btn h-9 text-sm" data-testid="live-app-selector"><SelectValue /></SelectTrigger>
                  <SelectContent>{liveApps.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs text-zinc-400">From date</Label>
                <Input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} className="mt-1 glass-btn h-9 text-xs" data-testid="live-from" />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs text-zinc-400">To date</Label>
                <Input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} className="mt-1 glass-btn h-9 text-xs" data-testid="live-to" />
              </div>
              <div className="md:col-span-3 flex gap-2">
                <Button variant="ghost" size="sm" className="glass-btn h-9 text-zinc-300" onClick={() => { setFrom(""); setTo(""); setStar("all"); setPage(1); }} data-testid="live-reset"><RefreshCw size={13} className="mr-1.5" /> Reset</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="glass-btn h-9 flex-1 text-emerald-300 bg-emerald-500/10 hover:text-emerald-200" disabled={exporting || !total} data-testid="live-export">
                      <Download size={14} className="mr-1.5" /> {exporting ? "Exporting…" : "Download Sheet"} <ChevronDown size={13} className="ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => exportSheet("xlsx")} data-testid="live-export-xlsx">
                      <FileSpreadsheet size={14} className="mr-2 text-emerald-400" /> Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportSheet("csv")} data-testid="live-export-csv">
                      <FileText size={14} className="mr-2 text-blue-400" /> CSV (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="mt-3">
              <Label className="text-xs text-zinc-400">Star rating</Label>
              <div className="mt-1"><Segmented testId="live-star" value={star} onChange={resetPage(setStar)} options={STAR_OPTS} /></div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <SummaryCard label="Reviews (filtered)" value={fmtNum(summaryQ.data?.total || 0)} />
            <SummaryCard label="Average Rating" value={<span className="flex items-center gap-1 text-amber-400">{summaryQ.data?.avg_rating ?? "—"} <Star size={16} className="fill-amber-400" /></span>} />
            <SummaryCard label="Positive" value={<span className="text-emerald-400">{summaryQ.data ? Math.round((summaryQ.data.sentiment.positive / (summaryQ.data.total || 1)) * 100) : 0}%</span>} />
            <SummaryCard label="Negative" value={<span className="text-rose-400">{summaryQ.data ? Math.round((summaryQ.data.sentiment.negative / (summaryQ.data.total || 1)) * 100) : 0}%</span>} />
          </div>

          {/* Distribution bar */}
          {summaryQ.data && (
            <div className="glass-card mb-5 rounded-xl p-4">
              <div className="flex flex-wrap gap-4">
                {summaryQ.data.distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2 text-xs">
                    <span className="w-9 text-zinc-400">{d.stars} ★</span>
                    <div className="h-2 w-28 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${d.pct}%` }} /></div>
                    <span className="text-zinc-300">{d.count} · {d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sheet-style table */}
          <div className="glass-card overflow-hidden rounded-xl">
            <div className="hidden md:grid grid-cols-12 gap-2 border-b border-white/[0.08] px-4 py-3 text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-500">
              <div className="col-span-1">Rating</div>
              <div className="col-span-4">Review</div>
              <div className="col-span-2">Reviewer</div>
              <div className="col-span-2">Sentiment / Topic</div>
              <div className="col-span-1">Version</div>
              <div className="col-span-2 text-right">Date</div>
            </div>
            <StatePanel loading={reviewsQ.isLoading} error={reviewsQ.isError && "Failed to load reviews"} onRetry={reviewsQ.refetch} empty={!reviewsQ.isLoading && reviews.length === 0} emptyText="No reviews match these filters.">
              {reviews.map((r) => (
                <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 border-b border-white/[0.05] px-4 py-3.5 hover:bg-white/[0.02]" data-testid={`live-row-${r.id}`}>
                  <div className="md:col-span-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"} />)}
                  </div>
                  <div className="md:col-span-4 text-sm text-zinc-200">{r.text}</div>
                  <div className="md:col-span-2 text-xs text-zinc-400">{r.reviewer_name}<div className="text-[11px] text-zinc-600">{r.country}</div></div>
                  <div className="md:col-span-2 flex flex-wrap items-center gap-1.5"><SentimentBadge sentiment={r.sentiment} /><span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">{r.topic}</span></div>
                  <div className="md:col-span-1 text-xs text-zinc-400">v{r.app_version}</div>
                  <div className="md:col-span-2 text-right text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}<div className="text-[11px] text-zinc-600">{timeAgo(r.created_at)}</div></div>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-zinc-500">{total} reviews · page {page} of {pages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="glass-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="live-prev"><ChevronLeft size={14} /></Button>
                  <Button variant="secondary" size="sm" className="glass-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} data-testid="live-next"><ChevronRight size={14} /></Button>
                </div>
              </div>
            </StatePanel>
          </div>

          {/* Documentation */}
          <div className="glass-card mt-5 rounded-xl p-5" data-testid="live-docs">
            <div className="flex items-center gap-2 mb-3"><Info size={15} className="text-blue-400" /><h3 className="font-display text-sm font-semibold text-zinc-100">About this data & the exported sheet</h3></div>
            <ul className="space-y-1.5 text-xs text-zinc-400 leading-relaxed">
              <li>• <b className="text-zinc-300">Source:</b> live public data from the Google Play Store (no API key). Reviews are deduplicated by Google Play review ID on every sync.</li>
              <li>• <b className="text-zinc-300">Filters:</b> the star buttons and From/To dates apply to both the on-screen table and the exported sheet.</li>
              <li>• <b className="text-zinc-300">Sheet columns:</b> Review ID, Date (UTC), Rating, Sentiment, Topic, Reviewer, Country, App Version, Language, Review Text, Reply Status, Published Reply, Reply Date, Platform, Source.</li>
              <li>• <b className="text-zinc-300">Sentiment & Topic</b> are auto-classified (5–4★ positive, 3★ neutral, 2–1★ negative; topics via keyword matching). Ratings & text are exactly as posted on the store.</li>
              <li>• <b className="text-zinc-300">Coverage:</b> Google Play exposes the most-recent reviews per storefront — full historical archives aren't publicly available. Re-sync periodically to keep data current.</li>
              <li>• Download as <b className="text-zinc-300">Excel (.xlsx)</b> — with a styled, filterable header row — or as <b className="text-zinc-300">CSV</b>. Both open directly in Excel or Google Sheets.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-zinc-500">{label}</div>
      <div className="mt-2 font-display text-2xl font-bold text-zinc-50">{value}</div>
    </div>
  );
}
