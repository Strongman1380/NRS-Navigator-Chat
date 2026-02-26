import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('icon-source.svg');
const bgColor = { r: 30, g: 58, b: 95, alpha: 1 };

const splashConfigs = [
  // Portrait
  { dir: 'drawable', w: 480, h: 800 },
  { dir: 'drawable-port-mdpi', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', w: 480, h: 800 },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  // Landscape
  { dir: 'drawable-land-mdpi', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', w: 800, h: 480 },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
];

async function generate() {
  for (const { dir, w, h } of splashConfigs) {
    const iconSize = Math.min(w, h) * 0.4;
    const icon = await sharp(svgBuffer)
      .resize(Math.round(iconSize), Math.round(iconSize))
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: bgColor,
      },
    })
      .composite([
        {
          input: icon,
          gravity: 'centre',
        },
      ])
      .png()
      .toFile(`android/app/src/main/res/${dir}/splash.png`);

    console.log(`Generated ${dir} splash (${w}x${h})`);
  }
  console.log('All splash screens generated!');
}

generate().catch(console.error);
