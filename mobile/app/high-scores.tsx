import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Button,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useHighScores } from "@/hooks/use-api";

export default function HighScoresScreen() {
  const { scores, loading, error, fetchHighScores } = useHighScores();
  const router = useRouter();

  useEffect(() => {
    fetchHighScores();
  }, [fetchHighScores]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">High Scores</ThemedText>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <ThemedText>{error}</ThemedText>
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.scoreItem}>
              <ThemedText>
                {index + 1}. {item.username}
              </ThemedText>
              <ThemedText>{item.score}</ThemedText>
            </View>
          )}
          style={styles.list}
        />
      )}
      <Button title="Back to Menu" onPress={() => router.back()} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  list: {
    width: "80%",
  },
  scoreItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
});
