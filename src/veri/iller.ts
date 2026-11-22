import type { Soru, Zorluk } from '../oyun/kurallar';
import bilgiler from './il-bilgileri.json';
import { SORU_DOSYALARI } from './sorular';

// Yeni il eklemek için:
// 1) Soruları src/veri/sorular/<dosya>.json olarak ekleyin.
// 2) il-bilgileri.json'a bir satır, sorular/index.ts'e bir import ekleyin.
// 3) `npm run tohum` ile supabase/seed.sql'i yeniden üretip Supabase'de çalıştırın.

export interface Il {
  id: number;          // plaka
  ad: string;          // tam ad
  tanitim: string;
  sorular: Soru[];
}

/** Uzun biçim (afyonkarahisar.json) */
export interface HamSoru {
  no: number; kategori: string; zorluk: string; soru: string; dogru: string; yanlislar: string[];
}
/** Kısa biçim: [kategori, zorluk k|o|z, soru, doğru, 5 yanlış, ("D" = doğrulanmalı)] */
export type KisaSoru = string[];

const ZOR: Record<string, Zorluk> = { k: 'kolay', o: 'orta', z: 'zor', kolay: 'kolay', orta: 'orta', zor: 'zor' };

export function hamaCevir(liste: (HamSoru | KisaSoru)[]): HamSoru[] {
  return liste.map((x, i) =>
    Array.isArray(x)
      ? { no: i + 1, kategori: x[0], zorluk: ZOR[x[1]], soru: x[2], dogru: x[3], yanlislar: x.slice(4, 9) }
      : x,
  );
}

export const soruId = (ilId: number, no: number) => ilId * 1000 + no;

export const ILLER: Il[] = bilgiler
  .map((b) => ({
    id: b.id,
    ad: b.ad,
    tanitim: b.tanitim,
    sorular: hamaCevir(SORU_DOSYALARI[b.dosya] ?? []).map((s) => ({
      id: soruId(b.id, s.no),
      zorluk: s.zorluk as Zorluk,
      soru: s.soru,
      dogru: s.dogru,
      yanlislar: s.yanlislar,
    })),
  }))
  .filter((il) => il.sorular.length > 0)
  .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

export function ilBul(id: number): Il | undefined {
  return ILLER.find((i) => i.id === id);
}
