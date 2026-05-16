import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

const AC = '#1aff6e'
const DIM = '#44445a'
const BG = '#06060a'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AC,
        tabBarInactiveTintColor: DIM,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
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
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stage-map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <Ionicons name="map-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="channels"
        options={{
          title: 'Canales',
          tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Manual',
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
