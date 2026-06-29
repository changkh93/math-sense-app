import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { AlertTriangle, ArrowLeft, CalendarDays, ChevronDown, Crown, Edit3, Loader2, Mail, Plus, Radio, Send, ShieldCheck, Sparkles, UserRound, Users } from 'lucide-react';
import { db, functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import soundManager from '../../utils/SoundManager';
import CrewJoinModal from './CrewJoinModal';
import CrewCreateModal from './CrewCreateModal';
import CrewDetailView from './CrewDetailView';
import StudyCrewDailyMission from './StudyCrewDailyMission';
import { formatCrewSchedule } from './crewSchedule';

function getCrewStatusLabel(s) { return s === 'approved' ? '활동 중' : s === 'rejected' ? '반려됨' : '승인 대기'; }
function getCrewStatusColor(s) { return s === 'approved' ? 'var(--planet-green)' : s === 'rejected' ? '#f87171' : 'var(--planet-orange)'; }
function getProfileName(profile = {}, fallback = '탐사원') {
  return profile.publicDisplayName || profile.studentName || profile.name || profile.displayName || fallback;
}
function getProfileGrade(profile = {}) {
  return profile.gradeLabel || profile.grade || profile.schoolGrade || profile.studentGrade || '학년 미지정';
}
function getProfileCourse(profile = {}) {
  return profile.selectedCourse || profile.courseName || profile.currentCourse || profile.clusterName || '과정 미지정';
}
function getProfileCrewName(profile = {}) {
  return profile.crewName || profile.crewSnapshot?.name || '소속 크루 없음';
}
function getTimestampMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}
function isLiveStudent(profile = {}, now = Date.now()) {
  const live = profile.liveStatus || {};
  const updatedMs = getTimestampMs(live.lastUpdatedAt);
  if (!updatedMs || now - updatedMs > 5 * 60 * 1000) return false;
  return live.state === 'online' || live.state === 'away';
}
function formatLiveState(profile = {}) {
  const live = profile.liveStatus || {};
  if (live.state === 'away') return { label: '자리비움', color: '#fbbf24', dot: '#fbbf24' };
  return { label: '온라인', color: 'var(--planet-green)', dot: '#22c55e' };
}
function getMemoErrorMessage(err) {
  if (err?.code === 'permission-denied') return '편지함 권한이 아직 열리지 않았습니다. Firestore rules 배포가 필요합니다.';
  if (err?.code === 'functions/internal' || err?.message?.includes('internal')) return '편지 발송 서버가 아직 준비되지 않았습니다. Cloud Functions 배포가 필요합니다.';
  return err?.message || '편지를 보내지 못했습니다.';
}

const FAQ_ITEMS = [
  { q: '스터디 크루란 무엇인가요?', a: '스터디 크루는 함께 공부할 멤버를 정하고 Google Meet에서 만나 학습 리듬을 유지하는 프리미엄 스터디 그룹입니다.' },
  { q: '창설권과 참여권의 차이는 무엇인가요?', a: '창설권(1,000광석)은 새 크루를 만들 때 필요하고, 참여권(300광석)은 다른 크루에 합류할 때 필요합니다. 두 가지 모두 스토어에서 구매할 수 있습니다.' },
  { q: '집중방은 어떻게 사용하나요?', a: '오픈 스터디나 내 크루에서 참여하기를 누르면 운영자가 준비한 Google Meet 대기방으로 입장합니다.' },
  { q: '몇 명까지 참여할 수 있나요?', a: '입장 가능 인원과 운영 방식은 등록된 Google Meet 정책을 따릅니다.' },
  { q: '크루 승인은 얼마나 걸리나요?', a: '운영자가 크루 이름과 모토를 확인한 후 승인합니다. 보통 1~2일 이내에 처리됩니다.' },
];

const OPEN_STUDY_POOLS = [
  { id: 'elem_2_4', label: '초2~초4', title: '기초 탐험반', desc: '기초 개념을 함께 다지는 저학년 오픈 스터디', color: '#38bdf8' },
  { id: 'elem_5', label: '초5', title: '초5 도약반', desc: '분수, 도형, 문장제를 같이 밀어 올리는 방', color: '#34d399' },
  { id: 'elem_6', label: '초6', title: '초6 전환반', desc: '중등 수학으로 넘어가기 전 마지막 점검', color: '#fbbf24' },
  { id: 'mid_1', label: '중1', title: '중1 개척반', desc: '문자와 식, 함수 감각을 함께 잡는 방', color: '#f97316' },
  { id: 'mid_2_3', label: '중2~중3', title: '중등 심화반', desc: '고난도 문제와 개념 연결을 같이 푸는 방', color: '#a78bfa' },
  { id: 'free', label: '자유학년', title: '자유 합류반', desc: '학년이 애매하거나 자유롭게 함께 공부하는 방', color: '#fb7185' },
];

function normalizeOpenStudyPoolIdFromGrade(grade) {
  const text = String(grade || '').replace(/\s+/g, '');
  const number = Number(text.match(/\d+/)?.[0] || 0);
  const isMiddle = /중|middle|mid/i.test(text);
  const isElementary = /초|elementary|elem/i.test(text);

  if (isMiddle) {
    if (number === 1) return 'mid_1';
    if (number === 2 || number === 3) return 'mid_2_3';
  }
  if (isElementary || number > 0) {
    if (number >= 2 && number <= 4) return 'elem_2_4';
    if (number === 5) return 'elem_5';
    if (number === 6) return 'elem_6';
  }
  return 'free';
}

