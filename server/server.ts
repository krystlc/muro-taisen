// server.ts
// To run: deno run --allow-net --allow-read server.ts

import { GameEngine } from "./src/core/gameEngine.ts"; // Import your game logic
import {
  StateUpdateMessage,
  ServerMessageType,
  ClientMessageType,
} from "./src/network/messages.ts";

// --- CONNECTION MANAGEMENT ---

// Simple structure to hold two players and their game state
interface ActiveGame {
  gameId: string;
  player1: WebSocket;
  player2: WebSocket | null;
  engine1: GameEngine;
  engine2: GameEngine;
}

const activeGames = new Map<string, ActiveGame>();
const playerToGame = new Map<WebSocket, string>();
const WAITING_FOR_PLAYER = "waiting_for_player_123"; // Simple placeholder ID

// --- GAME LOGIC (Simplified Matchmaking) ---

function createNewGame(ws: WebSocket): ActiveGame {
  const gameId = crypto.randomUUID();
  const newGame: ActiveGame = {
    gameId,
    player1: ws,
    player2: null,
    engine1: new GameEngine(),
    engine2: new GameEngine(),
  };
  activeGames.set(gameId, newGame);
  playerToGame.set(ws, gameId);
  return newGame;
}

function handleClientMessage(ws: WebSocket, data: string) {
  try {
    const message = JSON.parse(data);
    const gameId = playerToGame.get(ws);

    if (!gameId) return; // Player not in a game

    // Basic routing for client actions
    switch (message.type as ClientMessageType) {
      case ClientMessageType.MOVE_PIECE:
        // TODO: Update the player's falling piece position in their specific GameEngine
        // For now, we'll just acknowledge and send a state update (for testing)
        sendStateUpdate(gameId);
        break;

      case ClientMessageType.REQUEST_GRAVITY:
        const game = activeGames.get(gameId)!;
        const myEngine = ws === game.player1 ? game.engine1 : game.engine2!;

        // Execute the core logic on the server's authoritative engine
        myEngine.applyGravity();
        myEngine.executeChainReaction(); // Run the full tick

        sendStateUpdate(gameId);
        break;

      // ... handle LOCK_PIECE, ROTATE_PIECE ...

      default:
        console.warn("Unknown message type:", message.type);
    }
  } catch (e) {
    console.error("Error handling client message:", e);
  }
}

/**
 * Sends the authoritative game state to both players in a game.
 */
function sendStateUpdate(gameId: string) {
  const game = activeGames.get(gameId);
  if (!game || !game.player2) return;

  // State for Player 1: their grid is 'myGrid', Player 2's is 'opponentGrid'
  const p1Payload: StateUpdateMessage = {
    type: ServerMessageType.STATE_UPDATE,
    payload: {
      gameId: game.gameId,
      myGrid: game.engine1.gameState,
      opponentGrid: game.engine2.gameState, // P2 is P1's opponent
      score: 0, // TODO: Implement scoring
    },
  };
  game.player1.send(JSON.stringify(p1Payload));

  // State for Player 2: their grid is 'myGrid', Player 1's is 'opponentGrid'
  const p2Payload: StateUpdateMessage = {
    type: ServerMessageType.STATE_UPDATE,
    payload: {
      gameId: game.gameId,
      myGrid: game.engine2.gameState,
      opponentGrid: game.engine1.gameState, // P1 is P2's opponent
      score: 0,
    },
  };
  game.player2.send(JSON.stringify(p2Payload));
}

// --- DENO SERVER INITIALIZATION ---

Deno.serve({ port: 8080 }, (req) => {
  // 1. Check if the request is for a WebSocket upgrade
  if (req.headers.get("upgrade") === "websocket") {
    const { socket: ws, response } = Deno.upgradeWebSocket(req);

    // Set up WebSocket event handlers
    ws.onopen = () => {
      console.log("Client connected!");

      // Basic matchmaking: Try to find a game with only 1 player
      let gameToJoin = Array.from(activeGames.values()).find((g) => !g.player2);

      if (gameToJoin) {
        // Player 2 joins an existing game
        gameToJoin.player2 = ws;
        playerToGame.set(ws, gameToJoin.gameId);
        console.log(`Player joined game ${gameToJoin.gameId}`);

        // Notify both players the game is starting
        gameToJoin.player1.send(
          JSON.stringify({
            type: ServerMessageType.JOIN_SUCCESS,
            payload: { opponent: "Player 2" },
          }),
        );
        ws.send(
          JSON.stringify({
            type: ServerMessageType.JOIN_SUCCESS,
            payload: { opponent: "Player 1" },
          }),
        );

        // Send initial authoritative state
        sendStateUpdate(gameToJoin.gameId);
      } else {
        // Player 1 creates a new game and waits
        const newGame = createNewGame(ws);
        console.log(
          `Player created game ${newGame.gameId}. Waiting for opponent...`,
        );
        ws.send(
          JSON.stringify({
            type: ServerMessageType.JOIN_SUCCESS,
            payload: { message: "Waiting for opponent" },
          }),
        );
      }
    };

    ws.onmessage = (event) => {
      handleClientMessage(ws, event.data);
    };

    ws.onclose = () => {
      // TODO: Handle game clean-up and notify opponent
      console.log("Client disconnected.");
    };

    return response;
  }

  // 2. Respond to non-websocket requests (e.g., a simple health check)
  return new Response("Deno Tetris Backend Running", { status: 200 });
});

console.log("Deno WebSocket server running on http://localhost:8080");
