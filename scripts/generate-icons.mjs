import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');
const sourceImage = resolve(rootDir, 'COVER DEPAN.png');

// Icon sizes needed for PWA + iOS
const sizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 167, name: 'icon-167x167.png' },   // iPad Pro
  { size: 180, name: 'icon-180x180.png' },   // iPhone (apple-touch-icon)
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

async function generateIcons() {
  console.log('Reading source image:', sourceImage);
  
  const image = sharp(sourceImage);
  const metadata = await image.metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Crop to square from center
  const minDim = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - minDim) / 2);
  const top = Math.floor((metadata.height - minDim) / 2);

  for (const { size, name } of sizes) {
    const outputPath = resolve(publicDir, name);
    await sharp(sourceImage)
      .extract({ left, top, width: minDim, height: minDim })
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${name} (${size}x${size})`);
  }

  // Also generate favicon.ico replacement as PNG
  await sharp(sourceImage)
    .extract({ left, top, width: minDim, height: minDim })
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(resolve(publicDir, 'favicon.png'));
  console.log('✅ Generated favicon.png (32x32)');

  // Generate a 64x64 for favicon
  await sharp(sourceImage)
    .extract({ left, top, width: minDim, height: minDim })
    .resize(64, 64, { fit: 'cover' })
    .png()
    .toFile(resolve(publicDir, 'favicon-64.png'));
  console.log('✅ Generated favicon-64.png (64x64)');

  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
