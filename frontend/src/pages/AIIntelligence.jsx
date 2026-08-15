import React, { useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Loader2, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Why did our rating change this week?",
  "What is the biggest complaint this month?",
  "How many 1-star reviews are unanswered?",
  "Which topic is getting worse?",
  "Which competitor improved the most?",
];

export default function AIIntelligence() {
  const { appId } = useScope();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState([]);

  const ask = async (question) => {
    const text = question || q;
    if (!text.trim()) return;
    setBusy(true);
    setThread((t) => [...t, { role: "user", text }]);
    setQ("");
    try {
      const body = { question: text };
      if (appId !== "all") body.application_id = appId;
      const { data } = await api.post("/ai/search", body);
      setThread((t) => [...t, { role: "ai", text: data.answer, source: data.source }]);
    } catch (e) {
      toast.error(apiErr(e));
      setThread((t) => [...t, { role: "ai", text: "Sorry, I couldn't process that right now." }]);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="AI Intelligence" subtitle="Ask questions about your reputation data in natural language" />

      <Panel className="flex flex-col h-[calc(100vh-260px)] min-h-[420px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {thread.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-amber-500/20 mb-4"><Brain size={26} className="text-blue-400" /></span>
              <h3 className="font-display text-lg font-semibold text-zinc-100">Ask Equinox AI</h3>
              <p className="mt-1 text-sm text-zinc-400 max-w-sm">Answers are generated from your real review analytics.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} data-testid="ai-suggestion" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:border-blue-500/40 hover:text-blue-400 transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}
          {thread.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-blue-600 text-white" : "border border-white/10 bg-[#18181B] text-zinc-200"}`} data-testid={`msg-${m.role}`}>
                {m.role === "ai" && <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-amber-400"><Sparkles size={10} /> Equinox AI{m.source === "ai" ? " · GPT-5.4" : ""}</div>}
                {m.text}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 size={14} className="animate-spin" /> Analyzing your data…</div>}
        </div>
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask about ratings, reviews, sentiment, competitors…" className="bg-[#0A0A0B] border-white/10" data-testid="ai-input" />
            <Button onClick={() => ask()} disabled={busy} className="bg-blue-600 hover:bg-blue-500" data-testid="ai-ask"><Send size={15} /></Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
