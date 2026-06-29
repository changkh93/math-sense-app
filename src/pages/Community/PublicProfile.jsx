import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, MessageCircle, Shield, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import SpaceNavbar from '../../components/Space/SpaceNavbar';
import StarField from '../../components/Space/StarField';
import CometBadge from '../../components/Space/CometBadge';
import { getEffectiveStreak, getKSTComponents, getTodayKST } from '../../utils/streakUtils';
import { calculateSEI } from '../../utils/rankingUtils';
import { getBaseTheme, getFrameSurfaceStyles, getProfileFrame, isHallSpotlightActive } from '../../utils/socialUtils';
import { parseInlineFormatting } from '../../utils/formatUtils';
import { buildCollectionBadges } from '../../utils/badgeUtils';
import auroraObservatoryImage from '../../assets/themes/aurora-observatory.jpg';
import goldenArchiveImage from '../../assets/themes/golden-archive.jpg';
import deepSeaLabImage from '../../assets/themes/deep-sea-lab.jpg';
import './PublicProfile.css';

const MotionDiv = motion.div;
const BASE_THEME_IMAGES = {
  aurora_observatory: auroraObservatoryImage,
  solar_archive: goldenArchiveImage,
  deep_lab: deepSeaLabImage,
};

function getMondayKSTKey() {
  const kstPart = getKSTComponents();
  const mondayOffset = (kstPart.dayOfWeek + 6) % 7;
  const mondayDate = new Date();
  mondayDate.setDate(mondayDate.getDate() - mondayOffset);
  return getTodayKST(mondayDate);
}

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

function buildSocialBadges(profile = {}) {
  return [
    {
      title: '아고라 조력자',
      icon: '🤝',
      unlocked: (profile.helpCount || 0) >= 1,
      desc: '채택된 답변을 보유했습니다.'
    },
    {
      title: '친절한 해결사',
      icon: '🌟',
      unlocked: (profile.helpCount || 0) >= 5,
      desc: '도움 5회 이상을 달성했습니다.'
    },
    {
      title: '질문 개척자',
      icon: '💬',
      unlocked: (profile.questionCount || 0) >= 10,
      desc: '질문 10개 이상을 남겼습니다.'
    },
  ];
}

function mergeBadges(...badgeGroups) {
  const seen = new Set();
  return badgeGroups
    .flat()
    .filter((badge) => badge?.unlocked)
    .filter((badge) => {
      const key = badge.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export default function PublicProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = React.useState(null);
  const [answers, setAnswers] = React.useState([]);
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!uid) return;
      setLoading(true);
      setError('');

      try {
        const profileSnap = await getDoc(doc(db, 'users', uid));
        if (!profileSnap.exists()) {
          if (!cancelled) {
            setProfile(null);
            setAnswers([]);
            setHistory([]);
            setError('프로필을 찾을 수 없습니다.');
          }
          return;
        }

        const profileData = { id: profileSnap.id, ...profileSnap.data() };
        let answerItems = [];
        let historyItems = [];

        try {
          const answerSnap = await getDocs(query(
            collection(db, 'answers'),
            where('userId', '==', uid),
            limit(30)
          ));
          answerItems = answerSnap.docs
            .map((answerDoc) => ({ id: answerDoc.id, ...answerDoc.data() }))
            .filter((answer) => answer.isTeacher !== true)
            .sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
              const bTime = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
              return bTime - aTime;
            })
            .slice(0, 5);
        } catch (answerError) {
          console.warn('공개 프로필 답변 조회 실패:', answerError);
        }

        try {
          const historySnap = await getDocs(collection(db, 'users', uid, 'history'));
          historyItems = historySnap.docs.map((historyDoc) => ({ id: historyDoc.id, ...historyDoc.data() }));
        } catch (historyError) {
          console.warn('공개 프로필 배지 이력 조회 실패:', historyError);
        }

        if (!cancelled) {
          setProfile(profileData);
          setAnswers(answerItems);
          setHistory(historyItems);
        }
      } catch (err) {
        console.error('Public profile load failed:', err);
        if (!cancelled) {
          setError('프로필을 불러오지 못했습니다.');
          setProfile(null);
          setAnswers([]);
          setHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const isOwnProfile = user?.uid === uid;
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
  const earnedBadges = profile
    ? mergeBadges(buildCollectionBadges(profile, history), buildSocialBadges(profile))
    : [];
  const displayName = getDisplayName(profile || {});

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
          <div className="public-profile-state glass-card">{error}</div>
        ) : profile?.publicProfileEnabled === false && !isOwnProfile ? (
          <div className="public-profile-state glass-card">
            이 탐험기지는 공개 설정이 꺼져 있습니다.
          </div>
        ) : profile ? (
          <>
            <MotionDiv
              className="public-profile-hero"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                borderColor: frameTheme.borderColor,
                background: heroBackground,
                boxShadow: heroBoxShadow
              }}
            >
              <div className="public-profile-avatar" style={{ borderColor: frameTheme.borderColor, color: frameTheme.accent }}>
                {Array.from(displayName)[0] || '?'}
              </div>

              <div className="public-profile-hero-main">
                <div className="public-profile-kicker">나의 탐험기지</div>
                <h1>{displayName}</h1>
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

            <section className="public-profile-panel public-profile-badge-panel">
              <h2>
                <Award size={18} />
                획득한 배지
                <span className="public-profile-section-count">{earnedBadges.length}</span>
              </h2>
              {earnedBadges.length > 0 ? (
                <div className="public-profile-badges" aria-label="획득한 배지 목록">
                  {earnedBadges.map((badge) => (
                    <div key={badge.title} className="public-profile-badge">
                      <span>{badge.icon}</span>
                      <strong>{badge.title}</strong>
                      <small>{badge.desc}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="public-profile-muted">아직 공개할 획득 배지가 없습니다.</p>
              )}
            </section>

            <section className="public-profile-panel public-profile-answers">
              <h2><MessageCircle size={18} /> 최근 공개 답변</h2>
              {answers.length > 0 ? (
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
          </>
        ) : null}
      </main>
    </div>
  );
}
