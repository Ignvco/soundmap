import { TabIcon } from '@components/ui/TabIcon';
import { Tabs } from 'expo-router';

const AC = '#1aff6e'
const DIM = '#44445a'
const BG = '#06060a'
const BR = 'rgba(255,255,255,0.07)'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AC,
        tabBarInactiveTintColor: DIM,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: BR,
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
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
          tabBarIcon: ({ color }) => <TabIcon name="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <TabIcon name="settings" color={color} />,
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Canales',
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Manual',
          tabBarIcon: ({ color }) => <TabIcon name="file" color={color} />,
        }}
      />
    </Tabs>
  )
}
