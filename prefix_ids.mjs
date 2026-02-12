import fs from 'fs';
import path from 'path';

const filesToPrefix = [
  { name: 'chapter1Quizzes.js', prefix: 'frac-' },
  { name: 'chapter2Quizzes.js', prefix: 'frac-' },
  { name: 'chapter3Quizzes.js', prefix: 'frac-' },
  { name: 'chapter4Quizzes.js', prefix: 'frac-' },
  { name: 'chapter5Quizzes.js', prefix: 'dec-' },
  { name: 'chapter6Quizzes.js', prefix: 'dec-' },
  { name: 'ratioChapter1Quizzes.js', oldPrefix: 'r1-', newPrefix: 'ratio-1-' },
  { name: 'ratioChapter2Quizzes.js', oldPrefix: 'r2-', newPrefix: 'ratio-2-' },
  { name: 'ratioChapter3Quizzes.js', oldPrefix: 'r3-', newPrefix: 'ratio-3-' },
  { name: 'ratioChapter4Quizzes.js', oldPrefix: 'r4-', newPrefix: 'ratio-4-' },
];

const dataPath = '/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/data';

filesToPrefix.forEach(item => {
  const filePath = path.join(dataPath, item.name);
  let content = fs.readFileSync(filePath, 'utf8');

  if (item.prefix) {
    // Replace id: '1-1-1' with id: 'frac-1-1-1'
    content = content.replace(/id:\s*'([0-9]+-[0-9]+-[0-9]+)'/g, (match, id) => {
      return `id: '${item.prefix}${id}'`;
    });
  } else if (item.oldPrefix && item.newPrefix) {
    // Replace id: 'r1-1-1' with id: 'ratio-1-1-1'
    const escapedOld = item.oldPrefix.replace('-', '\\-');
    const regex = new RegExp(`id:\\s*'${escapedOld}([0-9]+-[0-9]+)'`, 'g');
    content = content.replace(regex, (match, suffix) => {
      return `id: '${item.newPrefix}${suffix}'`;
    });
  }

  fs.writeFileSync(filePath, content);
  console.log(`[DONE] Prefixed IDs in ${item.name}`);
});
