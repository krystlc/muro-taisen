import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';

import { GameButton, ScreenShell, VersusBar } from '../components/game-ui';
import { BOARD_COLS, BOARD_ROWS } from '../core/engine/Board';
import { GameEngine, GameState } from '../core/engine/GameEngine';
import { useGameStore } from '../store/useGameStore';
import { InputController } from '@/input/InputController';
import { AIOpponent, AIDifficulty } from '@/core/opponent/AIOpponent';
import { Opponent } from '@/core/opponent/Opponent';

import { NextPiecePanel, MainBoard, OpponentMiniBoard } from '@/rendering/components/BattleComponents';

export default function BattleScreen() {
  const router = useRouter();
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);
  const difficulty = useGameStore((state) => state.difficulty);

  const getAIDifficulty = (label: string): AIDifficulty => {
    switch (label) {
      case 'MASTER': return 'HARD';
      case 'TAISEN': return 'MEDIUM';
      case 'ROOKIE':
      default: return 'EASY';
    }
  };

  const engineRef = useRef<GameEngine | null>(null);
  const opponentEngineRef = useRef<GameEngine | null>(null);
  const opponentRef = useRef<Opponent | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine('match_seed_123');
    opponentEngineRef.current = new GameEngine('opponent_seed_456');
    opponentRef.current = new AIOpponent('ai-1', player2.name, getAIDifficulty(difficulty));
  }

  // Cast these to non-null for subsequent use, as we know they are initialized
  const engine = engineRef.current!;
  const opponentEngine = opponentEngineRef.current!;
  const opponent = opponentRef.current!;

  const [gameState, setGameState] = useState<GameState>(() => engineRef.current!.getState());
  const [opponentGameState, setOpponentGameState] = useState<GameState>(() => opponentEngineRef.current!.getState());
  const [phase, setPhase] = useState<'READY' | '3' | '2' | '1' | 'FIGHT'>('READY');

  useEffect(() => {
    const sequence = async () => {
      await new Promise((r) => setTimeout(r, 600)); setPhase('3');
      await new Promise((r) => setTimeout(r, 600)); setPhase('2');
      await new Promise((r) => setTimeout(r, 600)); setPhase('1');
      await new Promise((r) => setTimeout(r, 600)); setPhase('FIGHT');
    };
    sequence();
  }, []);

  const lastScoreRef = useRef(0);
  const aiThinkingRef = useRef(false);

  useEffect(() => {
    if (phase !== 'FIGHT') return;
    let lastTime = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      // 1. HUMAN LOGIC
      engine.tick(deltaMs);
      const newState = engine.getState();
      setGameState({ ...newState });

      // Calculate Garbage safely
      if (newState.score > lastScoreRef.current) {
        const scoreDiff = newState.score - lastScoreRef.current;
        const garbageLines = Math.floor(scoreDiff / 100);

        if (garbageLines > 0) {
          opponentEngine.queueGarbage(garbageLines);
        }
        lastScoreRef.current = newState.score;
      }

      // 2. OPPONENT LOGIC
      const currentAiState = opponentEngine.getState();

      if (currentAiState.activePiece && !aiThinkingRef.current) {
        aiThinkingRef.current = true;

        opponent.getNextMove(currentAiState.grid, {
          gem1: currentAiState.activePiece.gems[0],
          gem2: currentAiState.activePiece.gems[1]
        }).then(move => {
          opponentEngine.applyMove(move);
        }).catch(err => {
          console.error("AI computation failed", err);
        }).finally(() => {
          aiThinkingRef.current = false;
        });
      }

      opponentEngine.tick(deltaMs);
      setOpponentGameState({ ...opponentEngine.getState() });

      // 3. WIN/LOSS CONDITIONS
      if (newState.status === 'GAME_OVER' || currentAiState.status === 'GAME_OVER') {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phase]);

  // Build Human Composite View
  const displayGrid = gameState.grid.map((row) => [...row]);
  const activePiece = gameState.activePiece;

  if (activePiece) {
    const [pivotRow, pivotCol] = [activePiece.row, activePiece.column];
    const offsets: Record<number, [number, number]> = {
      0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1],
    };
    const [rOff, cOff] = offsets[activePiece.rotation] || [1, 0];
    const partnerRow = pivotRow + rOff;
    const partnerCol = pivotCol + cOff;

    if (pivotRow >= 0 && pivotRow < BOARD_ROWS && pivotCol >= 0 && pivotCol < BOARD_COLS) {
      displayGrid[pivotRow][pivotCol] = activePiece.gems[0];
    }
    if (partnerRow >= 0 && partnerRow < BOARD_ROWS && partnerCol >= 0 && partnerCol < BOARD_COLS) {
      displayGrid[partnerRow][partnerCol] = activePiece.gems[1];
    }
  }

  // Build Opponent Composite View
  const displayOpponentGrid = opponentGameState.grid.map((row) => [...row]);
  const opActivePiece = opponentGameState.activePiece;

  if (opActivePiece) {
    const [pivotRow, pivotCol] = [opActivePiece.row, opActivePiece.column];
    const offsets: Record<number, [number, number]> = {
      0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1],
    };
    const [rOff, cOff] = offsets[opActivePiece.rotation] || [1, 0];
    const partnerRow = pivotRow + rOff;
    const partnerCol = pivotCol + cOff;

    if (pivotRow >= 0 && pivotRow < BOARD_ROWS && pivotCol >= 0 && pivotCol < BOARD_COLS) {
      displayOpponentGrid[pivotRow][pivotCol] = opActivePiece.gems[0];
    }
    if (partnerRow >= 0 && partnerRow < BOARD_ROWS && partnerCol >= 0 && partnerCol < BOARD_COLS) {
      displayOpponentGrid[partnerRow][partnerCol] = opActivePiece.gems[1];
    }
  }

  const handlePlayAgain = () => {
    setPhase('READY');
    engineRef.current = new GameEngine(`match_seed_${Date.now()}`);
    opponentEngineRef.current = new GameEngine(`match_seed_${Date.now() + 1}`);
    setGameState(engineRef.current.getState());
    setOpponentGameState(opponentEngineRef.current.getState());

    setTimeout(() => {
      setPhase('FIGHT');
    }, 100);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* TOP HALF: 3D FIGHTER ARENA PLACEHOLDER */}
      <View style={styles.fighterArena}>
        <Text style={styles.placeholderText}>[ 3D Fighter Graphics ]</Text>
      </View>

      {/* HUD DIVIDER */}
      <View style={styles.hudBar}>
        <VersusBar player1Name={player1.name} player2Name={player2.name} />
      </View>

      {/* BOTTOM HALF: PUZZLE AREA */}
      <InputController engineRef={engineRef} enabled={phase === 'FIGHT'}>
        <View style={styles.puzzleArea}>

          {phase !== 'FIGHT' ? (
            <View style={styles.centered}>
              <Text style={styles.countdownText}>{phase}</Text>
            </View>
          ) : (
            <>
              <NextPiecePanel nextPiece={gameState.activePiece} />
              <MainBoard displayGrid={displayGrid} />
              <OpponentMiniBoard opponentGrid={displayOpponentGrid} />
            </>
          )}

          {gameState.status === 'GAME_OVER' && (
            <View style={styles.gameOverOverlay}>
              <Text style={styles.gameOverText}>GAME OVER</Text>
              <GameButton label="Play Again" onPress={handlePlayAgain} variant="primary" />
            </View>
          )}

        </View>
      </InputController>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c1220',
  },
  fighterArena: {
    flex: 0.4, // Slightly reduced to give more room for puzzle
    backgroundColor: '#1a2235',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  placeholderText: {
    color: '#475569',
    fontSize: 20,
    fontWeight: 'bold',
  },
  hudBar: {
    flex: 0.1,
    zIndex: 10,
    justifyContent: 'center',
  },
  puzzleArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: '#0f1626',
    overflow: 'hidden', // Ensure no overflow
  },
  // Main board container needs to be tightly constrained
  mainBoardContainer: {
    flex: 1, // Stretch as much as possible
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#00e5ff',
    fontSize: 64,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 10,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 18, 32, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  gameOverText: {
    color: '#ff3366',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 24,
  },
});
