import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, ChevronDown, ChevronRight, CircleHelp, Copy, Crown, Loader2, LogOut, Mail, Radio, Rocket, Search, Send, Share2, ShieldCheck, Sparkles, StickyNote, Trash2, Users, Wifi, X } from 'lucide-react';
import { auth, db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useLearningHistory } from '../../hooks/useLearningHistory';
import { useUserPresence } from '../../hooks/useRealtimePresence';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';
import { copyMeetText, getGoogleMeetCode, openGoogleMeet } from '../../utils/googleMeetNavigation';
import CrewSettingsModal from './CrewSettingsModal';
import CrewGuideModal from './CrewGuideModal';
import CrewCrystalChest from './CrewCrystalChest';
import CrewGrowthRewardExperience from './CrewGrowthRewardExperience';
import StudyCrewDailyMission from './StudyCrewDailyMission';
import ModularShip from './ModularShip';
import { getActiveShipFamily, getShipGrade } from '../../utils/shipCatalog';
import CrewMothership from './CrewMothership';
import CrewConstructionDock from './CrewConstructionDock';
import { getCrewMothershipLevel, getCrewMothershipStats } from '../../utils/crewMothershipCatalog';
import { formatCrewSchedule } from './crewSchedule';
import './CrewDetailView.css';

const inputStyle = {
  width: '100%', minHeight: 46, boxSizing: 'border-box', borderRadius: 8,
  border: '1px solid rgba(0, 243, 255, 0.28)', background: 'rgba(5, 10, 24, 0.72)',
  color: 'var(--text-bright)', padding: '0.75rem 0.9rem', outline: 'none'
};
const NOTE_MAX_LENGTH = 120;
const NOTE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_CLUSTER_NAMES = {
  'middle-math': '중등수학',
  'cluster_middle': '중등수학',
  'western-classic': '고전 읽기',
  'python': '파이썬',
  'cluster_elementary': '초등수학',
  'elementary-math': '초등수학',
};

function getMemberClusterDays(participation, clusterNameMap) {
  const result = [];

  Object.entries(participation || {}).forEach(([clusterId, days]) => {
    if (Array.isArray(days) && days.length > 0) {
      const clusterName = (clusterNameMap && clusterNameMap.get(clusterId)) || DEFAULT_CLUSTER_NAMES[clusterId] || clusterId;
      result.push({
        clusterId,
        clusterName,
        daysStr: days.join(', '),
      });
    }
  });

  return result;
}

function getCrewStatusLabel(s) { return s === 'approved' ? '인증 완료' : s === 'rejected' ? '반려됨' : '운영자 승인 대기'; }
function getCrewStatusColor(s) { return s === 'approved' ? 'var(--planet-green)' : s === 'rejected' ? '#f87171' : 'var(--planet-orange)'; }
function getMemberLabel(m, f = '크루 멤버') { return m?.publicDisplayName || m?.studentName || m?.name || m?.displayName || f; }
function getTodayKey() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()); }
function getPresenceInfo(profile) {
  const liveStatus = profile?.liveStatus;
  const updatedMs = liveStatus?.lastUpdatedAt?.toMillis?.() || 0;
  const stale = !updatedMs || Date.now() - updatedMs > 120000;
  if (stale) return { label: '오프라인', color: 'rgba(255,255,255,0.42)', dot: '#64748b' };
  if (liveStatus?.state === 'away') return { label: '자리비움', color: '#fbbf24', dot: '#fbbf24' };
  return { label: '온라인', color: 'var(--planet-green)', dot: '#22c55e' };
}
function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}
function formatElapsedCompact(ms) {
  if (!Number.isFinite(ms) || ms < 60000) return '';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}분째`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분째` : `${hours}시간째`;
}
function buildTodaySummary(dailyStats) {
  const items = [];
  if ((dailyStats?.quizCount || 0) > 0) items.push(`퀴즈 ${dailyStats.quizCount}회`);
  if ((dailyStats?.totalVideoSeconds || 0) > 0) items.push(`영상 ${Math.floor(dailyStats.totalVideoSeconds / 60)}분`);
  if ((dailyStats?.logCount || 0) > 0) items.push(`로그 ${dailyStats.logCount}회`);
  if ((dailyStats?.codeTraceCount || 0) > 0) items.push(`코드 ${dailyStats.codeTraceCount}회`);
  if ((dailyStats?.attentionOpportunities || 0) > 0) items.push(`집중도 ${dailyStats.attentionHits}/${dailyStats.attentionOpportunities}`);
  return items.join(' · ');
}
function getFunctionsErrorMessage(err, fb) {
  const c = err?.code || '';
  if (c.includes('not-found')) return '해당 크루를 찾지 못했습니다.';
  if (c.includes('failed-precondition') && err?.message) return err.message;
  return fb;
}

function uniqueIds(ids = []) {
  return Array.from(new Set((Array.isArray(ids) ? ids : []).filter(Boolean)));
}

async function loadPublicMemberProfiles(crewId, memberIds = []) {
  const ids = uniqueIds(memberIds);
  if (!crewId || !ids.length) return {};
  const fn = httpsCallable(functions, 'getStudyCrewMemberDirectory');
  const result = await fn({ crewId, memberIds: ids });
  const next = {};
  (result.data?.members || []).forEach((profile) => { if (profile?.uid) next[profile.uid] = profile; });
  return next;
}

function getGreetingReadMeta(note, crewMemberIds = [], currentUid = '') {
  const normalizedReadBy = uniqueIds([note?.userId, ...(Array.isArray(note?.readBy) ? note.readBy : [])]);
  const members = uniqueIds(crewMemberIds);
  const totalCount = members.length || Math.max(normalizedReadBy.length, 1);
  const readCount = members.length
    ? members.filter((memberId) => normalizedReadBy.includes(memberId)).length
    : normalizedReadBy.length;
  const hasCurrentUserRead = currentUid ? normalizedReadBy.includes(currentUid) : false;
  const isFullyRead = totalCount > 0 && readCount >= totalCount;
  return { normalizedReadBy, totalCount, readCount, hasCurrentUserRead, isFullyRead };
}

