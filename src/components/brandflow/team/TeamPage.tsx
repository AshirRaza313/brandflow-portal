// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useValtrioxStore } from "@/store/brandflow-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Plus, Users, Mail, UserPlus, Trash2, Pencil, RefreshCw, Loader2, AlertCircle,
  Shield, Check, Crown, Info, Lock, KeyRound, Send, Eye, EyeOff, Copy, CheckCheck,
  UsersRound, X,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  ROLES,
  getRoleByName,
  getRoleBadgeStyle,
  canManageRoles,
  type RoleDefinition,
} from "@/lib/roles";

// ── Types ──────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  roleId: string | null;
  joinedAt: string;
  pinCreatedAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string;
  };
  roleDef?: {
    id: string;
    name: string;
    label: string;
    description?: string;
    level: number;
    permissions?: string;
  } | null;
}

interface PendingInvitation {
  id: string;
  inviteeEmail: string;
  inviteeName: string;
  role: string;
  invitedAt: string;
  expiresAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

// Roles that should NOT appear in the invite role dropdown
const EXCLUDED_ROLES = ["platform_owner", "platform_admin", "owner", "custom"];

// ── Component ──────────────────────────────────────────────────────────────

export function TeamPage() {
  const { organization, appTheme, user } = useValtrioxStore();
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const currentUserRole = user?.role || "owner";
  const canManage = canManageRoles(currentUserRole);

  // Theme helpers
  const textPrimary = isDark ? "text-slate-100" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isGold ? "bg-[#1D2437] border-white/8" : isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-white border-slate-200";
  const hoverBg = isDark ? "hover:bg-white/5" : "hover:bg-slate-50";
  const inputBg = isDark ? "bg-white/5 border-white/10 text-white" : "";
  const accentClass = isGold ? "text-amber-400" : isDark ? "text-amber-400" : "text-amber-600";
  const accentBg = isGold ? "bg-amber-500/15" : isDark ? "bg-amber-500/15" : "bg-amber-100";
  const accentBtn = isGold ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-amber-600 hover:bg-amber-700 text-white";
  const accentOutline = isGold ? "border-amber-500/25 text-amber-400 hover:bg-amber-500/10" : "border-amber-300 text-amber-600 hover:bg-amber-50";
  const dangerOutline = isDark ? "border-red-500/25 text-red-400 hover:bg-red-500/10" : "border-red-300 text-red-600 hover:bg-red-50";

  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Team limit
  const [teamLimit, setTeamLimit] = useState(3);
  const [currentCount, setCurrentCount] = useState(0);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [invitePin, setInvitePin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  // Invite result (after successful invite, before sending email)
  const [inviteResult, setInviteResult] = useState<{
    emailData: { to: string; from: string; subject: string; body: string };
    pin: string;
    name: string;
    role: string;
  } | null>(null);

  // Edit role dialog
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState("");
  const [roleUpdating, setRoleUpdating] = useState(false);

  // Remove confirmation
  const [removeMember, setRemoveMember] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Generate random 6-digit PIN ──
  const generatePin = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  // Initialize PIN on dialog open
  const openInviteDialog = useCallback(() => {
    setInviteEmail("");
    setInviteName("");
    setInviteRole("viewer");
    setInvitePin(generatePin());
    setShowPin(false);
    setPinCopied(false);
    setInviteResult(null);
    setInviteOpen(true);
  }, [generatePin]);

  // ── Fetch Members ──
  const fetchMembers = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/team?orgId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch team");
      const data = await res.json();
      setMembers(data.members || []);
      setPendingInvitations(data.pendingInvitations || []);
      setTeamLimit(data.teamLimit || 3);
      setCurrentCount(data.currentCount || 0);
    } catch (err: any) {
      console.error("Fetch team error:", err);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Available roles for dropdown ──
  const availableRoles = useMemo(() => {
    return ROLES.filter((r) => !EXCLUDED_ROLES.includes(r.name)).sort((a, b) => b.level - a.level);
  }, []);

  // ── Filtered members ──
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.user?.name || "").toLowerCase().includes(q) ||
        (m.user?.email || "").toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q)
    );
  }, [members, search]);

  // ── Debounced Search ──
  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setSearch(value); }, 300);
  };

  // ── Handle Invite Submit ──
  const handleInvite = async () => {
    if (!organization?.id) return;
    if (!inviteEmail.trim()) { toast.error("Email is required"); return; }
    if (!invitePin.trim() || !/^\d{6}$/.test(invitePin)) { toast.error("PIN must be exactly 6 digits"); return; }

    setInviteLoading(true);
    try {
      const res = await fetchWithAuth("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organization.id,
          email: inviteEmail.trim(),
          name: inviteName.trim() || inviteEmail.split("@")[0],
          role: inviteRole,
          pin: invitePin,
          invitedBy: user?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "TEAM_LIMIT_REACHED") {
          toast.error(data.error, { duration: 5000 });
        } else {
          toast.error(data.error || "Failed to invite member");
        }
        return;
      }

      toast.success(data.message);
      setInviteResult(data.emailData ? {
        emailData: data.emailData,
        pin: data.invitation.pin,
        name: data.invitation.name,
        role: data.invitation.role,
      } : null);
      fetchMembers();
    } catch {
      toast.error("Failed to invite member");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Send Email (mailto:) ──
  const handleSendEmail = () => {
    if (!inviteResult) return;
    const { emailData } = inviteResult;
    const subject = encodeURIComponent(emailData.subject);
    const body = encodeURIComponent(emailData.body);
    window.open(`mailto:${emailData.to}?subject=${subject}&body=${body}`, "_blank");
  };

  // ── Copy PIN ──
  const handleCopyPin = async () => {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.pin);
      setPinCopied(true);
      toast.success("PIN copied to clipboard");
      setTimeout(() => setPinCopied(false), 2000);
    } catch {
      toast.error("Failed to copy PIN");
    }
  };

  // ── Handle Role Update ──
  const handleRoleUpdate = async () => {
    if (!editMember || !newRole) return;
    setRoleUpdating(true);
    try {
      // Find the RoleDef by name
      const roleDef = ROLES.find((r) => r.name === newRole);
      const res = await fetchWithAuth(`/api/organization/members/${editMember.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: roleDef?.id || null,
          roleName: newRole,
          updatedByRole: currentUserRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update role");
        return;
      }

      toast.success(`${editMember.user.name}'s role updated to ${roleDef?.label || newRole}`);
      setEditRoleOpen(false);
      setEditMember(null);
      fetchMembers();
    } catch {
      toast.error("Failed to update role");
    } finally {
      setRoleUpdating(false);
    }
  };

  // ── Handle Remove Member ──
  const handleRemove = async () => {
    if (!removeMember) return;
    setRemoving(true);
    try {
      const res = await fetchWithAuth(`/api/team?memberId=${removeMember.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to remove member");
        return;
      }
      toast.success(`${removeMember.user.name} has been removed from the team`);
      setRemoveMember(null);
      fetchMembers();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  // ── Get role display info ──
  const getRoleInfo = (roleName: string) => {
    const def = getRoleByName(roleName);
    return {
      label: def?.label || roleName,
      badgeStyle: getRoleBadgeStyle(roleName, isGold),
      level: def?.level || 0,
    };
  };

  // ── Role-based avatar color coding ──
  const getRoleAvatarColors = (roleName: string) => {
    const roleColors: Record<string, { bg: string; text: string; ring: string }> = {
      platform_owner: { bg: isGold ? "bg-amber-500/25" : isDark ? "bg-amber-500/20" : "bg-amber-100", text: isDark ? "text-amber-400" : "text-amber-700", ring: "ring-amber-500/40" },
      platform_admin: { bg: isGold ? "bg-orange-500/25" : isDark ? "bg-orange-500/20" : "bg-orange-100", text: isDark ? "text-orange-400" : "text-orange-700", ring: "ring-orange-500/40" },
      brand_owner: { bg: isGold ? "bg-amber-500/25" : isDark ? "bg-amber-500/20" : "bg-amber-100", text: isDark ? "text-amber-400" : "text-amber-700", ring: "ring-amber-500/40" },
      brand_admin: { bg: isGold ? "bg-yellow-500/25" : isDark ? "bg-yellow-500/20" : "bg-yellow-100", text: isDark ? "text-yellow-400" : "text-yellow-700", ring: "ring-yellow-500/40" },
      operations_manager: { bg: isGold ? "bg-sky-500/25" : isDark ? "bg-sky-500/20" : "bg-sky-100", text: isDark ? "text-sky-400" : "text-sky-700", ring: "ring-sky-500/40" },
      sales_manager: { bg: isGold ? "bg-rose-500/25" : isDark ? "bg-rose-500/20" : "bg-rose-100", text: isDark ? "text-rose-400" : "text-rose-700", ring: "ring-rose-500/40" },
      marketing_manager: { bg: isGold ? "bg-pink-500/25" : isDark ? "bg-pink-500/20" : "bg-pink-100", text: isDark ? "text-pink-400" : "text-pink-700", ring: "ring-pink-500/40" },
      warehouse_manager: { bg: isGold ? "bg-cyan-500/25" : isDark ? "bg-cyan-500/20" : "bg-cyan-100", text: isDark ? "text-cyan-400" : "text-cyan-700", ring: "ring-cyan-500/40" },
      support_agent: { bg: isGold ? "bg-teal-500/25" : isDark ? "bg-teal-500/20" : "bg-teal-100", text: isDark ? "text-teal-400" : "text-teal-700", ring: "ring-teal-500/40" },
    };
    return roleColors[roleName] || { bg: isGold ? "bg-slate-500/25" : isDark ? "bg-slate-500/20" : "bg-slate-100", text: isDark ? "text-slate-400" : "text-slate-600", ring: "ring-slate-500/40" };
  };

  // ── Simulated online/offline status ──
  const getMemberStatus = (member: Member) => {
    // Owner/admins are always shown online; others have simulated status
    const alwaysOnline = ["brand_owner", "platform_owner", "platform_admin"].includes(member.role);
    if (alwaysOnline || member.userId === user?.id) return "online";
    // Deterministic pseudo-random based on member id
    const hash = member.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return hash % 3 === 0 ? "online" : hash % 3 === 1 ? "away" : "offline";
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("h-16 rounded-xl animate-pulse", isDark ? "bg-white/5" : "bg-slate-100")} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold flex items-center gap-2", textPrimary)}>
            <UsersRound className={cn("h-5 w-5 sm:h-6 sm:w-6", accentClass)} />
            Team Management
          </h1>
          <p className={cn("text-xs sm:text-sm mt-1", textSecondary)}>
            Manage your team members, roles & invitations
          </p>
        </div>

        {canManage && (
          <Button
            className={cn("gap-2 text-xs sm:text-sm", accentBtn)}
            onClick={openInviteDialog}
          >
            <UserPlus className="h-4 w-4" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* ── Team Limit Banner ── */}
      {teamLimit !== -1 && (
        <Card className={cn(
          "border",
          currentCount >= teamLimit
            ? (isDark ? "border-red-500/30 bg-red-500/5" : "border-red-200 bg-red-50")
            : (isGold ? "border-amber-500/15 bg-amber-500/5" : isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-slate-200 bg-slate-50")
        )}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn("p-1.5 rounded-lg shrink-0",
                  currentCount >= teamLimit ? "bg-red-500/15" : accentBg
                )}>
                  {currentCount >= teamLimit
                    ? <Lock className="h-4 w-4 text-red-400" />
                    : <Users className={cn("h-4 w-4", accentClass)} />
                  }
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xs sm:text-sm font-medium", textPrimary)}>
                    Team Members: {currentCount} / {teamLimit}
                  </p>
                  <p className={cn("text-[10px] sm:text-xs", textSecondary)}>
                    {currentCount >= teamLimit
                      ? "Limit reached! Upgrade your plan to add more team members."
                      : `${teamLimit - currentCount} slot${teamLimit - currentCount !== 1 ? "s" : ""} remaining on your current plan.`}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="hidden sm:flex items-center gap-2">
                <div className={cn("w-32 h-2 rounded-full overflow-hidden", isDark ? "bg-white/10" : "bg-slate-200")}>
                  <div
                    className={cn("h-full rounded-full transition-all duration-500",
                      currentCount >= teamLimit ? "bg-red-500" : isGold ? "bg-amber-500" : "bg-amber-500"
                    )}
                    style={{ width: `${Math.min(100, (currentCount / teamLimit) * 100)}%` }}
                  />
                </div>
                <span className={cn("text-xs font-mono", currentCount >= teamLimit ? "text-red-400" : textSecondary)}>
                  {Math.round((currentCount / teamLimit) * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", textSecondary)} />
        <Input
          placeholder="Search members by name, email, or role..."
          onChange={(e) => handleSearchChange(e.target.value)}
          className={cn("pl-9 h-9 sm:h-10 text-sm", inputBg)}
        />
      </div>

      {/* ── Pending Invitations ── */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h3 className={cn("text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5", textSecondary)}>
            <Send className="h-3 w-3" />
            Pending Invitations ({pendingInvitations.length})
          </h3>
          {pendingInvitations.map((inv) => {
            const roleInfo = getRoleInfo(inv.role);
            return (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("p-3 rounded-xl border flex items-center justify-between gap-3",
                  isGold ? "border-amber-500/15 bg-amber-500/5" : isDark ? "border-white/[0.06] bg-white/[0.02]" : "border-amber-200 bg-amber-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", isDark ? "bg-amber-500/15" : "bg-amber-100")}>
                    <Mail className={cn("h-4 w-4", isGold ? "text-amber-400" : "text-amber-600")} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium truncate", textPrimary)}>{inv.inviteeName}</p>
                    <p className={cn("text-xs truncate", textSecondary)}>{inv.inviteeEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={cn("text-[10px]", roleInfo.badgeStyle)}>{roleInfo.label}</Badge>
                  <Badge variant="outline" className={cn("text-[10px]", isDark ? "border-amber-500/20 text-amber-400" : "border-amber-200 text-amber-600")}>
                    Pending
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Members List ── */}
      <div className="space-y-2">
        {filteredMembers.length === 0 ? (
          <Card className={cardBg}>
            <CardContent className="py-12 text-center">
              <Users className={cn("h-10 w-10 mx-auto mb-3 opacity-20", textSecondary)} />
              <p className={cn("text-sm font-medium", textPrimary)}>
                {search ? "No members match your search" : "No team members yet"}
              </p>
              <p className={cn("text-xs mt-1", textSecondary)}>
                {search ? "Try a different search term" : "Click 'Add Team Member' to invite your first team member"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMembers.map((member) => {
            const roleInfo = getRoleInfo(member.role);
            const isSelf = member.userId === user?.id;
            const isOwnerRole = ["brand_owner", "owner", "platform_owner", "platform_admin"].includes(member.role);

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("p-3 sm:p-4 rounded-xl border transition-all", cardBg, hoverBg)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className={cn("h-10 w-10 ring-2", getRoleAvatarColors(member.role).ring)}>
                        <AvatarFallback className={cn("text-xs font-bold", getRoleAvatarColors(member.role).bg, getRoleAvatarColors(member.role).text)}>
                          {member.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online/Offline status dot */}
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2",
                        isDark ? "border-[#1D2437]" : "border-white",
                        getMemberStatus(member) === "online"
                          ? "bg-emerald-500"
                          : getMemberStatus(member) === "away"
                          ? "bg-amber-400"
                          : "bg-slate-400"
                      )}>
                        {getMemberStatus(member) === "online" && (
                          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        )}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-sm font-semibold truncate", textPrimary)}>
                          {member.user.name}
                        </p>
                        {isSelf && (
                          <Badge className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/20">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={cn("text-xs truncate", textSecondary)}>{member.user.email}</p>
                        <span className={cn(
                          "text-[9px] font-medium",
                          getMemberStatus(member) === "online"
                            ? (isDark ? "text-emerald-400" : "text-emerald-600")
                            : getMemberStatus(member) === "away"
                            ? (isDark ? "text-amber-400" : "text-amber-600")
                            : textSecondary
                        )}>
                          {getMemberStatus(member) === "online" ? "Active now" : getMemberStatus(member) === "away" ? "Away" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={cn("text-[10px] sm:text-xs hidden xs:inline", roleInfo.badgeStyle)}>
                      {roleInfo.label}
                    </Badge>
                    <span className={cn("text-[10px]", textSecondary)}>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </span>

                    {/* Action buttons (only for manageable members) */}
                    {canManage && !isSelf && !isOwnerRole && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn("h-7 w-7 p-0", isDark ? "text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-500 hover:text-amber-600 hover:bg-amber-50")}
                          onClick={() => { setEditMember(member); setNewRole(member.role); setEditRoleOpen(true); }}
                          title="Change role"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn("h-7 w-7 p-0", isDark ? "text-slate-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 hover:bg-red-50")}
                          onClick={() => setRemoveMember(member)}
                          title="Remove member"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Invite Dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className={cn("sm:max-w-lg max-h-[90vh] overflow-y-auto", isDark ? "bg-[#1D2437] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("text-sm sm:text-base flex items-center gap-2", textPrimary)}>
              <UserPlus className={cn("h-4 w-4", accentClass)} />
              Invite Team Member
            </DialogTitle>
          </DialogHeader>

          {inviteResult ? (
            /* ── Invite Success + Send Email ── */
            <div className="space-y-4">
              <div className={cn("p-4 rounded-xl text-center", accentBg)}>
                <CheckCheck className={cn("h-10 w-10 mx-auto mb-2", accentClass)} />
                <p className={cn("text-sm font-semibold", textPrimary)}>Member Invited Successfully!</p>
                <p className={cn("text-xs mt-1", textSecondary)}>
                  {inviteResult.name} has been added as {inviteResult.role}
                </p>
              </div>

              {/* PIN Display */}
              <div className={cn("p-4 rounded-xl border", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200")}>
                <p className={cn("text-xs font-medium mb-2 flex items-center gap-1.5", textSecondary)}>
                  <KeyRound className="h-3.5 w-3.5" />
                  Login PIN (share via email only)
                </p>
                <div className="flex items-center justify-between gap-2">
                  <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-lg tracking-[0.3em] font-bold",
                    isGold ? "bg-amber-500/10 text-amber-400" : isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700"
                  )}>
                    {showPin ? inviteResult.pin : "******"}
                    <button onClick={() => setShowPin(!showPin)} className="ml-2 opacity-50 hover:opacity-100">
                      {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" variant="outline" className={cn("gap-1 text-xs shrink-0", accentOutline)} onClick={handleCopyPin}>
                    {pinCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {pinCopied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Send Email Button */}
              <div className="space-y-2">
                <Button className={cn("w-full gap-2", accentBtn)} onClick={handleSendEmail}>
                  <Send className="h-4 w-4" />
                  Send Invitation Email
                </Button>
                <p className={cn("text-[10px] text-center", textSecondary)}>
                  Opens your email app with a pre-filled invitation. The PIN is included in the email.
                </p>
              </div>

              <Button variant="outline" className="w-full text-xs" onClick={() => setInviteOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            /* ── Invite Form ── */
            <div className="space-y-4">
              <div>
                <Label className={cn("text-xs font-medium", textSecondary)}>Email Address *</Label>
                <Input
                  type="email"
                  placeholder="team-member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cn("mt-1 text-sm", inputBg)}
                />
              </div>

              <div>
                <Label className={cn("text-xs font-medium", textSecondary)}>Full Name (optional)</Label>
                <Input
                  placeholder="Team member's name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className={cn("mt-1 text-sm", inputBg)}
                />
              </div>

              <div>
                <Label className={cn("text-xs font-medium flex items-center gap-1", textSecondary)}>
                  <KeyRound className="h-3 w-3" />
                  Login PIN *
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={invitePin}
                    onChange={(e) => setInvitePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={cn("flex-1 text-sm font-mono tracking-[0.2em]", inputBg)}
                    placeholder="6-digit PIN"
                    maxLength={6}
                    type={showPin ? "text" : "password"}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn("shrink-0", isDark ? "text-slate-400 hover:text-white" : "text-slate-500")}
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("gap-1 text-xs shrink-0", isDark ? "border-white/10 text-slate-300" : "")}
                    onClick={() => setInvitePin(generatePin())}
                  >
                    <RefreshCw className="h-3 w-3" /> New
                  </Button>
                </div>
                <p className={cn("text-[10px] mt-1", textSecondary)}>
                  Team member will use this PIN (not a password) to log in. Keep it secure!
                </p>
              </div>

              <div>
                <Label className={cn("text-xs font-medium", textSecondary)}>Team Role *</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className={cn("mt-1 text-sm", inputBg)}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        <div className="flex items-center gap-2">
                          <span>{r.label}</span>
                          <span className="text-[10px] text-muted-foreground">Lv.{r.level}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {teamLimit !== -1 && currentCount >= teamLimit && (
                <div className={cn("p-3 rounded-lg flex items-center gap-2", isDark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200")}>
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">
                    Team member limit reached ({currentCount}/{teamLimit}). Upgrade your plan to add more members.
                  </p>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" className={cn("text-xs", isDark ? "border-white/10 text-slate-300" : "")} onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className={cn("gap-1 text-xs", accentBtn)}
                  onClick={handleInvite}
                  disabled={inviteLoading || (teamLimit !== -1 && currentCount >= teamLimit)}
                >
                  {inviteLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ── */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className={cn("sm:max-w-md", isDark ? "bg-[#1D2437] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("text-sm flex items-center gap-2", textPrimary)}>
              <Pencil className={cn("h-4 w-4", accentClass)} />
              Change Role - {editMember?.user.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={cn("text-xs font-medium", textSecondary)}>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className={cn("mt-1 text-sm", inputBg)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      <div className="flex items-center gap-2">
                        <span>{r.label}</span>
                        <span className="text-[10px] text-muted-foreground">Lv.{r.level}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className={cn("text-xs", isDark ? "border-white/10 text-slate-300" : "")} onClick={() => setEditRoleOpen(false)}>
              Cancel
            </Button>
            <Button className={cn("gap-1 text-xs", accentBtn)} onClick={handleRoleUpdate} disabled={roleUpdating}>
              {roleUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Confirmation Dialog ── */}
      <Dialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <DialogContent className={cn("sm:max-w-md", isDark ? "bg-[#1D2437] border-white/10" : "")}>
          <DialogHeader>
            <DialogTitle className={cn("text-sm flex items-center gap-2 text-red-400")}>
              <Trash2 className="h-4 w-4" />
              Remove Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className={cn("text-sm", textSecondary)}>
              Are you sure you want to remove <strong className={textPrimary}>{removeMember?.user.name}</strong> from your team?
            </p>
            <p className={cn("text-xs", textSecondary)}>
              Their access to the portal will be revoked immediately. This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className={cn("text-xs", isDark ? "border-white/10 text-slate-300" : "")} onClick={() => setRemoveMember(null)}>
              Cancel
            </Button>
            <Button className="gap-1 text-xs bg-red-500 hover:bg-red-600 text-white" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
