import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useGameServer, GameAction } from '../hooks/useGameServer';

const GameServerContext = createContext<ReturnType<typeof useGameServer> | null>(null);

export const GameServerProvider = ({ children }: { children: React.ReactNode }) => {
  const gameServer = useGameServer();
  return (
    <GameServerContext.Provider value={gameServer}>
      {children}
    </GameServerContext.Provider>
  );
};

export const useGameServerContext = () => {
  const context = useContext(GameServerContext);
  if (!context) {
    throw new Error('useGameServerContext must be used within a GameServerProvider');
  }
  return context;
};
