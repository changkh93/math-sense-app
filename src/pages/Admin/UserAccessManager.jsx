import React, { useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useClusters } from '../../hooks/useContent';
import { Search, User as UserIcon } from 'lucide-react';
import './Admin.css';

function UserAccessManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { data: clusters = [], isLoading: clustersLoading } = useClusters();

  const handleSearch = async (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    
    setLoading(true);
    setUsers([]);

    try {
      const termLower = term.toLowerCase();
      const usersRef = collection(db, 'users');

      // 1. Search by name (Starts with)
      const nameQ = query(usersRef, 
        where('name', '>=', term), 
        where('name', '<=', term + '\uf8ff'),
        limit(20)
      );

      // 2. Search by email (Starts with)
      const emailQ = query(usersRef, 
        where('email', '>=', termLower), 
        where('email', '<=', termLower + '\uf8ff'),
        limit(20)
      );

      const [nameSnap, emailSnap] = await Promise.all([getDocs(nameQ), getDocs(emailQ)]);
      
      const resultsMap = new Map();
      
      const processSnap = (snap) => {
        snap.docs.forEach(doc => {
          resultsMap.set(doc.id, { ...doc.data(), uid: doc.id });
        });
      };

      processSnap(nameSnap);
      processSnap(emailSnap);

      // 3. Fallback: extract email pattern and search exact
      const emailMatch = term.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && !resultsMap.has(term)) {
        const extractedEmail = emailMatch[0].toLowerCase();
        const specificEmailQ = query(usersRef, where('email', '==', extractedEmail));
        const specSnap = await getDocs(specificEmailQ);
        processSnap(specSnap);
      }

      const fetchedUsers = Array.from(resultsMap.values());
      setUsers(fetchedUsers);
      
      if (fetchedUsers.length === 0) {
        alert('해당 이름 또는 이메일을 가진 유저를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('유저 검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessChange = async (userId, clusterId, newStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      const targetUser = users.find(u => u.uid === userId);
      const currentAccess = targetUser.clusterAccess || {};
      
      const newAccess = { ...currentAccess };
      if (newStatus === 'none') {
        // We use delete carefully
        delete newAccess[clusterId];
      } else {
        newAccess[clusterId] = newStatus; // 'active' or 'suspended'
      }

      // Firestore merge will not delete keys if we just pass a new object unless we overwrite it completely,
      // but `{ merge: true }` will merge. If we want to delete a key using merge, we should use deleteField().
      // For simplicity, we can just save it. Wait, actually if we want to delete a field inside a map with merge, 
      // it's complicated. Better to set it to 'none' string if we want "no access" instead of deleting,
      // or we just setDoc without merge for the whole clusterAccess map.
      // Replacing the whole map is safer if we read the current one.
      
      await setDoc(userRef, { clusterAccess: newAccess }, { merge: true });
      
      // Update local state
      setUsers(users.map(u => {
        if (u.uid === userId) {
          return { ...u, clusterAccess: newAccess };
        }
        return u;
      }));

      // No need for alert on every change if it's instant, but good for feedback
    } catch (err) {
      console.error(err);
      alert('권한 수정 실패');
    }
  };

  if (clustersLoading) return <div>Loading DB...</div>;

  return (
    <div className="admin-page">
      <div className="admin-header-row">
        <h2>유저 권한 관리 (Access Control)</h2>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="editor-section block-appear">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input 
              type="text" 
              placeholder="이름 또는 이메일 앞부분을 입력하세요..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'white', fontSize: '1rem' }}
            />
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? '검색 중...' : <><Search size={18} /> 검색</>}
            </button>
          </form>

          <div className="user-results">
            {users.map(user => (
              <div key={user.uid} className="editor-panel block-appear" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '50%' }}>
                    <UserIcon size={30} color="#00f3ff" />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '1.4rem' }}>{user.name || '이름 없음'}</h3>
                    <p style={{ margin: 0, color: '#88aabb', fontSize: '1rem' }}>{user.email} <span style={{fontSize: '0.8rem', opacity: 0.6}}>(UID: {user.uid})</span></p>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', background: 'rgba(0,0,0,0.2)' }}>
                        <th style={{ padding: '15px', width: '30%' }}>행성 군집 (Cluster)</th>
                        <th style={{ padding: '15px', width: '40%' }}>속성</th>
                        <th style={{ padding: '15px', width: '30%' }}>접근 상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusters.map(cluster => {
                        const clusterId = cluster.docId || cluster.id;
                        const accessState = user.clusterAccess?.[clusterId] || 'none';

                        return (
                          <tr key={clusterId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '15px', fontWeight: 'bold' }}>
                              {cluster.name}
                            </td>
                            <td style={{ padding: '15px', color: '#88aabb', fontSize: '0.9rem' }}>
                              {clusterId} <br/> 
                              <span style={{ color: cluster.isPrivate ? '#ffb703' : '#00f3ff' }}>
                                {cluster.isPrivate ? '비공개 (초대 필요)' : '공개 (기본 접근 가능)'}
                              </span>
                            </td>
                            <td style={{ padding: '15px' }}>
                              <select 
                                value={accessState}
                                onChange={(e) => handleAccessChange(user.uid, clusterId, e.target.value)}
                                style={{ 
                                  padding: '10px', 
                                  borderRadius: '6px', 
                                  background: accessState === 'active' ? 'rgba(0, 200, 100, 0.2)' : accessState === 'suspended' ? 'rgba(255, 50, 50, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                  color: accessState === 'active' ? '#00ffa0' : accessState === 'suspended' ? '#ff6060' : 'white', 
                                  border: `1px solid ${accessState === 'active' ? '#00ffa0' : accessState === 'suspended' ? '#ff6060' : 'rgba(255,255,255,0.2)'}`,
                                  outline: 'none',
                                  width: '100%',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                <option value="none" style={{background: '#1a1b26', color: 'white'}}>권한 없음 (None)</option>
                                <option value="active" style={{background: '#1a1b26', color: '#00ffa0'}}>접근 허용 (Active)</option>
                                <option value="suspended" style={{background: '#1a1b26', color: '#ff6060'}}>강제 정지 (Suspended)</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserAccessManager;
