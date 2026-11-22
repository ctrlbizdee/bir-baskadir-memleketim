// src/veri/sorular/*.json dosyalarını denetler: 50 soru, 5 farklı yanlış şık,
// doğru şık yanlışlarda yok, aynı soru iki kez yok, yasaklı şık yok.
// Kullanım: npm run denetle
const fs = require('fs');
const path = require('path');
const klasor = path.join(__dirname, '..', 'src', 'veri', 'sorular');
const YASAK = [/domuz/i];
let hata = 0;
for (const ad of fs.readdirSync(klasor).filter((f) => f.endsWith('.json'))) {
  const liste = JSON.parse(fs.readFileSync(path.join(klasor, ad), 'utf8'));
  const sorular = liste.map((x) => (Array.isArray(x)
    ? { soru: x[2], dogru: x[3], yanlislar: x.slice(4, 9), zorluk: x[1] }
    : x));
  const bildir = (m) => { hata++; console.log(`${ad}: ${m}`); };
  if (sorular.length !== 50) bildir(`${sorular.length} soru var (50 olmalı)`);
  const gorulen = new Set();
  sorular.forEach((s, i) => {
    const n = i + 1;
    // Aynı kalıp soru farklı doğru cevapla tekrar edebilir; aynı soru + aynı cevap olamaz
    const anahtar = s.soru + '|' + s.dogru;
    if (gorulen.has(anahtar)) bildir(`${n}: aynı soru ve cevap tekrar ediyor`);
    gorulen.add(anahtar);
    if (s.yanlislar.length !== 5) bildir(`${n}: ${s.yanlislar.length} yanlış şık`);
    if (new Set(s.yanlislar).size !== s.yanlislar.length) bildir(`${n}: yanlış şıklar tekrar ediyor`);
    if (s.yanlislar.includes(s.dogru)) bildir(`${n}: doğru cevap yanlışlar arasında`);
    if (![s.soru, s.dogru, ...s.yanlislar].every((t) => typeof t === 'string' && t.trim())) bildir(`${n}: boş alan`);
    if (YASAK.some((r) => [s.dogru, ...s.yanlislar].some((t) => r.test(t)))) bildir(`${n}: yasaklı şık`);
    if (!['k', 'o', 'z', 'kolay', 'orta', 'zor'].includes(s.zorluk)) bildir(`${n}: zorluk hatalı`);
  });
}
console.log(hata ? `${hata} sorun bulundu` : 'Tüm soru dosyaları sorunsuz');
process.exit(hata ? 1 : 0);
