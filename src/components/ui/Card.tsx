import { Colors, ColorsDark, Radius, Spacing } from "@/constants/theme";
import React from "react";
import { View, ViewStyle, useColorScheme } from "react-native";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "accent" | "success" | "warning";
}

export function Card({ children, style, variant = "default" }: CardProps) {
  const scheme = useColorScheme();
  const C = scheme === "dark" ? ColorsDark : Colors;

  const variantStyles: Record<string, ViewStyle> = {
    default: { backgroundColor: C.background, borderColor: C.border },
    accent: { backgroundColor: C.accentBg, borderColor: C.accentBorder },
    success: { backgroundColor: C.successBg, borderColor: C.success + "44" },
    warning: { backgroundColor: C.warningBg, borderColor: C.warning + "44" },
  };

  return (
    <View
      style={[
        {
          borderRadius: Radius.md,
          borderWidth: 0.5,
          overflow: "hidden",
          marginBottom: Spacing.md,
        },
        variantStyles[variant],
        style,
      ]}
    >
      {children}
    </View>
  );
}
