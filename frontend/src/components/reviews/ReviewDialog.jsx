import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Sparkles, Loader2, Send, Wand2, Minimize2, HeartHandshake, Briefcase, Languages } from "lucide-react";
import { SentimentBadge } from "@/components/common/ui";
import { PLATFORM_LABEL, timeAgo } from "@/lib/format";
import api, { apiErr } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const MODES = ["Professional", "Friendly", "Empathetic", "Short", "Formal", "Casual", "Hinglish"];

export default function ReviewDialog({ review, open, onOpenChange, onUpdated }) {
  const { user } = useAuth();
  const canPublish = ["super_admin", "client_admin"].includes(user?.role);
  const [mode, setMode] = useState("Professional");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (review) {
      setDraft(review.published_reply || review.ai_reply || "");
      setSrc(null);
    }
  }, [review]);

  if (!review) return null;

  const generate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/ai/generate-reply", { review_id: review.id, mode });
      setDraft(data.reply);
      setSrc(data.source);
      if (data.source === "fallback") toast.warning(data.error || "Showing a fallback reply");
      else toast.success("AI reply generated");
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const refine = async (action) => {
    if (!draft) return toast.error("Generate or write a reply first");
    setBusy(true);
    try {
      const { data } = await api.post("/ai/refine-reply", { review_id: review.id, current_reply: draft, action });
      setDraft(data.reply);
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!draft) return toast.error("Nothing to publish");
    setBusy(true);
    try {
      await api.post("/ai/publish-reply", { review_id: review.id, reply_text: draft });
      toast.success("Reply published");
      onUpdated?.();
      onOpenChange(false);
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#121214] border-white/10 p-0 overflow-hidden" data-testid="review-dialog">
        <DialogTitle className="sr-only">Review detail and AI reply</DialogTitle>
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className={i < review.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"} />
              ))}
              <SentimentBadge sentiment={review.sentiment} />
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400">{review.topic}</span>
            </div>
            <span className="text-xs text-zinc-500">{PLATFORM_LABEL[review.platform]}</span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-200">"{review.text}"</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
            <span>{review.reviewer_name}</span>
            <span>· {review.country}</span>
            <span>· v{review.app_version}</span>
            <span>· {review.language?.toUpperCase()}</span>
            <span>· {timeAgo(review.created_at)}</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400" />
              <span className="text-sm font-medium text-zinc-200">AI Reply</span>
              {src === "ai" && <span className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400">GPT-5.4</span>}
            </div>
            <div className="flex items-center gap-2">
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-8 w-[130px] bg-[#18181B] border-white/10 text-xs" data-testid="reply-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={generate} disabled={busy} className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20" data-testid="generate-reply-btn">
                {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Sparkles size={14} className="mr-1.5" />}
                Generate
              </Button>
            </div>
          </div>

          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Click Generate for an AI reply, or write your own…"
            className="min-h-[130px] bg-[#0A0A0B] border-white/10 text-sm"
            data-testid="reply-textarea"
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => refine("shorten")} disabled={busy} className="text-xs"><Minimize2 size={13} className="mr-1" /> Shorten</Button>
            <Button variant="secondary" size="sm" onClick={() => refine("more_empathetic")} disabled={busy} className="text-xs"><HeartHandshake size={13} className="mr-1" /> Empathetic</Button>
            <Button variant="secondary" size="sm" onClick={() => refine("more_professional")} disabled={busy} className="text-xs"><Briefcase size={13} className="mr-1" /> Professional</Button>
            <Button variant="secondary" size="sm" onClick={() => refine("translate")} disabled={busy} className="text-xs"><Languages size={13} className="mr-1" /> Translate</Button>
            <Button variant="secondary" size="sm" onClick={generate} disabled={busy} className="text-xs"><Wand2 size={13} className="mr-1" /> Regenerate</Button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-zinc-500">
              {review.reply_status === "published" ? "Reply published " + timeAgo(review.reply_at) : "Draft — not yet published"}
            </span>
            {canPublish ? (
              <Button onClick={publish} disabled={busy} className="bg-blue-600 hover:bg-blue-500" data-testid="publish-reply-btn">
                <Send size={14} className="mr-1.5" /> {review.reply_status === "published" ? "Update Reply" : "Approve & Publish"}
              </Button>
            ) : (
              <span className="text-xs text-zinc-500">Publishing requires admin role</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
