import { Group, RoundedRect, Canvas, Rect } from "@shopify/react-native-skia";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  Fragment,
} from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";

import { GameEngine } from "@/core/gameEngine";
import { GRID_WIDTH, GRID_HEIGHT } from "@/core/shared";
import { saveTopScore, loadTopScore } from "@/core/storage";
import { IBlock, BlockColor, BlockType } from "@/models/block";
import { IFallingPiece } from "@/models/shape";

import Orb from "@/components/orb";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import GameOverOverlay from "@/components/game-over-overlay";
import GameStartOverlay from "@/components/game-start-overlay";
import NextPiecePreview from "@/components/next-piece-preview";

// --- RENDERING CONSTANTS ---
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const HEADER_HEIGHT = 178; // Approximate height of the parallax header
const PADDING = 20;
const TILE_SIZE = 53;
const BOARD_HEIGHT = TILE_SIZE * GRID_HEIGHT;
const BOARD_WIDTH = TILE_SIZE * GRID_WIDTH;
const X_OFFSET = PADDING;
const Y_OFFSET = PADDING;

console.log({
  screenWidth,
  screenHeight,
  TILE_SIZE,
  BOARD_HEIGHT,
  BOARD_WIDTH,
});

// Initialize the game engine
const engine = new GameEngine();

interface IGameState {
  grid: IBlock[][];
  currentPiece: IFallingPiece | null;
  nextPiece: IFallingPiece | null;
  score: number;
  totalBlocksCleared: number;
  currentChain: number;
  isGameOver: boolean;
  didWin: boolean;
  level: number;
  linkedRects: {
    r: number;
    c: number;
    w: number;
    h: number;
    color: BlockColor;
  }[];
}

