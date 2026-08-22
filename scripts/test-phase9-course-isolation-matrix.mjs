import assert from 'node:assert/strict';
import {
  isPythonExclusiveActivity,
  belongsToCourse,
  sanitizeLearningSummaryForCourse,
  buildFeedbackWhitelistDto,
} from '../src/services/coursePolicyUtils.js';
import { buildFeedbackPrompt } from '../src/services/zcodeApiService.js';
import { createFallbackAssignmentFeedback } from '../src/services/assignmentFeedbackService.js';

console.log('=== Running Phase 9: Real Production Course Isolation, Whitelist DTO, & Prompt Sanitization Tests ===');

// 1. Test isPythonExclusiveActivity on pure shared module
console.log('[Test 1] Testing pure shared isPythonExclusiveActivity...');
assert.equal(isPythonExclusiveActivity({ type: 'code_trace' }), true);
assert.equal(isPythonExclusiveActivity({ activityType: 'code_trace' }), true);
assert.equal(isPythonExclusiveActivity({ codeTrace: { completed: true } }), true);
assert.equal(isPythonExclusiveActivity({ type: 'lumi_protocol' }), true);
assert.equal(isPythonExclusiveActivity({ activityType: 'lumi_protocol_mission_complete' }), true);
assert.equal(isPythonExclusiveActivity({ experienceType: 'lumi_protocol' }), true);
assert.equal(isPythonExclusiveActivity({ missionLab: { experienceType: 'lumi_protocol' } }), true);
assert.equal(isPythonExclusiveActivity({ missionLab: { missionSetId: 'lumi-vertical-slice-v1' } }), true);
assert.equal(isPythonExclusiveActivity({ type: 'python_mission', experienceType: 'lumi_protocol' }), true);
assert.equal(isPythonExclusiveActivity({ type: 'python_mission', missionSetId: 'lumi-vertical-slice-v1' }), true);
assert.equal(isPythonExclusiveActivity({ type: 'python_mission', unitId: 'lumi_protocol_vertical_slice' }), true);

// Non-python activities
assert.equal(isPythonExclusiveActivity({ type: 'quiz_pass', clusterId: 'cluster_elementary' }), false);
assert.equal(isPythonExclusiveActivity({ type: 'video', clusterId: 'middle-math' }), false);
assert.equal(isPythonExclusiveActivity({ type: 'workbook', clusterId: 'cluster_elementary' }), false);
assert.equal(isPythonExclusiveActivity({ type: 'quiz_battle', clusterId: 'middle-math' }), false);
console.log('  -> isPythonExclusiveActivity verified on shared module');

// 2. Test 4-Stage Course Isolation Gate & Elementary Level-Up Exception
console.log('[Test 2] Testing belongsToCourse across all courses...');

const pythonLumiItem = {
  type: 'lumi_protocol',
  clusterId: 'python',
  missionId: 'VS-01',
  unitId: 'lumi_protocol_vertical_slice',
  unitTitle: 'LUMI Protocol: 사라진 빛의 항로',
};

const pythonCodeTraceItem = {
  type: 'code_trace',
  clusterId: 'python',
  unitId: 'py_math_01',
  unitTitle: '파이썬 수학 1단원',
};

const middleMathQuizItem = {
  type: 'quiz_pass',
  clusterId: 'middle-math',
  unitId: 'mid_math_01',
  unitTitle: '중등수학 일차방정식',
};

const elementaryQuizItem = {
  type: 'quiz_pass',
  clusterId: 'cluster_elementary',
  unitId: 'elem_math_01',
  unitTitle: '초등 분수의 덧셈',
};

// Python course matches python activities
assert.equal(belongsToCourse(pythonLumiItem, 'python'), true);
assert.equal(belongsToCourse(pythonCodeTraceItem, 'python'), true);
assert.equal(belongsToCourse(middleMathQuizItem, 'python'), false);
assert.equal(belongsToCourse(elementaryQuizItem, 'python'), false);

