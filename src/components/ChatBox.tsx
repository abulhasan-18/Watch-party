"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Copy, Check, MessageSquare } from "lucide-react";

export type Message = {
  id?: string;
  sender: string;
  content: string;
  createdAt?: string; // ISO string
  kind?: "user" | "system";
};

type Props = {
  messages: Message[];
  onSend: (m: { sender: string; content: string }) => void;
  userName: string;
  messagesNewestFirst?: boolean;
  typingUsers?: string[];
  className?: string;
  maxChars?: number;
  onTyping?: (isTyping: boolean) => void;
};

const QUICK_REACTIONS = ["🍿", "🔥", "❤️", "👏", "😂", "🎉", "😱", "🥳"];

export default function ChatBox({
  messages,
  onSend,
  userName,
  messagesNewestFirst = true,
  typingUsers = [],
  className = "",
  maxChars = 1000,
  onTyping,
}: Props) {
  const [msg, setMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // normalize order for rendering (oldest first at top, newest at bottom)
  const ordered = useMemo(() => {
    if (!messages?.length) return [];
    return messagesNewestFirst ? [...messages].reverse() : messages;
  }, [messages, messagesNewestFirst]);

  // auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (nearBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [ordered.length]);

  // textarea autosize
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(120, el.scrollHeight);
    el.style.height = Math.max(38, h) + "px";
  }, [msg]);

  // typing notifier (debounced)
  useEffect(() => {
    if (!onTyping) return;
    if (!isTyping) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1500);
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [isTyping, onTyping, msg]);

  const send = (customText?: string) => {
    const content = (customText !== undefined ? customText : msg).trim();
    if (!content) return;
    onSend({ sender: userName || "Guest", content });
    if (customText === undefined) {
      setMsg("");
    }
    setIsTyping(false);
    onTyping?.(false);
    inputRef.current?.focus();
  };

  const handleCopyMessage = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // color hash for username
  const getUserColor = (name: string) => {
    const palette = [
      "from-pink-500 to-rose-600",
      "from-blue-500 to-indigo-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-purple-500 to-fuchsia-600",
      "from-cyan-500 to-sky-600",
      "from-violet-500 to-purple-600",
    ];
    const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
    return palette[sum % palette.length];
  };

  // initials for avatar
  const initials = (s: string) =>
    s
      .trim()
      .split(/\s+/)
      .map((x) => x[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const overLimit = msg.length > maxChars;
  const nearLimit = !overLimit && msg.length > maxChars * 0.9;

  return (
    <div
      className={
        "flex flex-col h-full bg-slate-900/90 text-slate-100 " + className
      }
    >
      {/* Messages Scroll Area */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10"
      >
        {ordered.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Room Chat</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              Be the first to say hi or react with emojis!
            </p>
          </div>
        ) : (
          ordered.map((m, i) => {
            const isMe = m.sender === userName;
            const messageId = m.id || String(i);

            if (m.kind === "system" || m.sender.toLowerCase() === "system") {
              return (
                <div
                  key={messageId}
                  className="flex items-center justify-center my-2"
                >
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-400">
                    {m.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={messageId}
                className={`flex gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getUserColor(
                      m.sender
                    )} text-white font-bold grid place-items-center text-[10px] shrink-0 shadow-sm`}
                    title={m.sender}
                  >
                    {initials(m.sender)}
                  </div>
                )}

                <div
                  className={`group relative max-w-[82%] px-3.5 py-2.5 rounded-2xl shadow-sm transition-all ${
                    isMe
                      ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-br-xs"
                      : "bg-slate-800/90 border border-white/10 text-slate-100 rounded-bl-xs"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[11px] font-semibold tracking-tight ${
                        isMe ? "text-pink-100" : "text-slate-300"
                      }`}
                    >
                      {isMe ? "You" : m.sender}
                    </span>
                    {m.createdAt && (
                      <span
                        className={`text-[10px] ${
                          isMe ? "text-pink-200/80" : "text-slate-400"
                        }`}
                      >
                        {fmtTime(m.createdAt)}
                      </span>
                    )}

                    {/* Quick copy on hover */}
                    <button
                      onClick={() => handleCopyMessage(messageId, m.content)}
                      className={`ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded transition ${
                        isMe ? "hover:bg-white/20" : "hover:bg-white/10"
                      }`}
                      title="Copy text"
                    >
                      {copiedId === messageId ? (
                        <Check className="w-3 h-3 text-emerald-300" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-300" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                </div>

                {isMe && (
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getUserColor(
                      userName
                    )} text-white font-bold grid place-items-center text-[10px] shrink-0 shadow-sm`}
                    title={userName}
                  >
                    {initials(userName)}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-[11px] text-pink-400 italic px-2 animate-pulse">
            {typingUsers.slice(0, 2).join(", ")}
            {typingUsers.length > 2 ? " and others" : ""} typing…
          </div>
        )}
      </div>

      {/* Quick Reaction Bar */}
      <div className="px-3 py-1.5 border-t border-white/10 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mr-1 shrink-0">
          React:
        </span>
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => send(emoji)}
            className="px-2 py-0.5 rounded-lg text-sm bg-white/5 hover:bg-pink-500/20 hover:scale-110 active:scale-95 border border-white/5 transition"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-white/10 bg-slate-950/80">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={msg}
            onChange={(e) => {
              setMsg(e.target.value);
              if (!isTyping) {
                setIsTyping(true);
                onTyping?.(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!overLimit) send();
              }
            }}
            placeholder="Type a message or press Enter…"
            rows={1}
            className={`flex-1 resize-none rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 shadow-inner outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 ${
              overLimit ? "border-red-500 focus:ring-red-500/20" : ""
            }`}
          />
          <button
            onClick={() => send()}
            disabled={!msg.trim() || overLimit}
            className={`h-[38px] px-3.5 rounded-xl text-white font-medium inline-flex items-center justify-center transition-all shadow-md shadow-pink-600/20 ${
              !msg.trim() || overLimit
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-pink-600 hover:bg-pink-500 active:scale-95"
            }`}
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-1.5 flex justify-between text-[10px] text-slate-500 px-1">
          <span>Enter ↵ to send • Shift+Enter for newline</span>
          <span
            className={
              overLimit
                ? "text-red-400 font-semibold"
                : nearLimit
                ? "text-amber-400"
                : "text-slate-500"
            }
          >
            {msg.length}/{maxChars}
          </span>
        </div>
      </div>
    </div>
  );
}
