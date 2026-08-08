// To run: deno run --allow-net --allow-env server.ts
import * as log from "jsr:@std/log";
import { encode, decode } from "@gz/jwt";

// ---------------------------------------------------------
// 1. JWT & Crypto Setup
// ---------------------------------------------------------
// In production, always set this environment variable!
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "super-secret-fallback-key-32-chars!";

interface ClientSession {
  ws: WebSocket;
  userId: string;
  roomId?: string;
}

const clients = new Map<WebSocket, ClientSession>();
const rooms = new Map<string, Set<ClientSession>>();
const matchmakingQueue = new Set<ClientSession>(); // For "Quick Play"

// ---------------------------------------------------------
// 2. Global Player Count Broadcast (Heartbeat)
// ---------------------------------------------------------
setInterval(() => {
  const count = clients.size;
  const message = JSON.stringify({ type: "GLOBAL_STATE", onlinePlayers: count });
  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  }
}, 5000); // Broadcast every 5 seconds

// ---------------------------------------------------------
// 3. Server Request Handler
// ---------------------------------------------------------
Deno.serve({ port: 8080 }, async (req) => {
  const url = new URL(req.url);

  // --- REST endpoint: Anonymous JWT Issuance ---
  if (req.method === "POST" && url.pathname === "/api/auth/guest") {
    const userId = `guest_${crypto.randomUUID().substring(0, 8)}`;

    const payload = {
      userId,
    };
    const token = await encode(payload, JWT_SECRET, { algorithm: 'HS512' });

    return Response.json({ userId, token });
  }

  // --- WebSocket Upgrade Endpoint ---
  if (req.headers.get("upgrade") === "websocket") {
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing Token", { status: 401 });

    const payload = await decode(token, JWT_SECRET, { algorithm: 'HS512' });
    if (!payload) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { socket: ws, response } = Deno.upgradeWebSocket(req);
    const userId = payload.sub;

    ws.onopen = () => {
      log.info(`Player ${userId} connected.`);
      clients.set(ws, { ws, userId });
      // Send immediate player count upon connection
      ws.send(JSON.stringify({ type: "GLOBAL_STATE", onlinePlayers: clients.size }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleClientMessage(clients.get(ws)!, message);
      } catch (e) {
        log.error("Failed to parse message", e);
      }
    };

    ws.onclose = () => {
      const session = clients.get(ws);
      if (session) {
        matchmakingQueue.delete(session);
        leaveRoom(session);
      }
      clients.delete(ws);
      log.info(`Player ${userId} disconnected.`);
    };

    return response;
  }

  return new Response("Puzzle Server Active", { status: 200 });
});

// ---------------------------------------------------------
// 4. Matchmaking & Game Logic
// ---------------------------------------------------------
function handleClientMessage(session: ClientSession, msg: any) {
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
  if (!session.roomId) return;
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
    players: roomClients.map(c => c.userId)
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

log.info("Server running on http://localhost:8080");