// Elementary course strictly bars LUMI & CODE TRACE
assert.equal(belongsToCourse(pythonLumiItem, 'cluster_elementary'), false);
assert.equal(belongsToCourse(pythonCodeTraceItem, 'cluster_elementary'), false);
assert.equal(belongsToCourse(elementaryQuizItem, 'cluster_elementary'), true);
// Without level-up option: middle-math is false
assert.equal(belongsToCourse(middleMathQuizItem, 'cluster_elementary', { includeMiddleMathLevelUp: false }), false);
// With level-up option: middle-math is admitted!
assert.equal(belongsToCourse(middleMathQuizItem, 'cluster_elementary', { includeMiddleMathLevelUp: true }), true);
// With level-up option: LUMI and CODE TRACE MUST STILL BE STRICTLY BARRED!
assert.equal(belongsToCourse(pythonLumiItem, 'cluster_elementary', { includeMiddleMathLevelUp: true }), false, 'LUMI must remain barred under level-up');
assert.equal(belongsToCourse(pythonCodeTraceItem, 'cluster_elementary', { includeMiddleMathLevelUp: true }), false, 'CODE TRACE must remain barred under level-up');

// Middle math course strictly bars LUMI & CODE TRACE
assert.equal(belongsToCourse(pythonLumiItem, 'middle-math'), false);
assert.equal(belongsToCourse(pythonCodeTraceItem, 'middle-math'), false);
assert.equal(belongsToCourse(middleMathQuizItem, 'middle-math'), true);
assert.equal(belongsToCourse(elementaryQuizItem, 'middle-math'), false);

console.log('  -> belongsToCourse and level-up exception verified');

// 3. Test Mixed Raw Context Sanitization & Forbidden Words in Prompts
console.log('[Test 3] Testing Whitelist DTO and Forbidden Words across Course Prompts...');

// Mixed raw context that accidentally contains Python items alongside Elementary items
const mixedRawContext = {
  student: {
    name: '홍길동',
    courseId: 'cluster_elementary',
    courseLabel: '초등수학',
  },
  currentSubmission: {
    assignmentId: 'asg_elem_01',
    content: '분수의 덧셈 문제를 풀었습니다.',
    contentLength: 20,
    attachmentCount: 0,
  },
  dailyLearningSummary: {
    activityCount: 1,
    allActivityCount: 1, // cleaned of python activities
    videoMinutes: 15,
    quizCount: 1,
    // Unsanitized incoming fields
    codeTraceCount: 2,
    codeTraces: [{ title: 'CODE TRACE Unit 1', completed: true }],
    lumiProtocolCount: 1,
    lumiProtocols: [{ title: 'LUMI Protocol: 사라진 빛의 항로', missionTitle: '어둠 속 신호' }],
    excludedOtherCourseTitles: ['CODE TRACE Unit 1', '중등수학 일차방정식'],
  },
  darkMatterSummary: { totalActive: 0 },
};

// 3.1 Non-Python Whitelist DTO sanitization
const elemDto = buildFeedbackWhitelistDto(mixedRawContext, 'cluster_elementary');
assert.equal(elemDto.dailyLearningSummary.codeTraceCount, undefined, 'codeTraceCount must be omitted in non-Python DTO');
assert.equal(elemDto.dailyLearningSummary.lumiProtocolCount, undefined, 'lumiProtocolCount must be omitted in non-Python DTO');
assert.equal(elemDto.dailyLearningSummary.codeTraces, undefined, 'codeTraces must be stripped in DTO');
assert.equal(elemDto.dailyLearningSummary.lumiProtocols, undefined, 'lumiProtocols must be stripped in DTO');
assert.deepEqual(elemDto.dailyLearningSummary.excludedOtherCourseTitles, ['중등수학 일차방정식'], 'Excluded titles must not leak CODE TRACE or LUMI');

