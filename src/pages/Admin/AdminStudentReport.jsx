import React, { useState } from 'react';
import { useAdminUserSearch } from '../../hooks/useAssignments';
import StudentReport from '../../components/Report/StudentReport';
import { Search, Users, FileBarChart } from 'lucide-react';
import './Admin.css';

export default function AdminStudentReport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [days, setDays] = useState(30);

  const { data: searchResults = [], isLoading: searching } = useAdminUserSearch(searchTerm);

  // Filter to students only
  const studentResults = searchResults.filter(u => u.role !== 'admin' && u.role !== 'parent');

  if (selectedUser) {
    return (
      <StudentReport
        userId={selectedUser.id}
        days={days}
        onDaysChange={setDays}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div className="admin-page" style={{ minHeight: '100vh' }}>
      <div className="admin-header-row">
        <h2>
          <FileBarChart size={24} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: '#a55eea' }} />
          학생 성장 리포트
        </h2>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 700, margin: '0 auto' }}>
        <div className="editor-section block-appear glass" style={{ padding: 30 }}>
          
          {/* Search */}
          <div style={{ marginBottom: 30 }}>
            <label style={{ display: 'block', color: 'var(--star-gold)', fontWeight: 'bold', marginBottom: 10, fontSize: '1rem' }}>
              <Search size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              학생 검색
            </label>
            <input
              type="text"
              className="admin-input"
              placeholder="학생 이름 또는 이메일을 입력하세요..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', fontSize: '1.05rem' }}
            />
          </div>

          {/* Search Results */}
          {searching && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>검색 중...</div>
          )}

          {!searching && searchTerm.length >= 2 && studentResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              검색 결과가 없습니다.
            </div>
          )}

          {studentResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                <Users size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {studentResults.length}명의 학생이 검색되었습니다
              </div>
              {studentResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '16px 20px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    cursor: 'pointer',
                    color: 'white',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(165, 94, 234, 0.12)'; e.currentTarget.style.borderColor = 'rgba(165, 94, 234, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a55eea33, #a55eea11)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', fontWeight: 700,
                    border: '2px solid #a55eea44',
                    flexShrink: 0
                  }}>
                    {(user.studentName || user.name || '?')[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {user.studentName || user.name || '알 수 없음'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {user.email}
                    </div>
                  </div>
                  <div style={{ color: '#a55eea', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0 }}>
                    리포트 생성 →
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Guide when no search */}
          {searchTerm.length < 2 && (
            <div style={{
              textAlign: 'center',
              padding: '50px 20px',
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.95rem',
              lineHeight: 1.8,
            }}>
              <FileBarChart size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <br />
              학생의 이름이나 이메일을 입력하면<br />
              출석·학습·과제·비교 분석이 포함된<br />
              <strong style={{ color: 'rgba(255,255,255,0.5)' }}>총체적 성장 리포트</strong>를 생성할 수 있습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
