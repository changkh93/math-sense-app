export const READING_SHARE_KINDS = {
  READING_INVITATION: 'reading_invitation',
  COMPLETED_RECOMMENDATION: 'completed_recommendation',
};

export function getReadingShareKind(share = {}) {
  if (share.shareKind === READING_SHARE_KINDS.COMPLETED_RECOMMENDATION) {
    return READING_SHARE_KINDS.COMPLETED_RECOMMENDATION;
  }
  if (share.shareKind === READING_SHARE_KINDS.READING_INVITATION) {
    return READING_SHARE_KINDS.READING_INVITATION;
  }
  return share.bookSnapshot?.status === 'completed'
    ? READING_SHARE_KINDS.COMPLETED_RECOMMENDATION
    : READING_SHARE_KINDS.READING_INVITATION;
}

export function getReadingShareStage(share = {}) {
  const kind = getReadingShareKind(share);
  if (kind === READING_SHARE_KINDS.COMPLETED_RECOMMENDATION) {
    return { kind, label: '완독 · 추천해요', shortLabel: '완독 추천' };
  }

  const progressValue = share.bookSnapshot?.progressPercent;
  const rawPercent = Number(progressValue);
  const hasPercent = progressValue !== null && progressValue !== undefined && progressValue !== '' &&
    Number.isFinite(rawPercent) && rawPercent >= 0 && rawPercent <= 100;
  const percent = hasPercent ? Math.round(rawPercent) : null;
  return {
    kind,
    label: `읽는 중${percent === null ? '' : ` ${percent}%`} · 같이 읽어요`,
    shortLabel: `같이 읽어요${percent === null ? '' : ` · ${percent}%`}`,
  };
}

export function getBookShareStage(book = {}) {
  if (book.status === 'completed') {
    return { kind: READING_SHARE_KINDS.COMPLETED_RECOMMENDATION, label: '완독 · 이 책을 추천해요' };
  }

  const totalPages = Number(book.totalPages || 0);
  const furthestPage = Number(book.progress?.furthestPage || 0);
  const percent = totalPages > 0
    ? Math.max(0, Math.min(100, Math.round((furthestPage / totalPages) * 100)))
    : null;
  return {
    kind: READING_SHARE_KINDS.READING_INVITATION,
    label: `읽는 중${percent === null ? '' : ` ${percent}%`} · 같이 읽어요`,
  };
}
