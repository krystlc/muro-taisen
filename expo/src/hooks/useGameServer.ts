import { useEffect, useState, useCallback, useRef } from 'react';

// 1. ADD 'GAME_OVER' and 'PLAYER_LEFT' to the valid action types
export type GameAction = {
  type: 'DROP' | 'ROTATE' | 'SEND_GARBAGE' | 'MOVE' | 'GAME_OVER' | 'PLAYER_LEFT';
  payload?: any;
};

export function useGameServer() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(0);

  const actionQueue = useRef<any[]>([]);

  const consumeOpponentActions = () => {
    if (actionQueue.current.length === 0) return [];
    const actions = [...actionQueue.current];
    actionQueue.current = []; // clear the queue
    return actions;
  };

  const [matchStarted, setMatchStarted] = useState<{ seed: number; players: string[] } | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const messageQueue = useRef<any[]>([]);

  const sendSafe = useCallback((msg: any) => {
    if (authenticated && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else {
      messageQueue.current.push(msg);
    }
  }, [authenticated, socket]);

  useEffect(() => {
    if (authenticated && socket && socket.readyState === WebSocket.OPEN) {
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift();
        socket.send(JSON.stringify(msg));
      }
    }
  }, [authenticated, socket]);

  const connect = useCallback(async () => {
    const authRes = await fetch('http://192.168.0.184:8000/api/auth/guest', { method: 'POST' });
    const { userId, token } = await authRes.json();
    setUserId(userId);

    const ws = new WebSocket('ws://192.168.0.184:8000');

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'AUTH', token }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'AUTH_SUCCESS':
          setAuthenticated(true);
          break;
        case 'GLOBAL_STATE':
          setOnlinePlayerCount(message.onlinePlayers);
          break;
        case 'QUEUE_STATUS':
          setQueueStatus(message.status);
          break;
        case 'START_MATCH':
          setMatchStarted({ seed: message.seed, players: message.players });
          setQueueStatus(null);
          break;
        case 'OPPONENT_ACTION':
          actionQueue.current.push(message.action);
          break;
        // 2. LISTEN for opponent leaving the room
        case 'PLAYER_LEFT':
          actionQueue.current.push({ type: 'PLAYER_LEFT' });
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
    sendSafe({ type: 'QUICK_MATCH' });
  };

  const joinRoom = (roomId?: string) => {
    clearMatch();
    sendSafe({ type: 'JOIN_ROOM', roomId });
  };

  const sendGameAction = (action: GameAction) => {
    sendSafe({ type: 'GAME_ACTION', action });
  };

  // 4. EXPORT clearMatch
  return {
    userId,
    onlinePlayerCount,
    quickMatch,
    joinRoom,
    sendGameAction,
    consumeOpponentActions,
    matchStarted,
    queueStatus,
    authenticated,
    clearMatch
  };
}
