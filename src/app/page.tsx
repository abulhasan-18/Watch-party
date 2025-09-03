"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import RoomCard from "@/components/RoomCard";
import CreateRoomModal from "@/components/CreateRoomModal";
import JoinRoomModal from "@/components/JoinRoomModal";

type ModalMode = "create" | "join" | null;
const LS_ROOM_META = "wp.roomMeta";

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0b0b] text-slate-900 dark:text-slate-100">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-pink-600 dark:text-yellow-400">
            Watch Party 🎬
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Create a room or join instantly — no login required.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <RoomCard
            title="Create Room"
            description="You’ll become the host and get a sharable Room ID."
            actionLabel="Create"
            onClick={() => setOpen("create")}
          />
          <RoomCard
            title="Join Room"
            description="Enter a Room ID shared by a host to jump in."
            actionLabel="Join"
            variant="outline"
            onClick={() => setOpen("join")}
          />
        </div>
      </main>

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
