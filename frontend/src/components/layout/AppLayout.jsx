import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScopeProvider } from "@/context/AppScope";

export default function AppLayout() {
  const [drawer, setDrawer] = useState(false);
  return (
    <ScopeProvider>
      <div className="grain min-h-screen bg-[#0A0A0B]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.06] lg:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="w-64 p-0 bg-[#0A0A0B] border-white/[0.06]">
            <Sidebar onNavigate={() => setDrawer(false)} />
          </SheetContent>
        </Sheet>

        <div className="lg:pl-64 flex flex-col min-h-screen">
          <Topbar onMenu={() => setDrawer(true)} />
          <main className="relative z-10 mx-auto max-w-[1600px] w-full px-4 sm:px-6 py-6 animate-fade-up flex-1">
            <Outlet />
          </main>
          <footer className="border-t border-white/[0.06] py-3.5 px-6 text-center text-xs text-zinc-500">
            Build By <span className="text-rose-500">♥️</span> From Equinox Marketing Agency
          </footer>
        </div>
      </div>
    </ScopeProvider>
  );
}
