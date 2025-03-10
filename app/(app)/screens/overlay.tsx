import { Canvas, DiffRect, rect, rrect } from "@shopify/react-native-skia";
import { Dimensions, Platform, StyleSheet, View } from "react-native";

const { width, height } = Dimensions.get("window");
const innerDimension = 300;

export const Overlay = () => {
  // Skip rendering Skia components during static generation
  if (Platform.OS === "web" && typeof window === "undefined") {
    return <View style={StyleSheet.absoluteFillObject} />;
  }

  // Create shapes inside the component function
  const outer = rrect(rect(0, 0, width, height), 0, 0);
  const inner = rrect(
    rect(
      width / 2 - innerDimension / 2,
      height / 2 - innerDimension / 2,
      innerDimension,
      innerDimension
    ),
    50,
    50
  );

  return (
    <Canvas
      style={
        Platform.OS === "android" ? { flex: 1 } : StyleSheet.absoluteFillObject
      }
    >
      <DiffRect inner={inner} outer={outer} color="black" opacity={0.5} />
    </Canvas>
  );
};