function FounderLetterPanel({ crew, founderId, founderName, currentUid }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const isSelf = founderId && founderId === currentUid;
  const canSend = !!founderId && !isSelf;

  const stopCardClick = (event) => {
    event.stopPropagation();
  };

  const handleSend = async (event) => {
    event.stopPropagation();
    const body = draft.trim();
    if (!body || !canSend || sending) return;

    setSending(true);
    setStatus('');
    soundManager.playClick();
    try {
      const fn = httpsCallable(functions, 'sendDirectMemo');
      const res = await fn({
        recipientId: founderId,
        body: `[${crew.name || '스터디 크루'} 창설자에게]\n${body}`,
      });
      const data = res?.data || {};
      setDraft('');
      setStatus(`${data.recipientName || founderName}님에게 편지를 보냈습니다.`);
    } catch (err) {
      console.error('Failed to send crew founder memo:', err);
      setStatus(getMemoErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={stopCardClick} onMouseDown={stopCardClick} style={{ marginTop: '0.7rem' }}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (!canSend) return;
          soundManager.playClick();
          setIsOpen((prev) => !prev);
        }}
        disabled={!canSend}
        className="font-tech"
        title={isSelf ? '내가 만든 크루입니다' : '창설자에게 편지 보내기'}
        style={{
          width: '100%',
          minHeight: 36,
          borderRadius: 8,
          border: '1px solid rgba(147,197,253,0.2)',
          background: canSend ? 'rgba(96,165,250,0.09)' : 'rgba(255,255,255,0.035)',
          color: canSend ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.38)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.45rem',
          cursor: canSend ? 'pointer' : 'not-allowed',
          fontWeight: 800,
          fontSize: '0.78rem',
          padding: '0.55rem 0.65rem'
        }}
      >
        <Mail size={14} />
        {isSelf ? '내가 창설한 크루' : '창설자에게 편지'}
      </button>

      <AnimatePresence>
        {isOpen && canSend && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: '0.55rem',
              padding: '0.75rem',
              borderRadius: 8,
              background: 'rgba(2,6,23,0.54)',
              border: '1px solid rgba(147,197,253,0.16)',
              display: 'grid',
              gap: '0.55rem'
            }}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                placeholder={`${founderName} 창설자에게 남길 편지`}
                disabled={sending}
                className="font-tech"
                style={{
                  width: '100%',
                  minHeight: 86,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  border: '1px solid rgba(147,197,253,0.22)',
                  borderRadius: 8,
                  background: 'rgba(7,13,30,0.78)',
                  color: 'var(--text-bright)',
                  padding: '0.72rem 0.8rem',
                  lineHeight: 1.5,
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.7rem' }}>
                <span className="font-tech" style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.72rem' }}>
                  {draft.length}/2000
                </span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  className="font-tech"
                  style={{
                    minHeight: 34,
                    borderRadius: 8,
                    border: '1px solid rgba(0,243,255,0.26)',
                    background: 'rgba(0,243,255,0.12)',
                    color: 'var(--text-bright)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.7rem',
                    cursor: !draft.trim() || sending ? 'not-allowed' : 'pointer',
                    opacity: !draft.trim() || sending ? 0.55 : 1,
                    fontWeight: 800
                  }}
                >
                  {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                  {sending ? '보내는 중' : '보내기'}
                </button>
              </div>
              {status && (
                <div className="font-tech" style={{
                  color: status.includes('못했') || status.includes('오류') ? '#fecaca' : '#bbf7d0',
                  background: status.includes('못했') || status.includes('오류') ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                  border: status.includes('못했') || status.includes('오류') ? '1px solid rgba(239,68,68,0.18)' : '1px solid rgba(34,197,94,0.16)',
                  borderRadius: 8,
                  padding: '0.55rem 0.65rem',
                  fontSize: '0.75rem',
                  lineHeight: 1.45
                }}>
                  {status}
                </div>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CrewCard({ crew, userUid, userCrewId, onClick, onlineCount = 0, founderProfile = null }) {
  const leaderId = crew.leaderId || crew.leaderUid || '';
  const founderName = getProfileName(founderProfile || {}, crew.leaderName || '창설자 정보 없음');
  const founderHint = founderProfile?.publicTitle || founderProfile?.crewName || founderProfile?.publicSignature || '';
  const isMyCreated = leaderId === userUid;
  const isMyJoined = !isMyCreated && crew.memberIds?.includes(userUid);
  const isMyCrew = crew.id === userCrewId;
  const isApproved = crew.status === 'approved';
  const canJoin = isApproved && !isMyCrew;
  const description = crew.description || crew.motto || '상세 설명 없음';
  const scheduleText = formatCrewSchedule(crew.scheduleDays || [], crew.scheduleTimes || {});

  let badgeText = '';
  let badgeColor = '';
  let badgeBg = '';
  if (isMyCreated) { badgeText = '내가 만든 크루'; badgeColor = '#fbbf24'; badgeBg = 'rgba(251,191,36,0.12)'; }
  else if (isMyJoined || isMyCrew) { badgeText = '참여 중'; badgeColor = 'var(--planet-green)'; badgeBg = 'rgba(16,185,129,0.12)'; }
  else if (!isApproved) { badgeText = getCrewStatusLabel(crew.status); badgeColor = getCrewStatusColor(crew.status); badgeBg = 'rgba(255,165,0,0.08)'; }
  else { badgeText = '참여 가능'; badgeColor = 'var(--crystal-cyan)'; badgeBg = 'rgba(0,243,255,0.08)'; }

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, borderColor: 'rgba(0, 243, 255, 0.4)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(crew)}
      style={{
        background: 'rgba(7, 13, 30, 0.82)',
        border: isMyCrew ? '1px solid rgba(0, 243, 255, 0.35)' : '1px solid rgba(255,255,255,0.09)',
        borderRadius: 12, padding: '1.1rem', cursor: 'pointer',
        transition: 'border-color 0.2s',
        boxShadow: isMyCrew ? '0 0 20px rgba(0,243,255,0.08)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', gap: '0.85rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: crew.color || '#00d4ff',
          boxShadow: `0 0 14px ${(crew.color || '#00d4ff')}44`
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span className="font-tech" style={{ padding: '0.2rem 0.55rem', borderRadius: 999, background: badgeBg, color: badgeColor, fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {badgeText}
            </span>
          </div>
          <h4 className="font-title" style={{ color: 'var(--text-bright)', margin: 0, fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {crew.name || '이름 없는 크루'}
          </h4>
          <div className="font-tech" style={{
            color: 'rgba(255,255,255,0.72)',
            margin: '0.35rem 0 0',
            fontSize: '0.82rem',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {description}
          </div>
          <div className="font-tech" style={{
            marginTop: '0.5rem',
            color: 'rgba(255,255,255,0.62)',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.4rem'
          }}>
            <CalendarDays size={13} style={{ color: 'var(--crystal-cyan)', flexShrink: 0, marginTop: 1 }} />
            <span style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {scheduleText}
            </span>
          </div>
          <div className="font-tech" style={{
            marginTop: '0.55rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            minWidth: 0,
            color: 'rgba(255,255,255,0.72)',
            fontSize: '0.78rem'
          }}>
            <UserRound size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <span style={{ color: '#fbbf24', fontWeight: 800, flexShrink: 0 }}>창설자</span>
            <span title={founderHint || founderName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {founderName}
            </span>
          </div>
          <FounderLetterPanel crew={crew} founderId={leaderId} founderName={founderName} currentUid={userUid} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.7rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Users size={13} /> {crew.memberCount || crew.memberIds?.length || 1}명
          </div>
          <div className="font-tech" style={{
            color: 'var(--planet-green)',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.18rem 0.45rem',
            borderRadius: 999,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.16)'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--planet-green)', boxShadow: '0 0 8px rgba(16,185,129,0.7)' }} />
            온라인 {onlineCount}명
          </div>
        </div>
        <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {crew.groupName || '자유 스터디'}
        </div>
        {isMyCreated && <Crown size={14} style={{ color: '#fbbf24' }} />}
        {canJoin && <Sparkles size={13} style={{ color: 'var(--crystal-cyan)' }} />}
      </div>
    </Motion.div>
  );
}

function OpenStudyCard({ pool, recommended, disabled, joining, onJoin, activity }) {
  const activeNames = activity?.names || [];
  return (
    <Motion.div
      whileHover={{ y: disabled ? 0 : -3 }}
      style={{
        minHeight: 172,
        borderRadius: 18,
        padding: '1rem',
        background: recommended
          ? `linear-gradient(135deg, ${pool.color}26, rgba(7,13,30,0.9) 58%)`
          : 'rgba(7,13,30,0.76)',
        border: `1px solid ${recommended ? `${pool.color}88` : 'rgba(255,255,255,0.09)'}`,
        boxShadow: recommended ? `0 0 28px ${pool.color}1f` : '0 10px 26px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: disabled ? 0.62 : 1,
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', alignItems: 'flex-start' }}>
          <div>
            <div className="font-tech" style={{ color: pool.color, fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.08em' }}>
              {pool.label}
            </div>
            <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.08rem', marginTop: '0.32rem', lineHeight: 1.25 }}>
              {pool.title}
            </div>
          </div>
          {recommended && (
            <span className="font-tech" style={{
              color: '#06111f',
              background: pool.color,
              borderRadius: 999,
              padding: '0.2rem 0.48rem',
              fontSize: '0.68rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}>
              추천
            </span>
          )}
        </div>
        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.82rem', lineHeight: 1.55, marginTop: '0.65rem' }}>
          {pool.desc}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
          <span className="font-tech" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.32rem' }}>
            <Radio size={13} /> 현재 {activity?.count || 0}명 접속 중
          </span>
          <span className="font-tech" style={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.76rem' }}>
            Google Meet 대기방
          </span>
        </div>
        {activeNames.length > 0 && (
          <div className="font-tech" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.76rem', lineHeight: 1.45, marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeNames.slice(0, 3).join(', ')}{activity.count > 3 ? ` 외 ${activity.count - 3}명` : ''}
          </div>
        )}
        <button
          type="button"
          className={`space-btn font-tech ${recommended ? 'cosmic-btn' : ''}`}
          onClick={() => onJoin(pool.id)}
          disabled={disabled || joining}
          style={{
            width: '100%',
            minHeight: 42,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            background: recommended ? undefined : 'rgba(255,255,255,0.08)',
            border: recommended ? undefined : '1px solid rgba(255,255,255,0.1)',
            opacity: disabled ? 0.65 : 1,
          }}
        >
          {joining ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
          {joining ? '확인 중...' : recommended ? '내 학년으로 참여' : '참여하기'}
        </button>
      </div>
    </Motion.div>
  );
}

function OpenStudyWaitingRoom({ pool, activity, activeStudents, recommended, joining, onBack, onEnterMeet, onOpenLivePanel, isMobile }) {
  return (
    <div className="fade-in" style={{ minHeight: '100vh', padding: isMobile ? '1rem 0.75rem 6.5rem' : '2rem 1rem 6rem' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', width: '100%' }}>
        <button
          type="button"
          className="space-nav-link font-tech"
          onClick={onBack}
          style={{ borderRadius: 10, marginBottom: '1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <ArrowLeft size={16} /> 오픈 스터디 목록으로
        </button>

        <section className="glass-card hud-border" style={{ borderRadius: 16, padding: isMobile ? '1.2rem' : '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: pool.color,
              boxShadow: `0 0 22px ${pool.color}55`,
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="font-tech" style={{ color: pool.color, fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                OPEN GRADE STUDY
              </div>
              <h2 className="font-title" style={{ color: 'var(--text-bright)', fontSize: isMobile ? '1.55rem' : '2rem', margin: '0.28rem 0 0' }}>
                {pool.title}
              </h2>
              <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0.45rem 0 0' }}>
                {pool.desc}
              </p>
            </div>
            {recommended && (
              <span className="font-tech" style={{
                color: '#06111f',
                background: pool.color,
                borderRadius: 999,
                padding: '0.32rem 0.65rem',
                fontSize: '0.74rem',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}>
                내 추천
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: '0.7rem', marginTop: '1.15rem' }}>
            {[
              { label: '학년', value: pool.label },
              { label: '접속', value: `${activity?.count || 0}명` },
              { label: '방식', value: 'Google Meet' },
            ].map((item) => (
              <div key={item.label} style={{ background: 'rgba(7,13,30,0.72)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.85rem' }}>
                <div className="font-tech" style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.72rem', marginBottom: '0.25rem' }}>
                  {item.label}
                </div>
                <div className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 900 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card hud-border" style={{ borderRadius: 16, padding: isMobile ? '1.1rem' : '1.35rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                GOOGLE MEET
              </div>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.2rem', margin: '0.32rem 0 0' }}>
                오픈 스터디 집중방 입장
              </h3>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.45rem', lineHeight: 1.55 }}>
                준비된 Meet 대기방이 새 탭으로 열립니다.
              </div>
            </div>
            <button
              type="button"
              className="space-btn cosmic-btn font-tech"
              onClick={() => onEnterMeet(pool.id)}
              disabled={joining}
              style={{ minHeight: 46, borderRadius: 12, minWidth: isMobile ? '100%' : 190, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {joining ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}
              {joining ? '입장 확인 중...' : 'Google Meet 입장'}
            </button>
          </div>
        </section>

        <div style={{ marginBottom: '1rem' }}>
          <StudyCrewDailyMission
            scopeType="openStudy"
            scopeId={pool.id}
            targetCount={1}
            teamRewardsEnabled={false}
          />
        </div>

        <section className="glass-card hud-border" style={{ borderRadius: 16, padding: isMobile ? '1.1rem' : '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.85rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                LIVE STUDENTS
              </div>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1.08rem', margin: '0.28rem 0 0' }}>
                같은 학년대 접속 학생
              </h3>
            </div>
            <button
              type="button"
              className="space-nav-link font-tech"
              onClick={onOpenLivePanel}
              style={{ borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Users size={15} /> 전체 보기
            </button>
          </div>

          {activeStudents.length === 0 ? (
            <div className="font-tech" style={{ color: 'var(--text-muted)', padding: '0.85rem', borderRadius: 10, background: 'rgba(7,13,30,0.55)' }}>
              지금 이 학년대에 표시할 온라인 학생이 없습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
              {activeStudents.slice(0, 6).map((student) => {
                const state = formatLiveState(student.profile);
                return (
                  <div key={student.uid} style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(7,13,30,0.62)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 900, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.name}
                    </div>
                    <div className="font-tech" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.grade} · {student.course}
                    </div>
                    <div className="font-tech" style={{ color: state.color, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '0.28rem', marginTop: '0.45rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: state.dot }} />
                      {state.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LiveStudentDrawer({
  isOpen,
  onClose,
  students,
  currentUid,
  currentCrewId,
  hasCrew,
  inviteAction,
  onInviteStudent,
  onOpenCreateCrew,
  onOpenMyCrew,
}) {
  const visibleStudents = students.slice(0, 24);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Motion.button
            type="button"
            aria-label="온라인 학생 패널 닫기"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1180,
              background: 'rgba(0,0,0,0.34)',
              border: 0,
              padding: 0,
              cursor: 'default',
            }}
          />
          <Motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="hud-border"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 1190,
              width: 'min(390px, 92vw)',
              background: 'rgba(7,13,30,0.97)',
              boxShadow: '-24px 0 50px rgba(0,0,0,0.35)',
              padding: '1rem',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                  LIVE STATUS
                </div>
                <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.28rem 0 0', fontSize: '1.25rem' }}>
                  지금 접속 중
                </h3>
                <div className="font-tech" style={{ color: 'rgba(255,255,255,0.52)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  최근 5분 내 온라인 {students.length}명
                </div>
              </div>
              <button
                type="button"
                className="space-nav-link font-tech"
                onClick={onClose}
                style={{ borderRadius: 8, minWidth: 38, minHeight: 34, padding: '0.35rem 0.6rem' }}
              >
                닫기
              </button>
            </div>

            {visibleStudents.length === 0 ? (
              <div className="glass-card hud-border" style={{ padding: '1rem', borderRadius: 10, color: 'var(--text-muted)' }}>
                지금은 표시할 온라인 학생이 없습니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {visibleStudents.map((student) => {
                  const state = formatLiveState(student.profile);
                  const isSelf = student.uid === currentUid;
                  const isSameCrew = hasCrew && student.profile.crewId === currentCrewId;
                  const actionLabel = isSelf ? '나' : !hasCrew ? '크루 만들기' : isSameCrew ? '내 크루 보기' : '공부 제안';
                  const isSending = inviteAction === student.uid;
                  return (
                    <div key={student.uid} style={{
                      display: 'grid',
                      gridTemplateColumns: '38px minmax(0, 1fr)',
                      gap: '0.7rem',
                      alignItems: 'center',
                      padding: '0.75rem',
                      borderRadius: 10,
                      background: isSelf ? 'rgba(0,243,255,0.08)' : 'rgba(255,255,255,0.045)',
                      border: isSelf ? '1px solid rgba(0,243,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: student.profile.crewColor || '#00d4ff', display: 'grid', placeItems: 'center', color: '#06111f', fontWeight: 900 }}>
                        {(student.name || '?').slice(0, 1)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {student.name}{isSelf ? ' (나)' : ''}
                          </div>
                          <span className="font-tech" style={{ color: state.color, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.28rem', flexShrink: 0 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, background: state.dot }} />
                            {state.label}
                          </span>
                        </div>
                        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.73rem', marginTop: '0.22rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {student.grade} · {student.course}
                        </div>
                        <div className="font-tech" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.73rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {student.crewName} · {student.location}
                        </div>
                        <button
                          type="button"
                          className={isSelf ? 'space-nav-link font-tech' : 'space-btn font-tech'}
                          onClick={() => {
                            if (isSelf) return;
                            if (!hasCrew) {
                              onOpenCreateCrew();
                              return;
                            }
                            if (isSameCrew) {
                              onOpenMyCrew();
                              return;
                            }
                            onInviteStudent(student);
                          }}
                          disabled={isSelf || isSending}
                          style={{
                            marginTop: '0.65rem',
                            width: '100%',
                            minHeight: 34,
                            borderRadius: 9,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.38rem',
                            background: isSelf ? 'rgba(255,255,255,0.04)' : 'rgba(0,243,255,0.1)',
                            border: isSelf ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,243,255,0.22)',
                            color: isSelf ? 'rgba(255,255,255,0.45)' : 'var(--crystal-cyan)',
                          }}
                        >
                          {isSending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                          {isSending ? '보내는 중...' : actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default function StudyCrewView({ onNavigateStore }) {
  const { user, userData } = useAuth();
  const [directoryCrews, setDirectoryCrews] = useState([]);
  const [openStudyAction, setOpenStudyAction] = useState('');
  const [openStudyWaitingPoolId, setOpenStudyWaitingPoolId] = useState('');
  const [livePanelOpen, setLivePanelOpen] = useState(false);
  const [liveInviteAction, setLiveInviteAction] = useState('');
  const [rejectedCrewFallback, setRejectedCrewFallback] = useState(null);
  const [crewOnlineCounts, setCrewOnlineCounts] = useState({});
  const [userProfileById, setUserProfileById] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinTarget, setJoinTarget] = useState(null); 
  const [detailView, setDetailView] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [resubmitCrew, setResubmitCrew] = useState(null); // rejected crew data for resubmission
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  const crew = userData?.crewSnapshot || null;
  const crewId = crew?.id || userData?.crewId || '';
  const hasCrew = !!crewId;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for rejected crew (leader's snapshot preserved with rejection info)
  const rejectedCrew = useMemo(() => {
    if (hasCrew) return null; // has active crew, no rejected
    const snapshot = userData?.crewSnapshot;
    if (snapshot && snapshot.status === 'rejected') return snapshot;
    if (rejectedCrewFallback && rejectedCrewFallback.status === 'rejected') return rejectedCrewFallback;
    return null;
  }, [userData?.crewSnapshot, rejectedCrewFallback, hasCrew]);

  useEffect(() => {
    let cancelled = false;

    async function loadRejectedCrewFallback() {
      if (!user?.uid || hasCrew) {
        if (!cancelled) setRejectedCrewFallback(null);
        return;
      }

      try {
        const crewQuery = query(collection(db, 'crews'), where('leaderId', '==', user.uid));
        const snap = await getDocs(crewQuery);
        const rejected = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((c) => c.status === 'rejected')
          .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))[0] || null;

        if (!cancelled) setRejectedCrewFallback(rejected);
      } catch (err) {
        console.error('Rejected crew fallback load error:', err);
        if (!cancelled) setRejectedCrewFallback(null);
      }
    }

    loadRejectedCrewFallback();
    return () => { cancelled = true; };
  }, [user?.uid, hasCrew]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'crews'), snap => {
      const crews = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.status !== 'rejected');
      setDirectoryCrews(crews);
    }, err => console.error('Crew directory error:', err));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const nextCounts = {};
      const nextProfiles = {};
      const now = Date.now();

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        nextProfiles[docSnap.id] = { uid: docSnap.id, ...data };
        if (data.role === 'admin' || data.role === 'parent') return;
        const crewId = data.crewId;
        if (!crewId) return;

        const live = data.liveStatus || {};
        const updatedMs = live.lastUpdatedAt?.toMillis?.() || 0;
        const isOnline = live.state === 'online' && updatedMs && (now - updatedMs < 5 * 60 * 1000);
        if (!isOnline) return;

        nextCounts[crewId] = (nextCounts[crewId] || 0) + 1;
      });

      setCrewOnlineCounts(nextCounts);
      setUserProfileById(nextProfiles);
    }, err => console.error('Crew online count error:', err));

    return () => unsub();
  }, []);

  const sortedCrews = useMemo(() => {
    if (!directoryCrews.length) return [];
    const uid = user?.uid || '';
    return [...directoryCrews].sort((a, b) => {
      const aLeaderId = a.leaderId || a.leaderUid || '';
      const bLeaderId = b.leaderId || b.leaderUid || '';
      const aIsMyLeader = aLeaderId === uid ? 0 : 1;
      const bIsMyLeader = bLeaderId === uid ? 0 : 1;
      if (aIsMyLeader !== bIsMyLeader) return aIsMyLeader - bIsMyLeader;

      const aIsMember = a.memberIds?.includes(uid) ? 0 : 1;
      const bIsMember = b.memberIds?.includes(uid) ? 0 : 1;
      if (aIsMember !== bIsMember) return aIsMember - bIsMember;

      const aCanJoin = a.status === 'approved' ? 0 : 1;
      const bCanJoin = b.status === 'approved' ? 0 : 1;
      if (aCanJoin !== bCanJoin) return aCanJoin - bCanJoin;

      const aApproved = a.status === 'approved' ? 0 : 1;
      const bApproved = b.status === 'approved' ? 0 : 1;
      if (aApproved !== bApproved) return aApproved - bApproved;

      return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    });
  }, [directoryCrews, user?.uid]);

  const recommendedOpenStudyPoolId = useMemo(
    () => normalizeOpenStudyPoolIdFromGrade(userData?.grade || userData?.schoolGrade || userData?.studentGrade),
    [userData?.grade, userData?.schoolGrade, userData?.studentGrade]
  );

  const liveStudents = useMemo(() => {
    const now = Date.now();
    return Object.values(userProfileById)
      .filter(profile => profile?.uid && profile.role !== 'admin' && profile.role !== 'parent' && isLiveStudent(profile, now))
      .map(profile => {
        return {
          uid: profile.uid,
          profile,
          name: getProfileName(profile),
          grade: getProfileGrade(profile),
          course: getProfileCourse(profile),
          crewName: getProfileCrewName(profile),
          location: profile.liveStatus?.currentLocation || '메인 화면',
        };
      })
      .sort((a, b) => {
        const aSelf = a.uid === user?.uid ? 0 : 1;
        const bSelf = b.uid === user?.uid ? 0 : 1;
        if (aSelf !== bSelf) return aSelf - bSelf;
        const aCrew = a.profile.crewId === crewId ? 0 : 1;
        const bCrew = b.profile.crewId === crewId ? 0 : 1;
        if (aCrew !== bCrew) return aCrew - bCrew;
        return (b.profile.liveStatus?.lastUpdatedAt?.toMillis?.() || 0) - (a.profile.liveStatus?.lastUpdatedAt?.toMillis?.() || 0);
      });
  }, [crewId, user?.uid, userProfileById]);

  const openStudyActivityByPool = useMemo(() => {
    const next = {};
    OPEN_STUDY_POOLS.forEach(pool => { next[pool.id] = { count: 0, names: [] }; });
    liveStudents.forEach(student => {
      const poolId = normalizeOpenStudyPoolIdFromGrade(student.profile.grade || student.profile.schoolGrade || student.profile.studentGrade);
      if (!poolId || !next[poolId]) return;
      next[poolId].count += 1;
      next[poolId].names.push(student.name);
    });
    return next;
  }, [liveStudents]);

  const selectedOpenStudyPool = useMemo(
    () => OPEN_STUDY_POOLS.find(pool => pool.id === openStudyWaitingPoolId) || null,
    [openStudyWaitingPoolId]
  );

  const selectedOpenStudyStudents = useMemo(() => {
    if (!selectedOpenStudyPool) return [];
    return liveStudents.filter(student => {
      const poolId = normalizeOpenStudyPoolIdFromGrade(student.profile.grade || student.profile.schoolGrade || student.profile.studentGrade);
      return poolId === selectedOpenStudyPool.id;
    });
  }, [liveStudents, selectedOpenStudyPool]);

  const handleJoinOpenStudy = (poolId) => {
    if (!user?.uid) return;
    soundManager.playClick();
    setOpenStudyWaitingPoolId(poolId);
  };

  const handleEnterOpenStudyMeet = async (poolId) => {
    if (!user?.uid || openStudyAction) return;
    soundManager.playClick();
    setOpenStudyAction(poolId);

    try {
      const enterOpenStudyMeet = httpsCallable(functions, 'enterOpenStudyMeet');
      const res = await enterOpenStudyMeet({ poolId });
      const googleMeetUrl = res?.data?.googleMeetUrl || '';
      if (!googleMeetUrl) throw new Error('Google Meet 주소가 아직 준비되지 않았습니다.');
      window.open(googleMeetUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to join open study room:', err);
      alert(err?.message || '오픈 스터디에 참여하지 못했습니다.');
    } finally {
      setOpenStudyAction('');
    }
  };

  const handleInviteLiveStudent = async (student) => {
    if (!user?.uid || !student?.uid || student.uid === user.uid || liveInviteAction) return;
    if (!hasCrew) {
      setLivePanelOpen(false);
      setShowCreateModal(true);
      return;
    }

    soundManager.playClick();
    setLiveInviteAction(student.uid);
    try {
      const sendMemo = httpsCallable(functions, 'sendDirectMemo');
      const senderName = getProfileName(userData, user.displayName || '탐사원');
      const currentCrewName = crew?.name || userData?.crewName || userData?.crewSnapshot?.name || '내 스터디 크루';
      const inviteCode = crew?.inviteCode || crew?.code || '';
      const inviteCodeLine = inviteCode ? `\n초대 코드: ${inviteCode}` : '';
      const res = await sendMemo({
        recipientId: student.uid,
        body: `[스터디 크루 공부 제안]\n${senderName}님이 ${currentCrewName}에서 함께 공부하자고 제안했어요.\n스터디 크루 화면에서 ${currentCrewName}을 확인하고 Google Meet 대기방에 들어와 주세요.${inviteCodeLine}`,
      });
      const data = res?.data || {};
      alert(`${data.recipientName || student.name}님에게 공부 제안을 보냈습니다.`);
    } catch (err) {
      console.error('Failed to send live study invite:', err);
      alert(getMemoErrorMessage(err));
    } finally {
      setLiveInviteAction('');
    }
  };

  const handleCrewCardClick = (crew) => {
    soundManager.playClick();
    const isMyCrew = crew.id === crewId;
    const isMyMember = crew.memberIds?.includes(user?.uid);
    if (isMyCrew || isMyMember) {
      setDetailView(true);
      return;
    }
    if (crew.status !== 'approved') {
      alert('이 크루는 아직 운영자 승인 대기 중입니다.');
      return;
    }
    if (hasCrew) {
      alert('이미 소속된 크루가 있습니다. 다른 크루에 참여하려면 현재 크루를 먼저 탈퇴해야 합니다.');
      return;
    }
    setJoinTarget(crew);
  };

  if (detailView && hasCrew) {
    return (
      <div className="fade-in">
        <CrewDetailView
          onBack={() => setDetailView(false)}
          onNavigateStore={onNavigateStore}
        />
      </div>
    );
  }

  if (selectedOpenStudyPool) {
    return (
      <>
        <OpenStudyWaitingRoom
          pool={selectedOpenStudyPool}
          activity={openStudyActivityByPool[selectedOpenStudyPool.id]}
          activeStudents={selectedOpenStudyStudents}
          recommended={selectedOpenStudyPool.id === recommendedOpenStudyPoolId}
          joining={openStudyAction === selectedOpenStudyPool.id}
          onBack={() => setOpenStudyWaitingPoolId('')}
          onEnterMeet={handleEnterOpenStudyMeet}
          onOpenLivePanel={() => setLivePanelOpen(true)}
          isMobile={isMobile}
        />
        <LiveStudentDrawer
          isOpen={livePanelOpen}
          onClose={() => setLivePanelOpen(false)}
          students={liveStudents}
          currentUid={user?.uid}
          currentCrewId={crewId}
          hasCrew={hasCrew}
          inviteAction={liveInviteAction}
          onInviteStudent={handleInviteLiveStudent}
          onOpenCreateCrew={() => {
            setLivePanelOpen(false);
            setShowCreateModal(true);
          }}
          onOpenMyCrew={() => {
            setLivePanelOpen(false);
            setDetailView(true);
          }}
        />
        <CrewCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNavigateStore={onNavigateStore}
        />
      </>
    );
  }

  return (
    <>
      <div className="fade-in" style={{ minHeight: '100vh', padding: isMobile ? '1rem 0.75rem 6.5rem' : '2rem 1rem 6rem' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%' }}>
          
          {/* Hero */}
          <div style={{ marginBottom: isMobile ? '1.75rem' : '3.5rem', textAlign: 'left' }}>
            <h2 className="font-title" style={{ fontSize: isMobile ? '2rem' : '2.8rem', color: 'var(--text-bright)', marginBottom: '0.75rem', letterSpacing: 0, textShadow: '0 0 20px rgba(0, 212, 255, 0.3)' }}>
              STUDY CREW
            </h2>
            <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.95rem' : '1.1rem', maxWidth: '600px', lineHeight: 1.6 }}>
              함께 공부하는 프리미엄 스터디 네트워크. 크루를 만들고, 초대 코드로 친구를 모아 Google Meet에서 집중하세요.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: isMobile ? '1.25rem' : '2rem', flexWrap: 'wrap' }}>
              <button
                className="space-btn cosmic-btn font-tech"
                onClick={() => { soundManager.playClick(); setShowCreateModal(true); }}
                disabled={hasCrew}
                style={{ padding: isMobile ? '0.78rem 1rem' : '0.8rem 1.8rem', fontSize: isMobile ? '0.9rem' : '1rem', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', flex: isMobile ? '1 1 160px' : '0 0 auto' }}
              >
                <Plus size={18} /> 새 크루 만들기
              </button>
              {hasCrew && (
                <button
                  className="space-nav-link font-tech active"
                  onClick={() => { soundManager.playClick(); setDetailView(true); }}
                  style={{ borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: isMobile ? '0.78rem 1rem' : '0.8rem 1.8rem', flex: isMobile ? '1 1 160px' : '0 0 auto' }}
                >
                  <ShieldCheck size={18} /> 내 크루 보기
                </button>
              )}
              <button
                type="button"
                className="font-tech"
                onClick={() => { soundManager.playClick(); setLivePanelOpen(true); }}
                style={{
                  borderRadius: 12,
                  border: '1px solid rgba(0,243,255,0.38)',
                  background: 'linear-gradient(135deg, rgba(0,243,255,0.18), rgba(52,211,153,0.1))',
                  color: 'var(--text-bright)',
                  boxShadow: '0 0 22px rgba(0,243,255,0.12)',
                  minHeight: isMobile ? 44 : 48,
                  padding: isMobile ? '0.78rem 1rem' : '0.8rem 1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.55rem',
                  cursor: 'pointer',
                  flex: isMobile ? '1 1 100%' : '0 0 auto',
                  fontWeight: 900,
                }}
              >
                <Radio size={18} style={{ color: 'var(--crystal-cyan)' }} />
                지금 접속 중 {liveStudents.length}명
              </button>
            </div>
          </div>

          {/* Rejected Crew Alert */}
          {rejectedCrew && (
            <Motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: '2.5rem', padding: '1.4rem', borderRadius: 14,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.8rem' }}>
                <AlertTriangle size={20} style={{ color: '#f87171', flexShrink: 0 }} />
                <div className="font-tech" style={{ color: '#fca5a5', fontWeight: 800, fontSize: '0.95rem' }}>
                  크루 신청이 반려되었습니다
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem',
                padding: '0.8rem', borderRadius: 10,
                background: 'rgba(7, 13, 30, 0.5)',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '0.8rem'
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: rejectedCrew.color || '#00d4ff',
                  boxShadow: `0 0 12px ${(rejectedCrew.color || '#00d4ff')}44`,
                  opacity: 0.6
                }} />
                <div style={{ minWidth: 0 }}>
                  <div className="font-title" style={{ color: 'var(--text-bright)', fontSize: '1rem' }}>
                    {rejectedCrew.name || '이름 없는 크루'}
                  </div>
                  <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {rejectedCrew.motto || '모토 없음'}
                  </div>
                </div>
              </div>

              {/* Rejection reason */}
              {rejectedCrew.rejectionReason && (
                <div style={{
                  padding: '0.9rem', borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  marginBottom: '1rem'
                }}>
                  <div className="font-tech" style={{ color: '#fca5a5', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                    반려 사유
                  </div>
                  <div className="font-tech" style={{ color: '#fecaca', lineHeight: 1.6, fontSize: '0.92rem' }}>
                    {rejectedCrew.rejectionReason}
                  </div>
                </div>
              )}

              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                반려 사유를 확인하고, 크루 정보를 수정하여 다시 신청할 수 있습니다. 창설권은 차감되지 않았습니다.
              </div>

              <button
                className="space-btn cosmic-btn font-tech"
                onClick={() => {
                  soundManager.playClick();
                  setResubmitCrew(rejectedCrew);
                }}
                style={{
                  padding: '0.8rem 1.5rem', fontSize: '0.95rem', borderRadius: 10,
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <Edit3 size={16} /> 수정하여 재신청하기
              </button>
            </Motion.div>
          )}

          {/* Open Study Section */}
          <div style={{ marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '1px' }}>
                  OPEN GRADE STUDY
                </div>
                <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.35rem 0 0', fontSize: isMobile ? '1.35rem' : '1.6rem' }}>
                  학년별 오픈 스터디
                </h3>
                <p className="font-tech" style={{ color: 'var(--text-muted)', margin: '0.45rem 0 0', fontSize: '0.9rem', lineHeight: 1.55 }}>
                  프로필 학년에 맞는 오픈 스터디 대기방으로 참여한 뒤 Google Meet 집중방에 입장합니다.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div className="font-tech" style={{
                  color: 'rgba(255,255,255,0.68)',
                  background: 'rgba(0,243,255,0.08)',
                  border: '1px solid rgba(0,243,255,0.14)',
                  borderRadius: 999,
                  padding: '0.42rem 0.72rem',
                  fontSize: '0.78rem',
                  whiteSpace: 'nowrap',
                }}>
                  내 추천: {OPEN_STUDY_POOLS.find((pool) => pool.id === recommendedOpenStudyPoolId)?.label || '자유학년'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: isMobile ? '0.85rem' : '1rem' }}>
              {OPEN_STUDY_POOLS.map((pool) => {
                const isRecommended = pool.id === recommendedOpenStudyPoolId;
                const isFlexiblePool = pool.id === 'free';
                const isAdminUser = userData?.role === 'admin';
                const disabled = !isRecommended && !isFlexiblePool && !isAdminUser;
                return (
                  <OpenStudyCard
                    key={pool.id}
                    pool={pool}
                    recommended={isRecommended}
                    disabled={disabled || !!openStudyAction}
                    joining={openStudyAction === pool.id}
                    onJoin={handleJoinOpenStudy}
                    activity={openStudyActivityByPool[pool.id]}
                  />
                );
              })}
            </div>
          </div>

          <LiveStudentDrawer
            isOpen={livePanelOpen}
            onClose={() => setLivePanelOpen(false)}
            students={liveStudents}
            currentUid={user?.uid}
            currentCrewId={crewId}
            hasCrew={hasCrew}
            inviteAction={liveInviteAction}
            onInviteStudent={handleInviteLiveStudent}
            onOpenCreateCrew={() => {
              setLivePanelOpen(false);
              setShowCreateModal(true);
            }}
            onOpenMyCrew={() => {
              setLivePanelOpen(false);
              setDetailView(true);
            }}
          />

          {/* Directory Section */}
          <div style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '1px' }}>CREW DIRECTORY</div>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>총 {directoryCrews.length}개의 크루 활동 중</div>
            </div>

            {directoryCrews.length === 0 ? (
              <div className="glass-card hud-border" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: 16 }}>
                <Users size={48} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '1rem' }} />
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>아직 생성된 크루가 없습니다. 첫 번째 크루를 만들어보세요!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '0.85rem' : '1.5rem' }}>
                {sortedCrews.map(c => (
                  <CrewCard
                    key={c.id}
                    crew={c}
                    userUid={user?.uid}
                    userCrewId={crewId}
                    onClick={handleCrewCardClick}
                    onlineCount={crewOnlineCounts[c.id] || 0}
                    founderProfile={userProfileById[c.leaderId || c.leaderUid || ''] || null}
                  />
                ))}
              </div>
            )}

            {/* No pass hint */}
            {!hasCrew && (userData?.crewJoinPasses || 0) === 0 && directoryCrews.length > 0 && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 12, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.9rem', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>💡</span>
                  <span>크루에 참여하려면 참여권이 필요합니다.{' '}
                  <button onClick={() => { soundManager.playClick(); if (onNavigateStore) onNavigateStore(true); }} style={{ background: 'none', border: 'none', color: 'var(--crystal-cyan)', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>스토어에서 구매하기 →</button>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Why Study Crew */}
          <div style={{ marginBottom: '3.5rem' }}>
            <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '1rem' }}>WHY STUDY CREW?</div>
            <div className="glass-card hud-border" style={{ padding: '2rem', borderRadius: 16 }}>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0 0 1.5rem', fontSize: '1.5rem' }}>함께 공부하면 집중력이 달라집니다</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {[
                  { icon: '🎯', title: '함께 집중', desc: '크루 멤버와 같은 시간에 접속해 공부 리듬을 유지합니다.' },
                  { icon: '📹', title: 'Google Meet 입장', desc: '운영자가 준비한 안정적인 화상 공간에서 바로 만납니다.' },
                  { icon: '🔥', title: '학습 동기부여', desc: '크루 멤버의 연속 학습일과 오늘의 학습 상태를 한눈에 확인합니다.' },
                ].map(item => (
                  <div key={item.title} style={{ padding: '1.2rem', borderRadius: 14, background: 'rgba(0,243,255,0.04)', border: '1px solid rgba(0,243,255,0.08)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.8rem' }}>{item.icon}</div>
                    <div className="font-tech" style={{ color: 'var(--text-bright)', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem' }}>{item.title}</div>
                    <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: '2rem' }}>
            <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.9rem', marginBottom: '1rem' }}>FAQ</div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {FAQ_ITEMS.map((item, idx) => (
                <div key={idx} style={{ background: 'rgba(7,13,30,0.78)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => { soundManager.playClick(); setOpenFaq(openFaq === idx ? null : idx); }}
                    style={{ width: '100%', padding: '1.1rem 1.4rem', background: 'none', border: 'none', color: 'var(--text-bright)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', fontFamily: 'var(--font-tech)' }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{item.q}</span>
                    <ChevronDown size={18} style={{ flexShrink: 0, transform: openFaq === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
                  </button>
                  <AnimatePresence>
                    {openFaq === idx && (
                      <Motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="font-tech" style={{ padding: '0 1.4rem 1.2rem', color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                          {item.a}
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals outside fade-in to avoid transform context issues */}
      <CrewCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onNavigateStore={onNavigateStore}
      />
      <CrewCreateModal
        isOpen={!!resubmitCrew}
        onClose={() => setResubmitCrew(null)}
        onNavigateStore={onNavigateStore}
        rejectedCrew={resubmitCrew}
      />
      <CrewJoinModal
        isOpen={!!joinTarget}
        crew={joinTarget && typeof joinTarget === 'object' ? joinTarget : null}
        onClose={() => setJoinTarget(null)}
        onNavigateStore={onNavigateStore}
      />
    </>
  );
}
