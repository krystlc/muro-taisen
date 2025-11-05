import { Dimensions, StyleSheet, Button } from "react-native";
import { Canvas, Rect, RoundedRect, Group } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { GameEngine } from "@/core/gameEngine";
import { GRID_WIDTH, GRID_HEIGHT } from "@/core/shared";
import { BlockType, IBlock, BlockColor } from "@/models/block";
import type { IFallingPiece } from "@/models/shape";
import React, { Fragment, useCallback, useState, useEffect } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import Orb from "@/components/orb";
import { saveTopScore, loadTopScore } from "@/core/storage";

// --- RENDERING CONSTANTS ---
const { width: screenWidth } = Dimensions.get("window");
const PADDING = 20;
const TILE_SIZE = Math.floor((screenWidth - PADDING * 2) / GRID_WIDTH);
const BOARD_HEIGHT = TILE_SIZE * GRID_HEIGHT;
const BOARD_WIDTH = TILE_SIZE * GRID_WIDTH;
const X_OFFSET = PADDING;
const Y_OFFSET = PADDING;

// Initialize the game engine
const engine = new GameEngine();

interface IGameState {
  grid: IBlock[][];
  currentPiece: IFallingPiece | null;
  score: number;
  totalBlocksCleared: number;
  currentChain: number;
  isGameOver: boolean;
  linkedRects: {
    r: number;
    c: number;
    w: number;
    h: number;
    color: BlockColor;
  }[];
}

