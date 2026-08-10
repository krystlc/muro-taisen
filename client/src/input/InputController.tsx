import React from ".pnpm/@types+react@19.1.17/node_modules/@types/react";
import { View, Platform, StyleSheet } from "react-native";
import { useKeyboardInput } from "./useKeyboardInput";
import { useTouchGestures } from "./useTouchGestures";
import { GameEngine } from "../core/engine/GameEngine";
import { GameAction } from "../hooks/useGameServer";

interface InputControllerProps {
  engineRef: React.RefObject<GameEngine>;
  enabled: boolean;
  children: React.ReactNode;
  onAction?: (type: GameAction) => void;
}

export function InputController({
  engineRef,
  enabled,
  children,
  onAction,
}: InputControllerProps) {
  // Hook up web listeners if running on web
  useKeyboardInput(engineRef, Platform.OS === "web" && enabled, onAction);

  // Get touch pan responders for mobile
  const panResponder = useTouchGestures(
    engineRef,
    Platform.OS !== "web" && enabled,
    onAction,
  );

  return (
    <View
      style={styles.container}
      {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
});
