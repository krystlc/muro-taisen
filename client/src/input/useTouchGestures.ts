import { GameEngine } from "../core/engine/GameEngine";
import { useRef, useEffect } from "react";
import { PanResponder } from "react-native";
import { GameAction } from "../hooks/useGameServer";

export function useTouchGestures(
  engineRef: React.RefObject<GameEngine>,
  enabled: boolean,
  onAction?: (action: GameAction) => void,
) {
  // Use a ref to keep track of the current enabled state dynamically
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const startTimeRef = useRef<number>(0);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabledRef.current,
      onMoveShouldSetPanResponder: () => enabledRef.current,
      onPanResponderGrant: (e, gestureState) => {
        startTimeRef.current = Date.now();
        startPosRef.current = { x: gestureState.x0, y: gestureState.y0 };
      },
      onPanResponderMove: (e, gestureState) => {
        if (!enabledRef.current) return;
        const { dx, dy } = gestureState;

        // Use a threshold to distinguish a deliberate drag from accidental jitter
        const DRAG_THRESHOLD = 20;

        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
              engineRef.current?.queueInput("MOVE_RIGHT");
              onAction?.({ type: "MOVE", payload: { direction: "RIGHT" } });
            } else {
              engineRef.current?.queueInput("MOVE_LEFT");
              onAction?.({ type: "MOVE", payload: { direction: "LEFT" } });
            }
            gestureState.dx = 0; // Reset for continuous movement
          } else if (dy > DRAG_THRESHOLD) {
            engineRef.current?.queueInput("SOFT_DROP");
            onAction?.({ type: "DROP", payload: { type: "SOFT" } });
            gestureState.dy = 0;
          }
        }
      },
      onPanResponderRelease: (e, gestureState) => {
        if (!enabledRef.current) return;

        const duration = Date.now() - startTimeRef.current;
        const { dx, dy } = gestureState;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Relaxed thresholds: 300ms duration, 30 distance units for tap detection
        if (duration < 300 && dist < 30) {
          engineRef.current?.queueInput("ROTATE_CW");
          onAction?.({ type: "ROTATE" });
        } else if (dy > 80) {
          engineRef.current?.queueInput("HARD_DROP");
          onAction?.({ type: "DROP", payload: { type: "HARD" } });
        }
      },
    }),
  ).current;

  return panResponder;
}
