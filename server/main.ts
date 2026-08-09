// To run: deno run --allow-net --allow-env server.ts
import * as log from "jsr:@std/log";
import { encode, decode } from "@gz/jwt";

// ---------------------------------------------------------
// 1. JWT & Crypto Setup
// ---------------------------------------------------------
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "super-secret-fallback-key-32-chars!";

// ---------------------------------------------------------
// 2. CORS Helpers
// ---------------------------------------------------------
const allowedOrigins = new Set([
  "http://localhost:8081",
  "http://192.168.0.184:8081",
]);

function corsHeaders(req: Request): Headers {
  const headers = new Headers();
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "origin");
  }
  return headers;
}

interface ClientSession {
  ws: WebSocket;
  isAuthenticated: boolean;
  userId?: string;
  roomId?: string;
  authTimeout?: number;
}

const clients = new Map<WebSocket, ClientSession>();
const rooms = new Map<string, Set<ClientSession>>();
const matchmakingQueue = new Set<ClientSession>(); // For "Quick Play"

// ---------------------------------------------------------
// 3. Global Player Count Broadcast (Heartbeat)
// ---------------------------------------------------------
setInterval(() => {
  // Only count authenticated players
  let authenticatedCount = 0;
  for (const client of clients.values()) {
    if (client.isAuthenticated) authenticatedCount++;
  }

  const message = JSON.stringify({ type: "GLOBAL_STATE", onlinePlayers: authenticatedCount });

  for (const client of clients.values()) {
    // Only broadcast to players who have successfully authenticated
    if (client.ws.readyState === WebSocket.OPEN && client.isAuthenticated) {
      client.ws.send(message);
    }
  }
}, 5000); // Broadcast every 5 seconds

// ---------------------------------------------------------
// 4. Server Request Handler
// ---------------------------------------------------------
Deno.serve({ port: 8000, hostname: "0.0.0.0" }, async (req: Request) => {
  const headers = corsHeaders(req);

  if (req.method === "OPTIONS") {
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "content-type, authorization");
    headers.set("access-control-max-age", "86400");
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(req.url);

  // --- REST endpoint: Anonymous JWT Issuance ---
  if (req.method === "POST" && url.pathname === "/api/auth/guest") {
    const userId = `guest_${crypto.randomUUID().substring(0, 8)}`;
    const payload = { userId };
    const token = await encode(payload, JWT_SECRET, { algorithm: 'HS512' });

    return Response.json({ userId, token }, { headers });
  }

  // --- WebSocket Upgrade Endpoint ---
  if (req.headers.get("upgrade") === "websocket") {
    const { socket: ws, response } = Deno.upgradeWebSocket(req);

    ws.onopen = () => {
      log.info("New connection established. Awaiting authentication...");

      // Set a strict 3-second timeout for the client to prove who they are
      const authTimeout = setTimeout(() => {
        const session = clients.get(ws);
        if (session && !session.isAuthenticated) {
          log.warning("Connection closed: Authentication timeout.");
          ws.close(1008, "Policy Violation: Authentication timeout");
        }
      }, 3000);

      clients.set(ws, {
        ws,
        isAuthenticated: false,
        authTimeout
      });
    };

    ws.onmessage = async (event) => {
      const session = clients.get(ws);
      if (!session) return;

      try {
        const message = JSON.parse(event.data);

        // --- AUTHENTICATION GATE ---
        if (!session.isAuthenticated) {
          if (message.type === "AUTH" && message.token) {
            try {
              const payload = await decode(message.token, JWT_SECRET, { algorithm: 'HS512' });

              if (!payload || !payload.userId) {
                throw new Error("Invalid JWT payload");
              }

              // Upgrade the session to authenticated
              session.isAuthenticated = true;
              session.userId = payload.userId as string;
              clearTimeout(session.authTimeout);

              log.info(`Player ${session.userId} authenticated successfully.`);

              // Welcome the player and send immediate global state
              ws.send(JSON.stringify({ type: "AUTH_SUCCESS", userId: session.userId }));
              ws.send(JSON.stringify({ type: "GLOBAL_STATE", onlinePlayers: getAuthenticatedCount() }));
            } catch (err) {
              log.error(`Auth failed: ${err}`);
              ws.close(1008, "Invalid Token");
            }
          } else {
            // Force close if their first message isn't an AUTH payload
            log.warning("Connection closed: First message was not AUTH.");
            ws.close(1008, "Expected AUTH message");
          }
          return;
        }

        // --- AUTHENTICATED MESSAGE ROUTING ---
        handleClientMessage(session, message);

      } catch (e) {
        log.error("Failed to parse message", e);
      }
    };

    ws.onclose = () => {
      const session = clients.get(ws);
      if (session) {
        clearTimeout(session.authTimeout);
        matchmakingQueue.delete(session);
        leaveRoom(session);

        if (session.userId) {
          log.info(`Player ${session.userId} disconnected.`);
        }
      }
      clients.delete(ws);
    };

    return response;
  }

  return new Response("Puzzle Server Active", { status: 200 });
});

