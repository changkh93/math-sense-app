import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

function isLightBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const isGrayish = (max - min) < 35;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return (luminance > 225) || (luminance > 205 && isGrayish);
}

export function makeBackgroundTransparent(filePath) {
  const data = fs.readFileSync(filePath);
  const png = PNG.sync.read(data);
  const { width, height } = png;

  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push([x, 0], [x, height - 1]);
  }
  for (let y = 0; y < height; y++) {
    queue.push([0, y], [width - 1, y]);
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const pIdx = idx * 4;
    const r = png.data[pIdx];
    const g = png.data[pIdx + 1];
    const b = png.data[pIdx + 2];

    if (isLightBackground(r, g, b)) {
      png.data[pIdx + 3] = 0;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  // Edge smoothing
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const pIdx = idx * 4;
      if (png.data[pIdx + 3] > 0) {
        let transparentNeighbors = 0;
        const neighbors = [
          ((y - 1) * width + x) * 4,
          ((y + 1) * width + x) * 4,
          (y * width + (x - 1)) * 4,
          (y * width + (x + 1)) * 4,
        ];
        for (const nIdx of neighbors) {
          if (png.data[nIdx + 3] === 0) transparentNeighbors++;
        }
        if (transparentNeighbors > 0) {
          const r = png.data[pIdx];
          const g = png.data[pIdx + 1];
          const b = png.data[pIdx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 175) {
            png.data[pIdx + 3] = Math.max(0, Math.min(255, Math.round(255 - (lum - 175) * 3)));
          }
        }
      }
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log('Processed transparent PNG:', filePath);
}

const badgeDir = path.resolve('src/assets/badge');
const files = fs.readdirSync(badgeDir).filter(f => f.endsWith('.png'));
for (const file of files) {
  const p = path.join(badgeDir, file);
  makeBackgroundTransparent(p);
}
