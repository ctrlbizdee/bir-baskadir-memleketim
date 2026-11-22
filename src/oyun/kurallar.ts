// Oyun kuralları. Puan kuralları supabase/schema.sql içindeki
// soru_puani ve seri_bonusu fonksiyonlarıyla aynı tutulmalı.

export type Zorluk = 'kolay' | 'orta' | 'zor';
export type Mod = 'onluk' | 'yanlisa_kadar';
export type Durum = 'gorulmedi' | 'dogru' | 'yanlis';

export interface Soru {
  id: number;
  zorluk: Zorluk;
  soru: string;
  dogru: string;
  yanlislar: string[]; // 5 tane
}

export type Rastgele = () => number; // [0, 1)

export const SORU_SURESI_SN = 10;
export const ONLUK_SORU_SAYISI = 10;
export const BILINMEYEN_EN_AZ = 5;
export const BILINMEYEN_EN_FAZLA = 7;
export const YENI_ISARETI_ESIGI = 40; // yüzde

export function soruPuani(zorluk: Zorluk): number {
  return zorluk === 'kolay' ? 1 : zorluk === 'orta' ? 2 : 3;
}

/** n. ardışık doğru cevapta verilen seri bonusu. */
export function seriBonusu(n: number): number {
  if (n === 50) return 250;
  if (n === 35) return 105;
  if (n > 0 && n % 5 === 0) return n;
  return 0;
}

/** İldeki ilerleme: doğru bilinen soru sayısı / toplam soru. */
export function yuzde(bilinen: number, toplam: number): number {
  if (toplam <= 0) return 0;
  return Math.round((bilinen / toplam) * 100);
}

/** Ünvan. Şehir adı tam yazılır: "Afyonkarahisar". */
export function unvan(ilAdi: string, y: number): string {
  if (y >= 100) return `${ilAdi}${tamlayanEki(ilAdi)} evladı`;
  if (y > 80) return `${ilAdi} bilgesi`;
  if (y > 60) return `${ilAdi} sevdalısı`;
  if (y > 40) return `Has ${ilAdi}${liEki(ilAdi)}`;
  if (y > 20) return `Yeni ${ilAdi}${liEki(ilAdi)}`;
  return `${ilAdi} misafiri`;
}

export function yeniIsaretiGosterilsinMi(y: number): boolean {
  return y >= YENI_ISARETI_ESIGI;
}

// ---- Türkçe ekler (büyük ünlü uyumu) ----
function sonUnlu(s: string): string {
  const k = s.toLocaleLowerCase('tr');
  for (let i = k.length - 1; i >= 0; i--) if ('aıoueiöü'.includes(k[i])) return k[i];
  return 'e';
}
function dortluUnlu(s: string): string {
  const u = sonUnlu(s);
  if ('aı'.includes(u)) return 'ı';
  if ('ei'.includes(u)) return 'i';
  if ('ou'.includes(u)) return 'u';
  return 'ü';
}
function sonHarfUnluMu(s: string): boolean {
  return 'aıoueiöü'.includes(s.toLocaleLowerCase('tr').slice(-1));
}
/** "Afyonkarahisarlı", "İzmirli", "Ordulu" */
export function liEki(s: string): string {
  return 'l' + dortluUnlu(s);
}
/** "Afyonkarahisar'da", "İzmir'de", "Kars'ta" */
export function bulunmaEki(s: string): string {
  const son = s.toLocaleLowerCase('tr').slice(-1);
  const d = 'fstkçşhp'.includes(son) ? 't' : 'd';
  return "'" + d + ('aıou'.includes(sonUnlu(s)) ? 'a' : 'e');
}
/** "Afyonkarahisar'ın", "Ordu'nun" */
export function tamlayanEki(s: string): string {
  return "'" + (sonHarfUnluMu(s) ? 'n' : '') + dortluUnlu(s) + 'n';
}

// ---- Soru seçimi ----

export function karistir<T>(dizi: T[], r: Rastgele = Math.random): T[] {
  const a = dizi.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 10 soruluk tur: 5-7 soru bilinmeyenlerden (hiç görülmemiş + yanlış yapılmış),
 * kalanı bilinenlerden. Bir havuz yetmezse diğerinden tamamlanır. Sıra rastgele.
 */
export function onlukSec(
  sorular: Soru[],
  durumlar: Map<number, Durum>,
  r: Rastgele = Math.random,
): Soru[] {
  const bilinmeyen = karistir(sorular.filter((s) => durumlar.get(s.id) !== 'dogru'), r);
  const bilinen = karistir(sorular.filter((s) => durumlar.get(s.id) === 'dogru'), r);
  const n = Math.min(ONLUK_SORU_SAYISI, sorular.length);

  const hedef =
    BILINMEYEN_EN_AZ + Math.floor(r() * (BILINMEYEN_EN_FAZLA - BILINMEYEN_EN_AZ + 1));
  let bilinmeyenSayisi = Math.min(hedef, bilinmeyen.length);
  // Bilinenler yetmiyorsa bilinmeyenlerden fazladan al
  if (n - bilinmeyenSayisi > bilinen.length) {
    bilinmeyenSayisi = Math.min(bilinmeyen.length, n - bilinen.length);
  }
  const secim = [
    ...bilinmeyen.slice(0, bilinmeyenSayisi),
    ...bilinen.slice(0, n - bilinmeyenSayisi),
  ];
  return karistir(secim, r);
}

/** Yanlışa kadar: ilin tüm soruları rastgele sırayla, ilk yanlışta biter. */
export function yanlisaKadarSec(sorular: Soru[], r: Rastgele = Math.random): Soru[] {
  return karistir(sorular, r);
}

/** Ekranda gösterilecek 4 şık: doğru + rastgele 3 yanlış, karışık sırada. */
export function siklariHazirla(soru: Soru, r: Rastgele = Math.random): string[] {
  const yanlis = karistir(soru.yanlislar, r).slice(0, 3);
  return karistir([soru.dogru, ...yanlis], r);
}
