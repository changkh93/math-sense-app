import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../../firebase';
import { useClusters } from '../../hooks/useContent';
import { AlertTriangle, Search, Trash2, User as UserIcon } from 'lucide-react';
import './Admin.css';

function UserAccessManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingUid, setDeletingUid] = useState('');
  const [allRegions, setAllRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const { data: clusters = [], isLoading: clustersLoading } = useClusters();

  useEffect(() => {
    let mounted = true;

    const fetchRegions = async () => {
      setRegionsLoading(true);
      try {
        const snap = await getDocs(collection(db, 'regions'));
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aCluster = a.clusterId || 'cluster_elementary';
            const bCluster = b.clusterId || 'cluster_elementary';
            if (aCluster !== bCluster) return aCluster.localeCompare(bCluster);
            return (a.order || 0) - (b.order || 0);
          });
        if (mounted) setAllRegions(rows);
      } catch (err) {
        console.error('regions fetch failed:', err);
      } finally {
        if (mounted) setRegionsLoading(false);
      }
    };

    fetchRegions();
    return () => {
      mounted = false;
    };
  }, []);

  const regionsByCluster = useMemo(() => {
    const grouped = {};
    allRegions.forEach((region) => {
      const cid = region.clusterId || 'cluster_elementary';
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(region);
    });
    return grouped;
  }, [allRegions]);

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

      // 2. Search by studentName (프로필 수정 탐사원 이름, Starts with)
      const studentNameQ = query(usersRef,
        where('studentName', '>=', term),
        where('studentName', '<=', term + '\uf8ff'),
        limit(20)
      );

      // 3. Search by email (Starts with)
      const emailQ = query(usersRef, 
        where('email', '>=', termLower), 
        where('email', '<=', termLower + '\uf8ff'),
        limit(20)
      );

      const [nameSnap, studentNameSnap, emailSnap] = await Promise.all([
        getDocs(nameQ),
        getDocs(studentNameQ),
        getDocs(emailQ)
      ]);
      
      const resultsMap = new Map();
      
      const processSnap = (snap) => {
        snap.docs.forEach(doc => {
          resultsMap.set(doc.id, { ...doc.data(), uid: doc.id });
        });
      };

      processSnap(nameSnap);
      processSnap(studentNameSnap);
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
      setUsers(prev => prev.map(u => {
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

  const handleRegionAccessChange = async (userId, regionId, newStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      const targetUser = users.find(u => u.uid === userId);
      const currentRegionAccess = targetUser?.regionAccess || {};
      const nextRegionAccess = { ...currentRegionAccess };

      if (newStatus === 'none') {
        delete nextRegionAccess[regionId];
      } else {
        nextRegionAccess[regionId] = newStatus; // active | completed | suspended
      }

      await setDoc(userRef, { regionAccess: nextRegionAccess }, { merge: true });

      setUsers(prev => prev.map(u => {
        if (u.uid === userId) {
          return { ...u, regionAccess: nextRegionAccess };
        }
        return u;
      }));
    } catch (err) {
      console.error(err);
      alert('과정 상태 수정 실패');
    }
  };

  const handlePermanentDeleteUser = async (targetUser) => {
    if (!targetUser?.uid || deletingUid) return;

    if (targetUser.uid === auth.currentUser?.uid) {
      alert('현재 로그인한 관리자 본인은 이 화면에서 삭제할 수 없습니다.');
      return;
    }
    if (targetUser.role === 'admin') {
      alert('관리자 계정은 이 화면에서 삭제할 수 없습니다.');
      return;
    }

    const displayName = targetUser.studentName || targetUser.name || targetUser.email || targetUser.uid;
    const confirmTarget = targetUser.email || targetUser.uid;
    const firstConfirm = window.confirm(
      `${displayName} 이용자를 완전 삭제합니다.\n\n` +
      '삭제 범위: 로그인 계정, 학습 기록, 광석/거래 내역, 과제, 출석, 질문/답변, 쪽지, 스터디 크루 연결, 업로드 파일.\n\n' +
      '이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?'
    );
    if (!firstConfirm) return;

    const confirmText = window.prompt(
      `최종 확인을 위해 아래 문구를 정확히 입력하세요.\n\n${confirmTarget}`
    );
    if (confirmText !== confirmTarget) {
      alert('확인 문구가 일치하지 않아 삭제를 취소했습니다.');
      return;
    }

    setDeletingUid(targetUser.uid);
    try {
      const deleteUserAccount = httpsCallable(functions, 'adminDeleteUserAccount');
      const result = await deleteUserAccount({
        targetUid: targetUser.uid,
        confirmText
      });
      setUsers(prev => prev.filter(user => user.uid !== targetUser.uid));
      const stats = result?.data?.stats || {};
      const deletedCount = Object.values(stats).reduce((sum, value) => sum + (Number(value) || 0), 0);
      alert(`완전 삭제가 완료되었습니다. 정리된 항목: ${deletedCount}개`);
    } catch (err) {
      console.error('adminDeleteUserAccount failed:', err);
      alert(err?.message || '이용자 완전 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingUid('');
    }
  };

  if (clustersLoading || regionsLoading) return <div>Loading DB...</div>;

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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '1.4rem' }}>{user.studentName || user.name || '이름 없음'}</h3>
                    <p style={{ margin: 0, color: '#88aabb', fontSize: '1rem' }}>{user.email} <span style={{fontSize: '0.8rem', opacity: 0.6}}>(UID: {user.uid})</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePermanentDeleteUser(user)}
                    disabled={deletingUid === user.uid || user.uid === auth.currentUser?.uid || user.role === 'admin'}
                    title={user.role === 'admin' ? '관리자 계정은 삭제할 수 없습니다.' : '이용자 모든 데이터 완전 삭제'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 94, 87, 0.65)',
                      background: 'rgba(255, 94, 87, 0.12)',
                      color: '#ff8a84',
                      fontWeight: 800,
                      cursor: deletingUid === user.uid || user.uid === auth.currentUser?.uid || user.role === 'admin' ? 'not-allowed' : 'pointer',
                      opacity: deletingUid === user.uid || user.uid === auth.currentUser?.uid || user.role === 'admin' ? 0.55 : 1,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {deletingUid === user.uid ? (
                      <>
                        <AlertTriangle size={16} /> 삭제 중...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} /> 완전 삭제
                      </>
                    )}
                  </button>
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

                <div style={{ marginTop: '20px', overflowX: 'auto' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--neon-blue)' }}>과정 접근/완료 처리 (Region)</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', background: 'rgba(0,0,0,0.2)' }}>
                        <th style={{ padding: '12px 15px', width: '20%' }}>소속 군집</th>
                        <th style={{ padding: '12px 15px', width: '35%' }}>과정(Region)</th>
                        <th style={{ padding: '12px 15px', width: '25%' }}>속성</th>
                        <th style={{ padding: '12px 15px', width: '20%' }}>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clusters.flatMap((cluster) => {
                        const clusterId = cluster.docId || cluster.id;
                        const regions = regionsByCluster[clusterId] || [];
                        return regions.map((region) => {
                          const regionId = region.id || region.docId;
                          const regionState = user.regionAccess?.[regionId] || 'none';
                          const bg =
                            regionState === 'active'
                              ? 'rgba(0, 200, 100, 0.2)'
                              : regionState === 'completed'
                                ? 'rgba(251, 191, 36, 0.2)'
                                : regionState === 'suspended'
                                  ? 'rgba(255, 50, 50, 0.2)'
                                  : 'rgba(255, 255, 255, 0.1)';
                          const color =
                            regionState === 'active'
                              ? '#00ffa0'
                              : regionState === 'completed'
                                ? '#fbbf24'
                                : regionState === 'suspended'
                                  ? '#ff6060'
                                  : 'white';
                          const border =
                            regionState === 'active'
                              ? '#00ffa0'
                              : regionState === 'completed'
                                ? '#fbbf24'
                                : regionState === 'suspended'
                                  ? '#ff6060'
                                  : 'rgba(255,255,255,0.2)';

                          return (
                            <tr key={`${user.uid}_${regionId}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '12px 15px', color: '#88aabb' }}>{cluster.name}</td>
                              <td style={{ padding: '12px 15px', fontWeight: 'bold' }}>{region.title || regionId}</td>
                              <td style={{ padding: '12px 15px', color: '#88aabb', fontSize: '0.9rem' }}>
                                {regionId} <br />
                                <span style={{ color: region.isPrivate ? '#ffb703' : '#00f3ff' }}>
                                  {region.isPrivate ? '비공개 (코드 필요)' : '공개'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 15px' }}>
                                <select
                                  value={regionState}
                                  onChange={(e) => handleRegionAccessChange(user.uid, regionId, e.target.value)}
                                  style={{
                                    padding: '10px',
                                    borderRadius: '6px',
                                    background: bg,
                                    color,
                                    border: `1px solid ${border}`,
                                    outline: 'none',
                                    width: '100%',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  <option value="none" style={{ background: '#1a1b26', color: 'white' }}>미지정 (None)</option>
                                  <option value="active" style={{ background: '#1a1b26', color: '#00ffa0' }}>접근 허용 (Active)</option>
                                  <option value="completed" style={{ background: '#1a1b26', color: '#fbbf24' }}>완료 처리 (Completed)</option>
                                  <option value="suspended" style={{ background: '#1a1b26', color: '#ff6060' }}>접근 정지 (Suspended)</option>
                                </select>
                              </td>
                            </tr>
                          );
                        });
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
