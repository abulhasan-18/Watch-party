"use client";

import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { Users, X, LogIn } from "lucide-react";

const LS_ROOM_META = "wp.roomMeta";

interface JoinRoomModalProps {
  jName: string;
  setJName: (name: string) => void;
  jRoomId: string;
  setJRoomId: (id: string) => void;
  joining: boolean;
  setJoining: (joining: boolean) => void;
  canJoin: boolean;
  router: AppRouterInstance;
  closeModal: () => void;
}

export default function JoinRoomModal({
  jName,
  setJName,
  jRoomId,
  setJRoomId,
  joining,
  setJoining,
  canJoin,
  router,
  closeModal,
}: JoinRoomModalProps) {
  const submitJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canJoin || joining) return;

    try {
      setJoining(true);
      const id = jRoomId.trim().toUpperCase();
      const trimmedName = jName.trim();

      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("No active room found with that code.");
        return;
      }

      localStorage.setItem(
        LS_ROOM_META,
        JSON.stringify({ role: "guest", name: trimmedName, roomName: data.name })
      );
      toast.success(`Joining "${data.name}"… 🎉`);
      router.push(`/room/${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to join room.";
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={closeModal}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 text-slate-100 shadow-2xl shadow-purple-950/30">
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <form onSubmit={submitJoin}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Join a Room</h3>
              <p className="text-xs text-slate-400">
                Enter code to join a friends’ watch party
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                required
                value={jName}
                onChange={(e) => setJName(e.target.value)}
                placeholder="e.g. Sarah"
                maxLength={40}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Room Code / ID
              </label>
              <input
                type="text"
                required
                value={jRoomId}
                onChange={(e) => setJRoomId(e.target.value.toUpperCase())}
                placeholder="e.g. 7XK2QM"
                maxLength={12}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-sm tracking-widest uppercase text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              onClick={closeModal}
              variant="outline"
              className="flex-1 h-11 border-white/10 hover:bg-white/5 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canJoin || joining}
              className="flex-1 h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {joining ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Joining…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Join Room
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
