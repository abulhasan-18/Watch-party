import { describe, it, expect } from "vitest";
import { cn, generateRoomId } from "./utils";

describe("cn utility", () => {
  it("merges class names properly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });
});

describe("generateRoomId", () => {
  it("generates string of requested default length (6)", () => {
    const id = generateRoomId();
    expect(id).toHaveLength(6);
    expect(typeof id).toBe("string");
  });

  it("generates string of specified length", () => {
    const id = generateRoomId(8);
    expect(id).toHaveLength(8);
  });

  it("only contains uppercase alphanumeric characters without confusing characters (0, O, 1, I)", () => {
    const id = generateRoomId(20);
    expect(/^[A-HJ-NP-Z2-9]+$/.test(id)).toBe(true);
  });
});
