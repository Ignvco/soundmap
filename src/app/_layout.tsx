// ═══════════════════════════════════════════════════════════
// FILE: src/app/_layout.tsx
// ═══════════════════════════════════════════════════════════
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#06060a' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="room-scan/index"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Room Scan',
            headerStyle: { backgroundColor: '#06060a' },
            headerTintColor: '#f0f0f0',
            headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          }}
        />
        <Stack.Screen
          name="scenes/index"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Escenarios guardados',
            headerStyle: { backgroundColor: '#06060a' },
            headerTintColor: '#f0f0f0',
            headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          }}
        />
        <Stack.Screen
          name="troubleshoot/index"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Troubleshooting',
            headerStyle: { backgroundColor: '#06060a' },
            headerTintColor: '#f0f0f0',
            headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          }}
        />
      </Stack>
    </>
  )
}

// ═══════════════════════════════════════════════════════════
// FILE: src/app/(tabs)/_layout.tsx
// ═══════════════════════════════════════════════════════════
/*
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const AC  = '#1aff6e'
const DIM = '#44445a'
const BG  = '#06060a'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   AC,
        tabBarInactiveTintColor: DIM,
        tabBarStyle: {
          backgroundColor:  BG,
          borderTopColor:   'rgba(255,255,255,0.07)',
          borderTopWidth:   0.5,
          height:           60,
          paddingBottom:    8,
          paddingTop:       4,
        },
        tabBarLabelStyle: {
          fontSize:      9,
          fontWeight:    '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Inicio',  tabBarIcon: ({ color }) => <Ionicons name="home-outline"          size={22} color={color} /> }} />
      <Tabs.Screen name="stage-map"  options={{ title: 'Mapa',    tabBarIcon: ({ color }) => <Ionicons name="map-outline"           size={22} color={color} /> }} />
      <Tabs.Screen name="config"     options={{ title: 'Config',  tabBarIcon: ({ color }) => <Ionicons name="settings-outline"      size={22} color={color} /> }} />
      <Tabs.Screen name="channels"   options={{ title: 'Canales', tabBarIcon: ({ color }) => <Ionicons name="list-outline"          size={22} color={color} /> }} />
      <Tabs.Screen name="export"     options={{ title: 'Manual',  tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={22} color={color} /> }} />
    </Tabs>
  )
}
*/
