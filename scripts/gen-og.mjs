// One-off generator for the static Open Graph share image.
// Composites the typo-1x terrain artwork onto the brand background and overlays
// the name + tagline, then writes public/og-default.png (1200x630).
// Run: node scripts/gen-og.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const p = (rel) => resolve(root, rel);
const b64 = (rel) => readFileSync(p(rel)).toString('base64');

const W = 1200;
const H = 630;

const grotesk = b64('node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2');
const mono = b64('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2');

// 1. Base brand background (slate-900 -> slightly lighter, diagonal).
const background = Buffer.from(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0" stop-color="#0f172a"/>
				<stop offset="1" stop-color="#131f38"/>
			</linearGradient>
		</defs>
		<rect width="${W}" height="${H}" fill="url(#bg)"/>
	</svg>`
);

// 2. Terrain artwork, resized and faded so text stays legible.
const terrainW = 720;
const terrain = await sharp(p('public/typo-1x.png'))
	.resize({ width: terrainW })
	.ensureAlpha()
	.composite([
		{
			// dest-in multiplies the terrain's alpha by this uniform layer,
			// giving it a global opacity without darkening the artwork.
			input: Buffer.from(
				`<svg xmlns="http://www.w3.org/2000/svg" width="${terrainW}" height="${Math.round((terrainW / 1149) * 680)}"><rect width="100%" height="100%" fill="#fff" fill-opacity="0.8"/></svg>`
			),
			blend: 'dest-in',
		},
	])
	.png()
	.toBuffer();
const terrainMeta = await sharp(terrain).metadata();

// 3. Text + accent overlay.
const overlay = Buffer.from(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
		<defs>
			<style>
				@font-face { font-family: 'Space Grotesk'; src: url(data:font/woff2;base64,${grotesk}) format('woff2'); font-weight: 700; }
				@font-face { font-family: 'IBM Plex Mono'; src: url(data:font/woff2;base64,${mono}) format('woff2'); font-weight: 500; }
				.name { font-family: 'Space Grotesk'; font-weight: 700; fill: #f8fafc; }
				.tag  { font-family: 'IBM Plex Mono'; font-weight: 500; fill: #fb923c; letter-spacing: 1px; }
			</style>
		</defs>
		<text x="78" y="330" class="name" font-size="104">Mateusz Jasinski</text>
		<text x="80" y="400" class="tag" font-size="30">Nine years across web development, and running</text>
	</svg>`
);

await sharp(background)
	.composite([
		{
			input: terrain,
			left: W - terrainMeta.width - 40,
			top: Math.round((H - terrainMeta.height) / 2) + 40,
		},
		{ input: overlay, left: 0, top: 0 },
	])
	.png()
	.toFile(p('public/og-default.png'));

console.log('wrote public/og-default.png');