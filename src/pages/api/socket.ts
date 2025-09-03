// src/pages/api/socket.ts
import { NextApiResponseServerIO } from "@/types/next";
import { Server as IOServer } from "socket.io";

export const config = { api: { bodyParser: false } };

type ChatMsg = { sender: string; content: string; createdAt: string };

type Client = {
  name: string;
  sockets: Set<string>; // all live sockets for this clientId
};

type Room = {
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  lastUpdatedMs: number;
  messages: ChatMsg[];
  clients: Record<string, Client>; // clientId -> Client
};

const MAX_MESSAGES = 50;

const nowIso = () => new Date().toISOString();
const cleanName = (s: string) => {
  const t = (s || "").trim();
  if (!t) return "Guest";
  return t.slice(0, 40);
};

export default function handler(req: any, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server, { path: "/api/socket" });
    res.socket.server.io = io;

    const rooms: Record<string, Room> = {};
    // socket.id -> { roomCode, clientId }
    const socketIndex = new Map<
      string,
      { roomCode: string; clientId: string }
    >();
    // socket.id -> lastRenameAt (rate limit)
    const renameRL = new Map<string, number>();

    const setRoomActive = async (id: string, isActive: boolean) => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase
          .from("rooms")
          .update({ is_active: isActive, last_active: nowIso() })
          .eq("id", id);
        if (error) console.error("Supabase is_active update failed:", error);
      } catch (e) {
        console.error("Supabase is_active threw:", e);
      }
    };

    const bumpLastActive = async (id: string) => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase
          .from("rooms")
          .update({ last_active: nowIso() })
          .eq("id", id);
        if (error) console.error("Supabase last_active bump failed:", error);
      } catch (e) {
        console.error("Supabase last_active threw:", e);
      }
    };

    io.on("connection", (socket) => {
      // JOIN ROOM
      socket.on(
        "join-room",
        async (code: string, name: string, clientIdMaybe?: string) => {
          try {
            const roomCode = (code || "").trim().toUpperCase();
            const clientId =
              (
                clientIdMaybe ||
                socket.handshake.auth?.clientId ||
                ""
              ).toString() || socket.id; // fallback for legacy clients
            const username = cleanName(name);

            if (!roomCode) return;

            socket.join(roomCode);
            socketIndex.set(socket.id, { roomCode, clientId });

            if (!rooms[roomCode]) {
              rooms[roomCode] = {
                videoId: null,
                isPlaying: false,
                currentTime: 0,
                lastUpdatedMs: Date.now(),
                messages: [],
                clients: {},
              };
            }
            const r = rooms[roomCode];

            // create or get client record
            let client = r.clients[clientId];
            let firstSocketForClient = false;
            if (!client) {
              client = { name: username, sockets: new Set() };
              r.clients[clientId] = client;
              firstSocketForClient = true;
            }
            client.sockets.add(socket.id);

            // if first socket for this client in this room -> joined message
            if (firstSocketForClient) {
              // ensure latest name
              client.name = username;

              const sysMsg: ChatMsg = {
                sender: "System",
                content: `${client.name} joined the room`,
                createdAt: nowIso(),
              };
              r.messages.unshift(sysMsg);
              if (r.messages.length > MAX_MESSAGES) r.messages.pop();
              io.to(roomCode).emit("chat", sysMsg);

              // set room active on first client present
              setRoomActive(roomCode, true);
            } else {
              // just a reconnection / additional tab: no "joined" spam
              // update name if this join carried a newer one
              if (username && username !== client.name) client.name = username;
              bumpLastActive(roomCode);
            }

            // send current playback state to THIS socket
            let startSeconds = r.currentTime;
            if (r.isPlaying)
              startSeconds += (Date.now() - r.lastUpdatedMs) / 1000;
            socket.emit("init", {
              videoId: r.videoId,
              isPlaying: r.isPlaying,
              currentTime: r.currentTime,
              startSeconds,
              messages: r.messages,
              // not exposing users list publicly; add if you need a roster
            });
          } catch (err) {
            console.error("join-room error:", err);
          }
        }
      );

      // RENAME (requires clientId, safe, rate-limited, ignores if not in room)
      socket.on(
        "change-name",
        (
          payload: { roomCode: string; newName: string; clientId?: string },
          ack?: (ok: boolean) => void
        ) => {
          try {
            const code = (payload?.roomCode || "").trim().toUpperCase();
            const newName = cleanName(payload?.newName);
            if (!code || !newName) {
              ack?.(false);
              return;
            }

            const r = rooms[code];
            if (!r) {
              ack?.(false);
              return;
            }

            // resolve clientId
            const idx = socketIndex.get(socket.id);
            const clientId = payload?.clientId || idx?.clientId;
            if (!clientId) {
              ack?.(false);
              return;
            }

            const client = r.clients[clientId];
            if (!client) {
              // not in room (maybe already fully disconnected)
              ack?.(false);
              return;
            }

            // rate limit per socket
            const now = Date.now();
            const last = renameRL.get(socket.id) || 0;
            if (now - last < 800) {
              ack?.(false);
              return;
            }
            renameRL.set(socket.id, now);

            const oldName = client.name || "Guest";
            if (oldName === newName) {
              ack?.(true);
              return;
            }

            client.name = newName;

            const sysMsg: ChatMsg = {
              sender: "System",
              content: `${oldName} changed their name to ${newName}`,
              createdAt: nowIso(),
            };
            r.messages.unshift(sysMsg);
            if (r.messages.length > MAX_MESSAGES) r.messages.pop();
            io.to(code).emit("chat", sysMsg);

            bumpLastActive(code);
            ack?.(true);
          } catch (err) {
            console.error("change-name error:", err);
            ack?.(false);
          }
        }
      );

      // SET VIDEO
      socket.on("set-video", ({ roomCode, videoId }) => {
        const code = (roomCode || "").trim().toUpperCase();
        const r = rooms[code];
        if (!r) return;
        r.videoId = videoId;
        r.currentTime = 0;
        r.isPlaying = true;
        r.lastUpdatedMs = Date.now();
        io.to(code).emit("set-video", videoId);
        io.to(code).emit("playback", { isPlaying: true, currentTime: 0 });
        bumpLastActive(code);
      });

      // PLAYBACK
      socket.on("playback", ({ roomCode, isPlaying, currentTime }) => {
        const code = (roomCode || "").trim().toUpperCase();
        const r = rooms[code];
        if (!r) return;
        r.isPlaying = !!isPlaying;
        r.currentTime = Number(currentTime || 0);
        r.lastUpdatedMs = Date.now();
        io.to(code).emit("playback", {
          isPlaying: r.isPlaying,
          currentTime: r.currentTime,
        });
        bumpLastActive(code);
      });

      // CHAT (ignore client-sent sender; use server’s name)
      socket.on("chat", ({ roomCode, content, clientId: clientIdMaybe }) => {
        const code = (roomCode || "").trim().toUpperCase();
        const r = rooms[code];
        if (!r) return;

        const idx = socketIndex.get(socket.id);
        const clientId = clientIdMaybe || idx?.clientId;
        const senderName = (clientId && r.clients[clientId]?.name) || "Guest";

        const m: ChatMsg = {
          sender: senderName,
          content: String(content ?? "").slice(0, 2000),
          createdAt: nowIso(),
        };
        r.messages.unshift(m);
        if (r.messages.length > MAX_MESSAGES) r.messages.pop();
        io.to(code).emit("chat", m);
        bumpLastActive(code);
      });

      // DISCONNECT
      socket.on("disconnect", async () => {
        try {
          const idx = socketIndex.get(socket.id);
          if (!idx) return;
          const { roomCode, clientId } = idx;
          socketIndex.delete(socket.id);
          renameRL.delete(socket.id);

          const r = rooms[roomCode];
          if (!r) return;

          const client = r.clients[clientId];
          if (!client) return;

          client.sockets.delete(socket.id);

          // if this was the last socket for that client -> emit "left"
          if (client.sockets.size === 0) {
            const latestName = client.name || "Someone";
            delete r.clients[clientId];

            const sysMsg: ChatMsg = {
              sender: "System",
              content: `${latestName} left the room`,
              createdAt: nowIso(),
            };
            r.messages.unshift(sysMsg);
            if (r.messages.length > MAX_MESSAGES) r.messages.pop();
            io.to(roomCode).emit("chat", sysMsg);
          }

          // room active flip
          if (Object.keys(r.clients).length === 0) {
            // no clients at all
            setRoomActive(roomCode, false);
          } else {
            bumpLastActive(roomCode);
          }
        } catch (err) {
          console.error("disconnect error:", err);
        }
      });
    });
  }

  res.end();
}
