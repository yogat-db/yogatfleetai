import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && segments[0] === '(auth)') {
        router.replace('/(tabs)');
      } else if (!session && segments[0] !== '(auth)') {
        router.replace('/(auth)/login');
      }
      setIsLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session && segments[0] === '(auth)') {
        router.replace('/(tabs)');
      } else if (!session && segments[0] !== '(auth)') {
        router.replace('/(auth)/login');
      }
    });
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return <Slot />;
}