function CrewMemberStudyCard({ member, profile, currentUid, currentUserData, currentDisplayName, todayKey, clusterNameMap }) {
  const { dailyStats, loading } = useLearningHistory(member?.uid, todayKey);
  const realtimePresence = useUserPresence(member?.uid, Boolean(member?.uid));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isSelf = member.uid === currentUid;
  // Some older crews only keep memberIds and do not have a populated members array.
  // Merge the live user profile so those crews still show identity and learning state.
  const resolvedMember = useMemo(() => ({
    ...member,
    ...(profile || {}),
    ...(isSelf ? (currentUserData || {}) : {}),
  }), [member, profile, isSelf, currentUserData]);
  const isLeader = resolvedMember.crewRole === 'leader';
  const studied = resolvedMember.lastStreakDate === todayKey;
  const presenceProfile = realtimePresence ? { ...(profile || {}), liveStatus: realtimePresence.liveStatus } : profile;
  const presence = getPresenceInfo(presenceProfile);
  const liveStatus = presenceProfile?.liveStatus || {};
  const currentLocation = liveStatus.currentLocation || '접속 기록 없음';
  const enteredMs = getTimestampMs(liveStatus.enteredAt) || getTimestampMs(liveStatus.lastUpdatedAt);
  const elapsedLabel = enteredMs ? formatElapsedCompact(nowMs - enteredMs) : '';
  const summaryText = buildTodaySummary(dailyStats);
  const displayName = getMemberLabel(resolvedMember, isSelf ? (currentDisplayName || '나') : '크루 멤버');
  const activeClusterDays = useMemo(() => getMemberClusterDays(resolvedMember.participation, clusterNameMap), [resolvedMember, clusterNameMap]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="crew-member-console">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          {isLeader && <Crown size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />}
          <span className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}{isSelf ? ' (나)' : ''}
          </span>
          {!isSelf && resolvedMember.uid && (
            <button
              type="button"
              className="crew-member-letter-btn"
              title={`${displayName}님에게 편지 쓰기`}
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playClick();
                window.dispatchEvent(new CustomEvent('directmemo:compose', { detail: { uid: resolvedMember.uid } }));
              }}
            >
              <Mail size={13} />
            </button>
          )}
        </div>
        <span className="font-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: presence.color, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: presence.dot, boxShadow: `0 0 8px ${presence.dot}88` }} />
          {presence.label}
        </span>
      </div>

      <div className="crew-member-ship-dock">
        <ModularShip userData={resolvedMember} size={92} animate={false} />
        <div>
          <span>PERSONAL EXPLORER</span>
          <strong>{getShipGrade(resolvedMember).name}</strong>
          <small>{getActiveShipFamily(resolvedMember) === 'pathfinder' ? 'GRADE 03 · 개척함 계열' : resolvedMember.shipCustomization?.engine === 'engine-dark' ? '암흑물질 엔진 장착' : '정찰선 계열'}</small>
        </div>
      </div>

      <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
        연속 {resolvedMember.currentStreak || 0}일 · {studied ? '오늘 학습 완료' : '오늘 학습 대기'}
      </div>

      {activeClusterDays.length > 0 && (
        <div className="crew-member-readout crew-member-readout-participation">
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.74rem', fontWeight: 800 }}>
            참여 요일
          </div>
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.81rem', lineHeight: 1.45 }}>
            {activeClusterDays.map((item, idx) => (
              <span key={item.clusterId} style={{ display: 'inline-block', marginRight: idx < activeClusterDays.length - 1 ? '0.6rem' : '0' }}>
                <strong style={{ color: '#00f3ff', fontWeight: 700 }}>{item.clusterName}</strong>: {item.daysStr}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="crew-member-readout">
        <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.74rem', fontWeight: 800 }}>
          현재 위치
        </div>
        <div className="font-tech" title={currentLocation} style={{ color: 'rgba(255,255,255,0.84)', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentLocation}
        </div>
        {elapsedLabel && (
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.76rem' }}>
            {elapsedLabel} 머무름
          </div>
        )}
      </div>

      <div className="crew-member-readout crew-member-readout-summary">
        <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.74rem', fontWeight: 800 }}>
          오늘의 요약
        </div>
        <div className="font-tech" style={{ color: summaryText ? 'rgba(255,255,255,0.84)' : 'rgba(255,255,255,0.45)', fontSize: '0.82rem', lineHeight: 1.45 }}>
          {loading ? '조회 중...' : summaryText || '아직 완료된 활동 없음'}
        </div>
      </div>
    </div>
  );
}

function GuestCrewPresenceCard({ guest, currentUid }) {
  const isSelf = guest.uid === currentUid;
  const presence = isSelf ? { label: '온라인', color: 'var(--planet-green)', dot: '#22c55e' } : getPresenceInfo({
    liveStatus: {
      state: 'online',
      lastUpdatedAt: guest.lastSeenAt,
    }
  });

  return (
    <div className="crew-member-console crew-member-console-guest">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
        <div style={{ minWidth: 0 }}>
          <span className="crew-guest-id font-tech">GUEST · {String(guest.uid || '').slice(-6).toUpperCase()}</span>
          <div className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 800, marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {guest.alias || '게스트 탐사원'}{isSelf ? ' (나)' : ''}
          </div>
        </div>
        <span className="font-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: presence.color, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: presence.dot, boxShadow: `0 0 8px ${presence.dot}88` }} />
          {presence.label}
        </span>
      </div>
      <div className="crew-member-readout">
        <div className="font-tech" style={{ color: '#86efac', fontSize: '0.74rem', fontWeight: 800 }}>현재 위치</div>
        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.84)', fontSize: '0.82rem' }}>크루 브리지 체험 중</div>
      </div>
      <div className="crew-member-readout crew-member-readout-summary">
        <div className="font-tech" style={{ color: '#86efac', fontSize: '0.74rem', fontWeight: 800 }}>임시 승무원 권한</div>
        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.8rem', lineHeight: 1.45 }}>미션 · 포스트잇 참여 가능</div>
      </div>
    </div>
  );
}

function CrewMemberPublicCard({ member, profile, clusterNameMap }) {
  const realtimePresence = useUserPresence(member?.uid, Boolean(member?.uid));
  const presenceProfile = realtimePresence ? { ...(profile || {}), liveStatus: realtimePresence.liveStatus } : profile;
  const presence = getPresenceInfo(presenceProfile);
  const isLeader = member.crewRole === 'leader';
  const currentLocation = presenceProfile?.liveStatus?.currentLocation || '현재 위치 비공개';
  const displayName = getMemberLabel(profile || realtimePresence, getMemberLabel(member));
  const resolvedMember = useMemo(() => ({ ...member, ...(profile || {}) }), [member, profile]);
  const activeClusterDays = useMemo(() => getMemberClusterDays(resolvedMember.participation, clusterNameMap), [resolvedMember, clusterNameMap]);

  return (
    <div className="crew-member-console">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          {isLeader && <Crown size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />}
          <span className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          {member.uid && (
            <button
              type="button"
              className="crew-member-letter-btn"
              title={`${displayName}님에게 편지 쓰기`}
              onClick={(e) => {
                e.stopPropagation();
                soundManager.playClick();
                window.dispatchEvent(new CustomEvent('directmemo:compose', { detail: { uid: member.uid } }));
              }}
            >
              <Mail size={13} />
            </button>
          )}
        </div>
        <span className="font-tech" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: presence.color, fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: presence.dot, boxShadow: `0 0 8px ${presence.dot}88` }} />
          {presence.label}
        </span>
      </div>
      <div className="crew-member-ship-dock">
        <ModularShip userData={{ ...member, ...(profile || {}) }} size={92} animate={false} />
        <div>
          <span>PERSONAL EXPLORER</span>
          <strong>{getShipGrade({ ...member, ...(profile || {}) }).name}</strong>
          <small>격납고 신호 연결됨</small>
        </div>
      </div>
      <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        {isLeader ? '크루 리더' : '정식 승무원'}
      </div>
      {activeClusterDays.length > 0 && (
        <div className="crew-member-readout crew-member-readout-participation">
          <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.74rem', fontWeight: 800 }}>
            참여 요일
          </div>
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.88)', fontSize: '0.81rem', lineHeight: 1.45 }}>
            {activeClusterDays.map((item, idx) => (
              <span key={item.clusterId} style={{ display: 'inline-block', marginRight: idx < activeClusterDays.length - 1 ? '0.6rem' : '0' }}>
                <strong style={{ color: '#00f3ff', fontWeight: 700 }}>{item.clusterName}</strong>: {item.daysStr}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="crew-member-readout">
        <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.74rem', fontWeight: 800 }}>현재 위치</div>
        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.8rem' }}>{currentLocation}</div>
      </div>
    </div>
  );
}

function CrewSpotlightCard({ member, profile, type = 'leader', fallbackName = '' }) {
  const realtimePresence = useUserPresence(member?.uid, Boolean(member?.uid));
  const presenceProfile = realtimePresence ? { ...(profile || {}), liveStatus: realtimePresence.liveStatus } : profile;
  const presence = getPresenceInfo(presenceProfile);
  const resolved = { ...(member || {}), ...(profile || {}) };
  const isLeader = type === 'leader';
  const displayName = getMemberLabel(resolved, fallbackName || (isLeader ? '크루 창설자' : '빛나는 크루원'));

  return (
    <article className={`crew-spotlight-card ${isLeader ? 'is-leader' : 'is-contributor'}`}>
      <div className="crew-spotlight-card__badge font-tech">
        {isLeader ? <Crown size={13} /> : <Award size={13} />}
        {isLeader ? 'FOUNDER' : 'TODAY CREW LIGHT'}
      </div>
      <div className="crew-spotlight-card__body">
        <div className="crew-spotlight-card__ship">
          <ModularShip userData={resolved} size={70} animate={false} />
        </div>
        <div className="crew-spotlight-card__copy">
          <strong className="font-tech">{displayName}</strong>
          <span className="font-tech">
            <i style={{ background: presence.dot, boxShadow: `0 0 8px ${presence.dot}88` }} />
            {presence.label}
          </span>
          <small className="font-tech">
            {isLeader ? '크루 항로를 개척한 창설자' : '과제 피드백 40광석 달성으로 상자에 기여'}
          </small>
        </div>
      </div>
    </article>
  );
}

function CrewRosterRow({ member, profile, selected, currentUid, onSelect }) {
  const realtimePresence = useUserPresence(member?.uid, Boolean(member?.uid));
  const presenceProfile = realtimePresence ? { ...(profile || {}), liveStatus: realtimePresence.liveStatus } : profile;
  const presence = member?.isGuest
    ? { label: '접속 중', color: '#86efac', dot: '#22c55e' }
    : getPresenceInfo(presenceProfile);
  const displayName = member?.isGuest
    ? (member.alias || '게스트 탐사원')
    : getMemberLabel(profile || realtimePresence, getMemberLabel(member));
  const studied = profile?.lastStreakDate === getTodayKey();

  return (
    <button type="button" className={`crew-roster-row ${selected ? 'is-selected' : ''}`} onClick={onSelect}>
      <span className="crew-roster-row__avatar font-tech">{Array.from(displayName || '?')[0]}</span>
      <span className="crew-roster-row__copy">
        <strong className="font-tech">
          {member.crewRole === 'leader' && <Crown size={12} />}
          {displayName}{member.uid === currentUid ? ' (나)' : ''}
        </strong>
        <small className="font-tech">{member.isGuest ? '게스트 승무원' : studied ? '오늘 학습 완료' : '오늘 학습 대기'}</small>
      </span>
      <span className="crew-roster-row__presence font-tech" style={{ color: presence.color }}>
        <i style={{ background: presence.dot }} />{presence.label}
      </span>
      <ChevronRight size={15} />
    </button>
  );
}

function CrewRosterModal({
  open,
  onClose,
  members,
  profiles,
  loading,
  currentUid,
  currentUserData,
  currentDisplayName,
  todayKey,
  clusterNameMap,
  isGuest,
}) {
  const [searchText, setSearchText] = useState('');
  const [selectedUid, setSelectedUid] = useState('');
  const filteredMembers = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase('ko');
    if (!keyword) return members;
    return members.filter((member) => {
      const name = member.isGuest
        ? member.alias
        : getMemberLabel(profiles[member.uid], getMemberLabel(member));
      return String(name || '').toLocaleLowerCase('ko').includes(keyword);
    });
  }, [members, profiles, searchText]);
  const selectedMember = members.find((member) => member.uid === selectedUid)
    || filteredMembers[0]
    || null;

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="crew-roster-modal" role="dialog" aria-modal="true" aria-label="전체 크루 멤버 보기">
      <button type="button" className="crew-roster-modal__backdrop" aria-label="닫기" onClick={onClose} />
      <Motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }} className="crew-roster-modal__panel">
        <header className="crew-roster-modal__header">
          <div>
            <span className="font-tech"><Users size={14} /> FLIGHT CREW DIRECTORY</span>
            <h2 className="font-title">전체 크루원 {members.length}명</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </header>
        <div className="crew-roster-modal__workspace">
          <aside className="crew-roster-modal__list">
            <label className="crew-roster-search">
              <Search size={15} />
              <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="크루원 검색" />
            </label>
            <div className="crew-roster-modal__scroll">
              {loading && members.length > 0 && <div className="crew-roster-loading font-tech"><Loader2 size={15} className="spin" /> 공개 프로필 동기화 중</div>}
              {filteredMembers.map((member) => (
                <CrewRosterRow
                  key={member.uid}
                  member={member}
                  profile={profiles[member.uid]}
                  selected={selectedMember?.uid === member.uid}
                  currentUid={currentUid}
                  onSelect={() => setSelectedUid(member.uid)}
                />
              ))}
              {!filteredMembers.length && <div className="crew-roster-loading font-tech">검색 결과가 없습니다.</div>}
            </div>
          </aside>
          <main className="crew-roster-modal__detail">
            {selectedMember ? (
              selectedMember.isGuest ? (
                <GuestCrewPresenceCard guest={selectedMember} currentUid={currentUid} />
              ) : isGuest ? (
                <CrewMemberPublicCard member={selectedMember} profile={profiles[selectedMember.uid]} clusterNameMap={clusterNameMap} />
              ) : (
                <CrewMemberStudyCard
                  member={selectedMember}
                  profile={profiles[selectedMember.uid]}
                  currentUid={currentUid}
                  currentUserData={currentUserData}
                  currentDisplayName={currentDisplayName}
                  todayKey={todayKey}
                  clusterNameMap={clusterNameMap}
                />
              )
            ) : <div className="crew-roster-loading font-tech">크루원을 선택해주세요.</div>}
          </main>
        </div>
      </Motion.section>
    </div>,
    document.body
  );
}

