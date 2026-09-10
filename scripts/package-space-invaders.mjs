import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { validateProject } from '../src/components/PythonGameStudio/projectPolicy.mjs'
const base = 'public/space-invaders'
const content = 'content/space-invaders'
for (const dir of ['checkpoints', 'experiments', 'data-log']) await fs.cp(`${content}/${dir}`, `${base}/${dir}`, { recursive: true })
const manifest = JSON.parse(await fs.readFile(`${content}/manifest.json`, 'utf8'))
await fs.writeFile(`${base}/catalog.json`, JSON.stringify({steps: manifest.steps.map(({id,title})=>({id,title})), experiments:manifest.steps.filter(s=>s.experiment).map(({id,title})=>({id,title}))}))
const starter = JSON.parse(await fs.readFile(`${base}/space-invaders-starter.mspygame.json`, 'utf8'))
const final = validateProject({...starter,id:'space-invaders-final-v3',title:'우주 방어대 - 완성 비교',files:starter.files.map(f=> f.path==='main.py' ? {...f,text:''} : f)})
final.files.find(f=>f.path==='main.py').text=await fs.readFile(`${content}/checkpoints/final-main.py`,'utf8')
const checked=validateProject(final)
await fs.writeFile(`${base}/space-invaders-final.mspygame.json`,JSON.stringify(checked))
console.log(`Final project: ${checked.totalBytes} bytes, ${checked.files.length} files; ${manifest.totalSteps} checkpoints`)

execFileSync('python3', ['-c', `
from pathlib import Path
import zipfile
p = Path('public/space-invaders')
with zipfile.ZipFile(p / 'space-invaders-course.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted(p.rglob('*')):
        if f.is_file() and f.suffix not in ('.zip', '.json'):
            z.write(f, f.relative_to(p))
    for name in ['space-invaders-starter.mspygame.json', 'space-invaders-final.mspygame.json']:
        z.write(p / name, name)
    z.write('content/space-invaders/assessments.json', 'assessments.json')
print('Course ZIP rebuilt with current documents, checkpoints, and assets.')
`], { stdio: 'inherit' })
