// Sunucu işlemleri: ilerleme, oyun ve sıralama. Puan hesabı sunucuda yapılır
// (supabase/schema.sql: cevap_kaydet).
import { Durum, Mod, yuzde } from '../oyun/kurallar';
import { supabase } from './supabase';

export interface IlIlerleme { bilinen: number; puan: number; oyunSayisi: number }

export async function ilerlemeYukle(): Promise<Record<number, IlIlerleme>> {
  const { data, error } = await supabase.rpc('ilerlemem');
  if (error) throw error;
  const sonuc: Record<number, IlIlerleme> = {};
  for (const r of data as { il_id: number; bilinen: number; puan: number; oyun_sayisi: number }[]) {
    sonuc[r.il_id] = { bilinen: r.bilinen, puan: r.puan, oyunSayisi: r.oyun_sayisi };
  }
  return sonuc;
}

export const ilYuzdesi = (i: IlIlerleme | undefined, toplam: number) => yuzde(i?.bilinen ?? 0, toplam);

export async function durumlariYukle(ilId: number): Promise<Map<number, Durum>> {
  const { data, error } = await supabase.from('kullanici_sorular').select('soru_id, durum').eq('il_id', ilId);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.soru_id as number, r.durum as Durum]));
}

export async function oyunBaslat(ilId: number, mod: Mod): Promise<number> {
  const { data, error } = await supabase.rpc('oyun_baslat', { p_il_id: ilId, p_mod: mod });
  if (error) throw error;
  return data as number;
}

export interface CevapSonucu { dogru: boolean; dogru_cevap: string; puan: number; bonus: number; seri: number }

export async function cevapGonder(oyunId: number, soruId: number, secilen: string | null): Promise<CevapSonucu> {
  const { data, error } = await supabase.rpc('cevap_kaydet', {
    p_oyun_id: oyunId, p_soru_id: soruId, p_secilen: secilen,
  });
  if (error) throw error;
  return data as CevapSonucu;
}

export async function oyunBitir(oyunId: number) {
  await supabase.rpc('oyun_bitir', { p_oyun_id: oyunId });
}

export type Donem = 'tum' | 'hafta' | 'ay';
export interface SiraSatiri { sira: number; kullanici_adi: string; puan: number; ben: boolean }

export async function siralamaGetir(ilId: number | null, donem: Donem): Promise<SiraSatiri[]> {
  const { data, error } = await supabase.rpc('siralama', { p_il: ilId, p_donem: donem });
  if (error) throw error;
  return data as SiraSatiri[];
}
