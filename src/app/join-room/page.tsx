"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, LogIn, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const LS_ROOM_META = "wp.roomMeta";

export default function JoinRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  const canJoin = name.trim().length >= 2 && roomCode.trim().length >= 4;

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canJoin || loading) return;

    setLoading(true);
    try {
      const code = roomCode.trim().toUpperCase();
      const trimmedName = name.trim();

      // Check if room exists in Supabase
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("id", code)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("No active room found with that code. Please check and try again.");
        setLoading(false);
        return;
      }

      // Save user metadata
      localStorage.setItem(
        LS_ROOM_META,
        JSON.stringify({
          role: "guest",
          name: trimmedName,
          roomName: data.name,
        })
      );

      toast.success(`Joining room "${data.name}"… 🎉`);
      router.push(`/room/${code}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to join room. Please try again.";
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 py-12 overflow-hidden selection:bg-pink-500/30 selection:text-pink-200">
      {/* Background glow & mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(168,85,247,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Back to Home */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-purple-950/20"
      >
        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-5">
          <Users className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Join a Watch Room
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter your display name and the Room ID shared by your host to jump right in.
          </p>
        </div>

        <form onSubmit={handleJoinRoom} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah"
              maxLength={40}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Room ID / Code
            </label>
            <input
              type="text"
              required
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7XK2QM"
              maxLength={12}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm tracking-widest uppercase text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!canJoin || loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking Room…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Join Room
                </span>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
