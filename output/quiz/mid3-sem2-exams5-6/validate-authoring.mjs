import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import katex from 'katex';
const base=path.join(path.dirname(fileURLToPath(import.meta.url)),'authoring');
const ids={5:'1789033557224',6:'1789033567891'};
let mathCount=0,imageCount=0;
for(const round of [5,6]){
  const dir=path.join(base,`round${round}`);
  const {questions}=JSON.parse(fs.readFileSync(path.join(dir,'questions.json')));
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
  assert.equal(questions.length,24);assert.equal(manifest.questions.length,24);
  assert.equal(manifest.round,round);
  assert.equal(manifest.unitId,`reg_1781420075936_chap_1781420292103_unit_${ids[round]}`);
  for(const [i,q]of questions.entries()){
    const label=`Round ${round} Q${i+1}`,m=manifest.questions[i];
    assert.equal(m.number,i+1,label);assert.equal(q.options.length,5,label);
    assert.equal(new Set(q.options).size,5,label);
    const answers=Array.isArray(q.answer)?q.answer:[q.answer];
    assert(answers.length>0&&answers.every(a=>q.options.includes(a)),label);
    assert.deepEqual(q.options.flatMap((o,j)=>answers.includes(o)?[j+1]:[]),m.correctOptionNumbers,label);
    for(const key of ['question','hint','explanation'])assert(typeof q[key]==='string'&&q[key].trim(),label+key);
    for(const stage of ['[관찰 단계]','[개념 연결]','[과정 추론]','[결론 유도]'])assert(q.hint.includes(stage),label+stage);
    for(const heading of ['## 문제 풀이','**문제 내용:**','핵심 개념 체크','풀이 전략','단계별 상세 풀이','주의점 및 팁'])assert(q.explanation.includes(heading),label+heading);
    assert(q.explanation.includes(q.question),label+' missing problem in solution');
    for(const opt of q.options)assert(q.explanation.includes(opt),label+' missing option in solution');
    for(const s of [q.question,...q.options,...answers,q.hint,q.explanation]){
      assert.equal((s.match(/\$/g)||[]).length%2,0,label+' dollars');
      assert(!/\d/.test(s.replace(/\$[^$]*\$/g,'')),label+' bare digit');
      assert(!/[\x00-\x08\x0b\x0c\x0e-\x1f\ue000-\uf8ff]/.test(s),label+' corrupt PDF glyph or control character');
      assert(!s.includes('[cite:'),label);
      for(const [,expr]of s.matchAll(/\$([^$]+)\$/g)){
        katex.renderToString(expr,{throwOnError:true,strict:(code)=>['unknownSymbol','unicodeTextInMathMode'].includes(code)?'ignore':'error'});mathCount++;
      }
    }
    assert(Array.isArray(m.verification)&&m.verification.length>0,label+' verification');
    assert(typeof m.replaced==='boolean',label+' replacement flag');
    if(m.replaced)assert(m.replacementReason?.trim(),label+' replacement reason');
    for(const key of ['imagePath','sourceImagePath'])if(m[key]){
      const file=path.resolve(dir,m[key]);assert(file.startsWith(dir+path.sep),label+' outside assets');
      assert(fs.existsSync(file)&&fs.statSync(file).size>100,label+' missing image');
      if(key==='imagePath')imageCount++;
    }
  }
}
console.log(JSON.stringify({questions:48,mathExpressions:mathCount,imageCount,structuralValidation:'PASS',educationalReview:'still required by Codex'}));
