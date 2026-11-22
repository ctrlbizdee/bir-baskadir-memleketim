// Play mağazası görsellerini üretir: 512 simge ve 1024x500 tanıtım görseli.
// Kullanım: node scripts/magaza-gorselleri.js <resvg-js modül yolu>
const fs = require('fs');
const path = require('path');
const { Resvg } = require(process.argv[2] || '@resvg/resvg-js');

const cikti = path.join(__dirname, '..', 'magaza', 'gorseller');
fs.mkdirSync(cikti, { recursive: true });

const igne = 'M512 150 C352 150 228 274 228 434 C228 636 512 880 512 880 C512 880 796 636 796 434 C796 274 672 150 512 150 Z';
const gradyan = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#E0243F"/><stop offset="1" stop-color="#8E0B20"/></linearGradient></defs>`;
const igneGrubu = `<ellipse cx="512" cy="900" rx="150" ry="34" fill="#000" opacity="0.18"/>
  <path d="${igne}" fill="#fff"/>
  <text x="512" y="560" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="340" fill="#8E0B20">?</text>`;

const isler = {
  'simge-512.png': [512, 1024, 1024, `${gradyan}<rect width="1024" height="1024" fill="url(#g)"/>
    <g transform="translate(512 512) scale(0.78) translate(-512 -515)">${igneGrubu}</g>`],
  'tanitim-1024x500.png': [1024, 1024, 500, `${gradyan}<rect width="1024" height="500" fill="url(#g)"/>
    <g transform="translate(190 250) scale(0.36) translate(-512 -515)">${igneGrubu}</g>
    <text x="360" y="215" font-family="Arial Black, Arial" font-weight="900" font-size="40" letter-spacing="8" fill="#fff" opacity="0.9">BİR BAŞKADIR</text>
    <text x="356" y="300" font-family="Arial Black, Arial" font-weight="900" font-size="84" fill="#fff">MEMLEKETİM</text>
    <rect x="360" y="325" width="110" height="9" rx="4" fill="#fff"/>
    <text x="360" y="385" font-family="Arial, Segoe UI" font-weight="700" font-size="30" fill="#fff" opacity="0.92">Memleketini ne kadar biliyorsun?</text>`],
};

for (const [ad, [genislik, w, h, govde]] of Object.entries(isler)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${govde}</svg>`;
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: genislik }, font: { loadSystemFonts: true } }).render().asPng();
  fs.writeFileSync(path.join(cikti, ad), png);
  console.log(ad);
}
