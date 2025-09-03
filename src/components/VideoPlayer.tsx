"use client";

import { useEffect, useRef } from "react";
import YouTube from "react-youtube";

type Props = {
  videoId: string;
  onReady: (player: any) => void;
  onPlay: () => void;
  onPause: () => void;
};

export default function VideoPlayer({
  videoId,
  onReady,
  onPlay,
  onPause,
}: Props) {
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!playerRef.current) return;
    // load & play whenever a new id arrives
    playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
    playerRef.current.playVideo();
  }, [videoId]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative pb-[56.25%]">
        {" "}
        {/* 16:9 ratio */}
        <YouTube
          videoId={videoId}
          onReady={(e) => {
            playerRef.current = e.target;
            onReady(e.target);
          }}
          onPlay={onPlay}
          onPause={onPause}
          className="absolute top-0 left-0 w-full h-full"
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              controls: 1,
            },
          }}
        />
      </div>
    </div>
  );
}
