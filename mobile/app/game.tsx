import { Group, RoundedRect, Canvas, Rect } from "@shopify/react-native-skia";
import { useFocusEffect, useRouter } from "expo-router";
import { Image } from "expo-image";
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  Fragment,
} from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";

import { GameEngine } from "@/core/gameEngine";
import { GRID_WIDTH, GRID_HEIGHT } from "@/core/shared";
import { saveTopScore, loadTopScore } from "@/core/storage";
import { useAuth, useHighScores } from "@/hooks/use-api";
import { IBlock, BlockColor, BlockType } from "@/models/block";
import { IFallingPiece } from "@/models/shape";

import Orb from "@/components/orb";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import GameOverOverlay from "@/components/game-over-overlay";
import NextPiecePreview from "@/components/next-piece-preview";
import LevelUpOverlay from "@/components/level-up-overlay";
import { ExplodingBlock } from "@/components/exploding-block";
import AvatarButton from "@/components/avatar-button";
import BottomDrawer from "@/components/bottom-drawer";
import GameStats from "@/components/game-stats";
import { Button } from "@react-navigation/elements";

// --- RENDERING CONSTANTS ---
// const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const HEADER_HEIGHT = 280; // Approximate height of the parallax header
const PADDING = 20;
const TILE_SIZE = 48;
const BOARD_HEIGHT = TILE_SIZE * GRID_HEIGHT;
const BOARD_WIDTH = TILE_SIZE * GRID_WIDTH;
const X_OFFSET = PADDING;
const Y_OFFSET = PADDING;

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
  justLeveledUp: boolean;
  explodingBlocks: { block: IBlock; row: number; col: number }[];
}

type AnimatingBlock = {
  id: string;
  block: IBlock;
  row: number;
  col: number;
};

export default function GameScreen() {
  const [gameState, setGameState] = useState<IGameState>(
    engine.getGameEngineState,
  );
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [animatingBlocks, setAnimatingBlocks] = useState<AnimatingBlock[]>([]);
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();

  const { user, token, logout } = useAuth();
  const { submitScore } = useHighScores();

  const lastMoveX = useSharedValue(0);
  const TILE_THRESHOLD = TILE_SIZE / 2;

  const wantsToRotate = useSharedValue(false);
  const wantsToHardDrop = useSharedValue(false);
  const moveDirection = useSharedValue<"left" | "right" | "none">("none");
  const isHardDropTriggeredInGesture = useSharedValue(false);

  const [topScore, setTopScore] = useState(0);

  useEffect(() => {
    loadTopScore().then(setTopScore);
  }, []);

  const gameLoopRef = useRef<((now: number) => void) | null>(null);
  const lastGravityTickRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loop = (now: number) => {
        gameLoopRef.current?.(now);
        animationFrameIdRef.current = requestAnimationFrame(loop);
      };
      animationFrameIdRef.current = requestAnimationFrame(loop);

      return () => {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
      };
    }, []),
  );

  useEffect(() => {
    gameLoopRef.current = (now: number) => {
      if (isLevelingUp || gameState.isGameOver) {
        return;
      }

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

      const gravityDelay = Math.max(100, 500 - (gameState.level - 1) * 50);
      if (now - lastGravityTickRef.current > gravityDelay) {
        lastGravityTickRef.current = now;
        if (engine.isPieceLocked) {
          engine.resetChain();
          engine.spawnPiece();
        } else {
          engine.gravityTick();
        }
      }

      setGameState(engine.getGameEngineState);
    };
  });

  useEffect(() => {
    if (gameState.justLeveledUp) {
      engine.clearLevelUpFlag();
      setIsLevelingUp(true);
    }
  }, [gameState.justLeveledUp]);

  useEffect(() => {
    if (gameState.explodingBlocks.length > 0) {
      const newAnimatingBlocks: AnimatingBlock[] =
        gameState.explodingBlocks.map((b) => ({
          ...b,
          id: `${b.row}-${b.col}-${Math.random()}`,
        }));
      setAnimatingBlocks((current) => [...current, ...newAnimatingBlocks]);
    }
  }, [gameState.explodingBlocks]);

  const onBlockAnimationComplete = (id: string) => {
    setAnimatingBlocks((current) => current.filter((b) => b.id !== id));
  };

  const handleLevelUpAnimationComplete = useCallback(() => {
    setIsLevelingUp(false);
  }, []);

  useEffect(() => {
    if (gameState.isGameOver) {
      if (token && gameState.score > 0) {
        submitScore(token, gameState.score);
      }
      if (gameState.score > topScore) {
        saveTopScore(gameState.score);
      }
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState.isGameOver, gameState.score, topScore, token, submitScore]);

  const handleRestart = useCallback(() => {
    engine.resetGame();
    router.navigate("/");
  }, [router]);

  useEffect(() => {
    if (countdown <= 0 && gameState.isGameOver) {
      handleRestart();
    }
  }, [countdown, gameState.isGameOver, handleRestart]);

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
        <Rect
          x={x}
          y={y}
          width={TILE_SIZE}
          height={borderWidth}
          color={highlightColor}
        />
        <Rect
          x={x}
          y={y + borderWidth}
          width={borderWidth}
          height={TILE_SIZE - borderWidth}
          color={shadowColor}
        />
        <Rect
          x={x + TILE_SIZE - borderWidth}
          y={y + borderWidth}
          width={borderWidth}
          height={TILE_SIZE - borderWidth}
          color={shadowColor}
        />
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
      <BottomDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
      >
        <ThemedText type="subtitle">Hi, {user?.username}</ThemedText>
        <Button onPress={logout} color="#ff5c5c">
          Logout
        </Button>
      </BottomDrawer>

      <ThemedView style={styles.header}>
        <View style={styles.headerTop}>
          <Button
            onPress={() => router.back()}
            style={styles.backButtonContainer}
          >
            Back
          </Button>
          {token && <AvatarButton onPress={() => setIsDrawerVisible(true)} />}
        </View>
        <View style={styles.headerBottom}>
          <NextPiecePreview nextPiece={gameState.nextPiece} />
          <GameStats
            level={gameState.level}
            score={gameState.score}
            totalBlocksCleared={gameState.totalBlocksCleared}
          />
        </View>
        <Image
          source={require("@/assets/characters/badhombre/neutral.png")}
          style={styles.character}
        />
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
            {gameState.grid.map((rowArr, row) =>
              rowArr.map((block, col) => {
                if (block.isLinked) return null;
                return renderBlock(block, row, col);
              }),
            )}
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
            {animatingBlocks.map((b) => (
              <ExplodingBlock
                key={b.id}
                block={b.block}
                x={X_OFFSET + b.col * TILE_SIZE}
                y={Y_OFFSET + b.row * TILE_SIZE}
                size={TILE_SIZE}
                onAnimationComplete={() => onBlockAnimationComplete(b.id)}
              />
            ))}
          </Canvas>
        </GestureDetector>
      </ThemedView>
      <GameOverOverlay
        isGameOver={gameState.isGameOver}
        didWin={engine.didWin}
        handleRestart={handleRestart}
      />
      <LevelUpOverlay
        isLevelingUp={isLevelingUp}
        level={gameState.level}
        onAnimationComplete={handleLevelUpAnimationComplete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
  },
  headerTop: {
    flex: 1,
    paddingTop: 60,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerBottom: {
    gap: 8,
  },
  backButtonContainer: {
    alignSelf: "flex-start",
  },
  avatarContainer: {},
  character: {
    height: HEADER_HEIGHT,
    left: 0,
    right: 0,
    position: "absolute",
  },
  gameContainer: {
    flex: 1,
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
