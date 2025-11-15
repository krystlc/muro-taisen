import React from "react";
import { Canvas, Group, RoundedRect } from "@shopify/react-native-skia";
import { IFallingPiece } from "@/models/shape";
import { BlockType } from "@/models/block";
import Orb from "./orb";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

const PREVIEW_SIZE = 100;
const TILE_SIZE = 40;

interface NextPiecePreviewProps {
  nextPiece: IFallingPiece | null;
}

const NextPiecePreview: React.FC<NextPiecePreviewProps> = ({ nextPiece }) => {
  const renderBlock = (
    block: IFallingPiece["blockA"] | IFallingPiece["blockB"],
    row: number,
    col: number,
  ) => {
    if (!block) return null;

    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;

    if (block.type === BlockType.ORB) {
      return <Orb x={x} y={y} size={TILE_SIZE} color={block.color} />;
    }

    return (
      <Group>
        <RoundedRect
          x={x}
          y={y}
          width={TILE_SIZE}
          height={TILE_SIZE}
          r={4}
          color={block.color}
        />
        <RoundedRect
          x={x + 1}
          y={y + 1}
          width={TILE_SIZE - 2}
          height={TILE_SIZE - 2}
          r={3}
          color={block.color}
          style="stroke"
          strokeWidth={1}
        />
      </Group>
    );
  };

  return (
    <ThemedView
      style={{
        position: "absolute",
        bottom: 20,
        left: 20,
        borderWidth: 1,
        borderColor: "#aaa",
        borderRadius: 20,
        zIndex: 10,
      }}
    >
      <ThemedText style={{ paddingLeft: 10 }}>Next:</ThemedText>
      <Canvas style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}>
        {nextPiece && (
          <Group transform={[{ translateX: 10 }, { translateY: 10 }]}>
            {renderBlock(nextPiece.blockA, 0, 0)}
            {renderBlock(nextPiece.blockB, 1, 0)}
          </Group>
        )}
      </Canvas>
    </ThemedView>
  );
};

export default NextPiecePreview;
