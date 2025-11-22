import React, { useEffect } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Button,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import { useHighScores } from "@/hooks/use-api";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function HighScoresModal({ visible, onClose }: Props) {
  const { scores, loading, error, fetchHighScores } = useHighScores();

  useEffect(() => {
    if (visible) {
      fetchHighScores();
    }
  }, [visible, fetchHighScores]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <ThemedView style={styles.modalView}>
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
              style={{ width: "100%" }}
            />
          )}
          <Button title="Close" onPress={onClose} />
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 15,
    width: "80%",
    maxHeight: "80%",
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
