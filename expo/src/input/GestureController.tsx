import React from 'react';
import { View } from 'react-native';
import { GameEngine } from '../core/engine/GameEngine';
// Assume using react-native-gesture-handler

interface GestureProps {
  engine: GameEngine;
  children: React.ReactNode;
}

/**
 * @agent_instruction
 * Implement mobile puzzle controls:
 * - Swipe Left/Right: queues 'MOVE_LEFT' / 'MOVE_RIGHT'
 * - Swipe Down: queues 'HARD_DROP' or 'SOFT_DROP'
 * - Tap: queues 'ROTATE_CW'
 * Pass these actions directly to `engine.queueInput()`.
 */
export function GestureController({ engine, children }: GestureProps) {
  // TODO: Agent to set up PanGestureHandler and TapGestureHandler

  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
}
