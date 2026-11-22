import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { liEki } from '../oyun/kurallar';
import { ILLER } from '../veri/iller';
import { Donem, IlIlerleme, SiraSatiri, ilYuzdesi, ilerlemeYukle, siralamaGetir } from '../veri/ilerleme';
import { Renkler, useRenk } from '../tema';

const DONEMLER: { id: Donem; ad: string }[] = [
  { id: 'tum', ad: 'Tüm zamanlar' },
  { id: 'ay', ad: 'Bu ay' },
  { id: 'hafta', ad: 'Bu hafta' },
];
const CUBUK_RENKLERI = ['#C8102E', '#1E6FD9', '#1E8E3E', '#E8A200', '#7B3FB8', '#0E8C8C'];

export default function Siralama() {
  const renk = useRenk();
  const s = useMemo(() => stiller(renk), [renk]);
  const p = useLocalSearchParams<{ il?: string }>();
  const [ilId, setIlId] = useState<number | null>(p.il ? Number(p.il) : null);
  const [donem, setDonem] = useState<Donem>('tum');
  const [satirlar, setSatirlar] = useState<SiraSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [illerim, setIllerim] = useState<Record<number, IlIlerleme>>({});

  useEffect(() => {
    let iptal = false;
    setSatirlar(null);
    siralamaGetir(ilId, donem)
      .then((x) => { if (!iptal) { setSatirlar(x); setHata(null); } })
      .catch(() => { if (!iptal) setHata('Sıralama yüklenemedi.'); });
    return () => { iptal = true; };
  }, [ilId, donem]);

  useEffect(() => { ilerlemeYukle().then(setIllerim).catch(() => {}); }, []);

  const ilAdi = ilId ? ILLER.find((i) => i.id === ilId)?.ad : null;
  const baslik = ilAdi
    ? donem === 'hafta' ? `Haftanın ${ilAdi}${liEki(ilAdi)}s${liEki(ilAdi).slice(1)}` : `${ilAdi} sıralaması`
    : 'Türkiye sıralaması';

  return (
    <FlatList
      contentContainerStyle={s.sayfa}
      data={satirlar ?? []}
      keyExtractor={(r) => `${r.sira}-${r.kullanici_adi}`}
      ListHeaderComponent={
        <View style={{ gap: 12 }}>
          <Stack.Screen options={{ title: 'Sıralama' }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Secim ad="Türkiye" secili={ilId === null} onPress={() => setIlId(null)} />
            {ILLER.map((il) => (
              <Secim key={il.id} ad={il.ad} secili={ilId === il.id} onPress={() => setIlId(il.id)} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DONEMLER.map((d) => (
              <Secim key={d.id} ad={d.ad} secili={donem === d.id} onPress={() => setDonem(d.id)} kucuk />
            ))}
          </View>

          {ilId === null && (
            <View style={s.kart}>
              <Text style={s.altBaslik}>İllerim</Text>
              {ILLER.map((il, i) => (
                <IlCubugu key={il.id} ad={il.ad} y={ilYuzdesi(illerim[il.id], il.sorular.length)}
                  renk={CUBUK_RENKLERI[i % CUBUK_RENKLERI.length]} />
              ))}
            </View>
          )}

          <Text style={s.baslik}>{baslik}</Text>
          {hata && <Text style={s.hata}>{hata}</Text>}
          {satirlar === null && !hata && <Text style={s.soluk}>Yükleniyor…</Text>}
          {satirlar?.length === 0 && <Text style={s.soluk}>Bu dönemde henüz puan alan yok.</Text>}
        </View>
      }
      renderItem={({ item: r }) => (
        <View style={[s.satir, r.ben && s.benSatir]}>
          <Text style={[s.sira, r.sira <= 3 && s.ilkUc]}>{r.sira === 1 && donem !== 'tum' ? '👑' : r.sira}</Text>
          <Text style={[s.ad, r.ben && { fontWeight: '800' }]} numberOfLines={1}>{r.kullanici_adi}{r.ben ? ' (sen)' : ''}</Text>
          <Text style={s.puan}>{r.puan}</Text>
        </View>
      )}
    />
  );
}

function Secim(p: { ad: string; secili: boolean; onPress: () => void; kucuk?: boolean }) {
  const renk = useRenk();
  const s = useMemo(() => stiller(renk), [renk]);
  return (
    <Pressable onPress={p.onPress} style={[s.secim, p.secili && s.seciliSecim, p.kucuk && { flex: 1 }]}>
      <Text style={[s.secimYazi, p.secili && { color: renk.anaYazi }]}>{p.ad}</Text>
    </Pressable>
  );
}

function IlCubugu(p: { ad: string; y: number; renk: string }) {
  const s = stiller(useRenk());
  const g = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(g, { toValue: p.y, duration: 900, useNativeDriver: false }).start();
  }, [p.y]);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.cubukAd}>{p.ad}</Text>
        <Text style={s.cubukAd}>%{p.y}</Text>
      </View>
      <View style={s.cubuk}>
        <Animated.View style={{
          height: '100%', backgroundColor: p.renk, borderRadius: 6,
          width: g.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }} />
      </View>
    </View>
  );
}

const stiller = (renk: Renkler) => StyleSheet.create({
  sayfa: { padding: 16, gap: 8 },
  secim: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: renk.kart, borderWidth: 1, borderColor: renk.cizgi, alignItems: 'center' },
  seciliSecim: { backgroundColor: renk.ana, borderColor: renk.ana },
  secimYazi: { color: renk.yazi, fontWeight: '600', fontSize: 14 },
  kart: { backgroundColor: renk.kart, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: renk.cizgi },
  altBaslik: { fontSize: 16, fontWeight: '700', color: renk.yazi },
  cubukAd: { fontSize: 13, color: renk.ana, fontWeight: '600' },
  cubuk: { height: 12, backgroundColor: renk.cizgi, borderRadius: 6, marginTop: 4, overflow: 'hidden' },
  baslik: { fontSize: 20, fontWeight: '800', color: renk.yazi, marginTop: 4 },
  hata: { color: renk.yanlis },
  soluk: { color: renk.soluk },
  satir: { flexDirection: 'row', alignItems: 'center', backgroundColor: renk.kart, borderRadius: 10, padding: 12, gap: 12, borderWidth: 1, borderColor: renk.cizgi },
  benSatir: { borderColor: renk.vurgu, borderWidth: 2 },
  sira: { width: 32, fontSize: 16, fontWeight: '700', color: renk.soluk, textAlign: 'center' },
  ilkUc: { color: renk.baslik ?? renk.vurgu },
  ad: { flex: 1, fontSize: 16, color: renk.yazi },
  puan: { fontSize: 16, fontWeight: '800', color: renk.yazi },
});
