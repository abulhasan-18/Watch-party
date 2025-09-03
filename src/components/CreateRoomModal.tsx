"use client";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { generateRoomId } from "@/lib/utils";

const LS_ROOM_META = "wp.roomMeta";

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
}: any) {
  const submitCreate = async () => {
    try {
      const id = generateRoomId(6);
      setCreating(true);

      const { error } = await supabase
        .from("rooms")
        .insert([{ id, name: cRoomName.trim(), host_name: cName.trim() }]);

      if (error) throw error;
      setCreatedRoomId(id);
      toast.success("Room created 🎉");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create room.");
    } finally {
      setCreating(false);
    }
  };

  const enterCreatedRoom = () => {
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
      toast.success("Room ID copied ✅");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeModal}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] p-6 shadow-2xl">
        {!createdRoomId ? (
          <>
            <h3 className="text-xl font-semibold">Create Room</h3>
            <label className="block mt-5 text-sm font-semibold">
              Your Name
            </label>
            <input
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="John Doe"
              className="mt-1 w-full rounded-xl border px-4 py-3 outline-none"
            />
            <label className="block mt-4 text-sm font-semibold">
              Room Name
            </label>
            <input
              value={cRoomName}
              onChange={(e) => setCRoomName(e.target.value)}
              placeholder="Movie Night"
              className="mt-1 w-full rounded-xl border px-4 py-3 outline-none"
            />
            <div className="mt-6 flex gap-3">
              <Button onClick={closeModal} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={submitCreate}
                disabled={!canCreate || creating}
                className="flex-1"
              >
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold">Room Created ✅</h3>
            <div className="mt-5 flex items-center gap-2">
              <div className="flex-1 rounded-xl border px-4 py-3 font-mono">
                {createdRoomId}
              </div>
              <Button variant="outline" onClick={copyRoomId}>
                Copy
              </Button>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={closeModal} variant="outline" className="flex-1">
                Close
              </Button>
              <Button onClick={enterCreatedRoom} className="flex-1">
                Enter Room
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
