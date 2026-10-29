"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, X, Send, Bot, User, Sparkles, ChevronDown, PhoneCall, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatbotMessage } from "@/lib/ai/types";
import { ChatSessionState } from "@/lib/ai/chatbot";

export function ComplainantChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatbotMessage[]>([
    {
      id: "init-1",
      sender: "bot",
      text: "Namaste! I am the Samanvay 24x7 Citizen Assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
      quick_replies: ["File a complaint", "Track grievance status", "Fee refund rules", "Talk to human officer"],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [sessionState, setSessionState] = useState<ChatSessionState>({ step: "idle", draft: {} });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    // Append user message
    const userMsg: ChatbotMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, state: sessionState }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages((prev) => [...prev, data.reply]);
        if (data.state) setSessionState(data.state);
      }
    } catch (err) {
      console.error("Chatbot request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-13 w-13 items-center justify-center rounded-full bg-blue-900 text-white shadow-xl hover:bg-blue-800 hover:scale-105 active:scale-95 transition-all ring-4 ring-blue-900/20"
          aria-label="Open 24x7 Grievance Assistant"
        >
          <MessageSquare className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            AI
          </span>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="flex h-[520px] w-[370px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-blue-900/20 bg-blue-950 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20 text-orange-400">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Samanvay Citizen Helpdesk</p>
                <p className="text-[10px] text-blue-200">24x7 AI Assistance & Status Check</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Container */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                      isUser
                        ? "bg-blue-900 text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                    }`}
                  >
                    {m.text}

                    {/* Action link if available */}
                    {m.action_link && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <Link
                          href={m.action_link.url}
                          className="inline-flex items-center gap-1 rounded bg-blue-100 text-blue-900 px-2 py-1 text-[11px] font-bold hover:bg-blue-200 transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          {m.action_link.label} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Quick Replies */}
                  {m.quick_replies && m.quick_replies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.quick_replies.map((qr, idx) => (
                        <button
                          key={idx}
                          className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-blue-800 border border-blue-200 hover:bg-blue-50 transition-colors"
                          onClick={() => handleSend(qr)}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 p-2">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span>Assistant is typing...</span>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }}
            className="border-t border-slate-200 bg-white p-2.5 flex items-center gap-2"
          >
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask a question or enter tracking ID..."
              className="h-8.5 text-xs"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !inputText.trim()}
              className="h-8.5 w-8.5 p-0 bg-blue-900 hover:bg-blue-800 text-white shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
