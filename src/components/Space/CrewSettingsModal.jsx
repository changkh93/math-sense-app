import React, { useEffect, useMemo, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Crown, Edit3, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { useClusters } from '../../hooks/useContent';
import soundManager from '../../utils/SoundManager';
import { CREW_SCHEDULE_DAYS, getDefaultScheduleTimes, normalizeScheduleDays } from './crewSchedule';

const CREW_GROUP_PRESETS = [
  { id: 'python', name: '파이썬' },
  { id: 'elementary_math', name: '초등수학' },
  { id: 'middle_math', name: '중등수학' },
];

const inputStyle = {
  width: '100%',
  minHeight: 46,
  boxSizing: 'border-box',
  borderRadius: 8,
  border: '1px solid rgba(0, 243, 255, 0.28)',
  background: 'rgba(5, 10, 24, 0.72)',
  color: 'var(--text-bright)',
  padding: '0.75rem 0.9rem',
  outline: 'none',
  fontFamily: 'var(--font-tech)',
};

export default function CrewSettingsModal({ isOpen, onClose, crew }) {
  const { user, userData } = useAuth();
  const { data: clusters } = useClusters();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    motto: '',
    description: '',
    color: '#00d4ff',
    groupId: 'none',
    scheduleDays: [],
    scheduleTimes: getDefaultScheduleTimes(),
  });

  useEffect(() => {
    if (!isOpen) {
      setIsDirty(false);
      return;
    }
    if (isDirty) return;
    setFormData({
      name: crew?.name || userData?.crewName || '',
      motto: crew?.motto || '',
      description: crew?.description || '',
      color: crew?.color || userData?.crewColor || '#00d4ff',
      groupId: crew?.groupId || 'none',
      scheduleDays: normalizeScheduleDays(crew?.scheduleDays),
      scheduleTimes: { ...getDefaultScheduleTimes(), ...(crew?.scheduleTimes || {}) },
    });
    setMessage('');
  }, [
    isOpen,
    isDirty,
    crew?.name,
    crew?.motto,
    crew?.description,
    crew?.color,
    crew?.groupId,
    crew?.scheduleDays,
    crew?.scheduleTimes,
    userData?.crewColor,
    userData?.crewName,
  ]);

  const groupOptions = useMemo(() => {
    const clusterOptions = (clusters || []).map((cluster) => ({
      id: cluster.docId || cluster.id,
      name: cluster.name || cluster.title || cluster.id,
      clusterId: cluster.docId || cluster.id,
    }));

    const normalizeKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');
    const merged = [];
    const seen = new Set();
    const pushUnique = (option) => {
      const key = normalizeKey(option.name) || normalizeKey(option.id);
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(option);
    };

    CREW_GROUP_PRESETS.forEach(pushUnique);
    clusterOptions.forEach(pushUnique);

    return [{ id: 'none', name: '군집 선택 없이 시작' }, ...merged];
  }, [clusters]);

  const selectedGroup = groupOptions.find((option) => option.id === formData.groupId) || groupOptions[0];
  const nameLockUntilMs = Number(crew?.nameChangeLockedUntilMs || 0);
  const isNameLocked = crew?.status === 'approved' && nameLockUntilMs > Date.now();
  const nameLockRemainingDays = isNameLocked
    ? Math.max(1, Math.ceil((nameLockUntilMs - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const nameUnlockDate = isNameLocked
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Seoul',
      }).format(new Date(nameLockUntilMs))
    : '';

  const normalizedSchedule = useMemo(() => {
    const scheduleDays = normalizeScheduleDays(formData.scheduleDays);
    const scheduleTimes = {};
    scheduleDays.forEach((dayKey) => {
      const rawTime = String(formData.scheduleTimes?.[dayKey] || '20:00');
      scheduleTimes[dayKey] = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : '20:00';
    });
    return { scheduleDays, scheduleTimes };
  }, [formData.scheduleDays, formData.scheduleTimes]);

  const handleSave = async () => {
    if (!crew?.id || !user?.uid || busy) return;
    if (!formData.name.trim()) {
      setMessage('크루 이름을 입력해주세요.');
      return;
    }

    setBusy(true);
    setMessage('');
    soundManager.playClick();

    try {
      const nextGroup = selectedGroup?.id === 'none'
        ? { groupId: 'none', groupName: '자유 스터디', clusterId: '', clusterName: '' }
        : {
            groupId: selectedGroup.id,
            groupName: selectedGroup.name,
            clusterId: selectedGroup.clusterId || '',
            clusterName: selectedGroup.clusterId ? selectedGroup.name : '',
          };

      const nextCrewData = {
        name: formData.name.trim(),
        motto: formData.motto.trim(),
        description: formData.description.trim(),
        color: formData.color,
        scheduleDays: normalizedSchedule.scheduleDays,
        scheduleTimes: normalizedSchedule.scheduleTimes,
        ...nextGroup,
      };

      const updateStudyCrew = httpsCallable(functions, 'updateStudyCrew');
      await updateStudyCrew({
        crewId: crew.id,
        ...nextCrewData,
      });

      setIsDirty(false);
      setMessage('크루 설정을 저장했습니다.');
      onClose(true);
    } catch (err) {
      console.error('Failed to update crew settings:', err);
      setMessage(String(err?.message || '크루 설정 저장에 실패했습니다.').replace(/^FirebaseError:\s*/i, ''));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !busy && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <Motion.div
          initial={{ scale: 0.95, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 680,
            background: 'rgba(7, 13, 30, 0.96)',
            border: '1px solid rgba(0, 243, 255, 0.22)',
            borderRadius: 14,
            padding: '1.6rem',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.1rem' }}>
            <div>
              <div className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '0.82rem' }}>
                <Crown size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                CREW SETTINGS
              </div>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0.25rem 0 0', fontSize: '1.3rem' }}>
                크루 설정
              </h3>
              <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                크루 정보는 즉시 반영되며, 이름 변경에는 별도 보호 규칙이 적용됩니다.
              </div>
            </div>
            <button
              onClick={() => !busy && onClose()}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: '0.9rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 이름</span>
              <input
                style={{ ...inputStyle, opacity: isNameLocked ? 0.58 : 1 }}
                value={formData.name}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                }}
                placeholder="예: 오메가 증명단"
                maxLength={28}
                disabled={busy || isNameLocked}
              />
              <div
                className="font-tech"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.45rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 8,
                  color: isNameLocked ? '#fcd34d' : '#a7f3d0',
                  background: isNameLocked ? 'rgba(251, 191, 36, 0.07)' : 'rgba(16, 185, 129, 0.06)',
                  border: `1px solid ${isNameLocked ? 'rgba(251, 191, 36, 0.18)' : 'rgba(16, 185, 129, 0.16)'}`,
                  fontSize: '0.76rem',
                  lineHeight: 1.55,
                }}
              >
                {isNameLocked ? <LockKeyhole size={14} style={{ flexShrink: 0, marginTop: 2 }} /> : <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
                <span>
                  {isNameLocked
                    ? `이름 보호 기간이 ${nameLockRemainingDays}일 남았습니다. ${nameUnlockDate}부터 변경할 수 있어요.`
                    : '이름은 7일에 한 번 변경할 수 있습니다. 공백·대소문자·구분자만 다른 유사 이름도 중복으로 처리됩니다.'}
                  <br />공식 서비스·운영진으로 오인될 수 있는 이름은 사용할 수 없습니다.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 모토</span>
              <input
                style={inputStyle}
                value={formData.motto}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData((prev) => ({ ...prev, motto: e.target.value }));
                }}
                placeholder="여기 들어오는 자, 쫓겨 나리라!"
                maxLength={52}
                disabled={busy}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>크루 설명</span>
              <textarea
                style={{ ...inputStyle, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }}
                value={formData.description}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                }}
                placeholder="누가, 어떤 목표로, 언제 함께 공부하는 크루인지 적어주세요."
                maxLength={500}
                disabled={busy}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>군집</span>
              <select
                style={inputStyle}
                value={formData.groupId}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData((prev) => ({ ...prev, groupId: e.target.value }));
                }}
                disabled={busy}
              >
                {groupOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gap: '0.55rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>정기 공부 요일과 시간</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(74px, 1fr))', gap: '0.45rem' }}>
                {CREW_SCHEDULE_DAYS.map((day) => {
                  const selected = formData.scheduleDays.includes(day.key);
                  return (
                    <button
                      key={day.key}
                      type="button"
                      className={`space-nav-link font-tech ${selected ? 'active' : ''}`}
                      disabled={busy}
                      onClick={() => {
                        setIsDirty(true);
                        setFormData((prev) => ({
                          ...prev,
                          scheduleDays: selected
                            ? prev.scheduleDays.filter((item) => item !== day.key)
                            : [...prev.scheduleDays, day.key],
                        }));
                      }}
                      style={{ borderRadius: 8, padding: '0.55rem 0.45rem' }}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {formData.scheduleDays.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.55rem' }}>
                  {formData.scheduleDays.map((dayKey) => {
                    const day = CREW_SCHEDULE_DAYS.find((item) => item.key === dayKey);
                    return (
                      <label key={dayKey} className="font-tech" style={{ display: 'grid', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {day?.label || dayKey}요일
                        <input
                          type="time"
                          style={{ ...inputStyle, minHeight: 42, padding: '0.55rem 0.7rem' }}
                          value={formData.scheduleTimes[dayKey] || '20:00'}
                          onChange={(e) => {
                            setIsDirty(true);
                            setFormData((prev) => ({
                              ...prev,
                              scheduleTimes: { ...prev.scheduleTimes, [dayKey]: e.target.value },
                            }));
                          }}
                          disabled={busy}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>엠블럼 색상</span>
              <input
                type="color"
                style={{ ...inputStyle, padding: '0.35rem', minHeight: 52 }}
                value={formData.color}
                onChange={(e) => {
                  setIsDirty(true);
                  setFormData((prev) => ({ ...prev, color: e.target.value }));
                }}
                disabled={busy}
              />
            </label>
          </div>

          <button
            type="button"
            className="space-btn cosmic-btn font-tech"
            disabled={busy}
            onClick={handleSave}
            style={{ padding: '0.9rem 1.2rem', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Edit3 size={16} />
            {busy ? '저장 중...' : '크루 설정 저장'}
          </button>

          {message && (
            <p className="font-tech" style={{ marginTop: '0.8rem', fontSize: '0.88rem', color: 'var(--planet-green)', lineHeight: 1.45 }}>
              {message}
            </p>
          )}
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}
