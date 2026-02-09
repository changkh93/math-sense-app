import fs from 'fs';
import path from 'path';

const keywords = [
  'times', 'div', 'neq', 'ldots', 'cdots', 'square', 'alpha', 'beta', 
  'Delta', 'pi', 'le', 'ge', 'cdot', 'pm', 'approx', 'frac', 'neq'
];

// Regex to find single backslash before a keyword
// Matches a backslash NOT preceded by a backslash, followed by a keyword
// Or the backslash at the very beginning of the string
const regex = new RegExp(`(?<!\\\\)\\\\(${keywords.join('|')})`, 'g');

const dataDir = './src/data';

const fixFiles = () => {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));
  
  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (regex.test(content)) {
      console.log(`Fixing ${file}...`);
      const fixedContent = content.replace(regex, '\\\\$1');
      fs.writeFileSync(filePath, fixedContent, 'utf8');
    } else {
      console.log(`No fix needed for ${file}.`);
    }
  });
};

fixFiles();
