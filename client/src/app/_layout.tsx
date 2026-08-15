import { Stack } from "expo-router";
import { GameServerProvider } from "../contexts/GameServerContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as Sentry from "@sentry/react-native";
// ... (rest of imports)

function RootLayout() {
  return (
    <SafeAreaProvider>
      <GameServerProvider>
        <Stack
          screenOptions={{
            animation: "fade",
            contentStyle: { backgroundColor: "#080b14" },
            headerShown: false,
          }}
        />
      </GameServerProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
