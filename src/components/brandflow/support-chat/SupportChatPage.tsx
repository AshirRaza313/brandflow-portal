"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useValtrioxStore } from "@/store/brandflow-store";
import { usePlatformIdentity } from "@/lib/platform-identity";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
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
  Shield,
  Lock,
  Search,
  Paperclip,
  ChevronDown,
  Mic,
  MicOff,
  X,
  Download,
  Play,
  Pause,
  Volume2,
  Trash2,
  Phone,
  PhoneOff,
  PhoneCall,
  Speaker,
  VolumeX,
  Clock,
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

interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: string;
  content: string;
  timestamp: number;
  type: "text" | "system" | "attachment" | "voice" | "call";
  attachment?: ChatAttachment;
  voiceNote?: VoiceNote;
  callInfo?: { duration: number; type: "incoming" | "outgoing" | "missed" };
}

interface ClientConversation {
  orgId: string;
  orgName: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VOICE_DURATION = 300; // 5 minutes
const ADMIN_ID = "admin-valtriox";

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
  if (role === "brand_owner" || role === "platform_owner" || role === "platform_admin" || role === "owner") {
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
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isGold ? "text-amber-400" : "text-amber-400"
        } ${
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
    pdf: "\uD83D\uDCC4",
    doc: "\uD83D\uDCDD",
    file: "\uD83D\uDCE7",
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
// Support Message Bubble Component
// ============================================================================

function SupportMessageBubble({
  message,
  isOwn,
  isDark,
  isGold,
  accentClass,
  isLastInGroup,
  onDelete,
}: {
  message: SupportMessage;
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

  // System message
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className={`text-[10px] px-3 py-1 rounded-full ${isDark ? "bg-white/[0.06] text-slate-500" : "bg-slate-100 text-slate-400"}`}>
          {message.content}
        </span>
      </div>
    );
  }

  // Call system message
  if (message.type === "call" && message.callInfo) {
    const callIcon = message.callInfo.type === "missed"
      ? "\u274C"
      : message.callInfo.type === "incoming"
        ? "\uD83D\uDCDE"
        : "\uD83D\uDCDE";
    const callLabel = message.callInfo.type === "missed"
      ? "Missed call"
      : `Voice call ended \u2014 duration: ${formatDuration(message.callInfo.duration)}`;
    return (
      <div className="flex justify-center py-2">
        <span className={`text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
          message.callInfo.type === "missed"
            ? isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-500"
            : isDark ? "bg-white/[0.06] text-slate-500" : "bg-slate-100 text-slate-400"
        }`}>
          <Phone className="h-3 w-3" />
          {callLabel}
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

        {/* Attachment bubble */}
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

        {/* Voice note bubble */}
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

        {/* Text bubble */}
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
          </div>
        )}

        {/* Delete button */}
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
  isDark,
  isGold,
  onCancel,
  onStop,
}: {
  isRecording: boolean;
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

  useEffect(() => {
    let cancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

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
        <img src={preview} alt={file.name} className="h-8 w-8 rounded object-cover" />
      ) : (
        <div className={`h-8 w-8 rounded flex items-center justify-center text-sm ${
          isDark ? "bg-white/[0.06]" : "bg-slate-100"
        }`}>
          \uD83D\uDCE7
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
// Call Overlay Component
// ============================================================================

function CallOverlay({
  isDark,
  isGold,
  callerName,
  companyName: callerCompany,
  isActive,
  onEnd,
}: {
  isDark: boolean;
  isGold: boolean;
  callerName: string;
  companyName?: string;
  isActive: boolean;
  onEnd: (duration: number) => void;
}) {
  const [callPhase, setCallPhase] = useState<"connecting" | "active">("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const connectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isActive) {
      // Simulate "connecting" for 3 seconds then go active
      connectTimerRef.current = setTimeout(() => {
        setCallPhase("active");
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);
      }, 3000);
    }

    return () => {
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleEnd = useCallback(() => {
    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    const dur = callPhase === "active" ? callDuration : 0;
    setCallDuration(0);
    setCallPhase("connecting");
    setIsMuted(false);
    setIsSpeakerOn(false);
    onEnd(dur);
  }, [callPhase, callDuration, onEnd]);

  const accentClass = isGold ? "text-amber-400" : "text-amber-400";
  const accentBg = isGold ? "bg-amber-500/15" : "bg-amber-500/15";

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: isDark ? "#0a0a0f" : "#1a1a2e" }}
    >
      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className={`absolute rounded-full ${isGold ? "bg-amber-500/5" : "bg-amber-500/5"}`}
          style={{ width: 400, height: 400, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className={`absolute rounded-full ${isGold ? "bg-amber-500/5" : "bg-amber-500/5"}`}
          style={{ width: 550, height: 550, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
        />
        <motion.div
          className={`absolute rounded-full ${isGold ? "bg-amber-500/3" : "bg-amber-500/3"}`}
          style={{ width: 700, height: 700, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Avatar with pulsing ring */}
        <div className="relative">
          <motion.div
            className={`absolute -inset-3 rounded-full border-2 ${isGold ? "border-amber-500/30" : "border-amber-500/30"}`}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className={`absolute -inset-6 rounded-full border ${isGold ? "border-amber-500/15" : "border-amber-500/15"}`}
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div
            className={`absolute -inset-10 rounded-full border ${isGold ? "border-amber-500/8" : "border-amber-500/8"}`}
            animate={{ scale: [1, 1.08, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
          />
          <div className={`h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center ${accentBg}`}>
            <PhoneCall className={`h-10 w-10 sm:h-12 sm:w-12 ${accentClass}`} />
          </div>
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {callerName}
          </h2>
          <p className={`text-sm mt-2 ${callPhase === "connecting" ? "text-slate-400" : "text-slate-300"}`}>
            {callPhase === "connecting" ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  className="flex gap-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <span>Calling</span>
                  <span className="inline-flex gap-0.5">
                    <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                      .
                    </motion.span>
                    <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}>
                      .
                    </motion.span>
                    <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}>
                      .
                    </motion.span>
                  </span>
                </motion.div>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(callDuration)}
              </span>
            )}
          </p>
        </div>

        {/* Call controls */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Mute button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? "bg-white/20 text-white"
                : isDark
                  ? "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {isMuted ? <MicOff className="h-6 w-6 sm:h-7 sm:w-7" /> : <Mic className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>

          {/* Speaker button */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center transition-all ${
              isSpeakerOn
                ? "bg-white/20 text-white"
                : isDark
                  ? "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {isSpeakerOn ? <Volume2 className="h-6 w-6 sm:h-7 sm:w-7" /> : <VolumeX className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>

          {/* End call button */}
          <button
            onClick={handleEnd}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>

        {/* Subtle branding */}
        <p className={`text-[10px] mt-4 ${isDark ? "text-slate-500" : "text-slate-600"}`}>
          {callerCompany || 'Valtriox'} Secure Call
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Client List Item (Admin View)
// ============================================================================

function ClientListItem({
  client,
  isActive,
  isDark,
  isGold,
  onClick,
}: {
  client: ClientConversation;
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
      <Avatar className={`h-8 w-8 shrink-0 ${getAvatarColor(client.orgName)}`}>
        <AvatarFallback className="text-white text-[10px] font-semibold">
          {getInitials(client.orgName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium truncate ${isActive ? (isDark ? "text-white" : "text-slate-900") : isDark ? "text-slate-300" : "text-slate-600"}`}>
            {client.orgName}
          </span>
          {client.unreadCount > 0 && (
            <Badge className={`h-4 min-w-[16px] text-[9px] px-1 ${isGold ? "bg-amber-500/20 text-amber-400" : "bg-amber-500/20 text-amber-500"}`}>
              {client.unreadCount}
            </Badge>
          )}
        </div>
        {client.lastMessage && (
          <p className={`text-[10px] sm:text-xs truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {client.lastMessage}
          </p>
        )}
        {client.lastMessageTime && (
          <p className={`text-[9px] mt-0.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
            {formatTime(client.lastMessageTime)}
          </p>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Main SupportChatPage Component
// ============================================================================

export function SupportChatPage() {
  const { user, appTheme, organization } = useValtrioxStore();
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;

  const isDark = appTheme === "premium-dark" || appTheme === "dark";
  const isGold = appTheme === "premium-dark";
  const accentClass = isGold ? "text-amber-500" : "text-amber-500";
  const accentBg = isGold ? "bg-amber-500/15" : "bg-amber-500/15";

  // Admin vs Client detection
  const userRole = user?.role || "viewer";
  const isAdmin = userRole === "platform_owner" || userRole === "platform_admin" || userRole === "owner";

  const orgId = organization?.id || "default";
  const orgName = organization?.name || "My Brand";

  // Fetch company email for client view (hide personal email)
  const [companyEmail, setCompanyEmail] = useState("support@valtriox.pk");
  useEffect(() => {
    if (!isAdmin) {
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data?.settings?.companyEmail) setCompanyEmail(data.settings.companyEmail);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Admin state: active client conversation
  const [activeClientOrgId, setActiveClientOrgId] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Message input
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Attachment state
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);

  // Call state
  const [callActive, setCallActive] = useState(false);
  const [callTarget, setCallTarget] = useState("");

  useEffect(() => {
    setCallTarget(`${companyName} Support`);
  }, [companyName]);

  // ---------------------------------------------------------------------------
  // Server-backed state (API instead of localStorage)
  // ---------------------------------------------------------------------------

  const [messagesMap, setMessagesMap] = useState<Record<string, SupportMessage[]>>({});

  // Admin: client conversation list
  const [clientList, setClientList] = useState<ClientConversation[]>([]);
  // Tracks the DB conversation ID for each orgId (admin uses this for API calls)
  const [conversationIdMap, setConversationIdMap] = useState<Record<string, string>>({});
  // Client's own conversation ID
  const [clientConversationId, setClientConversationId] = useState<string | null>(null);

  // Current messages
  const currentConversationId = isAdmin ? activeClientOrgId : orgId;
  const currentMessages = currentConversationId ? (messagesMap[currentConversationId] || []) : [];

  // ── Fetch conversations (admin only) ──
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/support-chat?mode=conversations");
      if (!res.ok) return;
      const data = await res.json();
      const conversations: ClientConversation[] = (data.conversations || []).map((c: any) => ({
        orgId: c.orgId,
        orgName: c.orgName,
        lastMessage: c.lastMessage,
        lastMessageTime: c.lastMessageTime,
        unreadCount: c.unreadCount,
      }));
      setClientList(conversations);
      // Build conversationIdMap from the API response
      const idMap: Record<string, string> = {};
      (data.conversations || []).forEach((c: any) => {
        if (c.id && c.orgId) idMap[c.orgId] = c.id;
      });
      setConversationIdMap((prev) => ({ ...prev, ...idMap }));
    } catch {}
  }, []);

  // ── Fetch messages for a specific conversation ──
  const fetchMessages = useCallback(async (convId: string | null) => {
    if (!convId) return;
    try {
      let params: string;
      if (isAdmin) {
        // convId for admin is orgId — resolve to DB conversation ID
        const dbConvId = conversationIdMap[convId];
        if (!dbConvId) return;
        params = `?conversationId=${dbConvId}`;
      } else {
        params = `?mode=messages`;
      }
      const res = await fetchWithAuth(`/api/support-chat${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const messages: SupportMessage[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar,
        senderRole: m.senderRole,
        content: m.content,
        timestamp: m.timestamp,
        type: m.type,
        attachment: m.attachment,
        voiceNote: m.voiceNote,
        callInfo: m.callInfo,
      }));
      // Always key by orgId so currentConversationId lookup works
      setMessagesMap((prev) => ({ ...prev, [convId]: messages }));
    } catch {}
  }, [isAdmin, conversationIdMap]);

  // ── Send message via API ──
  const sendMessage = useCallback(async (targetConvId: string | null, msg: SupportMessage, orgNameOverride?: string) => {
    if (!targetConvId) return null;
    try {
      const payload: any = {
        conversationId: isAdmin ? targetConvId : undefined,
        content: msg.content,
        messageType: msg.type,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        orgName: orgNameOverride,
      };
      if (msg.attachment) payload.attachment = msg.attachment;
      if (msg.voiceNote) payload.voiceNote = msg.voiceNote;
      if (msg.callInfo) payload.callInfo = msg.callInfo;

      const res = await fetchWithAuth("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        console.error("[SupportChat] Send failed:", res.status, res.statusText);
        return null;
      }
      const data = await res.json();
      const savedMsg: SupportMessage = {
        id: data.message.id,
        senderId: data.message.senderId,
        senderName: data.message.senderName,
        senderAvatar: data.message.senderAvatar,
        senderRole: data.message.senderRole,
        content: data.message.content,
        timestamp: data.message.timestamp,
        type: data.message.type,
        attachment: data.message.attachment,
        voiceNote: data.message.voiceNote,
        callInfo: data.message.callInfo,
      };
      // Optimistically add to local state
      setMessagesMap((prev) => {
        const existing = prev[targetConvId] || [];
        return { ...prev, [targetConvId]: [...existing, savedMsg] };
      });
      return savedMsg;
    } catch {
      return null;
    }
  }, [isAdmin]);

  // ── Delete message via API ──
  const deleteMessage = useCallback(async (targetConvId: string | null, messageId: string) => {
    if (!targetConvId) return;
    try {
      await fetchWithAuth(`/api/support-chat?messageId=${messageId}&conversationId=${targetConvId}`, {
        method: "DELETE",
      });
      // Remove from local state and add system message
      setMessagesMap((prev) => {
        const existing = prev[targetConvId] || [];
        const filtered = existing.filter((m) => m.id !== messageId);
        const systemMsg: SupportMessage = {
          id: `sys-${Date.now()}`,
          senderId: "system",
          senderName: "System",
          senderRole: "system",
          content: "A message was deleted",
          timestamp: Date.now(),
          type: "system",
        };
        return { ...prev, [targetConvId]: [...filtered, systemMsg] };
      });
    } catch {}
  }, []);

  // ── Initial load ──
  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
    } else if (orgId) {
      fetchMessages(orgId);
    }
  }, [isAdmin, orgId, fetchConversations, fetchMessages]);

  // ── Admin: fetch messages when selecting a client ──
  useEffect(() => {
    if (isAdmin && activeClientOrgId) {
      // conversationIdMap might not have the ID yet; try fetch, or refresh first
      const convId = conversationIdMap[activeClientOrgId];
      if (convId) {
        fetchMessages(activeClientOrgId);
      } else {
        // Fetch conversations first to populate conversationIdMap, then fetch messages
        fetchConversations().then(() => {
          fetchMessages(activeClientOrgId);
        });
      }
    }
  }, [isAdmin, activeClientOrgId, conversationIdMap, fetchConversations, fetchMessages]);

  // ── Poll for new messages every 5 seconds ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAdmin) {
        fetchConversations();
        if (activeClientOrgId && conversationIdMap[activeClientOrgId]) {
          fetchMessages(activeClientOrgId);
        }
      } else if (orgId) {
        fetchMessages(orgId);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isAdmin, activeClientOrgId, orgId, conversationIdMap, fetchConversations, fetchMessages]);

  // Filtered messages (search)
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return currentMessages;
    const q = searchQuery.toLowerCase();
    return currentMessages.filter((m) => m.content.toLowerCase().includes(q));
  }, [currentMessages, searchQuery]);

  // Create base message (uses ADMIN_ID for admin, user for client)
  const createBaseMessage = useCallback((senderOrgId?: string): Omit<SupportMessage, "id" | "type" | "content" | "timestamp"> => {
    if (isAdmin) {
      return {
        senderId: ADMIN_ID,
        senderName: `${companyName} Support`,
        senderRole: "platform_admin",
      };
    }
    return {
      senderId: user?.id || "user-1",
      senderName: user?.name || orgName || "You",
      senderAvatar: user?.image,
      senderRole: user?.role || "brand_owner",
    };
  }, [isAdmin, user, orgName]);

  // File to base64
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Update client list entry (admin side) — now handled by the API via polling,
  // but we also update locally for immediate feedback
  const updateClientListEntry = useCallback((_clientOrgId: string, _lastMsg: string, _time: number) => {
    // No-op — the conversation list is refreshed via API polling
    // Kept for backward compatibility with call handlers that reference this
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
    if (file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setAttachmentPreview(preview);
    } else {
      setAttachmentPreview(undefined);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeAttachment = useCallback(() => {
    setPendingAttachment(null);
    setAttachmentPreview(undefined);
  }, []);

  // Get the target orgId for sending messages
  const getTargetOrgId = useCallback((): string | null => {
    if (isAdmin) {
      return activeClientOrgId;
    }
    return orgId;
  }, [isAdmin, activeClientOrgId, orgId]);

  // Send text/attachment message
  const handleSend = useCallback(async () => {
    const targetId = getTargetOrgId();
    if (!targetId) return;

    const hasText = messageInput.trim().length > 0;
    const hasAttachment = pendingAttachment !== null;

    if (!hasText && !hasAttachment) return;

    const base = createBaseMessage(targetId);

    // Get the DB conversation ID for admin
    const dbConvId = isAdmin ? conversationIdMap[targetId] : targetId;

    let sendSuccess = false;

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
        const msg: SupportMessage = {
          ...base,
          id: generateId(),
          content: messageInput.trim(),
          timestamp: Date.now(),
          type: "attachment",
          attachment,
        };
        const result = await sendMessage(dbConvId, msg, isAdmin ? undefined : orgName);
        if (result) sendSuccess = true;
      } catch {
        // Failed to process file
      }
      if (sendSuccess) {
        setPendingAttachment(null);
        setAttachmentPreview(undefined);
      }
    }

    if (hasText && !hasAttachment) {
      const msg: SupportMessage = {
        ...base,
        id: generateId(),
        content: messageInput.trim(),
        timestamp: Date.now(),
        type: "text",
      };
      const result = await sendMessage(dbConvId, msg, isAdmin ? undefined : orgName);
      if (result) sendSuccess = true;
    }

    if (sendSuccess) {
      setMessageInput("");
    }
  }, [messageInput, pendingAttachment, createBaseMessage, sendMessage, fileToBase64, getTargetOrgId, isAdmin, conversationIdMap, orgName]);

  // Handle voice note stop
  const handleVoiceStop = useCallback(async (blob: Blob) => {
    const targetId = getTargetOrgId();
    if (!targetId) {
      setIsRecording(false);
      return;
    }

    const dbConvId = isAdmin ? conversationIdMap[targetId] : targetId;

    const url = await fileToBase64(blob);
    const base = createBaseMessage(targetId);

    // Get duration from audio metadata
    const getDuration = (): Promise<number> => {
      return new Promise((resolve) => {
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => resolve(tempAudio.duration || 0);
        tempAudio.onerror = () => resolve(0);
        setTimeout(() => resolve(0), 3000); // Fallback timeout
      });
    };

    const dur = await getDuration();
    const msg: SupportMessage = {
      ...base,
      id: generateId(),
      content: "",
      timestamp: Date.now(),
      type: "voice",
      voiceNote: {
        id: generateId(),
        url,
        duration: dur,
      },
    };

    await sendMessage(dbConvId, msg);
    setIsRecording(false);
  }, [createBaseMessage, sendMessage, fileToBase64, getTargetOrgId, isAdmin, conversationIdMap]);

  // Delete a message
  const handleDeleteMessage = useCallback((messageId: string) => {
    const targetId = getTargetOrgId();
    if (!targetId) return;

    const dbConvId = isAdmin ? conversationIdMap[targetId] : targetId;
    deleteMessage(dbConvId, messageId);
  }, [deleteMessage, getTargetOrgId, isAdmin, conversationIdMap]);

  // Call handlers
  const handleStartCall = useCallback(() => {
    if (isAdmin && activeClientOrgId) {
      const client = clientList.find((c) => c.orgId === activeClientOrgId);
      setCallTarget(client?.orgName || "Client");
    } else {
      setCallTarget(`${companyName} Support`);
    }
    setCallActive(true);
  }, [isAdmin, activeClientOrgId, clientList]);

  const handleEndCall = useCallback((duration: number) => {
    const targetId = getTargetOrgId();
    if (targetId && duration > 0) {
      const dbConvId = isAdmin ? conversationIdMap[targetId] : targetId;
      const callMsg: SupportMessage = {
        id: generateId(),
        senderId: "system",
        senderName: "System",
        senderRole: "system",
        content: `Voice call ended \u2014 duration: ${formatDuration(duration)}`,
        timestamp: Date.now(),
        type: "call",
        callInfo: { duration, type: "outgoing" },
      };
      sendMessage(dbConvId, callMsg);
    }

    setCallActive(false);
  }, [getTargetOrgId, sendMessage, isAdmin, callTarget, conversationIdMap]);

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
    const senderId = isAdmin ? ADMIN_ID : (user?.id || "user-1");
    const groups: Array<{ message: SupportMessage; isLastInGroup: boolean; isOwn: boolean }> = [];
    for (let i = 0; i < filteredMessages.length; i++) {
      const msg = filteredMessages[i];
      const prev = filteredMessages[i - 1];
      const isOwn = msg.senderId === senderId;
      const sameSender = prev && prev.senderId === msg.senderId && (msg.timestamp - prev.timestamp) < 120000;
      groups.push({
        message: msg,
        isLastInGroup: !sameSender,
        isOwn,
      });
    }
    return groups;
  }, [filteredMessages, isAdmin, user?.id]);

  // Determine chat header name
  const chatPartnerName = isAdmin
    ? (clientList.find((c) => c.orgId === activeClientOrgId)?.orgName || "Select a client")
    : `${companyName} Support`;

  // Sort client list by last message time
  const sortedClientList = useMemo(() => {
    return [...clientList].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  }, [clientList]);

  // ---------------------------------------------------------------------------
  // Render: Admin View
  // ---------------------------------------------------------------------------

  if (isAdmin) {
    return (
      <>
        <div className={`h-[calc(100vh-8rem)] sm:h-[calc(100vh-6rem)] flex flex-col sm:flex-row gap-0 overflow-hidden rounded-xl border ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200"}`}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileChange}
          />

          {/* Client List Sidebar */}
          <div
            className={`w-full sm:w-64 lg:w-72 shrink-0 flex flex-col border-r ${
              isDark ? "border-white/[0.06]" : "border-slate-200"
            } ${mobileShowChat ? "hidden sm:flex" : "flex"}`}
          >
            {/* Admin header */}
            <div className={`px-4 py-3 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${accentClass}`} />
                  <h2 className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Admin Support
                  </h2>
                </div>
                <Badge variant="secondary" className={`text-[9px] px-1.5 ${accentBg} ${accentClass}`}>
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  Admin
                </Badge>
              </div>
              <p className={`text-[10px] mt-1.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                Manage client support conversations
              </p>
            </div>

            {/* Search clients */}
            <div className={`px-3 py-2 border-b ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isDark ? "bg-white/[0.04]" : "bg-slate-50"}`}>
                <Search className={`h-3.5 w-3.5 ${isDark ? "text-slate-400" : "text-slate-400"}`} />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent text-xs outline-none w-full ${isDark ? "text-slate-300 placeholder:text-slate-500" : "text-slate-600 placeholder:text-slate-400"}`}
                />
              </div>
            </div>

            {/* Client list */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-0.5">
                <p className={`text-[9px] font-semibold uppercase tracking-wider px-3 py-1.5 ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                  Client Conversations
                </p>
                {sortedClientList.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                      No client conversations yet.
                    </p>
                    <p className={`text-[10px] mt-1 ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                      Clients will appear here when they message support.
                    </p>
                  </div>
                )}
                {sortedClientList.map((client) => (
                  <ClientListItem
                    key={client.orgId}
                    client={client}
                    isActive={activeClientOrgId === client.orgId}
                    isDark={isDark}
                    isGold={isGold}
                    onClick={() => {
                      setActiveClientOrgId(client.orgId);
                      setSearchQuery("");
                      setMobileShowChat(true);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className={`px-4 py-2.5 border-t ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <Shield className={`h-3.5 w-3.5 ${isDark ? "text-slate-400" : "text-slate-400"}`} />
                <span className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {sortedClientList.length} client conversation{sortedClientList.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col min-w-0 ${mobileShowChat ? "flex" : "hidden sm:flex"}`}>
            {activeClientOrgId ? (
              <>
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
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${getAvatarColor(chatPartnerName)}`}>
                      <span className="text-white text-[10px] font-semibold">{getInitials(chatPartnerName)}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                        {chatPartnerName}
                      </h3>
                      <p className={`text-[9px] sm:text-[10px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Client Support Conversation
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                    onClick={handleStartCall}
                    title="Call client"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages area */}
                <ScrollArea className="flex-1">
                  <div className="px-3 sm:px-4 py-4 space-y-1">
                    {/* Welcome */}
                    <div className="flex flex-col items-center py-6 sm:py-10">
                      <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center mb-3 ${accentBg}`}>
                        <Shield className={`h-6 w-6 sm:h-7 sm:w-7 ${accentClass}`} />
                      </div>
                      <h3 className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {chatPartnerName}
                      </h3>
                      <p className={`text-[10px] sm:text-xs mt-1 max-w-[280px] text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        Admin support conversation. Messages are private between you and this client.
                      </p>
                    </div>

                    {groupedMessages.length > 0 && (
                      <div className="flex flex-col">
                        {groupedMessages.map((group) => (
                          <SupportMessageBubble
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
                  <AnimatePresence>
                    {isRecording && (
                      <VoiceRecordingBar
                        isRecording={isRecording}
                        isDark={isDark}
                        isGold={isGold}
                        onCancel={() => setIsRecording(false)}
                        onStop={handleVoiceStop}
                      />
                    )}
                  </AnimatePresence>

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

                  {!isRecording && (
                    <div className={`flex items-end gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border ${
                      isDark
                        ? "bg-white/[0.04] border-white/[0.08] focus-within:border-white/[0.15]"
                        : "bg-slate-50 border-slate-200 focus-within:border-slate-300"
                    } transition-colors`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                        onClick={handleFileSelect}
                        title="Attach file"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>

                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Message ${chatPartnerName}...`}
                        rows={1}
                        className={`flex-1 bg-transparent text-xs sm:text-sm outline-none resize-none max-h-24 ${isDark ? "text-slate-200 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`}
                        style={{ minHeight: "24px" }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = Math.min(target.scrollHeight, 96) + "px";
                        }}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                        onClick={() => setIsRecording(true)}
                        title="Record voice note"
                      >
                        <Mic className="h-4 w-4" />
                      </Button>

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
                        Private admin-to-client channel
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                        Files up to 20MB
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No client selected */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${accentBg}`}>
                    <MessageCircle className={`w-8 h-8 ${accentClass}`} />
                  </div>
                  <h3 className={`text-base font-bold mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                    Admin Support Panel
                  </h3>
                  <p className={`text-xs max-w-[300px] mx-auto ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Select a client from the list to view and manage their support conversation. You can send messages, attachments, voice notes, and initiate calls.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call Overlay */}
        <AnimatePresence>
          {callActive && (
            <CallOverlay
              isDark={isDark}
              isGold={isGold}
              callerName={callTarget}
              companyName={companyName}
              isActive={callActive}
              onEnd={handleEndCall}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Client View
  // ---------------------------------------------------------------------------

  return (
    <>
      <div className={`h-[calc(100vh-8rem)] sm:h-[calc(100vh-6rem)] flex flex-col overflow-hidden rounded-xl border ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-white border-slate-200"}`}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={handleFileChange}
        />

        {/* Chat header */}
        <div className={`px-3 sm:px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-white/[0.06]" : "border-slate-200"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 ${isGold ? "bg-amber-500/20" : "bg-amber-500/20"}`}>
              <Shield className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${accentClass}`} />
            </div>
            <div className="min-w-0">
              <h3 className={`text-sm sm:text-base font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                {`${companyName} Support`}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <p className={`text-[9px] sm:text-[10px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Online &middot; {companyEmail}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
              onClick={handleStartCall}
              title="Call support"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="px-3 sm:px-4 py-4 space-y-1">
            {/* Welcome */}
            <div className="flex flex-col items-center py-6 sm:py-10">
              <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center mb-3 ${accentBg}`}>
                <Shield className={`h-7 w-7 sm:h-8 sm:w-8 ${accentClass}`} />
              </div>
              <h3 className={`text-base sm:text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                {`${companyName} Support`}
              </h3>
              <p className={`text-[10px] sm:text-xs mt-1 max-w-[300px] text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Welcome! Need help with anything? Send us a message and our team will respond shortly. You can also share files, voice notes, or give us a call.
              </p>
              <div className={`flex items-center gap-3 mt-4`}>
                <Badge variant="secondary" className={`text-[9px] px-2 py-0.5 ${accentBg} ${accentClass}`}>
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  Private
                </Badge>
                <Badge variant="secondary" className={`text-[9px] px-2 py-0.5 ${isDark ? "bg-white/[0.06] text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  Avg. 2h response
                </Badge>
              </div>
            </div>

            {groupedMessages.length > 0 && (
              <div className="flex flex-col">
                {groupedMessages.map((group) => (
                  <SupportMessageBubble
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
          <AnimatePresence>
            {isRecording && (
              <VoiceRecordingBar
                isRecording={isRecording}
                isDark={isDark}
                isGold={isGold}
                onCancel={() => setIsRecording(false)}
                onStop={handleVoiceStop}
              />
            )}
          </AnimatePresence>

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

          {!isRecording && (
            <div className={`flex items-end gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border ${
              isDark
                ? "bg-white/[0.04] border-white/[0.08] focus-within:border-white/[0.15]"
                : "bg-slate-50 border-slate-200 focus-within:border-slate-300"
            } transition-colors`}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                onClick={handleFileSelect}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${companyName} Support...`}
                rows={1}
                className={`flex-1 bg-transparent text-xs sm:text-sm outline-none resize-none max-h-24 ${isDark ? "text-slate-200 placeholder:text-slate-500" : "text-slate-700 placeholder:text-slate-400"}`}
                style={{ minHeight: "24px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 96) + "px";
                }}
              />

              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                onClick={() => setIsRecording(true)}
                title="Record voice note"
              >
                <Mic className="h-4 w-4" />
              </Button>

              {/* Call button */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 w-8 p-0 shrink-0 ${isDark ? "text-slate-500 hover:text-slate-300 hover:bg-white/[0.06]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
                onClick={handleStartCall}
                title="Call support"
              >
                <Phone className="h-4 w-4" />
              </Button>

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
                Private support channel &mdash; Valtriox team only
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] ${isDark ? "text-slate-700" : "text-slate-300"}`}>
                Files up to 20MB &middot; Voice notes &middot; Calls
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Call Overlay */}
      <AnimatePresence>
        {callActive && (
          <CallOverlay
            isDark={isDark}
            isGold={isGold}
            callerName={callTarget}
            companyName={companyName}
            isActive={callActive}
            onEnd={handleEndCall}
          />
        )}
      </AnimatePresence>
    </>
  );
}
