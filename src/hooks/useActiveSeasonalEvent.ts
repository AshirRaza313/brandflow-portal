"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { RegionEvent } from "@/lib/events-library";

export interface ActiveSeasonalEventResponse {
  activeEvent: RegionEvent | null;
  serverNow: string;
  nextTransitionAt: string | null;
  activeEventEndsAt: string | null;
  timezone: string;
}

export function activeSeasonalEventQueryKey(organizationId: string) {
  return ["events", "active", organizationId] as const;
}

export function useActiveSeasonalEvent(organizationId?: string) {
  return useQuery({
    queryKey: activeSeasonalEventQueryKey(organizationId || ""),
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<ActiveSeasonalEventResponse> => {
      const response = await fetchWithAuth("/api/events/active", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Unable to load the active seasonal event");
      }
      return data as ActiveSeasonalEventResponse;
    },
    staleTime: 30_000,
    gcTime: 0,
    retry: 1,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    placeholderData: undefined,
  });
}
