/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { Search, Link as LinkIcon, Play, AlertCircle, Loader2 } from "lucide-react";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/lib/youtube";
import { toast } from "react-hot-toast";

export interface VideoItem {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium: { url: string } };
  };
}

interface Props {
  onSelectVideo: (item: VideoItem) => void;
}

export default function SearchBar({ onSelectVideo }: Props) {
  const [activeTab, setActiveTab] = useState<"search" | "url">("search");
  const [query, setQuery] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [results, setResults] = useState<VideoItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if url input has a valid YouTube video ID
  const detectedVideoId = extractYouTubeVideoId(urlInput);

  const searchYouTube = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Check if user accidentally pasted a YouTube URL into search query
    const directId = extractYouTubeVideoId(trimmed);
    if (directId) {
      onSelectVideo({
        id: { videoId: directId },
        snippet: {
          title: "YouTube Video",
          channelTitle: "Direct Link",
          thumbnails: { medium: { url: getYouTubeThumbnailUrl(directId) } },
        },
      });
      toast.success("Playing video from direct link! 🎬");
      setQuery("");
      return;
    }

    setSearching(true);
    setErrorMsg(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      if (!apiKey) {
        throw new Error("YouTube API Key not configured. Please paste a direct YouTube video URL.");
      }

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
          trimmed
        )}&maxResults=9&key=${apiKey}`
      );

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error.message || "YouTube search quota exceeded. Use direct URL tab.");
      }

      setResults(data.items || []);
      if (!data.items?.length) {
        toast("No videos found for this search query.", { icon: "🔍" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch YouTube search results.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  };

  const handlePlayDirectUrl = () => {
    if (!detectedVideoId) {
      toast.error("Please enter a valid YouTube URL or 11-digit Video ID.");
      return;
    }

    onSelectVideo({
      id: { videoId: detectedVideoId },
      snippet: {
        title: "YouTube Video",
        channelTitle: "Direct Link",
        thumbnails: { medium: { url: getYouTubeThumbnailUrl(detectedVideoId) } },
      },
    });
    toast.success("Video loaded! 🍿");
    setUrlInput("");
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3 mb-4">
        <button
          onClick={() => setActiveTab("search")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "search"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <Search className="w-3.5 h-3.5" /> Search YouTube
        </button>
        <button
          onClick={() => setActiveTab("url")}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === "url"
              ? "bg-pink-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" /> Paste Video Link / ID
        </button>
      </div>

      {activeTab === "search" ? (
        <>
          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, movies, trailers, podcast clips..."
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-xs outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                onKeyDown={(e) => e.key === "Enter" && searchYouTube()}
              />
            </div>
            <button
              onClick={searchYouTube}
              disabled={searching || !query.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-pink-600/20 transition-all disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Search</span>
            </button>
          </div>

          {/* Error notice if quota is out */}
          {errorMsg && (
            <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </span>
              <button
                onClick={() => setActiveTab("url")}
                className="underline font-semibold hover:text-white"
              >
                Paste URL instead →
              </button>
            </div>
          )}

          {/* Results Grid */}
          {results.length > 0 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item) => (
                <div
                  key={item.id.videoId}
                  onClick={() => onSelectVideo(item)}
                  className="group cursor-pointer rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-xs hover:shadow-lg hover:border-pink-500/50 transition-all overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                    <img
                      src={item.snippet.thumbnails.medium.url}
                      alt={item.snippet.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="p-2.5 rounded-full bg-pink-600 text-white shadow-lg">
                        <Play className="w-5 h-5 fill-current" />
                      </span>
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                      {item.snippet.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                      {item.snippet.channelTitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Direct URL / ID Tab */
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste YouTube link (e.g. https://youtu.be/... or https://youtube.com/watch?v=...)"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-xs outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                onKeyDown={(e) => e.key === "Enter" && handlePlayDirectUrl()}
              />
            </div>
            <button
              onClick={handlePlayDirectUrl}
              disabled={!detectedVideoId}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-pink-600/20 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Now</span>
            </button>
          </div>

          {detectedVideoId && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-pink-500/30 bg-pink-500/10">
              <img
                src={getYouTubeThumbnailUrl(detectedVideoId)}
                alt="Video preview"
                className="w-20 aspect-video rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  Valid Video ID: <span className="font-mono text-pink-400">{detectedVideoId}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ready to stream to everyone in the room.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
