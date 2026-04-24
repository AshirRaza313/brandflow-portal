"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query provider component that wraps the application with a QueryClient.
 *
 * - staleTime: 1 minute — data is considered fresh for 60s before refetching
 * - gcTime: 5 minutes — unused cache entries are garbage-collected after 5 min
 * - retry: 1 — one automatic retry on failure
 * - refetchOnWindowFocus: disabled to avoid unexpected refetches
 */
export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
