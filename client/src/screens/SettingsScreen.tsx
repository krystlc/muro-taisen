import { useState, useEffect } from "react";
import { StyleSheet, TextInput, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { ScreenShell, GameButton } from "../components/game-ui";

export default function SettingsScreen() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem("username").then((name) => {
      if (name) setUsername(name);
    });
  }, []);

  const saveUsername = async () => {
    await AsyncStorage.setItem("username", username);
    router.back();
  };

  return (
    <ScreenShell title="SETTINGS" onBack={() => router.back()}>
      <View style={styles.content}>
        <Text style={styles.label}>DISPLAY NAME</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter name..."
          placeholderTextColor="#8491a8"
        />
        <GameButton label="SAVE CHANGES" onPress={saveUsername} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 20 },
  label: { color: "#fff", fontWeight: "bold" },
  input: {
    backgroundColor: "#111827",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
});
