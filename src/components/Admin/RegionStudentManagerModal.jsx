import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Trash2, Users } from 'lucide-react';
import { useRegionStudents, useRegionStudentMutations } from '../../hooks/useRegionStudents';

// 헬퍼: 타임스탬프 포맷팅
const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

const RegionStudentManagerModal = ({ isOpen, onClose, region }) => {
  const { data: students, isLoading } = useRegionStudents(isOpen ? region?.id : null);
  const { updateStudentStatus, removeStudent } = useRegionStudentMutations();
  const [processingId, setProcessingId] = useState(null);

  if (!isOpen || !region) return null;

  const handleToggleStatus = async (student) => {
    const newStatus = student.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = newStatus === 'suspended' 
      ? `[${student.email}] 학생의 접근을 일시정지하시겠습니까?`
      : `[${student.email}] 학생의 접근을 다시 활성화하시겠습니까?`;
      
    if (window.confirm(confirmMsg)) {
      setProcessingId(student.id);
      try {
        await updateStudentStatus.mutateAsync({ 
          regionId: region.id, 
          userId: student.id, 
          status: newStatus 
        });
      } catch (err) {
        alert("상태 변경에 실패했습니다.");
      } finally {
        setProcessingId(null);
      }
    }
  };

  const handleRemove = async (student) => {
    if (window.confirm(`[${student.email}] 학생을 목록에서 삭제하시겠습니까?\n이 학생은 접근 코드를 다시 입력해야만 접속할 수 있습니다.`)) {
      setProcessingId(student.id);
      try {
        await removeStudent.mutateAsync({ 
          regionId: region.id, 
          userId: student.id 
        });
      } catch (err) {
        alert("삭제에 실패했습니다.");
      } finally {
        setProcessingId(null);
      }
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card zoom-in" style={{ padding: '2rem', width: '95%', maxWidth: '800px', background: '#1e293b', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem' }}>
              <Users size={24} color="var(--crystal-cyan)" /> 
              '{region.title}' 학생 관리
            </h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              접근 코드: <span style={{ color: 'var(--star-gold)', fontWeight: 'bold', letterSpacing: '1px' }}>{region.accessCode || '없음 (공개 가능성)'}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }} className="custom-scrollbar">
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>데이터를 불러오는 중...</div>
          ) : students && students.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#94a3b8' }}>이메일</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#94a3b8' }}>가입 일시</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>상태</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: student.status === 'suspended' ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '1rem' }}>{student.email || '알 수 없음'}</td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>{formatDate(student.joinedAt)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {student.status === 'active' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--planet-green)', background: 'rgba(0,255,136,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                          <CheckCircle2 size={14} /> 활성
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                          <ShieldAlert size={14} /> 정지됨
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                       <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                         <button 
                            className={`hud-btn secondary glass`}
                            onClick={() => handleToggleStatus(student)}
                            disabled={processingId === student.id}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: student.status === 'active' ? '#fbbf24' : 'var(--planet-green)' }}
                         >
                            {processingId === student.id ? '처리중...' : (student.status === 'active' ? '일시정지' : '활성화')}
                         </button>
                         <button 
                            className="hud-btn secondary glass"
                            onClick={() => handleRemove(student)}
                            disabled={processingId === student.id}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: '#ef4444' }}
                            title="목록에서 삭제 및 권한 제거"
                         >
                            <Trash2 size={16} />
                         </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <Users size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
                <p>아직 이 행성에 진입한 학생이 없습니다.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegionStudentManagerModal;
