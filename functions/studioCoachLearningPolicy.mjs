import { localFeedback, parseError } from './studioErrorCoachPolicy.mjs'
export const LEARNING_VERSION = 1
export const DIAGNOSTIC_VERSION = 'local-20260916-v2'
export const ENGINE_VERSION = 'pygame-web-0.9-cp312-v1'
export const INTENTS = ['meaning', 'location', 'example', 'still-stuck', 'incorrect', 'helpful']
export const OUTCOMES = ['unknown', 'same-error', 'different-error', 'completed', 'surface-ended']
export const RULES = ['constructor-not-called', 'call-missing-argument', 'name-spelling', 'attribute-spelling', 'import-spelling', 'module-spelling', 'name-commented-assignment', 'import-missing-target', 'import-missing-module', 'from-missing-module', 'from-missing-import', 'import-missing-alias', 'import-star-without-from', ...['SyntaxError','IndentationError','TabError','NameError','UnboundLocalError','TypeError','ValueError','IndexError','KeyError','ZeroDivisionError','FileNotFoundError','ModuleNotFoundError','ImportError','AttributeError','RuntimeError','Error'].map(t => `generic-${t}`)]
export const ruleFor = (diagnosis, error) => RULES.includes(diagnosis?.ruleId) ? diagnosis.ruleId : `generic-${RULES.includes(`generic-${error.type}`) ? error.type : 'Error'}`
export const INTENT_LABELS = { meaning: '무슨 뜻인지 모르겠어요', location: '어느 줄을 고치나요', example: '예시를 보고 싶어요', 'still-stuck': '고쳤는데 또 오류예요', incorrect: '설명이 맞지 않아요', helpful: '이해하는 데 도움이 됐어요' }
export const BASE_CARDS = {
  'constructor-not-called': { meaning: '클래스 이름은 객체를 만드는 설계도예요. 뒤에 ()를 붙이면 사용할 객체가 만들어져요. 예를 들어 Turtle()은 거북이 한 마리를 만들어요.', example: 'from turtle import Turtle\nt = Turtle()\nt.forward(100)', question: '기본 힌트가 가리키는 객체 생성 줄에서 클래스 이름 뒤에 ()가 있나요?' },
  'call-missing-argument': { meaning: '기능 이름 뒤의 괄호에는 그 기능에 필요한 값을 넣어요. 예를 들어 거북이의 forward()는 얼마나 움직일지 알려줘야 해요.', example: 't.forward(100)', question: '자동 추천의 인자 안내와 괄호 안의 값을 비교해 볼까요?' },
  'name-spelling': { meaning: '파이썬은 한 글자만 달라도 서로 다른 이름으로 봐요. 위 기본 힌트에 나온 두 이름을 나란히 비교해 보세요.', example: 'score = 10\nprint(score)', question: '만든 이름과 쓰는 이름의 글자 순서와 대소문자가 같은가요?' },
  'name-commented-assignment': { meaning: '# 뒤의 내용은 설명이라 실행되지 않아요. 값을 넣는 줄이 설명으로 바뀌었는지 확인해요.', example: 'score = 10\nprint(score)', question: '값을 넣으려던 줄 앞에 #이 붙어 있나요?' },
  'import-missing-target': { meaning: 'from 뒤에는 어디에서 가져올지, import 뒤에는 무엇을 가져올지 적어요. import에서 문장이 끝나면 가져올 대상이 없어요.', example: 'from ColabTurtlePlus.Turtle import *', question: 'import 뒤에 가져올 이름이나 *가 있나요?' },
}
const exact = (o, keys) => o && !Array.isArray(o) && Object.keys(o).sort().join(',') === keys.sort().join(',')
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value)
export function validateObservation(v) {
  if (!exact(v, ['version','eventId','ruleId','cardVersion','shadowVersion','mode','diagnosticVersion','runtimeVersion','intents','aiRequested','aiReceived','changed','outcome','elapsed','consent']) || v.version !== 1 || !id(v.eventId) || !RULES.includes(v.ruleId) || !(v.cardVersion === 'builtin-v1' || /^[a-f0-9]{24}$/.test(v.cardVersion)) || !(v.shadowVersion === null || /^[a-f0-9]{24}$/.test(v.shadowVersion)) || v.shadowVersion === v.cardVersion || !['file','notebook'].includes(v.mode) || v.diagnosticVersion !== DIAGNOSTIC_VERSION || v.runtimeVersion !== ENGINE_VERSION || !Array.isArray(v.intents) || v.intents.length > INTENTS.length || new Set(v.intents).size !== v.intents.length || v.intents.some(x => !INTENTS.includes(x)) || !['aiRequested','aiReceived','changed'].every(k => typeof v[k] === 'boolean') || (v.aiReceived && !v.aiRequested) || !OUTCOMES.includes(v.outcome) || !['under-30s','under-2m','over-2m'].includes(v.elapsed) || v.consent !== true) throw new Error('invalid-observation')
  return structuredClone(v)
}
export function validateCard(v) {
  if (!exact(v, ['ruleId','mode','meaning','example','question']) || !RULES.includes(v.ruleId) || !['file','notebook','both'].includes(v.mode)) throw new Error('invalid-card')
  for (const k of ['meaning','example','question']) if (typeof v[k] !== 'string' || !v[k].trim() || v[k].length > (k === 'example' ? 1000 : 500) || /https?:\/\/|<\/?script|sk-[\w-]{15,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(v[k])) throw new Error('invalid-card-text')
  return { ruleId: v.ruleId, mode: v.mode, meaning: v.meaning, example: v.example, question: v.question }
}
// Existing diagnosis remains authoritative. Remote cards only explain a matched
// rule; they cannot create predicates, change diagnosis, or execute code.
export function selectCard(ruleId, mode, cards = [], bucket = 99) {
  return cards.find(c => c.diagnosticVersion === DIAGNOSTIC_VERSION && c.runtimeVersion === ENGINE_VERSION && c.ruleId === ruleId && ['both', mode].includes(c.mode) && (c.stage === 'active' || (c.stage === 'limited' && bucket < 10))) || { ...BASE_CARDS[ruleId], version: 'builtin-v1' }
}
export function rankGroups(groups) {
  return groups.map(g => {
    const n = g.exposures || 0
    return { ...g, priority: (g.incorrect || 0) * 100 + (g.aiRequested || 0) * 3 + (g.meaning || 0) * 2 + (g['same-error'] || 0), requestRate: n ? (g.aiRequested || 0) / n : null, completedRate: n ? (g.completed || 0) / n : null, sampleWarning: n < 20 }
  }).sort((a,b) => Number(Boolean(b.incorrect)) - Number(Boolean(a.incorrect)) || b.priority - a.priority)
}
export const TRANSITIONS = { draft: ['tested','retired'], tested: ['reviewed','retired'], reviewed: ['shadow','retired'], shadow: ['limited','retired'], limited: ['active','retired'], active: ['retired'], retired: [] }
// Bounded synthetic fixtures, never supplied by student events or executed.
export function testCard(card) {
  validateCard(Object.fromEntries(['ruleId','mode','meaning','example','question'].map(k => [k,card[k]])))
  const fixtures = [
    ['constructor-not-called','from turtle import Turtle\nt = Turtle\nt.forward(100)', 'TypeError: Turtle.forward() missing 1 required positional argument: \'distance\'',3],
    ['call-missing-argument','from turtle import Turtle\nt = Turtle()\nt.forward()', 'TypeError: Turtle.forward() missing 1 required positional argument: \'distance\'',3],
    ['name-spelling','score = 10\nprint(socre)',"NameError: name 'socre' is not defined",2],
    ['attribute-spelling','from turtle import Turtle\nt = Turtle()\nt.foward(100)',"AttributeError: 'Turtle' object has no attribute 'foward'",3],
    ['import-spelling','from turtle import Trutle',"ImportError: cannot import name 'Trutle' from 'turtle'",1],
    ['module-spelling','import numppy',"ModuleNotFoundError: No module named 'numppy'",1],
    ['name-commented-assignment','# a = 2\nprint(a)',"NameError: name 'a' is not defined",2],
    ['import-missing-target','from turtle import','SyntaxError: invalid syntax',1],
    ['import-missing-module','import','SyntaxError: invalid syntax',1],
    ['from-missing-module','from import Turtle','SyntaxError: invalid syntax',1],
    ['from-missing-import','from turtle','SyntaxError: invalid syntax',1],
    ['import-missing-alias','import turtle as','SyntaxError: invalid syntax',1],
    ['import-star-without-from','import *','SyntaxError: invalid syntax',1],
  ]
  const evaluate = ([expected, source, text, line]) => {
    const e = parseError(`  File "/tmp/studio/main.py", line ${line}\n${text}`)
    return { expected, actual: ruleFor(localFeedback(e, source, 'file'), e) }
  }
  const evaluated = fixtures.map(evaluate)
  const known = card.ruleId.startsWith('generic-') || fixtures.some(f => f[0] === card.ruleId)
  const negative = evaluate(['generic-TypeError','from turtle import Turtle\ncallback = Turtle\nprint(callback)',"TypeError: unrelated",3])
  return { passed: known && evaluated.every(x => x.expected === x.actual) && negative.actual !== 'constructor-not-called', checked: evaluated.length + 1, diagnosticVersion: DIAGNOSTIC_VERSION, scope: '진단기 회귀 확인입니다. 문구·예시의 교육적 정확성은 교사가 별도로 검토해야 합니다.' }
}