export default function Index() {
  const [gameState, setGameState] = useState<IGameState>({
    grid: engine.gameState,
    currentPiece: engine.currentPiece,
    nextPiece: engine.nextPiece,
    score: engine.score,
    totalBlocksCleared: engine.totalBlocksCleared,
    currentChain: engine.currentChain,
    isGameOver: engine.isGameOver,
    didWin: engine.didWin,
    level: engine.level,
    linkedRects: engine.linkedRects,
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [_, setToasts] = useState<{ id: number; message: string }[]>([]);
  const router = useRouter();
  const prevChain = useRef(0);

  const isLoopRunning = useSharedValue(false);
  const lastMoveX = useSharedValue(0);
  const TILE_THRESHOLD = TILE_SIZE / 2;

  // --- Shared values for thread-safe communication ---
  const wantsToRotate = useSharedValue(false);
  const wantsToHardDrop = useSharedValue(false);
  const moveDirection = useSharedValue<"left" | "right" | "none">("none");
  const isHardDropTriggeredInGesture = useSharedValue(false);

  // --- Toast Management ---
  const addToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((currentToasts) => [...currentToasts, { id, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }, []);

  const [topScore, setTopScore] = useState(0);

  // --- Game Loop ---
  useFocusEffect(
    useCallback(() => {
      loadTopScore().then(setTopScore);

      if (gameState.isGameOver || !gameStarted) return;

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
        const gravityDelay = Math.max(100, 500 - (gameState.level - 1) * 50);
        if (now - lastGravityTick > gravityDelay) {
          lastGravityTick = now;
          if (engine.isPieceLocked) {
            engine.resetChain();
            engine.spawnPiece();
          } else {
            engine.gravityTick();
          }
        }

        // --- Check for new chains to show toast ---
        if (
          engine.currentChain > 1 &&
          engine.currentChain > prevChain.current
        ) {
          addToast(`CHAIN x${engine.currentChain}!`);
        }
        prevChain.current = engine.currentChain;

        // --- Sync State and Continue Loop ---
        setGameState({
          grid: engine.gameState,
          currentPiece: engine.currentPiece,
          nextPiece: engine.nextPiece,
          score: engine.score,
          totalBlocksCleared: engine.totalBlocksCleared,
          currentChain: engine.currentChain,
          isGameOver: engine.isGameOver,
          didWin: engine.didWin,
          level: engine.level,
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
    }, [
      gameState.isGameOver,
      gameStarted,
      isLoopRunning,
      wantsToHardDrop,
      wantsToRotate,
      moveDirection,
      addToast,
    ]),
  );

  // --- Countdown & Redirect Effects ---
  useEffect(() => {
    if (gameState.isGameOver) {
      if (gameState.score > topScore) {
        saveTopScore(gameState.score);
      }
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.isGameOver, gameState.score, topScore]);

  useEffect(() => {
    if (countdown <= 0 && gameState.isGameOver) {
      handleRestart();
    }
  }, [countdown, gameState.isGameOver, router]);

  const handleRestart = () => {
    engine.resetGame();
    setGameState({
      grid: engine.gameState,
      currentPiece: engine.currentPiece,
      nextPiece: engine.nextPiece,
      score: engine.score,
      totalBlocksCleared: engine.totalBlocksCleared,
      currentChain: engine.currentChain,
      isGameOver: engine.isGameOver,
      didWin: engine.didWin,
      level: engine.level,
      linkedRects: engine.linkedRects,
    });
    setGameStarted(false);
  };

  const handleStartGame = () => {
    engine.resetGame();
    setGameState({
      grid: engine.gameState,
      currentPiece: engine.currentPiece,
      nextPiece: engine.nextPiece,
      score: engine.score,
      totalBlocksCleared: engine.totalBlocksCleared,
      currentChain: engine.currentChain,
      isGameOver: engine.isGameOver,
      didWin: engine.didWin,
      level: engine.level,
      linkedRects: engine.linkedRects,
    });
    setGameStarted(true);
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

    const highlightColor = "rgba(255, 255, 255, 0.2)";
    const shadowColor = "rgba(0, 0, 0, 0.2)";
    const borderWidth = 2;

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
        {/* Top highlight */}
        <Rect
          x={x}
          y={y}
          width={TILE_SIZE}
          height={borderWidth}
          color={highlightColor}
        />
        {/* Left shadow */}
        <Rect
          x={x}
          y={y + borderWidth}
          width={borderWidth}
          height={TILE_SIZE - borderWidth}
          color={shadowColor}
        />
        {/* Right shadow */}
        <Rect
          x={x + TILE_SIZE - borderWidth}
          y={y + borderWidth}
          width={borderWidth}
          height={TILE_SIZE - borderWidth}
          color={shadowColor}
        />
        {/* Bottom shadow */}
        <Rect
          x={x + borderWidth}
          y={y + TILE_SIZE - borderWidth}
          width={TILE_SIZE - borderWidth * 2}
          height={borderWidth}
          color={shadowColor}
        />
      </Group>
    );
  }, []);

  return (
    <ThemedView style={styles.wrapper}>
      <ThemedView style={styles.header}>
        <NextPiecePreview nextPiece={gameState.nextPiece} />
        <Image
          source={require("@/assets/characters/badhombre/neutral.png")}
          style={styles.character}
        />
        <View style={styles.statsContainer}>
          <ThemedText>Score: {gameState.score}</ThemedText>
          <ThemedText>Blocks: {gameState.totalBlocksCleared}</ThemedText>
          <ThemedText>Level: {gameState.level}</ThemedText>
        </View>
      </ThemedView>
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
      </ThemedView>
      <GameStartOverlay
        gameStarted={gameStarted}
        handleStartGame={handleStartGame}
      />
      <GameOverOverlay
        isGameOver={gameState.isGameOver}
        didWin={engine.didWin}
        handleRestart={handleRestart}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: screenHeight,
  },

  header: {
    height: HEADER_HEIGHT,
  },
  statsContainer: {
    position: "absolute",
    right: PADDING,
    bottom: PADDING,
    alignItems: "flex-end",
    backgroundColor: "none",
  },
  character: {
    height: HEADER_HEIGHT,
    left: 0,
    right: 0,
    position: "absolute",
  },

  gameContainer: {
    height: screenHeight - HEADER_HEIGHT,
    justifyContent: "center",
  },
  canvas: {
    height: BOARD_HEIGHT + PADDING * 2,
    width: BOARD_WIDTH + PADDING * 2,
    alignSelf: "center",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
  },
});
