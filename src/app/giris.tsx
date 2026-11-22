import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Baslik } from '../bilesenler/Baslik';
import { girisYap, kayitOl } from '../veri/hesap';
import { supabaseAyarliMi } from '../veri/supabase';
import { Renkler, useRenk } from '../tema';

export default function Giris() {
  const renk = useRenk();
  const s = useMemo(() => stiller(renk), [renk]);
  const [kayit, setKayit] = useState(false);
  const [ad, setAd] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder() {
    setHata(null);
    setBekliyor(true);
    const h = kayit ? await kayitOl(ad.trim(), sifre) : await girisYap(ad.trim(), sifre);
    setBekliyor(false);
    if (h) { setHata(h); return; }
    if (kayit) {
      setBasari(`Kayıt başarılı! Hoş geldin ${ad.trim()}.`);
      setTimeout(() => router.replace('/'), 1500);
    } else {
      router.replace('/');
    }
  }

  return (
    <View style={s.sayfa}>
      <Stack.Screen options={{ title: '', headerBackVisible: false }} />
      <View style={{ marginBottom: 24 }}><Baslik buyuk /></View>
      <Text style={s.baslik}>{kayit ? 'Kayıt ol' : 'Giriş yap'}</Text>

      {!supabaseAyarliMi && (
        <Text style={s.uyari}>Sunucu ayarları eksik (.env). Giriş ve kayıt çalışmaz.</Text>
      )}

      <TextInput style={s.girdi} placeholder="Kullanıcı adı" autoCapitalize="none" autoCorrect={false}
        value={ad} onChangeText={setAd} maxLength={20} />
      <TextInput style={s.girdi} placeholder="Şifre (4 karakter)" secureTextEntry autoCapitalize="none"
        value={sifre} onChangeText={setSifre} maxLength={4} onSubmitEditing={gonder} />

      {hata && <Text style={s.hata}>{hata}</Text>}
      {basari && <Text style={s.basari}>{basari}</Text>}

      <Pressable style={({ pressed }) => [s.dugme, pressed && { opacity: 0.8 }]} onPress={gonder} disabled={bekliyor || !!basari}>
        {bekliyor ? <ActivityIndicator color={renk.vurguYazi} /> : <Text style={s.dugmeYazi}>{kayit ? 'Kayıt ol' : 'Giriş yap'}</Text>}
      </Pressable>

      <Pressable onPress={() => { setKayit(!kayit); setHata(null); }}>
        <Text style={s.gecis}>{kayit ? 'Hesabın var mı? Giriş yap' : 'Hesabın yok mu? Kayıt ol'}</Text>
      </Pressable>
    </View>
  );
}

const stiller = (renk: Renkler) => StyleSheet.create({
  sayfa: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  uygulamaAdi: { fontSize: 38, fontWeight: '900', color: renk.baslik ?? renk.vurgu, lineHeight: 42, marginBottom: 24 },
  baslik: { fontSize: 26, fontWeight: '800', color: renk.yazi, marginBottom: 8 },
  uyari: { backgroundColor: '#FFF4D6', color: '#7A5600', padding: 10, borderRadius: 8 },
  girdi: { backgroundColor: renk.kart, borderWidth: 1, borderColor: renk.cizgi, borderRadius: 12, padding: 14, fontSize: 17 },
  hata: { color: renk.yanlis, fontWeight: '600' },
  basari: { color: renk.dogru, fontWeight: '700', fontSize: 16 },
  dugme: { backgroundColor: renk.vurgu, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  dugmeYazi: { color: renk.vurguYazi, fontSize: 17, fontWeight: '700' },
  gecis: { textAlign: 'center', color: renk.ana, marginTop: 8, fontWeight: '600' },
});
