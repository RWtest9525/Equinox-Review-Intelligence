import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Star, SmilePlus, Tags, Sparkles,
  Swords, MessagesSquare, BarChart3, Bot, Brain, FileText, CalendarClock,
  AppWindow, Building2, Users, Plug, Bell, Settings, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const SECTIONS = [
  {
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard", end: true, id: "dashboard" }],
  },
  {
    label: "Reputation",
    items: [
      { to: "/reviews", icon: MessageSquare, label: "Reviews", id: "reviews" },
      { to: "/rating-analytics", icon: Star, label: "Rating Analytics", id: "rating-analytics" },
      { to: "/sentiment", icon: SmilePlus, label: "Sentiment", id: "sentiment" },
      { to: "/topics", icon: Tags, label: "Topics", id: "topics" },
      { to: "/ai-insights", icon: Sparkles, label: "AI Insights", id: "ai-insights" },
    ],
  },
  {
    label: "Competition",
    items: [
      { to: "/competitors", icon: Swords, label: "Competitors", id: "competitors" },
      { to: "/competitor-reviews", icon: MessagesSquare, label: "Competitor Reviews", id: "competitor-reviews" },
      { to: "/benchmarking", icon: BarChart3, label: "Benchmarking", id: "benchmarking" },
    ],
  },
  {
    label: "AI",
    items: [
      { to: "/ai-reply", icon: Bot, label: "AI Reply Center", id: "ai-reply" },
      { to: "/ai-intelligence", icon: Brain, label: "AI Intelligence", id: "ai-intelligence" },
    ],
  },
  {
    label: "Reports",
    items: [
      { to: "/reports", icon: FileText, label: "Reports", id: "reports" },
      { to: "/scheduled-reports", icon: CalendarClock, label: "Scheduled Reports", id: "scheduled-reports" },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/applications", icon: AppWindow, label: "Applications", id: "applications" },
      { to: "/clients", icon: Building2, label: "Clients", id: "clients", roles: ["super_admin"] },
      { to: "/team", icon: Users, label: "Team", id: "team", roles: ["super_admin", "client_admin"] },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/integrations", icon: Plug, label: "Integrations", id: "integrations" },
      { to: "/notifications", icon: Bell, label: "Notifications", id: "notifications" },
      { to: "/settings", icon: Settings, label: "Settings", id: "settings" },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div className="flex h-full flex-col bg-[#0A0A0B]">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/[0.06]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_18px_rgba(59,130,246,0.35)]">
          <span className="font-display text-sm font-extrabold text-white">E</span>
        </div>
        <div className="leading-tight">
          <div className="font-display text-sm font-bold tracking-tight text-zinc-50">Equinox</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Reputation AI</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((sec) => {
          const items = sec.items.filter((it) => !it.roles || it.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={sec.label}>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                {sec.label}
              </div>
              <div className="space-y-0.5">
                {items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={onNavigate}
                    data-testid={`nav-${it.id}`}
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                        isActive
                          ? "bg-blue-500/[0.12] text-blue-400"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                      )
                    }
                  >
                    <it.icon size={17} strokeWidth={1.8} />
                    {it.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-3 flex items-center gap-2 text-[11px] text-zinc-500">
        <ShieldCheck size={13} className="text-emerald-500" />
        Equinox Zyvena Pvt Ltd
      </div>
    </div>
  );
}
