export const BOOK_STATUSES = {
  READING: 'reading',
  COMPLETED: 'completed',
  PAUSED: 'paused'
};

export const BOOK_STATUS_LABELS = {
  [BOOK_STATUSES.READING]: '읽고 있어요',
  [BOOK_STATUSES.COMPLETED]: '완독했어요',
  [BOOK_STATUSES.PAUSED]: '읽기 중단 중입니다'
};

export const BOOK_STATUS_COLORS = {
  [BOOK_STATUSES.READING]: {
    border: '#00f3ff',
    bg: 'rgba(0, 243, 255, 0.12)',
    text: '#00f3ff',
    badgeBg: 'rgba(0, 243, 255, 0.2)'
  },
  [BOOK_STATUSES.COMPLETED]: {
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#34d399',
    badgeBg: 'rgba(16, 185, 129, 0.2)'
  },
  [BOOK_STATUSES.PAUSED]: {
    border: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.12)',
    text: '#c084fc',
    badgeBg: 'rgba(167, 139, 250, 0.2)'
  }
};

export const LOG_EVENT_TYPES = {
  PROGRESS: 'progress',
  STATUS_CHANGE: 'status_change',
  CORRECTION: 'correction'
};

export const LOG_SOURCES = {
  ASSIGNMENT: 'assignment',
  BOOKSHELF: 'bookshelf'
};

export const ERROR_MESSAGES = {
  BOOK_NOT_FOUND: '선택한 책을 찾을 수 없거나 보관 처리되었습니다.',
  BOOK_FORBIDDEN: '책에 대한 접근 권한이 없습니다.',
  INVALID_BOOK_TITLE: '책 제목은 1~200자 사이여야 합니다.',
  INVALID_BOOK_AUTHOR: '저자는 1~120자 사이여야 합니다.',
  INVALID_BOOK_STATUS: '올바른 독서 상태를 선택해 주세요.',
  INVALID_READING_PAGE: '페이지는 1~99,999 범위의 정수여야 합니다.',
  INVALID_READ_AT: '읽은 날짜와 시각이 올바르지 않습니다.',
  ASSIGNMENT_LOCKED: '관리자 검토가 완료된 과제는 수정할 수 없습니다.',
  BOOK_CHANGE_LOCKED: '첫 제출 이후에는 연결된 책을 변경할 수 없습니다.',
  SUBMISSION_PERIOD_EXPIRED: '과제 제출 가능 기간(최근 7일)이 지났습니다.',
  DUPLICATE_COMMAND: '이미 처리된 요청입니다.',
  READING_WRITE_FAILED: '독서 기록 저장에 실패했습니다. 다시 시도해 주세요.'
};

export function normalizeString(val = '') {
  return String(val || '').replace(/\s+/g, '').toLowerCase().trim();
}

export function cleanText(val = '', maxLen = 200) {
  return String(val || '').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function validateBookForm({ title, author, status = BOOK_STATUSES.READING }) {
  const fullTitle = String(title || '').replace(/\s+/g, ' ').trim();
  const fullAuthor = String(author || '').replace(/\s+/g, ' ').trim();
  const cleanedTitle = cleanText(title, 200);
  const cleanedAuthor = cleanText(author, 120);

  if (!fullTitle || fullTitle.length > 200) {
    return { valid: false, error: 'INVALID_BOOK_TITLE', message: '책 제목을 입력해 주세요.' };
  }
  if (!fullAuthor || fullAuthor.length > 120) {
    return { valid: false, error: 'INVALID_BOOK_AUTHOR', message: '저자를 입력해 주세요.' };
  }
  if (!Object.values(BOOK_STATUSES).includes(status)) {
    return { valid: false, error: 'INVALID_BOOK_STATUS', message: '올바른 독서 상태를 선택해 주세요.' };
  }

  return {
    valid: true,
    title: cleanedTitle,
    author: cleanedAuthor,
    status
  };
}

export function validatePageInput(page) {
  const num = Number(page);
  if (!Number.isInteger(num) || num < 1 || num > 99999) {
    return { valid: false, message: '페이지는 1~99,999 범위의 정수를 입력해 주세요.' };
  }
  return { valid: true, page: num };
}

export function getErrorMessage(code, fallback = '오류가 발생했습니다.') {
  return ERROR_MESSAGES[code] || fallback;
}
