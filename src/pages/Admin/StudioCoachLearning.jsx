import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase'
import { BASE_CARDS, TRANSITIONS, reportAvailability } from '../../../functions/studioCoachLearningPolicy.mjs'
import { renderStructure } from '../../../functions/studioCoachStructure.mjs'
import './StudioCoachLearning.css'
const stageNames={draft:'초안',tested:'진단기 검증',reviewed:'교사 검토 완료',shadow:'관찰 적용',limited:'약 10% 세션 적용',active:'전체 적용',retired:'회수'}
const api = async data => (await httpsCallable(functions,'studioCoachLearningAdmin')(data)).data
export default function StudioCoachLearning({call=api}) {
  const [report,setReport]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
  const [draft,setDraft]=useState({ruleId:'constructor-not-called',mode:'both',...BASE_CARDS['constructor-not-called']})
  const [review,setReview]=useState(false),[policy,setPolicy]=useState(false)
  const [prices,setPrices]=useState({input:'',output:'',maintenance:'',avoid:'',extra:''})
  const load=async()=>{try{setReport(await call({action:'report'}))}catch(e){setNotice(e.message||'보고서를 불러오지 못했습니다.')}}
  useEffect(()=>{let alive=true;call({action:'report'}).then(r=>{if(alive)setReport(r)}).catch(()=>{if(alive)setNotice('보고서를 불러오지 못했습니다. 권한과 함수 배포 상태를 확인하세요.')});return()=>{alive=false}},[call])
  const act=async data=>{if(busy)return;setBusy(true);setNotice('');try{await call(data);await load();setNotice('반영했습니다. 배포·회수는 코드 스튜디오를 새로고침한 뒤 새 오류부터 반영됩니다.')}catch(e){setNotice(e.message||'처리하지 못했습니다.')}finally{setBusy(false)}}
  const choose=ruleId=>{setDraft({ruleId,mode:'both',meaning:'',example:'',question:'',...BASE_CARDS[ruleId]});setReview(false)}
  const costs=report?.costs||[], input=costs.reduce((n,c)=>n+(c.inputTokens||0),0), output=costs.reduce((n,c)=>n+(c.outputTokens||0),0), requests=costs.reduce((n,c)=>n+(c.requests||0),0)
  const availability=report ? reportAvailability(report) : null
  const validPrice=['input','output','maintenance','avoid','extra'].every(k=>prices[k]!==''&&Number.isFinite(Number(prices[k]))&&Number(prices[k])>=0)
  const paid=Number(prices.input)*input/1e6+Number(prices.output)*output/1e6
  const benefit=requests?paid/requests*Number(prices.avoid)-Number(prices.maintenance)-Number(prices.extra):null
  return <main className="coach-workbench"><h1>코드 도움 개선</h1><p>학생이 반복해서 막히는 부분을 찾고, 검토한 설명만 적용합니다. 이 화면은 AI를 추가 호출하지 않습니다.</p>
    <button disabled={busy} onClick={load}>보고서 새로고침</button>{notice&&<p role="status">{notice}</p>}
    {!report?<p>아직 보고서가 없습니다.</p>:<>
      <section aria-label="기록 수집 상태"><h2>분석할 기록이 쌓이고 있나요?</h2>
        {report.period&&<p>{report.period.from} ~ {report.period.through} · UTC 날짜 기준 14일</p>}
        <p><strong>{availability.summary}</strong></p><p>{availability.reservations}</p><p>{availability.samples}</p>
        <p>새로 수집하려면 아래 수집 설정의 안내·보관 정책을 확인하고, 학생이 스튜디오에서 선택적으로 참여해야 해요. 설정만 켜도 이전 오류나 모든 학생 코드가 수집되는 것은 아니에요.</p>
      </section>
      <section><h2>최근 14일 · 개선 후보</h2><p>개선 참여를 선택하고 전송에 성공한 도움 기준입니다. 전체 학생 통계나 학습 성취 점수가 아닙니다. 중단·관찰 불가는 성공에 포함하지 않습니다.</p>{report.truncated&&<p>조회 한도에 도달했습니다. 아래 수치는 일부 기록 기준입니다.</p>}
        {!report.groups.length?<p>보고 기간에 분석할 관찰이 없습니다. 오류 경향을 추정하거나 데이터를 만들기 위한 AI 호출은 하지 않습니다.</p>:<div className="coach-report-scroll"><table><thead><tr><th>유형 · 버전</th><th>관찰 / 비노출 일치</th><th>이해 어려움</th><th>오진 제보</th><th>수정 후 같은 오류</th><th>실행 완료</th><th>관찰 불가</th><th>AI 요청</th><th></th></tr></thead><tbody>{report.groups.map(g=><tr key={`${g.ruleId}-${g.cardVersion}-${g.mode}-${g.diagnosticVersion}-${g.runtimeVersion}`}><td>{g.ruleId}<small>{g.mode} · {g.cardVersion}{g.sampleWarning?' · 표본 부족':''}</small><small>{g.diagnosticVersion} · {g.runtimeVersion}</small><details><summary>질문·결과 자세히</summary><small>위치 질문 {g.location||0} · 예시 요청 {g.example||0} · 고쳐도 어려움 {g['still-stuck']||0}<br/>도움 됨 {g.helpful||0} · 완료와 도움 응답 모두 {g.completedAndHelpful||0}<br/>수정 없이 같은 오류 {g.sameWithoutEdit||0} · 다른 오류 {g['different-error']||0} · 그림/게임 종료 {g['surface-ended']||0}</small></details></td><td>{g.exposures||0} / {g.shadowMatches||0}</td><td>{g.meaning||0}</td><td>{g.incorrect||0}</td><td>{g.sameAfterEdit||0}</td><td>{g.completed||0}</td><td>{g.unknown||0}</td><td>{g.aiRequested||0}</td><td><button onClick={()=>choose(g.ruleId)}>설명 초안</button></td></tr>)}</tbody></table></div>}
        <p>검토 우선순위는 오진 제보, AI 추가 요청, 이해 어려움, 오류 반복 순서로 계산합니다. 제보 자체가 오진 확정은 아닙니다.</p>
      </section>
      <section><h2>이미 받은 AI 설명 재사용</h2><p>검토용 보관이 켜져 있고 학생이 참여를 선택한 요청만 표시됩니다. 원래 이름으로 복원하기 전 답변이며, 특정 학생의 코드를 설명 카드에 복사하지 마세요.</p>{!report.samples.length?<p>보관된 대표 사례가 없습니다.</p>:report.samples.map(s=><details key={s.id}><summary>{s.ruleId} · 변환된 대표 사례</summary><pre>{renderStructure(s.payload).snippet}</pre><p>{s.advice.explanation}</p><p>{s.advice.hint}</p><p>{s.advice.question}</p><p>{s.advice.check}</p><button onClick={()=>{choose(s.ruleId);setDraft(d=>({...d,meaning:s.advice.explanation,question:s.advice.question}))}}>설명·질문을 초안으로 가져오기</button><small>별명·줄 번호를 제거하고 일반적인 합성 예제로 편집해야 합니다.</small></details>)}</section>
      <section><h2>설명 카드 초안</h2><p>기존 진단기가 이 유형으로 판단한 경우에만 보충 설명을 표시합니다. 진단 조건을 임의로 늘리거나 코드를 자동 수정하지 않습니다.</p>
        <label>유형<select value={draft.ruleId} onChange={e=>choose(e.target.value)}>{report.rules.map(r=><option key={r}>{r}</option>)}</select></label>
        <label>적용 모드<select value={draft.mode} onChange={e=>setDraft({...draft,mode:e.target.value})}><option value="both">파일·노트북</option><option value="file">파일</option><option value="notebook">노트북</option></select></label>
        {[['meaning','쉬운 설명'],['example','합성 예제'],['question','확인 질문']].map(([key,label])=><label key={key}>{label}<textarea value={draft[key]} maxLength={key==='example'?1000:500} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
        <button disabled={busy||!draft.meaning||!draft.example||!draft.question} onClick={()=>act({action:'create',card:draft})}>새 버전 초안 저장</button>
      </section>
      <section><h2>검증 · 승인 · 적용 · 회수</h2><label><input type="checkbox" checked={review} onChange={e=>setReview(e.target.checked)}/> 선택할 버전의 설명·예시·오진 가능성과 기존 기본 힌트의 일관성을 직접 검토했습니다.</label><p>진단기 검사는 합성 양성·반례의 회귀 확인입니다. 문구의 정확성을 자동 보증하지 않습니다. 관찰 적용은 학생에게 새 설명을 보이지 않고 적용 조건에 맞는 횟수만 집계합니다. 실제 효과는 약 10%의 탭 세션에 적용한 뒤 비교하며, 무작위 표본의 차이를 감안해야 합니다.</p>
        {report.cards.map(c=><article key={c.version}><h3>{c.ruleId} · {stageNames[c.stage]}</h3><small>{c.version} · {c.mode}</small><p>{c.meaning}</p><pre>{c.example}</pre><p>{c.question}</p>{c.testResult&&<small>{c.testResult.passed?'회귀 통과':'실패'} · {c.testResult.checked}개 · {c.testResult.scope}</small>}<div>{(TRANSITIONS[c.stage]||[]).map(stage=><button key={stage} disabled={busy||(stage==='reviewed'&&!review)} onClick={()=>act({action:'transition',version:c.version,expectedStage:c.stage,stage,educationalReview:review})}>{stage==='retired'?'이 버전 회수':stageNames[stage]}</button>)}</div></article>)}
      </section>
      <section><h2>실제 사용량과 개선 비용 비교</h2><p>참여한 AI 요청 {requests}건 · 입력 {input} / 출력 {output} 토큰. 전체 OpenAI 청구액은 아닙니다. 같은 통화로 단가와 비용을 입력하면 예상 순편익을 계산합니다.</p>{[['input','입력 100만 토큰 단가'],['output','출력 100만 토큰 단가'],['avoid','회피할 것으로 예상하는 유료 요청 수'],['maintenance','개발·교사 검토·유지 비용'],['extra','추가 저장·운영·AI 분석 비용']].map(([k,l])=><label key={k}>{l}<input type="number" min="0" step="any" value={prices[k]} onChange={e=>setPrices({...prices,[k]:e.target.value})}/></label>)}<p>{validPrice&&benefit!==null?`예상 순편익: ${benefit.toFixed(4)} (가정에 따른 값이며 절감 보장이 아닙니다)`:'단가·비용과 유료 요청 표본이 있어야 계산할 수 있습니다.'}</p></section>
      <section><h2>수집 설정</h2><p>관찰 기록: {report.config.enabled?'켜짐':'꺼짐'} · 변환 대표 사례: {report.config.samplesEnabled?'켜짐':'꺼짐'}. 학생의 탭 내 선택이 추가로 필요합니다. 계정이나 API의 ZDR 설정을 변경하지 않습니다.</p><label><input type="checkbox" checked={policy} onChange={e=>setPolicy(e.target.checked)}/> 보호자 안내·필요한 동의, 실제 보관·삭제 운영, 개인정보 처리 범위를 확인했습니다.</label><div><button disabled={busy||!policy} onClick={()=>act({action:'configure',enabled:true,samplesEnabled:false,policyReviewed:policy})}>내용 없는 관찰만 켜기</button><button disabled={busy||!policy} onClick={()=>act({action:'configure',enabled:true,samplesEnabled:true,policyReviewed:policy})}>관찰·변환 사례 켜기</button><button disabled={busy} onClick={()=>act({action:'configure',enabled:false,samplesEnabled:false,policyReviewed:true})}>수집 끄기</button></div></section>
    </>}
  </main>
}
