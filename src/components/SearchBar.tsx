"use client";

import { useState } from "react";

interface VideoItem {
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
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VideoItem[]>([]);

  const searchYouTube = async () => {
    if (!query.trim()) return;
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
        query
      )}&maxResults=9&key=${apiKey}`
    );
    const data = await res.json();
    setResults(data.items || []);
  };

  return (
    <div className="mt-6 w-full max-w-6xl mx-auto">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search YouTube..."
          className="flex-1 border px-4 py-2 rounded-lg focus:ring-2 focus:ring-pink-500"
          onKeyDown={(e) => e.key === "Enter" && searchYouTube()}
        />
        <button
          onClick={searchYouTube}
          className="px-5 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition"
        >
          Search
        </button>
      </div>

      {/* Results */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((item) => (
          <div
            key={item.id.videoId}
            onClick={() => onSelectVideo(item)}
            className="cursor-pointer bg-white dark:bg-[#111] rounded-lg shadow hover:shadow-lg transition overflow-hidden"
          >
            <img
              src={item.snippet.thumbnails.medium.url}
              alt={item.snippet.title}
              className="w-full aspect-video object-cover"
            />
            <div className="p-3">
              <p className="text-sm font-semibold line-clamp-2">
                {item.snippet.title}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {item.snippet.channelTitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