// Helper for immediate heartbeat updates
function getAuthenticatedCount(): number {
  let count = 0;
  for (const client of clients.values()) {
    if (client.isAuthenticated) count++;
  }
  return count;
}

// ---------------------------------------------------------
// 5. Matchmaking & Game Logic
// ---------------------------------------------------------
function handleClientMessage(session: ClientSession, msg: any) {
  // Safety check to ensure userId exists for game logic
  if (!session.userId) return;

  switch (msg.type) {
    // PRONG A: Quick Play (Lowest Friction)
    case "QUICK_MATCH": {
      if (matchmakingQueue.size > 0) {
        // Pop the first waiting player out of the queue
        const opponent = matchmakingQueue.values().next().value!;
        matchmakingQueue.delete(opponent);

        // Create a room and start the match
        const roomId = crypto.randomUUID().substring(0, 8);
        joinRoom(session, roomId);
        joinRoom(opponent, roomId);
        startMatch(roomId);
      } else {
        matchmakingQueue.add(session);
        session.ws.send(JSON.stringify({ type: "QUEUE_STATUS", status: "WAITING" }));
      }
      break;
    }

    // PRONG B: Play with Friend / Specific Room URL
    case "JOIN_ROOM": {
      // Remove from matchmaking if they were in it
      matchmakingQueue.delete(session);

      const roomId = msg.roomId || crypto.randomUUID().substring(0, 6);
      joinRoom(session, roomId);

      const room = rooms.get(roomId)!;
      if (room.size === 2) {
        startMatch(roomId);
      } else {
        session.ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
      }
      break;
    }

    case "GAME_ACTION": {
      // Relay inputs for deterministic lockstep physics
      if (session.roomId) {
        broadcastToRoom(session.roomId, {
          type: "OPPONENT_ACTION",
          userId: session.userId,
          action: msg.action,
        }, session.ws); // Exclude the sender so they don't echo their own moves
      }
      break;
    }
  }
}

function joinRoom(session: ClientSession, roomId: string) {
  leaveRoom(session); // Ensure they aren't in another room
  session.roomId = roomId;
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId)!.add(session);
}

function leaveRoom(session: ClientSession) {
  if (!session.roomId || !session.userId) return;
  const room = rooms.get(session.roomId);
  if (room) {
    room.delete(session);
    broadcastToRoom(session.roomId, { type: "PLAYER_LEFT", userId: session.userId });
    if (room.size === 0) rooms.delete(session.roomId);
  }
  session.roomId = undefined;
}

function startMatch(roomId: string) {
  const roomClients = Array.from(rooms.get(roomId)!);
  // Both players receive the exact same PRNG seed to ensure falling gems are identical
  const matchSeed = Math.floor(Math.random() * 1000000);

  broadcastToRoom(roomId, {
    type: "START_MATCH",
    seed: matchSeed,
    players: roomClients.map(c => c.userId) // Safe since they must be authenticated to be in a room
  });
}

function broadcastToRoom(roomId: string, payload: any, excludeWs?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

log.info("Server running on http://192.168.0.184:8080");
