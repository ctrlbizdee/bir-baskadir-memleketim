import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Değerler proje kökündeki .env dosyasından gelir (.env.example'a bakın).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anahtar = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseAyarliMi = url !== '' && anahtar !== '';

export const supabase = createClient(url || 'http://localhost', anahtar || 'yok', {
  auth: {
    storage: AsyncStorage,
    persistSession: true,      // kullanıcı çıkış yapmadıkça oturum açık kalır
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Uygulama ön plandayken oturum yenilemesi çalışsın
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (durum) => {
    if (durum === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