export default function CrewDetailView({ onBack }) {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { data: clusters = [] } = useClusters();
  const [roomAction, setRoomAction] = useState('');
  const [message, setMessage] = useState('');

  const clusterNameMap = useMemo(() => {
    const map = new Map();
    (clusters || []).forEach((c) => {
      const id = c.docId || c.id;
      if (id && c.name) {
        map.set(id, c.name);
        if (id === 'cluster_middle') map.set('middle-math', c.name);
        if (id === 'middle-math') map.set('cluster_middle', c.name);
        if (id === 'cluster_elementary') map.set('elementary-math', c.name);
        if (id === 'elementary-math') map.set('cluster_elementary', c.name);
      }
    });
    return map;
  }, [clusters]);
  const [meetAccessUrl, setMeetAccessUrl] = useState('');
  const [meetMessage, setMeetMessage] = useState('');
  const [noteText, setNoteText] = useState('');
  const [pendingNotes, setPendingNotes] = useState([]);
  const [activeNoteAction, setActiveNoteAction] = useState('');
  const [crewDocData, setCrewDocData] = useState(null);
  const [liveNotes, setLiveNotes] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [leaveAction, setLeaveAction] = useState('');
  const [guestAccessAction, setGuestAccessAction] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [guestSessions, setGuestSessions] = useState([]);
  const [guestPresenceNow, setGuestPresenceNow] = useState(() => Date.now());
  const [guestLogoutAction, setGuestLogoutAction] = useState('');
  const [showCrewInfo, setShowCrewInfo] = useState(false);
  const [guestInviteUrl, setGuestInviteUrl] = useState('');
  const [guestInviteRequested, setGuestInviteRequested] = useState(false);
  const [growthEvent, setGrowthEvent] = useState(null);
  const effectiveMemberProfiles = memberProfiles;

  const crew = useMemo(() => ({ ...(userData?.crewSnapshot || {}), ...(crewDocData || {}) }), [userData?.crewSnapshot, crewDocData]);
  const crewId = crew?.id || userData?.crewId || '';
  const members = useMemo(() => crew?.members || [], [crew?.members]);
  const crewMemberIds = useMemo(() => uniqueIds([
    ...(Array.isArray(crew?.memberIds) ? crew.memberIds : []),
    crew?.leaderId,
  ]), [crew?.memberIds, crew?.leaderId]);
  const featuredContributorId = crew?.crystalChest?.lastContributorId
    || crew?.crystalChest?.currentContributorIds?.at?.(-1)
    || '';
  const featuredMemberIds = useMemo(
    () => uniqueIds([crew?.leaderId, featuredContributorId]),
    [crew?.leaderId, featuredContributorId]
  );
  const rosterMembers = useMemo(() => {
    const byId = new Map(members.filter((member) => member?.uid).map((member) => [member.uid, member]));
    crewMemberIds.forEach((uid) => {
      if (!byId.has(uid)) {
        byId.set(uid, {
          uid,
          crewRole: uid === crew?.leaderId ? 'leader' : 'member',
        });
      }
    });
    return Array.from(byId.values());
  }, [crew?.leaderId, crewMemberIds, members]);
  const notes = useMemo(() => liveNotes, [liveNotes]);
  const displayNotes = useMemo(() => {
    const nowMs = Date.now();
    const validNotes = notes.filter((note) => {
      const createdMs = getTimestampMs(note.createdAt) || getTimestampMs(note.createdAtMs);
      if (!createdMs) return true;
      return nowMs - createdMs < NOTE_EXPIRATION_MS;
    });
    const serverKeys = new Set(validNotes.map((note) => `${note?.userId || ''}::${note?.text || ''}`));
    const filteredPending = pendingNotes.filter((note) => !serverKeys.has(`${note?.userId || ''}::${note?.text || ''}`));
    return [...filteredPending, ...validNotes].slice(0, 6);
  }, [notes, pendingNotes]);
  const status = crew?.status || userData?.crewStatus || 'pending';
  const todayKey = getTodayKey();
  const isLeader = userData?.crewRole === 'leader' || (Boolean(user?.uid) && crew?.leaderId === user?.uid);
  const isGuest = userData?.isGuest === true;
  const guestAccessEnabled = crew?.guestAccessEnabled === true;
  const liveGuestAccessEnabled = crewDocData?.guestAccessEnabled;
  const visibleGuestSessions = useMemo(() => guestSessions.filter((session) => {
    if (session.uid === user?.uid && isGuest) return true;
    const lastSeenMs = getTimestampMs(session.lastSeenAt) || getTimestampMs(session.joinedAt);
    return lastSeenMs > 0 && guestPresenceNow - lastSeenMs < 150000;
  }), [guestPresenceNow, guestSessions, isGuest, user?.uid]);
  const activeGuestCount = Math.max(visibleGuestSessions.length, isGuest && user?.uid ? 1 : 0);
  const activeParticipantIds = useMemo(
    () => uniqueIds([...crewMemberIds, ...visibleGuestSessions.map((session) => session.uid)]),
    [crewMemberIds, visibleGuestSessions]
  );
  const canLeaderDeleteCrew = isLeader && crewMemberIds.length <= 1;
  const mothershipLevel = getCrewMothershipLevel(crew);
  const mothershipStats = getCrewMothershipStats(crew);
  const mothershipDockedProfiles = useMemo(() => Object.entries(effectiveMemberProfiles)
    .filter(([, profile]) => profile)
    .map(([uid, profile]) => ({ uid, ...profile })), [effectiveMemberProfiles]);
  const [guideModalState, setGuideModalState] = useState({ isOpen: false, tab: 'all' });
  const [heroMode, setHeroMode] = useState('ship');
  const [showGrowthRules, setShowGrowthRules] = useState(false);
  const [activeCrewSystem, setActiveCrewSystem] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroMode('notes');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!crewId || !user?.uid || activeCrewSystem !== 'event') {
      setGrowthEvent(null);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const fn = httpsCallable(functions, 'getCrewGrowthEventProgress');
        const result = await fn({ crewId });
        if (!cancelled) setGrowthEvent(result.data || null);
      } catch (err) {
        console.warn('Crew growth event progress load failed:', err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeCrewSystem, activeGuestCount, crewId, crewMemberIds.length, user?.uid]);

  useEffect(() => {
    if (!crewId || !guestAccessEnabled || isGuest || !user?.uid || !guestInviteRequested) {
      setGuestInviteUrl('');
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const fn = httpsCallable(functions, 'getOrCreateReferralInvite');
        const result = await fn({ source: 'crew_guest_invite', crewId });
        const token = result.data?.token || '';
        if (!cancelled && token) {
          setGuestInviteUrl(`${window.location.origin}/crew-invite/${crewId}?invite=${encodeURIComponent(token)}`);
        }
      } catch (error) {
        if (!cancelled) {
          setGuestInviteUrl(`${window.location.origin}/crew-invite/${crewId}`);
          setGuestMessage(error?.message || '추천 추적 링크를 만들지 못해 기본 게스트 링크를 표시합니다.');
        }
      }
    };
    run();
    return () => { cancelled = true; };
  }, [crewId, guestAccessEnabled, guestInviteRequested, isGuest, user?.uid]);

  const toggleGuestAccess = async () => {
    if (!crewId || guestAccessAction || !isLeader) return;
    const nextValue = !guestAccessEnabled;
    setGuestAccessAction('toggling');
    setGuestMessage('');
    try {
      const fn = httpsCallable(functions, 'setCrewGuestAccess');
      await fn({ crewId, allowGuests: nextValue });
      setGuestMessage(nextValue ? '게스트 참여를 허용했습니다. 초대 링크로 입장할 수 있습니다.' : '게스트 참여를 중지했습니다.');
    } catch (err) {
      setGuestMessage(err?.message || '게스트 참여 설정을 바꾸지 못했습니다.');
    } finally {
      setGuestAccessAction('');
    }
  };

  const copyGuestInvite = async () => {
    if (!guestInviteUrl) return;
    try {
      await navigator.clipboard.writeText(guestInviteUrl);
      setGuestMessage('게스트 초대 링크를 복사했습니다.');
    } catch {
      setGuestMessage(guestInviteUrl);
    }
  };

  const memberNameById = useMemo(() => {
    const next = new Map();
    rosterMembers.forEach((member) => {
      next.set(member.uid, getMemberLabel(effectiveMemberProfiles[member.uid], getMemberLabel(member)));
    });
    visibleGuestSessions.forEach((guest) => next.set(guest.uid, guest.alias || '게스트 탐사원'));
    if (user?.uid) next.set(user.uid, getMemberLabel(userData, user.displayName || '나'));
    return next;
  }, [effectiveMemberProfiles, rosterMembers, user?.uid, user?.displayName, userData, visibleGuestSessions]);

  const enrichedMembers = useMemo(() => {
    const next = [...rosterMembers];
    if (!isGuest && user?.uid && !next.some(m => m.uid === user.uid)) {
      next.unshift({ uid: user.uid, studentName: userData?.studentName || userData?.publicDisplayName || user.displayName || '나', currentStreak: userData?.currentStreak || 0, lastStreakDate: userData?.lastStreakDate || '', crewRole: userData?.crewRole || 'member' });
    }
    visibleGuestSessions.forEach((guest) => {
      next.push({
        uid: guest.uid,
        alias: guest.alias || (guest.uid === user?.uid ? userData?.publicDisplayName : '') || '게스트 탐사원',
        isGuest: true,
        crewRole: 'guest',
        lastSeenAt: guest.lastSeenAt,
        joinedAt: guest.joinedAt,
      });
    });
    if (isGuest && user?.uid && !next.some((member) => member.uid === user.uid)) {
      next.push({ uid: user.uid, alias: userData?.publicDisplayName || '게스트 탐사원', isGuest: true, crewRole: 'guest' });
    }
    const unique = Array.from(new Map(next.map(m => [m.uid, m])).values());
    return unique.sort((a, b) => { if (a.uid === user?.uid) return -1; if (b.uid === user?.uid) return 1; if (a.crewRole === 'leader') return -1; if (b.crewRole === 'leader') return 1; if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1; return (b.currentStreak || 0) - (a.currentStreak || 0); });
  }, [isGuest, rosterMembers, user, userData, visibleGuestSessions]);
  const leaderMember = useMemo(
    () => enrichedMembers.find((member) => member.uid === crew?.leaderId) || { uid: crew?.leaderId, crewRole: 'leader' },
    [crew?.leaderId, enrichedMembers]
  );
  const featuredContributorMember = useMemo(
    () => enrichedMembers.find((member) => member.uid === featuredContributorId) || (featuredContributorId ? { uid: featuredContributorId, crewRole: 'member' } : null),
    [enrichedMembers, featuredContributorId]
  );

  useEffect(() => {
    const ids = featuredMemberIds;
    if (!ids.length) {
      setMemberProfiles({});
      return undefined;
    }
    let cancelled = false;
    loadPublicMemberProfiles(crewId, ids)
      .then((profiles) => { if (!cancelled) setMemberProfiles(profiles); })
      .catch((error) => console.warn('Failed to load featured crew profiles:', error));
    return () => { cancelled = true; };
  }, [crewId, featuredMemberIds]);

  useEffect(() => {
    if (!showRosterModal) return undefined;
    const ids = enrichedMembers.filter((member) => !member.isGuest).map((member) => member.uid).filter(Boolean);
    if (!ids.length) return undefined;
    let cancelled = false;
    setRosterLoading(true);
    loadPublicMemberProfiles(crewId, ids)
      .then((profiles) => {
        if (!cancelled) setMemberProfiles((previous) => ({ ...previous, ...profiles }));
      })
      .catch((error) => console.warn('Failed to load crew directory profiles:', error))
      .finally(() => { if (!cancelled) setRosterLoading(false); });
    return () => { cancelled = true; };
  }, [crewId, enrichedMembers, isGuest, showRosterModal]);

  const closeRosterModal = useCallback(() => setShowRosterModal(false), []);

  useEffect(() => {
    if (!crewId) {
      setCrewDocData(null);
      return undefined;
    }
    const unsub = onSnapshot(doc(db, 'crews', crewId), (snap) => {
      setCrewDocData(snap.exists() ? ({ id: snap.id, ...snap.data() }) : null);
    });
    return () => unsub();
  }, [crewId]);

  useEffect(() => {
    if (!crewId) {
      setGuestSessions([]);
      return undefined;
    }
    const unsub = onSnapshot(collection(db, 'crews', crewId, 'guestSessions'), (snap) => {
      setGuestSessions(snap.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to listen to crew guest sessions:', err);
      setGuestSessions([]);
    });
    return () => unsub();
  }, [crewId]);

  useEffect(() => {
    const timerId = window.setInterval(() => setGuestPresenceNow(Date.now()), 30000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!isGuest || !crewId) return undefined;
    const touchPresence = async () => {
      try {
        const fn = httpsCallable(functions, 'touchCrewGuestPresence');
        await fn({ crewId });
      } catch (err) {
        console.warn('Failed to refresh guest presence:', err);
      }
    };
    touchPresence();
    const timerId = window.setInterval(touchPresence, 45000);
    return () => window.clearInterval(timerId);
  }, [crewId, isGuest]);

  useEffect(() => {
    if (!crewId) {
      setLiveNotes([]);
      return undefined;
    }
    const greetingsQuery = query(
      collection(db, 'crews', crewId, 'greetings'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsub = onSnapshot(greetingsQuery, (snap) => {
      setLiveNotes(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Failed to listen to crew greetings:', err);
      setLiveNotes([]);
    });
    return () => unsub();
  }, [crewId]);

  useEffect(() => {
    if (!notes.length) return;
    setPendingNotes((prev) => prev.filter((pending) => !notes.some((note) => note.userId === pending.userId && note.text === pending.text)));
  }, [notes]);

  const handlePostNote = async (text = noteText) => {
    const clean = text.trim().slice(0, NOTE_MAX_LENGTH);
    if (!user?.uid || !crewId || !clean || activeNoteAction === 'posting') return;
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticNote = {
      id: tempId,
      crewId,
      userId: user.uid,
      userName: userData?.studentName || userData?.publicDisplayName || user.displayName || '탐사원',
      text: clean,
      readBy: [user.uid],
      createdAt: new Date(),
      updatedAt: new Date(),
      localPending: true,
    };
    setActiveNoteAction('posting');
    setPendingNotes((prev) => [optimisticNote, ...prev].slice(0, 6));
    setNoteText('');
    try {
      const fn = httpsCallable(functions, 'postStudyCrewGreeting');
      await fn({ crewId, text: clean });
      setMessage('포스트잇을 남겼습니다.');
    } catch (err) {
      setPendingNotes((prev) => prev.filter((note) => note.id !== tempId));
      setNoteText(clean);
      console.error('Failed to post study crew greeting:', err);
      setMessage('포스트잇을 남기지 못했습니다.');
    } finally { setActiveNoteAction(''); }
  };

  const handleReadNote = async (noteId) => {
    if (!crewId || !noteId || activeNoteAction) return;
    setActiveNoteAction(`read:${noteId}`);
    try {
      const fn = httpsCallable(functions, 'markStudyCrewGreetingRead');
      await fn({ crewId, greetingId: noteId });
    } catch (err) {
      console.error('Failed to mark post-it as read:', err);
      setMessage('포스트잇 읽음 표시에 실패했습니다.');
    } finally {
      setActiveNoteAction('');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!crewId || !noteId || activeNoteAction) return;
    const confirmed = window.confirm('이 포스트잇을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.');
    if (!confirmed) return;
    const pendingNote = pendingNotes.find((note) => note.id === noteId);
    if (pendingNote) {
      setPendingNotes((prev) => prev.filter((note) => note.id !== noteId));
      setMessage('포스트잇을 삭제했습니다.');
      return;
    }
    setActiveNoteAction(`delete:${noteId}`);
    try {
      await deleteDoc(doc(db, 'crews', crewId, 'greetings', noteId));
      setPendingNotes((prev) => prev.filter((note) => note.id !== noteId));
      setMessage('포스트잇을 삭제했습니다.');
    } catch (err) {
      console.error('Failed to delete post-it:', err);
      setMessage('포스트잇 삭제에 실패했습니다.');
    } finally {
      setActiveNoteAction('');
    }
  };

  const handleNoteKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!noteText.trim() || activeNoteAction === 'posting') return;
    handlePostNote();
  };

  const getVerifiedMeetUrl = async () => {
    if (meetAccessUrl) return meetAccessUrl;
    const fn = httpsCallable(functions, 'enterStudyCrewMeet');
    const res = await fn({ crewId });
    const googleMeetUrl = String(res?.data?.googleMeetUrl || '').trim();
    if (!googleMeetUrl) throw new Error('Google Meet 주소가 아직 준비되지 않았습니다.');
    setMeetAccessUrl(googleMeetUrl);
    return googleMeetUrl;
  };

  const handleEnterMeet = async () => {
    if (!crewId || roomAction) return;
    setRoomAction('entering');
    setMeetMessage('안전한 집중방 좌표를 확인 중입니다...');
    soundManager.playClick();
    try {
      const googleMeetUrl = await getVerifiedMeetUrl();
      setMeetMessage('Google Meet으로 이동합니다.');
      setRoomAction('');
      openGoogleMeet(googleMeetUrl);
    } catch (e) {
      setMeetMessage(getFunctionsErrorMessage(e, e?.message || '집중방에 입장하지 못했습니다.'));
      setRoomAction('');
    }
  };

  const handleCopyMeetAccess = async (kind) => {
    if (!crewId || roomAction) return;
    setRoomAction(kind === 'code' ? 'copying-code' : 'copying-link');
    setMeetMessage('집중방 좌표를 확인 중입니다...');
    soundManager.playClick();
    try {
      const googleMeetUrl = await getVerifiedMeetUrl();
      const value = kind === 'code' ? getGoogleMeetCode(googleMeetUrl) : googleMeetUrl;
      if (!value) throw new Error('복사할 회의 정보를 찾지 못했습니다.');
      const copied = await copyMeetText(value);
      if (!copied) {
        window.prompt(kind === 'code' ? '회의 코드를 길게 눌러 복사해 주세요.' : 'Meet 링크를 길게 눌러 복사해 주세요.', value);
      }
      setMeetMessage(copied
        ? (kind === 'code' ? `회의 코드 ${value}를 복사했습니다.` : 'Google Meet 링크를 복사했습니다.')
        : '자동 복사가 제한되어 직접 복사할 수 있는 창을 열었습니다.');
    } catch (e) {
      setMeetMessage(getFunctionsErrorMessage(e, e?.message || '집중방 정보를 복사하지 못했습니다.'));
    } finally {
      setRoomAction('');
    }
  };

  const handleGuestLogout = async () => {
    if (!isGuest || guestLogoutAction) return;
    setGuestLogoutAction('leaving');
    soundManager.playClick();
    try {
      const leaveGuestSession = httpsCallable(functions, 'leaveCrewGuestSession');
      await leaveGuestSession({ crewId });
    } catch (err) {
      console.warn('Failed to close guest presence cleanly:', err);
    }
    try {
      window.sessionStorage.removeItem('crewGuestSession');
      window.sessionStorage.removeItem('metasense_current_view');
      await signOut(auth);
    } catch (err) {
      console.warn('Failed to sign out guest:', err);
    } finally {
      setGuestLogoutAction('');
      navigate('/', { replace: true });
    }
  };

  const handleLeaveCrew = async () => {
    if (!crewId || leaveAction) return;

    if (isLeader && !canLeaderDeleteCrew) {
      alert('리더는 다른 멤버가 모두 나간 뒤, 혼자 남았을 때만 크루를 삭제할 수 있습니다.');
      return;
    }

    const confirmMessage = isLeader
      ? '혼자 남은 리더가 탈퇴하면 크루가 삭제됩니다.\n정말 크루를 삭제할까요?'
      : '정말 이 크루에서 탈퇴할까요?';
    if (!window.confirm(confirmMessage)) return;

    setLeaveAction('leaving');
    setMessage(isLeader ? '크루 삭제 처리 중...' : '크루 탈퇴 처리 중...');

    try {
      const fn = httpsCallable(functions, 'leaveStudyCrew');
      await fn({ crewId });
      setMessage(isLeader ? '크루를 삭제했습니다.' : '크루에서 탈퇴했습니다.');
      onBack();
    } catch (err) {
      console.error('Failed to leave crew:', err);
      setMessage(getFunctionsErrorMessage(err, isLeader ? '크루 삭제에 실패했습니다.' : '크루 탈퇴에 실패했습니다.'));
    } finally {
      setLeaveAction('');
    }
  };

  useEffect(() => {
    if (!isGuest || liveGuestAccessEnabled === undefined || liveGuestAccessEnabled === true) return;
    let cancelled = false;
    window.sessionStorage.removeItem('crewGuestSession');
    window.sessionStorage.removeItem('metasense_current_view');
    signOut(auth).catch((err) => {
      console.warn('Failed to close disabled guest session:', err);
    }).finally(() => {
      if (!cancelled) navigate('/', { replace: true });
    });
    return () => { cancelled = true; };
  }, [isGuest, liveGuestAccessEnabled, navigate]);

  if (!crew) return null;

  return (
    <div className="crew-bridge-shell">
      <div className="crew-bridge-ambient" aria-hidden="true" />
      <button onClick={onBack} className="crew-bridge-back font-tech">
        <ArrowLeft size={15} /> 크루 목록
      </button>

      <Motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="crew-cockpit"
        style={{ '--crew-accent': crew.color || '#00d4ff' }}
      >
        <div className="crew-cockpit-scanline" aria-hidden="true" />
        <div className="crew-cockpit-status font-tech">
          <span><Wifi size={13} /> CREW BRIDGE · CONNECTED</span>
          <span style={{ color: getCrewStatusColor(status) }}><ShieldCheck size={13} /> {getCrewStatusLabel(status)}</span>
        </div>

        <div className="crew-cockpit-main">
          <div className="crew-mothership-hero">
            <div className="crew-hero-switcher-bar font-tech">
              <button
                type="button"
                className={`crew-hero-switcher-btn ${heroMode === 'ship' ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClick();
                  setHeroMode('ship');
                }}
              >
                <Rocket size={13} /> 탐사정 뷰
              </button>
              <button
                type="button"
                className={`crew-hero-switcher-btn ${heroMode === 'notes' ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClick();
                  setHeroMode('notes');
                }}
              >
                <StickyNote size={13} /> 크루 메모 ({displayNotes.length})
              </button>
            </div>

            <AnimatePresence mode="wait">
              {heroMode === 'ship' ? (
                <Motion.div
                  key="hero-ship"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                  className="crew-hero-mode-wrap"
                  onClick={() => setHeroMode('notes')}
                  title="클릭하여 크루 메모 보드로 전환"
                >
                  <div className="crew-mothership-hero__copy">
                    <div className="crew-eyebrow font-tech">ORBITAL STUDY VESSEL</div>
                    <h1 className="font-title">{crew.name || userData?.crewName || '스터디 크루'}</h1>
                    <p className="font-tech">{crew.motto || '함께 항해할 준비가 되었습니다.'}</p>
                  </div>
                  <CrewMothership
                    crew={crew}
                    memberProfiles={mothershipDockedProfiles}
                    variant="hero"
                  />
                  <div className="crew-hero-switch-hint font-tech">
                    <span>💬 클릭하여 크루 메모 보기</span>
                  </div>
                </Motion.div>
              ) : (
                <Motion.div
                  key="hero-notes"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                  className="crew-hero-mode-wrap crew-hero-notes-frame"
                >
                  <div className="crew-hero-notes-header">
                    <div>
                      <div className="font-tech" style={{ color: 'var(--neon-cyan, #00f3ff)', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <StickyNote size={14} /> CREW POST-IT BOARD
                      </div>
                      <h2 className="font-title" style={{ margin: '0.15rem 0 0', fontSize: '1.25rem', color: '#ffffff' }}>크루 공유 메모장</h2>
                    </div>
                  </div>

                  <div className="crew-comms-composer" style={{ marginTop: '0.75rem' }}>
                    <textarea
                      style={{ ...inputStyle, minHeight: 64, resize: 'vertical', lineHeight: 1.45, fontSize: '0.85rem' }}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={handleNoteKeyDown}
                      placeholder="나누고 싶은 글, 오늘의 약속, 먼저 들어온 사람이 남기는 말을 적어주세요."
                      maxLength={NOTE_MAX_LENGTH}
                      disabled={activeNoteAction === 'posting'}
                    />
                    <button
                      className="space-btn cosmic-btn font-tech"
                      type="button"
                      disabled={activeNoteAction === 'posting' || !noteText.trim()}
                      onClick={() => handlePostNote()}
                      style={{ borderRadius: 8, minWidth: 54, minHeight: 46, padding: '0 0.9rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {activeNoteAction === 'posting' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                    </button>
                  </div>

                  <div className="font-tech" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', marginTop: '-0.3rem', marginBottom: '0.6rem', textAlign: 'right' }}>
                    {noteText.length}/{NOTE_MAX_LENGTH} · 작성 메모는 7일간 유지됩니다
                  </div>

                  {displayNotes.length ? (
                    <div className="crew-comms-log" style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {displayNotes.map((note, index) => {
                        const { normalizedReadBy, totalCount, readCount, hasCurrentUserRead, isFullyRead } = getGreetingReadMeta(note, activeParticipantIds, user?.uid);
                        const canDeleteNote = note.userId === user?.uid || isLeader || userData?.role === 'admin';
                        const noteColor = ['rgba(250, 204, 21, 0.18)', 'rgba(45, 212, 191, 0.16)', 'rgba(96, 165, 250, 0.16)', 'rgba(251, 191, 36, 0.14)'][index % 4];
                        return (
                          <div
                            key={note.id || `${note.userId}-${index}`}
                            className="crew-comms-message"
                            style={{ '--note-tint': noteColor, padding: '0.75rem 0.85rem' }}
                          >
                            <div className="font-tech" style={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.74rem', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                <strong>{memberNameById.get(note.userId) || note.userName || '크루 멤버'}</strong>
                                {note.userId === user?.uid && (
                                  <span style={{ padding: '0.1rem 0.4rem', borderRadius: 999, background: 'rgba(96,165,250,0.16)', color: 'var(--crystal-cyan)', fontSize: '0.68rem' }}>내 메모</span>
                                )}
                              </span>
                              <span style={{ color: isFullyRead ? 'var(--planet-green)' : 'rgba(255,255,255,0.64)', fontSize: '0.7rem' }}>
                                읽음 {readCount}/{totalCount}명
                              </span>
                            </div>
                            <div className="font-tech" style={{ color: 'var(--text-bright)', fontSize: '0.84rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '0.5rem' }}>{note.text}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="font-tech" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem' }}>
                                {normalizedReadBy.length > 0 ? `읽은 사람 ${readCount}명` : '아직 읽은 사람이 없습니다'}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {note.userId !== user?.uid && (
                                  <button
                                    type="button"
                                    className="space-nav-link font-tech"
                                    onClick={() => handleReadNote(note.id)}
                                    disabled={activeNoteAction === `read:${note.id}` || activeNoteAction === 'posting' || hasCurrentUserRead}
                                    style={{ borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.74rem' }}
                                  >
                                    {hasCurrentUserRead ? '읽음' : '읽었어요'}
                                  </button>
                                )}
                                {canDeleteNote && (
                                  <button
                                    type="button"
                                    className="space-nav-link font-tech"
                                    onClick={() => handleDeleteNote(note.id)}
                                    disabled={activeNoteAction === `delete:${note.id}` || activeNoteAction === 'posting'}
                                    style={{ borderRadius: 6, padding: '0.25rem 0.5rem', fontSize: '0.74rem', color: '#fca5a5' }}
                                  >
                                    <Trash2 size={12} /> 삭제
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ borderRadius: 10, minHeight: 90, background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.45)' }}>
                      <div className="font-tech" style={{ textAlign: 'center', fontSize: '0.8rem' }}>
                        <StickyNote size={18} style={{ marginBottom: '0.3rem', opacity: 0.5 }} />
                        <div>아직 남겨진 포스트잇이 없습니다. (7일간 유지 후 자동 정리)</div>
                      </div>
                    </div>
                  )}
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="crew-launch-console">
            <div className="crew-launch-label font-tech"><Radio size={14} /> FOCUS CHANNEL</div>
            <strong className="font-title">집중 모드 준비 완료</strong>
            <span className="font-tech">Google Meet에서 크루원과 바로 연결됩니다.</span>
            <button
              type="button"
              className="crew-launch-button font-tech"
              disabled={status !== 'approved' || !!roomAction || !crew.googleMeetUrl}
              onClick={handleEnterMeet}
            >
              {roomAction === 'entering' ? <Loader2 size={18} className="crew-spin" /> : <Rocket size={18} />}
              {roomAction === 'entering' ? '항로 확인 중...' : '집중방 입장'}
            </button>
            {status === 'approved' && crew.googleMeetUrl && (
              <div className="crew-meet-fallbacks">
                <button type="button" className="font-tech" disabled={!!roomAction} onClick={() => handleCopyMeetAccess('code')}>
                  <Copy size={13} /> 회의 코드 복사
                </button>
                <button type="button" className="font-tech" disabled={!!roomAction} onClick={() => handleCopyMeetAccess('link')}>
                  <Share2 size={13} /> 링크 복사
                </button>
              </div>
            )}
            {meetMessage && (
              <small className={`crew-meet-message font-tech ${/못|실패|없/.test(meetMessage) ? 'is-error' : ''}`} role="status">
                {meetMessage}
              </small>
            )}
            {status !== 'approved' && <small className="font-tech">운영자 승인 후 항로가 열립니다.</small>}
            {status === 'approved' && !crew.googleMeetUrl && <small className="font-tech">운영자가 집중방 좌표를 준비 중입니다.</small>}
          </aside>
        </div>

        <div className="crew-flight-stats">
          {[
            { label: 'CREW', value: `${Math.max(crew.memberCount || rosterMembers.length || 1, rosterMembers.length) + activeGuestCount}명` },
            { label: 'ROSTER', value: '요약 모드' },
            { label: 'MOTHERSHIP', value: `Lv.${mothershipLevel.level} ${mothershipLevel.name}`, helpTab: 'level' },
            { label: 'MISSION XP', value: `${mothershipStats.xp.toLocaleString()} XP`, helpTab: 'xp' },
            { label: 'SCHEDULE', value: formatCrewSchedule(crew.scheduleDays, crew.scheduleTimes) },
          ].map((item) => (
            <div key={item.label} className={item.helpTab ? 'has-help-stat' : ''}>
              <span className="font-tech">
                {item.label}
                {item.helpTab && (
                  <button
                    type="button"
                    className="crew-stat-help-btn"
                    aria-label={`${item.label} 설명 보기`}
                    onClick={(e) => {
                      e.stopPropagation();
                      soundManager.playClick();
                      setGuideModalState({ isOpen: true, tab: item.helpTab });
                    }}
                  >
                    <CircleHelp size={13} />
                  </button>
                )}
              </span>
              <strong className="font-tech">{item.value}</strong>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="crew-details-toggle font-tech"
          onClick={() => { soundManager.playClick(); setShowCrewInfo((prev) => !prev); }}
        >
          {showCrewInfo ? '모함 정보 닫기' : '모함 살펴보기'}
          <ChevronDown size={15} style={{ transform: showCrewInfo ? 'rotate(180deg)' : 'none' }} />
        </button>

        {showCrewInfo && (
          <Motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="crew-detail-drawer">
            <div>
              <span className="font-tech">INVITE CODE</span>
              <strong className="font-tech">{crew.inviteCode || '-'}</strong>
            </div>
            <div>
              <span className="font-tech">SECTOR</span>
              <strong className="font-tech">{crew.groupName || '자유 스터디'}</strong>
            </div>
            <div className="crew-detail-description">
              <span className="font-tech">MOTHERSHIP LOG</span>
              <p className="font-tech">{crew.description || '아직 기록된 크루 설명이 없습니다.'}</p>
            </div>
          </Motion.div>
        )}

        {isGuest && (
          <div className="crew-guest-strip font-tech">
            <div><span>GUEST PASS</span> 친구와 4주 동안 함께 공부해 보세요 · 첫 입장 24시간 후 퀴즈 배틀 2회와 실제 답변 10문제를 완료하면 활동 게스트로 자동 집계됩니다. 탐사원·NOVA-7 대결 모두 인정됩니다.</div>
            {userData?.referralTracked && userData?.referralToken && (
              <button
                type="button"
                onClick={() => navigate(`/trial?ref=${encodeURIComponent(userData.referralToken)}`)}
              >
                <Rocket size={13} /> 4주 무료체험 신청
              </button>
            )}
            <button type="button" onClick={handleGuestLogout} disabled={!!guestLogoutAction}>
              <LogOut size={13} /> {guestLogoutAction ? '종료 중...' : '게스트 로그아웃'}
            </button>
          </div>
        )}
      </Motion.section>

      {status === 'approved' && crewId && (
        <section className="crew-system-launcher">
          <button type="button" className={activeCrewSystem === 'construction' ? 'is-active' : ''} onClick={() => setActiveCrewSystem((current) => current === 'construction' ? '' : 'construction')}>
            <span className="font-tech">MOTHERSHIP</span><strong className="font-title">공동 건설</strong><small className="font-tech">{Number(crew?.currentMothershipProject?.contributedOre || 0).toLocaleString()} / {Number(crew?.currentMothershipProject?.requiredOre || 0).toLocaleString()} 광석</small><ChevronDown size={16} />
          </button>
          <button type="button" className={activeCrewSystem === 'chest' ? 'is-active' : ''} onClick={() => setActiveCrewSystem((current) => current === 'chest' ? '' : 'chest')}>
            <span className="font-tech">CREW CHEST</span><strong className="font-title">광석 상자</strong><small className="font-tech">{Number(crew?.crystalChest?.energy || 0)} / {Number(crew?.crystalChest?.target || 100)} 충전</small><ChevronDown size={16} />
          </button>
          <button type="button" className={activeCrewSystem === 'event' ? 'is-active' : ''} onClick={() => setActiveCrewSystem((current) => current === 'event' ? '' : 'event')}>
            <span className="font-tech">CREW 20 EVENT</span><strong className="font-title">크루 구성 현황</strong><small className="font-tech">정식 크루원 {crewMemberIds.length}명</small><ChevronDown size={16} />
          </button>
        </section>
      )}

      {status === 'approved' && crewId && activeCrewSystem === 'construction' && (
        <CrewConstructionDock
          crew={crew}
          crewId={crewId}
          userData={{ ...userData, uid: user?.uid }}
          isLeader={isLeader}
          isGuest={isGuest}
        />
      )}

      {/* Leaders always see the control. Members see it only while guest access is open. */}
      {status === 'approved' && !isGuest && (guestAccessEnabled || isLeader) && (
        <Motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="crew-guest-access-bar">
          <div className="crew-guest-access-label">
            <span className="font-tech"><Share2 size={14} /> GUEST ACCESS</span>
            <strong className="font-tech">{guestAccessEnabled ? '외부 승무원 초대 가능' : '게스트 초대 중지'}</strong>
            {guestAccessEnabled && <small className="crew-guest-benefit-copy font-tech">링크로 초대된 친구는 학부모 확인 후 4주 무료체험을 신청할 수 있습니다.</small>}
          </div>
          {guestAccessEnabled && guestInviteUrl && (
            <div className="crew-guest-share-link">
              <span className="font-tech">{guestInviteUrl}</span>
              <button type="button" className="font-tech" onClick={copyGuestInvite}><Copy size={13} /> 링크 복사</button>
            </div>
          )}
          {guestAccessEnabled && !guestInviteUrl && (
            <button type="button" className="crew-guest-toggle font-tech" onClick={() => setGuestInviteRequested(true)} disabled={guestInviteRequested}>
              <Share2 size={13} /> {guestInviteRequested ? '링크 준비 중...' : '초대 링크 준비'}
            </button>
          )}
          {isLeader && (
            <button
              type="button"
              className={`crew-guest-toggle font-tech ${guestAccessEnabled ? 'is-on' : ''}`}
              disabled={!!guestAccessAction}
              onClick={toggleGuestAccess}
            >
              {guestAccessAction ? '처리 중...' : guestAccessEnabled ? '참여 끄기' : '참여 허용'}
            </button>
          )}
          {guestMessage && <div className="crew-guest-access-message font-tech">{guestMessage}</div>}
        </Motion.section>
      )}

      {status === 'approved' && crewId && activeCrewSystem === 'event' && (
        <section className="crew-growth-status">
          <div className="crew-growth-status__head">
            <div><span className="font-tech">CREW 20 EVENT</span><strong className="font-title">크루 구성 현황</strong></div>
            <b className="font-tech">{growthEvent?.eligibleCount ?? '…'} / 20명</b>
          </div>
          <div className="crew-growth-status__metrics">
            <div><span>정식 크루원</span><strong>{growthEvent?.memberCount ?? crewMemberIds.length}명</strong></div>
            <div><span>이벤트 대상 정회원</span><strong>{growthEvent?.eventEligibleMemberCount ?? growthEvent?.memberCount ?? crewMemberIds.length}명</strong></div>
            <div><span>활동 게스트</span><strong>{growthEvent?.activeGuestCount ?? 0}명</strong></div>
            <div><span>참여 완료·재집계 제외</span><strong>{growthEvent?.eventCompletedMemberCount ?? 0}명</strong></div>
            <div><span>체험·확인 중</span><strong>{growthEvent?.pendingGuestCount ?? activeGuestCount}명</strong></div>
            <div><span>현재 접속 게스트</span><strong>{activeGuestCount}명</strong></div>
          </div>
          <CrewGrowthRewardExperience
            crewId={crewId}
            progress={growthEvent}
            onProgressChange={setGrowthEvent}
            isGuest={isGuest}
          />
          <div className="crew-growth-status__rules font-tech">
            <button
              type="button"
              className="crew-growth-rules-toggle font-tech"
              onClick={() => {
                soundManager.playClick();
                setShowGrowthRules((prev) => !prev);
              }}
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>부정 방지·집계 규정 자세히 보기</span>
              <ChevronDown size={14} style={{ transform: showGrowthRules ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
            {showGrowthRules && (
              <div className="crew-growth-rules-body" style={{ marginTop: '0.65rem', display: 'grid', gap: '0.35rem' }}>
                <span>첫 입장 24시간 + 퀴즈 배틀 2회 + 실제 답변 10문제를 완료하면 자동 집계됩니다.</span>
                <span>탐사원 대전과 NOVA-7 AI 대결을 모두 인정합니다. 동일 기기 중복은 자동 제외되며, 동일 IP의 단시간 다량 생성과 비정상 활동은 운영툴에서 사후 검토하여 로그인 정지·삭제할 수 있습니다.</span>
                <span>20명 도달 순간의 명단이 48시간 고정됩니다. 중간에 새로 가입한 회원은 이탈자를 대신할 수 없으며, 인원이 부족해지면 검증이 다시 시작됩니다.</span>
                <span>한 계정은 이벤트 전체에서 한 번만 달성 인원과 1,000광석 대상이 될 수 있습니다. 보상 후 다른 크루 가입은 가능하지만 이벤트에는 재집계되지 않습니다.</span>
                {growthEvent?.currentUserEventCompleted && <span style={{ color: '#f0abfc' }}>내 계정은 이벤트 참여를 이미 완료해 현재 크루의 달성 인원에서 제외됩니다.</span>}
                <span>멤버별 고유 링크는 1회용이 아닙니다. 같은 링크 하나로 여러 친구를 제한 없이 초대할 수 있으며, 친구마다 별도의 게스트 UID가 발급됩니다.</span>
              </div>
            )}
          </div>
        </section>
      )}

      {status === 'approved' && crewId && activeCrewSystem === 'chest' && (
        <CrewCrystalChest
          crewId={crewId}
          isGuest={isGuest}
          revision={getTimestampMs(crew?.crystalChest?.updatedAt) || Number(crew?.crystalChest?.cycle || 0)}
        />
      )}

      <div className="crew-bridge-workspace">
      {status === 'approved' && crewId && (
        <section className="crew-workspace-mission">
          <StudyCrewDailyMission
            scopeType="crew"
            scopeId={crewId}
            targetCount={Math.min(2, crewMemberIds.length) || 1}
            totalMemberCount={crewMemberIds.length || enrichedMembers.length || 1}
            constructionXP={mothershipStats.xp}
          />
        </section>
      )}

      {/* Members */}
      <section className="crew-workspace-roster">
        <div className="crew-section-heading font-tech">
          <Users size={15} /> FLIGHT CREW
          <span>{enrichedMembers.length} MEMBERS</span>
        </div>
        {isGuest && (
          <div className="crew-roster-guest-notice font-tech">
            {rosterMembers.length > 0
              ? '게스트에게는 크루원의 공개 이름, 역할과 접속 상태만 표시됩니다.'
              : '게스트에게 공개된 크루 멤버 정보가 없습니다. 현재 접속 인원만 표시합니다.'}
          </div>
        )}
        <div className="crew-roster-spotlights">
          {leaderMember?.uid && (
            <CrewSpotlightCard
              member={leaderMember}
              profile={effectiveMemberProfiles[leaderMember.uid]}
              type="leader"
              fallbackName={crew?.leaderName || '크루 창설자'}
            />
          )}
          {featuredContributorMember?.uid ? (
            <CrewSpotlightCard
              member={featuredContributorMember}
              profile={effectiveMemberProfiles[featuredContributorMember.uid]}
              type="contributor"
              fallbackName={crew?.crystalChest?.currentContributorNamesById?.[featuredContributorMember.uid] || crew?.crystalChest?.lastContributorName || '빛나는 크루원'}
            />
          ) : (
            <div className="crew-spotlight-empty">
              <Sparkles size={18} />
              <div><strong className="font-tech">NEXT CREW LIGHT</strong><span className="font-tech">첫 과제 피드백 40광석 기여자를 기다리고 있어요.</span></div>
            </div>
          )}
        </div>
        <div className="crew-roster-preview font-tech">
          <span>{enrichedMembers.slice(0, 5).map((member) => getMemberLabel(effectiveMemberProfiles[member.uid], getMemberLabel(member))).join(' · ')}</span>
          {enrichedMembers.length > 5 && <b>+{enrichedMembers.length - 5}</b>}
        </div>
        <button type="button" className="crew-roster-open font-tech" onClick={() => { soundManager.playClick(); setShowRosterModal(true); }}>
          <Users size={15} /> 전체 멤버 {enrichedMembers.length}명 보기 <ChevronRight size={16} />
        </button>
      </section>
      </div>

      <AnimatePresence>
        {showRosterModal && (
          <CrewRosterModal
            open={showRosterModal}
            onClose={closeRosterModal}
            members={enrichedMembers}
            profiles={effectiveMemberProfiles}
            loading={rosterLoading}
            currentUid={user?.uid}
            currentUserData={userData}
            currentDisplayName={user?.displayName}
            todayKey={todayKey}
            clusterNameMap={clusterNameMap}
            isGuest={isGuest}
          />
        )}
      </AnimatePresence>

      {userData?.crewRole === 'leader' && (
        <section className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h3 className="font-tech" style={{ color: 'var(--crystal-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Crown size={16} /> 리더 설정
            </h3>
            <button
              type="button"
              className="space-nav-link font-tech active"
              onClick={() => { soundManager.playClick(); setShowSettingsModal(true); }}
              style={{ borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
            >
              설정 열기
            </button>
          </div>
          <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginTop: '0.8rem' }}>
            크루 이름, 모토, 군집, 엠블럼은 거의 수정하지 않는 값입니다. 버튼을 눌러 모달에서만 변경하세요.
          </div>
        </section>
      )}

      <section className="glass-card hud-border" style={{ padding: '1.2rem', borderRadius: 12, marginTop: '1.2rem', borderColor: 'rgba(248,113,113,0.24)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 className="font-tech" style={{ color: '#fca5a5', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <LogOut size={16} /> {isLeader ? '크루 삭제' : '크루 탈퇴'}
          </h3>
          <button
            type="button"
            className="space-nav-link font-tech"
            onClick={handleLeaveCrew}
            disabled={leaveAction === 'leaving' || (isLeader && !canLeaderDeleteCrew)}
            style={{ borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#fca5a5', opacity: leaveAction === 'leaving' || (isLeader && !canLeaderDeleteCrew) ? 0.55 : 1 }}
          >
            <LogOut size={15} />
            {leaveAction === 'leaving' ? '처리 중...' : isLeader ? '크루 삭제 후 탈퇴' : '크루 탈퇴'}
          </button>
        </div>
        <div className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.8rem' }}>
          {isLeader
            ? canLeaderDeleteCrew
              ? '현재 리더 혼자 남아 있어 탈퇴가 가능하며, 이 경우 크루 자체가 삭제됩니다.'
              : '리더는 다른 크루 멤버가 모두 탈퇴한 뒤, 혼자 남았을 때만 크루를 삭제할 수 있습니다.'
            : '탈퇴하면 현재 크루에서 빠집니다. 다시 참여하려면 일반 참여 흐름으로 다시 들어와야 합니다.'}
        </div>
      </section>

      {message && <p className="font-tech" style={{ marginTop: '1rem', color: message.includes('실패') || message.includes('못했') ? '#f87171' : 'var(--planet-green)' }}>{message}</p>}
      <CrewSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        crew={crew}
      />
      <CrewGuideModal
        isOpen={guideModalState.isOpen}
        onClose={() => setGuideModalState({ isOpen: false, tab: 'all' })}
        initialTab={guideModalState.tab}
      />
    </div>
  );
}
