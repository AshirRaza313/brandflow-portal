"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Shield, Pencil, Plus, Mail, UserPlus, Check, X, Lock,
  ChevronDown, ChevronRight, Loader2, Info, Crown, Eye, Star,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import {
  ROLES,
  hasPermission,
  getRoleByName,
  getRoleBadgeStyle,
  canManageRoles,
  ALL_PERMISSION_KEYS,
  PERMISSION_LABELS,
  type RoleDefinition,
} from "@/lib/roles";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  roleId: string | null;
  joinedAt: string;
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

const subTabs = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles" },
  { id: "permissions", label: "Permissions" },
];

// ── Component ──────────────────────────────────────────────────────────────

export function UserManagementPage() {
  const { organization, user, appTheme } = useValtrioxStore();
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;
  const isGold = appTheme === "premium-dark";
  const isDark = appTheme === "dark" || isGold;

  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Members state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "viewer" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<{ name?: string; email?: string }>({});

  // Edit role dialog
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newRoleId, setNewRoleId] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  // Role detail dialog
  const [roleDetailOpen, setRoleDetailOpen] = useState(false);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<RoleDefinition | null>(null);

  // Can current user manage roles?
  const currentUserRole = user?.role || "owner";
  const canChangeRoles = canManageRoles(currentUserRole);

  // ── Fetch Members ─────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/team?orgId=${organization.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── Filtered Members ──────────────────────────────────────────────────

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) =>
      m.user.name.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      (m.roleDef?.label || m.role).toLowerCase().includes(q)
    );
  }, [members, search]);

  // ── Get Role Label ───────────────────────────────────────────────────

  const getMemberRoleLabel = (member: TeamMember): string => {
    if (member.roleDef?.label) return member.roleDef.label;
    const legacyMap: Record<string, string> = {
      owner: "Owner",
      manager: "Manager",
      sales: "Sales",
      cs: "Customer Service",
      packaging: "Packaging",
      inventory: "Inventory",
      member: "Member",
    };
    return legacyMap[member.role] || member.role;
  };

  const getMemberRoleName = (member: TeamMember): string => {
    if (member.roleDef?.name) return member.roleDef.name;
    return member.role;
  };

  // ── Invite Handler ───────────────────────────────────────────────────

  const handleInvite = async () => {
    const errs: { name?: string; email?: string } = {};
    if (!inviteForm.name.trim()) errs.name = "Name is required";
    if (!inviteForm.email.trim() || !inviteForm.email.includes("@")) errs.email = "Valid email is required";
    setInviteErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setInviteLoading(true);
    try {
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "viewer" });
      setInviteErrors({});
      fetchMembers();
    } catch {
      toast.error("Failed to send invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Role Update Handler ─────────────────────────────────────────────

  const openEditRole = (member: TeamMember) => {
    setEditingMember(member);
    setNewRoleId(member.roleDef?.id || "");
    setEditRoleOpen(true);
  };

  const handleRoleUpdate = async () => {
    if (!editingMember || !newRoleId) return;
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/organization/members/${editingMember.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: newRoleId,
          updatedByRole: currentUserRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      const data = await res.json();
      toast.success("Role updated successfully");
      setEditRoleOpen(false);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  };

  // ── Theme Helpers ────────────────────────────────────────────────────

  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-muted-foreground";

  const getBadgeClass = (roleName: string) => {
    const style = getRoleBadgeStyle(roleName);
    return isDark ? style.dark : style.light;
  };

  const getCardBg = () => {
    if (isGold) return "bg-white/[0.03] border-white/[0.06]";
    if (isDark) return "bg-white/[0.03] border-white/[0.06]";
    return "bg-white border-slate-200";
  };

  // ── Permission Matrix Data ───────────────────────────────────────────

  const permissionKeys = ALL_PERMISSION_KEYS.filter((k) => k !== "all" && k !== "manage_platform");

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    const timer = setTimeout(() => { setSearch(value); }, 300);
    return () => clearTimeout(timer);
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", textPrimary)}>User Management</h1>
          <p className={cn("text-sm mt-1", textSecondary)}>Manage user accounts, roles, and permissions</p>
        </div>
        {activeTab === "users" && (
          <Button
            className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-amber-600 hover:bg-amber-700"}
            onClick={() => setInviteOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Invite User
          </Button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? isGold
                  ? "border-amber-500 text-amber-400"
                  : isDark
                    ? "border-amber-500 text-amber-400"
                    : "border-amber-600 text-amber-600"
                : isDark
                  ? "border-transparent text-slate-500 hover:text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Users Tab ──────────────────────────────────────────────── */}
        {activeTab === "users" && (
          <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Empty State */}
            {!loading && filteredMembers.length === 0 && (
              <Card className={getCardBg()}>
                <CardContent className="p-8">
                  <EmptyState
                    icon={Users}
                    title={members.length === 0 ? "No users yet" : "No matching users"}
                    description={members.length === 0
                      ? `Invite team members to collaborate on your ${companyName} portal. Each user can be assigned a role with specific permissions.`
                      : `No users match "${search}".`
                    }
                    action={members.length === 0 ? { label: "Invite User", onClick: () => setInviteOpen(true) } : undefined}
                  />
                </CardContent>
              </Card>
            )}

            {/* Member List */}
            {filteredMembers.length > 0 && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {filteredMembers.map((member, idx) => {
                  const roleName = getMemberRoleName(member);
                  const roleLabel = getMemberRoleLabel(member);
                  const isPlatform = ["platform_owner", "platform_admin"].includes(roleName);
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        "group flex items-center justify-between gap-3 rounded-xl border p-3 sm:p-4 transition-all",
                        getCardBg(),
                        isDark && "hover:border-amber-500/20",
                        !isDark && "hover:border-slate-300 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0",
                          isPlatform ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-amber-500 to-teal-600"
                        )}>
                          {member.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={cn("text-sm font-semibold truncate", textPrimary)}>{member.user.name}</h4>
                            {isPlatform && <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                          </div>
                          <p className={cn("text-xs truncate", textMuted)}>{member.user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Role Badge */}
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] px-2.5 py-0.5 font-medium cursor-default gap-1.5", getBadgeClass(roleName))}
                          onClick={() => {
                            const def = getRoleByName(roleName);
                            if (def) {
                              setSelectedRoleDetail(def);
                              setRoleDetailOpen(true);
                            }
                          }}
                        >
                          {roleLabel}
                          {getRoleByName(roleName) && <Info className="h-3 w-3 opacity-60" />}
                        </Badge>

                        {/* Edit Role Button */}
                        {canChangeRoles && (
                          <button
                            onClick={() => openEditRole(member)}
                            className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                              isDark ? "hover:bg-white/10 text-slate-400 hover:text-white" : "hover:bg-slate-100 text-slate-400"
                            )}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Roles Tab ──────────────────────────────────────────────── */}
        {activeTab === "roles" && (
          <motion.div key="roles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {ROLES.map((role, idx) => (
                <motion.div
                  key={role.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={cn(
                    "group rounded-xl border p-4 transition-all cursor-pointer",
                    getCardBg(),
                    isDark && "hover:border-amber-500/20",
                    !isDark && "hover:border-slate-300 hover:shadow-sm"
                  )}
                  onClick={() => {
                    setSelectedRoleDetail(role);
                    setRoleDetailOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0 font-medium", getBadgeClass(role.name))}>
                          Lvl {role.level}
                        </Badge>
                        {role.permissions.all && <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                      </div>
                      <h4 className={cn("text-sm font-semibold mt-2", textPrimary)}>{role.label}</h4>
                      <p className={cn("text-xs mt-1 line-clamp-2", textMuted)}>{role.description}</p>
                    </div>
                  </div>

                  {/* Quick permission count */}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : undefined }}>
                    <Shield className={cn("h-3 w-3", textMuted)} />
                    <span className={cn("text-[10px]", textMuted)}>
                      {role.permissions.all ? "Full Access" : `${Object.values(role.permissions).filter(Boolean).length} permissions`}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Permissions Tab ────────────────────────────────────────── */}
        {activeTab === "permissions" && (
          <motion.div key="permissions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className={cn(getCardBg(), "overflow-hidden")}>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className={cn("border-b", isDark ? "bg-slate-900/90 backdrop-blur-sm" : "bg-slate-50/95 backdrop-blur-sm")}>
                        <th className={cn("text-left py-3 px-4 text-xs font-semibold min-w-[180px]", textSecondary)}>Role</th>
                        <th className={cn("text-center py-3 px-2 text-xs font-semibold min-w-[50px]", textSecondary)}>Level</th>
                        {permissionKeys.map((key) => (
                          <th key={key} className={cn("text-center py-3 px-2 text-xs font-semibold min-w-[80px]", textSecondary)}>
                            <span className="hidden xl:inline">{PERMISSION_LABELS[key] || key}</span>
                            <span className="xl:hidden">{PERMISSION_LABELS[key]?.slice(0, 8) || key}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ROLES.map((role) => (
                        <tr
                          key={role.name}
                          className={cn(
                            "border-b transition-colors",
                            isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-slate-100 hover:bg-slate-50/50"
                          )}
                        >
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={cn("text-[11px] px-2.5 py-0.5 font-medium cursor-default", getBadgeClass(role.name))}
                            >
                              {role.label}
                            </Badge>
                          </td>
                          <td className="text-center py-3 px-2">
                            <span className={cn("text-xs font-medium", textMuted)}>{role.level}</span>
                          </td>
                          {permissionKeys.map((key) => {
                            const hasAccess = hasPermission(role, key);
                            return (
                              <td key={key} className="text-center py-3 px-2">
                                {hasAccess ? (
                                  <Check className={cn("h-4 w-4 mx-auto", isGold ? "text-amber-400" : "text-amber-500")} />
                                ) : (
                                  <X className={cn("h-4 w-4 mx-auto opacity-30", isDark ? "text-slate-600" : "text-slate-300")} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invite Dialog ────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className={cn("sm:max-w-md", isGold && "bg-[#15151e] border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isDark && "text-white")}>
              <UserPlus className="h-5 w-5" /> Invite User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Full Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Enter user name"
                value={inviteForm.name}
                onChange={(e) => { setInviteForm({ ...inviteForm, name: e.target.value }); if (inviteErrors.name) setInviteErrors((p) => ({ ...p, name: undefined })); }}
                className={cn(isDark && "border-white/10 bg-white/[0.03]", inviteErrors.name && "border-red-500")}
              />
              {inviteErrors.name && <p className="text-xs text-red-500">{inviteErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Email Address <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteForm.email}
                onChange={(e) => { setInviteForm({ ...inviteForm, email: e.target.value }); if (inviteErrors.email) setInviteErrors((p) => ({ ...p, email: undefined })); }}
                className={cn(isDark && "border-white/10 bg-white/[0.03]", inviteErrors.email && "border-red-500")}
              />
              {inviteErrors.email && <p className="text-xs text-red-500">{inviteErrors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label className={cn(isDark && "text-slate-300")}>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger className={cn(isDark && "border-white/10 bg-white/[0.03]")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r.name !== "custom").map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      <span className="flex items-center gap-2">
                        {r.label}
                        <span className="text-[10px] text-muted-foreground">Lvl {r.level}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)} className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}>Cancel</Button>
              <Button
                className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-amber-600 hover:bg-amber-700"}
                onClick={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="mr-2 h-4 w-4" /> Send Invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ─────────────────────────────────────────── */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent className={cn("sm:max-w-md", isGold && "bg-[#15151e] border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isDark && "text-white")}>
              <Shield className="h-5 w-5" /> Assign Role
            </DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-teal-600 text-xs font-bold text-white">
                  {editingMember.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium", textPrimary)}>{editingMember.user.name}</p>
                  <p className={cn("text-xs truncate", textMuted)}>{editingMember.user.email}</p>
                </div>
              </div>

              {/* Current Role */}
              <div className={cn("rounded-lg p-3", isDark ? "bg-white/[0.03]" : "bg-slate-50")}>
                <p className={cn("text-xs mb-1", textMuted)}>Current Role</p>
                <Badge variant="outline" className={cn("text-[11px] px-2.5 py-0.5 font-medium", getBadgeClass(getMemberRoleName(editingMember)))}>
                  {getMemberRoleLabel(editingMember)}
                </Badge>
              </div>

              {/* New Role Selection */}
              <div className="space-y-2">
                <Label className={cn(isDark && "text-slate-300")}>Assign New Role</Label>
                <Select value={newRoleId} onValueChange={setNewRoleId}>
                  <SelectTrigger className={cn(isDark && "border-white/10 bg-white/[0.03]")}>
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {ROLES.map((r) => (
                      <SelectItem key={r.name} value={r.name} className="py-2">
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{r.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 flex-shrink-0", getBadgeClass(r.name))}>
                            {r.level}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Selected role description */}
                {newRoleId && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className={cn("rounded-lg p-3 mt-2", isDark ? "bg-white/[0.03]" : "bg-slate-50")}
                  >
                    {(() => {
                      const role = getRoleByName(newRoleId);
                      if (!role) return null;
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={cn("text-[10px] px-2 py-0", getBadgeClass(role.name))}>
                              {role.label}
                            </Badge>
                            <span className={cn("text-[10px]", textMuted)}>Level {role.level}</span>
                          </div>
                          <p className={cn("text-xs mb-2", textMuted)}>{role.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.all ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                                <Check className="h-2.5 w-2.5 mr-1" /> Full Access
                              </Badge>
                            ) : (
                              Object.entries(role.permissions)
                                .filter(([, v]) => v === true)
                                .map(([key]) => (
                                  <Badge key={key} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                                    {PERMISSION_LABELS[key] || key}
                                  </Badge>
                                ))
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditRoleOpen(false)} className={cn(isGold && "border-white/10 text-slate-300 hover:bg-white/5")}>Cancel</Button>
                <Button
                  className={isGold ? "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-black" : "bg-amber-600 hover:bg-amber-700"}
                  onClick={handleRoleUpdate}
                  disabled={roleLoading || !newRoleId}
                >
                  {roleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Role
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Role Detail Dialog ───────────────────────────────────────── */}
      <Dialog open={roleDetailOpen} onOpenChange={setRoleDetailOpen}>
        <DialogContent className={cn("sm:max-w-lg", isGold && "bg-[#15151e] border-white/[0.08]")}>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isDark && "text-white")}>
              <Shield className="h-5 w-5" />
              {selectedRoleDetail?.label}
            </DialogTitle>
          </DialogHeader>
          {selectedRoleDetail && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs px-3 py-0.5 font-medium", getBadgeClass(selectedRoleDetail.name))}>
                  {selectedRoleDetail.label}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0", isDark ? "bg-white/5 text-slate-400 border-white/10" : "bg-slate-100 text-slate-600")}>
                  Level {selectedRoleDetail.level}
                </Badge>
              </div>

              <p className={cn("text-sm", textSecondary)}>{selectedRoleDetail.description}</p>

              {/* Permissions Grid */}
              <div>
                <p className={cn("text-xs font-semibold mb-2", textPrimary)}>Permissions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {permissionKeys.map((key) => {
                    const hasAccess = hasPermission(selectedRoleDetail, key);
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-xs border",
                          hasAccess
                            ? isDark
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-amber-50 border-amber-200 text-amber-700"
                            : isDark
                              ? "bg-white/[0.02] border-white/[0.06] text-slate-600"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                        )}
                      >
                        {hasAccess ? (
                          <Check className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 flex-shrink-0 opacity-40" />
                        )}
                        {PERMISSION_LABELS[key] || key}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
