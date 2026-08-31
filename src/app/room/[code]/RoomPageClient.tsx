"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import ChatBox from "@/components/ChatBox";
import SearchBar, { VideoItem } from "@/components/SearchBar";
import VideoPlayer, { VideoPlayerHandle } from "@/components/VideoPlayer";
import type { YouTubePlayer } from "react-youtube";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { v4 as uuid } from "uuid";
import {
  Share2,
  Users,
  MessageSquare,
  Crown,
  Maximize2,
  Minimize2,
  RefreshCw,
  Edit3,
  Lock,
  Unlock,
  Radio,
  ArrowLeft,
  Copy,
  Check,
  Film,
} from "lucide-react";

type ChatMessage = {
  id: string;
  sender: string;
  content: string;
  createdAt: string;
  kind?: "user" | "system";
};

type PresenceUser = {
  clientId: string;
  name: string;
  role?: "host" | "guest";
  joinedAt?: number;
};

type RawPresence = {
  clientId?: string;
  key?: string;
  name?: string;
  role?: "host" | "guest";
  joinedAt?: number;
};

const LS_ROOM_META = "wp.roomMeta";
const LS_CLIENT_ID = "wp.clientId";
const CHAT_BURST_LIMIT = 6;
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
  const [userRole, setUserRole] = useState<"host" | "guest">("guest");
  const [askName, setAskName] = useState(false);
  const [showChangeName, setShowChangeName] = useState(false);
  const [tempName, setTempName] = useState("");

  const [clientId, setClientId] = useState("");
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [channelReady, setChannelReady] = useState(false);
  const [leaderOnlyControl, setLeaderOnlyControl] = useState<boolean>(false);

  // Tabs: "chat" | "participants"
  const [sidebarTab, setSidebarTab] = useState<"chat" | "participants">("chat");
  const [theaterMode, setTheaterMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // mobile chat drawer
  const [showChatMobile, setShowChatMobile] = useState(false);

  // Refs for tracking mutable values across WebSocket callbacks without channel teardowns
  const nowPlayingRef = useRef(nowPlaying);
  const userNameRef = useRef(userName);
  const userRoleRef = useRef(userRole);
  const leaderOnlyControlRef = useRef(leaderOnlyControl);
  const isLeaderRef = useRef(false);
  const leaderIdRef = useRef("");
  const joinedAtRef = useRef(Date.now());

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  useEffect(() => {
    leaderOnlyControlRef.current = leaderOnlyControl;
  }, [leaderOnlyControl]);

  // Derived host determination
  const hostUser = useMemo(() => {
    const explicitHost = presenceUsers.find((u) => u.role === "host");
    if (explicitHost) return explicitHost;
    if (!presenceUsers.length) return null;
    return [...presenceUsers].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))[0];
  }, [presenceUsers]);

  const isLeader = useMemo(() => {
    if (userRole === "host") return true;
    if (hostUser && hostUser.clientId === clientId) return true;
    if (presenceUsers.length <= 1) return true;
    return false;
  }, [userRole, hostUser, clientId, presenceUsers.length]);

  const leaderId = useMemo(() => {
    return hostUser?.clientId || (isLeader ? clientId : "");
  }, [hostUser, isLeader, clientId]);

  useEffect(() => {
    isLeaderRef.current = isLeader;
    leaderIdRef.current = leaderId;
  }, [isLeader, leaderId]);

  // Ensure current user is always included in displayed participants
  const displayedUsers = useMemo(() => {
    if (!clientId) return presenceUsers;
    const seen = new Set(presenceUsers.map((u) => u.clientId));
    if (!seen.has(clientId)) {
      return [
        {
          clientId,
          name: userName || "Guest",
          role: userRole,
          joinedAt: joinedAtRef.current,
        },
        ...presenceUsers,
      ];
    }
    return presenceUsers;
  }, [presenceUsers, clientId, userName, userRole]);

  const presenceCount = displayedUsers.length;

  // player refs / sync
  const videoPlayerRef = useRef<VideoPlayerHandle | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isPlayingRef = useRef(false);
  const videoIdRef = useRef<string | null>(null);

  // Remote action guard to prevent broadcast ping-pong echo loops
  const isRemoteActionRef = useRef(false);

  // realtime channel
  const channelRef = useRef<RealtimeChannel | null>(null);

  // offline chat queue & flood control
  const pendingChatRef = useRef<ChatMessage[]>([]);
  const chatTimestampsRef = useRef<number[]>([]);

  // ===== Load saved display name & role =====
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ROOM_META);
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta?.name) {
          const clean = String(meta.name).slice(0, 40);
          setUserName(clean);
          userNameRef.current = clean;
        } else {
          setAskName(true);
        }
        if (meta?.role === "host") {
          setUserRole("host");
          userRoleRef.current = "host";
        }
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
    if (!isLeaderRef.current) return;
    try {
      await supabase
        .from("rooms")
        .update({ last_active: new Date().toISOString() })
        .eq("id", code);
    } catch {}
  }, [code]);

  const setActiveFlag = useCallback(
    async (active: boolean) => {
      if (!isLeaderRef.current) return;
      try {
        await supabase
          .from("rooms")
          .update({ is_active: active, last_active: new Date().toISOString() })
          .eq("id", code);
      } catch {}
    },
    [code]
  );

  const sanitizeName = (s: string) =>
    s.trim().replace(/\s+/g, " ").slice(0, 40);

  const enqueueSystem = useCallback((text: string) => {
    const sysMsg: ChatMessage = {
      id: uuid(),
      sender: "System",
      content: text,
      createdAt: new Date().toISOString(),
      kind: "system",
    };
    setMessages((prev) => [sysMsg, ...prev]);
  }, []);

  function recordChatBurst() {
    const now = Date.now();
    chatTimestampsRef.current.push(now);
    chatTimestampsRef.current = chatTimestampsRef.current.filter(
      (t) => now - t <= CHAT_BURST_WINDOW_MS
    );
    return chatTimestampsRef.current.length;
  }

  function flushPendingChat() {
    if (!channelRef.current || !pendingChatRef.current.length) return;
    const ch = channelRef.current;
    for (const msg of pendingChatRef.current) {
      ch.send({ type: "broadcast", event: "chat", payload: msg });
    }
    pendingChatRef.current = [];
  }

  // ===== Supabase Realtime subscription (Runs once per client & room code) =====
  useEffect(() => {
    if (!clientId || !code) return;

    const ch = supabase.channel(`room:${code}`, {
      config: { presence: { key: clientId }, broadcast: { self: true } },
    });
    channelRef.current = ch;

    // presence join
    ch.on("presence", { event: "join" }, ({ newPresences }) => {
      for (const p of newPresences as unknown as RawPresence[]) {
        const uId = p.clientId || p.key;
        if (uId && p.name && uId !== clientId) {
          enqueueSystem(`${p.name} joined the room`);
        }
      }
    });

    // presence leave
    ch.on("presence", { event: "leave" }, ({ leftPresences }) => {
      for (const p of leftPresences as unknown as RawPresence[]) {
        const uId = p.clientId || p.key;
        if (uId && p.name && uId !== clientId) {
          enqueueSystem(`${p.name} left the room`);
        }
      }
    });

    // presence sync
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const userList: PresenceUser[] = [];
      const seen = new Set<string>();

      for (const [key, presences] of Object.entries(state)) {
        if (!Array.isArray(presences)) continue;
        for (const raw of presences as unknown as RawPresence[]) {
          const uId = raw.clientId || key;
          const uName = raw.name || "Guest";
          const uRole = raw.role || "guest";
          const uJoinedAt = raw.joinedAt || 0;

          if (uId && !seen.has(uId)) {
            seen.add(uId);
            userList.push({
              clientId: uId,
              name: uName,
              role: uRole,
              joinedAt: uJoinedAt,
            });
          }
        }
      }

      // Always ensure local client is included
      if (clientId && !seen.has(clientId)) {
        userList.push({
          clientId,
          name: sanitizeName(userNameRef.current) || "Guest",
          role: userRoleRef.current,
          joinedAt: joinedAtRef.current,
        });
      }

      setPresenceUsers(userList);
      setActiveFlag(userList.length > 0);
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

    // control permission mode sync
    ch.on("broadcast", { event: "control-mode" }, ({ payload }) => {
      const { leaderOnlyControl: mode } = payload as { leaderOnlyControl: boolean };
      setLeaderOnlyControl(mode);
    });

    // set video
    ch.on("broadcast", { event: "set-video" }, ({ payload }) => {
      const { videoId: newVid, senderId, title, channel } = payload as {
        videoId: string;
        senderId?: string;
        title?: string;
        channel?: string;
      };
      if (
        leaderOnlyControlRef.current &&
        senderId &&
        senderId !== leaderIdRef.current &&
        !isLeaderRef.current
      ) {
        return;
      }

      isRemoteActionRef.current = true;
      setVideoId(newVid);
      videoIdRef.current = newVid;
      isPlayingRef.current = true;

      if (title) {
        setNowPlaying({ title, channel: channel || "YouTube" });
      }

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId: newVid, startSeconds: 0 });
          playerRef.current.playVideo();
        } catch {}
      }
      bumpLastActive();
    });

    // playback sync
    ch.on("broadcast", { event: "playback" }, ({ payload }) => {
      const { isPlaying, currentTime, at, senderId } = payload as {
        isPlaying: boolean;
        currentTime: number;
        at?: number;
        senderId?: string;
      };

      if (
        leaderOnlyControlRef.current &&
        senderId &&
        senderId !== leaderIdRef.current &&
        !isLeaderRef.current
      ) {
        return;
      }

      // Don't re-trigger from own broadcast
      if (senderId === clientId) return;

      const elapsed = at ? Math.max(0, (Date.now() - at) / 1000) : 0;
      const target = Math.max(0, (currentTime || 0) + (isPlaying ? elapsed : 0));

      isRemoteActionRef.current = true;
      isPlayingRef.current = isPlaying;

      if (playerRef.current) {
        try {
          playerRef.current.seekTo(target, true);
          if (isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        } catch {}
      }
      bumpLastActive();
    });

    // state reply for late joiners
    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      const {
        videoId: syncVid,
        isPlaying,
        currentTime,
        at,
        to,
        title,
        channel,
        leaderOnlyControl: syncControl,
      } = payload as {
        videoId: string | null;
        isPlaying: boolean;
        currentTime: number;
        at: number;
        to?: string;
        title?: string;
        channel?: string;
        leaderOnlyControl?: boolean;
      };
      if (to && to !== clientId) return;
      if (typeof syncControl === "boolean") {
        setLeaderOnlyControl(syncControl);
      }
      if (!syncVid) return;

      const elapsed = Math.max(0, (Date.now() - at) / 1000);
      const start = Math.max(0, (currentTime || 0) + (isPlaying ? elapsed : 0));

      isRemoteActionRef.current = true;
      setVideoId(syncVid);
      videoIdRef.current = syncVid;
      isPlayingRef.current = isPlaying;

      if (title) {
        setNowPlaying({ title, channel: channel || "YouTube" });
      }

      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById({ videoId: syncVid, startSeconds: start });
          if (isPlaying) {
            playerRef.current.playVideo();
          } else {
            playerRef.current.pauseVideo();
          }
        } catch {}
      }
    });

    // request-state handler
    ch.on("broadcast", { event: "request-state" }, async ({ payload }) => {
      if (!isLeaderRef.current) return;
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
          title: nowPlayingRef.current?.title,
          channel: nowPlayingRef.current?.channel,
          leaderOnlyControl: leaderOnlyControlRef.current,
        },
      });
    });

    // subscribe lifecycle
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        const clean = sanitizeName(userNameRef.current) || "Guest";
        await ch.track({
          clientId,
          name: clean,
          role: userRoleRef.current,
          joinedAt: joinedAtRef.current,
        });
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
  }, [code, clientId, bumpLastActive, setActiveFlag, enqueueSystem]);

  // leader heartbeat
  useEffect(() => {
    if (!isLeader) return;
    let syncTimer: ReturnType<typeof setInterval> | null = null;
    let activeTimer: ReturnType<typeof setInterval> | null = null;

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
      if (syncTimer) clearInterval(syncTimer);
      if (activeTimer) clearInterval(activeTimer);
    };
  }, [isLeader, bumpLastActive, setActiveFlag, clientId]);

  // tab visibility pull
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
  const toggleLeaderOnlyControl = () => {
    if (!isLeader) {
      toast.error("Only the room host can change control permissions.");
      return;
    }
    const nextMode = !leaderOnlyControl;
    setLeaderOnlyControl(nextMode);
    leaderOnlyControlRef.current = nextMode;
    channelRef.current?.send({
      type: "broadcast",
      event: "control-mode",
      payload: { leaderOnlyControl: nextMode, senderId: clientId },
    });
    toast(
      nextMode
        ? "Host Control: Only the host can play/pause or change video 🔒"
        : "Free Control: Anyone can play/pause or change video 🔓"
    );
  };

  const handleSelectVideo = useCallback(
    (item: VideoItem) => {
      if (leaderOnlyControlRef.current && !isLeaderRef.current) {
        toast("Room is in Host-Only control mode. Ask the host to change video or switch to Anyone mode.", {
          icon: "🔒",
        });
        return;
      }

      const vid = item.id.videoId;
      setVideoId(vid);
      videoIdRef.current = vid;
      isPlayingRef.current = true;

      try {
        playerRef.current?.loadVideoById({ videoId: vid, startSeconds: 0 });
        playerRef.current?.playVideo();
      } catch {}

      channelRef.current?.send({
        type: "broadcast",
        event: "set-video",
        payload: {
          videoId: vid,
          senderId: clientId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
        },
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
    [code, clientId]
  );

  const handlePlay = useCallback(async () => {
    // If state change was caused by remote network packet, don't echo back!
    if (isRemoteActionRef.current) {
      isRemoteActionRef.current = false;
      return;
    }

    if (leaderOnlyControlRef.current && !isLeaderRef.current) {
      toast("Room is in Host-Only control mode.", { icon: "🔒" });
      return;
    }

    let t = 0;
    try {
      t = (await playerRef.current?.getCurrentTime()) || 0;
    } catch {}

    isPlayingRef.current = true;
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
  }, [clientId]);

  const handlePause = useCallback(async () => {
    // If state change was caused by remote network packet, don't echo back!
    if (isRemoteActionRef.current) {
      isRemoteActionRef.current = false;
      return;
    }

    if (leaderOnlyControlRef.current && !isLeaderRef.current) {
      toast("Room is in Host-Only control mode.", { icon: "🔒" });
      return;
    }

    let t = 0;
    try {
      t = (await playerRef.current?.getCurrentTime()) || 0;
    } catch {}

    isPlayingRef.current = false;
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
  }, [clientId]);

  const handleSendChat = useCallback(
    (m: { sender: string; content: string }) => {
      const content = (m?.content || "").trim();
      if (!content) return;

      if (recordChatBurst() > CHAT_BURST_LIMIT) {
        toast.error("Slow down — sending messages too fast.");
        return;
      }

      const cleanSender = sanitizeName(userNameRef.current) || "Guest";
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
    [code, channelReady]
  );

  const saveName = (newName: string, isChange = false) => {
    const trimmed = sanitizeName(newName);
    if (!trimmed) {
      toast.error("Please enter your name");
      return;
    }

    const old = userName;
    setUserName(trimmed);
    userNameRef.current = trimmed;
    localStorage.setItem(
      LS_ROOM_META,
      JSON.stringify({ name: trimmed, role: userRole, roomName })
    );

    try {
      channelRef.current?.track({
        clientId,
        name: trimmed,
        role: userRoleRef.current,
        joinedAt: joinedAtRef.current,
      });
    } catch {}

    // Immediately update local presence list
    setPresenceUsers((prev) => {
      const idx = prev.findIndex((u) => u.clientId === clientId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], name: trimmed };
        return updated;
      }
      return [
        {
          clientId,
          name: trimmed,
          role: userRole,
          joinedAt: joinedAtRef.current,
        },
        ...prev,
      ];
    });

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
          title: `Join my watch party: ${roomName}`,
          url: href,
          text: `Watch YouTube together in sync in "${roomName}"!`,
        });
      } else {
        await navigator.clipboard.writeText(href);
        toast.success("Room link copied to clipboard! 🔗");
      }
    } catch {
      await navigator.clipboard.writeText(href);
      toast.success("Room link copied to clipboard! 🔗");
    }
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`Room Code ${code} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const forceSync = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "request-state",
      payload: { requester: clientId },
    });
    toast("Requested latest state from host 📡", { icon: "📡" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-pink-500/30 selection:text-pink-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Room details */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <h1 className="truncate text-sm sm:text-base font-bold text-white">
                  {roomName}
                </h1>
                <button
                  onClick={copyRoomCode}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-pink-400 hover:bg-white/10 transition"
                  title="Click to copy Room Code"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {code}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-medium">
                  <Users className="w-3 h-3 text-slate-400" />
                  {presenceCount} Online
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  Host:{" "}
                  <span className="font-semibold text-slate-200">
                    {isLeader ? "You" : hostUser?.name || "Host"}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Host Only Toggle */}
            <button
              onClick={toggleLeaderOnlyControl}
              title={
                leaderOnlyControl
                  ? "Host-Only Control: Only host can play/pause/change video (Click to allow anyone)"
                  : "Free Control: Anyone can play/pause/change video (Click to lock to host)"
              }
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                leaderOnlyControl
                  ? "border-pink-500/30 bg-pink-500/10 text-pink-300"
                  : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {leaderOnlyControl ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Host Control
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Anyone Can Control
                </>
              )}
            </button>

            {/* Theater Mode Button */}
            <button
              onClick={() => setTheaterMode((v) => !v)}
              className="hidden sm:inline-flex p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
              title={theaterMode ? "Exit Theater Mode" : "Enter Theater Mode"}
            >
              {theaterMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Sync Button */}
            <button
              onClick={forceSync}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition"
              title="Resync video with host"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>

            {/* Share Room Button */}
            <Button
              onClick={shareRoom}
              className="h-9 px-3.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-semibold shadow-md shadow-pink-600/20"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Share
            </Button>

            {/* Mobile Chat Drawer Button */}
            <Button
              variant="outline"
              onClick={() => setShowChatMobile(true)}
              className="h-9 px-3 border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 md:hidden text-xs"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row">
        {/* Left: Video Player + Now Playing + Search Bar */}
        <div className={`flex flex-col flex-1 min-w-0 ${theaterMode ? "w-full" : ""}`}>
          {/* Video Container */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/80">
            {videoId ? (
              <div className="aspect-video w-full">
                <VideoPlayer
                  ref={videoPlayerRef}
                  videoId={videoId}
                  onReady={(p: YouTubePlayer) => {
                    playerRef.current = p;
                  }}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onTime={() => {}}
                  onBuffer={() => {}}
                  onEnded={() => {}}
                  onError={() =>
                    toast.error("Video player error — try another video URL")
                  }
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-4">
                  <Film className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-white">
                  No Video Playing
                </h2>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Search YouTube below or paste any YouTube video link to start the watch party!
                </p>
              </div>
            )}
          </div>

          {/* Now Playing Banner */}
          {nowPlaying && (
            <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur-md">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-pink-400 animate-pulse shrink-0" />
                  <p className="truncate text-sm font-semibold text-white">
                    {nowPlaying.title}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 ml-6">
                  {nowPlaying.channel}
                </p>
              </div>
            </div>
          )}

          {/* Search & Paste Section */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <SearchBar onSelectVideo={handleSelectVideo} />
          </div>
        </div>

        {/* Right Sidebar: Chat & Participants (Desktop) */}
        {!theaterMode && (
          <aside className="hidden w-full max-w-sm shrink-0 flex-col rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl md:flex h-[calc(100vh-130px)] sticky top-24 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex items-center border-b border-white/10 bg-slate-950/40 p-2 gap-1.5">
              <button
                onClick={() => setSidebarTab("chat")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                  sidebarTab === "chat"
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Chat</span>
                {messages.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">
                    {messages.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setSidebarTab("participants")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                  sidebarTab === "participants"
                    ? "bg-pink-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Who&apos;s Here</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">
                  {presenceCount}
                </span>
              </button>
            </div>

            {/* Profile Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-slate-950/20 text-xs">
              <span className="text-slate-400">
                You are: <strong className="text-slate-200 font-semibold">{userName}</strong>
                {isLeader && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                    HOST
                  </span>
                )}
              </span>
              <button
                onClick={() => {
                  setTempName(userName);
                  setShowChangeName(true);
                }}
                className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 font-medium transition"
              >
                <Edit3 className="w-3 h-3" /> Change
              </button>
            </div>

            {/* Tab Panels */}
            {sidebarTab === "chat" ? (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <ChatBox
                  messages={messages}
                  onSend={handleSendChat}
                  userName={userName}
                />
              </div>
            ) : (
              <div className="flex-1 p-4 overflow-y-auto space-y-2.5 scrollbar-thin">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-3">
                  Online Participants ({presenceCount})
                </p>
                {displayedUsers.map((user) => {
                  const userIsLeader = user.clientId === leaderId;
                  const isMe = user.clientId === clientId;

                  return (
                    <div
                      key={user.clientId}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-slate-950/40"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white font-bold text-xs grid place-items-center shrink-0">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                            {user.name} {isMe && <span className="text-slate-400 text-[10px]">(You)</span>}
                          </p>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        </div>
                      </div>

                      {userIsLeader && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold">
                          <Crown className="w-3 h-3" /> Host
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        )}
      </main>

      {/* Mobile Chat & Participants Drawer */}
      {showChatMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowChatMobile(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t border-white/10 bg-slate-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Room Chat & Users</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-pink-500/20 text-pink-400 font-semibold">
                  {presenceCount} online
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChatMobile(false)}
                className="h-8 border-white/10 text-xs"
              >
                Close
              </Button>
            </div>
            <div className="h-[60vh] flex flex-col">
              <ChatBox
                messages={messages}
                onSend={handleSendChat}
                userName={userName}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ask Name Modal */}
      {askName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h2 className="text-xl font-bold text-white">Enter Your Name</h2>
            <p className="mt-1 text-xs text-slate-400">
              Choose a display name so others in the room know who you are.
            </p>
            <input
              type="text"
              required
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="e.g. John Doe"
              maxLength={40}
              className="mt-4 mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              onKeyDown={(e) => e.key === "Enter" && saveName(tempName)}
            />
            <Button
              onClick={() => saveName(tempName)}
              disabled={!tempName.trim()}
              className="w-full h-11 bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-lg shadow-pink-600/30"
            >
              Continue to Room →
            </Button>
          </div>
        </div>
      )}

      {/* Change Name Modal */}
      {showChangeName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <h2 className="text-xl font-bold text-white">Change Display Name</h2>
            <input
              type="text"
              required
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="New name"
              maxLength={40}
              className="mt-4 mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              onKeyDown={(e) => e.key === "Enter" && saveName(tempName, true)}
            />
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                onClick={() => setShowChangeName(false)}
                className="flex-1 border-white/10 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => saveName(tempName, true)}
                disabled={!tempName.trim()}
                className="flex-1 bg-pink-600 hover:bg-pink-500 text-white font-semibold shadow-lg shadow-pink-600/30"
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
