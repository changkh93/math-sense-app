import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, BookOpen, CalendarDays, ChevronRight, Flame, LibraryBig, LoaderCircle, Map as MapIcon, MessageCircle, PenLine, Shield, Sparkles, Star, Trophy, TrendingUp, X, Zap } from 'lucide-react';
import { collection, doc, documentId, getDoc, getDocs, limit, orderBy, query, startAfter, Timestamp, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import StarField from '../../components/Space/StarField';
import CometBadge from '../../components/Space/CometBadge';
import ModularShip from '../../components/Space/ModularShip';
import { useProfileSectionVisible } from '../../hooks/useProfileSectionVisible';
import { profileQueryOptions, withProfileTimeout } from '../../utils/profileQueryOptions';
import ProfileAvatar from '../../components/ProfileAvatar';
import ProfileSectionBoundary from '../../components/ProfileSectionBoundary';
import { getEffectiveStreak, getMondayKSTKey, getTodayKST } from '../../utils/streakUtils';
import { calculateSEI } from '../../utils/rankingUtils';
import { getBaseTheme, getFrameSurfaceStyles, getProfileFrame, isHallSpotlightActive } from '../../utils/socialUtils';
import { resolveProfileImageUrl } from '../../utils/profileImageUtils';
import { parseInlineFormatting } from '../../utils/formatUtils';
import { buildCollectionBadges, isBadgeUpgradeOwned } from '../../utils/badgeUtils';
import { getActiveShipFamily, getShipGrade } from '../../utils/shipCatalog';
import auroraObservatoryImage from '../../assets/themes/aurora-observatory.jpg';
import goldenArchiveImage from '../../assets/themes/golden-archive.jpg';
import deepSeaLabImage from '../../assets/themes/deep-sea-lab.jpg';
import lunarLibraryImage from '../../assets/themes/lunar-library.jpg';
import crystalCavernImage from '../../assets/themes/crystal-cavern.svg';
import marsGreenhouseImage from '../../assets/themes/mars-greenhouse.svg';
import quantumTerminalImage from '../../assets/themes/quantum-terminal.svg';
import cometCampImage from '../../assets/themes/comet-camp.svg';
import infinityGardenImage from '../../assets/themes/infinity-garden.svg';
import './PublicProfile.css';

const MotionDiv = motion.div;
const CertificateAwardsBoard = React.lazy(() => import('../../components/Space/CertificateAwardsBoard'));
const EMPTY_ITEMS = [];

function ProfileSectionStatus({ title, request }) {
  return (
    <div className="public-profile-section-status" role="status">
      <span>{request.isError ? `${title}을 불러오지 못했습니다.` : `${title}을 불러오는 중…`}</span>
      {request.isError && <button type="button" disabled={request.isFetching} onClick={() => request.refetch()}>다시 시도</button>}
    </div>
  );
}
const BASE_THEME_IMAGES = {
  aurora_observatory: auroraObservatoryImage,
  solar_archive: goldenArchiveImage,
  deep_lab: deepSeaLabImage,
  lunar_library: lunarLibraryImage,
  crystal_cavern: crystalCavernImage,
  mars_greenhouse: marsGreenhouseImage,
  quantum_terminal: quantumTerminalImage,
  comet_camp: cometCampImage,
  infinity_garden: infinityGardenImage,
};

const CONCEPT_STATUS_META = {
  conquered: { label: '정복', icon: '🏁', tone: '#34d399' },
  refining: { label: '재정제 필요', icon: '🔧', tone: '#f59e0b' },
  learning: { label: '학습 중', icon: '🛰️', tone: '#38bdf8' },
};

const PROFILE_BOOK_STATUS_META = {
  reading: { label: '읽고 있어요', shortLabel: '읽는 중', icon: '✦' },
  completed: { label: '완독했어요', shortLabel: '완독', icon: '★' },
  paused: { label: '읽기 중단 중입니다', shortLabel: '잠시 멈춤', icon: 'Ⅱ' },
};

const PROFILE_BOOK_PALETTES = [
  { cover: '#7f1d35', shade: '#3f0718', edge: '#fda4af', foil: '#fde68a' },
  { cover: '#1e3a8a', shade: '#0f172a', edge: '#93c5fd', foil: '#dbeafe' },
  { cover: '#065f46', shade: '#022c22', edge: '#6ee7b7', foil: '#fef3c7' },
  { cover: '#92400e', shade: '#451a03', edge: '#fcd34d', foil: '#fef3c7' },
  { cover: '#6b21a8', shade: '#2e1065', edge: '#d8b4fe', foil: '#fef3c7' },
  { cover: '#115e59', shade: '#042f2e', edge: '#5eead4', foil: '#ccfbf1' },
  { cover: '#9a3412', shade: '#431407', edge: '#fdba74', foil: '#ffedd5' },
  { cover: '#334155', shade: '#0f172a', edge: '#cbd5e1', foil: '#f8fafc' },
];

const PROFILE_BOOKSHELF_PREVIEW_SIZE = 12;
const PROFILE_BOOKSHELF_PAGE_SIZE = 24;

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const HEATMAP_MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function getDisplayName(profile = {}) {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || '무명 탐험가';
}

function getDateLabel(value) {
  const date = value?.toDate?.() || (value?.seconds ? new Date(value.seconds * 1000) : null);
  if (!date) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function mergeBadges(...badgeGroups) {
  const seen = new Set();
  return badgeGroups
    .flat()
    .filter((badge) => badge?.unlocked)
    .filter((badge) => {
      const key = badge.id || badge.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getTimeMs(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDeterministicColorHash(str = '') {
  const text = String(str || '');
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getProfileBookStyle(book = {}) {
  const hash = getDeterministicColorHash(`${book.title || ''}__${book.author || ''}__${book.id || ''}`);
  const palette = PROFILE_BOOK_PALETTES[Math.abs(hash) % PROFILE_BOOK_PALETTES.length];
  const titleLength = Array.from(String(book.title || '')).length;
  return {
    '--profile-book-cover': palette.cover,
    '--profile-book-shade': palette.shade,
    '--profile-book-edge': palette.edge,
    '--profile-book-foil': palette.foil,
    '--profile-book-width': `${56 + (Math.abs(hash) % 3) * 6}px`,
    '--profile-book-height': `${245 + (titleLength % 5) * 6}px`,
  };
}

function normalizeProfileBook(book = {}, id = '') {
  const rawPage = Number(book.currentPage || book.progress?.furthestPage || book.progress?.latestReadPage || 0);
  return {
    id: id || book.id,
    title: String(book.title || '').slice(0, 200),
    author: String(book.author || '').slice(0, 120),
    status: PROFILE_BOOK_STATUS_META[book.status] ? book.status : 'reading',
    currentPage: Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 99999 ? rawPage : 0,
    publicShareId: typeof book.publicShareId === 'string'
      ? book.publicShareId
      : (book.publicShare?.status === 'active' && typeof book.publicShare?.shareId === 'string' ? book.publicShare.shareId : null),
  };
}

async function fetchProfileBookshelfPage({ userId, cursor = null, pageSize = PROFILE_BOOKSHELF_PREVIEW_SIZE, allowOwnerFallback = false }) {
  try {
    const getPublicReadingBookshelf = httpsCallable(functions, 'getPublicReadingBookshelf', { timeout: 8_000 });
    const response = await getPublicReadingBookshelf({ userId, cursor, limit: pageSize });
    return {
      books: Array.isArray(response.data?.books) ? response.data.books.map((book) => normalizeProfileBook(book)) : [],
      hasMore: response.data?.hasMore === true,
      nextCursor: response.data?.nextCursor || null,
    };
  } catch (error) {
    if (!allowOwnerFallback) throw error;

    // Owner-only transitional fallback for client-first deployments. It uses
    // the same bounded index/cursor strategy, so a callable outage cannot
    // accidentally turn a profile visit into an unbounded collection read.
    const fallbackConstraints = [
      where('userId', '==', userId),
      where('archivedAt', '==', null),
      orderBy('createdAt', 'desc'),
      orderBy(documentId(), 'desc'),
    ];
    if (cursor?.createdAtMs && cursor?.bookId) {
      fallbackConstraints.push(startAfter(Timestamp.fromMillis(Number(cursor.createdAtMs)), cursor.bookId));
    }
    fallbackConstraints.push(limit(pageSize + 1));

    const booksSnap = await getDocs(query(collection(db, 'readingBooks'), ...fallbackConstraints));
    const pageDocs = booksSnap.docs.slice(0, pageSize);
    const page = pageDocs.map((bookDoc) => ({ id: bookDoc.id, ...bookDoc.data() }));
    const lastBookDoc = pageDocs[pageDocs.length - 1];
    const hasMore = booksSnap.docs.length > pageSize;
    return {
      books: page.map((book) => normalizeProfileBook(book)),
      hasMore,
      nextCursor: hasMore && lastBookDoc ? {
        createdAtMs: getTimeMs(lastBookDoc.data()?.createdAt),
        bookId: lastBookDoc.id,
      } : null,
    };
  }
}

function ProfileBookSpine({ book, variant = 'preview' }) {
  const navigate = useNavigate();
  const status = PROFILE_BOOK_STATUS_META[book.status] || PROFILE_BOOK_STATUS_META.reading;
  const rawTitle = String(book.title || '').trim();
  const rawAuthor = String(book.author || '').trim();

  // Truncate long title/author for vertical spine aesthetic (fits comfortably in taller spine)
  const displayTitle = rawTitle.length > 12 ? rawTitle.slice(0, 11) + '…' : rawTitle;
  const displayAuthor = rawAuthor.length > 8 ? rawAuthor.slice(0, 7) + '…' : rawAuthor;

  const fullLabel = `${rawTitle} · ${rawAuthor} (${status.label}${book.currentPage > 0 ? `, ${book.currentPage}쪽` : ''}${book.publicShareId ? ' · 추천 글' : ''})`;

  const handleClick = () => {
    if (book.publicShareId) {
      navigate(`/agora?filter=reading&highlight=${book.publicShareId}`);
    }
  };

  return (
    <motion.div
      role="listitem"
      className={`public-profile-book-spine is-${book.status || 'reading'} is-${variant} ${book.publicShareId ? 'has-share' : ''}`}
      style={{
        ...getProfileBookStyle(book),
        cursor: book.publicShareId ? 'pointer' : 'default',
      }}
      whileHover={{ y: -12, rotate: -0.7 }}
      onClick={handleClick}
      aria-label={fullLabel}
      title={fullLabel}
    >
      {/* Top status icon & gold foil band */}
      <div className="public-profile-book-spine-top">
        <span className="public-profile-book-spine-status" aria-hidden="true">
          {book.publicShareId ? '✨' : status.icon}
        </span>
        <span className="public-profile-book-spine-band is-top" aria-hidden="true" />
      </div>

      {/* Center vertical title section */}
      <div className="public-profile-book-spine-title-area">
        <strong>{displayTitle}</strong>
      </div>

      {/* Bottom author, badges, page number and bottom band */}
      <div className="public-profile-book-spine-bottom">
        <small>{displayAuthor}</small>
        {book.publicShareId && (
          <span className="public-profile-book-share-tag">추천 글</span>
        )}
        {book.currentPage > 0 && (
          <em>{book.currentPage}p</em>
        )}
        <span className="public-profile-book-spine-band is-bottom" aria-hidden="true" />
      </div>
    </motion.div>
  );
}

function ProfileBookshelf({ books = [], hasMore, isOwnProfile, onOpenLibrary, onShowAll }) {
  const statusCounts = books.reduce((counts, book) => {
    const status = PROFILE_BOOK_STATUS_META[book.status] ? book.status : 'reading';
    counts[status] += 1;
    return counts;
  }, { reading: 0, completed: 0, paused: 0 });

  return (
    <section className="public-profile-panel public-profile-bookshelf">
      <div className="public-profile-bookshelf-heading">
        <div>
          <div className="public-profile-bookshelf-title-row">
            <LibraryBig size={19} />
            <h2>개인 독서 아카이브</h2>
            <span className="public-profile-section-count">{hasMore ? `${books.length}+` : books.length}</span>
          </div>
          <p>가장 최근에 등록한 책부터 보여주는 나만의 서가입니다.</p>
        </div>
        <div className="public-profile-bookshelf-actions">
          {(hasMore || books.length > 0) && (
            <button type="button" className="public-profile-bookshelf-open" onClick={onShowAll}>
              전체 책 보기 <ChevronRight size={16} />
            </button>
          )}
          {isOwnProfile && (
            <button type="button" className="public-profile-bookshelf-open is-secondary" onClick={onOpenLibrary}>
              책장 관리
            </button>
          )}
        </div>
      </div>

      {books.length > 0 ? (
        <>
          <div className="public-profile-bookshelf-summary" aria-label="최근 등록 도서 상태 요약">
            <span className="is-preview">최근 {books.length}권 중</span>
            <span className="is-reading"><i /> 읽는 중 <strong>{statusCounts.reading}</strong></span>
            <span className="is-completed"><i /> 완독 <strong>{statusCounts.completed}</strong></span>
            <span className="is-paused"><i /> 잠시 멈춤 <strong>{statusCounts.paused}</strong></span>
          </div>

          <div className="public-profile-bookshelf-cabinet">
            <div className="public-profile-bookshelf-scroll">
              <div className="public-profile-bookshelf-books" role="list" aria-label="등록한 책 목록">
                {books.map((book) => (
                  <ProfileBookSpine key={book.id || `${book.title}-${book.author}`} book={book} />
                ))}
              </div>
            </div>
            <div className="public-profile-bookshelf-shelf" aria-hidden="true" />
          </div>
        </>
      ) : (
        <div className="public-profile-bookshelf-empty">
          <span><BookOpen size={26} /></span>
          <div>
            <strong>첫 책을 기다리는 서가</strong>
            <p>{isOwnProfile ? '고전 읽기에서 책을 등록하면 이곳에 멋진 책등으로 나타납니다.' : '아직 이 서가에 등록된 책이 없습니다.'}</p>
          </div>
          {isOwnProfile && (
            <button type="button" onClick={onOpenLibrary}>책 등록하러 가기</button>
          )}
        </div>
      )}
    </section>
  );
}

function PublicBookshelfDialog({ books, hasMore, isLoadingMore, onLoadMore, onClose, isOwnProfile, onOpenLibrary, error }) {
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="public-profile-books-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-bookshelf-dialog-title"
        className="public-profile-books-dialog"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="public-profile-books-dialog-head">
          <div>
            <span>PERSONAL READING ARCHIVE</span>
            <h2 id="public-bookshelf-dialog-title"><LibraryBig size={20} /> 전체 책장</h2>
            <p>최신 등록순으로 {books.length}권을 불러왔습니다.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="전체 책장 닫기"><X size={20} /></button>
        </div>

        <div className="public-profile-books-dialog-list" role="list" aria-label="전체 등록 도서">
          {books.map((book) => (
            <ProfileBookSpine
              key={book.id || `${book.title}-${book.author}`}
              book={book}
              variant="dialog"
            />
          ))}
        </div>

        {error && <p role="alert">{error}</p>}
        <div className="public-profile-books-dialog-foot">
          {hasMore ? (
            <button type="button" onClick={onLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? <><LoaderCircle size={17} className="is-spinning" /> 불러오는 중</> : `다음 ${PROFILE_BOOKSHELF_PAGE_SIZE}권 보기`}
            </button>
          ) : (
            <span>등록된 책을 모두 확인했습니다.</span>
          )}
          {isOwnProfile && (
            <button type="button" className="is-manage" onClick={onOpenLibrary}>나의 책장에서 관리</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function getKSTDateKey(value) {
  const ms = getTimeMs(value);
  if (!ms) return '';
  return KST_DATE_FORMATTER.format(new Date(ms));
}

function parseDateKeyAsUTC(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUTCDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey, days) {
  const date = parseDateKeyAsUTC(dateKey);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return formatUTCDateKey(date);
}

function getProfileSeconds(profile = {}, keyGroups = []) {
  for (const keys of keyGroups) {
    for (const key of keys.seconds || []) {
      const value = Number(profile[key]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value);
    }
    for (const key of keys.minutes || []) {
      const value = Number(profile[key]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value * 60);
    }
    for (const key of keys.hours || []) {
      const value = Number(profile[key]);
      if (Number.isFinite(value) && value > 0) return Math.floor(value * 3600);
    }
  }
  return 0;
}

function getHistoryLearningSeconds(entry = {}) {
  const numericSeconds = [
    entry.focusSeconds,
    entry.studySeconds,
    entry.learningSeconds,
    entry.durationSeconds,
    entry.timeSpentSeconds,
    entry.totalVideoSeconds,
  ].map(Number).find((value) => Number.isFinite(value) && value > 0);
  if (numericSeconds) return Math.floor(numericSeconds);

  const numericMinutes = [
    entry.focusMinutes,
    entry.studyMinutes,
    entry.learningMinutes,
    entry.durationMinutes,
    entry.timeSpentMinutes,
  ].map(Number).find((value) => Number.isFinite(value) && value > 0);
  if (numericMinutes) return Math.floor(numericMinutes * 60);

  const isFocusOnlyEvent = !!entry.attentionSource
    && ['hit', 'miss'].includes(entry.attentionResult)
    && entry.attentionSource !== 'completion_bonus';
  if (isFocusOnlyEvent) return 0;

  if (['video', 'video_complete', 'video_reward'].includes(entry.type)) {
    const videoSeconds = Number(entry.videoTime || entry.sessionWatchSeconds || entry.stampedCount || 0);
    return Number.isFinite(videoSeconds) ? Math.max(0, Math.floor(videoSeconds)) : 0;
  }

  return 0;
}

function formatDuration(seconds) {
  const totalMinutes = Math.max(0, Math.floor((Number(seconds) || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours.toLocaleString()}시간 ${minutes}분`;
  if (hours > 0) return `${hours.toLocaleString()}시간`;
  return `${minutes}분`;
}

function formatDateKeyShort(dateKey) {
  const [, month, day] = String(dateKey || '').split('-');
  if (!month || !day) return dateKey || '';
  return `${Number(month)}월 ${Number(day)}일`;
}

function getChartMaxHours(maxSeconds) {
  const maxHours = maxSeconds / 3600;
  if (maxHours <= 2) return 4;
  if (maxHours <= 4) return 6;
  if (maxHours <= 8) return 10;
  if (maxHours <= 12) return 12;
  return Math.ceil(maxHours / 4) * 4;
}

function getHeatmapLevel(day) {
  const minutes = day.seconds / 60;
  const activityScore = minutes > 0 ? minutes : day.activityCount * 5;
  if (activityScore >= 120) return 4;
  if (activityScore >= 60) return 3;
  if (activityScore >= 20) return 2;
  if (activityScore > 0) return 1;
  return 0;
}

function buildLearningStats(history = [], profile = {}) {
  const todayKey = getTodayKST();
  const weekStartKey = getMondayKSTKey();
  const monthKey = todayKey.slice(0, 7);
  const dailyMap = new Map();

  history.forEach((entry) => {
    const dateKey = getKSTDateKey(entry.timestamp || entry.completedAt || entry.createdAt || entry.updatedAt);
    if (!dateKey) return;
    const current = dailyMap.get(dateKey) || { dateKey, seconds: 0, activityCount: 0 };
    current.seconds += getHistoryLearningSeconds(entry);
    current.activityCount += 1;
    dailyMap.set(dateKey, current);
  });

  const dailyItems = Array.from(dailyMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const historyTotalSeconds = dailyItems.reduce((sum, day) => sum + day.seconds, 0);
  const totalSeconds = getProfileSeconds(profile, [{
    seconds: ['totalFocusSeconds', 'totalStudySeconds', 'totalLearningSeconds', 'totalVideoSeconds'],
    minutes: ['totalFocusMinutes', 'totalStudyMinutes', 'totalLearningMinutes'],
    hours: ['totalFocusHours', 'totalStudyHours', 'totalLearningHours'],
  }]) || historyTotalSeconds;

  const recent30 = Array.from({ length: 30 }, (_, index) => {
    const dateKey = addDaysToDateKey(todayKey, index - 29);
    return dailyMap.get(dateKey) || { dateKey, seconds: 0, activityCount: 0 };
  });

  const rawHeatmapStart = addDaysToDateKey(todayKey, -364);
  const startDate = parseDateKeyAsUTC(rawHeatmapStart);
  const leadingDays = startDate ? startDate.getUTCDay() : 0;
  const heatmapStartKey = addDaysToDateKey(rawHeatmapStart, -leadingDays);
  const heatmapDays = Array.from({ length: 365 + leadingDays }, (_, index) => {
    const dateKey = addDaysToDateKey(heatmapStartKey, index);
    const day = dailyMap.get(dateKey) || { dateKey, seconds: 0, activityCount: 0 };
    return {
      ...day,
      inRange: dateKey >= rawHeatmapStart && dateKey <= todayKey,
      level: getHeatmapLevel(day),
    };
  });

  const heatmapWeeks = [];
  for (let i = 0; i < heatmapDays.length; i += 7) {
    heatmapWeeks.push(heatmapDays.slice(i, i + 7));
  }

  const monthLabels = [];
  let lastMonth = '';
  heatmapWeeks.forEach((week, index) => {
    const firstVisible = week.find((day) => day.inRange);
    if (!firstVisible) return;
    const month = firstVisible.dateKey.slice(5, 7);
    if (month !== lastMonth) {
      monthLabels.push({ index, label: HEATMAP_MONTH_LABELS[Number(month) - 1] });
      lastMonth = month;
    }
  });

  const monthSeconds = dailyItems
    .filter((day) => day.dateKey.startsWith(monthKey))
    .reduce((sum, day) => sum + day.seconds, 0);
  const weekSeconds = dailyItems
    .filter((day) => day.dateKey >= weekStartKey && day.dateKey <= todayKey)
    .reduce((sum, day) => sum + day.seconds, 0);
  const todaySeconds = dailyMap.get(todayKey)?.seconds || 0;

  return {
    totalSeconds,
    monthSeconds,
    weekSeconds,
    todaySeconds,
    activeDays: dailyItems.length,
    totalActivities: history.length,
    recent30,
    heatmapWeeks,
    monthLabels,
    hasTimedData: totalSeconds > 0 || recent30.some((day) => day.seconds > 0),
  };
}

function LearningLineChart({ points }) {
  const [hoveredPoint, setHoveredPoint] = React.useState(null);
  const width = 720;
  const height = 230;
  const padding = { top: 22, right: 18, bottom: 34, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxSeconds = Math.max(3600, ...points.map((point) => point.seconds));
  const maxHours = getChartMaxHours(maxSeconds);
  const ySteps = Array.from({ length: 5 }, (_, index) => Math.round((maxHours * index) / 4));

  const coordinates = points.map((point, index) => {
    const x = padding.left + (points.length <= 1 ? 0 : (plotWidth * index) / (points.length - 1));
    const y = padding.top + plotHeight - (Math.min(point.seconds / 3600, maxHours) / maxHours) * plotHeight;
    return { ...point, x, y };
  });
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${padding.left + plotWidth} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;

  return (
    <div className="public-profile-chart-wrap">
      <svg className="public-profile-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="최근 30일 학습 시간 그래프" preserveAspectRatio="none">
        {ySteps.map((hour) => {
          const y = padding.top + plotHeight - (hour / maxHours) * plotHeight;
          return (
            <g key={hour}>
              <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} className="public-profile-chart-grid" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="public-profile-chart-label">{hour}h</text>
            </g>
          );
        })}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} className="public-profile-chart-axis" />
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} className="public-profile-chart-axis" />
        <path d={areaPath} className="public-profile-chart-area" />
        <path d={linePath} className="public-profile-chart-line" />
        {coordinates.map((point, index) => (
          <g key={point.dateKey}>
            <circle
              cx={point.x}
              cy={point.y}
              r={point.seconds > 0 ? 4 : 2.5}
              className="public-profile-chart-dot"
              tabIndex={0}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint(point)}
              onBlur={() => setHoveredPoint(null)}
            />
            {index % 7 === 0 || index === coordinates.length - 1 ? (
              <text x={point.x} y={height - 10} textAnchor="middle" className="public-profile-chart-label">
                {Number(point.dateKey.slice(8, 10))}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      {hoveredPoint && (
        <div
          className="public-profile-chart-tooltip"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
          }}
        >
          <strong>{formatDateKeyShort(hoveredPoint.dateKey)}</strong>
          <span>{formatDuration(hoveredPoint.seconds)}</span>
          <small>활동 {hoveredPoint.activityCount}건</small>
        </div>
      )}
    </div>
  );
}

function LearningHeatmap({ weeks, monthLabels }) {
  const heatmapColumns = `repeat(${weeks.length}, minmax(0, 1fr))`;

  return (
    <div className="public-profile-heatmap-scroll">
      <div className="public-profile-heatmap-months" style={{ gridTemplateColumns: heatmapColumns }}>
        {monthLabels.map((month) => (
          <span key={`${month.index}-${month.label}`} style={{ gridColumnStart: month.index + 1 }}>{month.label}</span>
        ))}
      </div>
      <div className="public-profile-heatmap-body">
        <div className="public-profile-heatmap-weekdays">
          <span>일</span>
          <span>월</span>
          <span>화</span>
          <span>수</span>
          <span>목</span>
          <span>금</span>
          <span>토</span>
        </div>
        <div className="public-profile-heatmap-grid" style={{ gridTemplateColumns: heatmapColumns }}>
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="public-profile-heatmap-week">
              {week.map((day) => (
                <span
                  key={day.dateKey}
                  className={`public-profile-heatmap-cell level-${day.inRange ? day.level : 0}`}
                  title={day.inRange ? `${day.dateKey} · ${formatDuration(day.seconds)} · 활동 ${day.activityCount}건` : ''}
                  aria-label={day.inRange ? `${day.dateKey} 학습 ${formatDuration(day.seconds)}, 활동 ${day.activityCount}건` : '범위 밖'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getHistoryConceptTitle(entry = {}) {
  return String(
    entry.unitTitle
    || entry.quizTitle
    || entry.transmissionTitle
    || entry.regionTitle
    || entry.title
    || ''
  ).trim();
}

function buildConceptMap(history = [], refinementSignals = [], includeRefinement = false) {
  const concepts = new Map();

  history.forEach((entry) => {
    const title = getHistoryConceptTitle(entry);
    if (!title) return;

    const key = entry.unitId || title;
    const type = entry.type || 'quiz';
    const score = Number(entry.score);
    const hasScore = Number.isFinite(score);
    const existing = concepts.get(key) || {
      key,
      title,
      regionTitle: entry.regionTitle || entry.chapterTitle || '',
      attempts: 0,
      completed: 0,
      bestScore: null,
      lastAtMs: 0,
      activityTypes: new Set(),
      refinementCount: 0,
    };

    existing.attempts += 1;
    existing.completed += ['quiz', 'workbook', 'video', 'datalog', 'assignment'].includes(type) ? 1 : 0;
    existing.activityTypes.add(type);
    existing.lastAtMs = Math.max(existing.lastAtMs, getTimeMs(entry.timestamp || entry.completedAt || entry.createdAt));

    if (hasScore && (type === 'quiz' || type === 'workbook')) {
      existing.bestScore = existing.bestScore == null ? score : Math.max(existing.bestScore, score);
    }

    if (!existing.regionTitle && (entry.regionTitle || entry.chapterTitle)) {
      existing.regionTitle = entry.regionTitle || entry.chapterTitle;
    }

    concepts.set(key, existing);
  });

  if (includeRefinement) {
    refinementSignals.forEach((signal) => {
      const title = String(signal.unitTitle || signal.conceptTag || signal.quizTitle || '').trim();
      const key = signal.unitId || title || signal.id;
      if (!key) return;

      const existing = concepts.get(key) || {
        key,
        title: title || '복습 대상 개념',
        regionTitle: signal.regionTitle || '',
        attempts: 0,
        completed: 0,
        bestScore: null,
        lastAtMs: 0,
        activityTypes: new Set(),
        refinementCount: 0,
      };

      existing.refinementCount += 1;
      existing.lastAtMs = Math.max(existing.lastAtMs, getTimeMs(signal.lastFailedAt || signal.updatedAt || signal.createdAt));
      concepts.set(key, existing);
    });
  }

  return Array.from(concepts.values())
    .map((concept) => {
      let status = 'learning';
      if (includeRefinement && concept.refinementCount > 0) {
        status = 'refining';
      } else if ((concept.bestScore ?? 0) >= 90 || concept.completed >= 2 || concept.activityTypes.has('video') || concept.activityTypes.has('datalog')) {
        status = 'conquered';
      }

      return {
        ...concept,
        status,
        meta: CONCEPT_STATUS_META[status],
        activityTypes: Array.from(concept.activityTypes),
      };
    })
    .sort((a, b) => {
      const statusWeight = { refining: 0, conquered: 1, learning: 2 };
      const weightDiff = statusWeight[a.status] - statusWeight[b.status];
      if (weightDiff !== 0) return weightDiff;
      return b.lastAtMs - a.lastAtMs;
    })
    .slice(0, 10);
}

export default function PublicProfile() {
  const { uid } = useParams();
  const { user, userData, loading: authLoading } = useAuth();
  // Remount local dialog/visibility state on account or target changes. Query
  // caches are also viewer-scoped, so another account never sees cached data.
  return <PublicProfileContent key={`${user?.uid || ''}:${uid}`} uid={uid} user={user} userData={userData} authLoading={authLoading} />;
}

function PublicProfileContent({ uid, user, userData, authLoading }) {
  const navigate = useNavigate();
  const isOwnProfile = user?.uid === uid;
  const ownProfileReady = isOwnProfile && userData && !userData.dataLoadError && !userData.recoveryRequired;
  const identity = useQuery({
    ...profileQueryOptions(user?.uid, uid, 'identity', async () => {
      const snapshot = await getDoc(doc(db, 'users', uid));
      if (!snapshot.exists()) throw new Error('프로필을 찾을 수 없습니다.');
      return { ...snapshot.data(), id: snapshot.id };
    }),
    enabled: Boolean(uid && user?.uid && !authLoading && !ownProfileReady),
  });
  const profile = ownProfileReady ? userData : identity.data;
  const loading = !profile && !identity.isError;
  const error = !profile && identity.isError ? identity.error.message : '';
  const canShowProfile = Boolean(profile && user?.uid && (isOwnProfile || profile.publicProfileEnabled !== false));
  const [bookshelfRef, bookshelfVisible] = useProfileSectionVisible(canShowProfile);
  const [answersRef, answersVisible] = useProfileSectionVisible(canShowProfile);
  const [awardsRef, awardsVisible] = useProfileSectionVisible(canShowProfile);
  const [historyRequested, setHistoryRequested] = React.useState(false);
  const bookshelf = useQuery({
    ...profileQueryOptions(user?.uid, uid, 'bookshelf', () => fetchProfileBookshelfPage({ userId: uid, allowOwnerFallback: isOwnProfile })),
    enabled: bookshelfVisible,
  });
  const answerRequest = useQuery({
    ...profileQueryOptions(user?.uid, uid, 'answers', async () => {
      const snap = await getDocs(query(collection(db, 'answers'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(5)));
      return snap.docs.map((item) => ({ ...item.data(), id: item.id })).filter((answer) => !answer.isTeacher);
    }),
    enabled: answersVisible,
  });
  const historyRequest = useQuery({
    ...profileQueryOptions(user?.uid, uid, 'history', async () => {
      const snap = await getDocs(collection(db, 'users', uid, 'history'));
      return snap.docs.map((item) => ({ ...item.data(), id: item.id }));
    }),
    enabled: canShowProfile && isOwnProfile && historyRequested,
  });
  const refinementRequest = useQuery({
    ...profileQueryOptions(user?.uid, uid, 'refinement', async () => {
      const [incorrect, review] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'incorrect_questions')),
        getDocs(query(collection(db, 'users', uid, 'review_marks'), where('status', '==', 'active'))),
      ]);
      return [
        ...incorrect.docs.map((item) => ({ ...item.data(), id: item.id, source: 'incorrect' })),
        ...review.docs.map((item) => ({ ...item.data(), id: item.id, source: 'review' })),
      ];
    }),
    enabled: canShowProfile && isOwnProfile && historyRequested,
  });
  const history = historyRequest.data || EMPTY_ITEMS;
  const refinementSignals = refinementRequest.data || EMPTY_ITEMS;
  const answers = answerRequest.data || EMPTY_ITEMS;
  const readingBooks = bookshelf.data?.books || EMPTY_ITEMS;
  const readingShelfHasMore = bookshelf.data?.hasMore || false;
  const readingShelfCursor = bookshelf.data?.nextCursor || null;
  const [isBookshelfDialogOpen, setIsBookshelfDialogOpen] = React.useState(false);
  const [dialogBooks, setDialogBooks] = React.useState([]);
  const [dialogHasMore, setDialogHasMore] = React.useState(false);
  const [dialogCursor, setDialogCursor] = React.useState(null);
  const [isLoadingMoreBooks, setIsLoadingMoreBooks] = React.useState(false);
  const [moreBooksError, setMoreBooksError] = React.useState('');
  const mondayKey = getMondayKSTKey();
  const weeklyGain = profile?.weeklyGrowthMonday === mondayKey ? (profile?.weeklyGrowth || 0) : 0;
  const streak = profile ? getEffectiveStreak(profile) : 0;
  const seiData = profile ? calculateSEI(profile, weeklyGain, streak) : null;
  const frameId = profile?.selectedProfileFrame || 'starter';
  const frame = getProfileFrame(frameId);
  const frameTheme = getFrameSurfaceStyles(frameId);
  const baseTheme = getBaseTheme(profile?.selectedBaseTheme);
  const isPremiumBaseTheme = baseTheme.id !== 'orbital';
  const baseThemeImage = BASE_THEME_IMAGES[baseTheme.id] ? `url(${BASE_THEME_IMAGES[baseTheme.id]})` : 'none';
  const heroBackground = isPremiumBaseTheme
    ? `linear-gradient(135deg, color-mix(in srgb, ${baseTheme.accent} 18%, rgba(8, 12, 28, 0.98)), color-mix(in srgb, ${frameTheme.background} 78%, transparent))`
    : frameTheme.background;
  const heroBoxShadow = isPremiumBaseTheme
    ? `${frameTheme.glow}, 0 0 44px color-mix(in srgb, ${baseTheme.accent} 18%, transparent)`
    : frameTheme.glow;
  const earnedBadges = React.useMemo(() => profile
    ? mergeBadges(buildCollectionBadges(profile, history)).sort((a, b) => {
      if (a.id === profile.featuredPremiumBadgeId) return -1;
      if (b.id === profile.featuredPremiumBadgeId) return 1;
      return 0;
    })
    : [], [profile, history]);
  const featuredPremiumBadge = earnedBadges.find((badge) => (
    badge.id === profile?.featuredPremiumBadgeId
    && !!badge.premiumImage
    && isBadgeUpgradeOwned(profile, badge.id)
  ));
  const conceptMap = React.useMemo(
    () => historyRequested ? buildConceptMap(history, refinementSignals, isOwnProfile) : EMPTY_ITEMS,
    [historyRequested, history, refinementSignals, isOwnProfile]
  );
  const conceptSummary = React.useMemo(() => ({
    conquered: conceptMap.filter((concept) => concept.status === 'conquered').length,
    refining: conceptMap.filter((concept) => concept.status === 'refining').length,
    learning: conceptMap.filter((concept) => concept.status === 'learning').length,
  }), [conceptMap]);
  const learningStats = React.useMemo(
    () => historyRequested ? buildLearningStats(history, profile || {}) : null,
    [historyRequested, history, profile]
  );
  const displayName = getDisplayName(profile || {});
  const profileImageUrl = resolveProfileImageUrl(profile || {});

  const handleSendMemo = () => {
    if (!uid || isOwnProfile) return;
    window.dispatchEvent(new CustomEvent('directmemo:compose', { detail: { uid } }));
  };

  const handleOpenReadingLibrary = () => {
    navigate('/?view=reading_library', { state: { view: 'reading_library' } });
  };

  const handleShowAllBooks = () => {
    setMoreBooksError('');
    setDialogBooks(readingBooks);
    setDialogHasMore(readingShelfHasMore);
    setDialogCursor(readingShelfCursor);
    setIsBookshelfDialogOpen(true);
  };

  const handleLoadMoreBooks = async () => {
    if (!uid || !dialogHasMore || !dialogCursor || isLoadingMoreBooks) return;
    setIsLoadingMoreBooks(true);
    setMoreBooksError('');
    try {
      const nextPage = await withProfileTimeout(fetchProfileBookshelfPage({
        userId: uid,
        cursor: dialogCursor,
        pageSize: PROFILE_BOOKSHELF_PAGE_SIZE,
        allowOwnerFallback: isOwnProfile,
      }));
      setDialogBooks((current) => {
        const knownIds = new Set(current.map((book) => book.id));
        return [...current, ...nextPage.books.filter((book) => !knownIds.has(book.id))];
      });
      setDialogHasMore(nextPage.hasMore);
      setDialogCursor(nextPage.nextCursor);
    } catch (loadError) {
      console.warn('공개 프로필 전체 책장 추가 조회 실패:', loadError);
      setMoreBooksError('책을 더 불러오지 못했습니다. 더 보기 버튼으로 다시 시도해주세요.');
    } finally {
      setIsLoadingMoreBooks(false);
    }
  };

  return (
    <div
      className={`public-profile-page space-bg ${isPremiumBaseTheme ? 'public-profile-page--premium' : 'public-profile-page--basic'} public-profile-page--${baseTheme.id}`}
      style={{
        background: baseTheme.pageBackground,
        '--public-profile-base-accent': baseTheme.accent,
        '--public-profile-base-surface': baseTheme.surface,
        '--public-profile-base-image': baseThemeImage,
      }}
    >
      <StarField />
      <div className="nebula-bg" />
      {isPremiumBaseTheme && <div className="public-profile-base-image" aria-hidden="true" />}
      <div className="public-profile-theme-glow" aria-hidden="true" />
      <SpaceNavbar currentView="profile" />

      <main className="public-profile-shell">
        <button type="button" className="public-profile-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          돌아가기
        </button>

        {loading ? (
          <div className="public-profile-state glass-card">탐험기지 신호를 수신 중...</div>
        ) : error ? (
          <div className="public-profile-state glass-card" role="alert">
            <p>{error}</p>
            <button type="button" disabled={identity.isFetching} onClick={() => identity.refetch()}>다시 시도</button>
          </div>
        ) : profile?.publicProfileEnabled === false && !isOwnProfile ? (
          <div className="public-profile-state glass-card">
            이 탐험기지는 공개 설정이 꺼져 있습니다.
          </div>
        ) : profile ? (
          <>
            <MotionDiv
              className={`public-profile-hero ${featuredPremiumBadge ? 'public-profile-hero--with-premium' : ''}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderColor: frameTheme.borderColor,
                background: heroBackground,
                boxShadow: heroBoxShadow
              }}
            >
              <ProfileAvatar
                src={profileImageUrl}
                displayName={displayName}
                className="public-profile-avatar"
                style={{ borderColor: frameTheme.borderColor, color: frameTheme.accent }}
                loading="eager"
              />

              <div className="public-profile-hero-main">
                <div className="public-profile-kicker">나의 탐험기지</div>
                <div className="public-profile-name-row">
                  <h1>{displayName}</h1>
                  {!isOwnProfile && (
                    <button
                      type="button"
                      className="public-profile-memo-btn"
                      onClick={handleSendMemo}
                      aria-label={`${displayName}님에게 편지 보내기`}
                    >
                      <PenLine size={15} /> 편지 쓰기
                    </button>
                  )}
                </div>
                <div className="public-profile-title-row">
                  <span>{profile.publicTitle || '성장 중인 탐험가'}</span>
                  <span className="public-profile-frame-chip" style={{ borderColor: frameTheme.borderColor, color: frameTheme.accent }}>
                    {frame.name}
                  </span>
                  <span className="public-profile-base-chip" style={{ borderColor: `${baseTheme.accent}66`, color: baseTheme.accent }}>
                    {baseTheme.icon} {baseTheme.name}
                  </span>
                  {isHallSpotlightActive(profile) && (
                    <span className="public-profile-showcase-chip">SHOWCASE</span>
                  )}
                </div>
              {profile.publicSignature && (
                  <p className="public-profile-signature">“{profile.publicSignature}”</p>
                )}
              </div>

              <div
                className={`public-profile-ship ${getActiveShipFamily(profile) === 'pathfinder' ? 'is-pathfinder' : ''}`}
                aria-label={`${displayName}님의 탐사선`}
              >
                <ModularShip userData={profile} size={getActiveShipFamily(profile) === 'pathfinder' ? 230 : 190} animate={false} />
                <div>
                  <span>PERSONAL EXPLORER</span>
                  <strong>{getShipGrade(profile).name}</strong>
                </div>
              </div>

              {featuredPremiumBadge && (
                <div className="public-profile-featured-premium-badge" aria-label="대표 프리미엄 배지">
                  <img src={featuredPremiumBadge.premiumImage} alt={featuredPremiumBadge.title} />
                </div>
              )}

              <div className="public-profile-tier">
                <span>{seiData?.tier?.icon}</span>
                <strong>{seiData?.tier?.name}</strong>
                <small>SEI {seiData?.total || 0}</small>
              </div>
            </MotionDiv>

            {profile.crewName && (
              <div className="public-profile-crew-strip" style={{ borderColor: `${profile.crewColor || frameTheme.accent}66` }}>
                <Shield size={16} />
                <span>소속</span>
                <strong style={{ color: profile.crewColor || frameTheme.accent }}>{profile.crewName}</strong>
                {profile.crewRole && <em>{profile.crewRole}</em>}
              </div>
            )}

            <section className="public-profile-grid">
              <div className="public-profile-panel public-profile-stats">
                <h2><Sparkles size={18} /> 공개 지표</h2>
                <div className="public-profile-stat-grid">
                  <div>
                    <span>보유 광석</span>
                    <strong>💎 {Number(profile.crystals || 0).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>연속 학습</span>
                    <strong>{streak > 0 ? <CometBadge streak={streak} compact showTooltip={false} /> : '0일'}</strong>
                  </div>
                  <div>
                    <span>도움 횟수</span>
                    <strong>{profile.helpCount || 0}</strong>
                  </div>
                  <div>
                    <span>질문 수</span>
                    <strong>{profile.questionCount || 0}</strong>
                  </div>
                </div>
              </div>

              <div className="public-profile-panel">
                <h2><Trophy size={18} /> 탐사 지수</h2>
                <div className="public-profile-sei-list">
                  <div><span>전문성</span><strong>{seiData?.skill || 0}</strong></div>
                  <div><span>성실</span><strong>{seiData?.diligence || 0}</strong></div>
                  <div><span>집중</span><strong>{seiData?.focus || 0}</strong></div>
                  <div><span>성장</span><strong>{seiData?.growth || 0}</strong></div>
                  <div><span>소통</span><strong>{seiData?.agora || 0}</strong></div>
                  <div><span>광석</span><strong>{seiData?.wealth || 0}</strong></div>
                </div>
              </div>

            </section>

            <div ref={bookshelfRef} className="public-profile-deferred">
            {!bookshelf.data ? <ProfileSectionStatus title="책장" request={bookshelf} /> : (isOwnProfile || readingBooks.length > 0) && (
              <ProfileBookshelf
                books={readingBooks}
                hasMore={readingShelfHasMore}
                isOwnProfile={isOwnProfile}
                onOpenLibrary={handleOpenReadingLibrary}
                onShowAll={handleShowAllBooks}
              />
            )}
            </div>

            {isOwnProfile && (
              <div className="public-profile-panel public-profile-history-toggle">
                <button type="button" aria-expanded={historyRequested} onClick={() => setHistoryRequested((value) => !value)}>
                  {historyRequested ? '학습 통계와 개념 지도 접기' : '학습 통계와 개념 지도 보기'}
                </button>
                <p className="public-profile-muted">나의 전체 학습 기록을 펼쳐 확인할 수 있어요.</p>
              </div>
            )}
            {isOwnProfile && historyRequested && !historyRequest.data && <ProfileSectionStatus title="학습 기록" request={historyRequest} />}
            {isOwnProfile && historyRequested && historyRequest.data && <>
            <section className="public-profile-panel public-profile-learning-stats">
              <h2>
                <CalendarDays size={18} />
                학습 통계
                <span className="public-profile-section-count">{learningStats.activeDays}</span>
              </h2>
              <div className="public-profile-learning-summary">
                <div>
                  <span>총 기록 시간</span>
                  <strong>{formatDuration(learningStats.totalSeconds)}</strong>
                  <small>활동 {learningStats.totalActivities.toLocaleString()}건</small>
                </div>
                <div>
                  <span>이번 달</span>
                  <strong>{formatDuration(learningStats.monthSeconds)}</strong>
                  <small>월간 기록 합계</small>
                </div>
                <div>
                  <span>이번 주</span>
                  <strong>{formatDuration(learningStats.weekSeconds)}</strong>
                  <small>월요일부터 오늘까지</small>
                </div>
                <div>
                  <span>오늘</span>
                  <strong>{formatDuration(learningStats.todaySeconds)}</strong>
                  <small>오늘 기록된 시간</small>
                </div>
              </div>

              <div className="public-profile-learning-chart-block">
                <div className="public-profile-learning-block-head">
                  <div>
                    <h3><TrendingUp size={17} /> 최근 활동 추이</h3>
                    <p>최근 30일 동안 기록된 학습 시간을 보여줍니다.</p>
                  </div>
                </div>
                {learningStats.hasTimedData ? (
                  <LearningLineChart points={learningStats.recent30} />
                ) : (
                  <p className="public-profile-muted">아직 시간 단위로 기록된 학습 활동이 없습니다.</p>
                )}
              </div>

              <div className="public-profile-learning-chart-block">
                <div className="public-profile-learning-block-head">
                  <div>
                    <h3><Flame size={17} /> 1년 히트맵</h3>
                    <p>시간 기록과 활동 횟수를 함께 반영해 학습 밀도를 표시합니다.</p>
                  </div>
                </div>
                <LearningHeatmap weeks={learningStats.heatmapWeeks} monthLabels={learningStats.monthLabels} />
              </div>
            </section>

            <section className="public-profile-panel public-profile-concepts">
              <h2>
                <MapIcon size={18} />
                나의 개념 지도
                <span className="public-profile-section-count">{conceptMap.length}</span>
              </h2>
              {!refinementRequest.data ? <ProfileSectionStatus title="개념 정제 기록" request={refinementRequest} /> : conceptMap.length > 0 ? (
                <>
                  <div className="public-profile-concept-summary">
                    <span>정복 {conceptSummary.conquered}</span>
                    {isOwnProfile && <span>재정제 {conceptSummary.refining}</span>}
                    <span>학습 중 {conceptSummary.learning}</span>
                  </div>
                  <div className="public-profile-concept-grid" aria-label="개념 지도">
                    {conceptMap.map((concept) => (
                      <div key={concept.key} className={`public-profile-concept-card is-${concept.status}`}>
                        <div className="public-profile-concept-card-head">
                          <span style={{ color: concept.meta.tone }}>{concept.meta.icon}</span>
                          <strong>{concept.meta.label}</strong>
                        </div>
                        <h3>{concept.title}</h3>
                        {concept.regionTitle && <p>{concept.regionTitle}</p>}
                        <div className="public-profile-concept-meta">
                          {concept.bestScore != null && <span>최고 {concept.bestScore}점</span>}
                          <span>{concept.completed || concept.attempts}회 탐사</span>
                          {isOwnProfile && concept.refinementCount > 0 && <span>정제 {concept.refinementCount}개</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="public-profile-muted">아직 공개할 개념 탐사 기록이 없습니다.</p>
              )}
            </section>
            </>}

            <div ref={awardsRef} className="public-profile-deferred">
              {awardsVisible ? (
                <ProfileSectionBoundary><React.Suspense fallback={<div className="public-profile-section-status">상장을 불러오는 중…</div>}>
                  <CertificateAwardsBoard user={{ ...profile, uid }} realtime={false} viewerId={user?.uid} />
                </React.Suspense></ProfileSectionBoundary>
              ) : <div className="public-profile-section-status">상장</div>}
            </div>

            <section className="public-profile-panel public-profile-badge-panel">
              <h2>
                <Award size={18} />
                획득한 배지
                <span className="public-profile-section-count">{earnedBadges.length}</span>
              </h2>
              {isOwnProfile && !historyRequest.data && <p className="public-profile-muted">저장된 학습 요약 기준입니다. 학습 통계를 펼치면 전체 기록의 배지도 확인합니다.</p>}
              {earnedBadges.length > 0 ? (
                <div className="public-profile-badges" aria-label="획득한 배지 목록">
                  {earnedBadges.map((badge) => {
                    const showPremium = isBadgeUpgradeOwned(profile, badge.id)
                      && !!badge.premiumImage;
                    return (
                    <div key={badge.id} className={`public-profile-badge ${showPremium ? 'is-premium' : ''}`}>
                      {showPremium ? (
                        <img className="public-profile-badge-premium-image" src={badge.premiumImage} alt={badge.title} loading="lazy" decoding="async" />
                      ) : (
                        <>
                          <span>{badge.icon}</span>
                          <strong>{badge.title}</strong>
                          <small>{badge.desc}</small>
                        </>
                      )}
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="public-profile-muted">아직 공개할 획득 배지가 없습니다.</p>
              )}
            </section>

            <section ref={answersRef} className="public-profile-panel public-profile-answers">
              <h2><MessageCircle size={18} /> 최근 공개 답변</h2>
              {!answerRequest.data ? <ProfileSectionStatus title="최근 답변" request={answerRequest} /> : answers.length > 0 ? (
                <div className="public-profile-answer-list">
                  {answers.map((answer) => (
                    <button
                      key={answer.id}
                      type="button"
                      className="public-profile-answer"
                      onClick={() => navigate(`/agora/${answer.questionId}`)}
                    >
                      <div>
                        <strong>{answer.isAccepted ? '채택된 답변' : '아고라 답변'}</strong>
                        {answer.createdAt && <span>{getDateLabel(answer.createdAt)}</span>}
                      </div>
                      <p>{parseInlineFormatting(String(answer.content || '').slice(0, 140), { keyPrefix: `profile-answer-${answer.id}` })}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="public-profile-muted">아직 표시할 공개 답변이 없습니다.</p>
              )}
            </section>

            {isOwnProfile && (
              <div className="public-profile-own-actions">
                <button type="button" onClick={() => navigate('/?view=profile')}>
                  <Star size={16} />
                  공개 명함 수정
                </button>
                <button type="button" onClick={() => navigate('/?view=store')}>
                  <Zap size={16} />
                  기지 꾸미기
                </button>
              </div>
            )}

            {isBookshelfDialogOpen && (
              <PublicBookshelfDialog
                error={moreBooksError}
                books={dialogBooks}
                hasMore={dialogHasMore}
                isLoadingMore={isLoadingMoreBooks}
                isOwnProfile={isOwnProfile}
                onLoadMore={handleLoadMoreBooks}
                onOpenLibrary={handleOpenReadingLibrary}
                onClose={() => setIsBookshelfDialogOpen(false)}
              />
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
