import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TemaSaglayici, useRenk } from '../tema';

function Yigin() {
  const renk = useRenk();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: renk.zemin },
          headerTintColor: renk.yazi,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: renk.zemin },
        }}
      >
        <Stack.Screen name="index" options={{ title: '' }} />
        <Stack.Screen name="il/[id]" options={{ title: '' }} />
        <Stack.Screen name="oyun" options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="tema" options={{ title: 'Renk teması' }} />
      </Stack>
    </>
  );
}

export default function Duzen() {
  return (
    <TemaSaglayici>
      <Yigin />
    </TemaSaglayici>
  );
}
