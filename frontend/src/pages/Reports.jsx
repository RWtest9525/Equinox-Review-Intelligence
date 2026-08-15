import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, Plus } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function Reports({ scheduled = false }) {
  const { applications } = useScope();
  const { user } = useAuth();
  const qc = useQueryClient();
  const canGen = ["super_admin", "client_admin"].includes(user?.role);
  const [selApp, setSelApp] = useState("");
  const [type, setType] = useState(scheduled ? "weekly" : "weekly");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!selApp && applications.length) setSelApp(applications[0].id); }, [applications]);

  const q = useQuery({ queryKey: ["reports"], queryFn: async () => (await api.get("/reports")).data.reports });
  const reports = q.data || [];

  const generate = async () => {
    if (!selApp) return toast.error("Select an application");
    setBusy(true);
    try {
      await api.post("/reports", { application_id: selApp, report_type: type });
      toast.success("Report generated");
      qc.invalidateQueries({ queryKey: ["reports"] });
    } catch (e) { toast.error(apiErr(e)); } finally { setBusy(false); }
  };

  const download = (r) => {
    const rows = [["Metric", "Value"]];
    const k = r.data?.kpis || {};
    rows.push(["Current Rating", k.current_rating], ["Rating Change", k.rating_change], ["Reviews 30d", k.reviews_30d],
      ["Velocity/day", k.velocity], ["Positive %", k.sentiment?.positive_pct], ["Negative %", k.sentiment?.negative_pct],
      ["Reply Coverage %", k.reply_coverage], ["Unreplied", k.unreplied]);
    (r.data?.topics || []).forEach((t) => rows.push([`Topic: ${t.topic}`, `${t.count} reviews, ${t.negative_pct}% neg`]));
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${r.title.replace(/\s+/g, "_")}.csv`;
    a.click();
  };

  return (
    <div>
      <DemoBanner />
      <PageHeader title={scheduled ? "Scheduled Reports" : "Reports"} subtitle={scheduled ? "Automate recurring reputation reports" : "Generate & export reputation reports"} />

      <Panel className="p-4 mb-5 flex flex-wrap items-center gap-3">
        <Select value={selApp} onValueChange={setSelApp}>
          <SelectTrigger className="h-9 w-[200px] bg-[#0A0A0B] border-white/10 text-sm" data-testid="report-app"><SelectValue placeholder="Application" /></SelectTrigger>
          <SelectContent>{applications.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-[140px] bg-[#0A0A0B] border-white/10 text-sm" data-testid="report-type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={busy || !canGen} className="bg-blue-600 hover:bg-blue-500" data-testid="generate-report">
          {busy ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Plus size={14} className="mr-1.5" />}
          {scheduled ? "Schedule & Generate" : "Generate Report"}
        </Button>
        {scheduled && <span className="text-xs text-zinc-500">Recurring delivery runs via background jobs once store integrations are connected.</span>}
      </Panel>

      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load"} onRetry={q.refetch} empty={!q.isLoading && reports.length === 0} emptyText="No reports generated yet.">
        <div className="space-y-2">
          {reports.map((r) => (
            <Panel key={r.id} className="p-4 flex items-center gap-3" data-testid={`report-${r.id}`}>
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10"><FileText size={18} className="text-blue-400" /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-100">{r.title}</div>
                <div className="text-xs text-zinc-500 capitalize">{r.report_type} · {timeAgo(r.created_at)} · Rating {r.data?.kpis?.current_rating}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => download(r)} data-testid={`download-${r.id}`}><Download size={13} className="mr-1.5" /> CSV</Button>
            </Panel>
          ))}
        </div>
      </StatePanel>
    </div>
  );
}
