import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel, StarRating, TrendPill } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Swords } from "lucide-react";
import { fmtNum } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Competitors() {
  const { appId, currentApp } = useScope();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canAdd = ["super_admin", "client_admin"].includes(user?.role) && appId !== "all";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", package_id: "", platform: "google_play" });

  const params = appId !== "all" ? { application_id: appId } : {};
  const q = useQuery({ queryKey: ["competitors", appId], queryFn: async () => (await api.get("/competitors", { params })).data });
  const comps = q.data?.competitors || [];

  const add = async () => {
    try {
      await api.post("/competitors", { ...form, application_id: appId });
      toast.success("Competitor added");
      setOpen(false);
      setForm({ name: "", package_id: "", platform: "google_play" });
      qc.invalidateQueries({ queryKey: ["competitors"] });
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Competitors" subtitle={currentApp ? `Tracking competitors for ${currentApp.name}` : "All tracked competitors"}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500" disabled={!canAdd} data-testid="add-competitor-btn"><Plus size={15} className="mr-1.5" /> Add Competitor</Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121214] border-white/10">
              <DialogHeader><DialogTitle>Add Competitor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-zinc-400">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="comp-name" /></div>
                <div><Label className="text-xs text-zinc-400">Package / App ID</Label><Input value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="comp-package" /></div>
                <Button onClick={add} className="w-full bg-blue-600 hover:bg-blue-500" data-testid="comp-submit">Add Competitor</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      {!canAdd && appId === "all" && (
        <p className="mb-4 text-xs text-zinc-500">Select a specific application in the top bar to add competitors.</p>
      )}

      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load competitors"} onRetry={q.refetch} empty={!q.isLoading && comps.length === 0} emptyText="No competitors tracked yet.">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {comps.map((c) => {
            const m = c.metrics || {};
            return (
              <Panel key={c.id} className="p-5 hover:border-white/[0.14]" data-testid={`competitor-${c.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.05]"><Swords size={16} className="text-amber-400" /></span>
                    <div>
                      <div className="font-medium text-zinc-100">{c.name}</div>
                      <div className="text-[11px] text-zinc-500">{c.platform === "app_store" ? "App Store" : "Google Play"}</div>
                    </div>
                  </div>
                  <StarRating value={c.current_rating} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Metric label="Reviews" val={fmtNum(c.review_count)} />
                  <Metric label="7D" val={fmtNum(m.reviews_7d)} />
                  <Metric label="30D" val={fmtNum(m.reviews_30d)} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Velocity <b className="text-zinc-300">{m.velocity}/day</b></span>
                  <TrendPill value={m.rating_trend || 0} />
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

function Metric({ label, val }) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-2">
      <div className="font-display font-bold text-zinc-100">{val}</div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
