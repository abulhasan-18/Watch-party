"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

export default function JoinRoomPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoinRoom = () => {
    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }
    setLoading(true);

    // Placeholder: validate room code via backend
    setTimeout(() => {
      toast.success(`Joining room: ${roomCode}`, { position: "top-center" });
      router.push(`/room/${roomCode}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0b0b] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-8 shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-pink-600 dark:text-yellow-400 text-center">
          Join a Room 🎉
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mt-2">
          Enter the code to jump into your friends’ watch party.
        </p>

        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Enter Room Code"
          className="mt-6 w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#111] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-pink-500 outline-none"
        />

        <button
          onClick={handleJoinRoom}
          disabled={loading}
          className="mt-4 w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white font-medium transition-colors"
        >
          {loading ? "Joining…" : "Join Room"}
        </button>
      </motion.div>
    </div>
  );
}
