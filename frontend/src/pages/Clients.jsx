import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { PageHeader, DemoBanner, Panel, StatePanel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_name: "", contact_email: "", plan: "growth" });

  const q = useQuery({ queryKey: ["clients"], queryFn: async () => (await api.get("/clients")).data.clients });
  const clients = q.data || [];

  const create = async () => {
    try {
      await api.post("/clients", form);
      toast.success("Client created");
      setOpen(false);
      setForm({ company_name: "", contact_name: "", contact_email: "", plan: "growth" });
      qc.invalidateQueries({ queryKey: ["clients"] });
    } catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Clients" subtitle="Manage client organizations"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-500" data-testid="add-client-btn"><Plus size={15} className="mr-1.5" /> Create Client</Button></DialogTrigger>
            <DialogContent className="bg-[#121214] border-white/10">
              <DialogHeader><DialogTitle>Create Client</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-zinc-400">Company name</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="client-company" /></div>
                <div><Label className="text-xs text-zinc-400">Contact name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="client-contact" /></div>
                <div><Label className="text-xs text-zinc-400">Contact email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="client-email" /></div>
                <p className="text-[11px] text-zinc-500">A client-admin account is created with default password <b>Client@2026</b>.</p>
                <Button onClick={create} className="w-full bg-blue-600 hover:bg-blue-500" data-testid="client-submit">Create Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load"} onRetry={q.refetch} empty={!q.isLoading && clients.length === 0}>
        <Panel className="overflow-hidden">
          <div className="grid grid-cols-12 gap-2 border-b border-white/[0.06] px-5 py-3 text-[10px] uppercase tracking-[0.15em] font-bold text-zinc-500">
            <div className="col-span-4">Company</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2">Plan</div>
            <div className="col-span-1 text-right">Apps</div>
            <div className="col-span-1 text-right">Users</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          {clients.map((c) => (
            <div key={c.id} className="grid grid-cols-12 items-center gap-2 border-b border-white/[0.04] px-5 py-3.5" data-testid={`client-${c.id}`}>
              <div className="col-span-4 flex items-center gap-2 text-sm font-medium text-zinc-200"><Building2 size={15} className="text-blue-400" /> {c.name}</div>
              <div className="col-span-3 text-sm text-zinc-400 truncate">{c.contact_email || "—"}</div>
              <div className="col-span-2"><span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] capitalize text-blue-400">{c.plan}</span></div>
              <div className="col-span-1 text-right text-sm text-zinc-300">{c.app_count}</div>
              <div className="col-span-1 text-right text-sm text-zinc-300">{c.user_count}</div>
              <div className="col-span-1 text-right"><span className="rounded bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-400 capitalize">{c.status}</span></div>
            </div>
          ))}
        </Panel>
      </StatePanel>
    </div>
  );
}
