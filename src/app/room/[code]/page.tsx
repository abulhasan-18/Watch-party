import { supabase } from "@/lib/supabase";
import RoomPageClient from "./RoomPageClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = (code || "").toUpperCase();

  let roomName = `Room ${upperCode}`;

  try {
    const { data } = await supabase
      .from("rooms")
      .select("name")
      .ilike("id", upperCode)
      .maybeSingle();

    if (data?.name) {
      roomName = data.name;
    }
  } catch {
    // If DB is offline or table is unconfigured, room still connects via Realtime WebSockets
  }

  return <RoomPageClient code={upperCode} roomName={roomName} />;
}