export default function GameScreen() {
  const [gameState, setGameState] = useState<IGameState>({
    grid: engine.gameState,
    currentPiece: engine.currentPiece,
    score: engine.score,
    totalBlocksCleared: engine.totalBlocksCleared,
    currentChain: engine.currentChain,
    isGameOver: engine.isGameOver,
    linkedRects: engine.linkedRects,
  });
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();

  const isLoopRunning = useSharedValue(false);
  const lastMoveX = useSharedValue(0);
  const TILE_THRESHOLD = TILE_SIZE / 2;

  // --- Shared values for thread-safe communication ---
  const wantsToRotate = useSharedValue(false);
  const wantsToHardDrop = useSharedValue(false);
  const moveDirection = useSharedValue<"left" | "right" | "none">("none");
  const isHardDropTriggeredInGesture = useSharedValue(false);

  // --- Game Loop ---
  useFocusEffect(
    useCallback(() => {
      if (gameState.isGameOver) return;

      isLoopRunning.value = true;
      let lastGravityTick = 0;

      const gameLoop = (now: number) => {
        if (!isLoopRunning.value) return;

        // --- Process Inputs (every frame) ---
        if (wantsToHardDrop.value) {
          engine.hardDrop();
          wantsToHardDrop.value = false;
        }
        if (wantsToRotate.value) {
          engine.tryRotate();
          wantsToRotate.value = false;
        }
        if (moveDirection.value !== "none") {
          engine.tryMove(moveDirection.value);
          moveDirection.value = "none";
        }

        // --- Apply Gravity (throttled) ---
        if (now - lastGravityTick > 500) {
          lastGravityTick = now;
          if (engine.isPieceLocked) {
            engine.resetChain();
            engine.spawnPiece();
          } else {
            engine.gravityTick();
          }
        }

        // --- Sync State and Continue Loop ---
        setGameState({
          grid: engine.gameState,
          currentPiece: engine.currentPiece,
          score: engine.score,
          totalBlocksCleared: engine.totalBlocksCleared,
          currentChain: engine.currentChain,
          isGameOver: engine.isGameOver,
          linkedRects: engine.linkedRects,
        });

        if (engine.isGameOver) {
          isLoopRunning.value = false;
        } else {
          requestAnimationFrame(gameLoop);
        }
      };

      requestAnimationFrame(gameLoop);

      return () => {
        isLoopRunning.value = false;
      };
    }, [gameState.isGameOver]),
  );

  // --- Countdown & Redirect Effects ---
  useEffect(() => {
    if (gameState.isGameOver) {
      // Save score if it's a new high score
      const handleScore = async () => {
        const topScore = await loadTopScore();
        if (gameState.score > topScore) {
          await saveTopScore(gameState.score);
        }
      };
      handleScore();

      // Start countdown
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.isGameOver]);

  useEffect(() => {
    if (countdown <= 0 && gameState.isGameOver) {
      engine.resetGame();
      setGameState({
        grid: engine.gameState,
        currentPiece: engine.currentPiece,
        score: engine.score,
        totalBlocksCleared: engine.totalBlocksCleared,
        currentChain: engine.currentChain,
        isGameOver: engine.isGameOver, // This will now be false
        linkedRects: [],
      });
      router.replace("/");
    }
  }, [countdown, gameState.isGameOver, router]);

  const handleContinue = () => {
    engine.resetGame();
    setGameState({
      ...engine,
      grid: engine.gameState,
      linkedRects: engine.linkedRects,
    });
  };

  // --- Gestures ---
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (isHardDropTriggeredInGesture.value) return;
      if (
        e.translationY > TILE_SIZE * 2 &&
        Math.abs(e.translationX) < TILE_SIZE
      ) {
        wantsToHardDrop.value = true;
        isHardDropTriggeredInGesture.value = true;
        return;
      }
      const deltaX = e.translationX - lastMoveX.value;
      if (Math.abs(deltaX) > TILE_THRESHOLD) {
        moveDirection.value = deltaX > 0 ? "right" : "left";
        lastMoveX.value = e.translationX;
      }
    })
    .onEnd(() => {
      lastMoveX.value = 0;
      isHardDropTriggeredInGesture.value = false;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    wantsToRotate.value = true;
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // --- Rendering ---
  const renderBlock = useCallback((block: IBlock, row: number, col: number) => {
    if (!block || block.type === BlockType.EMPTY || row < 0) return null;

    const x = X_OFFSET + col * TILE_SIZE;
    const y = Y_OFFSET + row * TILE_SIZE;

    // Orbs are special and are rendered separately
    if (block.type === BlockType.ORB) {
      return (
        <Orb
          key={`${row}-${col}`}
          x={x}
          y={y}
          size={TILE_SIZE}
          color={block.color}
        />
      );
    }

    // Render a standard, un-linked block
    return (
      <Group key={`${row}-${col}`}>
        <RoundedRect
          x={x}
          y={y}
          width={TILE_SIZE}
          height={TILE_SIZE}
          r={4}
          color={block.color}
        />
        <RoundedRect
          x={x + 1}
          y={y + 1}
          width={TILE_SIZE - 2}
          height={TILE_SIZE - 2}
          r={3}
          color={block.color}
          style="stroke"
          strokeWidth={1}
        />
      </Group>
    );
  }, []);

  return (
    <ThemedView style={styles.gameContainer}>
      <GestureDetector gesture={composedGesture}>
        <Canvas style={styles.canvas}>
          <Rect
            x={X_OFFSET}
            y={Y_OFFSET}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            color="#1A1A1A"
          />
          {/* Render all non-linked blocks */}
          {gameState.grid.map((rowArr, row) =>
            rowArr.map((block, col) => {
              if (block.isLinked) return null;
              return renderBlock(block, row, col);
            }),
          )}

          {/* Render all linked rectangles */}
          {gameState.linkedRects.map((rect) => (
            <Group key={`rect-${rect.r}-${rect.c}`}>
              <RoundedRect
                x={X_OFFSET + rect.c * TILE_SIZE}
                y={Y_OFFSET + rect.r * TILE_SIZE}
                width={rect.w * TILE_SIZE}
                height={rect.h * TILE_SIZE}
                r={8}
                color={rect.color}
              />
              <RoundedRect
                x={X_OFFSET + rect.c * TILE_SIZE + 2}
                y={Y_OFFSET + rect.r * TILE_SIZE + 2}
                width={rect.w * TILE_SIZE - 4}
                height={rect.h * TILE_SIZE - 4}
                r={6}
                style="stroke"
                strokeWidth={3}
                color="white"
              />
            </Group>
          ))}

          {/* Render the falling piece */}
          {gameState.currentPiece && (
            <Fragment>
              {renderBlock(
                gameState.currentPiece.blockA,
                gameState.currentPiece.rowA,
                gameState.currentPiece.colA,
              )}
              {renderBlock(
                gameState.currentPiece.blockB,
                gameState.currentPiece.rowB,
                gameState.currentPiece.colB,
              )}
            </Fragment>
          )}
        </Canvas>
      </GestureDetector>
      <ThemedView style={styles.statsContainer}>
        <ThemedText>Score: {gameState.score}</ThemedText>
        <ThemedText>Blocks: {gameState.totalBlocksCleared}</ThemedText>
      </ThemedView>
      {gameState.isGameOver && (
        <ThemedView style={styles.gameOverContainer}>
          <ThemedText type="title" style={styles.gameOverText}>
            GAME OVER
          </ThemedText>
          <ThemedText style={styles.countdownText}>
            Continuing in {countdown}...
          </ThemedText>
          <Button title="Continue" onPress={handleContinue} />
        </ThemedView>
      )}
      {gameState.currentChain > 1 && (
        <ThemedView style={styles.chainContainer}>
          <ThemedText style={styles.chainText}>
            CHAIN x{gameState.currentChain}!
          </ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    padding: PADDING,
    gap: PADDING,
    borderTopWidth: 2,
    borderTopColor: "red",
  },
  gameContainer: {
    flex: 1,
  },
  canvas: {
    width: BOARD_WIDTH + PADDING * 2,
    height: BOARD_HEIGHT + PADDING * 2,
  },
  gameOverContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    gap: 20,
  },
  gameOverText: {},
  countdownText: {},
  chainContainer: {
    position: "absolute",
    top: BOARD_HEIGHT / 2 - 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  chainText: {},
});
