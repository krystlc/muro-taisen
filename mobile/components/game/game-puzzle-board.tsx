import { ThemedView, ThemedViewProps } from "../themed-view";
import {
  Group,
  RoundedRect,
  Canvas,
  Rect,
  CanvasProps,
} from "@shopify/react-native-skia";
import { ComposedGesture, GestureDetector } from "react-native-gesture-handler";
import { ExplodingBlock } from "@/components/exploding-block";
import { Fragment, JSX } from "react";
import { GRID_HEIGHT, GRID_WIDTH } from "@/core/shared";
import { IGameState } from "@/core/gameEngine";
import { IBlock } from "@/models/block";

const PADDING = 20;
const TILE_SIZE = 48;
const BOARD_HEIGHT = TILE_SIZE * GRID_HEIGHT;
const BOARD_WIDTH = TILE_SIZE * GRID_WIDTH;
const X_OFFSET = PADDING;
const Y_OFFSET = PADDING;

export type AnimatingBlock = {
  id: string;
  block: IBlock;
  row: number;
  col: number;
};

type Props = {
  gameState: IGameState;
  composedGesture: ComposedGesture;
  animatingBlocks: AnimatingBlock[];
  onBlockAnimationComplete: (id: string) => void;
  renderBlock: (block: IBlock, row: number, col: number) => JSX.Element | null;
  themedViewProps: ThemedViewProps;
  canvasProps: CanvasProps;
};

export default function GamePuzzleBoard({
  composedGesture,
  gameState,
  animatingBlocks,
  onBlockAnimationComplete,
  renderBlock,
  themedViewProps,
  canvasProps,
}: Props) {
  return (
    <ThemedView {...themedViewProps}>
      <GestureDetector gesture={composedGesture}>
        <Canvas {...canvasProps}>
          <Rect
            x={X_OFFSET}
            y={Y_OFFSET}
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            color="#1A1A1A"
          />
          {gameState.grid.map((rowArr, row) =>
            rowArr.map((block, col) => {
              if (block.isLinked) return null;
              return renderBlock(block, row, col);
            }),
          )}
          {gameState.linkedRects.map((rect) => (
            <Group key={`rect-${rect.r}-${rect.c}`}>
              <RoundedRect
                x={X_OFFSET + rect.c * TILE_SIZE}
                y={Y_OFFSET + rect.r * TILE_SIZE}
                width={rect.w * TILE_SIZE}
                height={rect.h * TILE_SIZE}
                r={8}
                color={rect.color}
              />
              <RoundedRect
                x={X_OFFSET + rect.c * TILE_SIZE + 2}
                y={Y_OFFSET + rect.r * TILE_SIZE + 2}
                width={rect.w * TILE_SIZE - 4}
                height={rect.h * TILE_SIZE - 4}
                r={6}
                style="stroke"
                strokeWidth={3}
                color="white"
              />
            </Group>
          ))}
          {gameState.currentPiece && (
            <Fragment>
              {renderBlock(
                gameState.currentPiece.blockA,
                gameState.currentPiece.rowA,
                gameState.currentPiece.colA,
              )}
              {renderBlock(
                gameState.currentPiece.blockB,
                gameState.currentPiece.rowB,
                gameState.currentPiece.colB,
              )}
            </Fragment>
          )}
          {animatingBlocks.map((b) => (
            <ExplodingBlock
              key={b.id}
              block={b.block}
              x={X_OFFSET + b.col * TILE_SIZE}
              y={Y_OFFSET + b.row * TILE_SIZE}
              size={TILE_SIZE}
              onAnimationComplete={() => onBlockAnimationComplete(b.id)}
            />
          ))}
        </Canvas>
      </GestureDetector>
    </ThemedView>
  );
}
