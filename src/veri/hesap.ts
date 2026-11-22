import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Üyelik: e-posta yok, kullanıcı adı + 4 karakterlik şifre.
// Supabase e-posta ve en az 6 karakterlik şifre istediği için ikisi arka planda türetilir.
// Supabase panelinde "Confirm email" kapalı olmalı.

const E_POSTA_ALANI = 'memleketim.app';
const SIFRE_EKI = '#bbm';

const TR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
export function ePostaTuret(kullaniciAdi: string): string {
  const sade = kullaniciAdi.toLocaleLowerCase('tr').replace(/[çğıöşü]/g, (h) => TR[h]);
  return `${sade}@${E_POSTA_ALANI}`;
}
const sifreTuret = (sifre: string) => sifre + SIFRE_EKI;

// Kaba bir uygunsuz kelime süzgeci; listeyi genişletmek gerekebilir.
const YASAK = ['amk', 'aq', 'orospu', 'piç', 'sik', 'yarrak', 'göt', 'ibne', 'pezevenk', 'kahpe', 'sürtük', 'oç'];

export function kullaniciAdiHatasi(ad: string): string | null {
  if (ad.length < 3 || ad.length > 20) return 'Kullanıcı adı 3-20 karakter olmalı.';
  if (!/^[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]+$/.test(ad)) return 'Sadece harf, rakam ve _ kullanılabilir.';
  const k = ad.toLocaleLowerCase('tr');
  if (YASAK.some((y) => k.includes(y))) return 'Bu kullanıcı adı uygun değil.';
  return null;
}

export function sifreHatasi(sifre: string): string | null {
  return sifre.length === 4 ? null : 'Şifre 4 karakter olmalı.';
}

export async function kayitOl(kullaniciAdi: string, sifre: string): Promise<string | null> {
  const h = kullaniciAdiHatasi(kullaniciAdi) ?? sifreHatasi(sifre);
  if (h) return h;
  const { data: musait, error: e1 } = await supabase.rpc('kullanici_adi_musait', { p_ad: kullaniciAdi });
  if (e1) return 'Sunucuya ulaşılamadı.';
  if (!musait) return 'Bu kullanıcı adı alınmış.';
  const { error } = await supabase.auth.signUp({
    email: ePostaTuret(kullaniciAdi),
    password: sifreTuret(sifre),
    options: { data: { kullanici_adi: kullaniciAdi } },
  });
  if (error) return /registered|exists/i.test(error.message) ? 'Bu kullanıcı adı alınmış.' : 'Kayıt yapılamadı: ' + error.message;
  return null;
}

export async function girisYap(kullaniciAdi: string, sifre: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({
    email: ePostaTuret(kullaniciAdi),
    password: sifreTuret(sifre),
  });
  return error ? 'Kullanıcı adı ya da şifre yanlış.' : null;
}

export async function cikisYap() {
  await supabase.auth.signOut();
}

/** undefined = henüz yükleniyor, null = giriş yok */
export function useOturum(): Session | null | undefined {
  const [oturum, setOturum] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOturum(data.session));
    const { data } = supabase.auth.onAuthStateChange((_o, s) => setOturum(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return oturum;
}

export function kullaniciAdiAl(oturum: Session | null | undefined): string {
  return (oturum?.user.user_metadata?.kullanici_adi as string | undefined) ?? '';
}
