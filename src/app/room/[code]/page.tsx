import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import RoomPageClient from "./RoomPageClient";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const { data, error } = await supabase
    .from("rooms")
    .select("name")
    .eq("id", code)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  return <RoomPageClient code={code} roomName={data.name} />;
}
