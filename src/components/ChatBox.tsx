"use client";

import { useState } from "react";

// message type
type Message = { sender: string; content: string; createdAt?: string };

export default function ChatBox({
  messages,
  onSend,
  userName,
}: {
  messages: Message[];
  onSend: (m: { sender: string; content: string }) => void;
  userName: string;
}) {
  const [msg, setMsg] = useState("");

  // generate color per user
  const getUserColor = (name: string) => {
    const colors = [
      "text-pink-600",
      "text-blue-600",
      "text-green-600",
      "text-yellow-600",
      "text-purple-600",
    ];
    const index =
      Math.abs(name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) %
      colors.length;
    return colors[index];
  };

  const send = () => {
    if (!msg.trim()) return;
    onSend({ sender: userName || "Guest", content: msg });
    setMsg("");
  };

  return (
    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#111]">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) =>
          m.sender.toLowerCase() === "system" ? (
            <div key={i} className="text-center text-xs text-gray-400 italic">
              {m.content}
            </div>
          ) : (
            <div
              key={i}
              className={`flex ${
                m.sender === userName ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                  m.sender === userName
                    ? "bg-pink-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                }`}
              >
                <p
                  className={`text-xs font-semibold mb-1 ${getUserColor(
                    m.sender
                  )}`}
                >
                  {m.sender}
                </p>
                <p className="text-sm break-words">{m.content}</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2 border-t border-slate-200 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-[#111]">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message..."
          className="flex-1 border px-3 py-2 rounded-lg focus:ring-2 focus:ring-pink-500 dark:bg-gray-900"
        />
        <button
          onClick={send}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
