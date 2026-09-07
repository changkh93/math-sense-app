import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getMissionCardCompletion } from '../src/utils/missionCardCompletion.js'
import { mergeSummaryWithRecentHistory, shouldCheckLearningSummaryFreshness } from '../src/utils/learningSummaryUtils.js'

const userId = 'synthetic-student'
const unitId = 'synthetic-fraction-division'
const now = Date.parse('2026-09-07T10:00:00Z')
const summary = {schemaVersion:3, units:[]}
const rows = mergeSummaryWithRecentHistory(summary, []) // yesterday's completion excluded by today's query
assert.equal(rows.length, 0)
assert.equal(shouldCheckLearningSummaryFreshness({summary,lastCheckedMs:now-3600000,nowMs:now}),false)
const progressSnapshot = {userId,unitId,data:{workbookCompleted:true,workbookBestScore:98}}
const resolve = (overrides = {}) => getMissionCardCompletion({userId,unitId,bestScores:{},progressSnapshot,...overrides})
assert.deepEqual(resolve().workbook,{completed:true,bestScore:98},'stale summary must not hide final saved completion')
assert.deepEqual(resolve().quiz,{completed:false,bestScore:null},'workbook cannot complete quiz')
assert.equal(resolve({unitId:'another-unit'}).workbook.completed,false)
assert.equal(resolve({userId:'another-student'}).workbook.completed,false)
assert.equal(resolve({progressSnapshot:null}).workbook.completed,false)
assert.equal(resolve({progressSnapshot:{userId,unitId,data:null}}).workbook.completed,false)
assert.equal(resolve({progressSnapshot:{userId,unitId,data:{workbookSession:{checkedPages:{0:true}},workbookLastRewardedPageNumber:18,workbookPageRewardTotal:89}}}).workbook.completed,false)
assert.deepEqual(resolve({progressSnapshot:{userId,unitId,data:{workbookCompleted:true,workbookBestScore:0}}}).workbook,{completed:true,bestScore:0})
assert.deepEqual(resolve({progressSnapshot:{userId,unitId,data:{workbookCompleted:true}}}).workbook,{completed:true,bestScore:null})
assert.equal(resolve({bestScores:{[`${unitId}_workbook`]:100}}).workbook.bestScore,100)
assert.deepEqual(resolve({progressSnapshot:null,bestScores:{[`${unitId}_workbook`]:0}}).workbook,{completed:true,bestScore:0})
for (const invalid of [null,undefined,'',NaN,false,Infinity,-1,101]) {
  assert.equal(resolve({progressSnapshot:null,bestScores:{[`${unitId}_workbook`]:invalid}}).workbook.completed,false)
}
assert.deepEqual(resolve({progressSnapshot:{userId,unitId,data:{quizCompleted:true,quizBestScore:80}}}).quiz,{completed:true,bestScore:80})
const hub = readFileSync('src/components/Space/MissionHub.jsx','utf8')
assert.match(hub,/getMissionCardCompletion\(\{\s*userId, unitId, bestScores, progressSnapshot: completionProgressSnapshot/)
assert.match(hub,/setCompletionProgressSnapshot\(\{ userId, unitId, data: snap.exists\(\) \? snap.data\(\) : null \}\)/)
assert.doesNotMatch(hub,/const workbookCompleted = bestScores/)
console.log('Mission card completion: stale summary/day rollover, identity isolation, drafts, zero score, missing score and quiz separation passed')
