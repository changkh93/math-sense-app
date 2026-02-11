import fs from 'fs';
import path from 'path';

const dataDir = '/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/data';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js') && f !== 'regions.js');

files.forEach(file => {
  const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
  // Simple regex to find unit blocks and count IDs
  const unitRegex = /['"](unit\d+)['"]\s*:\s*{[\s\S]*?questions\s*:\s*\[([\s\S]*?)\]/g;
  let match;
  while ((match = unitRegex.exec(content)) !== null) {
    const unitId = match[1];
    const questionsBlock = match[2];
    const idCount = (questionsBlock.match(/id\s*:/g) || []).length;
    if (idCount === 15 || idCount === 0 || idCount < 5) {
      console.log(`${file} - ${unitId}: ${idCount} questions`);
    }
  }
});
