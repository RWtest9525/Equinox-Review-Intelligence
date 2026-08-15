import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useScope } from "@/context/AppScope";

export function useScoped(key, url, extra = {}) {
  const { appId, platform, days } = useScope();
  const params = { days, ...extra };
  if (appId !== "all") params.application_id = appId;
  if (platform !== "all") params.platform = platform;
  return useQuery({
    queryKey: [key, appId, platform, days, JSON.stringify(extra)],
    queryFn: async () => (await api.get(url, { params })).data,
  });
}
