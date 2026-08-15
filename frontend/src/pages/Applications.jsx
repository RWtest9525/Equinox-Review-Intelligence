import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { PageHeader, DemoBanner, Panel, StatePanel, StarRating } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { fmtNum, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Applications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canAdd = ["super_admin", "client_admin"].includes(user?.role);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", package_id: "", category: "Finance", platform: "both", country: "India" });

  const q = useQuery({ queryKey: ["applications-page"], queryFn: async () => (await api.get("/applications")).data.applications });
  const apps = q.data || [];

  const create = async () => {
    try {
      await api.post("/applications", form);
      toast.success("Application created");
      setOpen(false);
      setForm({ name: "", package_id: "", category: "Finance", platform: "both", country: "India" });
      qc.invalidateQueries({ queryKey: ["applications-page"] });
      qc.invalidateQueries({ queryKey: ["applications"] });
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Applications" subtitle="Manage your monitored apps"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-500" disabled={!canAdd} data-testid="add-app-btn"><Plus size={15} className="mr-1.5" /> Add Application</Button></DialogTrigger>
            <DialogContent className="bg-[#121214] border-white/10">
              <DialogHeader><DialogTitle>Add Application</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-zinc-400">App name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="app-name" /></div>
                <div><Label className="text-xs text-zinc-400">Package ID</Label><Input value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} placeholder="com.example.app" className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="app-package" /></div>
                <div><Label className="text-xs text-zinc-400">Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" /></div>
                <Button onClick={create} className="w-full bg-blue-600 hover:bg-blue-500" data-testid="app-submit">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load"} onRetry={q.refetch} empty={!q.isLoading && apps.length === 0}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apps.map((a) => (
            <Panel key={a.id} className="p-5 hover:border-white/[0.14]" data-testid={`app-card-${a.id}`}>
              <div className="flex items-center gap-3 mb-4">
                {a.logo ? <img src={a.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <div className="h-11 w-11 rounded-xl bg-white/[0.06]" />}
                <div className="min-w-0">
                  <div className="font-medium text-zinc-100 truncate">{a.name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">{a.package_id || "—"}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <StarRating value={a.current_rating || 0} />
                <span className="text-zinc-400">{fmtNum(a.review_count)} reviews</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="rounded bg-white/[0.05] px-2 py-0.5 text-zinc-400">{a.category}</span>
                <span className={`rounded px-2 py-0.5 ${a.sync_status === "demo" ? "bg-amber-400/10 text-amber-400" : "bg-zinc-400/10 text-zinc-400"}`}>
                  {a.sync_status === "demo" ? "Demo Data" : "Not Connected"}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-zinc-500">Last sync {timeAgo(a.last_sync)}</div>
            </Panel>
          ))}
        </div>
      </StatePanel>
    </div>
  );
}
