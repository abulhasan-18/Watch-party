"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import RoomCard from "@/components/RoomCard";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";
import {
  Film,
  Users,
  Zap,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type ModalMode = "create" | "join" | null;

export default function LandingPage() {
  const router = useRouter();
  const [open, setOpen] = useState<ModalMode>(null);

  // create flow
  const [cName, setCName] = useState("");
  const [cRoomName, setCRoomName] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // join flow
  const [jName, setJName] = useState("");
  const [jRoomId, setJRoomId] = useState("");
  const [joining, setJoining] = useState(false);

  const canCreate = useMemo(
    () => cName.trim().length >= 2 && cRoomName.trim().length >= 2,
    [cName, cRoomName]
  );
  const canJoin = useMemo(
    () => jName.trim().length >= 2 && jRoomId.trim().length >= 4,
    [jName, jRoomId]
  );

  // modal toggle
  const closeModal = useCallback(() => setOpen(null), []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-pink-500/30 selection:text-pink-200 overflow-x-hidden">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(219,39,119,0.2),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Header / Nav */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-600/30">
              <Film className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              Watch<span className="text-pink-500">Party</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen("join")}
              className="text-xs font-semibold px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              Join Room
            </button>
            <button
              onClick={() => setOpen("create")}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white shadow-md shadow-pink-600/20 transition"
            >
              Create Room
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-Latency Real-Time YouTube Synchronization</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Watch YouTube Together,{" "}
            <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              In Perfect Sync.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Create private theater rooms with friends. Play, pause, seek, and chat in real-time — without delays, accounts, or signups.
          </p>

          {/* Quick Stats / Feature pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Sub-second Sync
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5">
              <MessageSquare className="w-3.5 h-3.5 text-pink-400" /> Live Chat & Reactions
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> No Login Required
            </span>
          </div>
        </div>

        {/* Action Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <RoomCard
            title="Create a New Room"
            description="You’ll become the room host with playback controls and a 6-character room code to invite everyone."
            actionLabel="Start a Party"
            badge="Host"
            icon={<Film className="w-6 h-6" />}
            onClick={() => setOpen("create")}
          />
          <RoomCard
            title="Join an Existing Room"
            description="Have a Room ID from a friend? Enter your name and the code to immediately jump into their watch stream."
            actionLabel="Join with Code"
            badge="Guest"
            variant="outline"
            icon={<Users className="w-6 h-6" />}
            onClick={() => setOpen("join")}
          />
        </div>

        {/* How It Works Section */}
        <div className="mt-28 border-t border-white/10 pt-16">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white">How It Works</h2>
            <p className="mt-2 text-sm text-slate-400">
              Start streaming together with your friends in three easy steps.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center backdrop-blur-md">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold text-white">Create a Room</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Click create, choose a room name, and get an instant private room code.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center backdrop-blur-md">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold text-white">Share the Link</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Send your unique room link or 6-digit code to your friends or group chat.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center backdrop-blur-md">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold text-white">Watch & React</h3>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Search or paste any YouTube video. Playback mirrors across all viewers in real-time.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Watch Party. Built for seamless group streaming.</p>
      </footer>

      {/* Create Modal */}
      {open === "create" && (
        <CreateRoomModal
          cName={cName}
          setCName={setCName}
          cRoomName={cRoomName}
          setCRoomName={setCRoomName}
          createdRoomId={createdRoomId}
          setCreatedRoomId={setCreatedRoomId}
          creating={creating}
          setCreating={setCreating}
          canCreate={canCreate}
          router={router}
          closeModal={closeModal}
        />
      )}

      {/* Join Modal */}
      {open === "join" && (
        <JoinRoomModal
          jName={jName}
          setJName={setJName}
          jRoomId={jRoomId}
          setJRoomId={setJRoomId}
          joining={joining}
          setJoining={setJoining}
          canJoin={canJoin}
          router={router}
          closeModal={closeModal}
        />
      )}
    </div>
  );
}
