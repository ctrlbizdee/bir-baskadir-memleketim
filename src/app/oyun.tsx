import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Durum, Mod, SORU_SURESI_SN, Soru, bulunmaEki, liEki, onlukSec, siklariHazirla, tamlayanEki, unvan,
  yanlisaKadarSec, yeniIsaretiGosterilsinMi, yuzde,
} from '../oyun/kurallar';
import { ilBul } from '../veri/iller';
import { VITRIN } from '../veri/vitrin';
import { cevapGonder, durumlariYukle, oyunBaslat, oyunBitir } from '../veri/ilerleme';
import { Renkler, useRenk } from '../tema';

type Asama = 'yukleniyor' | 'soru' | 'gonderiliyor' | 'cevap' | 'bitti' | 'hata';
const CEVAP_GOSTERME_MS = 1300;
const YENI_SORU_NOTU_ESIGI = 70; // yüzde

function bilinenSayisi(d: Map<number, Durum>) {
  let n = 0;
  d.forEach((x) => { if (x === 'dogru') n++; });
  return n;
}

export default function Oyun() {
  const renk = useRenk();
  const s = useMemo(() => stiller(renk), [renk]);
  const p = useLocalSearchParams<{ il: string; mod: Mod; vitrin?: string }>();
  const il = ilBul(Number(p.il))!;
  const mod: Mod = p.mod === 'yanlisa_kadar' ? 'yanlisa_kadar' : 'onluk';

  const oyunId = useRef<number | null>(null);
  const cikildi = useRef(false);
  const durumlar = useRef<Map<number, Durum>>(new Map());
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [baslangicYuzde, setBaslangicYuzde] = useState(0);
  const [gorulmusler, setGorulmusler] = useState<Set<number>>(new Set());
  const [sira, setSira] = useState(0);
  const [siklar, setSiklar] = useState<string[]>([]);
  const [secilen, setSecilen] = useState<string | null>(null);
  const [kalan, setKalan] = useState(SORU_SURESI_SN);
  const [asama, setAsama] = useState<Asama>('yukleniyor');
  const [seri, setSeri] = useState(0);
  const [turPuani, setTurPuani] = useState(0);
  const [dogruSayisi, setDogruSayisi] = useState(0);
  const [cevaplanan, setCevaplanan] = useState(0);
  const [bonusYazi, setBonusYazi] = useState('');
  const [yeniNot, setYeniNot] = useState('');
  const bonusAnim = useRef(new Animated.Value(0)).current;

  // Turu hazırla
  useEffect(() => {
    (async () => {
      try {
        const d = await durumlariYukle(il.id);
        durumlar.current = d;
        oyunId.current = await oyunBaslat(il.id, mod);
        const secim = mod === 'onluk' ? onlukSec(il.sorular, d) : yanlisaKadarSec(il.sorular);
        setBaslangicYuzde(yuzde(bilinenSayisi(d), il.sorular.length));
        setGorulmusler(new Set(d.keys()));
        setSorular(secim);
        setSiklar(siklariHazirla(secim[0]));
        if (VITRIN && p.vitrin === 'sonuc') {
          // Mağaza görüntüsü için örnek bir tur sonu
          for (let no = 42; no <= 44; no++) d.set(il.id * 1000 + no, 'dogru');
          setDogruSayisi(8);
          setCevaplanan(10);
          setTurPuani(31);
          setAsama('bitti');
          return;
        }
        if (VITRIN && p.vitrin === 'cevap') {
          setSecilen(secim[0].dogru);
          setSeri(4);
          setTurPuani(12);
          setKalan(6);
          setAsama('cevap');
          return;
        }
        setAsama('soru');
      } catch {
        setAsama('hata');
      }
    })();
  }, []);

  // Geri sayım
  useEffect(() => {
    if (asama !== 'soru') return;
    if (kalan <= 0) { cevapla(null); return; }
    const t = setTimeout(() => setKalan((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [asama, kalan]);

  // Kullanıcı turu istediği an bitirebilir; o ana kadarki puan ve ilerleme kayıtlıdır.
  function turuBitir() {
    cikildi.current = true;
    if (oyunId.current !== null) oyunBitir(oyunId.current);
    setAsama('bitti');
  }

  function bonusGoster(yazi: string) {
    setBonusYazi(yazi);
    bonusAnim.setValue(0);
    Animated.timing(bonusAnim, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
  }

  async function cevapla(sik: string | null) {
    if (asama !== 'soru' || oyunId.current === null) return;
    const soru = sorular[sira];
    setSecilen(sik);
    setAsama('gonderiliyor');
    let sonuc;
    try {
      sonuc = await cevapGonder(oyunId.current, soru.id, sik);
    } catch {
      setAsama('hata');
      return;
    }
    const oncekiYuzde = yuzde(bilinenSayisi(durumlar.current), il.sorular.length);
    durumlar.current.set(soru.id, sonuc.dogru ? 'dogru' : 'yanlis');
    setSeri(sonuc.seri);
    setTurPuani((x) => x + sonuc.puan + sonuc.bonus);
    if (sonuc.dogru) setDogruSayisi((x) => x + 1);
    setCevaplanan((x) => x + 1);
    // %70'ten sonra ilk kez bilinen her soru için küçük bir not
    setYeniNot(oncekiYuzde >= YENI_SORU_NOTU_ESIGI && sonuc.puan > 0 ? `Yeni soru bildin! +${sonuc.puan} puan` : '');
    if (sonuc.bonus > 0) bonusGoster(`Seri ${sonuc.seri}! +${sonuc.bonus}`);
    else if (sonuc.puan > 0) bonusGoster(`+${sonuc.puan}`);
    setAsama('cevap');

    setTimeout(() => {
      if (cikildi.current) return;
      const son = sira + 1 >= sorular.length || (mod === 'yanlisa_kadar' && !sonuc.dogru);
      if (son) {
        if (oyunId.current !== null) oyunBitir(oyunId.current);
        setAsama('bitti');
        return;
      }
      setSira(sira + 1);
      setSiklar(siklariHazirla(sorular[sira + 1]));
      setSecilen(null);
      setYeniNot('');
      setKalan(SORU_SURESI_SN);
      setAsama('soru');
    }, CEVAP_GOSTERME_MS);
  }

  if (asama === 'yukleniyor') return <View style={s.sayfa}><Text style={s.ustYazi}>Hazırlanıyor…</Text></View>;

  if (asama === 'hata') {
    return (
      <View style={[s.sayfa, { justifyContent: 'center' }]}>
        <Text style={[s.mesaj, { color: renk.yanlis }]}>Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.</Text>
        <Pressable style={[s.dugme, { backgroundColor: renk.ana }]} onPress={() => router.dismissTo('/')}>
          <Text style={s.dugmeYazi}>İllere dön</Text>
        </Pressable>
      </View>
    );
  }

  if (asama === 'bitti') {
    const sonYuzde = yuzde(bilinenSayisi(durumlar.current), il.sorular.length);
    const artis = sonYuzde - baslangicYuzde;
    const mesaj = artis > 0
      ? `Bu turda yüzde ${artis} daha ${il.ad}${liEki(il.ad)} oldun!`
      : dogruSayisi >= sorular.length / 2 || mod === 'yanlisa_kadar'
        ? `${il.ad}${bulunmaEki(il.ad)} iyi gidiyorsun. Bir tur daha mı, yoksa başka bir ile mi bakalım?`
        : 'Olsun, bir dahaki tura daha iyisi!';
    const gorulmeyen = il.sorular.length - durumlar.current.size;
    const gorulmeMesaji = gorulmeyen > 0
      ? `${il.ad}${bulunmaEki(il.ad)} daha görmediğin ${gorulmeyen} soru var. Devam et!`
      : `Tebrikler! ${il.ad}${tamlayanEki(il.ad)} bütün sorularını gördün 🎉` +
        (sonYuzde < 100 ? ' Şimdi hepsini bilme zamanı.' : '');
    return (
      <View style={[s.sayfa, { justifyContent: 'center' }]}>
        <View style={s.sonucKart}>
          <Text style={s.sonucBaslik}>{mod === 'onluk' ? 'Tur bitti' : `Seri: ${dogruSayisi}`}</Text>
          <Text style={s.sonucPuan}>+{turPuani} puan</Text>
          <Text style={s.sonucSatir}>{dogruSayisi} / {cevaplanan} doğru</Text>
          <Text style={s.sonucSatir}>%{baslangicYuzde} → %{sonYuzde}</Text>
          <Text style={s.sonucUnvan}>{unvan(il.ad, sonYuzde)}</Text>
          <Text style={s.mesaj}>{mesaj}</Text>
          <Text style={s.gorulmedi}>{gorulmeMesaji}</Text>
        </View>
        <Pressable style={[s.dugme, { backgroundColor: renk.vurgu }]}
          onPress={() => router.replace({ pathname: '/oyun', params: { il: String(il.id), mod } })}>
          <Text style={[s.dugmeYazi, { color: renk.vurguYazi }]}>Bir tur daha</Text>
        </Pressable>
        <Pressable style={[s.dugme, { backgroundColor: renk.ana }]} onPress={() => router.dismissTo('/')}>
          <Text style={s.dugmeYazi}>İllere dön</Text>
        </Pressable>
      </View>
    );
  }

  const soru = sorular[sira];
  const yeni = yeniIsaretiGosterilsinMi(baslangicYuzde) && !gorulmusler.has(soru.id);
  const cevapta = asama === 'cevap';

  return (
    <View style={s.sayfa}>
      <View style={s.ust}>
        <Text style={s.ustYazi}>{il.ad} · {sira + 1}{mod === 'onluk' ? ` / ${sorular.length}` : ''}</Text>
        <Text style={s.ustYazi}>Seri {seri} · {turPuani} puan</Text>
      </View>
      <Pressable onPress={turuBitir} hitSlop={10} style={s.cikis}>
        <Text style={s.cikisYazi}>✕ Turu bitir</Text>
      </Pressable>
      <View style={s.sure}><View style={[s.sureDolu, { width: `${(kalan / SORU_SURESI_SN) * 100}%` }]} /></View>
      <Text style={s.kalan}>{kalan} sn</Text>

      <View style={s.soruKart}>
        {yeni && <Text style={s.yeni}>YENİ</Text>}
        <Text style={s.soru}>{soru.soru}</Text>
      </View>

      {siklar.map((sik) => {
        const stil = cevapta && sik === soru.dogru ? s.sikDogru
          : cevapta && sik === secilen ? s.sikYanlis
            : asama === 'gonderiliyor' && sik === secilen ? s.sikSecili : null;
        return (
          <Pressable key={sik} disabled={asama !== 'soru'} onPress={() => cevapla(sik)}
            style={({ pressed }) => [s.sik, stil, pressed && { opacity: 0.8 }]}>
            <Text style={[s.sikYazi, stil && { color: '#fff' }]}>{sik}</Text>
          </Pressable>
        );
      })}
      {cevapta && secilen === null && <Text style={s.sureDoldu}>Süre doldu</Text>}
      {cevapta && yeniNot !== '' && <Text style={s.yeniNot}>{yeniNot}</Text>}

      {bonusYazi !== '' && (
        <Animated.Text pointerEvents="none" style={[s.bonus, {
          opacity: bonusAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [{ translateY: bonusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -120] }) }],
        }]}>{bonusYazi}</Animated.Text>
      )}
    </View>
  );
}

const stiller = (renk: Renkler) => StyleSheet.create({
  sayfa: { flex: 1, padding: 16, gap: 12 },
  ust: { flexDirection: 'row', justifyContent: 'space-between' },
  ustYazi: { color: renk.soluk, fontSize: 14, fontWeight: '600' },
  cikis: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: renk.cizgi, backgroundColor: renk.kart, marginTop: -4 },
  cikisYazi: { color: renk.soluk, fontSize: 13, fontWeight: '700' },
  sure: { height: 8, backgroundColor: renk.cizgi, borderRadius: 4, overflow: 'hidden' },
  sureDolu: { height: '100%', backgroundColor: renk.vurgu },
  kalan: { alignSelf: 'flex-end', color: renk.soluk, fontSize: 13, marginTop: -6 },
  soruKart: { backgroundColor: renk.kart, borderRadius: 16, padding: 20, minHeight: 140, justifyContent: 'center', borderWidth: 1, borderColor: renk.cizgi },
  yeni: { position: 'absolute', top: 10, right: 12, backgroundColor: renk.yeni, color: '#fff', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  soru: { fontSize: 20, fontWeight: '700', color: renk.yazi, lineHeight: 28 },
  sik: { backgroundColor: renk.kart, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: renk.cizgi },
  sikYazi: { fontSize: 17, color: renk.yazi },
  sikSecili: { backgroundColor: renk.ana, borderColor: renk.ana },
  sikDogru: { backgroundColor: renk.dogru, borderColor: renk.dogru },
  sikYanlis: { backgroundColor: renk.yanlis, borderColor: renk.yanlis },
  sureDoldu: { textAlign: 'center', color: renk.yanlis, fontWeight: '700' },
  yeniNot: { alignSelf: 'center', backgroundColor: renk.yeni, color: '#fff', fontWeight: '800', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  gorulmedi: { fontSize: 15, color: renk.yazi, textAlign: 'center', marginTop: 4, fontWeight: '600' },
  bonus: { position: 'absolute', alignSelf: 'center', top: '45%', fontSize: 34, fontWeight: '900', color: renk.yeni },
  sonucKart: { backgroundColor: renk.kart, borderRadius: 16, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: renk.cizgi },
  sonucBaslik: { fontSize: 22, fontWeight: '800', color: renk.yazi },
  sonucPuan: { fontSize: 40, fontWeight: '900', color: renk.baslik ?? renk.vurgu },
  sonucSatir: { fontSize: 16, color: renk.ana },
  sonucUnvan: { fontSize: 18, fontWeight: '700', color: renk.yazi, marginTop: 6 },
  mesaj: { fontSize: 15, color: renk.soluk, textAlign: 'center', marginTop: 8 },
  dugme: { borderRadius: 12, padding: 16, alignItems: 'center' },
  dugmeYazi: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
