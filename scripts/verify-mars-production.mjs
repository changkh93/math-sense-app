import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
const base='public/mars-expedition',files=[]
async function walk(dir=''){for(const e of await fs.readdir(`${base}/${dir}`,{withFileTypes:true})){const path=dir?`${dir}/${e.name}`:e.name;if(e.isDirectory())await walk(path);else files.push(path)}}
await walk()
const results=[]
for(let i=0;i<files.length;i+=6){results.push(...await Promise.all(files.slice(i,i+6).map(async path=>{
 const response=await fetch(`https://msense.me/mars-expedition/${path}`)
 const remote=Buffer.from(await response.arrayBuffer()),local=await fs.readFile(`${base}/${path}`)
 const hash=b=>createHash('sha256').update(b).digest('hex')
 if(response.status!==200||hash(remote)!==hash(local))throw new Error(`Production mismatch: ${path} (${response.status})`)
 return {path,status:200,bytes:remote.length,hashMatches:true}
})))}
await fs.writeFile('docs/collaboration/tasks/20260910-zombie-knight-curriculum/production-assets.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n')
console.log(`PASS ${results.length} production files: HTTP 200 and exact SHA-256 match.`)
