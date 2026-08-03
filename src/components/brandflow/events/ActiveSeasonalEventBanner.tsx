"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { useActiveSeasonalEvent } from "@/hooks/useActiveSeasonalEvent";
import type { RegionEvent } from "@/lib/events-library";

function formatSaleEnd(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function ActiveSeasonalEventBanner({ event }: { event: RegionEvent | null }) {
  if (!event) return null;
  const primary = /^#[0-9a-fA-F]{6}$/.test(event.theme.primary) ? event.theme.primary : "#7C3AED";
  const secondary = /^#[0-9a-fA-F]{6}$/.test(event.theme.secondary) ? event.theme.secondary : "#D4A73A";

  return (
    <section
      role="status"
      aria-label="Active seasonal promotion"
      className="relative isolate w-full min-w-0 overflow-hidden rounded-xl border border-white/15 shadow-lg"
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
    >
      <div aria-hidden="true" className="absolute -right-3 -top-6 select-none text-7xl opacity-20 sm:right-4 sm:text-8xl">
        {event.emoji}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.24),transparent_45%)]" />
      <div className="relative m-1.5 flex min-w-0 flex-col gap-2 rounded-lg bg-black/60 px-3 py-2.5 text-white backdrop-blur-[2px] sm:m-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <span aria-hidden="true" className="mt-0.5 text-xl sm:mt-0 sm:text-2xl">{event.emoji}</span>
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold sm:text-base">
              <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-200" />
              <span className="break-words">{event.name}</span>
            </p>
            <p className="mt-0.5 break-words text-xs leading-relaxed text-white/90 sm:text-sm">
              {event.promotionalMessage || event.description}
            </p>
          </div>
        </div>
        {event.saleEnd && (
          <div className="flex shrink-0 items-center gap-1.5 self-start rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white/90 sm:self-center">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Ends</span>
            <time dateTime={event.saleEnd}>{formatSaleEnd(event.saleEnd)}</time>
          </div>
        )}
      </div>
    </section>
  );
}

export function SeasonalEventExperience({ organizationId }: { organizationId?: string }) {
  const query = useActiveSeasonalEvent(organizationId);
  const [reachedTransition, setReachedTransition] = useState<string | null>(null);
  const transitionKey = query.data?.nextTransitionAt || null;
  const transitionMarker = organizationId && transitionKey
    ? `${organizationId}:${transitionKey}`
    : null;
  const refetch = query.refetch;

  const timings = useMemo(() => {
    if (!query.data) return null;
    const serverNow = Date.parse(query.data.serverNow);
    const transition = query.data.nextTransitionAt ? Date.parse(query.data.nextTransitionAt) : Number.NaN;
    const activeEnd = query.data.activeEventEndsAt ? Date.parse(query.data.activeEventEndsAt) : Number.NaN;
    return {
      transitionDelay: Number.isFinite(serverNow) && Number.isFinite(transition) ? Math.max(0, transition - serverNow) : null,
      transitionAt: Number.isFinite(transition) ? transition : null,
      activeEndAt: Number.isFinite(activeEnd) ? activeEnd : null,
    };
  }, [query.data]);

  useEffect(() => {
    const transitionDelay = timings?.transitionDelay;
    if (transitionDelay === null || transitionDelay === undefined || !transitionMarker) return;

    // Browsers clamp a single timeout to roughly 24.8 days. Polling will keep
    // refreshing long-range schedules; only create the exact boundary timer
    // once the transition is safely inside that limit.
    const maximumSafeTimeout = 2_147_000_000;
    if (transitionDelay + 250 > maximumSafeTimeout) return;

    const timeout = window.setTimeout(() => {
      setReachedTransition(transitionMarker);
      void refetch();
    }, transitionDelay + 250);
    return () => window.clearTimeout(timeout);
  }, [refetch, timings?.transitionDelay, transitionMarker]);

  const activeExpired = reachedTransition === transitionMarker
    && timings?.activeEndAt !== null
    && timings?.activeEndAt !== undefined
    && timings.transitionAt !== null
    && timings.transitionAt !== undefined
    && Math.abs(timings.activeEndAt - timings.transitionAt) <= 500;
  const event = activeExpired ? null : query.data?.activeEvent || null;

  if (!event) return null;
  return (
    <div className="px-3 pt-3 sm:px-4 md:px-5 lg:px-6">
      <ActiveSeasonalEventBanner event={event} />
    </div>
  );
}
