import fs from 'fs';
import path from 'path';

const dataDir = '/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/data';
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js') && f !== 'regions.js');

files.forEach(file => {
  const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
  // Handle both 'unit1' and unit1
  const unitMatches = content.matchAll(/(['"])?(\w+)\1: \{[\s\S]*?questions: \[([\s\S]*?)\]\s*\}/g);
  for (const match of unitMatches) {
    const unitId = match[2];
    const questionsBlock = match[3];
    // Handle both id: 'r4-1-1' and id: "r4-1-1"
    const questionCount = (questionsBlock.match(/id:\s*['"]/g) || []).length;
    if (questionCount > 0) {
      console.log(`${file} -> ${unitId}: ${questionCount} questions`);
    } else {
        // Check if there are questions but no IDs (unlikely but possible)
        const qMatches = (questionsBlock.match(/question:\s*/g) || []).length;
        if (qMatches > 0) {
            console.log(`${file} -> ${unitId}: ${qMatches} questions (no IDs found)`);
        }
    }
  }
});
