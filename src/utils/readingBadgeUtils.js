const readCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

export function buildReadingBadges(userData = {}) {
  const profile = userData || {};
  const stats = profile.readingStats || {};

  const readingDayCount = readCount(stats.readingDayCount ?? 0);
  const currentReadingStreak = readCount(stats.currentReadingStreak ?? 0);
  const longestReadingStreak = readCount(stats.longestReadingStreak ?? currentReadingStreak);
  const reviewedAssignmentCount = readCount(stats.reviewedAssignmentCount ?? 0);
  const validCompletedBookCount = readCount(stats.validCompletedBookCount ?? 0);

  return [
    // 1. 입문 배지
    {
      id: 'first_bookmark',
      title: '첫 책갈피',
      icon: '🔖',
      category: 'reading',
      requirements: [
        {
          key: 'readingDay',
          label: '독서일',
          current: readingDayCount,
          target: 1,
          unit: '일',
          completed: readingDayCount >= 1,
        },
      ],
      unlocked: readingDayCount >= 1,
      desc: '첫 번째 유효한 고전 독서 기록을 남겼습니다.',
    },

    // 2. 습관 배지
    {
      id: 'weekly_reading_voyager',
      title: '일주일 독서 항해',
      icon: '⛵',
      category: 'reading',
      requirements: [
        {
          key: 'readingDay',
          label: '고유 독서일',
          current: readingDayCount,
          target: 7,
          unit: '일',
          completed: readingDayCount >= 7,
        },
      ],
      unlocked: readingDayCount >= 7,
      desc: '고전 독서를 7일 이상 꾸준히 실천했습니다.',
    },
    {
      id: 'moonlight_reader',
      title: '달빛 독서가',
      icon: '🌕',
      category: 'reading',
      requirements: [
        {
          key: 'readingDay',
          label: '고유 독서일',
          current: readingDayCount,
          target: 30,
          unit: '일',
          completed: readingDayCount >= 30,
        },
      ],
      unlocked: readingDayCount >= 30,
      desc: '달이 차오르듯 30일 동안 고전 독서를 기록했습니다.',
    },
    {
      id: 'hundred_reading_days',
      title: '백일의 기록자',
      icon: '📜',
      category: 'reading',
      requirements: [
        {
          key: 'readingDay',
          label: '고유 독서일',
          current: readingDayCount,
          target: 100,
          unit: '일',
          completed: readingDayCount >= 100,
        },
      ],
      unlocked: readingDayCount >= 100,
      desc: '100일간 지혜의 문장을 쌓아 올린 끈기 있는 기록자입니다.',
    },

    // 3. 연속(스트릭) 배지
    {
      id: 'unfading_reading_lamp',
      title: '꺼지지 않는 독서등',
      icon: '🕯️',
      category: 'reading',
      requirements: [
        {
          key: 'streak',
          label: '연속 독서',
          current: longestReadingStreak,
          target: 7,
          unit: '일',
          completed: longestReadingStreak >= 7,
        },
      ],
      unlocked: longestReadingStreak >= 7,
      desc: '7일 연속으로 독서등을 밝히며 하루를 마무리했습니다.',
    },
    {
      id: 'galactic_reading_habit',
      title: '은하의 독서 습관',
      icon: '🌌',
      category: 'reading',
      requirements: [
        {
          key: 'streak',
          label: '연속 독서',
          current: longestReadingStreak,
          target: 30,
          unit: '일',
          completed: longestReadingStreak >= 30,
        },
      ],
      unlocked: longestReadingStreak >= 30,
      desc: '30일 연속 독서 스트릭으로 굳건한 독서 습관을 완성했습니다.',
    },

    // 4. 검증(과제) 배지
    {
      id: 'first_reading_logbook',
      title: '첫 항행 일지',
      icon: '📓',
      category: 'reading',
      requirements: [
        {
          key: 'reviewedAssignment',
          label: '검토 완료 과제',
          current: reviewedAssignmentCount,
          target: 1,
          unit: '개',
          completed: reviewedAssignmentCount >= 1,
        },
      ],
      unlocked: reviewedAssignmentCount >= 1,
      desc: '선생님의 검토를 마친 첫 번째 고전 독서 항행 일지를 남겼습니다.',
    },
    {
      id: 'reflective_chronicler',
      title: '사유의 기록자',
      icon: '🖋️',
      category: 'reading',
      requirements: [
        {
          key: 'reviewedAssignment',
          label: '검토 완료 과제',
          current: reviewedAssignmentCount,
          target: 10,
          unit: '개',
          completed: reviewedAssignmentCount >= 10,
        },
      ],
      unlocked: reviewedAssignmentCount >= 10,
      desc: '10편의 검토 완료 독서 과제로 깊이 있는 사유를 기록했습니다.',
    },

    // 5. 완독 배지
    {
      id: 'one_book_universe',
      title: '한 권의 우주',
      icon: '🪐',
      category: 'reading',
      requirements: [
        {
          key: 'completedBook',
          label: '유효 완독',
          current: validCompletedBookCount,
          target: 1,
          unit: '권',
          completed: validCompletedBookCount >= 1,
        },
      ],
      unlocked: validCompletedBookCount >= 1,
      desc: '한 권의 고전 명작을 온전히 끝까지 읽어냈습니다.',
    },
    {
      id: 'classic_bookshelf_keeper',
      title: '작은 고전 서재',
      icon: '📚',
      category: 'reading',
      requirements: [
        {
          key: 'completedBook',
          label: '유효 완독',
          current: validCompletedBookCount,
          target: 5,
          unit: '권',
          completed: validCompletedBookCount >= 5,
        },
      ],
      unlocked: validCompletedBookCount >= 5,
      desc: '5권의 고전을 완독하여 나만의 작은 지혜의 서재를 만들었습니다.',
    },
    {
      id: 'library_of_stars',
      title: '별들의 도서관',
      icon: '✨',
      category: 'reading',
      requirements: [
        {
          key: 'completedBook',
          label: '유효 완독',
          current: validCompletedBookCount,
          target: 12,
          unit: '권',
          completed: validCompletedBookCount >= 12,
        },
      ],
      unlocked: validCompletedBookCount >= 12,
      desc: '12권 이상의 고전을 완독한 우수한 고전 탐서가입니다.',
    },

    // 6. 전설 배지
    {
      id: 'galactic_archivist',
      title: '은하 기록보관자',
      icon: '🏛️',
      category: 'reading',
      requirements: [
        {
          key: 'readingDay',
          label: '독서일',
          current: readingDayCount,
          target: 100,
          unit: '일',
          completed: readingDayCount >= 100,
        },
        {
          key: 'completedBook',
          label: '유효 완독',
          current: validCompletedBookCount,
          target: 12,
          unit: '권',
          completed: validCompletedBookCount >= 12,
        },
        {
          key: 'reviewedAssignment',
          label: '검토 과제',
          current: reviewedAssignmentCount,
          target: 30,
          unit: '개',
          completed: reviewedAssignmentCount >= 30,
        },
      ],
      unlocked: readingDayCount >= 100 && validCompletedBookCount >= 12 && reviewedAssignmentCount >= 30,
      desc: '독서일 100일 + 완독 12권 + 검토 과제 30개를 달성한 전설의 은하 기록보관자입니다.',
    },
  ];
}
