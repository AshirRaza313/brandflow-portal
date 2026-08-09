"use client";

import React from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================================
// TrialBanner - Shows when subscription is in trial mode
// ============================================================================
// Displays days remaining, with urgent styling when < 3 days left.
// Gold/amber gradient for normal trial, red gradient for urgent.
// "Upgrade Now" navigates to billing section.
// ============================================================================

export function TrialBanner() {
  const { appTheme, setActiveSection } = useValtrioxStore();
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";

  // We need subscription data from the subscription sync hook.
  // Since this component is used in page.tsx which already calls useSubscriptionSync,
  // we receive the data as props.
  return null; // This is a prop-based component - see TrialBannerConnected below
}

interface TrialBannerProps {
  subscriptionStatus: string | null;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  userRole?: string | null;
}

export function TrialBannerConnected({
  subscriptionStatus,
  isTrialActive,
  trialDaysRemaining,
  userRole,
}: TrialBannerProps) {
  const { appTheme, setActiveSection } = useValtrioxStore();
  const [dismissed, setDismissed] = React.useState(false);
  const isDark = appTheme !== "light";
  const isGold = appTheme === "premium-dark";
  const isUrgent = isTrialActive && trialDaysRemaining <= 3;

  // Don't show for platform roles or if not on trial or dismissed
  const isPlatformRole = userRole === "platform_owner" || userRole === "platform_admin" || userRole === "valtriox_team";
  if (isPlatformRole || subscriptionStatus !== "trial" || !isTrialActive || dismissed) {
    return null;
  }

  const handleUpgrade = () => {
    setActiveSection("subscriptions");
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Urgent styling (< 3 days) - red/warm gradient
  const urgentBg = isGold
    ? "bg-gradient-to-r from-red-950/80 via-red-900/70 to-orange-900/80 border-red-700/40"
    : isDark
    ? "bg-gradient-to-r from-red-950/80 via-red-900/60 to-orange-900/70 border-red-700/30"
    : "bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-red-200/80";

  const urgentText = isDark ? "text-red-200" : "text-red-800";
  const urgentSubtext = isDark ? "text-red-300/70" : "text-red-600/80";
  const urgentButtonClass = isGold
    ? "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-red-500/20"
    : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20";
  const urgentIconClass = isDark ? "text-red-400" : "text-red-500";

  // Normal trial styling - gold/amber gradient
  const normalBg = isGold
    ? "bg-gradient-to-r from-amber-900/60 via-yellow-900/50 to-amber-900/60 border-amber-600/30"
    : isDark
    ? "bg-gradient-to-r from-amber-900/40 via-yellow-900/30 to-amber-900/40 border-amber-700/30"
    : "bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-amber-200/70";

  const normalText = isDark ? "text-amber-200" : "text-amber-800";
  const normalSubtext = isDark ? "text-amber-300/70" : "text-amber-600/80";
  const normalButtonClass = isGold
    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
    : "bg-amber-600 hover:bg-amber-700 text-white";
  const normalIconClass = isDark ? "text-amber-400" : "text-amber-500";

  const bg = isUrgent ? urgentBg : normalBg;
  const text = isUrgent ? urgentText : normalText;
  const subtext = isUrgent ? urgentSubtext : normalSubtext;
  const buttonClass = isUrgent ? urgentButtonClass : normalButtonClass;
  const iconClass = isUrgent ? urgentIconClass : normalIconClass;
  const dismissHover = isDark ? "hover:bg-white/10" : "hover:bg-black/10";

  // Day counter ring calculation
  const maxDays = 14;
  const pct = Math.min((trialDaysRemaining / maxDays) * 100, 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Animated gradient border glow for premium feel */}
        <div className={cn("relative rounded-xl p-px overflow-hidden", isUrgent
          ? isDark ? "bg-gradient-to-r from-red-600/50 via-orange-500/50 to-red-600/50" : "bg-gradient-to-r from-red-300 via-orange-300 to-red-300"
          : isGold ? "bg-gradient-to-r from-amber-600/50 via-yellow-500/50 to-amber-600/50" : isDark ? "bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-amber-500/30" : "bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200"
        )}>
          <motion.div
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ repeat: Infinity, duration: isUrgent ? 2 : 4, ease: "linear" }}
            className="absolute inset-0"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>

        <div className={cn(
          "relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl border -mt-px",
          bg
        )}>
          {/* Left: Day Counter + Message */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Circular day counter */}
            <div className="relative shrink-0">
              <svg width="48" height="48" viewBox="0 0 48 48" className="block">
                {/* Background ring */}
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  fill="none"
                  className={cn(isUrgent ? (isDark ? "stroke-red-900/40" : "stroke-red-200") : isDark ? "stroke-amber-900/40" : "stroke-amber-200")}
                  strokeWidth="3"
                />
                {/* Progress ring */}
                <motion.circle
                  cx="24"
                  cy="24"
                  r="18"
                  fill="none"
                  className={cn(
                    isUrgent ? "stroke-red-500" : isGold ? "stroke-amber-400" : isDark ? "stroke-amber-500" : "stroke-amber-500"
                  )}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  transform="rotate(-90 24 24)"
                />
                {/* Center text */}
                <text
                  x="24"
                  y="24"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "font-black text-sm fill-current",
                    isUrgent ? (isDark ? "text-red-400" : "text-red-600") : isDark ? "text-amber-400" : "text-amber-600"
                  )}
                >
                  {trialDaysRemaining}
                </text>
              </svg>
              {/* Urgent pulse ring */}
              {isUrgent && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full border-2 border-red-500/30"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold truncate", text)}>
                {isUrgent
                  ? `Trial expiring soon! Only ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left`
                  : `Free Trial Active | ${trialDaysRemaining} days remaining`
                }
              </p>
              <p className={cn("text-xs truncate", subtext)}>
                {isUrgent
                  ? "Upgrade now to avoid losing access to all premium features."
                  : "Explore all features risk-free. Upgrade anytime to keep access."
                }
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleUpgrade}
              className={cn("gap-1.5 text-xs px-3 h-8", buttonClass)}
            >
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upgrade Now</span>
              <span className="sm:hidden">Upgrade</span>
            </Button>

            <button
              onClick={handleDismiss}
              className={cn(
                "flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors",
                dismissHover,
                subtext
              )}
              aria-label="Dismiss trial banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
