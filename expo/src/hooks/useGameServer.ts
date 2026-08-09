import { useEffect, useState, useCallback, useRef } from 'react';

export type GameAction = {
  type: 'DROP' | 'ROTATE' | 'SEND_GARBAGE';
  payload?: any;
};

export function useGameServer() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(0);
  const [opponentAction, setOpponentAction] = useState<any>(null);
  const [matchStarted, setMatchStarted] = useState<{ seed: number; players: string[] } | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const messageQueue = useRef<any[]>([]);

  // Helper to send messages safely
  const sendSafe = useCallback((msg: any) => {
    if (authenticated && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else {
      messageQueue.current.push(msg);
    }
  }, [authenticated, socket]);

  // Process queue once authenticated
  useEffect(() => {
    if (authenticated && socket && socket.readyState === WebSocket.OPEN) {
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift();
        socket.send(JSON.stringify(msg));
      }
    }
  }, [authenticated, socket]);

  const connect = useCallback(async () => {
    // 1. Authenticate to get JWT token
    const authRes = await fetch('http://localhost:8080/api/auth/guest', { method: 'POST' });
    const { userId, token } = await authRes.json();
    setUserId(userId);

    // 2. Connect WebSocket WITHOUT token in URL
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      // 3. Send AUTH as first message
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
          setOpponentAction(message.action);
          break;
      }
    };

    setSocket(ws);
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  const quickMatch = () => {
    sendSafe({ type: 'QUICK_MATCH' });
  };

  const joinRoom = (roomId?: string) => {
    sendSafe({ type: 'JOIN_ROOM', roomId });
  };

  const sendGameAction = (action: GameAction) => {
    sendSafe({ type: 'GAME_ACTION', action });
  };

  return { userId, onlinePlayerCount, quickMatch, joinRoom, sendGameAction, opponentAction, matchStarted, queueStatus, authenticated };
}
