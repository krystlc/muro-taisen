import { useEffect, useState, useCallback } from 'react';

export type GameAction = {
  type: 'DROP' | 'ROTATE' | 'SEND_GARBAGE';
  payload?: any;
};

export function useGameServer() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [onlinePlayerCount, setOnlinePlayerCount] = useState(0);
  const [opponentAction, setOpponentAction] = useState<any>(null);
  const [matchStarted, setMatchStarted] = useState<{ seed: number; players: string[] } | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);

  const connect = useCallback(async () => {
    // 1. Authenticate to get JWT token
    const authRes = await fetch('http://localhost:8080/api/auth/guest', { method: 'POST' });
    const { token } = await authRes.json();

    // 2. Connect WebSocket with token
    const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
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
    socket?.send(JSON.stringify({ type: 'QUICK_MATCH' }));
  };

  const joinRoom = (roomId?: string) => {
    socket?.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }));
  };

  const sendGameAction = (action: GameAction) => {
    socket?.send(JSON.stringify({ type: 'GAME_ACTION', action }));
  };

  return { onlinePlayerCount, quickMatch, joinRoom, sendGameAction, opponentAction, matchStarted, queueStatus };
}
