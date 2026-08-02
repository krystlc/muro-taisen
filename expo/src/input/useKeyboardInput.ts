import { GameEngine } from '@/core/engine/GameEngine';
import { useEffect } from 'react';

export function useKeyboardInput(engineRef: React.RefObject<GameEngine>, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowLeft':
          engineRef.current.queueInput('MOVE_LEFT');
          break;
        case 'ArrowRight':
          engineRef.current.queueInput('MOVE_RIGHT');
          break;
        case 'ArrowDown':
          engineRef.current.queueInput('SOFT_DROP');
          break;
        case 'ArrowUp':
          engineRef.current.queueInput('ROTATE_CW');
          break;
        case 'Space':
          e.preventDefault(); // Prevent page scroll
          engineRef.current.queueInput('HARD_DROP');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineRef, enabled]);
}
