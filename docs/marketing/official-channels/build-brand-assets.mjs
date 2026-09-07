import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('/Users/selah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir = path.dirname(fileURLToPath(import.meta.url));
const assetDir = path.join(dir, 'assets');
const logo = await fs.readFile(path.join(process.cwd(), 'public/m-logo.svg'), 'utf8');
const inner = logo.replace(/<svg[^>]*>/,'').replace('</svg>','');
const profile = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#10182e"/><svg x="120" y="65" width="840" height="840" viewBox="0 0 500 500">${inner}</svg></svg>`;
const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="600" viewBox="0 0 1920 600"><rect width="1920" height="600" fill="#f6f5f0"/><defs><linearGradient id="line"><stop stop-color="#00bed6"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><rect x="100" y="92" width="120" height="120" rx="32" fill="#10182e"/><svg x="105" y="95" width="110" height="110" viewBox="0 0 500 500">${inner}</svg><g fill="#10182e" font-family="Apple SD Gothic Neo, sans-serif"><text x="254" y="176" font-size="70" font-weight="800">메타센스</text><text x="100" y="326" font-size="68" font-weight="700">AI 시대, 스스로 배우는 힘</text><text x="103" y="408" font-size="32">질문하고, 판단하고, 자기 말로 설명하는 공부</text><text x="104" y="520" font-size="26" fill="#46516b">초등수학 · 파이썬 · 고전읽기</text><text x="1650" y="520" font-size="26">msense.me</text></g><path d="M1300 345 C1350 160 1500 160 1530 320 S1730 420 1810 200" fill="none" stroke="url(#line)" stroke-width="4"/><circle cx="1300" cy="345" r="11" fill="#00bed6"/><circle cx="1810" cy="200" r="11" fill="#8b5cf6"/></svg>`;
for (const [name,svg] of [['profile-logo',profile],['naver-title',banner]]) {
 await fs.writeFile(path.join(assetDir,name+'.svg'),svg);
 await sharp(Buffer.from(svg)).png().toFile(path.join(assetDir,name+'.png'));
}
const bio = 'AI가 답하는 시대, 아이의 생각이 자라도록\n질문하고 판단하며 스스로 배우는 힘\n초등수학 · 파이썬 · 고전읽기\n수업 방식과 과정·체험 안내 ↓';
await fs.writeFile(path.join(dir,'instagram-bio.txt'),bio+'\n');
console.log(JSON.stringify({bioCharacters:[...bio].length,assets:['profile-logo.png','naver-title.png','ai-era-launch.png']}));
for(const name of ['profile-logo.png','naver-title.png','ai-era-launch.png']){const m=await sharp(path.join(assetDir,name)).metadata();console.log(name,m.width,m.height);}
