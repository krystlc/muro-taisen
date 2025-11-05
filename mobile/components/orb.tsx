import {
  vec,
  Skia,
  Group,
  Circle,
  Blur,
  RadialGradient,
  Path,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  useDerivedValue,
  Easing,
} from "react-native-reanimated";

export default function Orb({
  x,
  y,
  size,
  color,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const transform = useDerivedValue(() => {
    return [{ rotate: (rotation.value * Math.PI) / 180 }];
  });

  const center = vec(x + size / 2, y + size / 2);
  const radius = size / 2.5;

  const shinePath = Skia.Path.Make();
  shinePath.addArc(
    {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    },
    200,
    60,
  );

  return (
    <Group>
      {/* Glow Effect */}
      <Circle cx={center.x} cy={center.y} r={radius} color={color}>
        <Blur blur={10} />
      </Circle>

      {/* Spheroid Body */}
      <Circle cx={center.x} cy={center.y} r={radius}>
        <RadialGradient c={center} r={radius} colors={["#FFFFFF", color]} />
      </Circle>

      {/* Spinning Shine */}
      <Group origin={center} transform={transform}>
        <Path
          path={shinePath}
          style="stroke"
          strokeWidth={2}
          color="#FFFFFFCC"
        />
      </Group>
    </Group>
  );
}
