import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoomCard from "./RoomCard";

describe("RoomCard component", () => {
  it("renders title, description and button label", () => {
    render(
      <RoomCard
        title="Create a Room"
        description="Host a watch party"
        actionLabel="Get Started"
        onClick={() => {}}
      />
    );

    expect(screen.getByText("Create a Room")).toBeInTheDocument();
    expect(screen.getByText("Host a watch party")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("calls onClick handler when button is clicked", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <RoomCard
        title="Join Room"
        description="Enter code to join"
        actionLabel="Join Now"
        onClick={handleClick}
      />
    );

    const button = screen.getByRole("button", { name: /join now/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
