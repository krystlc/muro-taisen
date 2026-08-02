import { GameEngine } from '@/core/engine/GameEngine';
import { useRef } from 'react';
import { PanResponder } from 'react-native';

export function useTouchGestures(engineRef: React.RefObject<GameEngine>, enabled: boolean) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onPanResponderRelease: (e, gestureState) => {
        const { dx, dy, vx } = gestureState;

        // Differentiate taps vs swipes
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          // Tap to rotate
          engineRef.current.queueInput('ROTATE_CW');
          return;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 30) {
            engineRef.current.queueInput('MOVE_RIGHT');
          } else if (dx < -30) {
            engineRef.current.queueInput('MOVE_LEFT');
          }
        } else {
          if (dy > 50) {
            engineRef.current.queueInput('HARD_DROP');
          } else if (dy > 20) {
            engineRef.current.queueInput('SOFT_DROP');
          }
        }
      },
    })
  ).current;

  return panResponder;
}
