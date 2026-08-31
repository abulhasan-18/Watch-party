"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from "react";
import YouTube, { YouTubeProps, YouTubePlayer, YouTubeEvent } from "react-youtube";

export type VideoPlayerHandle = {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => Promise<void>;
  load: (
    id: string,
    startSeconds?: number,
    autoPlay?: boolean
  ) => Promise<void>;
  getCurrentTime: () => Promise<number>;
  getPlayer: () => YouTubePlayer | null;
  syncTo: (state: {
    isPlaying: boolean;
    currentTime: number;
    at: number;
  }) => Promise<void>;
};

type Props = {
  videoId: string;
  onReady?: (player: YouTubePlayer) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onBuffer?: () => void;
  onError?: (err: YouTubeEvent) => void;
  onStateChange?: (state: number) => void;
  /** called periodically while playing (≈4 times/sec) */
  onTime?: (t: number) => void;
  /** initial start seconds when loading (default 0) */
  startSeconds?: number;
  /** autoplay on mount/id change (default true) */
  autoPlay?: boolean;
  /** container className */
  className?: string;
  /** aspect ratio height padding (default 56.25 for 16:9) */
  aspectPct?: number;
};

const YTState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  {
    videoId,
    onReady,
    onPlay,
    onPause,
    onEnded,
    onBuffer,
    onError,
    onStateChange,
    onTime,
    startSeconds = 0,
    autoPlay = true,
    className = "w-full max-w-5xl mx-auto",
    aspectPct = 56.25, // 16:9
  },
  ref
) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const readyRef = useRef(false);
  const pendingLoadRef = useRef<{
    id: string;
    start: number;
    auto: boolean;
  } | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEmittedTimeRef = useRef(0);
  const [localVideoId, setLocalVideoId] = useState(videoId);

  // safe wrappers
  const safePlay = useCallback(async () => {
    try {
      await playerRef.current?.playVideo();
    } catch {}
  }, []);

  const safePause = useCallback(async () => {
    try {
      await playerRef.current?.pauseVideo();
    } catch {}
  }, []);

  const safeSeek = useCallback(async (sec: number, allowSeekAhead = true) => {
    try {
      await playerRef.current?.seekTo(sec, allowSeekAhead);
    } catch {}
  }, []);

  const safeLoad = useCallback(async (id: string, start = 0, auto = true) => {
    if (!playerRef.current) {
      pendingLoadRef.current = { id, start, auto };
      return;
    }
    try {
      await playerRef.current.loadVideoById({
        videoId: id,
        startSeconds: start,
      });
      if (auto) await playerRef.current.playVideo();
    } catch {}
  }, []);

  const safeGetTime = useCallback(async () => {
    try {
      return (await playerRef.current?.getCurrentTime()) || 0;
    } catch {
      return 0;
    }
  }, []);

  // keep local state in sync
  useEffect(() => {
    if (videoId === localVideoId) return;
    setLocalVideoId(videoId);
    if (readyRef.current && playerRef.current) {
      safeLoad(videoId, 0, autoPlay);
    } else {
      pendingLoadRef.current = { id: videoId, start: 0, auto: autoPlay };
    }
  }, [videoId, localVideoId, autoPlay, safeLoad]);

  // visibility quality optimization
  useEffect(() => {
    const onVis = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        if (document.visibilityState === "hidden") {
          p.setPlaybackQuality("small");
        } else {
          p.setPlaybackQuality("default");
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // progress timer
  const startProgress = useCallback(() => {
    if (progressTimerRef.current) return;
    progressTimerRef.current = setInterval(async () => {
      if (!playerRef.current || !onTime) return;
      try {
        const t = (await playerRef.current.getCurrentTime()) || 0;
        if (Math.abs(t - lastEmittedTimeRef.current) >= 0.2) {
          lastEmittedTimeRef.current = t;
          onTime(t);
        }
      } catch {}
    }, 250);
  }, [onTime]);

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  // YouTube callbacks
  const handleReady: YouTubeProps["onReady"] = (e) => {
    playerRef.current = e.target;
    readyRef.current = true;

    if (pendingLoadRef.current) {
      const { id, start, auto } = pendingLoadRef.current;
      pendingLoadRef.current = null;
      safeLoad(id, start, auto);
    } else {
      if (autoPlay && startSeconds > 0) {
        safeSeek(startSeconds);
        safePlay();
      } else if (autoPlay) {
        safePlay();
      }
    }

    onReady?.(e.target);
  };

  const handleStateChange: YouTubeProps["onStateChange"] = async (e) => {
    const s = e.data;
    onStateChange?.(s);

    if (s === YTState.PLAYING) {
      startProgress();
      onPlay?.();
    } else if (s === YTState.PAUSED) {
      stopProgress();
      onPause?.();
    } else if (s === YTState.BUFFERING) {
      onBuffer?.();
    } else if (s === YTState.ENDED) {
      stopProgress();
      onEnded?.();
    }
  };

  const handleError: YouTubeProps["onError"] = (e) => {
    onError?.(e);
  };

  // expose imperative handle
  useImperativeHandle(
    ref,
    (): VideoPlayerHandle => ({
      play: () => safePlay(),
      pause: () => safePause(),
      seekTo: (s, a = true) => safeSeek(s, a),
      load: (id: string, start = 0, auto = true) => safeLoad(id, start, auto),
      getCurrentTime: () => safeGetTime(),
      getPlayer: () => playerRef.current || null,
      syncTo: async ({ isPlaying, currentTime, at }) => {
        const elapsed = Math.max(0, (Date.now() - at) / 1000);
        const target = Math.max(0, currentTime + (isPlaying ? elapsed : 0));
        await safeSeek(target, true);
        if (isPlaying) await safePlay();
        else await safePause();
      },
    }),
    [safePlay, safePause, safeSeek, safeLoad, safeGetTime]
  );

  return (
    <div className={className}>
      <div className="relative" style={{ paddingBottom: `${aspectPct}%` }}>
        <YouTube
          videoId={localVideoId}
          onReady={handleReady}
          onPlay={() => {}}
          onPause={() => {}}
          onEnd={() => {}}
          onStateChange={handleStateChange}
          onError={handleError}
          className="absolute top-0 left-0 w-full h-full"
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: autoPlay ? 1 : 0,
              controls: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              iv_load_policy: 3,
            },
          }}
        />
      </div>
    </div>
  );
});

export default VideoPlayer;
