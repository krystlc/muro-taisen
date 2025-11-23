import React from "react";
import { Canvas, Group, RoundedRect } from "@shopify/react-native-skia";
import { IFallingPiece } from "@/models/shape";
import { BlockType } from "@/models/block";
import Orb from "./orb";
import { ThemedView } from "./themed-view";

const TILE_SIZE = 24;

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
        alignSelf: "flex-start",
        marginLeft: 16,
        borderWidth: 1,
        borderColor: "#aaa",
        backgroundColor: "#000000aa",
        borderRadius: 8,
        zIndex: 10,
      }}
    >
      <Canvas style={{ width: TILE_SIZE * 2 - 8, height: TILE_SIZE * 3 - 8 }}>
        {nextPiece && (
          <Group transform={[{ translateX: 8 }, { translateY: 8 }]}>
            {renderBlock(nextPiece.blockA, 0, 0)}
            {renderBlock(nextPiece.blockB, 1, 0)}
          </Group>
        )}
      </Canvas>
    </ThemedView>
  );
};

export default NextPiecePreview;
