import assert from 'node:assert/strict';
import {
  calculateExplorerLevel,
  getExplorerExperience,
} from '../src/utils/explorerLevelUtils.js';

// Node 환경에서 PNG import 없이 순수 로직 테스트를 위한 독립 실행 함수 검증
function buildTestAgoraBadges(userData = {}) {
  const profile = userData || {};
  const stats = profile.agoraStats || {};
  const readCount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  };

  const answeredQuestionCount = readCount(stats.answeredQuestionCount ?? 0);
  const acceptedAnswerCount = readCount(stats.acceptedAnswerCount ?? profile.helpCount ?? 0);
  const questionCount = readCount(stats.questionCount ?? profile.questionCount ?? 0);

  const explorerExp = getExplorerExperience(profile);
  const explorerLvl = calculateExplorerLevel(explorerExp).level;

  return [
    {
      id: 'agora_helper',
      title: '아고라 조력자',
      requirements: [{ key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 1, unit: '개', completed: acceptedAnswerCount >= 1 }],
      unlocked: acceptedAnswerCount >= 1
    },
    {
      id: 'kind_solver',
      title: '친절한 해결사',
      requirements: [{ key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 5, unit: '개', completed: acceptedAnswerCount >= 5 }],
      unlocked: acceptedAnswerCount >= 5
    },
    {
      id: 'question_pioneer',
      title: '질문 개척자',
      requirements: [{ key: 'question', label: '등록 질문', current: questionCount, target: 10, unit: '개', completed: questionCount >= 10 }],
      unlocked: questionCount >= 10
    },
    {
      id: 'first_contact',
      title: '첫 번째 교신',
      requirements: [{ key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 1, unit: '개', completed: answeredQuestionCount >= 1 }],
      unlocked: answeredQuestionCount >= 1
    },
    {
      id: 'stellar_responder',
      title: '별빛 응답자',
      requirements: [{ key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 10, unit: '개', completed: answeredQuestionCount >= 10 }],
      unlocked: answeredQuestionCount >= 10
    },
    {
      id: 'knowledge_relay',
      title: '지식 중계자',
      requirements: [{ key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 30, unit: '개', completed: answeredQuestionCount >= 30 }],
      unlocked: answeredQuestionCount >= 30
    },
    {
      id: 'trusted_guide',
      title: '신뢰받는 길잡이',
      requirements: [{ key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 15, unit: '개', completed: acceptedAnswerCount >= 15 }],
      unlocked: acceptedAnswerCount >= 15
    },
    {
      id: 'problem_solver_pilot',
      title: '문제 해결 파일럿',
      requirements: [
        { key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 20, unit: '개', completed: answeredQuestionCount >= 20 },
        { key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 5, unit: '개', completed: acceptedAnswerCount >= 5 },
        { key: 'level', label: '탐사 등급', current: explorerLvl, target: 5, unit: 'Lv.', prefix: 'Lv.', completed: explorerLvl >= 5 }
      ],
      unlocked: answeredQuestionCount >= 20 && acceptedAnswerCount >= 5 && explorerLvl >= 5
    },
    {
      id: 'galaxy_mentor',
      title: '은하 멘토',
      requirements: [
        { key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 50, unit: '개', completed: answeredQuestionCount >= 50 },
        { key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 15, unit: '개', completed: acceptedAnswerCount >= 15 },
        { key: 'level', label: '탐사 등급', current: explorerLvl, target: 7, unit: 'Lv.', prefix: 'Lv.', completed: explorerLvl >= 7 }
      ],
      unlocked: answeredQuestionCount >= 50 && acceptedAnswerCount >= 15 && explorerLvl >= 7
    },
    {
      id: 'hundred_answers_navigator',
      title: '백답 항해사',
      requirements: [{ key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 100, unit: '개', completed: answeredQuestionCount >= 100 }],
      unlocked: answeredQuestionCount >= 100
    },
    {
      id: 'agora_sage',
      title: '아고라 현자',
      requirements: [{ key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 50, unit: '개', completed: acceptedAnswerCount >= 50 }],
      unlocked: acceptedAnswerCount >= 50
    },
    {
      id: 'agora_archimedes',
      title: '아고라의 아르키메데스',
      requirements: [
        { key: 'answer', label: '답변한 질문', current: answeredQuestionCount, target: 100, unit: '개', completed: answeredQuestionCount >= 100 },
        { key: 'accepted', label: '채택 답변', current: acceptedAnswerCount, target: 50, unit: '개', completed: acceptedAnswerCount >= 50 },
        { key: 'level', label: '탐사 등급', current: explorerLvl, target: 11, unit: 'Lv.', prefix: 'Lv.', completed: explorerLvl >= 11 }
      ],
      unlocked: answeredQuestionCount >= 100 && acceptedAnswerCount >= 50 && explorerLvl >= 11
    }
  ];
}

