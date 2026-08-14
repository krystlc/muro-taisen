import { Stack } from "expo-router";
import { GameServerProvider } from "../contexts/GameServerContext";

import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://486a9141514262e9129e8017893040f1@o4511911256915968.ingest.us.sentry.io/4511911273758720',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function RootLayout() {
  return (
    <GameServerProvider>
      <Stack
        screenOptions={{
          animation: "fade",
          contentStyle: { backgroundColor: "#080b14" },
          headerShown: false,
        }}
      />
    </GameServerProvider>
  );
}

export default Sentry.wrap(RootLayout)
