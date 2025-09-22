"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  /** If your list is newest-first (your current setup), leave true. If oldest-first, set false. */
  messagesNewestFirst?: boolean;
  /** Optional typing indicator names */
  typingUsers?: string[];
  /** Optional outer className */
  className?: string;
  /** Max chars in input before warning (soft) */
  maxChars?: number;
  /** Called on user typing (to emit presence typing) */
  onTyping?: (isTyping: boolean) => void;
};

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
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<any>(null);

  // normalize order for rendering
  const ordered = useMemo(() => {
    if (!messages?.length) return [];
    return messagesNewestFirst ? [...messages].reverse() : messages;
  }, [messages, messagesNewestFirst]);

  // auto-scroll to bottom when new messages arrive (respect user if near bottom)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // if we’re within 120px of bottom, snap to bottom on new message
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      // next tick so DOM paints first
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
    const h = Math.min(160, el.scrollHeight);
    el.style.height = h + "px";
  }, [msg]);

  // typing notifier (debounced)
  useEffect(() => {
    if (!onTyping) return;
    if (!isTyping) return;
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1500);
    return () => clearTimeout(typingTimerRef.current);
  }, [isTyping, onTyping, msg]);

  const send = () => {
    const content = msg.trim();
    if (!content) return;
    onSend({ sender: userName || "Guest", content });
    setMsg("");
    setIsTyping(false);
    onTyping?.(false);
    inputRef.current?.focus();
  };

  // color hash for username (stable)
  const getUserColor = (name: string) => {
    const palette = [
      "bg-pink-600",
      "bg-blue-600",
      "bg-green-600",
      "bg-yellow-600",
      "bg-purple-600",
      "bg-amber-600",
      "bg-rose-600",
      "bg-sky-600",
      "bg-teal-600",
      "bg-indigo-600",
    ] as const;
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
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const overLimit = msg.length > maxChars;
  const nearLimit = !overLimit && msg.length > maxChars * 0.9;

  return (
    <div
      className={
        "w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111] " +
        className
      }
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-full text-white grid place-items-center text-xs ${getUserColor(
              userName || "Guest"
            )}`}
          >
            {initials(userName || "G")}
          </div>
          <div className="truncate">
            <div className="text-sm font-semibold truncate">
              {userName || "Guest"}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Press Enter to send · Shift+Enter for newline
            </div>
          </div>
        </div>
        {/* Copy all (optional UX) */}
        <button
          className="text-xs px-2 py-1 rounded border hover:bg-slate-50 dark:hover:bg-slate-900"
          onClick={() => {
            const text = ordered
              .map((m) => `[${fmtTime(m.createdAt)}] ${m.sender}: ${m.content}`)
              .join("\n");
            navigator.clipboard.writeText(text);
          }}
          title="Copy chat"
        >
          Copy
        </button>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {ordered.map((m, i) =>
          m.kind === "system" || m.sender.toLowerCase() === "system" ? (
            <div
              key={m.id ?? i}
              className="text-center text-[11px] text-slate-500 italic select-none"
            >
              {m.content}
            </div>
          ) : (
            <div
              key={m.id ?? i}
              className={`flex ${
                m.sender === userName ? "justify-end" : "justify-start"
              }`}
            >
              <div className="flex items-end gap-2 max-w-[80%]">
                {/* Avatar on left for others */}
                {m.sender !== userName && (
                  <div
                    className={`w-7 h-7 rounded-full text-white grid place-items-center text-[10px] flex-shrink-0 ${getUserColor(
                      m.sender
                    )}`}
                    title={m.sender}
                  >
                    {initials(m.sender)}
                  </div>
                )}

                <div
                  className={`group px-3 py-2 rounded-2xl shadow-sm ${
                    m.sender === userName
                      ? "bg-pink-600 text-white rounded-br-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[11px] font-semibold leading-none ${
                        m.sender === userName ? "opacity-90" : "opacity-80"
                      }`}
                    >
                      {m.sender === userName ? "You" : m.sender}
                    </p>
                    {m.createdAt && (
                      <span
                        className={`text-[10px] ${
                          m.sender === userName ? "opacity-80" : "opacity-60"
                        }`}
                        title={new Date(m.createdAt).toLocaleString()}
                      >
                        {fmtTime(m.createdAt)}
                      </span>
                    )}
                    {/* copy on hover */}
                    <button
                      className={`ml-auto hidden group-hover:inline-block text-[10px] px-1 py-0.5 rounded ${
                        m.sender === userName
                          ? "bg-white/20"
                          : "bg-black/10 dark:bg-white/10"
                      }`}
                      onClick={() => navigator.clipboard.writeText(m.content)}
                      title="Copy message"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                </div>

                {/* Avatar on right for you */}
                {m.sender === userName && (
                  <div
                    className={`w-7 h-7 rounded-full text-white grid place-items-center text-[10px] flex-shrink-0 ${getUserColor(
                      m.sender
                    )}`}
                    title={m.sender}
                  >
                    {initials(m.sender)}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {/* Typing indicator */}
        {!!typingUsers.length && (
          <div className="text-[11px] text-slate-500 italic px-2">
            {typingUsers.slice(0, 3).join(", ")}
            {typingUsers.length > 3 ? " and others" : ""} typing…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111]">
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
            placeholder="Message…"
            rows={1}
            className={`flex-1 resize-none border px-3 py-2 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-900 dark:text-gray-100 ${
              overLimit ? "border-red-400 focus:ring-red-500" : ""
            }`}
          />
          <button
            onClick={send}
            disabled={!msg.trim() || overLimit}
            className={`px-4 py-2 rounded-lg text-white transition ${
              !msg.trim() || overLimit
                ? "bg-pink-400/60 cursor-not-allowed"
                : "bg-pink-600 hover:bg-pink-700"
            }`}
            title="Send"
          >
            Send
          </button>
        </div>
        <div className="mt-1 flex justify-between text-[11px]">
          <span className="text-slate-500">
            Enter ↵ to send · Shift+Enter for newline
          </span>
          <span
            className={`${
              overLimit
                ? "text-red-500"
                : nearLimit
                ? "text-amber-600"
                : "text-slate-500"
            }`}
          >
            {msg.length}/{maxChars}
          </span>
        </div>
      </div>
    </div>
  );
}
