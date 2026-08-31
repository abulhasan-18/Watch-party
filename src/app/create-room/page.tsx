"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { generateRoomId } from "@/lib/utils";
import { ArrowLeft, Film, Sparkles, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const LS_ROOM_META = "wp.roomMeta";

export default function CreateRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canCreate = name.trim().length >= 2 && roomName.trim().length >= 2;

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate || loading) return;

    setLoading(true);
    try {
      const id = generateRoomId(6);
      const trimmedName = name.trim();
      const trimmedRoomName = roomName.trim();

      localStorage.setItem(
        LS_ROOM_META,
        JSON.stringify({
          role: "host",
          name: trimmedName,
          roomName: trimmedRoomName,
        })
      );

      try {
        await supabase.from("rooms").insert([
          {
            id,
            name: trimmedRoomName,
            host_name: trimmedName,
          },
        ]);
      } catch (insertErr) {
        console.warn("Supabase rooms insert:", insertErr);
      }

      setCreatedRoomId(id);
      toast.success("Watch room created successfully! 🎉");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to create room. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!createdRoomId) return;
    await navigator.clipboard.writeText(createdRoomId);
    setCopied(true);
    toast.success("Room Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterRoom = () => {
    if (createdRoomId) {
      router.push(`/room/${createdRoomId}`);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-4 py-12 overflow-hidden selection:bg-pink-500/30 selection:text-pink-200">
      {/* Background glow & mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(219,39,119,0.15),rgba(255,255,255,0))] pointer-events-none" />
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
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 shadow-2xl shadow-pink-950/20"
      >
        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mb-5">
          <Film className="w-6 h-6" />
        </div>

        {!createdRoomId ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Create a Watch Room
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                You’ll become the host with synchronized controls and a sharable Room ID.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="mt-8 space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Your Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={40}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Marvel Movie Night"
                  maxLength={50}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={!canCreate || loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold shadow-lg shadow-pink-600/25 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Room…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Create Room
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Room Created! 🎉</h2>
            <p className="mt-2 text-sm text-slate-400">
              Share this code with your friends so they can join your party:
            </p>

            <div className="mt-6 flex items-center justify-between gap-3 p-4 rounded-xl border border-pink-500/30 bg-pink-950/20">
              <span className="font-mono text-2xl font-extrabold tracking-widest text-pink-400">
                {createdRoomId}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="border-white/10 hover:bg-white/10 text-slate-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreatedRoomId(null)}
                className="flex-1 h-11 border-white/10 hover:bg-white/5 text-slate-300"
              >
                Create Another
              </Button>
              <Button
                type="button"
                onClick={handleEnterRoom}
                className="flex-1 h-11 bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-lg shadow-pink-600/30"
              >
                Enter Room →
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
