import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel, SentimentBadge } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Sparkles, Loader2, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const MODES = ["Professional", "Friendly", "Empathetic", "Short", "Formal", "Casual", "Hinglish"];

export default function AIReplyCenter() {
  const { appId, platform } = useScope();
  const { user } = useAuth();
  const canPublish = ["super_admin", "client_admin"].includes(user?.role);
  const [selected, setSelected] = useState({});
  const [mode, setMode] = useState("Professional");
  const [queue, setQueue] = useState([]); // {review_id, review_text, rating, reply}
  const [busy, setBusy] = useState(false);

  const params = { quick_filter: "unreplied", page_size: 30, sort: "rating_asc" };
  if (appId !== "all") params.application_id = appId;
  if (platform !== "all") params.platform = platform;
  const q = useQuery({ queryKey: ["reply-center", params], queryFn: async () => (await api.get("/reviews", { params })).data });
  const reviews = q.data?.reviews || [];
  const ids = Object.keys(selected).filter((k) => selected[k]);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectAll = () => {
    const all = {}; reviews.forEach((r) => (all[r.id] = true)); setSelected(all);
  };

  const generate = async () => {
    if (!ids.length) return toast.error("Select reviews first");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/bulk-reply", { review_ids: ids, mode });
      setQueue(data.results);
      toast.success(`Generated ${data.results.length} AI replies — review before publishing`);
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const publishOne = async (item) => {
    try {
      await api.post("/ai/publish-reply", { review_id: item.review_id, reply_text: item.reply });
      setQueue((qu) => qu.filter((x) => x.review_id !== item.review_id));
      toast.success("Published");
      q.refetch();
    } catch (e) { toast.error(apiErr(e)); }
  };

  const publishAll = async () => {
    for (const item of queue) await publishOne(item);
  };

  const editQueue = (id, val) => setQueue((qu) => qu.map((x) => (x.review_id === id ? { ...x, reply: val } : x)));

  return (
    <div>
      <DemoBanner />
      <PageHeader title="AI Reply Center" subtitle="Bulk-generate replies, then review & approve before publishing" />

      <Panel className="p-4 mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-300">{ids.length} selected</span>
        <Button variant="secondary" size="sm" onClick={selectAll} data-testid="select-all">Select all</Button>
        <Button variant="secondary" size="sm" onClick={() => setSelected({})}>Clear</Button>
        <div className="ml-auto flex items-center gap-2">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-9 w-[140px] bg-[#0A0A0B] border-white/10 text-xs" data-testid="bulk-mode"><SelectValue /></SelectTrigger>
            <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={generate} disabled={busy || !ids.length} className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20" data-testid="bulk-generate">
            {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Sparkles size={14} className="mr-1.5" />} Generate {ids.length || ""} Replies
          </Button>
        </div>
      </Panel>

      {queue.length > 0 && (
        <Panel className="p-5 mb-5" data-testid="reply-queue">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Bot size={16} className="text-blue-400" /><h3 className="font-display font-semibold text-zinc-100">Reply Queue ({queue.length})</h3></div>
            {canPublish && <Button onClick={publishAll} size="sm" className="bg-blue-600 hover:bg-blue-500" data-testid="approve-all"><Send size={13} className="mr-1.5" /> Approve & Publish All</Button>}
          </div>
          <div className="space-y-4">
            {queue.map((item) => (
              <div key={item.review_id} className="rounded-lg border border-white/[0.06] bg-[#0A0A0B] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
                  <span className="flex">{Array.from({ length: item.rating }).map((_, i) => <Star key={i} size={11} className="fill-amber-400 text-amber-400" />)}</span>
                  <span className="truncate">{item.review_text}</span>
                </div>
                <Textarea value={item.reply} onChange={(e) => editQueue(item.review_id, e.target.value)} className="min-h-[70px] bg-[#121214] border-white/10 text-sm" />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setQueue((qu) => qu.filter((x) => x.review_id !== item.review_id))}>Reject</Button>
                  {canPublish && <Button size="sm" className="bg-blue-600 hover:bg-blue-500" onClick={() => publishOne(item)} data-testid={`publish-${item.review_id}`}>Publish</Button>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <StatePanel loading={q.isLoading} empty={!q.isLoading && reviews.length === 0} emptyText="No unreplied reviews — great job!">
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#121214] p-4">
              <Checkbox checked={!!selected[r.id]} onCheckedChange={() => toggle(r.id)} data-testid={`select-${r.id}`} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} className={i < r.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"} />)}</span>
                  <SentimentBadge sentiment={r.sentiment} />
                  <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-400">{r.topic}</span>
                </div>
                <p className="truncate text-sm text-zinc-200">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </StatePanel>
    </div>
  );
}
