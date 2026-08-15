import React from "react";
import { useQuery } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { useScope } from "@/context/AppScope";
import { PageHeader, DemoBanner, Panel, StatePanel } from "@/components/common/ui";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle, Radio } from "lucide-react";
import { PLATFORM_LABEL, timeAgo } from "@/lib/format";
import { toast } from "sonner";

export default function Integrations() {
  const { applications } = useScope();
  const q = useQuery({ queryKey: ["integrations"], queryFn: async () => (await api.get("/integrations")).data.integrations });
  const integ = q.data || [];
  const appName = (id) => applications.find((a) => a.id === id)?.name || "Application";

  const sync = async (id) => {
    try {
      await api.post(`/integrations/${id}/sync`);
      toast.success("Sync started");
    } catch (e) {
      toast.error(apiErr(e)); // shows "connection not configured" — real error handling
    }
  };

  return (
    <div>
      <DemoBanner />
      <PageHeader title="Integrations" subtitle="Connect Google Play & App Store data sources" />

      <Panel className="mb-5 p-4 flex items-center gap-3 text-sm text-zinc-400">
        <Radio size={16} className="text-emerald-400" />
        <span>Looking to pull real reviews? Head to <b className="text-zinc-200">Live Data → Live Reviews</b> to fetch live Google Play reviews by app URL or name.</span>
      </Panel>
      <StatePanel loading={q.isLoading} error={q.isError && "Failed to load"} onRetry={q.refetch} empty={!q.isLoading && integ.length === 0}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integ.map((it) => (
            <Panel key={it.id} className="p-5" data-testid={`integration-${it.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-zinc-100">{appName(it.application_id)}</div>
                  <div className="text-xs text-zinc-500">{PLATFORM_LABEL[it.platform]}</div>
                </div>
                {it.connected ? (
                  <span className="flex items-center gap-1 rounded-md bg-emerald-400/10 px-2 py-1 text-xs text-emerald-400"><CheckCircle2 size={13} /> Connected</span>
                ) : (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-1 text-xs text-amber-400"><XCircle size={13} /> Not Connected</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mb-4">
                {it.connected ? `Last sync ${timeAgo(it.last_sync)}` : "Add developer API credentials to enable live review sync. Currently serving demo data."}
              </p>
              <Button variant="secondary" size="sm" onClick={() => sync(it.id)} data-testid={`sync-${it.id}`}>
                <RefreshCw size={13} className="mr-1.5" /> Sync Now
              </Button>
            </Panel>
          ))}
        </div>
      </StatePanel>
    </div>
  );
}
