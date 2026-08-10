import { StyleSheet, Text, View } from "react-native";
import { GemType } from "@/core/models/Gem";

interface GemCellProps {
  gem: any; // Replace with your exact Gem interface
  size?: number; // Allows scaling down for the mini-board
}

export function GemCell({ gem, size = 30 }: GemCellProps) {
  if (!gem) {
    return <View style={[styles.cell, { width: size, height: size }]} />;
  }

  const isFrozen = gem.type === GemType.COUNTER;
  const isExploding = gem.type === GemType.CRASH;
  const isPowerGem = !!gem.powerGemId && !isFrozen;

  return (
    <View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: getGemColor(gem.color) },
        isExploding && styles.explodingCell,
        isFrozen && styles.frozenCell,
        isPowerGem && styles.powerGemCell,
      ]}
    >
      {isFrozen && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{gem.counterValue}</Text>
        </View>
      )}
      {isPowerGem && <View style={styles.powerGemCore} />}
      {isExploding && <View style={styles.explodingCore} />}
    </View>
  );
}

function getGemColor(colorStr: string): string {
  const colors: Record<string, string> = {
    RED: "#ff3366",
    BLUE: "#00e5ff",
    GREEN: "#00ff66",
    YELLOW: "#ffcc00",
  };
  return colors[colorStr] || "#334155";
}

const styles = StyleSheet.create({
  cell: {
    margin: 1,
    backgroundColor: "rgba(19, 27, 46, 0.5)", // Transparent for the bridge background
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  explodingCell: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  explodingCore: {
    flex: 1,
    margin: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  frozenCell: {
    borderColor: "#00e5ff",
    borderWidth: 2,
    opacity: 0.85,
  },
  counterBadge: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  counterText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },
  powerGemCell: {
    borderColor: "#ffffff",
    borderWidth: 1.5,
  },
  powerGemCore: {
    flex: 1,
    margin: 3,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 2,
  },
});
