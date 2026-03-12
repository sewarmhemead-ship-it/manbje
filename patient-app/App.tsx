import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { MainTabs } from './navigation/MainTabs';
import { setOnUnauthorized } from './services/api';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { ready, token, patient, login, logout } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(true);

  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashText}>مركز العلاج الفيزيائي</Text>
      </View>
    );
  }

  if (!token || !patient) {
    return (
      <LoginScreen
        login={login}
        onSuccess={() => {}}
      />
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#22d3ee',
          background: '#06080e',
          card: '#0b0f1a',
          text: '#dde6f5',
          border: 'rgba(255,255,255,0.06)',
          notification: '#f87171',
        },
      }}
    >
      <MainTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#06080e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    color: '#dde6f5',
    fontSize: 20,
  },
});
