// src/network/messages.ts

// --- MESSAGE TYPES ---

export enum ServerMessageType {
  JOIN_SUCCESS = "JOIN_SUCCESS", // Sent after a player connects and joins a game
  STATE_UPDATE = "STATE_UPDATE", // Sent every tick with the current authoritative game state
  OPPONENT_ACTION = "OPPONENT_ACTION", // Notifies one player of the other player's move
  GAME_OVER = "GAME_OVER",
  ERROR = "ERROR",
}

export enum ClientMessageType {
  JOIN_LOBBY = "JOIN_LOBBY", // Player requests to be matched
  MOVE_PIECE = "MOVE_PIECE", // Player moves the falling piece
  ROTATE_PIECE = "ROTATE_PIECE", // Player rotates the falling piece
  LOCK_PIECE = "LOCK_PIECE", // Player confirms piece placement/lockdown
  REQUEST_GRAVITY = "REQUEST_GRAVITY", // Testing/debugging (later replaced by timed server ticks)
}

// --- MESSAGE INTERFACES ---

/**
 * Base interface for all network messages (for easy type checking)
 */
interface BaseMessage {
  type: ServerMessageType | ClientMessageType;
}

/**
 * The full game state payload sent to a specific player.
 * The client needs both their grid and the opponent's grid.
 */
export interface GameStatePayload {
  gameId: string;
  // Note: For multiplayer, the state should be the IBlock[][] but optimized (e.g., only changed rows)
  // For simplicity here, we send the full grid for Player 1 and Player 2.
  myGrid: any; // The IBlock[][] state for the receiving player
  opponentGrid: any; // The IBlock[][] state for the opponent
  score: number;
}

export interface StateUpdateMessage extends BaseMessage {
  type: ServerMessageType.STATE_UPDATE;
  payload: GameStatePayload;
}

export interface MovePieceMessage extends BaseMessage {
  type: ClientMessageType.MOVE_PIECE;
  direction: "left" | "right";
}

export interface LockPieceMessage extends BaseMessage {
  type: ClientMessageType.LOCK_PIECE;
  // In a real game, this payload would include the final piece shape/orientation
  // to let the server re-validate the placement.
}
