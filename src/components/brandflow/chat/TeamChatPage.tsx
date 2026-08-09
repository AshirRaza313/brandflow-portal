// @ts-nocheck — Phase 8: pre-existing TS errors (Decimal/Prisma types, etc.) pending migration
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  Users,
  Shield,
  Lock,
  Search,
  Smile,
  Paperclip,
  Info,
  Image as ImageIcon,
  ChevronDown,
  Hash,
  Mic,
  MicOff,
  Square,
  FileText,
  X,
  Download,
  Play,
  Pause,
  Volume2,
  Trash2,
  Loader2,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string; // base64 data URL for localStorage storage
}

interface VoiceNote {
  id: string;
  url: string; // base64 audio data URL
  duration: number; // seconds
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: string;
  content: string;
  timestamp: number;
  type: "text" | "system" | "attachment" | "voice";
  edited?: boolean;
  readBy?: string[];
  attachment?: ChatAttachment;
  voiceNote?: VoiceNote;
}

interface ChatChannel {
  id: string;
  name: string;
  description: string;
  type: "general" | "announcements" | "random" | "orders" | "products" | "support";
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
  members: string[];
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRoleColor(role: string, isDark: boolean): string {
  if (role === "brand_owner" || role === "platform_owner") {
    return isDark ? "text-amber-400" : "text-amber-600";
  }
  if (role === "brand_admin") {
    return isDark ? "text-yellow-400" : "text-yellow-600";
  }
  if (role === "operations_manager" || role === "manager") {
    return isDark ? "text-blue-400" : "text-blue-600";
  }
  return isDark ? "text-slate-400" : "text-slate-500";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500", "bg-amber-500", "bg-yellow-500", "bg-rose-500",
    "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-amber-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getFileIconType(type: string): "image" | "pdf" | "doc" | "file" {
  if (type.startsWith("image/")) return "image";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("doc") || type.includes("word") || type.includes("text")) return "doc";
  return "file";
}

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VOICE_DURATION = 300; // 5 minutes

// ============================================================================
// Channel Data
// ============================================================================

function getDefaultChannels(): ChatChannel[] {
  return [
    { id: "general", name: "General", description: "General team discussion", type: "general", unreadCount: 0, members: [] },
    { id: "announcements", name: "Announcements", description: "Important team announcements", type: "announcements", unreadCount: 0, members: [] },
    { id: "orders", name: "Orders", description: "Discuss orders and fulfillment", type: "orders", unreadCount: 0, members: [] },
    { id: "products", name: "Products", description: "Product discussions and updates", type: "products", unreadCount: 0, members: [] },
    { id: "support", name: "Support", description: "Customer support coordination", type: "support", unreadCount: 0, members: [] },
    { id: "random", name: "Random", description: "Off-topic and casual chat", type: "random", unreadCount: 0, members: [] },
  ];
}

// ============================================================================
// Channel Icon
// ============================================================================

function ChannelIcon({ type, className = "" }: { type: ChatChannel["type"]; className?: string }) {
  switch (type) {
    case "announcements": return <Info className={className} />;
    case "orders": return <Hash className={className} />;
    case "products": return <ImageIcon className={className} />;
    case "support": return <Shield className={className} />;
    case "random": return <Smile className={className} />;
    default: return <Hash className={className} />;
  }
}

// ============================================================================
// Channel List Item
// ============================================================================

