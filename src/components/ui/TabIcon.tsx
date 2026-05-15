import { Ionicons } from '@expo/vector-icons';
import React from 'react';

type IconName = 'home' | 'map' | 'settings' | 'list' | 'file'

const ICON_MAP: Record<IconName, string> = {
  home: 'home-outline',
  map: 'map-outline',
  settings: 'settings-outline',
  list: 'list-outline',
  file: 'document-text-outline',
}

interface Props {
  name: IconName
  color: string
  size?: number
}

export function TabIcon({ name, color, size = 22 }: Props) {
  return <Ionicons name={ICON_MAP[name] as any} size={size} color={color} />
}
