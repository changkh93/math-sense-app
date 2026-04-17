import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';

export default function ProfileEditView({ onBack }) {
  const { user, userData } = useAuth();
  const { data: clusters, isLoading: isClustersLoading } = useClusters();

  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentPhone: '',
    participation: {} // { clusterId: ['월', '화'] }
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        studentName: userData.studentName || user?.displayName || '',
        studentPhone: userData.studentPhone || '',
        participation: userData.participation || {}
      });
    }
  }, [userData, user]);

  const handleDaySelect = (clusterId, day) => {
    setFormData(prev => {
      const clusterDays = prev.participation[clusterId] || [];
      
      let newDays;
      if (clusterDays.includes(day)) {
        newDays = clusterDays.filter(d => d !== day);
      } else {
        newDays = [...clusterDays, day];
      }

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
      '1': '월', '2': '화', '3': '수', '4': '목', '5': '금', '6': '토', '7': '일',
      1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토', 7: '일'
    };

    const daysSet = new Set();
    classSchedule.forEach(schedule => {
      const addDay = (val) => {
        if (!val) return;
        const mapped = dayMap[val] || val; // Fallback to original if not in map
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
      // 접근 권한 없는 비공개 클러스터의 participation 데이터 정리
      const cleanedParticipation = {};
      const access = userData?.clusterAccess || {};
      Object.keys(formData.participation).forEach(cid => {
        const cluster = clusters?.find(c => c.docId === cid || c.id === cid);
        // 공개 클러스터이거나, 비공개이면서 접근 권한이 있는 경우만 유지
        if (!cluster || !cluster.isPrivate || access[cid] === 'active') {
          cleanedParticipation[cid] = formData.participation[cid];
        }
      });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        studentName: formData.studentName.trim(),
        studentPhone: formData.studentPhone.trim(),
        participation: cleanedParticipation,
        profileUpdatedAt: serverTimestamp()
      });
      alert('🌟 프로필이 성공적으로 저장되었습니다!');
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
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <button 
            className="space-nav-link font-tech"
            onClick={() => { soundManager.playClick(); if(onBack) onBack(); }}
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

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card hud-border" 
          style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* 1. Basic Info Section */}
            <section>
              <h3 className="font-tech" style={{ color: 'var(--text-bright)', borderBottom: '1px solid var(--neon-blue)', paddingBottom: '0.8rem', marginBottom: '1.5rem' }}>
                👤 기본 통신 제원
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.9rem' }}>탐사원(학생) 이름</label>
                  <input 
                    type="text" 
                    className="space-input" 
                    value={formData.studentName}
                    onChange={(e) => setFormData({...formData, studentName: e.target.value})}
                    placeholder="홍길동"
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.9rem' }}>학생 전화번호 ("-" 제외)</label>
                  <input 
                    type="tel" 
                    className="space-input" 
                    value={formData.studentPhone}
                    onChange={(e) => setFormData({...formData, studentPhone: e.target.value.replace(/[^0-9]/g, '')})}
                    placeholder="01012345678"
                  />
                </div>
              </div>
              <p className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: '1.4' }}>
                * 연락처는 결석 등 긴급 상황 발생 시 자동으로 카카오 알림톡을 발송하는 용도로만 안전하게 활용됩니다.
              </p>
            </section>

            {/* 2. Class Participation Section */}
            <section>
              <h3 className="font-tech" style={{ color: 'var(--text-bright)', borderBottom: '1px solid var(--neon-blue)', paddingBottom: '0.8rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                🚀 탐사 일정 수립 (Class Schedule)
                {isClustersLoading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>스캔 중...</span>}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {!isClustersLoading && clusters?.filter(cluster => {
                  // 공개 클러스터는 모두 표시, 비공개는 수강 권한 확인
                  if (!cluster.isPrivate) return true;
                  const access = userData?.clusterAccess || {};
                  return access[cluster.docId] === 'active' || access[cluster.id] === 'active';
                }).map((cluster) => {
                  const availableDays = extractAvailableDays(cluster.classSchedule);
                  if (availableDays.length === 0) return null; // 운영툴에 설정된 스케줄이 없으면 표시하지 않음

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
              <p className="font-tech" style={{ color: 'var(--planet-orange)', fontSize: '0.85rem', marginTop: '1rem', lineHeight: '1.4' }}>
                * 탐사(수업) 요일을 선택해야 정상적으로 출석체크 기능과 접속 알림이 작동합니다.
              </p>
            </section>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
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
                {saving ? '데이터 동기화 중...' : '프로필 통신 데이터 저장 🚀'}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </div>
  );
}
