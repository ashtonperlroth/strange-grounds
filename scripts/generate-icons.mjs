import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync } from 'fs';
import { join } from 'path';

const PUBLIC = join(import.meta.dirname, '..', 'public');

const svgBase = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#059669"/>
  <path d="M256 112 L140 368 L208 296 L256 344 L304 296 L372 368 Z" fill="#fff"/>
</svg>`;

const svgApple = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#059669"/>
  <path d="M256 128 L148 360 L212 292 L256 336 L300 292 L364 360 Z" fill="#fff"/>
</svg>`;

async function generate() {
  const svgBuffer = Buffer.from(svgBase);
  const svgAppleBuffer = Buffer.from(svgApple);

  // icon-512.png (PWA splash)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(PUBLIC, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // icon-192.png (Android/PWA)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(PUBLIC, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // apple-touch-icon.png (180x180, no rounded corners for Apple)
  await sharp(svgAppleBuffer)
    .resize(180, 180)
    .png()
    .toFile(join(PUBLIC, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // favicon sizes for ICO
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();

  // favicon.ico (multi-size: 16x16 + 32x32)
  const ico = await pngToIco([png16, png32]);
  writeFileSync(join(PUBLIC, 'favicon.ico'), ico);
  console.log('✓ favicon.ico');

  console.log('\nAll icons generated in public/');
}

generate().catch(console.error);