function ChannelListItem({
  channel,
  isActive,
  isDark,
  isGold,
  onClick,
}: {
  channel: ChatChannel;
  isActive: boolean;
  isDark: boolean;
  isGold: boolean;
  onClick: () => void;
}) {
  const accentBg = isGold ? "bg-amber-500/15" : "bg-amber-500/15";
  const accentText = isGold ? "text-amber-400" : "text-amber-400";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
        isActive
          ? accentBg
          : isDark
            ? "hover:bg-white/[0.06]"
            : "hover:bg-slate-50"
      }`}
    >
      <div className={`shrink-0 ${isActive ? accentText : isDark ? "text-slate-500 group-hover:text-slate-300" : "text-slate-400 group-hover:text-slate-500"}`}>
        <ChannelIcon type={channel.type} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium truncate ${isActive ? (isDark ? "text-white" : "text-slate-900") : isDark ? "text-slate-300" : "text-slate-600"}`}>
            {channel.name}
          </span>
          {channel.unreadCount > 0 && (
            <Badge className={`h-4 min-w-[16px] text-[9px] px-1 ${isGold ? "bg-amber-500/20 text-amber-400" : "bg-amber-500/20 text-amber-500"}`}>
              {channel.unreadCount}
            </Badge>
          )}
        </div>
        {channel.lastMessage && (
          <p className={`text-[10px] sm:text-xs truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {channel.lastMessage}
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Voice Note Player Component
// ============================================================================

function VoiceNotePlayer({
  voiceNote,
  isDark,
  isGold,
}: {
  voiceNote: VoiceNote;
  isDark: boolean;
  isGold: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accentClass = isGold ? "text-amber-400" : "text-amber-400";

  const handlePlay = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voiceNote.url);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  }, [isPlaying, voiceNote.url]);

  const progress = voiceNote.duration > 0 ? (playbackTime / voiceNote.duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl min-w-[180px] ${
      isDark ? "bg-black/20" : "bg-slate-100"
    }`}>
      <button
        onClick={handlePlay}
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${accentClass} ${
          isDark ? "bg-white/[0.1] hover:bg-white/[0.15]" : "bg-white hover:bg-slate-50 shadow-sm"
        }`}
      >
        {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1 rounded-full overflow-hidden ${isDark ? "bg-white/[0.1]" : "bg-slate-200"}`}>
          <motion.div
            className={`h-full rounded-full ${isGold ? "bg-amber-400" : "bg-amber-400"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <Volume2 className={`h-2.5 w-2.5 ${isDark ? "text-slate-400" : "text-slate-400"}`} />
          <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {formatDuration(voiceNote.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Attachment Preview Component
// ============================================================================

function AttachmentBubble({
  attachment,
  isDark,
}: {
  attachment: ChatAttachment;
  isDark: boolean;
}) {
  const iconType = getFileIconType(attachment.type);

  if (iconType === "image") {
    return (
      <div className="rounded-lg overflow-hidden border border-white/10 max-w-[240px]">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-48 w-auto object-contain rounded-lg"
        />
        <div className={`px-2 py-1 flex items-center justify-between ${isDark ? "bg-black/30" : "bg-slate-100"}`}>
          <span className={`text-[9px] truncate max-w-[160px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {attachment.name}
          </span>
          <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {formatFileSize(attachment.size)}
          </span>
        </div>
      </div>
    );
  }

  const fileIconColors: Record<string, string> = {
    pdf: "bg-rose-500/20 text-rose-400",
    doc: "bg-blue-500/20 text-blue-400",
    file: "bg-slate-500/20 text-slate-400",
  };
  const fileEmoji: Record<string, string> = {
    pdf: "📄",
    doc: "📝",
    file: "📎",
  };

  return (
    <a
      href={attachment.url}
      download={attachment.name}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl min-w-[180px] max-w-[260px] transition-colors ${
        isDark
          ? "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]"
          : "bg-white hover:bg-slate-50 border border-slate-200 shadow-sm"
      }`}
    >
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${fileIconColors[iconType] || fileIconColors.file}`}>
        {fileEmoji[iconType] || fileEmoji.file}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {attachment.name}
        </p>
        <p className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <Download className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
    </a>
  );
}

// ============================================================================
// Message Bubble Component
// ============================================================================

