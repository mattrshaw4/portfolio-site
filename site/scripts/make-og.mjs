import sharp from 'sharp';

const v = Array.from({ length: 21 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="630"/>`).join('');
const h = Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="1200" y2="${i * 60}"/>`).join('');
const sans = 'DejaVu Sans, Helvetica, Arial, sans-serif';
const mono = 'DejaVu Sans Mono, monospace';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0A1118"/>
<g stroke="#4DA3FF" stroke-opacity="0.12" stroke-width="1">${v}${h}</g>
<rect x="72" y="72" width="8" height="486" fill="#34D399"/>
<text x="112" y="150" font-family="${mono}" font-size="26" letter-spacing="4" fill="#34D399">CLOUD / DEVOPS / AWS / TERRAFORM</text>
<text x="112" y="320" font-family="${sans}" font-size="128" font-weight="700" fill="#F2F6FA">Matt Shaw</text>
<text x="112" y="404" font-family="${sans}" font-size="44" fill="#4DA3FF">Cloud DevOps Engineer</text>
<text x="112" y="468" font-family="${sans}" font-size="30" fill="#9FB3C8">Kitchen-tested. Built on AWS.</text>
<text x="112" y="530" font-family="${mono}" font-size="28" fill="#34D399">mattrshaw.com</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('wrote public/og.png');
