import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public");

function toFontDataUrl(absPath) {
  const b = fs.readFileSync(absPath);
  return `data:font/woff2;base64,${b.toString("base64")}`;
}

/* Same stack as src/App.jsx logo: Ranchers + Nunito 900, PINK + CORAL stroke + INK shadow */
const ranchersWoff2 = path.join(
  root,
  "node_modules/@fontsource/ranchers/files/ranchers-latin-400-normal.woff2"
);
const nunito900Woff2 = path.join(
  root,
  "node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff2"
);

const ranchersUrl = toFontDataUrl(ranchersWoff2);
const nunitoUrl = toFontDataUrl(nunito900Woff2);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face {
        font-family: 'Ranchers';
        font-style: normal;
        font-weight: 400;
        font-display: block;
        src: url('${ranchersUrl}') format('woff2');
      }
      @font-face {
        font-family: 'Nunito';
        font-style: normal;
        font-weight: 900;
        font-display: block;
        src: url('${nunitoUrl}') format('woff2');
      }
    ]]></style>
  </defs>
  <rect width="512" height="512" fill="#3B82C4"/>
  <!-- textShadow: 6px 6px 0 #1A1020 -->
  <text x="262" y="274" text-anchor="middle" font-family="Ranchers, cursive" font-size="88" letter-spacing="-2" fill="#1A1020">
    <tspan>REACT</tspan><tspan font-size="112" dy="-1">!</tspan>
  </text>
  <!-- WebkitTextStroke ~3px coral on pink fill -->
  <text x="256" y="268" text-anchor="middle" font-family="Ranchers, cursive" font-size="88" letter-spacing="-2"
    fill="#F4A0B0" stroke="#F05C6E" stroke-width="3.25" paint-order="stroke fill">
    <tspan>REACT</tspan><tspan font-size="112" dy="-1">!</tspan>
  </text>
  <!-- Subline: Nunito 900, letterSpacing 0.28em, soft white -->
  <text x="256" y="342" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="16.5"
    letter-spacing="0.28em" fill="rgba(255,248,240,0.35)">✦ TEST YOUR REFLEXES ✦</text>
</svg>`;

const HI = 1024;
const hiRes = await sharp(Buffer.from(svg), { density: 300 })
  .resize(HI, HI, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .ensureAlpha()
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer();

async function writeDownscale(size, filename) {
  await sharp(hiRes)
    .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outDir, filename));
}

await writeDownscale(512, "icon-512.png");
await writeDownscale(192, "icon-192.png");
await writeDownscale(180, "apple-touch-icon.png");

console.log("Wrote Ranchers/Nunito PWA icons to public/");
