import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatBox, { Message } from "./ChatBox";

describe("ChatBox component", () => {
  const sampleMessages: Message[] = [
    {
      id: "1",
      sender: "Alice",
      content: "Hello everyone!",
      createdAt: new Date().toISOString(),
      kind: "user",
    },
    {
      id: "2",
      sender: "System",
      content: "Bob joined the room",
      createdAt: new Date().toISOString(),
      kind: "system",
    },
  ];

  it("renders messages and system notifications", () => {
    render(
      <ChatBox
        messages={sampleMessages}
        onSend={() => {}}
        userName="Alice"
      />
    );

    expect(screen.getByText("Hello everyone!")).toBeInTheDocument();
    expect(screen.getByText("Bob joined the room")).toBeInTheDocument();
  });

  it("calls onSend when user types a message and clicks Send", async () => {
    const handleSend = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatBox
        messages={[]}
        onSend={handleSend}
        userName="Alice"
      />
    );

    const textarea = screen.getByPlaceholderText(/type a message or press enter/i);
    const sendButton = screen.getByTitle("Send");

    await user.type(textarea, "Let's watch this movie!");
    await user.click(sendButton);

    expect(handleSend).toHaveBeenCalledWith({
      sender: "Alice",
      content: "Let's watch this movie!",
    });
    expect(textarea).toHaveValue("");
  });

  it("sends message on Enter keypress (without Shift)", async () => {
    const handleSend = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatBox
        messages={[]}
        onSend={handleSend}
        userName="Alice"
      />
    );

    const textarea = screen.getByPlaceholderText(/type a message or press enter/i);
    await user.type(textarea, "Pressing enter{Enter}");

    expect(handleSend).toHaveBeenCalledWith({
      sender: "Alice",
      content: "Pressing enter",
    });
  });

  it("sends quick emoji reaction when clicked", async () => {
    const handleSend = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatBox
        messages={[]}
        onSend={handleSend}
        userName="Alice"
      />
    );

    const popEmoji = screen.getByTitle("Send 🍿");
    await user.click(popEmoji);

    expect(handleSend).toHaveBeenCalledWith({
      sender: "Alice",
      content: "🍿",
    });
  });

  it("does not send empty or whitespace-only messages", async () => {
    const handleSend = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatBox
        messages={[]}
        onSend={handleSend}
        userName="Alice"
      />
    );

    const textarea = screen.getByPlaceholderText(/type a message or press enter/i);
    await user.type(textarea, "   {Enter}");

    expect(handleSend).not.toHaveBeenCalled();
  });
});
