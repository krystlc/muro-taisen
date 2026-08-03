import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';

import { GameButton, ScreenShell, VersusBar } from '../components/game-ui';
import { BOARD_COLS, BOARD_ROWS } from '../core/engine/Board';
import { GameEngine, GameState } from '../core/engine/GameEngine';
import { useGameStore } from '../store/useGameStore';
import { InputController } from '@/input/InputController';

import { NextPiecePanel, MainBoard, OpponentMiniBoard } from '@/rendering/components/BattleComponents';

export default function BattleScreen() {
  const router = useRouter();
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);
  const difficulty = useGameStore((state) => state.difficulty);

  const engineRef = useRef(new GameEngine('match_seed_123'));
  const [gameState, setGameState] = useState<GameState>(() => engineRef.current.getState());
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

  useEffect(() => {
    if (phase !== 'FIGHT') return;
    let lastTime = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTime;
      lastTime = now;

      engineRef.current.tick(Math.min(deltaMs, 200));
      const currentState = engineRef.current.getState();
      setGameState({ ...currentState });

      if (currentState.status === 'GAME_OVER') clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [phase]);

  // Build composite view
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

  const handlePlayAgain = () => {
    setPhase('READY');
    engineRef.current = new GameEngine(`match_seed_${Date.now()}`);
    setGameState(engineRef.current.getState());

    setTimeout(() => {
      setPhase('FIGHT');
    }, 100);
  };

  // Mocking opponent grid until multiplayer engine is connected
  const mockOpponentGrid = Array(BOARD_ROWS).fill(Array(BOARD_COLS).fill(null));

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
              <OpponentMiniBoard opponentGrid={mockOpponentGrid} />
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
