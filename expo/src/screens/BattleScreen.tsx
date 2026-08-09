import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GameButton, VersusBar } from '../components/game-ui';
import { BOARD_COLS, BOARD_ROWS } from '../core/engine/Board';
import { GameEngine, GameState } from '../core/engine/GameEngine';
import { useGameStore } from '../store/useGameStore';
import { InputController } from '@/input/InputController';
import { useGameServerContext } from '../contexts/GameServerContext';

import { NextPiecePanel, MainBoard, OpponentMiniBoard } from '@/rendering/components/BattleComponents';

export default function BattleScreen() {
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);

  // Hook into the websocket server connection
  const { sendGameAction, opponentAction, matchStarted, quickMatch, queueStatus, userId } = useGameServerContext();

  const opponentName = matchStarted
    ? (matchStarted.players.find(id => id !== userId) || 'Opponent')
    : player2.name;

  const engineRef = useRef<GameEngine | null>(null);
  const opponentEngineRef = useRef<GameEngine | null>(null);

  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [opponentEngine, setOpponentEngine] = useState<GameEngine | null>(null);

  // Initialize engines once match data (seed) arrives from the server
  useEffect(() => {
    if (matchStarted) {
      const eng1 = new GameEngine(matchStarted.seed.toString());
      const eng2 = new GameEngine(matchStarted.seed.toString());
      engineRef.current = eng1;
      opponentEngineRef.current = eng2;
      setEngine(eng1);
      setOpponentEngine(eng2);
      setGameState(eng1.getState());
      setOpponentGameState(eng2.getState());
      setPhase('FIGHT');
    }
  }, [matchStarted]);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [opponentGameState, setOpponentGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<'MATCHMAKING' | 'READY' | '3' | '2' | '1' | 'FIGHT'>('MATCHMAKING');
  const [matchResult, setMatchResult] = useState<'WIN' | 'LOSS' | null>(null);

  const lastScoreRef = useRef(0);
  const opponentLastScoreRef = useRef(0);

  // Auto-trigger quick match on mount if not matched yet
  useEffect(() => {
    if (!matchStarted) {
      quickMatch();
    }
  }, [matchStarted]);

  // Once server sends START_MATCH, kick off the countdown sequence
  useEffect(() => {
    if (matchStarted && phase === 'MATCHMAKING') {
      const sequence = async () => {
        setPhase('READY');
        await new Promise((r) => setTimeout(r, 600)); setPhase('3');
        await new Promise((r) => setTimeout(r, 600)); setPhase('2');
        await new Promise((r) => setTimeout(r, 600)); setPhase('1');
        await new Promise((r) => setTimeout(r, 600)); setPhase('FIGHT');
      };
      sequence();
    }
  }, [matchStarted, phase]);

  // Handle incoming remote actions from the online opponent
  useEffect(() => {
    if (!opponentAction || !opponentEngine || !engine) return;

    if (opponentAction.payload?.type === 'GAME_OVER') {
      setMatchResult('WIN');
      return;
    }

    // Apply opponent's network actions (e.g., DROP, ROTATE) to their engine simulation
    switch (opponentAction.type) {
      case 'MOVE':
        if (opponentAction.payload?.direction === 'LEFT') {
            opponentEngine.queueInput('MOVE_LEFT');
        } else if (opponentAction.payload?.direction === 'RIGHT') {
            opponentEngine.queueInput('MOVE_RIGHT');
        }
        break;
      case 'ROTATE':
        opponentEngine.queueInput('ROTATE_CW');
        break;
      case 'DROP':
        opponentEngine.queueInput('HARD_DROP');
        break;
      case 'SEND_GARBAGE':
        // If opponent attacked us, queue garbage locally
        engine.queueGarbage(opponentAction.payload.lines);
        engine.processGarbageQueue(0);
        break;
    }
  }, [opponentAction, engine, opponentEngine]);

  // Main Game Loop Tick
  useEffect(() => {
    if (phase !== 'FIGHT' || !engine || !opponentEngine) return;
    let lastTime = Date.now();

    const interval = setInterval(() => {
      const currentState = engine.getState();
      const currentOpponentState = opponentEngine.getState();

      // Check Win/Loss conditions - BROADCAST GAME OVER
      if (currentState.status === 'GAME_OVER' || currentOpponentState.status === 'GAME_OVER') {
        clearInterval(interval);

        // Broadcast Game Over to opponent
        if (matchStarted && !matchResult) {
          sendGameAction({ type: 'SEND_GARBAGE', payload: { type: 'GAME_OVER' } });
        }

        setGameState({ ...currentState });
        setOpponentGameState({ ...currentOpponentState });

        if (currentState.status === 'GAME_OVER') {
          setMatchResult('LOSS');
        } else {
          setMatchResult('WIN');
        }
        return;
      }

      const now = Date.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      // 1. HUMAN LOCAL ENGINE TICK & INPUT BROADCAST
      engine.tick(deltaMs);
      const newState = engine.getState();
      setGameState({ ...newState });

      // Check if player scored points -> Calculate and Send Garbage to Server
      if (newState.score > lastScoreRef.current) {
        const scoreDiff = newState.score - lastScoreRef.current;
        const garbageLines = Math.max(1, Math.floor(scoreDiff / 2));

        // Broadcast attack to the server so it routes to the opponent
        sendGameAction({
          type: 'SEND_GARBAGE',
          payload: { lines: garbageLines }
        });

        lastScoreRef.current = newState.score;
      }

      // 2. REMOTE OPPONENT ENGINE TICK (Simulated smoothly via shared seed & action sync)
      opponentEngine.tick(deltaMs);
      setOpponentGameState({ ...opponentEngine.getState() });

    }, 50);

    return () => clearInterval(interval);
  }, [phase]);

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
    const offsets: Record<number, [number, number]> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
    const [rOff, cOff] = offsets[activePiece.rotation] || [1, 0];
    if (pivotRow >= 0 && pivotRow < BOARD_ROWS && pivotCol >= 0 && pivotCol < BOARD_COLS) {
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
    const offsets: Record<number, [number, number]> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
    const [rOff, cOff] = offsets[opActivePiece.rotation] || [1, 0];
    if (pivotRow >= 0 && pivotRow < BOARD_ROWS && pivotCol >= 0 && pivotCol < BOARD_COLS) {
      displayOpponentGrid[pivotRow][pivotCol] = opActivePiece.gems[0];
    }
    const pRow = pivotRow + rOff;
    const pCol = pivotCol + cOff;
    if (pRow >= 0 && pRow < BOARD_ROWS && pCol >= 0 && pCol < BOARD_COLS) {
      displayOpponentGrid[pRow][pCol] = opActivePiece.gems[1];
    }
  }

  const handleFindNewMatch = () => {
    setMatchResult(null);
    setPhase('MATCHMAKING');
    engineRef.current = null;
    opponentEngineRef.current = null;
    quickMatch();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.fighterArena}>
        <Text style={styles.placeholderText}>
          {phase === 'MATCHMAKING' ? (queueStatus || 'Finding Opponent...') : '[ Online 3D Arena ]'}
        </Text>
      </View>

      <View style={styles.hudBar}>
        <VersusBar player1Name={player1.name} player2Name={opponentName} />
      </View>

      <InputController 
        engineRef={engineRef} 
        enabled={phase === 'FIGHT'} 
        onAction={(action) => {
            if (matchStarted) {
                sendGameAction(action);
            }
        }}
      >
        <View style={styles.puzzleArea}>
          {phase !== 'FIGHT' ? (
            <View style={styles.centered}>
              <Text style={styles.countdownText}>{phase === 'MATCHMAKING' ? 'SEARCHING' : phase}</Text>
            </View>
          ) : (
            <>
              <NextPiecePanel nextPiece={gameState.nextPiece} />
              <MainBoard displayGrid={displayGrid} />
              <OpponentMiniBoard opponentGrid={displayOpponentGrid} />
            </>
          )}

          {(gameState.status === 'GAME_OVER' || opponentGameState.status === 'GAME_OVER' || matchResult) && (
            <View style={styles.gameOverOverlay}>
              <Text style={[styles.gameOverText, matchResult === 'WIN' ? styles.winText : styles.lossText]}>
                {matchResult === 'WIN' ? 'VICTORY!' : 'K.O. / DEFEAT'}
              </Text>
              <View style={styles.buttonRow}>
                <GameButton label="Find New Match" onPress={handleFindNewMatch} variant="primary" />
              </View>
            </View>
          )}
        </View>
      </InputController>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c1220' },
  fighterArena: { flex: 0.4, backgroundColor: '#1a2235', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#000' },
  placeholderText: { color: '#475569', fontSize: 20, fontWeight: 'bold' },
  hudBar: { flex: 0.1, zIndex: 10, justifyContent: 'center' },
  puzzleArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, backgroundColor: '#0f1626', overflow: 'hidden' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  countdownText: { color: '#00e5ff', fontSize: 48, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 10 },
  gameOverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12, 18, 32, 0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  gameOverText: { fontSize: 36, fontWeight: 'bold', marginBottom: 24 },
  winText: { color: '#00e5ff' },
  lossText: { color: '#ff3366' },
  buttonRow: { flexDirection: 'row', gap: 16 },
});
