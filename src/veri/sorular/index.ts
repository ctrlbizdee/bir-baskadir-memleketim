import type { HamSoru, KisaSoru } from '../iller';
import adana from './adana.json';
import afyonkarahisar from './afyonkarahisar.json';
import amasya from './amasya.json';
import ankara from './ankara.json';
import antalya from './antalya.json';
import eskisehir from './eskisehir.json';
import gaziantep from './gaziantep.json';
import istanbul from './istanbul.json';
import izmir from './izmir.json';
import konya from './konya.json';
import mugla from './mugla.json';
import sanliurfa from './sanliurfa.json';
import sinop from './sinop.json';

// Sırada: aydin, bursa, erzurum, hatay, kayseri, manisa, mardin, mersin, osmaniye, rize, trabzon
// (il-bilgileri.json'da kayıtlı; soru dosyası olmayan il uygulamada görünmez)
export const SORU_DOSYALARI: Record<string, (HamSoru | KisaSoru)[]> = {
  adana, afyonkarahisar, amasya, ankara, antalya, eskisehir, gaziantep, istanbul, izmir, konya,
  mugla, sanliurfa, sinop,
};
