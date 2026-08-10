import React, { createContext, useContext } from "react";
import { useGameServer } from "../hooks/useGameServer";

const GameServerContext = createContext<ReturnType<
  typeof useGameServer
> | null>(null);

export const GameServerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
    throw new Error(
      "useGameServerContext must be used within a GameServerProvider",
    );
  }
  return context;
};
