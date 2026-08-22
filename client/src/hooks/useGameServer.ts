import { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 1. ADD 'GAME_OVER' and 'PLAYER_LEFT' to the valid action types
export type GameAction = {
  type:
    | "DROP"
    | "ROTATE"
    | "SEND_GARBAGE"
    | "MOVE"
    | "GAME_OVER"
    | "PLAYER_LEFT"
    | "STATE_SYNC"
    | "MOVE_LEFT"
    | "MOVE_RIGHT"
    | "ROTATE_CW"
    | "ROTATE_CCW"
    | "HARD_DROP"
    | "SOFT_DROP";
  payload?: any;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
const isTls = API_URL.startsWith("https://");
const config = {
  auth: `${API_URL}/auth/guest`,
  websocket: `${isTls ? "wss" : "ws"}://${API_URL.slice(API_URL.indexOf("//"))}/ws`,
};

export function useGameServer() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(0);

  const actionQueue = useRef<any[]>([]);

  const consumeOpponentActions = () => {
    if (actionQueue.current.length === 0) return [];
    const actions = [...actionQueue.current];
    actionQueue.current = []; // clear the queue
    return actions;
  };

  const [matchStarted, setMatchStarted] = useState<{
    seed: number;
    players: string[];
  } | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const messageQueue = useRef<any[]>([]);

  const sendSafe = useCallback(
    (msg: any) => {
      if (authenticated && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      } else {
        messageQueue.current.push(msg);
      }
    },
    [authenticated, socket],
  );

  useEffect(() => {
    if (authenticated && socket && socket.readyState === WebSocket.OPEN) {
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift();
        socket.send(JSON.stringify(msg));
      }
    }
  }, [authenticated, socket]);

  const connect = useCallback(async () => {
    const authRes = await fetch(config.auth, {
      method: "POST",
    });
    const { userId, token } = await authRes.json();
    setUserId(userId);

    const ws = new WebSocket(config.websocket);

    ws.onopen = async () => {
      const username = await AsyncStorage.getItem("username");
      ws.send(JSON.stringify({ type: "AUTH", token, username }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case "AUTH_SUCCESS":
          setAuthenticated(true);
          console.log(message);
          setUsername(message.username);
          break;
        case "GLOBAL_STATE":
          setOnlinePlayerCount(message.onlinePlayers);
          break;
        case "QUEUE_STATUS":
          if (message.status === "Searching for opponent...") {
            setQueueStatus("WAITING");
          } else {
            setQueueStatus(message.status);
          }
          break;
        case "START_MATCH":
          setMatchStarted({ seed: message.seed, players: message.players });
          setQueueStatus(null);
          break;
        case "OPPONENT_ACTION":
          actionQueue.current.push(message.action);
          break;
        // 2. LISTEN for opponent leaving the room
        case "PLAYER_LEFT":
          actionQueue.current.push({ type: "PLAYER_LEFT" });
          break;
      }
    };

    setSocket(ws);
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  // 3. CREATE clearMatch to wipe out stale data safely
  const clearMatch = () => {
    setMatchStarted(null);
    setQueueStatus(null);
    actionQueue.current = []; // Wipe out any delayed network moves
  };

  const quickMatch = () => {
    clearMatch();
    sendSafe({ type: "QUICK_MATCH" });
  };

  const joinRoom = (roomId?: string) => {
    clearMatch();
    sendSafe({ type: "JOIN_ROOM", roomId });
  };

  const leaveRoom = () => {
    clearMatch();
    sendSafe({ type: "LEAVE_ROOM" });
  };

  const sendGameAction = (action: GameAction) => {
    sendSafe({ type: "GAME_ACTION", action });
  };

  // 4. EXPORT clearMatch
  return {
    userId,
    username,
    onlinePlayerCount,
    quickMatch,
    joinRoom,
    leaveRoom,
    sendGameAction,
    consumeOpponentActions,
    matchStarted,
    queueStatus,
    authenticated,
    clearMatch,
  };
}
