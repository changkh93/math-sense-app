export const STUDY_CREW_MISSION_MAX_LENGTH = 60;

export const STUDY_CREW_DAILY_MISSIONS = [
  { id: 'mood_color', category: '아이스브레이킹', title: '오늘의 기분 색깔', prompt: '오늘 기분을 색깔 하나와 이유 한마디로 표현해보세요.' },
  { id: 'study_goal', category: '학습 시작', title: '오늘의 집중 목표', prompt: '오늘 함께 있는 동안 집중하고 싶은 목표를 한 줄로 남겨보세요.' },
  { id: 'favorite_snack', category: '취향 공유', title: '집중 간식', prompt: '공부할 때 먹고 싶은 간식 하나를 공유해보세요.' },
  { id: 'small_good_news', category: '아이스브레이킹', title: '최근 좋았던 일', prompt: '최근에 기분 좋았던 일을 아주 짧게 하나만 공유해보세요.' },
  { id: 'encourage_friend', category: '서로 응원', title: '응원 한마디', prompt: '오늘 같이 공부하는 멤버에게 짧은 응원 한마디를 남겨보세요.' },
  { id: 'focus_tip', category: '집중 준비', title: '나만의 집중법', prompt: '내가 집중할 때 도움이 되는 방법 하나를 알려주세요.' },
  { id: 'help_signal', category: '협업 약속', title: '도움 요청 신호', prompt: '공부하다 도움이 필요할 때 어떤 말로 알려주면 좋을지 적어보세요.' },
  { id: 'opening_sentence', category: '아이스브레이킹', title: '오늘의 시작 한 문장', prompt: '오늘 스터디를 시작하는 마음을 한 문장으로 남겨보세요.' },
  { id: 'good_place', category: '취향 공유', title: '좋아하는 공부 장소', prompt: '내가 공부가 잘 되는 장소 유형을 하나 말해보세요.' },
  { id: 'thank_you', category: '서로 응원', title: '고마운 점 찾기', prompt: '오늘 함께 공부하는 멤버에게 고마운 점을 하나 찾아 적어보세요.' },
  { id: 'question_for_friend', category: '대화 시작', title: '친구에게 물어볼 것', prompt: '오늘 같이 공부하는 친구에게 물어보고 싶은 가벼운 질문을 하나 적어보세요.' },
  { id: 'break_style', category: '취향 공유', title: '쉬는 방식', prompt: '공부하다 쉴 때 내가 좋아하는 쉬는 방법을 공유해보세요.' },
  { id: 'focus_word', category: '집중 준비', title: '오늘의 키워드', prompt: '오늘 내 집중 상태를 지켜줄 단어 하나를 정해보세요.' },
  { id: 'next_promise', category: '다음 만남', title: '다음 만남 약속', prompt: '다음에 다시 만나면 지키고 싶은 작은 약속 하나를 적어보세요.' },
];

export function getTodayStudyCrewMissionKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export function getStudyCrewMissionForDate(dateKey) {
  const seed = String(dateKey || '').replaceAll('-', '');
  const numericSeed = Number(seed) || 0;
  return STUDY_CREW_DAILY_MISSIONS[numericSeed % STUDY_CREW_DAILY_MISSIONS.length];
}
