"use client";

import { useState } from "react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { generateRoomId } from "@/lib/utils";
import { Sparkles, Copy, Check, X, Film, ArrowRight } from "lucide-react";

const LS_ROOM_META = "wp.roomMeta";

interface CreateRoomModalProps {
  cName: string;
  setCName: (name: string) => void;
  cRoomName: string;
  setCRoomName: (roomName: string) => void;
  createdRoomId: string | null;
  setCreatedRoomId: (id: string | null) => void;
  creating: boolean;
  setCreating: (creating: boolean) => void;
  canCreate: boolean;
  router: AppRouterInstance;
  closeModal: () => void;
}

export default function CreateRoomModal({
  cName,
  setCName,
  cRoomName,
  setCRoomName,
  createdRoomId,
  setCreatedRoomId,
  creating,
  setCreating,
  canCreate,
  router,
  closeModal,
}: CreateRoomModalProps) {
  const [copied, setCopied] = useState(false);

  const submitCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canCreate || creating) return;

    try {
      const id = generateRoomId(6);
      setCreating(true);

      const trimmedName = cName.trim();
      const trimmedRoom = cRoomName.trim();

      localStorage.setItem(
        LS_ROOM_META,
        JSON.stringify({
          role: "host",
          name: trimmedName,
          roomName: trimmedRoom,
        })
      );

      try {
        await supabase.from("rooms").insert([
          {
            id,
            name: trimmedRoom,
            host_name: trimmedName,
          },
        ]);
      } catch (insertErr) {
        console.warn("Supabase rooms table insert:", insertErr);
      }

      setCreatedRoomId(id);
      toast.success("Watch room created! 🎉");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create room.";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const enterCreatedRoom = () => {
    if (!createdRoomId) return;
    localStorage.setItem(
      LS_ROOM_META,
      JSON.stringify({
        role: "host",
        name: cName.trim(),
        roomName: cRoomName.trim(),
      })
    );
    router.push(`/room/${createdRoomId}`);
  };

  const copyRoomId = async () => {
    if (createdRoomId) {
      await navigator.clipboard.writeText(createdRoomId);
      setCopied(true);
      toast.success("Room ID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
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
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl p-6 sm:p-8 text-slate-100 shadow-2xl shadow-pink-950/30">
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdRoomId ? (
          <form onSubmit={submitCreate}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Create a Room</h3>
                <p className="text-xs text-slate-400">
                  Host a synchronized video session
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
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={40}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  value={cRoomName}
                  onChange={(e) => setCRoomName(e.target.value)}
                  placeholder="e.g. Chill & Music"
                  maxLength={50}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder-slate-500 shadow-inner outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
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
                disabled={!canCreate || creating}
                className="flex-1 h-11 bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-lg shadow-pink-600/30 transition-all disabled:opacity-50"
              >
                {creating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Create
                  </span>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Room Created! 🎉</h3>
            <p className="mt-1 text-sm text-slate-400">
              Share your room ID with friends:
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 p-3.5 rounded-xl border border-pink-500/30 bg-pink-950/20">
              <span className="font-mono text-xl font-bold tracking-widest text-pink-400">
                {createdRoomId}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyRoomId}
                className="border-white/10 hover:bg-white/10 text-slate-200"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                onClick={closeModal}
                variant="outline"
                className="flex-1 h-11 border-white/10 hover:bg-white/5 text-slate-300"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={enterCreatedRoom}
                className="flex-1 h-11 bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-lg shadow-pink-600/30"
              >
                Enter Room <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
