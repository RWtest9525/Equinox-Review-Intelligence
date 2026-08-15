import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { PageHeader, DemoBanner, Panel, StatePanel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { ROLE_LABEL, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export default function Team() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "client_member" });

  const q = useQuery({ queryKey: ["team"], queryFn: async () => (await api.get("/team")).data.members });
  const members = q.data || [];

  const invite = async () => {
    try {
      await api.post("/team", form);
      toast.success("Member invited");
      setOpen(false);
      setForm({ name: "", email: "", role: "client_member" });
      qc.invalidateQueries({ queryKey: ["team"] });
    } catch (e) { toast.error(apiErr(e)); }
  };

  const ROLE_COLOR = { super_admin: "text-amber-400 bg-amber-400/10", client_admin: "text-blue-400 bg-blue-400/10", client_member: "text-zinc-300 bg-zinc-400/10" };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Team" subtitle="Manage team members & roles"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-500" data-testid="invite-btn"><Plus size={15} className="mr-1.5" /> Invite Member</Button></DialogTrigger>
            <DialogContent className="bg-[#121214] border-white/10">
              <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-zinc-400">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="member-name" /></div>
                <div><Label className="text-xs text-zinc-400">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="member-email" /></div>
                <div>
                  <Label className="text-xs text-zinc-400">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="member-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_admin">Client Admin</SelectItem>
                      <SelectItem value="client_member">Client Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-zinc-500">Default password: <b>Member@2026</b></p>
                <Button onClick={invite} className="w-full bg-blue-600 hover:bg-blue-500" data-testid="member-submit">Send Invite</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load"} onRetry={q.refetch} empty={!q.isLoading && members.length === 0}>
        <Panel className="overflow-hidden">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-b border-white/[0.04] px-5 py-3.5" data-testid={`member-${m.id}`}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-bold text-black">
                {(m.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-100">{m.name}</div>
                <div className="text-xs text-zinc-500">{m.email}</div>
              </div>
              <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${ROLE_COLOR[m.role]}`}>{ROLE_LABEL[m.role]}</span>
              <span className="hidden sm:block text-xs text-zinc-500 w-24 text-right">{timeAgo(m.created_at)}</span>
            </div>
          ))}
        </Panel>
      </StatePanel>
    </div>
  );
}
