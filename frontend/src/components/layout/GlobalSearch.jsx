import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { MessageSquare, AppWindow, Swords } from "lucide-react";
import api from "@/lib/api";

export default function GlobalSearch({ open, onOpenChange }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState({ reviews: [], applications: [], competitors: [] });
  const navigate = useNavigate();

  const run = async (val) => {
    setQ(val);
    if (val.length < 2) {
      setRes({ reviews: [], applications: [], competitors: [] });
      return;
    }
    try {
      const { data } = await api.get("/search/global", { params: { q: val } });
      setRes(data);
    } catch {}
  };

  const go = (path) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search reviews, applications, competitors…" value={q} onValueChange={run} data-testid="global-search-input" />
      <CommandList>
        <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
        {res.applications?.length > 0 && (
          <CommandGroup heading="Applications">
            {res.applications.map((a) => (
              <CommandItem key={a.id} onSelect={() => go("/applications")}>
                <AppWindow size={14} className="mr-2 text-blue-400" /> {a.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {res.competitors?.length > 0 && (
          <CommandGroup heading="Competitors">
            {res.competitors.map((c) => (
              <CommandItem key={c.id} onSelect={() => go("/competitors")}>
                <Swords size={14} className="mr-2 text-amber-400" /> {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {res.reviews?.length > 0 && (
          <CommandGroup heading="Reviews">
            {res.reviews.map((r) => (
              <CommandItem key={r.id} onSelect={() => go("/reviews")}>
                <MessageSquare size={14} className="mr-2 text-zinc-400" />
                <span className="truncate">{r.text}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
