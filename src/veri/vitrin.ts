// Vitrin modu: mağaza ekran görüntüleri için örnek verilerle, hesapsız çalışır.
// Yalnızca EXPO_PUBLIC_VITRIN=1 ile açılır; yayındaki uygulamada kapalıdır.
import type { Durum } from '../oyun/kurallar';

export const VITRIN = process.env.EXPO_PUBLIC_VITRIN === '1';

export const VITRIN_KULLANICI = 'memleket_sever';

// İl bazında bilinen soru sayısı (50 üzerinden)
const BILINEN: Record<number, number> = { 35: 41, 3: 33, 6: 24, 34: 18, 7: 12, 27: 9, 42: 6 };

export function vitrinIlerleme() {
  const sonuc: Record<number, { bilinen: number; puan: number; oyunSayisi: number }> = {};
  for (const [id, b] of Object.entries(BILINEN)) {
    sonuc[Number(id)] = { bilinen: b, puan: b * 2 + 35, oyunSayisi: Math.ceil(b / 4) };
  }
  return sonuc;
}

export function vitrinDurumlar(ilId: number): Map<number, Durum> {
  const m = new Map<number, Durum>();
  const b = BILINEN[ilId] ?? 0;
  for (let no = 1; no <= b; no++) m.set(ilId * 1000 + no, 'dogru');
  return m;
}

export function vitrinSiralama() {
  const adlar = ['efe_35', 'kordonlu', 'boyozcu_ayse', 'memleket_sever', 'gevrekci', 'izmirli_deniz',
    'karsiyakali', 'alsancak_kizi', 'bornova_boy', 'urla_bagi'];
  return adlar.map((ad, i) => ({
    sira: i + 1, kullanici_adi: ad, puan: 412 - i * 37 - (i % 3) * 5, ben: ad === VITRIN_KULLANICI,
  }));
}
