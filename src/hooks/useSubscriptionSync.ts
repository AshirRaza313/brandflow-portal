// ============================================================================
// useSubscriptionSync - Real-time subscription plan synchronization
// ============================================================================
// This hook:
//   1. Fetches the current subscription on mount and every 60s
//   2. Refreshes immediately when browser tab becomes visible again
//   3. Updates the subscription plan state for feature locking
//   4. Syncs organization.plan in the Zustand store + localStorage
//   5. Handles ALL statuses: active, trial, pending_payment, expired
//
// ANTI-RETRY-STORM GUARDS:
//   - Uses refs for async-closure values (orgId, user) so the effect setup
//     only runs once per orgId/user change, NOT on every organization object
//     reference change.
//   - In-flight request guard (`fetchingRef`) prevents overlapping fetches
//     from poll + visibility + focus events stacking up.
//   - Exponential backoff on consecutive failures (max 3 retries).
// ============================================================================

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { PLAN_LEVELS } from "@/lib/feature-lock";

const POLL_INTERVAL = 60_000; // 60 seconds - gentle polling
const MAX_RETRY_ATTEMPTS = 3;
const BACKOFF_BASE = 2_000; // 2s, 4s, 8s
const COOLDOWN_AFTER_MAX_RETRIES = 120_000; // 2-minute cooldown after hitting max retries

interface SubscriptionSyncState {
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isPendingPayment: boolean;
  pendingPlanName: string | null; // The plan user is upgrading TO
  isLoading: boolean;
}

