import { describe, it, expect } from "vitest";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "./youtube";

describe("extractYouTubeVideoId", () => {
  it("extracts from standard watch URLs", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
    expect(
      extractYouTubeVideoId("http://youtube.com/watch?v=dQw4w9WgXcQ&t=42s")
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from short youtu.be URLs", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(extractYouTubeVideoId("http://youtu.be/dQw4w9WgXcQ?t=10")).toBe(
      "dQw4w9WgXcQ"
    );
  });

  it("extracts from embed and shorts URLs", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
    expect(
      extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
    expect(
      extractYouTubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")
    ).toBe("dQw4w9WgXcQ");
  });

  it("extracts from raw 11-character video IDs", () => {
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("  dQw4w9WgXcQ  ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid or non-YouTube URLs", () => {
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId("https://google.com")).toBeNull();
    expect(extractYouTubeVideoId("https://vimeo.com/12345678")).toBeNull();
    expect(extractYouTubeVideoId("not a video id")).toBeNull();
  });
});

describe("getYouTubeThumbnailUrl", () => {
  it("constructs correct thumbnail url", () => {
    expect(getYouTubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });
});
