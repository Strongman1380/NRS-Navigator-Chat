import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('icon-source.svg');

const sizes = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192,
};

const foregroundSizes = {
  'mdpi': 108,
  'hdpi': 162,
  'xhdpi': 216,
  'xxhdpi': 324,
  'xxxhdpi': 432,
};

async function generate() {
  for (const [density, size] of Object.entries(sizes)) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await sharp(svgBuffer).resize(size, size).png().toFile(`${dir}/ic_launcher.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(`${dir}/ic_launcher_round.png`);
    console.log(`Generated ${density} icons (${size}x${size})`);
  }

  for (const [density, size] of Object.entries(foregroundSizes)) {
    const dir = `android/app/src/main/res/mipmap-${density}`;
    await sharp(svgBuffer).resize(size, size).png().toFile(`${dir}/ic_launcher_foreground.png`);
    console.log(`Generated ${density} foreground (${size}x${size})`);
  }

  console.log('All Android icons generated!');
}

generate().catch(console.error);
