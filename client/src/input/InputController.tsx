import React from "react";
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

  // Enable touch gestures on non-web, or if on web and touch is supported
  const isWeb = Platform.OS === "web";
  const touchSupported =
    isWeb &&
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const panResponder = useTouchGestures(
    engineRef,
    (Platform.OS !== "web" || touchSupported) && enabled,
    onAction,
  );

  return (
    <View
      style={styles.container}
      {...(Platform.OS !== "web" || touchSupported
        ? panResponder.panHandlers
        : {})}
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