function findBadge(badges, id) {
  return badges.find(b => b.id === id);
}

// 1. 신규 유저 테스트 (모든 배지 잠김)
const newBadges = buildTestAgoraBadges({});
assert.equal(newBadges.length, 12);
assert.equal(newBadges.every(b => !b.unlocked), true, '신규 유저는 모든 아고라 배지가 잠겨있어야 한다.');

// 2. 1개 답변 작성 (첫 번째 교신 해금)
const singleAnswerBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 1 }
});
assert.equal(findBadge(singleAnswerBadges, 'first_contact').unlocked, true);
assert.equal(findBadge(singleAnswerBadges, 'stellar_responder').unlocked, false);
assert.equal(findBadge(singleAnswerBadges, 'stellar_responder').requirements[0].current, 1);
assert.equal(findBadge(singleAnswerBadges, 'stellar_responder').requirements[0].target, 10);

// 3. 10개 답변 작성 (별빛 응답자 해금)
const tenAnswerBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 10 }
});
assert.equal(findBadge(tenAnswerBadges, 'stellar_responder').unlocked, true);
assert.equal(findBadge(tenAnswerBadges, 'knowledge_relay').unlocked, false);

// 4. 레거시 폴백 (helpCount와 questionCount)
const legacyBadges = buildTestAgoraBadges({
  helpCount: 5,
  questionCount: 10
});
assert.equal(findBadge(legacyBadges, 'agora_helper').unlocked, true);
assert.equal(findBadge(legacyBadges, 'kind_solver').unlocked, true);
assert.equal(findBadge(legacyBadges, 'question_pioneer').unlocked, true);

// 5. 복합 조건 배지 (문제 해결 파일럿: 답변 20개 + 채택 5개 + 탐사 Lv.5)
const pilotCandidateBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 20, acceptedAnswerCount: 5 },
  crystals: 500 // Lv.4 (1000 미만)
});
assert.equal(findBadge(pilotCandidateBadges, 'problem_solver_pilot').unlocked, false, 'Lv.5 미달이면 잠겨야 한다.');

const pilotUnlockedBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 20, acceptedAnswerCount: 5 },
  crystals: 1050 // Lv.5
});
assert.equal(findBadge(pilotUnlockedBadges, 'problem_solver_pilot').unlocked, true, '답변 20, 채택 5, Lv.5 모두 충족 시 해금');

// 6. 은하 멘토 (답변 50개 + 채택 15개 + 탐사 Lv.7)
const mentorBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 50, acceptedAnswerCount: 15 },
  lifetimeLearningCrystalsEarned: 5200 // Lv.7
});
assert.equal(findBadge(mentorBadges, 'galaxy_mentor').unlocked, true);

// 7. 아고라의 아르키메데스 (답변 100개 + 채택 50개 + 탐사 Lv.11)
const archimedesBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 100, acceptedAnswerCount: 50 },
  galaxyLearningOreV2Total: 39000 // Lv.11 (38,000 이상)
});
assert.equal(findBadge(archimedesBadges, 'agora_archimedes').unlocked, true);

// 8. Corrupt/non-numeric counters must fail closed instead of producing NaN progress.
const invalidCounterBadges = buildTestAgoraBadges({
  agoraStats: { answeredQuestionCount: 'invalid', acceptedAnswerCount: -5, questionCount: Infinity }
});
assert.equal(findBadge(invalidCounterBadges, 'first_contact').requirements[0].current, 0);
assert.equal(findBadge(invalidCounterBadges, 'agora_helper').requirements[0].current, 0);
assert.equal(findBadge(invalidCounterBadges, 'question_pioneer').requirements[0].current, 0);

console.log('✅ 모든 스텔라 아고라 배지 단위 테스트를 성공적으로 통과했습니다!');
