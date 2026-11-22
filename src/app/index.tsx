import { Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Baslik } from '../bilesenler/Baslik';
import { unvan } from '../oyun/kurallar';
import { ILLER } from '../veri/iller';
import { cikisYap, kullaniciAdiAl, useOturum } from '../veri/hesap';
import { IlIlerleme, ilYuzdesi, ilerlemeYukle } from '../veri/ilerleme';
import { Renkler, useRenk } from '../tema';

export default function Iller() {
  const renk = useRenk();
  const s = useMemo(() => stiller(renk), [renk]);
  const oturum = useOturum();
  const [ilerleme, setIlerleme] = useState<Record<number, IlIlerleme>>({});
  const [hata, setHata] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!oturum) return;
      let iptal = false;
      ilerlemeYukle()
        .then((x) => { if (!iptal) { setIlerleme(x); setHata(null); } })
        .catch(() => { if (!iptal) setHata('İlerleme yüklenemedi.'); });
      return () => { iptal = true; };
    }, [oturum]),
  );

  if (oturum === undefined) return null;
  if (oturum === null) return <Redirect href="/giris" />;

  function rastgele() {
    // Az oynanan illere öncelik
    const enAz = Math.min(...ILLER.map((il) => ilerleme[il.id]?.oyunSayisi ?? 0));
    const adaylar = ILLER.filter((il) => (ilerleme[il.id]?.oyunSayisi ?? 0) === enAz);
    router.push(`/il/${adaylar[Math.floor(Math.random() * adaylar.length)].id}`);
  }

  return (
    <>
      <Stack.Screen options={{
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 14, paddingRight: 12 }}>
            <Pressable onPress={() => router.push('/tema')}><Text style={s.ustDugme}>Renk</Text></Pressable>
            <Pressable onPress={() => router.push('/siralama')}><Text style={s.ustDugme}>Sıralama</Text></Pressable>
            <Pressable onPress={cikisYap}><Text style={s.ustDugme}>Çıkış</Text></Pressable>
          </View>
        ),
      }} />
      <FlatList
        contentContainerStyle={s.liste}
        data={ILLER}
        keyExtractor={(il) => String(il.id)}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Baslik />
            <Text style={s.selam}>Merhaba {kullaniciAdiAl(oturum)}</Text>
            {hata && <Text style={s.hata}>{hata}</Text>}
            <Pressable style={({ pressed }) => [s.rastgele, pressed && s.basili]} onPress={rastgele}>
              <Text style={s.rastgeleYazi}>Rastgele oyna</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: il }) => {
          const y = ilYuzdesi(ilerleme[il.id], il.sorular.length);
          return (
            <View style={s.kart}>
              <View style={{ flex: 1 }}>
                <Text style={s.ilAd}>{il.ad}</Text>
                <Text style={s.tanitim}>{il.tanitim}</Text>
                <Text style={s.durum}>%{y} · {unvan(il.ad, y)}</Text>
              </View>
              <Pressable style={({ pressed }) => [s.oyna, pressed && s.basili]} onPress={() => router.push(`/il/${il.id}`)}>
                <Text style={s.oynaYazi}>Oyna</Text>
              </Pressable>
            </View>
          );
        }}
      />
    </>
  );
}

const stiller = (renk: Renkler) => StyleSheet.create({
  liste: { padding: 16, gap: 12 },
  ustDugme: { color: renk.ana, fontWeight: '700', fontSize: 15 },
  uygulamaAdi: { fontSize: 34, fontWeight: '900', color: renk.baslik ?? renk.vurgu, lineHeight: 38 },
  selam: { fontSize: 16, color: renk.soluk },
  hata: { color: renk.yanlis },
  rastgele: { backgroundColor: renk.vurgu, borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 4 },
  rastgeleYazi: { color: renk.vurguYazi, fontSize: 18, fontWeight: '700' },
  kart: {
    backgroundColor: renk.kart, borderRadius: 14, padding: 16, flexDirection: 'row',
    alignItems: 'center', gap: 12, borderWidth: 1, borderColor: renk.cizgi,
  },
  ilAd: { fontSize: 18, fontWeight: '700', color: renk.yazi },
  tanitim: { fontSize: 14, color: renk.soluk, marginTop: 2 },
  durum: { fontSize: 13, color: renk.ana, marginTop: 6 },
  oyna: { backgroundColor: renk.ana, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18 },
  oynaYazi: { color: renk.anaYazi, fontWeight: '700', fontSize: 15 },
  basili: { opacity: 0.8 },
});