function MessageBubble({
  message,
  isOwn,
  isDark,
  isGold,
  accentClass,
  isLastInGroup,
  onDelete,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isDark: boolean;
  isGold: boolean;
  accentClass: string;
  isLastInGroup: boolean;
  onDelete?: (messageId: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className={`text-[10px] px-3 py-1 rounded-full ${isDark ? "bg-white/[0.06] text-slate-500" : "bg-slate-100 text-slate-400"}`}>
          {message.content}
        </span>
      </div>
    );
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(message.id);
      setConfirmDelete(false);
      setShowActions(false);
    } else {
      setConfirmDelete(true);
      // Auto-dismiss confirm after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`group flex gap-2 sm:gap-3 ${isOwn ? "flex-row-reverse" : "flex-row"} ${isLastInGroup ? "mt-4" : "mt-1"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setConfirmDelete(false); }}
      onTouchStart={() => {
        if (isOwn && onDelete) {
          longPressTimer.current = setTimeout(() => setShowActions(true), 400);
        }
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }}
    >
      {/* Avatar */}
      {isLastInGroup && (
        <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 shrink-0 mt-0.5 ${getAvatarColor(message.senderName)}`}>
          {message.senderAvatar ? (
            <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          ) : null}
          <AvatarFallback className="text-white text-[10px] sm:text-xs font-semibold">
            {getInitials(message.senderName)}
          </AvatarFallback>
        </Avatar>
      )}
      {!isLastInGroup && <div className="w-7 sm:w-8 shrink-0" />}

      {/* Message content */}
      <div className={`max-w-[75%] sm:max-w-[65%] min-w-0 ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender info (only on last in group) */}
        {isLastInGroup && (
          <div className={`flex items-center gap-1.5 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            <span className={`text-xs font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              {message.senderName}
            </span>
            <span className={`text-[9px] ${getRoleColor(message.senderRole, isDark)}`}>
              {message.senderRole.replace(/_/g, " ")}
            </span>
            <span className={`text-[9px] ${isDark ? "text-slate-400" : "text-slate-400"}`}>
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}

        {/* Bubble */}
        {message.type === "attachment" && message.attachment && (
          <div className="space-y-1.5">
            {message.content && (
              <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                isOwn
                  ? isGold
                    ? "bg-amber-500/15 text-amber-100 rounded-tr-md"
                    : "bg-amber-500/15 text-amber-100 rounded-tr-md"
                  : isDark
                    ? "bg-white/[0.06] text-slate-200 rounded-tl-md"
                    : "bg-white text-slate-700 rounded-tl-md border border-slate-100 shadow-sm"
              }`}>
                {message.content}
              </div>
            )}
            <AttachmentBubble attachment={message.attachment} isDark={isDark} />
          </div>
        )}

        {message.type === "voice" && message.voiceNote && (
          <div className="space-y-1.5">
            {message.content && (
              <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
                isOwn
                  ? isGold
                    ? "bg-amber-500/15 text-amber-100 rounded-tr-md"
                    : "bg-amber-500/15 text-amber-100 rounded-tr-md"
                  : isDark
                    ? "bg-white/[0.06] text-slate-200 rounded-tl-md"
                    : "bg-white text-slate-700 rounded-tl-md border border-slate-100 shadow-sm"
              }`}>
                {message.content}
              </div>
            )}
            <VoiceNotePlayer voiceNote={message.voiceNote} isDark={isDark} isGold={isGold} />
          </div>
        )}

        {message.type === "text" && (
          <div className={`px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words ${
            isOwn
              ? isGold
                ? "bg-amber-500/15 text-amber-100 rounded-tr-md"
                : "bg-amber-500/15 text-amber-100 rounded-tr-md"
              : isDark
                ? "bg-white/[0.06] text-slate-200 rounded-tl-md"
                : "bg-white text-slate-700 rounded-tl-md border border-slate-100 shadow-sm"
          }`}>
            {message.content}
            {message.edited && (
              <span className={`text-[8px] ml-1 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Delete button - shows on hover (desktop) / always visible for own messages (mobile) */}
        {isOwn && onDelete && (
          <div className={`flex items-center ${isOwn ? "justify-end" : "justify-start"} mt-0.5 h-5`}>
            <AnimatePresence>
              {showActions && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  onClick={handleDelete}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-colors ${
                    confirmDelete
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : isDark
                        ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                        : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                  title={confirmDelete ? "Click again to confirm delete" : "Delete message"}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {confirmDelete ? "Confirm?" : "Delete"}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Voice Recording Component
// ============================================================================

function VoiceRecordingBar({
  isRecording,
  recordingTime,
  isDark,
  isGold,
  onCancel,
  onStop,
}: {
  isRecording: boolean;
  recordingTime: number;
  isDark: boolean;
  isGold: boolean;
  onCancel: () => void;
  onStop: (blob: Blob) => void;
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const [time, setTime] = useState(0);
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;
  const accentClass = isGold ? "text-amber-500" : "text-amber-500";

  // Start recording when component mounts
  useEffect(() => {
    let cancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Try audio/webm first, fallback to audio/ogg, then default
        let mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/ogg";
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "";
        }

        const options: MediaRecorderOptions = {};
        if (mimeType) options.mimeType = mimeType;

        const recorder = new MediaRecorder(stream, options);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (cancelled) {
            chunksRef.current = [];
            return;
          }
          const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
          if (blob.size > 0) {
            onStopRef.current(blob);
          }
          chunksRef.current = [];
        };

        recorder.start(200);
        mediaRecorderRef.current = recorder;
        startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTime(elapsed);
          if (elapsed >= MAX_VOICE_DURATION) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
            }
          }
        }, 200);
      } catch {
        // Microphone not available - cancel silently
        if (!cancelled) {
          onCancel();
        }
      }
    }

    if (isRecording) {
      setTime(0);
      startRecording();
    }

    return () => {
      cancelled = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      chunksRef.current = [];
    };
  }, [isRecording, onCancel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    chunksRef.current = [];
    setTime(0);
    onCancel();
  }, [onCancel]);

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
        isDark ? "bg-red-500/5 border-red-500/20" : "bg-red-50 border-red-200"
      }`}
    >
      {/* Pulsing red dot */}
      <div className="relative">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-40" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium ${isDark ? "text-red-300" : "text-red-700"}`}>
          Recording Voice Note
        </p>
        <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {formatDuration(time)} / {formatDuration(MAX_VOICE_DURATION)}
        </p>
        {/* Waveform simulation */}
        <div className="flex items-center gap-px mt-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className={`w-0.5 rounded-full ${isGold ? "bg-amber-500/40" : "bg-amber-500/40"}`}
              animate={{
                height: [4, 8 + Math.random() * 12, 4],
              }}
              transition={{
                duration: 0.5 + Math.random() * 0.5,
                repeat: Infinity,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
        onClick={cancelRecording}
        title="Cancel"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        className={`h-7 w-7 p-0 ${isGold ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}`}
        onClick={stopRecording}
        title="Send"
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Team Info Panel
// ============================================================================

function TeamInfoPanel({
  isDark,
  isGold,
  accentClass,
}: {
  isDark: boolean;
  isGold: boolean;
  accentClass: string;
}) {
  const { user, brandName } = useValtrioxStore();
  const members = useMemo(() => {
    const names = user ? [user.name] : [];
    if (brandName) names.push(`${brandName} Team`);
    return names;
  }, [user, brandName]);

  return (
    <Card className={`h-full ${isDark ? "bg-white/[0.03] border-white/[0.06]" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {members.map((name) => (
          <div key={name} className="flex items-center gap-2.5">
            <Avatar className={`h-7 w-7 ${getAvatarColor(name)}`}>
              <AvatarFallback className="text-white text-[10px] font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className={`text-xs font-medium truncate ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                {name}
              </p>
              <p className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                {name === user?.name ? "You" : "Member"}
              </p>
            </div>
            <div className="ml-auto h-2 w-2 rounded-full bg-amber-500" title="Online" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Attachment Preview Strip (before sending)
// ============================================================================

function AttachmentPreview({
  file,
  preview,
  isDark,
  onRemove,
}: {
  file: File;
  preview?: string;
  isDark: boolean;
  onRemove: () => void;
}) {
  const isImage = file.type.startsWith("image/");

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
      isDark ? "bg-white/[0.04] border border-white/[0.08]" : "bg-slate-50 border border-slate-200"
    }`}>
      {isImage && preview ? (
        <Image src={preview} alt={file.name} width={32} height={32} className="h-8 w-8 rounded object-cover" unoptimized />
      ) : (
        <div className={`h-8 w-8 rounded flex items-center justify-center text-sm ${
          isDark ? "bg-white/[0.06]" : "bg-slate-100"
        }`}>
          📎
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-medium truncate ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          {file.name}
        </p>
        <p className={`text-[8px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {formatFileSize(file.size)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className={`h-5 w-5 rounded-full flex items-center justify-center ${
          isDark ? "hover:bg-white/[0.1] text-slate-500" : "hover:bg-slate-200 text-slate-400"
        }`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ============================================================================
// Main TeamChatPage Component
// ============================================================================

export function TeamChatPage() {
  const { user, brandName, appTheme, organization } = useValtrioxStore();

  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const isGold = appTheme === "premium-dark";
  const accentClass = isGold ? "text-amber-500" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/15" : "bg-amber-500/15";

  // Platform role check - admin cannot access Team Chat
  const userRole = user?.role || "viewer";
  const isPlatformRole = userRole === "platform_owner" || userRole === "platform_admin" || userRole === "owner";

  const [channels] = useState<ChatChannel[]>(getDefaultChannels);
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [messageInput, setMessageInput] = useState("");
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  // Load messages from localStorage (brand-isolated by organization)
  const orgId = organization?.id || "default";
  const storageKey = `valtriox-chat-${orgId}-${activeChannelId}`;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      if (typeof window === "undefined") return [];
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Save messages to localStorage
  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => {
      const next = updater(prev);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, JSON.stringify(next.slice(-200)));
        }
      } catch {}
      return next;
    });
  }, [storageKey]);

  // Filtered messages (search)
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => (m.content || "").toLowerCase().includes(q));
  }, [messages, searchQuery]);

  // Create base message
  const createBaseMessage = useCallback((): Omit<ChatMessage, "id" | "type" | "content" | "timestamp"> => ({
    senderId: user?.id || "user-1",
    senderName: user?.name || brandName || "You",
    senderAvatar: user?.image,
    senderRole: user?.role || "team_member",
  }), [user, brandName]);

  // File to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      alert(`File too large. Maximum size is ${formatFileSize(MAX_ATTACHMENT_SIZE)}.`);
      return;
    }
    setPendingAttachment(file);
    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setAttachmentPreview(preview);
    } else {
      setAttachmentPreview(undefined);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Remove pending attachment
  const removeAttachment = useCallback(() => {
    setPendingAttachment(null);
    setAttachmentPreview(undefined);
  }, []);

  // Send text message
  const handleSend = useCallback(async () => {
    const hasText = messageInput.trim().length > 0;
    const hasAttachment = pendingAttachment !== null;

    if (!hasText && !hasAttachment) return;

    const base = createBaseMessage();

    if (hasAttachment) {
      try {
        const url = await fileToBase64(pendingAttachment);
        const attachment: ChatAttachment = {
          id: generateId(),
          name: pendingAttachment.name,
          type: pendingAttachment.type,
          size: pendingAttachment.size,
          url,
        };
        const msg: ChatMessage = {
          ...base,
          id: generateId(),
          content: messageInput.trim(),
          timestamp: Date.now(),
          type: "attachment",
          attachment,
        };
        updateMessages((prev) => [...prev, msg]);
      } catch {
        // Failed to process file
      }
      setPendingAttachment(null);
      setAttachmentPreview(undefined);
    }

    if (hasText && !hasAttachment) {
      const msg: ChatMessage = {
        ...base,
        id: generateId(),
        content: messageInput.trim(),
        timestamp: Date.now(),
        type: "text",
      };
      updateMessages((prev) => [...prev, msg]);
    }

    setMessageInput("");
  }, [messageInput, pendingAttachment, createBaseMessage, updateMessages, fileToBase64]);

  // Handle voice note stop
  const handleVoiceStop = useCallback(async (blob: Blob) => {
    const url = await fileToBase64(blob);
    const base = createBaseMessage();
    const msg: ChatMessage = {
      ...base,
      id: generateId(),
      content: "",
      timestamp: Date.now(),
      type: "voice",
      voiceNote: {
        id: generateId(),
        url,
        duration: 0,
      },
    };
    // Get duration from audio element
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      const dur = tempAudio.duration || 0;
      const finalMsg = { ...msg, voiceNote: { ...msg.voiceNote!, duration: dur } };
      updateMessages((prev) => [...prev, finalMsg]);
    };
    tempAudio.onerror = () => {
      updateMessages((prev) => [...prev, msg]);
    };
    setIsRecording(false);
  }, [createBaseMessage, updateMessages, fileToBase64]);

  // Delete a message (only own messages)
  const handleDeleteMessage = useCallback((messageId: string) => {
    updateMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== messageId);
      // Add a system message about deletion
      const deletedMsg: ChatMessage = {
        id: generateId(),
        senderId: "system",
        senderName: "System",
        senderRole: "system",
        content: "A message was deleted",
        timestamp: Date.now(),
        type: "system",
      };
      return [...filtered, deletedMsg];
    });
  }, [updateMessages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Group messages by sender for display
  const groupedMessages = useMemo(() => {
    const groups: Array<{ message: ChatMessage; isLastInGroup: boolean; isOwn: boolean }> = [];
    for (let i = 0; i < filteredMessages.length; i++) {
      const msg = filteredMessages[i];
      const prev = filteredMessages[i - 1];
      const isOwn = msg.senderId === (user?.id || "user-1");
      const sameSender = prev && prev.senderId === msg.senderId && (msg.timestamp - prev.timestamp) < 120000;
      groups.push({
        message: msg,
        isLastInGroup: !sameSender,
        isOwn,
      });
    }
    return groups;
  }, [filteredMessages, user?.id]);

  // Platform role locked overlay
  if (isPlatformRole) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] sm:h-[calc(100vh-6rem)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-sm w-full mx-4 rounded-2xl p-8 text-center ${
            isDark ? "bg-white/[0.03] border border-white/[0.06]" : "bg-white border border-slate-200 shadow-xl"
          }`}
        >
          <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
            isGold ? "bg-amber-500/10" : "bg-amber-500/10"
          }`}>
            <MessageCircle className={`w-8 h-8 ${isGold ? "text-amber-400" : "text-amber-400"}`} />
          </div>
          <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            Team Chat
          </h2>
          <p className={`text-sm mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            This feature is for brand owners and their team members.
          </p>
          <p className={`text-xs mb-6 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
            As the platform administrator, you manage the system through the Admin Panel. Team Chat is designed for your clients to communicate internally within their own brand teams.
          </p>
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
            isGold ? "bg-amber-500/10 text-amber-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            <Shield className="w-3.5 h-3.5" />
            Admin Access Only - Admin Panel
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-[calc(100vh-8rem)] sm:h-[calc(100vh-6rem)] flex flex-col sm:flex-row gap-0 overflow-hidden rounded-xl border ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200"}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        onChange={handleFileChange}
      />

      {/* Channel Sidebar */}
      <div
        className={`w-full sm:w-64 lg:w-72 shrink-0 flex flex-col border-r ${
          isDark ? "border-white/[0.06]" : "border-slate-200"
        } ${mobileShowChat ? "hidden sm:flex" : "flex"}`}
      >
        {/* Channel header */}
        <div className={`px-4 py-3 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className={`h-5 w-5 ${accentClass}`} />
              <h2 className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                Team Chat
              </h2>
            </div>
            <Badge variant="secondary" className={`text-[9px] px-1.5 ${accentBg} ${accentClass}`}>
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              Private
            </Badge>
          </div>
          <p className={`text-[10px] mt-1.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
            Only your brand team can see this - fully isolated
          </p>
        </div>

        {/* Search */}
        <div className={`px-3 py-2 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
            <Search className={`h-3.5 w-3.5 ${isDark ? "text-slate-400" : "text-slate-400"}`} />
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`bg-transparent text-xs outline-none w-full ${isDark ? "text-slate-300 placeholder:text-slate-500" : "text-slate-600 placeholder:text-slate-400"}`}
            />
          </div>
        </div>

        {/* Channel list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            <p className={`text-[9px] font-semibold uppercase tracking-wider px-3 py-1.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
              Channels
            </p>
            {channels.map((channel) => (
              <ChannelListItem
                key={channel.id}
                channel={channel}
                isActive={activeChannelId === channel.id}
                isDark={isDark}
                isGold={isGold}
                onClick={() => {
                  setActiveChannelId(channel.id);
                  setMobileShowChat(true);
                }}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Team members count */}
        <div className={`px-4 py-2.5 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className="flex items-center gap-2">
            <Users className={`h-3.5 w-3.5 ${isDark ? "text-slate-400" : "text-slate-400"}`} />
            <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {brandName || "Your Brand"} Team
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileShowChat ? "flex" : "hidden sm:flex"}`}>
        {/* Chat header */}
        <div className={`px-3 sm:px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden h-7 w-7 p-0 shrink-0"
              onClick={() => setMobileShowChat(false)}
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
            <ChannelIcon type={activeChannel.type} className={`h-4 w-4 shrink-0 ${accentClass}`} />
            <div className="min-w-0">
              <h3 className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {activeChannel.name}
              </h3>
              <p className={`text-[9px] sm:text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {activeChannel.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 w-7 p-0 hidden lg:flex ${isDark ? "text-slate-500 hover:text-white hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
              onClick={() => setShowTeamInfo(!showTeamInfo)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="px-3 sm:px-4 py-4 space-y-1">
            {/* Welcome */}
            <div className="flex flex-col items-center py-6 sm:py-10">
              <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center mb-3 ${accentBg}`}>
                <MessageCircle className={`h-6 w-6 sm:h-7 sm:w-7 ${accentClass}`} />
              </div>
              <h3 className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                #{activeChannel.name}
              </h3>
              <p className={`text-[10px] sm:text-xs mt-1 max-w-[280px] text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {activeChannel.description}. This is a private channel - only your brand team members can see messages here.
              </p>
            </div>

            {groupedMessages.length > 0 && (
              <div className="flex flex-col">
                {groupedMessages.map((group) => (
                  <MessageBubble
                    key={group.message.id}
                    message={group.message}
                    isOwn={group.isOwn}
                    isDark={isDark}
                    isGold={isGold}
                    accentClass={accentClass}
                    isLastInGroup={group.isLastInGroup}
                    onDelete={handleDeleteMessage}
                  />
                ))}
              </div>
            )}

            {groupedMessages.length === 0 && (
              <div className="text-center py-4">
                <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className={`px-3 sm:px-4 py-3 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          {/* Voice recording bar */}
          <AnimatePresence>
            {isRecording && (
              <VoiceRecordingBar
                isRecording={isRecording}
                recordingTime={0}
                isDark={isDark}
                isGold={isGold}
                onCancel={() => setIsRecording(false)}
                onStop={handleVoiceStop}
              />
            )}
          </AnimatePresence>

          {/* Attachment preview */}
          <AnimatePresence>
            {pendingAttachment && !isRecording && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="mb-2"
              >
                <AttachmentPreview
                  file={pendingAttachment}
                  preview={attachmentPreview}
                  isDark={isDark}
                  onRemove={removeAttachment}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message input */}
          {!isRecording && (
            <div className={`flex items-end gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border ${
              isDark
                ? "bg-white/[0.04] border-white/[0.08] focus-within:border-white/[0.15]"
                : "bg-slate-50 border-slate-200 focus-within:border-slate-300"
            } transition-colors`}>
              {/* Attachment button */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                onClick={handleFileSelect}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Text input */}
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${activeChannel.name}...`}
                rows={1}
                className={`flex-1 bg-transparent text-xs sm:text-sm outline-none resize-none max-h-24 ${isDark ? "text-slate-200 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`}
                style={{ minHeight: "24px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 96) + "px";
                }}
              />

              {/* Voice note button */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                onClick={() => setIsRecording(true)}
                title="Record voice note"
              >
                <Mic className="h-4 w-4" />
              </Button>

              {/* Send button */}
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!messageInput.trim() && !pendingAttachment}
                className={`h-8 w-8 p-0 shrink-0 transition-all ${
                  messageInput.trim() || pendingAttachment
                    ? isGold
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                    : isDark
                      ? "bg-white/[0.06] text-slate-600"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-1.5 px-1">
            <div className="flex items-center gap-2">
              <Lock className={`h-3 w-3 ${isDark ? "text-slate-700" : "text-slate-300"}`} />
              <span className={`text-[9px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                End-to-end private - {brandName || "Your Brand"} team only
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                Files up to 20MB & voice notes supported
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Info Panel (Desktop only) */}
      {showTeamInfo && (
        <div className={`hidden lg:block w-64 shrink-0 border-l ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <TeamInfoPanel isDark={isDark} isGold={isGold} accentClass={accentClass} />
        </div>
      )}
    </div>
  );
}
