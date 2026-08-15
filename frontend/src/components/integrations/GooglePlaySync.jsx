import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { apiErr } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Download, CheckCircle2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COUNTRIES = [["us", "United States"], ["in", "India"], ["gb", "United Kingdom"], ["ca", "Canada"], ["au", "Australia"], ["de", "Germany"]];

export default function GooglePlaySync({ trigger }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("us");
  const [since, setSince] = useState("");
  const [maxCount, setMaxCount] = useState(100);
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => { setMatches([]); setSelected(null); setResult(null); };

  const resolve = async () => {
    if (!query.trim()) return toast.error("Enter an app URL or name");
    setResolving(true); reset();
    try {
      const { data } = await api.post("/gplay/resolve", { query, country });
      setMatches(data.matches);
      if (data.matches.length === 1) setSelected(data.matches[0]);
    } catch (e) { toast.error(apiErr(e)); } finally { setResolving(false); }
  };

  const sync = async () => {
    const pkg = selected?.app_id;
    if (!pkg) return toast.error("Select an app first");
    setSyncing(true); setResult(null);
    try {
      const body = { package_id: pkg, country, max_count: Number(maxCount) };
      if (since) body.since_date = since;
      const { data } = await api.post("/gplay/sync", body);
      setResult(data);
      toast.success(`Imported ${data.imported} live reviews`);
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["applications-page"] });
      qc.invalidateQueries({ queryKey: ["integrations"] });
    } catch (e) { toast.error(apiErr(e)); } finally { setSyncing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuery(""); reset(); } }}>
      <DialogTrigger asChild>{trigger || <Button className="bg-emerald-600 hover:bg-emerald-500" data-testid="gplay-sync-btn"><Play size={14} className="mr-1.5" /> Live Sync (Google Play)</Button>}</DialogTrigger>
      <DialogContent className="max-w-lg bg-[#121214] border-white/10" data-testid="gplay-dialog">
        <DialogHeader>
          <DialogTitle>Fetch Live Google Play Reviews</DialogTitle>
          <DialogDescription>Import real reviews & ratings from Google Play by app URL or name, filtered by date.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-zinc-400">App URL or name</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && resolve()}
                placeholder="e.g. https://play.google.com/…?id=com.spotify.music or “Spotify”"
                className="bg-[#0A0A0B] border-white/10 text-sm"
                data-testid="gplay-query"
              />
              <Button variant="secondary" onClick={resolve} disabled={resolving} data-testid="gplay-resolve">
                {resolving ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-zinc-400">Store</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="mt-1 h-9 bg-[#0A0A0B] border-white/10 text-xs" data-testid="gplay-country"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-zinc-400">From date</Label>
              <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="mt-1 h-9 bg-[#0A0A0B] border-white/10 text-xs" data-testid="gplay-since" />
            </div>
            <div>
              <Label className="text-xs text-zinc-400">Max reviews</Label>
              <Input type="number" min={10} max={600} value={maxCount} onChange={(e) => setMaxCount(e.target.value)} className="mt-1 h-9 bg-[#0A0A0B] border-white/10 text-xs" data-testid="gplay-max" />
            </div>
          </div>

          {matches.length > 0 && (
            <div className="max-h-52 space-y-1.5 overflow-y-auto" data-testid="gplay-matches">
              {matches.map((m) => (
                <button
                  key={m.app_id}
                  onClick={() => setSelected(m)}
                  data-testid={`gplay-match-${m.app_id}`}
                  className={cn("flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                    selected?.app_id === m.app_id ? "border-emerald-500/40 bg-emerald-500/[0.08]" : "border-white/[0.06] hover:border-white/20")}
                >
                  {m.icon ? <img src={m.icon} alt="" className="h-9 w-9 rounded-lg" /> : <div className="h-9 w-9 rounded-lg bg-white/[0.06]" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-zinc-100">{m.title}</div>
                    <div className="truncate text-[11px] text-zinc-500">{m.developer || m.app_id} · ★ {m.score}</div>
                  </div>
                  {selected?.app_id === m.app_id && <CheckCircle2 size={16} className="text-emerald-400" />}
                </button>
              ))}
            </div>
          )}

          {result ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm" data-testid="gplay-result">
              <div className="flex items-center gap-2 text-emerald-400 font-medium"><CheckCircle2 size={16} /> Sync complete</div>
              <div className="mt-2 text-zinc-300">
                <b>{result.application?.name}</b> — imported <b>{result.imported}</b> new reviews
                {result.skipped_duplicates > 0 && ` (${result.skipped_duplicates} duplicates skipped)`} of {result.fetched} fetched.
              </div>
              <div className="mt-1 text-xs text-zinc-500">Select this app in the top bar to view its live dashboard.</div>
            </div>
          ) : (
            <Button onClick={sync} disabled={syncing || !selected} className="w-full bg-emerald-600 hover:bg-emerald-500" data-testid="gplay-run-sync">
              {syncing ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
              {syncing ? "Fetching live reviews…" : selected ? `Sync “${selected.title}”` : "Select an app to sync"}
            </Button>
          )}

          <p className="text-[11px] text-zinc-500">
            Reviews & ratings are fetched live from Google Play's public data (no API key). Posting public replies still requires the official Google Play Developer API.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
