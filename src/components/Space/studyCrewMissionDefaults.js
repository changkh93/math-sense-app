export const STUDY_CREW_MISSION_MAX_LENGTH = 60;

export const STUDY_CREW_DAILY_MISSIONS = [
  { id: 'mood_color', category: '아이스브레이킹', title: '오늘의 기분 색깔', prompt: '오늘 기분을 색깔 하나와 이유 한마디로 표현해보세요.' },
  { id: 'study_goal', category: '학습 목표', title: '오늘의 목표', prompt: '오늘 집중방에서 끝내고 싶은 공부 목표를 한 줄로 남겨보세요.' },
  { id: 'favorite_snack', category: '취향 공유', title: '집중 간식', prompt: '공부할 때 먹고 싶은 간식 하나를 공유해보세요.' },
  { id: 'mistake_share', category: '수학 습관', title: '자주 하는 실수', prompt: '수학 문제를 풀 때 내가 자주 하는 실수 하나를 적어보세요.' },
  { id: 'encourage_friend', category: '서로 응원', title: '응원 한마디', prompt: '오늘 같이 공부하는 멤버에게 짧은 응원 한마디를 남겨보세요.' },
  { id: 'focus_tip', category: '학습 습관', title: '나만의 집중법', prompt: '내가 집중할 때 도움이 되는 방법 하나를 알려주세요.' },
  { id: 'hard_problem', category: '수학 대화', title: '막히는 순간', prompt: '어려운 문제를 만났을 때 나는 어떻게 버티는지 적어보세요.' },
  { id: 'one_sentence_math', category: '수학 대화', title: '오늘의 수학 한 문장', prompt: '오늘 배운 수학 내용을 한 문장으로 설명해보세요.' },
  { id: 'good_place', category: '취향 공유', title: '좋아하는 공부 장소', prompt: '내가 공부가 잘 되는 장소 유형을 하나 말해보세요.' },
  { id: 'thank_you', category: '서로 응원', title: '고마운 점 찾기', prompt: '오늘 함께 공부하는 멤버에게 고마운 점을 하나 찾아 적어보세요.' },
  { id: 'problem_for_friend', category: '수학 대화', title: '친구에게 낼 문제', prompt: '친구에게 내고 싶은 아주 짧은 수학 문제 아이디어를 적어보세요.' },
  { id: 'break_style', category: '취향 공유', title: '쉬는 방식', prompt: '공부하다 쉴 때 내가 좋아하는 쉬는 방법을 공유해보세요.' },
  { id: 'proud_today', category: '학습 회고', title: '오늘의 뿌듯함', prompt: '오늘 공부하면서 가장 뿌듯했던 순간을 한 줄로 남겨보세요.' },
  { id: 'tomorrow_promise', category: '서로 응원', title: '내일의 약속', prompt: '내일 다시 공부한다면 꼭 지키고 싶은 약속 하나를 적어보세요.' },
];

export function getTodayStudyCrewMissionKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function getStudyCrewMissionForDate(dateKey) {
  const seed = String(dateKey || '').replaceAll('-', '');
  const numericSeed = Number(seed) || 0;
  return STUDY_CREW_DAILY_MISSIONS[numericSeed % STUDY_CREW_DAILY_MISSIONS.length];
}
