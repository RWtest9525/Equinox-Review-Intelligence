import React, { createContext, useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const ScopeCtx = createContext(null);
export const useScope = () => useContext(ScopeCtx);

export function ScopeProvider({ children }) {
  const { user } = useAuth();
  const [appId, setAppId] = useState("all"); // 'all' or application id
  const [platform, setPlatform] = useState("all");
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => (await api.get("/applications")).data.applications,
    enabled: !!user,
  });

  const applications = data || [];
  const currentApp = appId === "all" ? null : applications.find((a) => a.id === appId);

  // params helper for API calls
  const params = () => {
    const p = { days };
    if (appId !== "all") p.application_id = appId;
    if (platform !== "all") p.platform = platform;
    return p;
  };

  const value = {
    applications,
    appsLoading: isLoading,
    appId,
    setAppId,
    currentApp,
    platform,
    setPlatform,
    days,
    setDays,
    params,
  };

  return <ScopeCtx.Provider value={value}>{children}</ScopeCtx.Provider>;
}
