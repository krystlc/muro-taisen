import { GameEngine } from '@/core/engine/GameEngine';
import { useEffect } from 'react';

export function useKeyboardInput(engineRef: React.RefObject<GameEngine>, enabled: boolean, onAction?: (type: 'DROP' | 'ROTATE' | 'MOVE') => void) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          engineRef.current?.queueInput('MOVE_LEFT');
          onAction?.({ type: 'MOVE', payload: { direction: 'LEFT' } });
          break;
        case 'ArrowRight':
          engineRef.current?.queueInput('MOVE_RIGHT');
          onAction?.({ type: 'MOVE', payload: { direction: 'RIGHT' } });
          break;
        case 'ArrowDown':
          engineRef.current?.queueInput('SOFT_DROP');
          break;
        case 'ArrowUp':
          engineRef.current?.queueInput('ROTATE_CW');
          onAction?.('ROTATE');
          break;
        case 'Space':
          e.preventDefault();
          engineRef.current?.queueInput('HARD_DROP');
          onAction?.('DROP');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineRef, enabled, onAction]);
}
