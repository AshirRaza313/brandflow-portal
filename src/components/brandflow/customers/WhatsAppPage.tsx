"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useBrandOnyxStore } from "@/store/brandflow-store";

export function WhatsAppPage() {
  const { setActiveSection } = useBrandOnyxStore();
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">WhatsApp Messages</h1>
        <p className="text-sm text-slate-500 mt-1">Manage customer conversations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border rounded-xl overflow-hidden h-[calc(100vh-180px)] min-h-[300px] sm:min-h-[500px]">
        {/* Conversation List - Empty */}
        <div className="border-r bg-white flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">No conversations yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs">Connect WhatsApp Business to start messaging</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setActiveSection("whatsapp-integration"); toast.info("Navigate to WhatsApp Integration to connect"); }}>
                Connect WhatsApp
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Area - Empty */}
        <div className="lg:col-span-2 flex flex-col bg-slate-50">
          <div className="flex items-center justify-between p-3 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted/100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground/60">Select a conversation</h3>
                <p className="text-xs text-muted-foreground/60">Choose a conversation from the left</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground">Select a conversation to start messaging</p>
          </div>

          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <Input placeholder="Type a message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1" disabled onKeyDown={(e) => { if (e.key === "Enter" && messageText) { setMessageText(""); toast.success("Message sent!"); } }} />
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!messageText} onClick={() => { if (messageText) { setMessageText(""); toast.success("Message sent!"); } }}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
