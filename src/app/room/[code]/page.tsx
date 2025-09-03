// src/app/room/[code]/page.tsx
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RoomPageClient from "./RoomPageClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>; // 👈 Promise type
}) {
  const { code } = await params; // 👈 await it here

  const { data, error } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", code)
    .maybeSingle();

  if (error || !data) {
    notFound(); // triggers src/app/not-found.tsx
  }

  return <RoomPageClient code={code} roomName={data.name} />;
}
