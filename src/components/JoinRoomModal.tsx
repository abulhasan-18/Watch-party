"use client";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const LS_ROOM_META = "wp.roomMeta";

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
}: any) {
  const submitJoin = async () => {
    try {
      setJoining(true);
      const id = jRoomId.trim().toUpperCase();
      const { data, error } = await supabase
        .from("rooms")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("No room found with that ID.");
        return;
      }
      localStorage.setItem(
        LS_ROOM_META,
        JSON.stringify({ role: "guest", name: jName.trim() })
      );
      toast.success("Joining room…");
      router.push(`/room/${id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to join room.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeModal}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] p-6 shadow-2xl">
        <h3 className="text-xl font-semibold">Join Room</h3>
        <label className="block mt-5 text-sm font-semibold">Your Name</label>
        <input
          value={jName}
          onChange={(e) => setJName(e.target.value)}
          placeholder="John Doe"
          className="mt-1 w-full rounded-xl border px-4 py-3 outline-none"
        />
        <label className="block mt-4 text-sm font-semibold">Room ID</label>
        <input
          value={jRoomId}
          onChange={(e) => setJRoomId(e.target.value.toUpperCase())}
          placeholder="7XK2QM"
          className="mt-1 w-full rounded-xl border px-4 py-3 tracking-widest uppercase outline-none"
        />
        <div className="mt-6 flex gap-3">
          <Button onClick={closeModal} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={submitJoin}
            disabled={!canJoin || joining}
            className="flex-1"
          >
            {joining ? "Joining…" : "Join Room"}
          </Button>
        </div>
      </div>
    </div>
  );
}
