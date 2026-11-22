import {
  Durum, Soru, bulunmaEki, onlukSec, seriBonusu, siklariHazirla, soruPuani, unvan, yuzde,
  yeniIsaretiGosterilsinMi,
} from './kurallar';

function sorular(n: number): Soru[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, zorluk: 'orta', soru: `S${i + 1}`, dogru: 'D',
    yanlislar: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
  }));
}

test('soru puanı', () => {
  expect([soruPuani('kolay'), soruPuani('orta'), soruPuani('zor')]).toEqual([1, 2, 3]);
});

test('seri bonusu', () => {
  expect(seriBonusu(4)).toBe(0);
  expect(seriBonusu(5)).toBe(5);
  expect(seriBonusu(10)).toBe(10);
  expect(seriBonusu(20)).toBe(20);
  expect(seriBonusu(35)).toBe(105);
  expect(seriBonusu(50)).toBe(250);
});

test('yüzde ve ünvan', () => {
  expect(yuzde(40, 50)).toBe(80);
  const il = 'Afyonkarahisar';
  expect(unvan(il, 0)).toBe('Afyonkarahisar misafiri');
  expect(unvan(il, 20)).toBe('Afyonkarahisar misafiri');
  expect(unvan(il, 22)).toBe('Yeni Afyonkarahisarlı');
  expect(unvan(il, 60)).toBe('Has Afyonkarahisarlı');
  expect(unvan(il, 62)).toBe('Afyonkarahisar sevdalısı');
  expect(unvan(il, 82)).toBe('Afyonkarahisar bilgesi');
  expect(unvan(il, 100)).toBe("Afyonkarahisar'ın evladı");
  expect(unvan('Ordu', 100)).toBe("Ordu'nun evladı");
  expect(unvan('İzmir', 30)).toBe('Yeni İzmirli');
});

test('bulunma eki', () => {
  expect(bulunmaEki('Afyonkarahisar')).toBe("'da");
  expect(bulunmaEki('İzmir')).toBe("'de");
  expect(bulunmaEki('Kars')).toBe("'ta");
});

test('yeni işareti %40 ve üstünde', () => {
  expect(yeniIsaretiGosterilsinMi(38)).toBe(false);
  expect(yeniIsaretiGosterilsinMi(40)).toBe(true);
});

test('onluk: bilinmeyen sayısı 5-7 arası', () => {
  const s = sorular(50);
  const d = new Map<number, Durum>();
  for (let i = 1; i <= 35; i++) d.set(i, 'dogru'); // 15 bilinmeyen kaldı
  for (let k = 0; k < 200; k++) {
    const secim = onlukSec(s, d);
    expect(secim).toHaveLength(10);
    expect(new Set(secim.map((x) => x.id)).size).toBe(10);
    const b = secim.filter((x) => d.get(x.id) !== 'dogru').length;
    expect(b).toBeGreaterThanOrEqual(5);
    expect(b).toBeLessThanOrEqual(7);
  }
});

test('onluk: hiç bilinen yoksa hepsi bilinmeyenden', () => {
  expect(onlukSec(sorular(50), new Map())).toHaveLength(10);
});

test('onluk: az bilinmeyen kaldıysa hepsi gelir', () => {
  const s = sorular(50);
  const d = new Map<number, Durum>();
  for (let i = 1; i <= 47; i++) d.set(i, 'dogru');
  const secim = onlukSec(s, d);
  expect(secim.filter((x) => x.id > 47)).toHaveLength(3);
});

test('şıklar: 1 doğru + 3 farklı yanlış', () => {
  const sk = siklariHazirla(sorular(1)[0]);
  expect(sk).toHaveLength(4);
  expect(sk.filter((x) => x === 'D')).toHaveLength(1);
  expect(new Set(sk).size).toBe(4);
});
