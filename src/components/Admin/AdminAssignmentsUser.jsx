import React, { useState, useMemo } from 'react';
import { 
  useAdminUserSearch 
} from '../../hooks/useAssignments';
import VoyageLogModal from './VoyageLogModal';
import AdminStudentCalendar from './AdminStudentCalendar';

export default function AdminAssignmentsUser({ onSelectDate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isVoyageModalOpen, setIsVoyageModalOpen] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const { data: searchResults, isLoading: isSearchLoading } = useAdminUserSearch(searchTerm);
  


  return (
    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Search Bar */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <input 
          type="text" 
          className="admin-input" 
          placeholder="사용자 이름 또는 이메일 검색 (2자 이상)..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        />
        
        {searchTerm.length >= 2 && !selectedUser && (
          <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
            {isSearchLoading ? (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>검색 중...</div>
            ) : searchResults?.length > 0 ? (
              searchResults.map(u => (
                <div 
                  key={u.id} 
                  style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-bright)' }}
                  onClick={() => {
                    setSelectedUser(u);
                    setSearchTerm('');
                    onSelectDate([]); // Clear right panel
                  }}
                >
                  {u.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({u.email})</span>
                </div>
              ))
            ) : (
              <div style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>검색 결과가 없습니다.</div>
            )}
          </div>
        )}

        {selectedUser && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 212, 255, 0.1)', padding: '0.8rem', borderRadius: '4px', border: '1px solid var(--crystal-cyan)' }}>
            <div>
              <strong style={{ color: 'var(--text-bright)' }}>선택된 학생: {selectedUser.name}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedUser.email}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="admin-btn primary" onClick={() => setIsVoyageModalOpen(true)}>
                📖 항해 일지 펼치기
              </button>
              <button className="admin-btn danger" style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }} onClick={() => { setSelectedUser(null); onSelectDate([]); }}>
                X 취소
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {!selectedUser ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
            학생을 검색하여 선택해주세요.
          </div>
        ) : (
          <AdminStudentCalendar 
            userId={selectedUser.id} 
            userName={selectedUser.name} 
            onSelectDate={onSelectDate} 
          />
        )}
      </div>

      {isVoyageModalOpen && selectedUser && (
        <VoyageLogModal user={selectedUser} onClose={() => setIsVoyageModalOpen(false)} />
      )}
    </div>
  );
}
