import React, { useState } from "react";
import { Modal, StyleSheet, TextInput, View } from "react-native";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import { Button } from "@react-navigation/elements";

type Props = {
  visible: boolean;
  onRegister: (username: string) => void;
  onCancel: () => void;
};

export default function RegisterModal({
  visible,
  onRegister,
  onCancel,
}: Props) {
  const [username, setUsername] = useState("");

  const handleRegister = () => {
    if (username.trim().length >= 3) {
      onRegister(username.trim());
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.centeredView}>
        <ThemedView style={styles.modalView}>
          <ThemedText type="subtitle">Enter Online Nickname</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Username (min 3 chars)"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <View style={styles.buttonContainer}>
            <Button onPress={onCancel} variant="plain">
              Cancel
            </Button>
            <Button onPress={handleRegister} variant="filled">
              Register
            </Button>
          </View>
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
    padding: 35,
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
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    width: 200,
    color: "white", // Assuming dark theme
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    gap: 20,
  },
});
