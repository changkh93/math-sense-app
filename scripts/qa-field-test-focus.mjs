// Local-only QA: render the real quiz UI against synthetic in-memory persistence.
// No student data or Firebase connection is used. Output is outside public/dist.
import { build } from 'esbuild'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
const out = '/private/tmp/metasense-field-test-focus-qa'
await mkdir(out, { recursive: true })
const mocks = {
  auth: `const user={uid:'synthetic-focus-qa'}; export const useAuth=()=>({user,userData:{displayName:'QA 학생'}});`,
  sync: 'export const useSmartSync=()=>{};',
  notebook: 'export const useCreateMistakeCardFromQuiz=()=>({isPending:false,mutateAsync:async()=>({})});',
  modal: 'export default function Modal(){return null}',
  sound: 'export default new Proxy({}, {get:()=>()=>{}});',
  firebase: 'export const db={}; export const functions={};',
  functions: 'export const httpsCallable=()=>async()=>({data:{ok:true}});',
  firestore: `
    const store=new Map();window.qaStore=store;window.qaWrites=[];
    export const doc=(db,...parts)=>parts.join('/');
    export const serverTimestamp=()=>Date.now();
    export const increment=n=>n;
    export const deleteField=()=>null;
    export const getDoc=async ref=>({exists:()=>store.has(ref),data:()=>structuredClone(store.get(ref)||{})});
    export const setDoc=async(ref,data,options)=>{
      window.qaWrites.push({ref,data,options});
      store.set(ref,{...(store.get(ref)||{}),...structuredClone(data)});
    };
    export const runTransaction=async(db,fn)=>{
      if(window.qaSaveMode==='fail')throw new Error('QA save failure');
      if(window.qaSaveMode==='pending')await new Promise(resolve=>window.qaReleaseSave=resolve);
      return fn({get:getDoc,set:(ref,data,options)=>{void setDoc(ref,data,options)}});
    };
  `,
}
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import SpaceQuizView from './src/components/Space/SpaceQuizView.jsx';
window.qaSaveMode='ok';window.qaHidden=false;window.qaFocus=false;
Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.qaHidden});
Object.defineProperty(document,'hasFocus',{configurable:true,value:()=>window.qaFocus});
const mode=new URLSearchParams(location.search).get('mode')||'dark';
if(mode==='denied'||mode==='pending'){
  Object.defineProperty(document,'fullscreenEnabled',{configurable:true,value:true});
  document.documentElement.requestFullscreen=()=>mode==='denied'?Promise.reject(new Error('QA denial')):new Promise(()=>{});
}
const questions=[
{id:'qa-q1',question:'1 + 1은 얼마일까요?',options:[{text:'1',isCorrect:false},{text:'2',isCorrect:true},{text:'3',isCorrect:false},{text:'4',isCorrect:false}]},
{id:'qa-q2',question:'2 + 2는 얼마일까요?',options:[{text:'2',isCorrect:false},{text:'4',isCorrect:true},{text:'6',isCorrect:false},{text:'8',isCorrect:false}]},
];
const hiddenEvent=()=>{window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'));};
function App(){const [exited,setExited]=React.useState(false);return <>
<div id="qa-toolbar" style={{position:'fixed',zIndex:40000,top:0,right:0,background:'white',color:'black',padding:8,font:'14px sans-serif'}}>
<span>로컬 합성 QA · </span>
<button onClick={()=>window.dispatchEvent(new Event('blur'))}>포커스 오류</button>
<button onClick={hiddenEvent}>화면 숨김</button>
<button onClick={()=>{hiddenEvent();setTimeout(hiddenEvent,4500);setTimeout(hiddenEvent,9000)}}>잠금 중 반복</button>
<button onClick={()=>{window.qaSaveMode='pending'}}>저장 지연</button>
<button onClick={()=>{window.qaSaveMode='ok';window.qaReleaseSave?.()}}>저장 재개</button>
<button onClick={()=>{window.qaSaveMode='fail'}}>저장 실패</button>
<button onClick={()=>{document.getElementById('qa-log').textContent=JSON.stringify(window.qaWrites.slice(-3),null,2)}}>기록 보기</button>
</div>
{exited?<h1>QA 저장 후 나가기 완료</h1>:<SpaceQuizView region={{color:'#a855f7',title:'다크매터 QA'}} quizData={{unitId:mode==='dark'?'dark_matter_zone':'qa_assessment',title:'합성 퀴즈',questions}} onExit={()=>setExited(true)} onComplete={async()=>({ok:true})} hasShield={0} hasRadar={false}/>}
<pre id="qa-log" style={{whiteSpace:'pre-wrap',color:'white'}}/>
</>};createRoot(document.getElementById('root')).render(<App/>);
`
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: 'qa-field-test-focus.jsx', loader: 'jsx' },
  bundle: true, format: 'esm', jsx: 'automatic', outfile: path.join(out, 'qa.js'),
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.woff': 'file', '.woff2': 'file', '.ttf': 'file' },
  plugins: [{ name: 'synthetic-only', setup(api) {
    api.onResolve({filter: /^(firebase\/firestore|firebase\/functions)$|(?:useAuth|useSync|useMistakeNotebook|QuestionModal|SoundManager|\/firebase)$/}, args => {
      const key = args.path === 'firebase/firestore' ? 'firestore' : args.path === 'firebase/functions' ? 'functions'
        : args.path.endsWith('/firebase') ? 'firebase' : args.path.endsWith('useAuth') ? 'auth'
        : args.path.endsWith('useSync') ? 'sync' : args.path.endsWith('useMistakeNotebook') ? 'notebook'
        : args.path.endsWith('QuestionModal') ? 'modal' : 'sound'
      return {path:key,namespace:'qa'}
    });
    api.onLoad({filter:/.*/,namespace:'qa'},args=>({contents:mocks[args.path],loader:'js'}));
  }}],
})
await writeFile(path.join(out, 'index.html'), '<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'self\' data: blob:; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'none\'"><link rel="stylesheet" href="/qa.css"><body style="margin:0"><div id="root"></div><script type="module" src="/qa.js"></script></body></html>')
if (!process.argv.includes('--build-only')) createServer(async (req,res)=>{
  try {
    const name = path.basename(new URL(req.url,'http://localhost').pathname) || 'index.html'
    const data=await readFile(path.join(out,name))
    res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream')
    res.end(data)
  }catch{res.statusCode=404;res.end('Not found')}
}).listen(5187,'127.0.0.1',()=>console.log('Synthetic quiz UI: http://127.0.0.1:5187 — no production connections'))
