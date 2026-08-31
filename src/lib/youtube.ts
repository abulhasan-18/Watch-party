/**
 * Extracts a valid 11-character YouTube video ID from various URL formats or raw IDs.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - Raw 11-char video ID (e.g., dQw4w9WgXcQ)
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Check if it's already a raw 11-character video ID
  const rawIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (rawIdPattern.test(trimmed)) {
    return trimmed;
  }

  // 2. Try parsing as a URL
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();

    // youtu.be/<id>
    if (hostname === "youtu.be") {
      const pathname = url.pathname.slice(1).split("/")[0].split("?")[0];
      if (rawIdPattern.test(pathname)) {
        return pathname;
      }
    }

    // youtube.com / m.youtube.com / music.youtube.com
    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {
      // /watch?v=<id>
      const vParam = url.searchParams.get("v");
      if (vParam && rawIdPattern.test(vParam)) {
        return vParam;
      }

      // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      const pathParts = url.pathname.split("/").filter(Boolean);
      const prefix = pathParts[0]?.toLowerCase();
      if (["embed", "shorts", "live", "v"].includes(prefix) && pathParts[1]) {
        const id = pathParts[1].split("?")[0];
        if (rawIdPattern.test(id)) {
          return id;
        }
      }
    }
  } catch {
    // If URL parsing fails, fallback to regex matching
  }

  // 3. Fallback regex for unstructured YouTube links
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Returns the highest quality thumbnail URL for a given YouTube video ID.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
