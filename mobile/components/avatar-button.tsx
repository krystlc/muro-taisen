import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";

type Props = {
  onPress: () => void;
};

export default function AvatarButton({ onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <ThemedText style={styles.icon}>👤</ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#888",
    borderWidth: 1,
  },
  icon: {
    fontSize: 24,
  },
});
