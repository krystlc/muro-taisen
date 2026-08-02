import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useKeyboardInput } from './useKeyboardInput';
import { useTouchGestures } from './useTouchGestures';
import { GameEngine } from '@/core/engine/GameEngine';

interface InputControllerProps {
  engineRef: React.RefObject<GameEngine>;
  enabled: boolean;
  children: React.ReactNode;
}

export function InputController({ engineRef, enabled, children }: InputControllerProps) {
  // Hook up web listeners if running on web
  useKeyboardInput(engineRef, Platform.OS === 'web' && enabled);

  // Get touch pan responders for mobile
  const panResponder = useTouchGestures(engineRef, Platform.OS !== 'web' && enabled);

  return (
    <View style={styles.container} {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
