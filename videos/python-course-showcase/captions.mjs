import {createRequire} from 'node:module';import {readFile,writeFile} from 'node:fs/promises';
const ts=createRequire(import.meta.url)('typescript');const source=await readFile(new URL('./src/data.ts',import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;const {chapters}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const music=JSON.parse(await readFile(new URL('../../src/data/pythonCourseMusic.json',import.meta.url),'utf8'));
const clock=s=>`00:${String(Math.floor(s/60)).padStart(2,'0')}:${(s%60).toFixed(3).padStart(6,'0')}`;
for(const [id,c] of Object.entries(chapters)){
 const cues=[[0,5.5,`${c.name}\n${c.hook.join(' ')}`],[5.5,13.5,c.captions[0]],[13.5,24.17,c.captions[1]],[24.17,37,c.captions[2]],[37,43.5,`${c.question}\n${c.takeaway.join(' · ')}`],[43.5,50,'코드 스튜디오 → 과제 제출 → AI 분석 + 선생님 확인 → 학부모 확인\n연결된 자녀의 실시간 학습 활동과 공개된 피드백을 함께 봅니다.'],[50,57,`${c.name} · 파이썬 무료체험 신청\nmsense.me/python\n[배경음악: ${music[id].title} · Kevin MacLeod / CC BY 4.0]`]];
 await writeFile(new URL(`../../public/python-showcase/${id}.vtt`,import.meta.url),'WEBVTT\n\n'+cues.map(([start,end,text],i)=>`${i+1}\n${clock(start)} --> ${clock(end)}\n${text}\n`).join('\n'));
}
await writeFile(new URL('./out/chapters.json',import.meta.url),JSON.stringify(chapters,null,2));
