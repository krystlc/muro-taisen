import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GameButton, VersusBar } from "../components/game-ui";
import { FighterRenderer } from "../components/game-ui/FighterRenderer";
import { BOARD_COLS, BOARD_ROWS, Board } from "../core/engine/Board";
import { GameEngine, GameState } from "../core/engine/GameEngine";

import { useGameStore } from "../store/useGameStore";
import { InputController } from "../input/InputController";
import { useGameServerContext } from "../contexts/GameServerContext";

import {
  NextPiecePanel,
  MainBoard,
  OpponentMiniBoard,
} from "../components/game-ui/BattleComponents";

export default function BattleScreen() {
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);

  // Hook into the websocket server connection
  const {
    sendGameAction,
    consumeOpponentActions,
    matchStarted,
    quickMatch,
    userId,
    clearMatch,
  } = useGameServerContext();

  const opponentName = matchStarted
    ? matchStarted.players.find((id) => id !== userId) || "Opponent"
    : player2.name;

  const engineRef = useRef<GameEngine | null>(null);

  const [engine, setEngine] = useState<GameEngine | null>(null);

  // Initialize engines once match data (seed) arrives from the server
  useEffect(() => {
    if (matchStarted) {
      const eng1 = new GameEngine(matchStarted.seed.toString());
      engineRef.current = eng1;
      setEngine(eng1);
      setGameState(eng1.getState());
      setPhase("FIGHT");
    }
  }, [matchStarted]);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [opponentGameState, setOpponentGameState] = useState<GameState | null>(
    null,
  );
  const [phase, setPhase] = useState<
    "MATCHMAKING" | "READY" | "3" | "2" | "1" | "FIGHT"
  >("MATCHMAKING");
  const [matchResult, setMatchResult] = useState<
    "WIN" | "LOSS" | "OPPONENT_LEFT" | null
  >(null);

  const lastScoreRef = useRef(0);

  // 1. Auto-trigger quick match on mount
  useEffect(() => {
    if (!matchStarted) {
      quickMatch();
    }
  }, [matchStarted, quickMatch]);

  // 2. Initialize engines and trigger countdown when a match is found
  useEffect(() => {
    if (matchStarted) {
      const eng1 = new GameEngine(matchStarted.seed.toString());
      engineRef.current = eng1;
      setEngine(eng1);
      setGameState(eng1.getState());

      // Reset match result in case this is a subsequent match
      setMatchResult(null);
      matchResultRef.current = null;

      const sequence = async () => {
        setPhase("READY");
        await new Promise((r) => setTimeout(r, 600));
        setPhase("3");
        await new Promise((r) => setTimeout(r, 600));
        setPhase("2");
        await new Promise((r) => setTimeout(r, 600));
        setPhase("1");
        await new Promise((r) => setTimeout(r, 600));
        setPhase("FIGHT");
      };
      sequence();
    }
  }, [matchStarted]);

  const matchResultRef = useRef<"WIN" | "LOSS" | "OPPONENT_LEFT" | null>(null);

  // 3. Main Game Loop Tick
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const lastBroadcastRef = useRef<number>(Date.now());

  useEffect(() => {
    if (phase !== "FIGHT" || !engine) return;

    lastTimeRef.current = Date.now();
    lastBroadcastRef.current = Date.now();

    const loop = () => {
      // 1. Drain network actions
      const pendingActions = consumeOpponentActions();
      for (const action of pendingActions) {
        if (action.type === "GAME_OVER" || action.type === "PLAYER_LEFT") {
          setMatchResult(
            action.type === "PLAYER_LEFT" ? "OPPONENT_LEFT" : "WIN",
          );
          matchResultRef.current =
            action.type === "PLAYER_LEFT" ? "OPPONENT_LEFT" : "WIN";
          cancelAnimationFrame(requestRef.current!);
          requestRef.current = null;
          return;
        }
        if (action.type === "SEND_GARBAGE") {
          engine.queueGarbage(action.payload.lines);
          engine.processGarbageQueue(0);
        }
        if (action.type === "STATE_SYNC") {
          setOpponentGameState(action.payload);
        }
      }

      // 2. Calculate time delta
      const now = Date.now();
      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // 3. Tick physics
      engine.tick(deltaMs);

      const newState = engine.getState();

      if (newState.status === "GAME_OVER") {
        if (!matchResultRef.current) {
          sendGameAction({ type: "GAME_OVER" });
          matchResultRef.current = "LOSS";
        }
        setGameState({ ...newState });
        setMatchResult("LOSS");
        cancelAnimationFrame(requestRef.current!);
        requestRef.current = null;
        return; // Stop loop
      }

      setGameState({ ...newState });

      // 4. Handle garbage output
      if (newState.score > lastScoreRef.current) {
        const scoreDiff = newState.score - lastScoreRef.current;
        const garbageLines = Math.max(1, Math.floor(scoreDiff / 2));
        sendGameAction({
          type: "SEND_GARBAGE",
          payload: { lines: garbageLines },
        });
        lastScoreRef.current = newState.score;
      }

      // 5. Throttled Broadcast (every 200ms)
      if (now - lastBroadcastRef.current > 200) {
        sendGameAction({ type: "STATE_SYNC", payload: engine.getSnapshot() });
        lastBroadcastRef.current = now;
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    // Cleanup
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [phase, engine, matchResult, consumeOpponentActions, sendGameAction]);

  const handleFindNewMatch = () => {
    // 1. Tell context to clear the stale match data
    clearMatch();

    // 2. Reset UI state immediately
    setMatchResult(null);
    matchResultRef.current = null;
    setPhase("MATCHMAKING");
    engineRef.current = null;
    setEngine(null);

    // 3. Ask server for a new opponent
    quickMatch();
  };

  if (!gameState) {
    return <View style={styles.container} />;
  }

  const displayGrid = gameState.grid.map((row) => [...row]);
  const activePiece = gameState.activePiece;
  if (activePiece) {
    const [pivotRow, pivotCol] = [activePiece.row, activePiece.column];
    const offsets: Record<number, [number, number]> = {
      0: [1, 0],
      90: [0, 1],
      180: [-1, 0],
      270: [0, -1],
    };
    const [rOff, cOff] = offsets[activePiece.rotation] || [1, 0];
    if (
      pivotRow >= 0 &&
      pivotRow < BOARD_ROWS &&
      pivotCol >= 0 &&
      pivotCol < BOARD_COLS
    ) {
      displayGrid[pivotRow][pivotCol] = activePiece.gems[0];
    }
    const pRow = pivotRow + rOff;
    const pCol = pivotCol + cOff;
    if (pRow >= 0 && pRow < BOARD_ROWS && pCol >= 0 && pCol < BOARD_COLS) {
      displayGrid[pRow][pCol] = activePiece.gems[1];
    }
  }

  // Build Opponent Composite View Grid
  const displayOpponentGrid =
    opponentGameState?.grid.map((row) => [...row]) || Board.createEmptyGrid();
  const opActivePiece = opponentGameState?.activePiece;
  if (opActivePiece) {
    const [pivotRow, pivotCol] = [opActivePiece.row, opActivePiece.column];
    const offsets: Record<number, [number, number]> = {
      0: [1, 0],
      90: [0, 1],
      180: [-1, 0],
      270: [0, -1],
    };
    const [rOff, cOff] = offsets[opActivePiece.rotation] || [1, 0];
    if (
      pivotRow >= 0 &&
      pivotRow < BOARD_ROWS &&
      pivotCol >= 0 &&
      pivotCol < BOARD_COLS
    ) {
      displayOpponentGrid[pivotRow][pivotCol] = opActivePiece.gems[0];
    }
    const pRow = pivotRow + rOff;
    const pCol = pivotCol + cOff;
    if (pRow >= 0 && pRow < BOARD_ROWS && pCol >= 0 && pCol < BOARD_COLS) {
      displayOpponentGrid[pRow][pCol] = opActivePiece.gems[1];
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.fighterArena}>
        <FighterRenderer name={player1.name} state={"neutral"} />
        <FighterRenderer name={opponentName} state={"neutral"} flipped={true} />
      </View>

      <View style={styles.hudBar}>
        <VersusBar player1Name={player1.name} player2Name={opponentName} />
      </View>

      <InputController
        engineRef={engineRef}
        enabled={phase === "FIGHT"}
        onAction={(action) => {
          if (!engine) return;

          // 1. Instantly process the move in the engine
          if (action.type === "MOVE_LEFT") engine.moveLeft();
          if (action.type === "MOVE_RIGHT") engine.moveRight();
          if (action.type === "ROTATE_CW") engine.rotateCW();
          if (action.type === "HARD_DROP") engine.hardDropPiece();

          // Fallback for types not handled by direct methods
          if (action.type === "ROTATE_CCW") engine.queueInput("ROTATE_CCW");
          if (action.type === "SOFT_DROP") engine.queueInput("SOFT_DROP");

          // 2. Instantly update the UI state
          setGameState({ ...engine.getState() });

          // 3. Send to network
          sendGameAction(action);
        }}
      >
        <View style={styles.puzzleArea}>
          {phase !== "FIGHT" ? (
            <View style={styles.centered}>
              <Text style={styles.countdownText}>
                {phase === "MATCHMAKING" ? "SEARCHING" : phase}
              </Text>
            </View>
          ) : (
            <>
              <NextPiecePanel nextPiece={gameState.nextPiece} />
              <MainBoard displayGrid={displayGrid} />
              <OpponentMiniBoard opponentGrid={displayOpponentGrid} />
            </>
          )}

          {(gameState.status === "GAME_OVER" ||
            opponentGameState?.status === "GAME_OVER" ||
            matchResult) && (
              <View style={styles.gameOverOverlay}>
                <Text
                  style={[
                    styles.gameOverText,
                    matchResult === "WIN" ? styles.winText : styles.lossText,
                  ]}
                >
                  {matchResult === "WIN"
                    ? "VICTORY!"
                    : matchResult === "OPPONENT_LEFT"
                      ? "OPPONENT FLED!"
                      : "K.O. / DEFEAT"}
                </Text>
                <View style={styles.buttonRow}>
                  <GameButton
                    label="Find New Match"
                    onPress={handleFindNewMatch}
                    variant="primary"
                  />
                </View>
              </View>
            )}
        </View>
      </InputController>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c1220" },
  fighterArena: {
    flex: 0.4,
    backgroundColor: "#1a2235",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    flexDirection: "row",
  },
  placeholderText: { color: "#475569", fontSize: 20, fontWeight: "bold" },
  hudBar: { flex: 0.1, zIndex: 10, justifyContent: "center" },
  puzzleArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    backgroundColor: "#0f1626",
    overflow: "hidden",
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  countdownText: {
    color: "#00e5ff",
    fontSize: 48,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowRadius: 10,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 18, 32, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  gameOverText: { fontSize: 36, fontWeight: "bold", marginBottom: 24 },
  winText: { color: "#00e5ff" },
  lossText: { color: "#ff3366" },
  buttonRow: { flexDirection: "row", gap: 16 },
});
