import { ThemedView } from "../themed-view";
import { ThemedText } from "@/components/themed-text";
import NextPiecePreview from "@/components/next-piece-preview";
import AvatarButton from "@/components/avatar-button";
import BottomDrawer from "@/components/bottom-drawer";
import GameStats from "@/components/game-stats";
import { Button } from "@react-navigation/elements";
import { useState } from "react";
import { useAuth } from "@/hooks/auth-context";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { GameEngine } from "@/core/gameEngine";

type Props = {
  gameState: Pick<
    GameEngine,
    "level" | "totalBlocksCleared" | "score" | "nextPiece"
  >;
};

const HEADER_HEIGHT = 280; // Approximate height of the parallax header

export default function GameHeader({ gameState }: Props) {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <BottomDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
      >
        <ThemedText type="subtitle">Hi, {user?.username}</ThemedText>
        <Button onPress={logout} color="#ff5c5c">
          Logout
        </Button>
      </BottomDrawer>

      <View style={styles.menu}>
        <Button
          onPress={() => router.back()}
          style={styles.backButtonContainer}
        >
          Back
        </Button>
        {token && <AvatarButton onPress={() => setIsDrawerVisible(true)} />}
      </View>
      <View style={styles.main}>
        <View style={styles.players}>
          <View style={styles.player1}>
            <Image
              source={require("@/assets/characters/badhombre/neutral.png")}
              style={styles.character}
            />
            <ThemedText type="subtitle" style={styles.playerName}>
              {user ? user?.username : "Player 1"}
            </ThemedText>
          </View>
          <View style={styles.stats}>
            <NextPiecePreview nextPiece={gameState.nextPiece} />
            <GameStats
              level={gameState.level}
              score={gameState.score}
              totalBlocksCleared={gameState.totalBlocksCleared}
            />
          </View>
          <View style={styles.player2}>
            <Image
              source={require("@/assets/characters/badhombre/neutral.png")}
              style={styles.character}
            />
            <ThemedText type="subtitle" style={styles.playerName}>
              CPU
            </ThemedText>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
  },
  main: {},
  backButtonContainer: {
    alignSelf: "flex-start",
  },
  menu: {
    top: 60,
    zIndex: 10,
    position: "absolute",
  },
  players: {
    flexDirection: "row",
  },
  player1: {
    width: "50%",
    position: "relative",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  player2: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  playerName: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "black",
  },
  stats: {
    width: 80,
    paddingTop: 60,
  },
  character: {
    height: HEADER_HEIGHT,
    left: 0,
    right: 0,
    position: "absolute",
  },
});
