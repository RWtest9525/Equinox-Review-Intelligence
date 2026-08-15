import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, DemoBanner, Panel, StatePanel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Check } from "lucide-react";
import { timeAgo } from "@/lib/format";

export default function Notifications() {
  const qc = useQueryClient();
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: async () => (await api.get("/alerts")).data.alerts });
  const notes = useQuery({ queryKey: ["notifications"], queryFn: async () => (await api.get("/notifications")).data.notifications });

  const dismiss = async (id) => { await api.post(`/alerts/${id}/dismiss`); qc.invalidateQueries({ queryKey: ["alerts"] }); };
  const read = async (id) => { await api.post(`/notifications/${id}/read`); qc.invalidateQueries({ queryKey: ["notifications"] }); };

  const SEV = { high: "border-rose-500/30 bg-rose-500/[0.06]", medium: "border-amber-500/30 bg-amber-500/[0.06]", low: "border-white/10" };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Notifications" subtitle="Alerts & activity" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-display text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-rose-400" /> Active Alerts</h3>
          <StatePanel loading={alerts.isLoading} empty={!alerts.isLoading && (alerts.data || []).filter((a) => a.status === "active").length === 0} emptyText="No active alerts.">
            <div className="space-y-3">
              {(alerts.data || []).filter((a) => a.status === "active").map((a) => (
                <Panel key={a.id} className={`p-4 border ${SEV[a.severity] || SEV.low}`} data-testid={`alert-${a.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{a.title}</div>
                      <p className="mt-1 text-sm text-zinc-300">{a.message}</p>
                      {a.cause && <p className="mt-1 text-xs text-zinc-500">Cause: {a.cause}</p>}
                      <div className="mt-1 text-[11px] text-zinc-600">{timeAgo(a.created_at)}</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => dismiss(a.id)} data-testid={`dismiss-${a.id}`}><Check size={13} /></Button>
                  </div>
                </Panel>
              ))}
            </div>
          </StatePanel>
        </div>

        <div>
          <h3 className="font-display text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2"><Bell size={15} className="text-blue-400" /> Notifications</h3>
          <StatePanel loading={notes.isLoading} empty={!notes.isLoading && (notes.data || []).length === 0} emptyText="No notifications.">
            <div className="space-y-3">
              {(notes.data || []).map((n) => (
                <Panel key={n.id} className={`p-4 ${n.read ? "opacity-60" : ""}`} data-testid={`note-${n.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-100">{n.title}</div>
                      <p className="mt-1 text-sm text-zinc-300">{n.message}</p>
                      <div className="mt-1 text-[11px] text-zinc-600">{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.read && <Button variant="secondary" size="sm" onClick={() => read(n.id)}>Mark read</Button>}
                  </div>
                </Panel>
              ))}
            </div>
          </StatePanel>
        </div>
      </div>
    </div>
  );
}
