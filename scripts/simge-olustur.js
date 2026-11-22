// Uygulama simgelerini SVG'den üretir: konum iğnesi + soru işareti
// ("memleketini ne kadar biliyorsun?").
// Kullanım: node scripts/simge-olustur.js <resvg-js modül yolu>
const fs = require('fs');
const path = require('path');
const { Resvg } = require(process.argv[2] || '@resvg/resvg-js');

const KIRMIZI_ACIK = '#E0243F';
const KIRMIZI_KOYU = '#8E0B20';
const assets = path.join(__dirname, '..', 'assets');

// 1024'lük tuvalde iğne; ölçek ve kaydırma ile yerleştirilir
const igne = 'M512 150 C352 150 228 274 228 434 C228 636 512 880 512 880 C512 880 796 636 796 434 C796 274 672 150 512 150 Z';
const soru = (renk) =>
  `<text x="512" y="560" text-anchor="middle" font-family="Arial Black, Segoe UI Black, Arial" font-weight="900" font-size="340" fill="${renk}">?</text>`;

const gradyan = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${KIRMIZI_ACIK}"/><stop offset="1" stop-color="${KIRMIZI_KOYU}"/>
  </linearGradient>
</defs>`;

// İğne + gölge + soru işareti, 1024 koordinatlarında
const igneGrubu = (soruRengi) => `
  <ellipse cx="512" cy="900" rx="150" ry="34" fill="#000" opacity="0.18"/>
  <path d="${igne}" fill="#FFFFFF"/>
  ${soru(soruRengi)}`;

const svgler = {
  // Ana simge: kırmızı zemin üzerinde beyaz iğne
  'icon.png': [1024, `${gradyan}<rect width="1024" height="1024" fill="url(#g)"/>
    <g transform="translate(512 512) scale(0.78) translate(-512 -515)">${igneGrubu(KIRMIZI_KOYU)}</g>`],
  // Android uyarlanabilir simge: zemin ve ön yüz ayrı (ön yüz ortadaki güvenli alanda)
  'android-icon-background.png': [512, `${gradyan}<rect width="1024" height="1024" fill="url(#g)"/>`, 1024],
  'android-icon-foreground.png': [512, `<g transform="translate(512 512) scale(0.56) translate(-512 -515)">${igneGrubu(KIRMIZI_KOYU)}</g>`, 1024],
  'android-icon-monochrome.png': [432, `<defs><mask id="m"><rect width="1024" height="1024" fill="#fff"/>${soru('#000')}</mask></defs>
    <g transform="translate(512 512) scale(0.56) translate(-512 -515)"><path d="${igne}" fill="#fff" mask="url(#m)"/></g>`, 1024],
  // Açılış ekranı: beyaz zeminde kırmızı iğne
  'splash-icon.png': [1024, `${gradyan}<g transform="translate(512 512) scale(0.8) translate(-512 -515)">
    <path d="${igne}" fill="url(#g)"/>${soru('#FFFFFF')}</g>`],
  'favicon.png': [48, `${gradyan}<rect width="1024" height="1024" rx="200" fill="url(#g)"/>
    <g transform="translate(512 512) scale(0.85) translate(-512 -515)"><path d="${igne}" fill="#fff"/>${soru(KIRMIZI_KOYU)}</g>`, 1024],
};

for (const [ad, [boyut, govde, tuval = 1024]] of Object.entries(svgler)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tuval}" height="${tuval}" viewBox="0 0 ${tuval} ${tuval}">${govde}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: boyut }, font: { loadSystemFonts: true } }).render().asPng();
  fs.writeFileSync(path.join(assets, ad), png);
  console.log(ad, boyut + 'px');
}
