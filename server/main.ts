import * as log from "jsr:@std/log";
import { encode, decode } from "@gz/jwt";
import * as Sentry from "npm:@sentry/deno";
import { Application, Router, Context, send } from "https://deno.land/x/oak@v12.0.0/mod.ts";

Sentry.init({
  dsn: "https://79518bddae8e1cad68cae1dde1498a50@o4511911256915968.ingest.us.sentry.io/4511911259865088",
});

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "super-secret-fallback-key-32-chars!";

interface ClientSession {
  ws: WebSocket;
  isAuthenticated: boolean;
  userId?: string;
  roomId?: string;
  authTimeout?: number;
}

const clients = new Map<WebSocket, ClientSession>();
const rooms = new Map<string, Set<ClientSession>>();
const matchmakingQueue = new Set<ClientSession>();

const app = new Application();
const router = new Router();

// CORS for API
app.use(async (ctx, next) => {
  const origin = ctx.request.headers.get("origin");
  if (origin) {
    ctx.response.headers.set("Access-Control-Allow-Origin", origin);
    ctx.response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }
  await next();
});

// API Routes
router.post("/api/auth/guest", async (ctx) => {
  const userId = `guest_${crypto.randomUUID().substring(0, 8)}`;
  const token = await encode({ userId }, JWT_SECRET, { algorithm: 'HS512' });
  ctx.response.body = { userId, token };
});

router.get("/ws", async (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501, "Unable to upgrade connection");
  }
  const ws = await ctx.upgrade();
  const session: ClientSession = {
    ws,
    isAuthenticated: false,
    authTimeout: setTimeout(() => ws.close(1008, "Auth timeout"), 3000)
  };
  clients.set(ws, session);

  ws.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      if (!session.isAuthenticated) {
        if (message.type === "AUTH" && message.token) {
          const payload = await decode(message.token, JWT_SECRET, { algorithm: 'HS512' });
          if (payload && payload.userId) {
            session.isAuthenticated = true;
            session.userId = payload.userId as string;
            clearTimeout(session.authTimeout);
            ws.send(JSON.stringify({ type: "AUTH_SUCCESS", userId: session.userId }));
            ws.send(JSON.stringify({ type: "GLOBAL_STATE", onlinePlayers: getAuthenticatedCount() }));
          } else {
            ws.close(1008, "Invalid Token");
          }
        } else {
          ws.close(1008, "Expected AUTH");
        }
        return;
      }
      handleClientMessage(session, message);
    } catch (e) {
      log.error("WebSocket error", e);
    }
  };
  ws.onclose = () => {
    clients.delete(ws);
    matchmakingQueue.delete(session);
    leaveRoom(session);
  };
});

// Static files
app.use(async (ctx, next) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}/client/dist`,
      index: "index.html",
    });
  } catch {
    await next();
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

setInterval(() => {
  const count = getAuthenticatedCount();
  const message = JSON.stringify({ type: "GLOBAL_STATE", onlinePlayers: count });
  for (const client of clients.values()) {
    if (client.isAuthenticated) client.ws.send(message);
  }
}, 5000);

function getAuthenticatedCount() {
  let count = 0;
  for (const c of clients.values()) if (c.isAuthenticated) count++;
  return count;
}

function handleClientMessage(session: ClientSession, msg: any) {
  if (!session.userId) return;
  switch (msg.type) {
    case "QUICK_MATCH":
      if (matchmakingQueue.size > 0) {
        const opponent = matchmakingQueue.values().next().value!;
        matchmakingQueue.delete(opponent);
        const roomId = crypto.randomUUID().substring(0, 8);
        joinRoom(session, roomId);
        joinRoom(opponent, roomId);
        startMatch(roomId);
      } else {
        matchmakingQueue.add(session);
        session.ws.send(JSON.stringify({ type: "QUEUE_STATUS", status: "WAITING" }));
      }
      break;
    case "JOIN_ROOM":
      matchmakingQueue.delete(session);
      const roomId = msg.roomId || crypto.randomUUID().substring(0, 6);
      joinRoom(session, roomId);
      const room = rooms.get(roomId)!;
      if (room.size === 2) startMatch(roomId);
      else session.ws.send(JSON.stringify({ type: "ROOM_CREATED", roomId }));
      break;
    case "GAME_ACTION":
      if (session.roomId) {
        broadcastToRoom(session.roomId, { type: "OPPONENT_ACTION", userId: session.userId, action: msg.action }, session.ws);
      }
      break;
  }
}

function joinRoom(session: ClientSession, roomId: string) {
  leaveRoom(session);
  session.roomId = roomId;
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
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
  const matchSeed = Math.floor(Math.random() * 1000000);
  broadcastToRoom(roomId, { type: "START_MATCH", seed: matchSeed, players: roomClients.map(c => c.userId) });
}

function broadcastToRoom(roomId: string, payload: any, excludeWs?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) client.ws.send(data);
  }
}

app.listen({ port: 8080 });
log.info("Server running on http://0.0.0.0:8080");
