import { Link } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View, Alert } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import RegisterModal from "@/components/register-modal";
import HighScoresModal from "@/components/high-scores-modal";
import AvatarButton from "@/components/avatar-button";
import BottomDrawer from "@/components/bottom-drawer";
import { Image } from "expo-image";
import { Button } from "@react-navigation/elements";
import { useProvideAuth } from "@/hooks/use-api";

export default function StartScreen() {
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [isHighScoresModalVisible, setIsHighScoresModalVisible] =
    useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const { user, token, register, logout } = useProvideAuth();

  const handleRegister = async (username: string) => {
    const result = await register(username);
    if (!result.success) {
      Alert.alert("Registration Failed", result.error);
    }
    setIsRegisterModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <RegisterModal
        visible={isRegisterModalVisible}
        onRegister={handleRegister}
        onCancel={() => setIsRegisterModalVisible(false)}
      />
      <HighScoresModal
        visible={isHighScoresModalVisible}
        onClose={() => setIsHighScoresModalVisible(false)}
      />
      <BottomDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
      >
        <ThemedText type="subtitle">Hi, {user?.username}</ThemedText>
        <Button onPress={logout}>Logout</Button>
      </BottomDrawer>

      {token && (
        <View style={styles.avatarContainer}>
          <AvatarButton onPress={() => setIsDrawerVisible(true)} />
        </View>
      )}

      <Image source={require("@/assets/images/icon.png")} style={styles.logo} />

      <View style={styles.menuContainer}>
        <Link href="/game" asChild>
          <Button variant="filled">Start New Game</Button>
        </Link>
        <Button onPress={() => setIsHighScoresModalVisible(true)}>
          High Scores
        </Button>
        {!token && (
          <Button onPress={() => setIsRegisterModalVisible(true)}>
            Login / Register
          </Button>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
  },
  menuContainer: {
    gap: 15,
    width: "60%",
  },
  avatarContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    zIndex: 10,
  },
  logo: {
    width: 360,
    aspectRatio: 1,
  },
});
