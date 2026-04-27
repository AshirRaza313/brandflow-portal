"use client";

import { useValtrioxStore } from "@/store/brandflow-store";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Bot, Sparkles, Package, FileText, Users, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/brandflow/shared/EmptyState";
import { toast } from "sonner";
import { usePlatformIdentity } from "@/lib/platform-identity";

const quickPrompts = [
  "Write a product description for...",
  "Generate 5 Instagram captions for...",
  "Summarize this month's sales",
  "Suggest pricing strategy for...",
  "Write a WhatsApp broadcast for...",
  "Analyze customer feedback trends",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIAssistantPage() {
  const { appTheme } = useValtrioxStore();
  const isDark = appTheme === "dark" || appTheme === "premium-dark";
  const { identity } = usePlatformIdentity();
  const companyName = identity.companyName;
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "I don't have enough data yet to provide insights. Connect your sales channels and let me analyze your data over time.", timestamp: new Date() };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={isDark ? "text-2xl font-bold text-white" : "text-2xl font-bold text-slate-900"}>AI Assistant</h1>
        <p className="text-sm text-slate-500 mt-1">Powered by AI to help you make smarter decisions</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "chat", label: "Chat" },
          { id: "descriptions", label: "Product Descriptions" },
          { id: "insights", label: "Customer Insights" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={isDark ? `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-300"}` : `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-amber-600 text-amber-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "chat" && (
        <div className="flex flex-col h-[calc(100vh-240px)] min-h-[400px]">
          <Card className="flex-1 flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <EmptyState
                  icon={Bot}
                  title="Start a conversation"
                  description="Ask me anything about your business, products, customers, or marketing strategies."
                />
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-amber-600 text-white rounded-br-sm" : "bg-slate-100 border border-slate-200 rounded-bl-sm"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-600">{companyName} AI</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 border border-slate-200 rounded-xl rounded-bl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                      <span className="text-sm text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {quickPrompts.slice(0, 3).map((prompt) => (
                  <button key={prompt} onClick={() => setInput(prompt)} className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-muted-foreground hover:bg-slate-200 transition-colors">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input placeholder="Ask me anything about your business..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1" />
                <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSend} disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "descriptions" && (
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5 text-amber-600" /> Product Description Generator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium mb-1 block">Product Name</label><Input placeholder="e.g., Vitamin C Brightening Serum" /></div>
            <div><label className="text-sm font-medium mb-1 block">Key Features (comma separated)</label><Input placeholder="e.g., Brightens skin, Reduces dark spots" /></div>
            <div><label className="text-sm font-medium mb-1 block">Tone</label>
              <div className="flex gap-2">
                {["Professional", "Friendly", "Luxury", "Playful"].map((t) => (
                  <button key={t} onClick={() => toast.info(`Tone set to ${t}`)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200">{t}</button>
                ))}
              </div>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => toast.info("Fill in product details to generate a description")}><Sparkles className="mr-2 h-4 w-4" /> Generate Description</Button>
          </CardContent>
        </Card>
      )}

      {activeTab === "insights" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Customer Behavior</CardTitle></CardHeader>
            <CardContent><EmptyState icon={Users} title="No customer insights yet" description="Customer insights will be available once you have sufficient order data." /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-5 w-5 text-amber-500" /> Product Insights</CardTitle></CardHeader>
            <CardContent><EmptyState icon={Package} title="No product insights yet" description="Product insights will be available once you have sufficient sales data." /></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
