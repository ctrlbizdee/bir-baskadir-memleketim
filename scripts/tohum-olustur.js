// src/veri altındaki il ve soru dosyalarından supabase/seed.sql üretir.
// Kullanım: npm run tohum
const fs = require('fs');
const path = require('path');

const kok = path.join(__dirname, '..');
const veri = path.join(kok, 'src', 'veri');
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const BOLGELER = [
  [1, 'Marmara'], [2, 'Ege'], [3, 'Akdeniz'], [4, 'İç Anadolu'],
  [5, 'Karadeniz'], [6, 'Doğu Anadolu'], [7, 'Güneydoğu Anadolu'],
];

const iller = JSON.parse(fs.readFileSync(path.join(veri, 'il-bilgileri.json'), 'utf8'));
const satirlar = ['-- Otomatik üretildi: npm run tohum. Elle düzenlemeyin.', 'begin;'];

satirlar.push(
  'insert into bolgeler(id, ad) values ' + BOLGELER.map(([i, a]) => `(${i}, ${q(a)})`).join(', ') +
  ' on conflict (id) do update set ad = excluded.ad;',
);

const ZOR = { k: 'kolay', o: 'orta', z: 'zor', kolay: 'kolay', orta: 'orta', zor: 'zor' };
for (const il of iller) {
  const dosya = path.join(veri, 'sorular', il.dosya + '.json');
  if (!fs.existsSync(dosya)) continue; // soruları henüz hazır olmayan il
  satirlar.push(
    `insert into iller(id, ad, bolge_id, tanitim, aktif) values (${il.id}, ${q(il.ad)}, ${il.bolgeId}, ${q(il.tanitim)}, true)` +
    ' on conflict (id) do update set ad = excluded.ad, bolge_id = excluded.bolge_id, tanitim = excluded.tanitim, aktif = true;',
  );
  const sorular = JSON.parse(fs.readFileSync(dosya, 'utf8')).map((x, i) => (Array.isArray(x)
    ? { no: i + 1, kategori: x[0], zorluk: ZOR[x[1]], soru: x[2], dogru: x[3], yanlislar: x.slice(4, 9) }
    : x));
  for (const s of sorular) {
    if (s.yanlislar.length !== 5) throw new Error(`${il.ad} ${s.no}: 5 yanlış şık olmalı`);
    const id = il.id * 1000 + s.no;
    satirlar.push(
      `insert into sorular(id, il_id, bolge_id, kategori, zorluk, soru, dogru, yanlislar) values (${id}, ${il.id}, ${il.bolgeId}, ${q(s.kategori)}, ${q(s.zorluk)}, ${q(s.soru)}, ${q(s.dogru)}, array[${s.yanlislar.map(q).join(', ')}])` +
      ' on conflict (id) do update set kategori = excluded.kategori, zorluk = excluded.zorluk, soru = excluded.soru, dogru = excluded.dogru, yanlislar = excluded.yanlislar, aktif = true;',
    );
  }
}
satirlar.push('commit;', '');
fs.writeFileSync(path.join(kok, 'supabase', 'seed.sql'), satirlar.join('\n'), 'utf8');
console.log('supabase/seed.sql yazıldı');
