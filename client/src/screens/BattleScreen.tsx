import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";

function getCompositeGrid(
  grid: any[][] | undefined,
  activePiece: any | null | undefined,
): any[][] {
  if (!grid) return Board.createEmptyGrid();

  const displayGrid = grid.map((row) => [...row]);
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
  return displayGrid;
}

export default function BattleScreen() {
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);

  // Hook into the websocket server connection
  const {
    sendGameAction,
    consumeOpponentActions,
    matchStarted,
    quickMatch,
    username,
    clearMatch,
  } = useGameServerContext();

  const playerName = username ?? player1.name;
  const opponentName = matchStarted
    ? matchStarted.players.find((name) => name !== username) || "Opponent"
    : player2.name;

  const engineRef = useRef<GameEngine | null>(null);

  const [engine, setEngine] = useState<GameEngine | null>(null);

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
  const initializedMatchSeedRef = useRef<string | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const matchResultRef = useRef<"WIN" | "LOSS" | "OPPONENT_LEFT" | null>(null);

  // Consolidated Match Initialization and Countdown Sequence
  useEffect(() => {
    // 1. Determine current seed
    const seed = matchStarted
      ? matchStarted.seed.toString()
      : "offline_" + Date.now().toString();

    // 2. Prevent double-initialization for the same match/seed
    if (initializedMatchSeedRef.current === seed) return;
    initializedMatchSeedRef.current = seed;

    // 3. Clear any pending countdown timeouts from previous matches
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // 4. Initialize engine
    const eng1 = new GameEngine(seed);
    engineRef.current = eng1;
    setEngine(eng1);
    setGameState(eng1.getState());

    // 5. Reset UI states for the new match
    setMatchResult(null);
    matchResultRef.current = null;
    setOpponentGameState(null);

    if (matchStarted) {
      // Online Match -> Perform Countdown Sequence
      setPhase("READY");

      const runSequence = () => {
        const delays = ["3", "2", "1", "FIGHT"];
        let currentDelayIndex = 0;

        const nextStep = () => {
          if (currentDelayIndex < delays.length) {
            setPhase(delays[currentDelayIndex] as any);
            currentDelayIndex++;
            const t = setTimeout(nextStep, 600);
            timeoutsRef.current.push(t as any);
          }
        };

        const firstTimeout = setTimeout(nextStep, 600);
        timeoutsRef.current.push(firstTimeout as any);
      };

      runSequence();
    } else {
      // Offline Match -> Fight instantly
      setPhase("FIGHT");
    }

    // Cleanup: Clear all timeouts if unmounted or match resets
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [matchStarted]);

  // 1. Auto-trigger quick match on mount if not already playing
  useEffect(() => {
    if (!matchStarted && phase === "MATCHMAKING") {
      quickMatch();
    }
  }, [matchStarted, quickMatch, phase]);

  // 3. Main Game Loop Tick
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const lastRenderTimeRef = useRef<number>(Date.now());
  const lastBroadcastRef = useRef<number>(Date.now());

  const router = useRouter();
  const handleFindNewMatch = useCallback(() => {
    // 1. If we are in an online match, clear and search for a new one
    if (matchStarted) {
      clearMatch();
      setPhase("MATCHMAKING");
      quickMatch();
    } else {
      // 2. If we are offline, just restart the engine with a new random seed
      engineRef.current = new GameEngine(Date.now().toString());
      setEngine(engineRef.current);
      setGameState(engineRef.current.getState());
      setPhase("FIGHT");
    }

    // 3. Reset UI state
    setMatchResult(null);
    matchResultRef.current = null;
    setOpponentGameState(null);
  }, [clearMatch, matchStarted, quickMatch]);

  useEffect(() => {
    if (phase !== "FIGHT" || !engine) return;

    lastTimeRef.current = Date.now();
    lastRenderTimeRef.current = Date.now();
    lastBroadcastRef.current = Date.now();

    const loop = () => {
      // 1. Drain network actions
      const pendingActions = consumeOpponentActions();
      for (const action of pendingActions) {
        if (action.type === "GAME_OVER" || action.type === "PLAYER_LEFT") {
          if (action.type === "PLAYER_LEFT") {
            setMatchResult("OPPONENT_LEFT");
            matchResultRef.current = "OPPONENT_LEFT";
            // Force transition to start screen after short delay
            setTimeout(() => {
              handleFindNewMatch();
              router.replace("/");
            }, 3000);
          } else {
            setMatchResult("WIN");
            matchResultRef.current = "WIN";
          }
          cancelAnimationFrame(requestRef.current!);
          requestRef.current = null;
          return;
        }
        if (action.type === "SEND_GARBAGE") {
          engine.queueGarbage(action.payload.lines);
          engine.processGarbageQueue(0);
        }
        if (action.type === "STATE_SYNC") {
          // Ignore syncs if not in FIGHT phase (prevents processing stale packets from previous match)
          if (phase === "FIGHT") {
            setOpponentGameState(action.payload);
          }
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

      // 4. Throttled UI update (30 FPS)
      if (now - lastRenderTimeRef.current > 33) {
        setGameState({ ...newState });
        lastRenderTimeRef.current = now;
      }

      // 5. Handle garbage output
      if (newState.score > lastScoreRef.current) {
        const scoreDiff = newState.score - lastScoreRef.current;
        const garbageLines = Math.max(1, Math.floor(scoreDiff / 2));
        sendGameAction({
          type: "SEND_GARBAGE",
          payload: { lines: garbageLines },
        });
        lastScoreRef.current = newState.score;
      }

      // 6. Throttled Broadcast (every 200ms)
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
  }, [
    phase,
    engine,
    matchResult,
    consumeOpponentActions,
    sendGameAction,
    router,
    handleFindNewMatch,
  ]);

  if (!gameState) {
    return <View style={styles.container} />;
  }

  const displayGrid = getCompositeGrid(gameState.grid, gameState.activePiece);
  const displayOpponentGrid = getCompositeGrid(
    opponentGameState?.grid,
    opponentGameState?.activePiece,
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.fighterArena}>
        <FighterRenderer name={playerName} state={"neutral"} />
        <FighterRenderer name={opponentName} state={"neutral"} flipped={true} />
      </View>

      <View style={styles.hudBar}>
        <VersusBar player1Name={playerName} player2Name={opponentName} />
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
