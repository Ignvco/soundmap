import React from "react";
import { Text } from "react-native";

interface TabIconProps {
  name: string;
  color: string;
}

const ICONS: Record<string, string> = {
  home: "⌂",
  "map-2": "⊞",
  adjustments: "⚙",
  playlist: "≡",
  "file-text": "📄",
};

export function TabIcon({ name, color }: TabIconProps) {
  return <Text style={{ fontSize: 20, color }}>{ICONS[name] ?? "●"}</Text>;
}
