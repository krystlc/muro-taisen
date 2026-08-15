import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GameButton, VersusBar } from "../components/game-ui";
import { FighterRenderer } from "../components/game-ui/FighterRenderer";
import { BOARD_COLS, BOARD_ROWS } from "../core/engine/Board";
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

  const [p1State, setP1State] = useState<"neutral" | "attack" | "damage">(
    "neutral",
  );
  const [p2State, setP2State] = useState<"neutral" | "attack" | "damage">(
    "neutral",
  );

  const triggerState = (
    setter: React.Dispatch<
      React.SetStateAction<"neutral" | "attack" | "damage">
    >,
    state: "attack" | "damage",
  ) => {
    setter(state);
    setTimeout(() => setter("neutral"), 500);
  };

  // ... (rest of the component)

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
  useEffect(() => {
    if (phase !== "FIGHT" || !engine) return;
    let lastTime = Date.now();

    const interval = setInterval(() => {
      // --- DRAIN NETWORK QUEUE ---
      const pendingActions = consumeOpponentActions();
      for (const action of pendingActions) {
        if (action.type === "GAME_OVER" || action.type === "PLAYER_LEFT") {
          if (action.type === "PLAYER_LEFT") {
            setMatchResult("OPPONENT_LEFT");
            matchResultRef.current = "OPPONENT_LEFT";
          } else {
            setMatchResult("WIN");
            matchResultRef.current = "WIN";
          }
          return;
        }

        if (action.type === "STATE_SYNC") {
            setOpponentGameState(action.payload);
        } else if (action.type === "SEND_GARBAGE") {
            engine.queueGarbage(action.payload.lines);
            engine.processGarbageQueue(0);
            triggerState(setP1State, "damage");
        }
      }

      // --- ENGINE TICK ---
      const currentState = engine.getState();

      if (currentState.status === "GAME_OVER") {
        clearInterval(interval);
        if (!matchResultRef.current) {
          sendGameAction({ type: "GAME_OVER" });
          matchResultRef.current = "LOSS";
        }
        setGameState({ ...currentState });
        setMatchResult("LOSS");
        return;
      }

      const now = Date.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      engine.tick(deltaMs);
      const newState = engine.getState();
      setGameState({ ...newState });

      if (newState.score > lastScoreRef.current) {
        const scoreDiff = newState.score - lastScoreRef.current;
        const garbageLines = Math.max(1, Math.floor(scoreDiff / 2));
        sendGameAction({
          type: "SEND_GARBAGE",
          payload: { lines: garbageLines },
        });
        lastScoreRef.current = newState.score;
        triggerState(setP1State, "attack");
        triggerState(setP2State, "damage");
      }

      // --- BROADCAST STATE ---
      sendGameAction({ type: "STATE_SYNC", payload: engine.getSnapshot() });
    }, 500);

    return () => clearInterval(interval);
  }, [
    phase,
    engine,
    consumeOpponentActions,
    sendGameAction,
  ]);

  const handleFindNewMatch = () => {
    // 1. Tell context to clear the stale match data
    clearMatch();

    // 2. Reset UI state immediately
    setMatchResult(null);
    matchResultRef.current = null;
    setPhase("MATCHMAKING");
    engineRef.current = null;
    opponentEngineRef.current = null;
    setEngine(null);
    setOpponentEngine(null);

    // 3. Ask server for a new opponent
    quickMatch();
  };

  if (!gameState || !opponentGameState) {
    return <View style={styles.container} />;
  }

  // Hook into local input actions to broadcast them to the server
  // (Pass a wrapper around your engine actions into InputController or call sendGameAction on moves)

  // Build Human Composite View Grid
  if (!gameState || !opponentGameState) {
    return <View style={styles.container} />; // Or a loading screen
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
  const displayOpponentGrid = opponentGameState.grid.map((row) => [...row]);
  const opActivePiece = opponentGameState.activePiece;
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
        <FighterRenderer name={player1.name} state={p1State} />
        <FighterRenderer name={opponentName} state={p2State} flipped={true} />
      </View>

      <View style={styles.hudBar}>
        <VersusBar player1Name={player1.name} player2Name={opponentName} />
      </View>

      <InputController
        engineRef={engineRef}
        enabled={phase === "FIGHT"}
        onAction={(action) => {
          if (matchStarted) {
            sendGameAction(action);
          }
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
            opponentGameState.status === "GAME_OVER" ||
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
