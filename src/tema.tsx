import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from './veri/supabase';

export interface Renkler {
  zemin: string;
  kart: string;
  yazi: string;
  soluk: string;
  ana: string;       // ikinci düğmeler, çubuklar
  anaYazi: string;   // ana rengin üstündeki yazı
  vurgu: string;     // ana düğmeler, başlık
  vurguYazi: string; // vurgu renginin üstündeki yazı
  baslik?: string;   // büyük başlık rengi (verilmezse vurgu)
  cizgi: string;
  dogru: string;
  yanlis: string;
  yeni: string;
}

const ortak = { kart: '#FFFFFF', dogru: '#1E8E3E', yanlis: '#C62828', yeni: '#E8A200', anaYazi: '#FFFFFF' };

export const TEMALAR = {
  afyonkarahisar: {
    ad: 'Afyonkarahisar Grisi',
    renk: { ...ortak, zemin: '#F2F1EE', yazi: '#1F2328', soluk: '#6B6F76', ana: '#4A4F57', vurgu: '#C8102E', vurguYazi: '#FFFFFF', cizgi: '#DEDCD6' },
  },
  izmir: {
    ad: 'İzmir Sarısı',
    renk: { ...ortak, zemin: '#FFF8E1', yazi: '#2B2410', soluk: '#7A6A3A', ana: '#6B5300', vurgu: '#F5C518', vurguYazi: '#2B2410', baslik: '#A67C00', cizgi: '#EADFB8', yeni: '#E0601B' },
  },
  emirdag: {
    ad: 'Emirdağ Yeşili',
    renk: { ...ortak, zemin: '#EEF5EF', yazi: '#14261A', soluk: '#5A6E60', ana: '#2F5D3A', vurgu: '#2E8B57', vurguYazi: '#FFFFFF', cizgi: '#D2E3D6' },
  },
  alanya: {
    ad: 'Alanya Mavisi',
    renk: { ...ortak, zemin: '#EAF4FA', yazi: '#0F2433', soluk: '#587080', ana: '#1F4E6B', vurgu: '#0090C8', vurguYazi: '#FFFFFF', cizgi: '#CFE3EF' },
  },
  ankara: {
    ad: 'Ankara Grisi',
    renk: { ...ortak, zemin: '#EDEFF1', yazi: '#1A1E23', soluk: '#626A73', ana: '#2F3740', vurgu: '#56616D', vurguYazi: '#FFFFFF', cizgi: '#D5D9DE', baslik: '#2F3740' },
  },
  prag: {
    ad: 'Prag Bordosu',
    renk: { ...ortak, zemin: '#F6EEF0', yazi: '#2A1218', soluk: '#7A5C64', ana: '#5A2433', vurgu: '#8E2C48', vurguYazi: '#FFFFFF', cizgi: '#E6D3D8' },
  },
} satisfies Record<string, { ad: string; renk: Renkler }>;

export type TemaAdi = keyof typeof TEMALAR;
const VARSAYILAN: TemaAdi = 'afyonkarahisar';
const ANAHTAR = 'tema';
const gecerli = (x: unknown): x is TemaAdi => typeof x === 'string' && x in TEMALAR;
const rastgeleTema = (): TemaAdi => {
  const adlar = Object.keys(TEMALAR) as TemaAdi[];
  return adlar[Math.floor(Math.random() * adlar.length)];
};

interface TemaDegeri { tema: TemaAdi; renk: Renkler; temaSec: (t: TemaAdi) => void }
const TemaBaglami = createContext<TemaDegeri>({
  tema: VARSAYILAN, renk: TEMALAR[VARSAYILAN].renk, temaSec: () => {},
});

export function TemaSaglayici({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<TemaAdi>(VARSAYILAN);

  useEffect(() => {
    // Önce telefondaki seçim (hızlı). Hiç yoksa ilk açılış: herkese rastgele bir tema.
    AsyncStorage.getItem(ANAHTAR)
      .then((t) => {
        if (gecerli(t)) { setTema(t); return; }
        const r = rastgeleTema();
        setTema(r);
        AsyncStorage.setItem(ANAHTAR, r).catch(() => {});
      })
      .catch(() => {});
    // Sonra hesaptaki seçim (başka cihazdan değiştirildiyse). Hesapta yoksa telefondakini yaz.
    const yukle = async () => {
      const { data: k } = await supabase.auth.getUser();
      if (!k.user) return;
      const { data } = await supabase.from('profiller').select('tema').eq('id', k.user.id).maybeSingle();
      if (gecerli(data?.tema)) {
        setTema(data.tema);
        AsyncStorage.setItem(ANAHTAR, data.tema).catch(() => {});
      } else {
        const yerel = await AsyncStorage.getItem(ANAHTAR).catch(() => null);
        const t = gecerli(yerel) ? yerel : rastgeleTema();
        setTema(t);
        supabase.from('profiller').update({ tema: t }).eq('id', k.user.id).then(() => {});
      }
    };
    yukle();
    const { data } = supabase.auth.onAuthStateChange((olay) => { if (olay === 'SIGNED_IN') yukle(); });
    return () => data.subscription.unsubscribe();
  }, []);

  function temaSec(t: TemaAdi) {
    setTema(t);
    AsyncStorage.setItem(ANAHTAR, t).catch(() => {});
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) supabase.from('profiller').update({ tema: t }).eq('id', data.user.id).then(() => {});
    });
  }

  return (
    <TemaBaglami.Provider value={{ tema, renk: TEMALAR[tema].renk, temaSec }}>
      {children}
    </TemaBaglami.Provider>
  );
}

export const useTema = () => useContext(TemaBaglami);
export const useRenk = () => useContext(TemaBaglami).renk;
