import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Mod, unvan } from '../../oyun/kurallar';
import { ilBul } from '../../veri/iller';
import { IlIlerleme, ilYuzdesi, ilerlemeYukle } from '../../veri/ilerleme';
import { Renkler, useRenk } from '../../tema';

export default function IlSayfasi() {
  const renk = useRenk();
  const s = useMemo(() => stiller(renk), [renk]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const il = ilBul(Number(id));
  const [ilerleme, setIlerleme] = useState<IlIlerleme | undefined>();

  useFocusEffect(
    useCallback(() => {
      if (il) ilerlemeYukle().then((x) => setIlerleme(x[il.id])).catch(() => {});
    }, [il]),
  );

  if (!il) return <Text style={{ padding: 16 }}>İl bulunamadı.</Text>;
  const y = ilYuzdesi(ilerleme, il.sorular.length);
  const basla = (mod: Mod) => router.push({ pathname: '/oyun', params: { il: String(il.id), mod } });

  return (
    <View style={s.sayfa}>
      <Stack.Screen options={{ title: il.ad }} />
      <View style={s.kart}>
        <Text style={s.yuzde}>%{y}</Text>
        <Text style={s.unvan}>{unvan(il.ad, y)}</Text>
        <View style={s.cubuk}><View style={[s.dolu, { width: `${y}%` }]} /></View>
        <Text style={s.alt}>{ilerleme?.bilinen ?? 0} / {il.sorular.length} soru bilindi · {ilerleme?.puan ?? 0} puan</Text>
      </View>

      {/* İki mod aynı görünümde: sol şeritli kart */}
      <Pressable style={({ pressed }) => [s.mod, pressed && s.basili]} onPress={() => basla('onluk')}>
        <Text style={s.modAd}>10 soruluk tur</Text>
        <Text style={s.modAcik}>Yanlış yapsan da 10 soru sürer</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [s.mod, pressed && s.basili]} onPress={() => basla('yanlisa_kadar')}>
        <Text style={s.modAd}>Yanlışa kadar</Text>
        <Text style={s.modAcik}>İlk yanlışta biter, {il.sorular.length} soruya kadar gider</Text>
      </Pressable>
      <Pressable onPress={() => router.push({ pathname: '/siralama', params: { il: String(il.id) } })}>
        <Text style={s.siralama}>{il.ad} sıralaması →</Text>
      </Pressable>
    </View>
  );
}

const stiller = (renk: Renkler) => StyleSheet.create({
  sayfa: { padding: 16, gap: 14 },
  kart: { backgroundColor: renk.kart, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: renk.cizgi },
  yuzde: { fontSize: 48, fontWeight: '800', color: renk.yazi },
  unvan: { fontSize: 18, fontWeight: '600', color: renk.ana, marginTop: 2 },
  cubuk: { height: 10, alignSelf: 'stretch', backgroundColor: renk.cizgi, borderRadius: 5, marginTop: 16, overflow: 'hidden' },
  dolu: { height: '100%', backgroundColor: renk.vurgu },
  alt: { fontSize: 13, color: renk.soluk, marginTop: 10 },
  mod: {
    backgroundColor: renk.kart, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: renk.cizgi,
    borderLeftWidth: 6, borderLeftColor: renk.vurgu,
  },
  modAd: { fontSize: 18, fontWeight: '700', color: renk.yazi },
  modAcik: { fontSize: 14, color: renk.soluk, marginTop: 4 },
  siralama: { textAlign: 'center', color: renk.ana, fontWeight: '700', fontSize: 16, marginTop: 4 },
  basili: { opacity: 0.8 },
});
