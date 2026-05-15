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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="room-scan/index"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Room Scan',
            headerStyle: { backgroundColor: '#06060a' },
            headerTintColor: '#f0f0f0',
            headerTitleStyle: { fontWeight: '700' },
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
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
      </Stack>
    </>
  )
}
