import { Dimensions, StyleSheet, View } from "react-native";
import {
  Canvas,
  Rect,
  Fill,
  Circle,
  Text,
  useFont,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { GameEngine } from "@/core/gameEngine";
import { GRID_WIDTH, GRID_HEIGHT } from "@/core/shared";
import { BlockType, IBlock } from "@/models/block";
import React, { Fragment, useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSharedValue } from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";

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

export default function GameScreen() {
  const [, setTick] = useState(0);
  const isLoopRunning = useSharedValue(false);
  const lastMoveX = useSharedValue(0);
  const TILE_THRESHOLD = TILE_SIZE / 2;

  // --- Shared values for thread-safe communication ---
  const wantsToRotate = useSharedValue(false);
  const moveDirection = useSharedValue<"left" | "right" | "none">("none");

  // --- Game Loop ---
  useFocusEffect(
    useCallback(() => {
      isLoopRunning.value = true;
      if (engine.isPieceLocked) {
        engine.spawnPiece();
      }

      let lastGravityTick = 0;
      const gameLoop = (now: number) => {
        if (!isLoopRunning.value) return;

        // --- Stop loop on Game Over ---
        if (engine.isGameOver) {
          isLoopRunning.value = false;
          setTick((t) => t + 1); // Final render for game over text
          return;
        }

        // --- Process Inputs (every frame) ---
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
            engine.spawnPiece();
          } else {
            engine.gravityTick();
          }
        }

        // --- Render ---
        setTick((t) => t + 1);
        requestAnimationFrame(gameLoop);
      };

      requestAnimationFrame(gameLoop);

      return () => {
        isLoopRunning.value = false;
      };
    }, []),
  );

  // --- Gestures (UI thread work only) ---
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      const deltaX = e.translationX - lastMoveX.value;
      if (Math.abs(deltaX) > TILE_THRESHOLD) {
        moveDirection.value = deltaX > 0 ? "right" : "left";
        lastMoveX.value = e.translationX;
      }
    })
    .onEnd(() => {
      lastMoveX.value = 0;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    wantsToRotate.value = true;
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // --- Rendering ---
  const renderBlock = useCallback((block: IBlock, row: number, col: number) => {
    if (block.type === BlockType.EMPTY || row < 0) return null;

    const x = X_OFFSET + col * TILE_SIZE;
    const y = Y_OFFSET + row * TILE_SIZE;

    return (
      <Fragment key={`${row}-${col}`}>
        <Rect
          x={x}
          y={y}
          width={TILE_SIZE}
          height={TILE_SIZE}
          color={block.color}
        />
        {block.type === BlockType.ORB && (
          <Circle
            cx={x + TILE_SIZE / 2}
            cy={y + TILE_SIZE / 2}
            r={TILE_SIZE / 4}
            color="white"
          />
        )}
      </Fragment>
    );
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {engine.isGameOver && <ThemedText>GAME OVER</ThemedText>}
        <GestureDetector gesture={composedGesture}>
          <Canvas style={styles.canvas}>
            <Fill color="#303030" />
            <Rect
              x={X_OFFSET}
              y={Y_OFFSET}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              color="#1A1A1A"
            />
            {engine.gameState.map((rowArr, row) =>
              rowArr.map((block, col) => renderBlock(block, row, col)),
            )}
            {engine.currentPiece && (
              <>
                {renderBlock(
                  engine.currentPiece.blockA,
                  engine.currentPiece.rowA,
                  engine.currentPiece.colA,
                )}
                {renderBlock(
                  engine.currentPiece.blockB,
                  engine.currentPiece.rowB,
                  engine.currentPiece.colB,
                )}
              </>
            )}
          </Canvas>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
    alignItems: "center",
    justifyContent: "center",
  },
  canvas: {
    width: BOARD_WIDTH + PADDING * 2,
    height: BOARD_HEIGHT + PADDING * 2,
  },
});
