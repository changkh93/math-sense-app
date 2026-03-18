import fs from 'fs';
import path from 'path';

const TARGET_DIR = './public/pdfs/middle_math';

function normalizeRecursive(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const oldPath = path.join(dir, entry.name);
    const normalizedName = entry.name.normalize('NFC');
    const newPath = path.join(dir, normalizedName);

    if (oldPath !== newPath) {
      console.log(`Renaming: ${oldPath} -> ${newPath}`);
      fs.renameSync(oldPath, newPath);
    }

    if (entry.isDirectory()) {
      normalizeRecursive(newPath);
    }
  }
}

console.log(`Starting Hangeul normalization (NFC) in ${TARGET_DIR}...`);
normalizeRecursive(TARGET_DIR);
console.log('Normalization complete.');
