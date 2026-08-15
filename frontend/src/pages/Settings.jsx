import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Panel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Palette, User } from "lucide-react";
import { ROLE_LABEL } from "@/lib/format";
import { toast } from "sonner";

export default function Settings() {
  const { applications } = useScope();
  const { user, org } = useAuth();
  const [selApp, setSelApp] = useState("");
  const [bv, setBv] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selApp && applications.length) setSelApp(applications[0].id);
  }, [applications]);

  const { isLoading } = useQuery({
    queryKey: ["brand-voice", selApp],
    queryFn: async () => {
      const d = (await api.get(`/brand-voice/${selApp}`)).data.brand_voice;
      setBv(d || { personality: "", tone: "", words_to_use: [], words_to_avoid: [], support_email: "", support_url: "", guidelines: "" });
      return d;
    },
    enabled: !!selApp,
  });

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/brand-voice", {
        application_id: selApp,
        personality: bv.personality,
        tone: bv.tone,
        words_to_use: typeof bv.words_to_use === "string" ? bv.words_to_use.split(",").map((s) => s.trim()) : bv.words_to_use,
        words_to_avoid: typeof bv.words_to_avoid === "string" ? bv.words_to_avoid.split(",").map((s) => s.trim()) : bv.words_to_avoid,
        support_email: bv.support_email,
        support_url: bv.support_url,
        guidelines: bv.guidelines,
      });
      toast.success("Brand voice saved");
    } catch (e) { toast.error(apiErr(e)); } finally { setSaving(false); }
  };

  const upd = (k, v) => setBv((b) => ({ ...b, [k]: v }));

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile & AI brand voice configuration" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="p-6">
          <div className="flex items-center gap-2 mb-4"><User size={16} className="text-blue-400" /><h3 className="font-display font-semibold text-zinc-100">Profile</h3></div>
          <div className="space-y-3 text-sm">
            <Row label="Name" value={user?.name} />
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={ROLE_LABEL[user?.role]} />
            <Row label="Organization" value={org?.name} />
            <Row label="Plan" value={org?.plan} cap />
          </div>
        </Panel>

        <Panel className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Palette size={16} className="text-amber-400" /><h3 className="font-display font-semibold text-zinc-100">AI Brand Voice</h3></div>
            <Select value={selApp} onValueChange={setSelApp}>
              <SelectTrigger className="h-9 w-[180px] bg-[#0A0A0B] border-white/10 text-xs" data-testid="bv-app"><SelectValue placeholder="Select app" /></SelectTrigger>
              <SelectContent>{applications.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {isLoading || !bv ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-8"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <div className="space-y-4">
              <div><Label className="text-xs text-zinc-400">Brand personality</Label><Input value={bv.personality || ""} onChange={(e) => upd("personality", e.target.value)} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="bv-personality" /></div>
              <div><Label className="text-xs text-zinc-400">Preferred tone</Label><Input value={bv.tone || ""} onChange={(e) => upd("tone", e.target.value)} className="mt-1 bg-[#0A0A0B] border-white/10" data-testid="bv-tone" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-zinc-400">Words to use (comma-sep)</Label><Input value={Array.isArray(bv.words_to_use) ? bv.words_to_use.join(", ") : bv.words_to_use || ""} onChange={(e) => upd("words_to_use", e.target.value)} className="mt-1 bg-[#0A0A0B] border-white/10" /></div>
                <div><Label className="text-xs text-zinc-400">Words to avoid</Label><Input value={Array.isArray(bv.words_to_avoid) ? bv.words_to_avoid.join(", ") : bv.words_to_avoid || ""} onChange={(e) => upd("words_to_avoid", e.target.value)} className="mt-1 bg-[#0A0A0B] border-white/10" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-zinc-400">Support email</Label><Input value={bv.support_email || ""} onChange={(e) => upd("support_email", e.target.value)} className="mt-1 bg-[#0A0A0B] border-white/10" /></div>
                <div><Label className="text-xs text-zinc-400">Support URL</Label><Input value={bv.support_url || ""} onChange={(e) => upd("support_url", e.target.value)} className="mt-1 bg-[#0A0A0B] border-white/10" /></div>
              </div>
              <div><Label className="text-xs text-zinc-400">Response guidelines</Label><Textarea value={bv.guidelines || ""} onChange={(e) => upd("guidelines", e.target.value)} className="mt-1 min-h-[80px] bg-[#0A0A0B] border-white/10" data-testid="bv-guidelines" /></div>
              <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-500" data-testid="bv-save">
                {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />} Save Brand Voice
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, cap }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-zinc-200 ${cap ? "capitalize" : ""}`}>{value || "—"}</span>
    </div>
  );
}
