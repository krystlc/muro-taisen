import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GameButton, ScreenShell, VersusBar, gameColors } from '../components/game-ui';
import { BOARD_COLS, BOARD_ROWS } from '../core/engine/Board';
import { GameEngine, GameState } from '../core/engine/GameEngine';
import { useGameStore } from '../store/useGameStore';
import { InputController } from '@/input/InputController';
import { GemType } from '@/core/models/Gem';

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
      await new Promise((r) => setTimeout(r, 600));
      setPhase('3');
      await new Promise((r) => setTimeout(r, 600));
      setPhase('2');
      await new Promise((r) => setTimeout(r, 600));
      setPhase('1');
      await new Promise((r) => setTimeout(r, 600));
      setPhase('FIGHT');
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

      // Pass actual elapsed time to the engine so gravity accumulates correctly
      engineRef.current.tick(Math.min(deltaMs, 200));
      const currentState = engineRef.current.getState();
      setGameState({ ...currentState });

      if (currentState.status === 'GAME_OVER') {
        clearInterval(interval);
      }
    }, 50); // Tick 20 times a second for smooth physics processing

    return () => clearInterval(interval);
  }, [phase]);

  // Build a composite view of the grid + active piece for rendering
  const displayGrid = gameState.grid.map((row) => [...row]);
  const activePiece = gameState.activePiece;

  if (activePiece) {
    const [pivotRow, pivotCol] = [activePiece.row, activePiece.column];
    // Simple offset mapping for partner based on rotation
    const offsets: Record<number, [number, number]> = {
      0: [1, 0],
      90: [0, 1],
      180: [-1, 0],
      270: [0, -1],
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
    // Reset phase first to clear and re-trigger the fight sequence/interval cleanly
    setPhase('READY');
    engineRef.current = new GameEngine(`match_seed_${Date.now()}`);
    setGameState(engineRef.current.getState());

    // Short delay to restart the fight phase
    setTimeout(() => {
      setPhase('FIGHT');
    }, 100);
  };

  return (
    <ScreenShell
      eyebrow="ROUND 01 // FIGHT"
      onBack={() => router.back()}
      subtitle={`Good luck. ${difficulty} difficulty.`}
      title="Battle"
    >
      <StatusBar style="light" />
      <VersusBar player1Name={player1.name} player2Name={player2.name} />
      <InputController engineRef={engineRef} enabled={phase === 'FIGHT'}>
        <View style={styles.arena}>
          {phase !== 'FIGHT' ? (
            <View style={styles.centered}>
              <Text style={styles.countdownText}>{phase}</Text>
            </View>
          ) : (
            <View style={styles.boardContainer}>

              {displayGrid.slice().reverse().map((row, rIndex) => {
                const actualRowIndex = BOARD_ROWS - 1 - rIndex;
                return (
                  <View key={`row-${actualRowIndex}`} style={styles.row}>
                    {row.map((gem, cIndex) => {
                      if (!gem) {
                        return <View key={`cell-${actualRowIndex}-${cIndex}`} style={styles.cell} />;
                      }

                      // Strict deterministic state checks
                      const isFrozen = gem.type === GemType.COUNTER;
                      const isExploding = gem.type === GemType.CRASH;
                      const isPowerGem = !!gem.powerGemId && !isFrozen;

                      return (
                        <View
                          key={`cell-${actualRowIndex}-${cIndex}`}
                          style={[
                            styles.cell,
                            { backgroundColor: getGemColor(gem.color) },
                            isExploding && styles.explodingCell,
                            isFrozen && styles.frozenCell,
                            isPowerGem && styles.powerGemCell,
                          ]}
                        >
                          {isFrozen && (
                            <View style={styles.counterBadge}>
                              {/* Strictly render the engine's counterValue */}
                              <Text style={styles.counterText}>{gem.counterValue}</Text>
                            </View>
                          )}

                          {isPowerGem && (
                            <View style={styles.powerGemCore} />
                          )}

                          {isExploding && (
                            <View style={styles.explodingCore} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {gameState.status === 'GAME_OVER' && (
                <View style={styles.gameOverOverlay}>
                  <Text style={styles.gameOverText}>GAME OVER</Text>
                  <GameButton
                    label="Play Again"
                    onPress={handlePlayAgain}
                    variant="primary"
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </InputController>

      <GameButton
        label="SURRENDER"
        onPress={() => router.replace('/start')}
        variant="secondary"
      />
    </ScreenShell>
  );
}

function getGemColor(colorStr: string): string {
  const colors: Record<string, string> = {
    RED: '#ff3366',
    BLUE: '#00e5ff',
    GREEN: '#00ff66',
    YELLOW: '#ffcc00',
  };
  return colors[colorStr] || '#334155';
}

const styles = StyleSheet.create({
  arena: {
    backgroundColor: '#0c1220',
    borderColor: '#273449',
    borderRadius: 18,
    borderWidth: 1,
    height: 460,
    marginHorizontal: 16,
    marginVertical: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#00e5ff',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  boardContainer: {
    flex: 1,
    width: '100%',
    padding: 8,
    justifyContent: 'center',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },

  cell: {
    flex: 1,
    margin: 1,
    backgroundColor: '#131b2e',
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  explodingCell: {
    borderRadius: 16, // Forces circular shape for crash blocks
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  explodingCore: {
    flex: 1,
    margin: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  frozenCell: {
    borderColor: '#00e5ff',
    borderWidth: 2,
    opacity: 0.85,
  },
  counterBadge: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 2,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  gameOverOverlay: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    padding: 24,
    backgroundColor: 'rgba(12, 18, 32, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff3366',
    alignItems: 'center',
    zIndex: 10,
  },
  gameOverText: {
    color: '#ff3366',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  powerGemCell: {
    borderColor: '#ffffff',
    borderWidth: 1.5,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  powerGemCore: {
    flex: 1,
    margin: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 2,
  },
});
