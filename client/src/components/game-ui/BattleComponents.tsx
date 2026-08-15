import { StyleSheet, Text, View } from "react-native";
import { memo } from "react";
import { GemCell } from "./GemCell";
import { BOARD_ROWS } from "../../core/engine/Board";
import { ActivePiece } from "../../core/engine/GameEngine";

// --- LEFT COLUMN: NEXT PIECE ---
export function NextPiecePanel({ nextPiece }: { nextPiece: ActivePiece }) {
  return (
    <View style={styles.sidePanel}>
      <Text style={styles.panelTitle}>NEXT</Text>
      <View style={styles.nextBox}>
        {nextPiece.gems.map((gem, i) => (
          <GemCell
            key={i}
            gem={{ color: gem.color, type: gem.type }}
            size={35}
          />
        ))}
      </View>
    </View>
  );
}

// --- CENTER COLUMN: MAIN BOARD ---
export const MainBoard = memo(
  ({ displayGrid }: { displayGrid: any[][] }) => {
    return (
      <View style={styles.mainBoardContainer}>
        {/* The grid lines mimicking the screenshot */}
        <View style={styles.gridOverlay} />

        {displayGrid
          .slice()
          .reverse()
          .map((row, rIndex) => {
            const actualRowIndex = BOARD_ROWS - 1 - rIndex;
            return (
              <View key={`row-${actualRowIndex}`} style={styles.row}>
                {row.map((gem, cIndex) => (
                  <GemCell
                    key={`cell-${actualRowIndex}-${cIndex}`}
                    gem={gem}
                    size={32}
                  />
                ))}
              </View>
            );
          })}
      </View>
    );
  },
  (prevProps, nextProps) => prevProps.displayGrid === nextProps.displayGrid,
);
MainBoard.displayName = "MainBoard";

// --- RIGHT COLUMN: MINI BOARD ---
export const OpponentMiniBoard = memo(
  ({ opponentGrid }: { opponentGrid: any[][] }) => {
    return (
      <View style={styles.sidePanel}>
        {/* Assuming the "1" in the screenshot is a level/multiplier */}
        <View style={styles.levelBox}>
          <Text style={styles.levelText}>1</Text>
        </View>
        <View style={styles.miniBoardContainer}>
          {opponentGrid
            .slice()
            .reverse()
            .map((row, rIndex) => (
              <View key={`mini-row-${rIndex}`} style={styles.row}>
                {row.map((gem, cIndex) => (
                  <GemCell
                    key={`mini-cell-${rIndex}-${cIndex}`}
                    gem={gem}
                    size={12}
                  />
                ))}
              </View>
            ))}
        </View>
      </View>
    );
  },
  (prevProps, nextProps) => prevProps.opponentGrid === nextProps.opponentGrid,
);
OpponentMiniBoard.displayName = "OpponentMiniBoard";

const styles = StyleSheet.create({
  sidePanel: {
    width: 100, // Slightly narrower so the main board has room
    alignItems: "center",
    paddingTop: 10, // Bring them closer to the VS bar
  },
  nextBox: {
    padding: 2, // Tighter wrap around the gems
    borderRadius: 6,
    borderWidth: 2, // Thicker border like the reference
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
  },
  levelBox: {
    width: 45,
    height: 45,
    backgroundColor: "#990000", // Deeper arcade red
    borderColor: "#ff3333",
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  panelTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },
  levelText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  mainBoardContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 20,
    position: "relative",
  },
  miniBoardContainer: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
});
