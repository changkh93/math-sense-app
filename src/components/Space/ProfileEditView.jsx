import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';
import {
  PROFILE_TITLES,
  getProfileFrame,
  getPublicProfile,
  normalizeOwnedFrames
} from '../../utils/socialUtils';

const sectionTitleStyle = {
  color: 'var(--text-bright)',
  borderBottom: '1px solid var(--neon-blue)',
  paddingBottom: '0.8rem',
  marginBottom: '1.5rem'
};

function Field({ label, children, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.9rem' }}>{label}</label>
      {children}
      {hint && <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: '1.45', margin: 0 }}>{hint}</p>}
    </div>
  );
}

export default function ProfileEditView({ onBack }) {
  const { user, userData } = useAuth();
  const { data: clusters, isLoading: isClustersLoading } = useClusters();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentPhone: '',
    participation: {},
    publicProfileEnabled: true,
    publicDisplayName: '',
    publicTitle: PROFILE_TITLES[0],
    publicSignature: '',
    selectedProfileFrame: 'starter'
  });

  const ownedFrames = useMemo(() => normalizeOwnedFrames(userData), [userData]);
  const publicProfile = useMemo(
    () => getPublicProfile(
      {
        ...userData,
        publicProfileEnabled: formData.publicProfileEnabled,
        publicDisplayName: formData.publicDisplayName,
        publicTitle: formData.publicTitle,
        publicSignature: formData.publicSignature,
        selectedProfileFrame: formData.selectedProfileFrame,
        crewName: userData?.crewName,
        crewRole: userData?.crewRole,
        crewColor: userData?.crewColor
      },
      formData.studentName || user?.displayName || '탐험가'
    ),
    [formData, user?.displayName, userData]
  );

  useEffect(() => {
    if (userData) {
      setFormData({
        studentName: userData.studentName || user?.displayName || '',
        studentPhone: userData.studentPhone || '',
        participation: userData.participation || {},
        publicProfileEnabled: userData.publicProfileEnabled !== false,
        publicDisplayName: userData.publicDisplayName || userData.studentName || user?.displayName || '',
        publicTitle: userData.publicTitle || PROFILE_TITLES[0],
        publicSignature: userData.publicSignature || '',
        selectedProfileFrame: normalizeOwnedFrames(userData).includes(userData.selectedProfileFrame)
          ? userData.selectedProfileFrame
          : normalizeOwnedFrames(userData)[0]
      });
    }
  }, [userData, user]);

  const handleDaySelect = (clusterId, day) => {
    setFormData(prev => {
      const clusterDays = prev.participation[clusterId] || [];
      const newDays = clusterDays.includes(day)
        ? clusterDays.filter(d => d !== day)
        : [...clusterDays, day];

      return {
        ...prev,
        participation: {
          ...prev.participation,
          [clusterId]: newDays
        }
      };
    });
    soundManager.playClick();
  };

  const extractAvailableDays = (classSchedule) => {
    if (!classSchedule || !Array.isArray(classSchedule)) return [];

    const dayMap = {
      '1': '월', '2': '화', '3': '수', '4': '목', '5': '금', '6': '토', '7': '일'
    };

    const daysSet = new Set();
    classSchedule.forEach(schedule => {
      const addDay = (val) => {
        if (!val) return;
        const mapped = dayMap[val] || val;
        daysSet.add(mapped);
      };

      if (schedule.days && Array.isArray(schedule.days)) {
        schedule.days.forEach(d => addDay(d));
      } else if (schedule.day) {
        addDay(schedule.day);
      }
    });

    const order = { '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6, '일': 7 };
    return Array.from(daysSet).sort((a, b) => (order[a] || 99) - (order[b] || 99));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    setSaving(true);
    soundManager.playClick();

    try {
      const cleanedParticipation = {};
      const access = userData?.clusterAccess || {};
      Object.keys(formData.participation).forEach(cid => {
        const cluster = clusters?.find(c => c.docId === cid || c.id === cid);
        if (!cluster || !cluster.isPrivate || access[cid] === 'active') {
          cleanedParticipation[cid] = formData.participation[cid];
        }
      });

      const publicDisplayName = formData.publicDisplayName.trim().slice(0, 18);
      const publicSignature = userData?.profileSignatureUnlocked
        ? formData.publicSignature.trim().slice(0, 28)
        : (userData?.publicSignature || '');
      const selectedFrame = ownedFrames.includes(formData.selectedProfileFrame) ? formData.selectedProfileFrame : ownedFrames[0];
      const mergedProfileData = {
        ...userData,
        studentName: formData.studentName.trim(),
        name: formData.studentName.trim(),
        publicProfileEnabled: formData.publicProfileEnabled,
        publicDisplayName,
        publicTitle: formData.publicTitle.trim(),
        publicSignature,
        selectedProfileFrame: selectedFrame,
        crewId: userData?.crewId || '',
        crewName: userData?.crewName || '',
        crewRole: userData?.crewRole || '',
        crewColor: userData?.crewColor || '#00f3ff',
      };
      const updatedProfileSnapshot = getPublicProfile(mergedProfileData, mergedProfileData.publicDisplayName || mergedProfileData.studentName || user?.displayName || '탐험가');

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        studentName: formData.studentName.trim(),
        studentPhone: formData.studentPhone.trim(),
        participation: cleanedParticipation,
        publicProfileEnabled: formData.publicProfileEnabled,
        publicDisplayName,
        publicTitle: formData.publicTitle.trim(),
        publicSignature,
        selectedProfileFrame: selectedFrame,
        profileUpdatedAt: serverTimestamp()
      });

      try {
        const answerSnap = await getDocs(query(collection(db, 'answers'), where('userId', '==', user.uid)));
        if (!answerSnap.empty) {
          const batch = writeBatch(db);
          answerSnap.docs.forEach((answerDoc) => {
            batch.update(answerDoc.ref, {
              publicProfileSnapshot: updatedProfileSnapshot
            });
          });
          await batch.commit();
        }
      } catch (syncErr) {
        console.warn('답변 프로필 스냅샷 동기화 실패:', syncErr);
      }

      alert('프로필이 저장되었습니다.');
      if (onBack) onBack();
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('프로필 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-bg fade-in" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1rem 6rem 1rem'
    }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            className="space-nav-link font-tech"
            onClick={() => { soundManager.playClick(); if (onBack) onBack(); }}
            style={{ fontSize: '1rem', background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', borderRadius: '8px' }}
          >
            ← 돌아가기
          </button>
          <h2 className="font-title" style={{
            color: 'var(--crystal-cyan)',
            textShadow: '0 0 15px rgba(0,212,255,0.5)',
            margin: '0 auto 0 2rem',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            letterSpacing: '2px'
          }}>
            탐사원 프로필 수정
          </h2>
        </div>

        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card hud-border"
          style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <section>
              <h3 className="font-tech" style={sectionTitleStyle}>👤 기본 통신 제원</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <Field label="탐사원(학생) 이름">
                  <input
                    type="text"
                    className="space-input"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    placeholder="홍길동"
                    required
                  />
                </Field>

                <Field label='학생 전화번호 ("-" 제외)' hint="긴급 상황 안내용으로만 사용됩니다.">
                  <input
                    type="tel"
                    className="space-input"
                    value={formData.studentPhone}
                    onChange={(e) => setFormData({ ...formData, studentPhone: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="01012345678"
                  />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="font-tech" style={sectionTitleStyle}>🪪 공개 프로필 명함</h3>

              <div style={{
                padding: '1.4rem',
                borderRadius: '20px',
                border: `1px solid ${publicProfile.frameAccent}55`,
                background: publicProfile.frameBackground,
                boxShadow: `0 0 24px ${publicProfile.frameAccent}20`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-bright)' }}>
                      {publicProfile.publicDisplayName}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.45rem' }}>
                      {publicProfile.publicTitle && (
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: publicProfile.frameAccent, fontSize: '0.75rem', fontWeight: 700 }}>
                          {publicProfile.publicTitle}
                        </span>
                      )}
                      {publicProfile.crewName && (
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', color: publicProfile.crewColor, fontSize: '0.75rem', fontWeight: 700 }}>
                          🛰️ {publicProfile.crewName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-tech" style={{ color: publicProfile.frameAccent, fontSize: '0.82rem' }}>
                    답변 카드 미리보기
                  </div>
                </div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.72)' }}>
                  도움 {userData?.helpCount || 0}회 · 질문 {userData?.questionCount || 0}회
                </div>
                {publicProfile.publicSignature && (
                  <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', borderTop: '1px dashed rgba(255,255,255,0.12)', paddingTop: '0.8rem', fontStyle: 'italic' }}>
                    “{publicProfile.publicSignature}”
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <Field label="공개 프로필 사용">
                  <label className="font-tech" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-bright)' }}>
                    <input
                      type="checkbox"
                      checked={formData.publicProfileEnabled}
                      onChange={(e) => setFormData({ ...formData, publicProfileEnabled: e.target.checked })}
                    />
                    답변과 랭킹 카드에서 공개 프로필 사용
                  </label>
                </Field>

                <Field label="공개 표시 이름" hint="질문자는 익명 처리되고, 답변/랭킹 카드에만 노출됩니다.">
                  <input
                    type="text"
                    className="space-input"
                    value={formData.publicDisplayName}
                    onChange={(e) => setFormData({ ...formData, publicDisplayName: e.target.value })}
                    placeholder="예: 차분한 해설가"
                    maxLength={18}
                  />
                </Field>

                <Field label="대표 칭호">
                  <select
                    className="space-input"
                    value={formData.publicTitle}
                    onChange={(e) => setFormData({ ...formData, publicTitle: e.target.value })}
                  >
                    {PROFILE_TITLES.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </Field>

                <Field label="프로필 프레임">
                  <select
                    className="space-input"
                    value={formData.selectedProfileFrame}
                    onChange={(e) => setFormData({ ...formData, selectedProfileFrame: e.target.value })}
                  >
                    {ownedFrames.map(frameId => {
                      const frame = getProfileFrame(frameId);
                      return <option key={frame.id} value={frame.id}>{frame.name}</option>;
                    })}
                  </select>
                </Field>

                <Field
                  label="한 줄 시그니처"
                  hint={userData?.profileSignatureUnlocked ? '답변 카드 하단에 표시됩니다.' : '시그니처 해금권을 상점에서 구매해야 활성화됩니다.'}
                >
                  <textarea
                    className="space-input"
                    rows={3}
                    value={formData.publicSignature}
                    disabled={!userData?.profileSignatureUnlocked}
                    onChange={(e) => setFormData({ ...formData, publicSignature: e.target.value })}
                    placeholder="예: 막히면 그림으로 다시 생각해 봐요."
                    maxLength={28}
                    style={{ resize: 'vertical', opacity: userData?.profileSignatureUnlocked ? 1 : 0.5 }}
                  />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="font-tech" style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span>🚀 탐사 일정 수립</span>
                {isClustersLoading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>스캔 중...</span>}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {!isClustersLoading && clusters?.filter(cluster => {
                  if (!cluster.isPrivate) return true;
                  const access = userData?.clusterAccess || {};
                  return access[cluster.docId] === 'active' || access[cluster.id] === 'active';
                }).map((cluster) => {
                  const availableDays = extractAvailableDays(cluster.classSchedule);
                  if (availableDays.length === 0) return null;

                  const selectedDaysForCluster = formData.participation[cluster.docId] || [];
                  const isParticipatingAny = selectedDaysForCluster.length > 0;

                  return (
                    <div
                      key={cluster.docId}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: `1px solid ${isParticipatingAny ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <h4 className="font-title" style={{ color: isParticipatingAny ? 'var(--crystal-cyan)' : 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        {cluster.name}
                        {isParticipatingAny && <span style={{ fontSize: '1rem' }}>✅ 참여중</span>}
                      </h4>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem' }}>
                        {availableDays.map(day => {
                          const isSelected = selectedDaysForCluster.includes(day);
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => handleDaySelect(cluster.docId, day)}
                              className={`font-tech ${isSelected ? 'glitch-warp' : ''}`}
                              style={{
                                padding: '0.5rem 1.2rem',
                                borderRadius: '30px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                color: isSelected ? '#000' : 'var(--text-bright)',
                                background: isSelected ? 'var(--crystal-cyan)' : 'var(--glass-bg)',
                                border: `1px solid ${isSelected ? 'var(--crystal-cyan)' : 'var(--glass-border)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 0 15px rgba(0, 212, 255, 0.4)' : 'none'
                              }}
                            >
                              {day}요일
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                type="submit"
                className="space-btn cosmic-btn font-tech"
                disabled={saving}
                style={{
                  padding: '1rem 4rem',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  background: 'rgba(0, 243, 255, 0.2)'
                }}
              >
                {saving ? '데이터 동기화 중...' : '프로필 통신 데이터 저장'}
              </button>
            </div>
          </form>
        </Motion.div>
      </div>
    </div>
  );
}
