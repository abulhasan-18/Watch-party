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
  kind?: "user" | "system";
};

type VideoItem = {
  id: { videoId: string };
  snippet: { title: string; channelTitle: string };
};

const LS_ROOM_META = "wp.roomMeta";
const LS_CLIENT_ID = "wp.clientId";
const CHAT_BURST_LIMIT = 5;
const CHAT_BURST_WINDOW_MS = 4000;
const SYNC_HEARTBEAT_MS = 5000;
const ACTIVE_PING_MS = 15000;

function getClientId() {
  if (typeof window === "undefined") return "";
  let v = window.localStorage.getItem(LS_CLIENT_ID);
  if (!v) {
    v =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    window.localStorage.setItem(LS_CLIENT_ID, v);
  }
  return v;
}

const j = (x: any) => {
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
};

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
  const [channelReady, setChannelReady] = useState(false);
  const [leaderOnlyControl, setLeaderOnlyControl] = useState<boolean>(true);

  // mobile chat drawer
  const [showChatMobile, setShowChatMobile] = useState(false);

  // derived leader
  const leaderId = useMemo(() => {
    if (!onlineIds.length) return "";
    return [...onlineIds].sort()[0] ?? "";
  }, [onlineIds]);
  const isLeader = useMemo(
    () => clientId && leaderId === clientId,
    [clientId, leaderId]
  );

  // player refs / sync
  const playerRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const lastUpdatedMsRef = useRef<number>(Date.now());
  const videoIdRef = useRef<string | null>(null);

  // realtime channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  // offline chat queue & flood control
  const pendingChatRef = useRef<ChatMessage[]>([]);
  const chatTimestampsRef = useRef<number[]>([]);

  // ===== Load saved display name =====
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ROOM_META);
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta?.name) setUserName(String(meta.name).slice(0, 40));
        else setAskName(true);
      } else {
        setAskName(true);
      }
    } catch {
      setAskName(true);
    }
  }, []);

  // clientId
  useEffect(() => {
    setClientId(getClientId());
  }, []);

  // ===== Helpers =====
  const bumpLastActive = useCallback(async () => {
    if (!isLeader) return;
    try {
      await supabase
        .from("rooms")
        .update({ last_active: new Date().toISOString() })
        .eq("id", code);
    } catch {}
  }, [isLeader, code]);

  const setActiveFlag = useCallback(
    async (active: boolean) => {
      if (!isLeader) return;
      try {
        await supabase
          .from("rooms")
          .update({ is_active: active, last_active: new Date().toISOString() })
          .eq("id", code);
      } catch {}
    },
    [isLeader, code]
  );

  // ===== Supabase Realtime subscription =====
  useEffect(() => {
    if (!clientId || !code) return;

    const ch = supabase.channel(`room:${code}`, {
      config: { presence: { key: clientId }, broadcast: { self: true } },
    });
    channelRef.current = ch;

    // presence join
    ch.on("presence", { event: "join" }, ({ newPresences }) => {
      for (const p of newPresences) {
        if (p.clientId && p.name && p.clientId !== clientId) {
          enqueueSystem(`${p.name} joined the room`);
        }
      }
    });

    // presence leave
    ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
      for (const p of leftPresences) {
        if (p.clientId && p.name && p.clientId !== clientId) {
          enqueueSystem(`${p.name} left the room`);
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

    // chat messages
    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      const msg = payload as ChatMessage;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [msg, ...prev]
      );
    });

    // rename
    ch.on("broadcast", { event: "rename" }, ({ payload }) => {
      const { oldName, newName } = payload as {
        oldName: string;
        newName: string;
      };
      enqueueSystem(`${oldName} changed their name to ${newName}`);
      bumpLastActive();
    });

    // set video
    ch.on("broadcast", { event: "set-video" }, ({ payload }) => {
      const { videoId, senderId } = payload as {
        videoId: string;
        senderId?: string;
      };
      if (leaderOnlyControl && senderId && senderId !== leaderId) return;

      setVideoId(videoId);
      videoIdRef.current = videoId;
      isPlayingRef.current = true;
      lastUpdatedMsRef.current = Date.now();

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
          playerRef.current.playVideo();
        } catch {}
      }
      bumpLastActive();
    });

    // playback
    ch.on("broadcast", { event: "playback" }, ({ payload }) => {
      const { isPlaying, currentTime, at, senderId } = payload as {
        isPlaying: boolean;
        currentTime: number;
        at?: number;
        senderId?: string;
      };
      if (leaderOnlyControl && senderId && senderId !== leaderId) return;

      const elapsed = at ? Math.max(0, (Date.now() - at) / 1000) : 0;
      const target = Math.max(
        0,
        (currentTime || 0) + (isPlaying ? elapsed : 0)
      );

      isPlayingRef.current = isPlaying;
      lastUpdatedMsRef.current = Date.now();

      if (playerRef.current) {
        try {
          playerRef.current.seekTo(target, true);
          isPlaying
            ? playerRef.current.playVideo()
            : playerRef.current.pauseVideo();
        } catch {}
      }
      bumpLastActive();
    });

    // state reply
    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      const { videoId, isPlaying, currentTime, at, to } = payload as {
        videoId: string | null;
        isPlaying: boolean;
        currentTime: number;
        at: number;
        to?: string;
      };
      if (to && to !== clientId) return;
      if (!videoId) return;

      const elapsed = Math.max(0, (Date.now() - at) / 1000);
      const start = Math.max(0, (currentTime || 0) + (isPlaying ? elapsed : 0));

      setVideoId(videoId);
      videoIdRef.current = videoId;
      isPlayingRef.current = isPlaying;
      lastUpdatedMsRef.current = at;

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId, startSeconds: start });
          isPlaying
            ? playerRef.current.playVideo()
            : playerRef.current.pauseVideo();
        } catch {}
      }
    });

    // request-state handler
    ch.on("broadcast", { event: "request-state" }, async ({ payload }) => {
      if (!isLeader) return;
      const { requester } = (payload || {}) as { requester?: string };
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
          to: requester || undefined,
        },
      });
    });

    // subscribe lifecycle
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        const clean = sanitizeName(userName);
        await ch.track({ clientId, name: clean });
        ch.send({
          type: "broadcast",
          event: "request-state",
          payload: { requester: clientId },
        });
        flushPendingChat();
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
        setChannelReady(false);
      }
    });

    return () => {
      setChannelReady(false);
      ch.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, clientId, leaderId, leaderOnlyControl, userName]);

  // leader heartbeat
  useEffect(() => {
    if (!isLeader) return;
    let syncTimer: any = null;
    let activeTimer: any = null;

    const tickSync = async () => {
      if (!channelRef.current) return;
      if (!videoIdRef.current) return;

      let currentTime = 0;
      try {
        currentTime = (await playerRef.current?.getCurrentTime()) || 0;
      } catch {}

      channelRef.current.send({
        type: "broadcast",
        event: "playback",
        payload: {
          isPlaying: isPlayingRef.current,
          currentTime,
          at: Date.now(),
          senderId: clientId,
        },
      });
    };

    const tickActive = async () => {
      await bumpLastActive();
      await setActiveFlag(true);
    };

    syncTimer = setInterval(tickSync, SYNC_HEARTBEAT_MS);
    activeTimer = setInterval(tickActive, ACTIVE_PING_MS);

    return () => {
      clearInterval(syncTimer);
      clearInterval(activeTimer);
    };
  }, [isLeader, bumpLastActive, setActiveFlag, clientId]);

  // tab visible quick pull
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        if (!isLeader && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "request-state",
            payload: { requester: clientId },
          });
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isLeader, clientId]);

  // ===== Actions =====
  const sanitizeName = (s: string) =>
    s.trim().replace(/\s+/g, " ").slice(0, 40);

  function enqueueSystem(text: string) {
    const sysMsg: ChatMessage = {
      id: uuid(),
      sender: "System",
      content: text,
      createdAt: new Date().toISOString(),
      kind: "system",
    };
    setMessages((prev) => [sysMsg, ...prev]);
  }

  function recordChatBurst() {
    const now = Date.now();
    chatTimestampsRef.current.push(now);
    chatTimestampsRef.current = chatTimestampsRef.current.filter(
      (t) => now - t <= CHAT_BURST_WINDOW_MS
    );
    return chatTimestampsRef.current.length;
  }

  function flushPendingChat() {
    if (!channelReady || !pendingChatRef.current.length) return;
    const ch = channelRef.current;
    if (!ch) return;
    for (const msg of pendingChatRef.current) {
      ch.send({ type: "broadcast", event: "chat", payload: msg });
    }
    pendingChatRef.current = [];
  }

  const handleSelectVideo = useCallback(
    (item: VideoItem) => {
      if (leaderOnlyControl && !isLeader) {
        toast("Only leader can change video (toggle off to allow all).", {
          icon: "🔒",
        });
        return;
      }

      const vid = item.id.videoId;
      setVideoId(vid);
      videoIdRef.current = vid;
      isPlayingRef.current = true;
      lastUpdatedMsRef.current = Date.now();

      try {
        playerRef.current?.loadVideoById({ videoId: vid, startSeconds: 0 });
        playerRef.current?.playVideo();
      } catch {}

      channelRef.current?.send({
        type: "broadcast",
        event: "set-video",
        payload: { videoId: vid, senderId: clientId },
      });
      channelRef.current?.send({
        type: "broadcast",
        event: "playback",
        payload: {
          isPlaying: true,
          currentTime: 0,
          at: Date.now(),
          senderId: clientId,
        },
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
    [code, clientId, isLeader, leaderOnlyControl]
  );

  const handlePlay = useCallback(async () => {
    if (leaderOnlyControl && !isLeader) {
      toast("Only leader can control playback (toggle off to allow all).", {
        icon: "🔒",
      });
      return;
    }
    let t = 0;
    try {
      t = (await playerRef.current?.getCurrentTime()) || 0;
    } catch {}
    isPlayingRef.current = true;
    lastUpdatedMsRef.current = Date.now();
    channelRef.current?.send({
      type: "broadcast",
      event: "playback",
      payload: {
        isPlaying: true,
        currentTime: t,
        at: Date.now(),
        senderId: clientId,
      },
    });
  }, [clientId, isLeader, leaderOnlyControl]);

  const handlePause = useCallback(async () => {
    if (leaderOnlyControl && !isLeader) {
      toast("Only leader can control playback (toggle off to allow all).", {
        icon: "🔒",
      });
      return;
    }
    let t = 0;
    try {
      t = (await playerRef.current?.getCurrentTime()) || 0;
    } catch {}
    isPlayingRef.current = false;
    lastUpdatedMsRef.current = Date.now();
    channelRef.current?.send({
      type: "broadcast",
      event: "playback",
      payload: {
        isPlaying: false,
        currentTime: t,
        at: Date.now(),
        senderId: clientId,
      },
    });
  }, [clientId, isLeader, leaderOnlyControl]);

  const handleSendChat = useCallback(
    (m: { sender: string; content: string }) => {
      const content = (m?.content || "").trim();
      if (!content) return;

      if (recordChatBurst() > CHAT_BURST_LIMIT) {
        toast.error("Slow down champ — you’re sending messages too fast.");
        return;
      }

      const cleanSender = sanitizeName(userName) || "Guest";
      const newMsg: ChatMessage = {
        id: uuid(),
        sender: cleanSender,
        content,
        createdAt: new Date().toISOString(),
        kind: "user",
      };

      setMessages((prev) => [newMsg, ...prev]);

      if (channelReady && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "chat",
          payload: newMsg,
        });
      } else {
        pendingChatRef.current.push(newMsg);
      }

      supabase
        .from("rooms")
        .update({ last_active: new Date().toISOString() })
        .eq("id", code);
    },
    [userName, code, channelReady]
  );

  const saveName = (newName: string, isChange = false) => {
    const trimmed = sanitizeName(newName);
    if (!trimmed) {
      toast.error("Please enter your name");
      return;
    }

    const old = userName;
    setUserName(trimmed);
    localStorage.setItem(LS_ROOM_META, JSON.stringify({ name: trimmed }));

    try {
      channelRef.current?.track({ clientId, name: trimmed });
    } catch {}

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

  const shareRoom = async () => {
    const href = typeof window !== "undefined" ? window.location.href : "";
    if (!href) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: roomName,
          url: href,
          text: "Join my watch party",
        });
      } else {
        await navigator.clipboard.writeText(href);
        toast.success("Link copied!");
      }
    } catch {
      await navigator.clipboard.writeText(href);
      toast.success("Link copied!");
    }
  };

  const forceSync = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "request-state",
      payload: { requester: clientId },
    });
    toast("Requested latest state from leader.", { icon: "📡" });
  };

  // ===== Render =====
  return (
    <div className="flex min-h-dvh flex-col bg-gray-50 text-gray-900 dark:bg-[#0b0b0b] dark:text-gray-200">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-[#0f0f10]/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              {roomName}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {onlineIds.length} online • Leader:{" "}
              <span className="font-medium">
                {leaderId
                  ? leaderId === clientId
                    ? "You"
                    : leaderId.slice(0, 6)
                  : "-"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={shareRoom} className="h-9 px-3">
              Share
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTempName(userName);
                setShowChangeName(true);
              }}
              className="h-9 px-3"
            >
              Rename
            </Button>
            <Button variant="outline" onClick={forceSync} className="h-9 px-3">
              Force Sync
            </Button>

            {/* Leader-only toggle */}
            <button
              onClick={() => setLeaderOnlyControl((v) => !v)}
              title="Leader-only control"
              className={[
                "relative inline-flex h-9 w-[74px] items-center rounded-full border px-2 text-xs transition",
                leaderOnlyControl
                  ? "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-[#111] dark:text-gray-300",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute left-1 top-1 h-7 w-7 rounded-full shadow transition-transform",
                  leaderOnlyControl
                    ? "translate-x-[38px] bg-emerald-500"
                    : "translate-x-0 bg-gray-300 dark:bg-gray-600",
                ].join(" ")}
              />
              <span className="mx-auto z-10">
                {leaderOnlyControl ? "Leader" : "Anyone"}
              </span>
            </button>

            {/* Mobile chat toggle */}
            <Button
              variant="default"
              onClick={() => setShowChatMobile(true)}
              className="ml-1 h-9 px-3 md:hidden"
            >
              Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row">
        {/* Left: video + search */}
        <div className="flex min-h-[60vh] flex-1 flex-col">
          {/* Link + Name quick actions (compact on mobile) */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-sm">
            <input
              type="text"
              readOnly
              value={typeof window !== "undefined" ? window.location.href : ""}
              className="w-[min(100%,28rem)] rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 shadow-sm dark:border-gray-800 dark:bg-[#111] dark:text-gray-300"
            />
            <Button variant="outline" onClick={shareRoom} className="px-3">
              Copy Link
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTempName(userName);
                setShowChangeName(true);
              }}
              className="px-3"
            >
              Change Name
            </Button>
          </div>

          {/* Video card */}
          <div
            className={[
              "relative mx-auto w-full max-w-6xl overflow-hidden rounded-2xl ring-1",
              "bg-white/70 ring-gray-200 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.15)]",
              "dark:bg-[#0f0f10]/70 dark:ring-gray-800 dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]",
            ].join(" ")}
          >
            {videoId ? (
              <div className="aspect-video">
                <VideoPlayer
                  ref={playerRef as any}
                  videoId={videoId}
                  onReady={(p) => {
                    playerRef.current = p;
                  }}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onTime={() => {}}
                  onBuffer={() => {}}
                  onEnded={() => {}}
                  onError={() =>
                    toast.error("Player error — try another video")
                  }
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                No video selected. Search and play one!
              </div>
            )}
          </div>

          {/* Now playing */}
          {nowPlaying && (
            <div className="mx-auto mt-3 w-full max-w-6xl rounded-xl border border-gray-200 bg-white/60 p-3 text-center text-sm shadow-sm dark:border-gray-800 dark:bg-[#111]">
              <div className="font-medium">{nowPlaying.title}</div>
              <div className="text-gray-500 dark:text-gray-400">
                {nowPlaying.channel}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mx-auto mt-4 w-full max-w-6xl">
            <SearchBar onSelectVideo={handleSelectVideo} />
          </div>
        </div>

        {/* Right: chat (desktop) */}
        <aside className="hidden w-full max-w-sm shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white/70 shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]/70 md:block">
          <div className="flex items-center justify-between border-b border-gray-200 p-3 text-sm dark:border-gray-800">
            <div className="truncate">
              You are <span className="font-medium">{userName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempName(userName);
                setShowChangeName(true);
              }}
            >
              Rename
            </Button>
          </div>
          <div className="max-h-[calc(100dvh-220px)] overflow-auto">
            <ChatBox
              messages={messages}
              onSend={handleSendChat}
              userName={userName}
            />
          </div>
        </aside>
      </div>

      {/* Mobile Chat Drawer */}
      {showChatMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowChatMobile(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <div className="text-sm">
                You are <span className="font-medium">{userName}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempName(userName);
                    setShowChangeName(true);
                  }}
                >
                  Rename
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowChatMobile(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="h-[70dvh] overflow-auto px-2 pb-2 pt-2">
              <ChatBox
                messages={messages}
                onSend={handleSendChat}
                userName={userName}
              />
            </div>
          </div>
        </div>
      )}

      {/* Name modal */}
      {askName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#111]">
            <h2 className="mb-3 text-lg font-bold">Enter your name</h2>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="John Doe"
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#0f0f10]"
            />
            <Button onClick={() => saveName(tempName)} className="w-full">
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Change name modal */}
      {showChangeName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-[#111]">
            <h2 className="mb-3 text-lg font-bold">Change your name</h2>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="New name"
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-[#0f0f10]"
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
    </div>
  );
}
