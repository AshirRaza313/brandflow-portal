// ============================================================================
// useSubscriptionSync — Real-time subscription plan synchronization
// ============================================================================
// This hook:
//   1. Fetches the current subscription on mount and every 30s
//   2. Refreshes immediately when browser tab becomes visible again
//   3. Updates the subscription plan state for feature locking
//   4. Syncs organization.plan in the Zustand store + localStorage
//   5. Handles ALL statuses: active, trial, pending_payment, expired
//
// CRITICAL FIX: After admin approves payment, the client's subscriptionPlan
// was never refreshed. This hook polls every 30s + tab visibility change
// so the client picks up plan changes automatically.
// ============================================================================

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { PLAN_LEVELS } from "@/lib/feature-lock";

const POLL_INTERVAL = 30_000; // 30 seconds (was 60s, made faster for better UX)

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

  const fetchSubscription = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId || !user) return;

    try {
      const res = await fetchWithAuth(`/api/subscriptions/current?orgId=${orgId}`);
      if (!res.ok) return;

      const data = await res.json();
      const sub = data.subscription;
      if (!sub) return;

      if (!mountedRef.current) return;

      // Determine the effective plan name
      let effectivePlan = "starter";
      let isPending = false;
      let pendingPlan = null;

      if (sub.status === "active") {
        // Active subscription — use the plan from subscription
        effectivePlan = sub.plan?.name || "starter";
      } else if (sub.status === "trial" && sub.isTrialActive) {
        // Active trial — use the plan from subscription (trial has growth access)
        effectivePlan = sub.plan?.name || "starter";
      } else if (sub.status === "pending_payment") {
        // Payment is pending — check if there's a pending payment with target plan
        isPending = true;
        const latestPending = (sub.payments || []).find(
          (p: any) => p.status === "pending"
        );
        if (latestPending?.planName) {
          pendingPlan = latestPending.planName;
        }
        // Keep the CURRENT plan active — don't downgrade to starter!
        // The planId in subscription still points to the old plan during pending_payment
        // but we want to keep the user's current features accessible
        effectivePlan = sub.plan?.name || "starter";
      } else if (sub.status === "expired") {
        effectivePlan = "starter";
      } else {
        effectivePlan = sub.plan?.name || "starter";
      }

      // Update local state
      setState((prev) => {
        // Skip if nothing changed (avoid unnecessary re-renders)
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

      // CRITICAL: Also sync organization.plan in Zustand store + localStorage
      // This ensures the Header tooltip and other components show the correct plan
      if (sub.plan?.name && organization) {
        const orgPlan = organization.plan;
        // Only update if plan changed (avoids unnecessary re-renders)
        if (orgPlan !== sub.plan.name) {
          setOrganization({ ...organization, plan: sub.plan.name });
        }
      }
    } catch {
      // Silently fail — keep existing state
    }
  }, [user, organization, setOrganization]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch + polling + tab visibility refresh
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Data fetch hook: setState is called in async callback after network response, not synchronously in effect body
    fetchSubscription();

    // Set up polling every 30s to pick up admin payment approvals
    intervalRef.current = setInterval(() => {
      fetchSubscription();
    }, POLL_INTERVAL);

    // Refresh when browser tab becomes visible (user switches back to portal)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSubscription();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh when window gains focus
    const handleFocus = () => {
      fetchSubscription();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchSubscription]);

  // Manual refresh trigger (can be called from UI)
  const refreshNow = useCallback(() => {
    fetchSubscription();
  }, [fetchSubscription]);

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
