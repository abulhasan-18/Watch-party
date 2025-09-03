"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

export default function CreateRoomPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async () => {
    setLoading(true);
    try {
      // Placeholder: call backend / supabase to create a room
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      toast.success(`Room created! Code: ${roomCode}`, {
        position: "top-center",
      });

      // Redirect user to the new room (replace with your logic)
      setTimeout(() => router.push(`/room/${roomCode}`), 1200);
    } catch (error) {
      toast.error("Failed to create room. Try again.");
    } finally {
      setLoading(false);
    }
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
          Create a New Room 🍿
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mt-2">
          Start a fresh watch party and share the code with your friends.
        </p>

        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="mt-6 w-full py-3 rounded-xl bg-pink-600 hover:bg-pink-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white font-medium transition-colors"
        >
          {loading ? "Creating Room…" : "Create Room"}
        </button>
      </motion.div>
    </div>
  );
}
