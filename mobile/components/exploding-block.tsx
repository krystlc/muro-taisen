import React, { useEffect } from "react";
import { Group, RoundedRect } from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { IBlock } from "@/models/block";

interface ExplodingBlockProps {
  block: IBlock;
  x: number;
  y: number;
  size: number;
  onAnimationComplete: () => void;
}

export const ExplodingBlock: React.FC<ExplodingBlockProps> = ({
  block,
  x,
  y,
  size,
  onAnimationComplete,
}) => {
  const progress = useSharedValue(0);
  const jiggle = useSharedValue(0);

  useEffect(() => {
    // Jiggle animation
    jiggle.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
      4,
      false,
    );

    // Fade out and scale up animation
    progress.value = withTiming(
      1,
      { duration: 300, easing: Easing.out(Easing.quad) },
      (isFinished) => {
        if (isFinished) {
          runOnJS(onAnimationComplete)();
        }
      },
    );
  }, [jiggle, onAnimationComplete, progress]);

  const transform = useDerivedValue(() => {
    const scale = 1 + progress.value * 0.5;
    return [
      { translateX: x + size / 2 },
      { translateY: y + size / 2 },
      { scale: scale },
      { translateX: -(x + size / 2) },
      { translateY: -(y + size / 2) },
      { translateX: jiggle.value },
    ];
  });

  const opacity = useDerivedValue(() => 1 - progress.value);

  return (
    <Group transform={transform} opacity={opacity}>
      <RoundedRect
        x={x}
        y={y}
        width={size}
        height={size}
        r={4}
        color={block.color}
      />
    </Group>
  );
};
