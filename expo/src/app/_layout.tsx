import { Stack } from 'expo-router';
import { GameServerProvider } from '../contexts/GameServerContext';

export default function RootLayout() {
  return (
    <GameServerProvider>
      <Stack
        screenOptions={{
          animation: 'fade',
          contentStyle: { backgroundColor: '#080b14' },
          headerShown: false,
        }}
      />
    </GameServerProvider>
  );
}
