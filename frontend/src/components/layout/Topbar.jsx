import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, ChevronDown, LogOut, Smartphone } from "lucide-react";
import { useScope } from "@/context/AppScope";
import { useAuth } from "@/context/AuthContext";
import { PLATFORM_LABEL, ROLE_LABEL } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Segmented } from "@/components/common/ui";
import GlobalSearch from "@/components/layout/GlobalSearch";

export default function Topbar({ onMenu }) {
  const { applications, appId, setAppId, platform, setPlatform, days, setDays } = useScope();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] px-4 sm:px-6">
      <button
        className="lg:hidden text-zinc-400 hover:text-zinc-100"
        onClick={onMenu}
        data-testid="mobile-menu-btn"
      >
        <Menu size={20} />
      </button>

      {/* Application selector */}
      <Select value={appId} onValueChange={setAppId}>
        <SelectTrigger className="w-[190px] h-9 bg-[#121214] border-white/[0.08] text-sm" data-testid="app-selector">
          <div className="flex items-center gap-2 truncate">
            <Smartphone size={14} className="text-blue-400 shrink-0" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Applications</SelectItem>
          {applications.map((a) => (
            <SelectItem key={a.id} value={a.id} data-testid={`app-option-${a.id}`}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Platform selector */}
      <Select value={platform} onValueChange={setPlatform}>
        <SelectTrigger className="hidden md:flex w-[150px] h-9 bg-[#121214] border-white/[0.08] text-sm" data-testid="platform-selector">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="google_play">Google Play</SelectItem>
          <SelectItem value="app_store">App Store</SelectItem>
        </SelectContent>
      </Select>

      <div className="hidden xl:block">
        <Segmented
          testId="date-range"
          value={days}
          onChange={setDays}
          options={[
            { value: 1, label: "1D" },
            { value: 7, label: "7D" },
            { value: 30, label: "30D" },
            { value: 90, label: "90D" },
          ]}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setSearchOpen(true)}
          data-testid="global-search-btn"
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#121214] px-3 h-9 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Search size={15} />
          <span className="hidden sm:inline">Search…</span>
        </button>

        <button
          onClick={() => navigate("/notifications")}
          data-testid="notifications-btn"
          className="relative rounded-lg border border-white/[0.08] bg-[#121214] h-9 w-9 grid place-items-center text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#0A0A0B]" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#121214] pl-1 pr-2 h-9 hover:border-white/20 transition-colors" data-testid="user-menu">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-bold text-black">
                {initials}
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm text-zinc-100">{user?.name}</div>
              <div className="text-xs text-zinc-500 font-normal">{user?.email}</div>
              <div className="mt-1 inline-flex rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                {ROLE_LABEL[user?.role] || user?.role}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout} data-testid="menu-logout" className="text-rose-400">
              <LogOut size={14} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
