"use client";

import ChatBox from "@/components/ChatBox";
import SearchBar from "@/components/SearchBar";
import VideoPlayer from "@/components/VideoPlayer";
import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

let socket: Socket | null = null;

type VideoItem = {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string } };
  };
};

type ChatMessage = { sender: string; content: string; createdAt?: string };

const LS_ROOM_META = "wp.roomMeta";

export default function RoomPageClient({
  code,
  roomName,
}: {
  code: string;
  roomName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nowPlaying, setNowPlaying] = useState<{
    title: string;
    channel: string;
  } | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Guest");
  const [askName, setAskName] = useState(false);
  const [showChangeName, setShowChangeName] = useState(false);
  const [tempName, setTempName] = useState("");

  const playerRef = useRef<any>(null);

  // 🔹 Load saved name
  useEffect(() => {
    const raw = localStorage.getItem(LS_ROOM_META);
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        if (meta?.name) setUserName(meta.name);
      } catch {
        setAskName(true);
      }
    } else {
      setAskName(true);
    }
  }, []);

  // 🔹 Boot socket
  useEffect(() => {
    if (!code) return;
    if (socket) return;

    fetch("/api/socket");
    socket = io({ path: "/api/socket" });

    socket.emit("join-room", code, userName);

    socket.on("init", (room: any) => {
      setMessages(room.messages ?? []);
      if (room.videoId && playerRef.current) {
        const elapsed =
          (Date.now() - (room.lastUpdatedMs || Date.now())) / 1000;
        const startSeconds =
          (room.startSeconds ?? room.currentTime ?? 0) + elapsed;

        setVideoId(room.videoId);
        playerRef.current.loadVideoById({
          videoId: room.videoId,
          startSeconds,
        });

        room.isPlaying
          ? playerRef.current.playVideo()
          : playerRef.current.pauseVideo();
      } else {
        setVideoId(null);
      }
    });

    socket.on("set-video", (vid: string) => {
      setVideoId(vid);
      playerRef.current?.loadVideoById({ videoId: vid, startSeconds: 0 });
      playerRef.current?.playVideo();
    });

    socket.on("playback", ({ isPlaying, currentTime }) => {
      if (!playerRef.current) return;
      playerRef.current.seekTo(currentTime, true);
      isPlaying
        ? playerRef.current.playVideo()
        : playerRef.current.pauseVideo();
    });

    socket.on("chat", (m: ChatMessage) => setMessages((prev) => [m, ...prev]));

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [code, userName]);

  // 🔹 Video handlers
  const handleSelectVideo = useCallback(
    (item: VideoItem) => {
      if (!code) return;
      const vid = item.id.videoId;
      setVideoId(vid);
      playerRef.current?.loadVideoById({ videoId: vid, startSeconds: 0 });
      playerRef.current?.playVideo();
      socket?.emit("set-video", { roomCode: code, videoId: vid });
      socket?.emit("playback", {
        roomCode: code,
        isPlaying: true,
        currentTime: 0,
      });
      setNowPlaying({
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
      });
    },
    [code]
  );

  const handlePlay = useCallback(async () => {
    if (!code) return;
    const time = await playerRef.current?.getCurrentTime();
    socket?.emit("playback", {
      roomCode: code,
      isPlaying: true,
      currentTime: time,
    });
  }, [code]);

  const handlePause = useCallback(async () => {
    if (!code) return;
    const time = await playerRef.current?.getCurrentTime();
    socket?.emit("playback", {
      roomCode: code,
      isPlaying: false,
      currentTime: time,
    });
  }, [code]);

  const handleSendChat = useCallback(
    (msg: { sender: string; content: string }) => {
      if (!code) return;
      socket?.emit("chat", { roomCode: code, ...msg });
    },
    [code]
  );

  // 🔹 Save name
  const saveName = (newName: string, isChange = false) => {
    if (!newName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setUserName(newName.trim());
    localStorage.setItem(
      LS_ROOM_META,
      JSON.stringify({ name: newName.trim(), role: "guest" })
    );
    if (isChange) {
      socket?.emit("change-name", { roomCode: code, newName: newName.trim() });
    }
    setAskName(false);
    setShowChangeName(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-dvh">
      {/* Ask name modal */}
      {askName && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-white dark:bg-[#111] p-6 rounded-xl shadow-xl max-w-sm w-full">
            <h2 className="text-lg font-bold mb-3">Change your name</h2>
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="New Name"
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

      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Header */}
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
          <div className="w-full aspect-video max-h-[65vh]">
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

      {/* Chat */}
      <ChatBox
        messages={messages}
        onSend={handleSendChat}
        userName={userName}
      />
    </div>
  );
}
