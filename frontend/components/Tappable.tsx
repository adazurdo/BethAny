import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TappableProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

// Thin Pressable wrapper that adds a springy press-down/release scale to any interactive
// element (pills, buttons, cards) — the app-wide "more animation" pass leans on this one
// primitive instead of hand-rolling a transform per component.
//
// `style` MUST stay a plain array here, never a function: Animated.createAnimatedComponent
// doesn't understand Pressable's "style as a function of {pressed}" convention, and silently
// drops every style in the array (border, background, padding...) if it receives one — that
// was the bug behind cards rendering with no visible box at all.
export function Tappable({ style, scaleTo = 0.94, onPressIn, onPressOut, children, ...rest }: TappableProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        scale.value = withSpring(scaleTo, { damping: 16, stiffness: 320 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        onPressOut?.(event);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default Tappable;
