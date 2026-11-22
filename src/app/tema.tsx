import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Renkler, TemaAdi, TEMALAR, useTema } from '../tema';

export default function TemaSecimi() {
  const { tema, renk, temaSec } = useTema();
  const s = useMemo(() => stiller(renk), [renk]);

  return (
    <ScrollView contentContainerStyle={s.sayfa}>
      <Text style={s.aciklama}>Uygulamanın renklerini seç. Seçimin hesabına kaydedilir.</Text>
      {(Object.keys(TEMALAR) as TemaAdi[]).map((ad) => {
        const t = TEMALAR[ad];
        const secili = ad === tema;
        return (
          <Pressable key={ad} onPress={() => temaSec(ad)}
            style={({ pressed }) => [s.kart, { backgroundColor: t.renk.zemin, borderColor: secili ? t.renk.ana : t.renk.cizgi }, secili && s.secili, pressed && { opacity: 0.85 }]}>
            <View style={s.ornekler}>
              <View style={[s.ornek, { backgroundColor: t.renk.vurgu }]} />
              <View style={[s.ornek, { backgroundColor: t.renk.ana }]} />
              <View style={[s.ornek, { backgroundColor: t.renk.kart, borderWidth: 1, borderColor: t.renk.cizgi }]} />
            </View>
            <Text style={[s.ad, { color: t.renk.yazi }]}>{t.ad}</Text>
            {secili && <Text style={[s.tik, { color: t.renk.ana }]}>✓</Text>}
          </Pressable>
        );
      })}
      <Pressable style={s.dugme} onPress={() => router.back()}>
        <Text style={s.dugmeYazi}>Tamam</Text>
      </Pressable>
    </ScrollView>
  );
}

const stiller = (renk: Renkler) => StyleSheet.create({
  sayfa: { padding: 16, gap: 12 },
  aciklama: { color: renk.soluk, fontSize: 15, marginBottom: 4 },
  kart: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  secili: { borderWidth: 3 },
  ornekler: { flexDirection: 'row', gap: 6 },
  ornek: { width: 26, height: 26, borderRadius: 13 },
  ad: { flex: 1, fontSize: 17, fontWeight: '700' },
  tik: { fontSize: 22, fontWeight: '900' },
  dugme: { backgroundColor: renk.vurgu, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  dugmeYazi: { color: renk.vurguYazi, fontSize: 17, fontWeight: '700' },
});
