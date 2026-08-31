import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SearchBar from "./SearchBar";

describe("SearchBar component", () => {
  it("renders search tab and URL tab", () => {
    render(<SearchBar onSelectVideo={() => {}} />);

    expect(screen.getByRole("button", { name: /search youtube/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste video link/i })).toBeInTheDocument();
  });

  it("handles direct URL pasting directly in search input without API call", async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSelectVideo={handleSelect} />);

    const searchInput = screen.getByPlaceholderText(/search songs, movies/i);
    const searchButton = screen.getByRole("button", { name: /^search$/i });

    await user.type(searchInput, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await user.click(searchButton);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: { videoId: "dQw4w9WgXcQ" },
      })
    );
  });

  it("switches to URL tab and enables Play button for valid YouTube URL", async () => {
    const handleSelect = vi.fn();
    const user = userEvent.setup();

    render(<SearchBar onSelectVideo={handleSelect} />);

    const urlTab = screen.getByRole("button", { name: /paste video link/i });
    await user.click(urlTab);

    const urlInput = screen.getByPlaceholderText(/paste youtube link/i);
    const playButton = screen.getByRole("button", { name: /play now/i });

    expect(playButton).toBeDisabled();

    await user.type(urlInput, "https://youtu.be/dQw4w9WgXcQ");

    expect(playButton).not.toBeDisabled();

    await user.click(playButton);

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: { videoId: "dQw4w9WgXcQ" },
      })
    );
  });
});
