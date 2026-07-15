import { getOptionText } from './quizOptionLengthAudit';

export const OPTION_BOILERPLATE_RULES = [
  {
    id: 'scene-context-prefix',
    label: '“해당 장면의 구체적인 단서…” 같은 메타 문구',
    pattern: /해당 장면의 구체적인 단서/,
  },
  {
    id: 'work-context-prefix',
    label: '“작품의 맥락에서” 같은 메타 문구',
    pattern: /작품의 맥락에서/,
  },
  {
    id: 'whole-work-flow-prefix',
    label: '“작품 전체의 인물·사건 흐름…” 같은 메타 문구',
    pattern: /작품 전체의 인물[·ㆍ,]?사건 흐름/,
  },
  {
    id: 'generic-context-prefix',
    label: '“해당 장면과 작품 전체의 맥락을 기준으로” 같은 메타 문구',
    pattern: /해당 장면과 작품 전체의 맥락을 기준으로/,
  },
  {
    id: 'generated-description-ending',
    label: '길이를 늘리기 위한 “~라는 설명” 문구',
    pattern: /(?:중심 상징으로 해석하는|핵심 내용으로 제시하는|직접적이고 결정적인 원인이었다는) 설명[.!?]?$/,
  },
  {
    id: 'quoted-description-ending',
    label: '길이를 늘리기 위한 인용형 설명 문구',
    pattern: /(?:이라는|라는) (?:이유 설명|반응이나 상태|상징 해석|설명)[.!?]?$/,
  },
];

export function auditQuizOptionStyle(options = []) {
  const matches = (Array.isArray(options) ? options : []).flatMap((option, index) => {
    const text = getOptionText(option).trim();
    return OPTION_BOILERPLATE_RULES
      .filter((rule) => rule.pattern.test(text))
      .map((rule) => ({ index, text, ruleId: rule.id, label: rule.label }));
  });

  return {
    suspicious: matches.length > 0,
    matches,
  };
}
