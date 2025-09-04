"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import ChatBox from "@/components/ChatBox";
import SearchBar from "@/components/SearchBar";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { v4 as uuid } from "uuid";

type ChatMessage = {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
};

type VideoItem = {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string };
};

const LS_ROOM_META = "wp.roomMeta";

// persistent client id across reloads/tabs
function getClientId() {
  if (typeof window === "undefined") return "";
  const KEY = "wp.clientId";
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    window.localStorage.setItem(KEY, v);
  }
  return v;
}

export default function RoomPageClient({
  code,
  roomName,
}: {
  code: string;
  roomName: string;
}) {
  // UI state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{
    title: string;
    channel: string;
  } | null>(null);

  const [userName, setUserName] = useState<string>("Guest");
  const [askName, setAskName] = useState(false);
  const [showChangeName, setShowChangeName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [clientId, setClientId] = useState("");
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const isLeader = useMemo(() => {
    if (!onlineIds.length) return false;
    const sorted = [...onlineIds].sort();
    return sorted[0] === clientId;
  }, [onlineIds, clientId]);

  // player refs
  const playerRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const lastUpdatedMsRef = useRef<number>(Date.now());
  const videoIdRef = useRef<string | null>(null);

  // realtime channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  // load saved display name
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ROOM_META);
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta?.name) setUserName(meta.name);
        else setAskName(true);
      } else {
        setAskName(true);
      }
    } catch {
      setAskName(true);
    }
  }, []);

  // clientId once
  useEffect(() => {
    setClientId(getClientId());
  }, []);

  // bump DB last_active (leader only)
  const bumpLastActive = useCallback(async () => {
    if (!isLeader) return;
    await supabase
      .from("rooms")
      .update({ last_active: new Date().toISOString() })
      .eq("id", code);
  }, [isLeader, code]);

  const setActiveFlag = useCallback(
    async (active: boolean) => {
      if (!isLeader) return;
      await supabase
        .from("rooms")
        .update({ is_active: active, last_active: new Date().toISOString() })
        .eq("id", code);
    },
    [isLeader, code]
  );

  // subscribe to Supabase Realtime
  useEffect(() => {
    if (!clientId || !code) return;

    const ch = supabase.channel(`room:${code}`, {
      config: {
        presence: { key: clientId },
        broadcast: { self: true },
      },
    });
    channelRef.current = ch;

    // presence join
    ch.on("presence", { event: "join" }, ({ newPresences }) => {
      for (const p of newPresences) {
        if (p.clientId && p.name && p.clientId !== clientId) {
          setMessages((prev) => [
            {
              id: uuid(),
              sender: "System",
              content: `${p.name} joined the room`,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
    });

    // presence leave
    ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
      for (const p of leftPresences) {
        if (p.clientId && p.name && p.clientId !== clientId) {
          setMessages((prev) => [
            {
              id: uuid(),
              sender: "System",
              content: `${p.name} left the room`,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
    });

    // presence sync
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<
        string,
        Array<{ clientId: string; name: string }>
      >;
      const ids = Object.values(state)
        .flat()
        .map((m) => String(m.clientId))
        .filter(Boolean);
      const unique = Array.from(new Set(ids));
      setOnlineIds(unique);

      setActiveFlag(unique.length > 0);
      bumpLastActive();
    });

    // broadcast: chat
    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev; // dedup
        return [msg, ...prev];
      });
    });

    // broadcast: rename
    ch.on("broadcast", { event: "rename" }, ({ payload }) => {
      const { oldName, newName } = payload as {
        oldName: string;
        newName: string;
      };
      setMessages((prev) => [
        {
          id: uuid(),
          sender: "System",
          content: `${oldName} changed their name to ${newName}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      bumpLastActive();
    });

    // broadcast: set-video
    ch.on("broadcast", { event: "set-video" }, ({ payload }) => {
      const { videoId } = payload as { videoId: string };
      setVideoId(videoId);
      videoIdRef.current = videoId;
      isPlayingRef.current = true;
      lastUpdatedMsRef.current = Date.now();
      if (playerRef.current) {
        playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
        playerRef.current.playVideo();
      }
      bumpLastActive();
    });

    // broadcast: playback
    ch.on("broadcast", { event: "playback" }, ({ payload }) => {
      const { isPlaying, currentTime } = payload as {
        isPlaying: boolean;
        currentTime: number;
      };
      isPlayingRef.current = isPlaying;
      lastUpdatedMsRef.current = Date.now();
      if (playerRef.current) {
        playerRef.current.seekTo(currentTime, true);
        isPlaying
          ? playerRef.current.playVideo()
          : playerRef.current.pauseVideo();
      }
      bumpLastActive();
    });

    // broadcast: state
    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      const { videoId, isPlaying, currentTime, at } = payload as {
        videoId: string | null;
        isPlaying: boolean;
        currentTime: number;
        at: number;
      };
      if (!videoId) return;
      const elapsed = Math.max(0, (Date.now() - at) / 1000);
      const start = (currentTime || 0) + (isPlaying ? elapsed : 0);

      setVideoId(videoId);
      videoIdRef.current = videoId;
      isPlayingRef.current = isPlaying;
      lastUpdatedMsRef.current = at;

      if (playerRef.current) {
        playerRef.current.loadVideoById({ videoId, startSeconds: start });
        isPlaying
          ? playerRef.current.playVideo()
          : playerRef.current.pauseVideo();
      }
    });

    // subscribe
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ clientId, name: userName });

        ch.send({
          type: "broadcast",
          event: "request-state",
          payload: { requester: clientId },
        });
      }
    });

    // leader answers state requests
    ch.on("broadcast", { event: "request-state" }, async ({ payload }) => {
      if (!isLeader) return;
      const { requester } = payload as { requester: string };
      const vid = videoIdRef.current;
      if (!vid) return;
      let currentTime = 0;
      try {
        currentTime = (await playerRef.current?.getCurrentTime()) || 0;
      } catch {}
      ch.send({
        type: "broadcast",
        event: "state",
        payload: {
          videoId: vid,
          isPlaying: isPlayingRef.current,
          currentTime,
          at: Date.now(),
          to: requester,
        },
      });
    });

    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [code, clientId, userName, isLeader, bumpLastActive, setActiveFlag]);

  // set video
  const handleSelectVideo = useCallback(
    (item: VideoItem) => {
      const vid = item.id.videoId;
      setVideoId(vid);
      videoIdRef.current = vid;
      isPlayingRef.current = true;
      lastUpdatedMsRef.current = Date.now();

      playerRef.current?.loadVideoById({ videoId: vid, startSeconds: 0 });
      playerRef.current?.playVideo();

      channelRef.current?.send({
        type: "broadcast",
        event: "set-video",
        payload: { videoId: vid },
      });
      channelRef.current?.send({
        type: "broadcast",
        event: "playback",
        payload: { isPlaying: true, currentTime: 0 },
      });

      setNowPlaying({
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
      });

      supabase
        .from("rooms")
        .update({ last_active: new Date().toISOString() })
        .eq("id", code);
    },
    [code]
  );

  const handlePlay = useCallback(async () => {
    const t = (await playerRef.current?.getCurrentTime()) || 0;
    isPlayingRef.current = true;
    lastUpdatedMsRef.current = Date.now();
    channelRef.current?.send({
      type: "broadcast",
      event: "playback",
      payload: { isPlaying: true, currentTime: t },
    });
  }, []);

  const handlePause = useCallback(async () => {
    const t = (await playerRef.current?.getCurrentTime()) || 0;
    isPlayingRef.current = false;
    lastUpdatedMsRef.current = Date.now();
    channelRef.current?.send({
      type: "broadcast",
      event: "playback",
      payload: { isPlaying: false, currentTime: t },
    });
  }, []);

  // chat send (optimistic echo + dedup)
  const handleSendChat = useCallback(
    (m: { sender: string; content: string }) => {
      const content = (m?.content || "").trim();
      if (!content) return;

      const newMsg: ChatMessage = {
        id: uuid(),
        sender: userName,
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [newMsg, ...prev]);

      channelRef.current?.send({
        type: "broadcast",
        event: "chat",
        payload: newMsg,
      });

      supabase
        .from("rooms")
        .update({ last_active: new Date().toISOString() })
        .eq("id", code);
    },
    [userName, code]
  );

  // set/rename name
  const saveName = (newName: string, isChange = false) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast.error("Please enter your name");
      return;
    }

    const old = userName;
    setUserName(trimmed);
    localStorage.setItem(LS_ROOM_META, JSON.stringify({ name: trimmed }));

    channelRef.current?.track({ clientId, name: trimmed });

    if (isChange) {
      channelRef.current?.send({
        type: "broadcast",
        event: "rename",
        payload: { oldName: old, newName: trimmed },
      });
      toast.success("Name updated");
    }

    setAskName(false);
    setShowChangeName(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-dvh">
      {/* Name modal */}
      {askName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-[#111] p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h2 className="text-lg font-bold mb-3">Enter your name</h2>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="John Doe"
              className="w-full border px-3 py-2 rounded-lg mb-4"
            />
            <Button onClick={() => saveName(tempName)}>Continue</Button>
          </div>
        </div>
      )}

      {/* Change name modal */}
      {showChangeName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-[#111] p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h2 className="text-lg font-bold mb-3">Change your name</h2>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="New name"
              className="w-full border px-3 py-2 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowChangeName(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveName(tempName, true)}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Left: video + search */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-bold">{roomName}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? window.location.href : ""}
              className="border px-2 py-1 rounded text-sm w-64"
            />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied!");
              }}
            >
              Copy
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTempName(userName);
                setShowChangeName(true);
              }}
            >
              Change Name
            </Button>
          </div>
        </div>

        {videoId ? (
          <div className="w-full h-[70vh] max-w-6xl mx-auto">
            <VideoPlayer
              videoId={videoId}
              onReady={(p) => (playerRef.current = p)}
              onPlay={handlePlay}
              onPause={handlePause}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] sm:h-[400px] border rounded text-gray-500">
            No video selected. Search and play one!
          </div>
        )}

        {nowPlaying && (
          <div className="mt-3 text-center">
            <h2 className="text-lg font-semibold">{nowPlaying.title}</h2>
            <p className="text-sm text-slate-500">{nowPlaying.channel}</p>
          </div>
        )}

        <SearchBar onSelectVideo={handleSelectVideo} />
      </div>

      {/* Right: chat */}
      <ChatBox
        messages={messages}
        onSend={handleSendChat}
        userName={userName}
      />
    </div>
  );
}