// 3.2 Non-Python AI Prompt forbidden words verification
const elemPrompt = buildFeedbackPrompt(mixedRawContext, 'balanced');
assert.equal(elemPrompt.includes('[Python 전용 규칙]'), false, 'Elementary prompt must not contain Python rules block');
assert.equal(elemPrompt.includes('CODE TRACE'), false, 'Elementary prompt must physically contain 0 instances of CODE TRACE');
assert.equal(elemPrompt.includes('LUMI Protocol'), false, 'Elementary prompt must physically contain 0 instances of LUMI Protocol');
assert.equal(elemPrompt.includes('루미'), false, 'Elementary prompt must physically contain 0 instances of 루미');

// Middle math prompt check
const middleRawContext = {
  ...mixedRawContext,
  student: { name: '이중등', courseId: 'middle-math', courseLabel: '중등수학' },
};
const middlePrompt = buildFeedbackPrompt(middleRawContext, 'balanced');
assert.equal(middlePrompt.includes('[Python 전용 규칙]'), false);
assert.equal(middlePrompt.includes('CODE TRACE'), false);
assert.equal(middlePrompt.includes('LUMI Protocol'), false);
assert.equal(middlePrompt.includes('루미'), false);

console.log('  -> Non-Python prompts 100% clean of CODE TRACE and LUMI Protocol');

// 3.3 Python AI Prompt inclusion verification
const pythonRawContext = {
  student: { name: '박파이썬', courseId: 'python', courseLabel: 'Python' },
  currentSubmission: {
    assignmentId: 'asg_py_01',
    content: '루미 프로토콜 2개 미션과 코드 트레이스를 완료했습니다.',
    contentLength: 35,
    attachmentCount: 0,
  },
  dailyLearningSummary: {
    activityCount: 3,
    allActivityCount: 3,
    videoMinutes: 10,
    codeTraceCount: 1,
    codeTraces: [{ title: 'CODE TRACE Unit 1', completed: true }],
    lumiProtocolCount: 2,
    lumiProtocols: [
      { missionId: 'VS-01', missionTitle: '어둠 속 신호', stars: 2, completed: true },
      { missionId: 'VS-02', missionTitle: '빛의 기동', stars: 2, completed: true },
    ],
  },
  darkMatterSummary: { totalActive: 0 },
  feedbackPolicyGuidance: { isReasonableFlow: true },
};

const pyDto = buildFeedbackWhitelistDto(pythonRawContext, 'python');
assert.equal(pyDto.dailyLearningSummary.codeTraceCount, 1);
assert.equal(pyDto.dailyLearningSummary.lumiProtocolCount, 2);
assert.ok(Array.isArray(pyDto.dailyLearningSummary.lumiProtocols));

const pyPrompt = buildFeedbackPrompt(pythonRawContext, 'balanced');
assert.ok(pyPrompt.includes('[Python 전용 규칙]'), 'Python prompt must contain Python rules block');
assert.ok(pyPrompt.includes('CODE TRACE'), 'Python prompt must contain CODE TRACE');
assert.ok(pyPrompt.includes('LUMI Protocol'), 'Python prompt must contain LUMI Protocol');

console.log('  -> Python prompt contains full Python rules and DTO');

// 4. Test Fallback Assignment Feedback Isolation
console.log('[Test 4] Testing Fallback Feedback Generation Course Isolation...');
const fallbackElem = createFallbackAssignmentFeedback(mixedRawContext, 'balanced');
assert.equal(fallbackElem.studentFeedback.includes('CODE TRACE'), false);
assert.equal(fallbackElem.studentFeedback.includes('LUMI'), false);
assert.equal(fallbackElem.studentFeedback.includes('루미'), false);

const fallbackPy = createFallbackAssignmentFeedback(pythonRawContext, 'balanced');
assert.ok(fallbackPy.studentFeedback.includes('LUMI Protocol 완료 2건') || fallbackPy.studentFeedback.includes('CODE TRACE'));
console.log('  -> Fallback feedback course isolation verified');

console.log('=== All Phase 9 Tests Passed! ===\n');
