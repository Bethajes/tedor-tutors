import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api, storage } from './src/api';
import { AuthNavigator } from './src/screens';
import { homeScreenFor, type Screen, type Session } from './src/session';

export default function App() {
  const [booted, setBooted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'login' });

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const publicUser = await api.me();
        if (!cancelled) {
          setSession({ user: publicUser, screen: homeScreenFor(publicUser) });
        }
      } catch {
        await storage.clear();
      } finally {
        if (!cancelled) setBooted(true);
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAuthed(next: Session) {
    setSession(next);
    setScreen(homeScreenFor(next.user));
  }

  function handleLogout() {
    setSession(null);
    setScreen({ name: 'login' });
  }

  if (!booted) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <AuthNavigator
          screen={screen}
          session={session}
          onNavigate={setScreen}
          onAuthed={handleAuthed}
          onLogout={handleLogout}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});