export function useSubscriptionSync() {
  const { user, organization, setOrganization } = useValtrioxStore();
  const [state, setState] = useState<SubscriptionSyncState>({
    subscriptionPlan: "trial",
    subscriptionStatus: null,
    isTrialActive: false,
    trialDaysRemaining: 0,
    isPendingPayment: false,
    pendingPlanName: null,
    isLoading: true,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false); // Guard against overlapping requests
  const retryCountRef = useRef(0);   // Track consecutive failures for backoff
  const orgIdRef = useRef(organization?.id ?? "");
  const userIdRef = useRef(user?.id ?? "");
  const userRoleRef = useRef(user?.role ?? "");

  // Keep refs in sync with latest values (these changes DON'T re-trigger the effect)
  useEffect(() => {
    orgIdRef.current = organization?.id ?? "";
  }, [organization?.id]);

  useEffect(() => {
    userIdRef.current = user?.id ?? "";
  }, [user?.id]);

  useEffect(() => {
    userRoleRef.current = user?.role ?? "";
  }, [user?.role]);

  // Core fetch logic - uses refs so it can be called from stable callbacks
  const doFetch = useCallback(async () => {
    const orgId = orgIdRef.current;
    const userId = userIdRef.current;
    if (!orgId || !userId) return;

    // In-flight guard: skip if a request is already in progress
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetchWithAuth(`/api/subscriptions/current?orgId=${orgId}`);
      if (!res.ok) {
        retryCountRef.current = Math.min(retryCountRef.current + 1, MAX_RETRY_ATTEMPTS);
        return;
      }

      const data = await res.json();
      const sub = data.subscription;
      if (!sub) return;

      // Success - reset retry counter
      retryCountRef.current = 0;

      if (!mountedRef.current) return;

      // Determine the effective plan name
      let effectivePlan = "starter";
      let isPending = false;
      let pendingPlan: string | null = null;

      if (sub.status === "active") {
        effectivePlan = sub.plan?.name || "starter";
      } else if (sub.status === "trial" && sub.isTrialActive) {
        effectivePlan = "trial";
      } else if (sub.status === "pending_payment") {
        isPending = true;
        const latestPending = (sub.payments || []).find(
          (p: any) => p.status === "pending"
        );
        if (latestPending?.planName) {
          pendingPlan = latestPending.planName;
        }
        if (sub.trialEndsAt && new Date(sub.trialEndsAt) > new Date()) {
          effectivePlan = "trial";
        } else {
          effectivePlan = sub.plan?.name || "starter";
        }
      } else if (sub.status === "expired") {
        effectivePlan = "starter";
      } else {
        effectivePlan = sub.plan?.name || "starter";
      }

      // Platform roles bypass all plan restrictions
      const userRole = userRoleRef.current;
      if (userRole === "platform_owner" || userRole === "platform_admin" || userRole === "valtriox_team") {
        effectivePlan = "enterprise";
      }

      // Update local state (skip if nothing changed)
      setState((prev) => {
        if (prev.subscriptionPlan === effectivePlan && prev.subscriptionStatus === sub.status) {
          return prev;
        }
        return {
          subscriptionPlan: effectivePlan,
          subscriptionStatus: sub.status,
          isTrialActive: sub.isTrialActive,
          trialDaysRemaining: sub.trialDaysRemaining || 0,
          isPendingPayment: isPending,
          pendingPlanName: pendingPlan,
          isLoading: false,
        };
      });

      // CRITICAL: Sync organization.plan in the Zustand store (in-memory only,
      // per Phase 17 PII purge — no localStorage write).
      // Skip for platform roles (their plan is always "enterprise" regardless of DB subscription)
      if (sub.plan?.name && userRole !== "platform_owner" && userRole !== "platform_admin" && userRole !== "valtriox_team") {
        const { organization: currentOrg } = useValtrioxStore.getState();
        if (currentOrg && currentOrg.plan !== sub.plan.name) {
          setOrganization({ ...currentOrg, plan: sub.plan.name });
        }
      }
    } catch {
      retryCountRef.current = Math.min(retryCountRef.current + 1, MAX_RETRY_ATTEMPTS);
      // Silently fail - keep existing state
    } finally {
      fetchingRef.current = false;
    }
  }, [setOrganization]); // setOrganization is stable (Zustand)

  // Set up polling + visibility + focus - only re-runs when orgId or userId changes
  useEffect(() => {
    mountedRef.current = true;

    // Reset state when org/user changes
    setState({
      subscriptionPlan: "trial",
      subscriptionStatus: null,
      isTrialActive: false,
      trialDaysRemaining: 0,
      isPendingPayment: false,
      pendingPlanName: null,
      isLoading: true,
    });
    retryCountRef.current = 0;

    // Initial fetch
    doFetch();

    // Polling with exponential backoff on failures + cooldown after max retries
    const schedulePoll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const retries = retryCountRef.current;
      let delay: number;
      if (retries >= MAX_RETRY_ATTEMPTS) {
        // Hit max retries → enter cooldown period (2 min)
        delay = COOLDOWN_AFTER_MAX_RETRIES;
      } else if (retries > 0) {
        // Backoff: 2s, 4s, 8s
        delay = Math.min(BACKOFF_BASE * Math.pow(2, retries - 1), 60_000);
      } else {
        delay = POLL_INTERVAL;
      }
      intervalRef.current = setInterval(() => {
        doFetch();
      }, delay);
    };
    schedulePoll();

    // Re-schedule poll after each fetch to apply backoff changes
    const pollRescheduler = setInterval(schedulePoll, 15_000); // Check every 15s instead of 5s
    // Cleanup rescheduler too
    const cleanupRescheduler = () => clearInterval(pollRescheduler);

    // Refresh when browser tab becomes visible (debounced)
    let visibilityTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Debounce - don't fire immediately, wait 2s to avoid rapid-fire
        if (visibilityTimeout) clearTimeout(visibilityTimeout);
        visibilityTimeout = setTimeout(() => {
          retryCountRef.current = Math.max(0, retryCountRef.current - 1); // Ease retry count on visibility
          doFetch();
        }, 2_000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh when window gains focus (debounced)
    const handleFocus = () => {
      if (visibilityTimeout) return; // Don't double-fire with visibility handler
      visibilityTimeout = setTimeout(() => {
        retryCountRef.current = Math.max(0, retryCountRef.current - 1);
        doFetch();
      }, 2_000);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      mountedRef.current = false;
      cleanupRescheduler();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, user?.id]); // Only re-run when org/user identity changes, NOT on object ref change

  // Manual refresh trigger (can be called from UI)
  const refreshNow = useCallback(() => {
    retryCountRef.current = 0; // Reset backoff on manual refresh
    doFetch();
  }, [doFetch]);

  // Check if a feature is available based on the current synced plan
  const isFeatureAvailable = useCallback(
    (featureId: string, minPlan: string) => {
      const currentLevel = PLAN_LEVELS[state.subscriptionPlan] ?? 0;
      const requiredLevel = PLAN_LEVELS[minPlan] ?? 0;
      return currentLevel >= requiredLevel;
    },
    [state.subscriptionPlan]
  );

  return {
    ...state,
    refreshNow,
    isFeatureAvailable,
    // Convenience: what's the highest plan the user has?
    planLevel: PLAN_LEVELS[state.subscriptionPlan] ?? 0,
  };
}
