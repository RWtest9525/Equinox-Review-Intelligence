import React from "react";
import { Star, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const CHART = {
  blue: "#3b82f6",
  gold: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  grid: "rgba(255,255,255,0.06)",
};

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.07] bg-[#121214] transition-colors duration-200",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function ChartCard({ title, subtitle, right, children, className, testId }) {
  return (
    <Panel className={cn("p-5", className)} data-testid={testId}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-zinc-200">{title}</h3>
          {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </Panel>
  );
}

export function StarRating({ value, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      <span className="font-display font-semibold text-zinc-100">{Number(value).toFixed(2)}</span>
    </span>
  );
}

export function TrendPill({ value, suffix = "", invert = false }) {
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        good ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"
      )}
    >
      <Icon size={12} />
      {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

const SENT = {
  positive: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  neutral: "bg-zinc-400/10 text-zinc-300 border-zinc-400/20",
  negative: "bg-rose-400/10 text-rose-400 border-rose-400/20",
};
export function SentimentBadge({ sentiment }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize", SENT[sentiment] || SENT.neutral)}>
      {sentiment}
    </span>
  );
}

export function Kpi({ label, value, sub, accent = "blue", icon: Icon, children, testId }) {
  const glow = {
    blue: "from-blue-500/10",
    gold: "from-amber-500/10",
    emerald: "from-emerald-500/10",
    rose: "from-rose-500/10",
  }[accent];
  return (
    <Panel className="relative overflow-hidden p-5 hover:border-white/[0.14]" data-testid={testId}>
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none", glow)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-zinc-500">{label}</span>
          {Icon && <Icon size={16} className="text-zinc-500" />}
        </div>
        <div className="mt-3 font-display text-3xl font-bold text-zinc-50">{value}</div>
        {sub && <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">{sub}</div>}
        {children}
      </div>
    </Panel>
  );
}

export function StatePanel({ loading, error, empty, onRetry, children, rows = 3, emptyText = "No data yet." }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Panel className="p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 text-rose-400" size={28} />
        <p className="text-sm text-zinc-300">{typeof error === "string" ? error : "Failed to load data."}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry} data-testid="retry-btn">
            <RefreshCw size={14} className="mr-2" /> Retry
          </Button>
        )}
      </Panel>
    );
  }
  if (empty) {
    return (
      <Panel className="p-10 text-center">
        <Inbox className="mx-auto mb-3 text-zinc-600" size={28} />
        <p className="text-sm text-zinc-400">{emptyText}</p>
      </Panel>
    );
  }
  return children;
}

export function DemoBanner() {
  return (
    <div
      className="mb-5 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.07] px-4 py-2.5 text-xs text-amber-300"
      data-testid="demo-banner"
    >
      <AlertTriangle size={14} />
      <span>
        <b className="font-semibold">Demo Data</b> — Connect your Google Play / App Store integrations to view live data.
      </span>
    </div>
  );
}

export function Segmented({ options, value, onChange, testId }) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.07] bg-[#121214] p-0.5" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          data-testid={`${testId}-${o.value}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
            value === o.value ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#18181B] px-3 py-2 text-xs shadow-xl">
      {label && <div className="mb-1 font-medium text-zinc-300">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-zinc-400">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-medium text-zinc-100">{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}


