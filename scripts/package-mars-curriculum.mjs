import fs from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { validateProject, fileKind } from '../src/components/PythonGameStudio/projectPolicy.mjs'
const base='public/mars-expedition', content='content/mars-expedition'
for (const dir of ['checkpoints','experiments','data-log']) await fs.cp(`${content}/${dir}`,`${base}/${dir}`,{recursive:true})
const manifest=JSON.parse(await fs.readFile(`${content}/manifest.json`,'utf8'))
await fs.writeFile(`${base}/catalog.json`,JSON.stringify({steps:manifest.steps.map(({id,title})=>({id,title})),experiments:manifest.steps.filter(s=>s.experiment).map(({id,title})=>({id,title}))}))
const files=[{path:'main.py',kind:'python',text:''}]
async function walk(dir){for(const e of (await fs.readdir(`${base}/${dir}`,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=`${dir}/${e.name}`;if(e.isDirectory())await walk(path);else files.push({path,kind:fileKind(path),data:(await fs.readFile(`${base}/${path}`)).toString('base64')})}}
await walk('assets')
files.push({path:'asset_credits.py',kind:'python',text:await fs.readFile(`${base}/asset_credits.py`,'utf8')})
for(const mode of ['starter','final']){
 const project=validateProject({id:`mars-expedition-${mode}-v1`,title:`화성 탐사대: 신호 복구${mode==='starter'?'':' - 완성 비교'}`,schemaVersion:1,runtimeVersion:'pygame-web-0.9-cp312-v1',revision:0,entrypoint:'main.py',files:files.map(f=>f.path==='main.py'?{...f,text:''}:f) .map(f=>f)})
 if(mode==='final')project.files.find(f=>f.path==='main.py').text=await fs.readFile(`${content}/checkpoints/final-main.py`,'utf8')
 const checked=validateProject(project)
 await fs.writeFile(`${base}/mars-expedition-${mode}.mspygame.json`,JSON.stringify(checked))
 console.log(`${mode}: ${checked.files.length} files, ${checked.totalBytes} bytes`)
}
execFileSync('python3',['-c',`
from pathlib import Path
import zipfile
p=Path('${base}')
with zipfile.ZipFile(p/'mars-expedition-course.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(p.rglob('*')):
  if f.is_file() and f.suffix != '.zip': z.write(f,f.relative_to(p))
 a=Path('${content}/assessments.json')
 if a.exists(): z.write(a,'assessments.json')
print('Packaged course ZIP')
`],{stdio:'inherit'})
