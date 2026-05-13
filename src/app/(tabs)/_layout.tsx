import { TabIcon } from '@components/ui/TabIcon'
import { Tabs } from 'expo-router'
import { useColorScheme } from 'react-native'

export default function TabLayout() {
  const scheme = useColorScheme()
  const accent = '#C00020'
  const inactive = scheme === 'dark' ? '#555550' : '#9b9b98'
  const bg = scheme === 'dark' ? '#111110' : '#ffffff'
  const border = scheme === 'dark' ? '#2a2a28' : '#e8e8e4'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stage-map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <TabIcon name="map-2" color={color} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <TabIcon name="adjustments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Canales',
          tabBarIcon: ({ color }) => <TabIcon name="playlist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Manual',
          tabBarIcon: ({ color }) => <TabIcon name="file-text" color={color} />,
        }}
      />
    </Tabs>
  )
}
