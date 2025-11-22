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
import { Dimensions, StyleSheet, View, Button, Alert } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";

import { GameEngine } from "@/core/gameEngine";
import { GRID_WIDTH, GRID_HEIGHT } from "@/core/shared";
import { saveTopScore, loadTopScore } from "@/core/storage";
import { saveToken, getToken, deleteToken } from "@/core/auth";
import { IBlock, BlockColor, BlockType } from "@/models/block";
import { IFallingPiece } from "@/models/shape";

import Orb from "@/components/orb";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import GameOverOverlay from "@/components/game-over-overlay";
import GameStartOverlay from "@/components/game-start-overlay";
import NextPiecePreview from "@/components/next-piece-preview";
import LevelUpOverlay from "@/components/level-up-overlay";
import { ExplodingBlock } from "@/components/exploding-block";
import RegisterModal from "@/components/register-modal";
import HighScoresModal from "@/components/high-scores-modal";

// --- RENDERING CONSTANTS ---
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
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
    justLeveledUp: engine.justLeveledUp,
    explodingBlocks: engine.explodingBlocks,
  });
  const [gameStarted, setGameStarted] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isHighScoresModalVisible, setIsHighScoresModalVisible] =
    useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [animatingBlocks, setAnimatingBlocks] = useState<AnimatingBlock[]>([]);
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

  const [topScore, setTopScore] = useState(0);

  // --- App Load Effect ---
  useEffect(() => {
    loadTopScore().then(setTopScore);
    const loadUser = async () => {
      const token = await getToken();
      if (token) {
        setUserToken(token);
        try {
          const response = await fetch("http://localhost:8000/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUsername(data.username);
          } else {
            await deleteToken();
            setUserToken(null);
          }
        } catch (e) {
          console.error("Failed to fetch user profile", e);
        }
      }
    };
    loadUser();
  }, []);

  // --- Game Loop ---
  useFocusEffect(
    useCallback(() => {
      if (gameState.isGameOver || !gameStarted || isLevelingUp) return;

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
          justLeveledUp: engine.justLeveledUp,
          explodingBlocks: engine.explodingBlocks,
        });

        if (engine.justLeveledUp) {
          engine.clearLevelUpFlag();
          setIsLevelingUp(true);
          isLoopRunning.value = false;
          return;
        }

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
      isLevelingUp,
      wantsToHardDrop,
      wantsToRotate,
      moveDirection,
      addToast,
    ]),
  );

  useEffect(() => {
    if (gameState.explodingBlocks.length > 0) {
      const newAnimatingBlocks: AnimatingBlock[] =
        gameState.explodingBlocks.map((b) => ({
          ...b,
          id: `${b.row}-${b.col}-${Math.random()}`, // Unique ID
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

  const submitScore = async (token: string, score: number) => {
    console.log(`Submitting score: ${score} with token: ${token}`);
    try {
      const response = await fetch("http://localhost:8000/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score }),
      });
      if (response.ok) {
        console.log("Score submitted successfully!");
      } else {
        const data = await response.json();
        console.error("Failed to submit score:", data.error);
        Alert.alert("Score Submission Failed", data.error);
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      Alert.alert("Score Submission Error", "An unexpected error occurred.");
    }
  };

  // --- Countdown & Redirect Effects ---
  useEffect(() => {
    if (gameState.isGameOver) {
      if (userToken && gameState.score > 0) {
        submitScore(userToken, gameState.score);
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
  }, [gameState.isGameOver, gameState.score, topScore, userToken]);

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
      justLeveledUp: engine.justLeveledUp,
      explodingBlocks: engine.explodingBlocks,
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
      justLeveledUp: engine.justLeveledUp,
      explodingBlocks: engine.explodingBlocks,
    });
    setGameStarted(true);
  };

  const handleRegister = async (username: string) => {
    console.log("handleRegister called with username:", username);
    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });
      console.log("Registration response status:", response.status);
      const data = await response.json();
      if (response.ok) {
        console.log("Registration successful, token:", data.token);
        await saveToken(data.token);
        setUserToken(data.token);
        setUsername(username);
      } else {
        console.error("Registration failed:", data.error);
        Alert.alert("Registration Failed", data.error);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      Alert.alert("Registration Error", "An unexpected error occurred.");
    }
    setIsRegisterModalVisible(false);
  };

  const handleLogout = async () => {
    console.log("handleLogout called");
    await deleteToken();
    setUserToken(null);
    setUsername(null);
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
      <RegisterModal
        visible={isRegisterModalVisible}
        onRegister={handleRegister}
        onCancel={() => setIsRegisterModalVisible(false)}
      />
      <HighScoresModal
        visible={isHighScoresModalVisible}
        onClose={() => setIsHighScoresModalVisible(false)}
      />
      <ThemedView style={styles.header}>
        <View style={styles.onlineButtonContainer}>
          <Button
            title="High Scores"
            onPress={() => setIsHighScoresModalVisible(true)}
          />
          {userToken ? (
            <View style={styles.loggedInContainer}>
              <ThemedText>Hi, {username}</ThemedText>
              <Button title="Logout" onPress={handleLogout} color="#ff5c5c" />
            </View>
          ) : (
            <Button
              title="Go Online"
              onPress={() => setIsRegisterModalVisible(true)}
            />
          )}
        </View>
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

            {/* Render exploding blocks */}
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
      <GameStartOverlay
        gameStarted={gameStarted}
        handleStartGame={handleStartGame}
      />
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
    backgroundColor: "transparent",
  },
  onlineButtonContainer: {
    position: "absolute",
    top: 60,
    right: PADDING,
    zIndex: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  loggedInContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
