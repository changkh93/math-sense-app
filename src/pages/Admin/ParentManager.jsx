import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, where, onSnapshot, limit } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { db } from '../../firebase';
import { Phone, UserPlus, Search, Trash2, Link2, Users, Eye, EyeOff } from 'lucide-react';
import './Admin.css';

// Secondary Firebase app for creating parent accounts without logging out the admin
const secondaryApp = initializeApp({
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
}, 'secondaryApp');
const secondaryAuth = getAuth(secondaryApp);

// Converts phone number to virtual email for Firebase Auth
const phoneToEmail = (phone) => {
  const digits = phone.replace(/[^0-9]/g, '');
  return `${digits}@parent.mathsense.app`;
};

export default function ParentManager() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);

  // New parent form
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Child linking
  const [childSearchTerm, setChildSearchTerm] = useState('');
  const [childSearchResults, setChildSearchResults] = useState([]);
  const [searchingChild, setSearchingChild] = useState(false);
  const [linkingParentId, setLinkingParentId] = useState(null);

  // Load all parents in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'parents'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.phone || '').localeCompare(b.phone || ''));
      setParents(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Create parent account
  const handleCreateParent = async (e) => {
    e.preventDefault();
    const digits = newPhone.replace(/[^0-9]/g, '');
    if (digits.length < 10) return alert('유효한 전화번호를 입력하세요.');
    if (newPassword.length < 6) return alert('비밀번호는 6자 이상이어야 합니다.');

    setCreating(true);
    try {
      const email = phoneToEmail(digits);

      // Create Firebase Auth account via secondary app (won't log out admin)
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, newPassword);
      await secondaryAuth.signOut(); // Sign out from secondary immediately

      // Create parents document
      await setDoc(doc(db, 'parents', cred.user.uid), {
        phone: digits,
        email: email,
        childrenUids: [],
        role: 'parent',
        createdAt: new Date()
      });

      setNewPhone('');
      setNewPassword('');
      alert('학부모 계정이 생성되었습니다! ✅');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        alert('이미 등록된 전화번호입니다.');
      } else {
        alert('계정 생성 실패: ' + err.message);
      }
    } finally {
      setCreating(false);
    }
  };

  // Search for children (students)
  const handleChildSearch = async (e) => {
    e.preventDefault();
    const term = childSearchTerm.trim();
    if (!term) return;
    
    setSearchingChild(true);
    setChildSearchResults([]);
    
    try {
      // 1. Prepare queries: Firestore doesn't support "OR" easily for prefix matches, 
      // so we run two parallel queries and merge them.
      
      const termLower = term.toLowerCase();
      const usersRef = collection(db, 'users');

      // Try exact name match or prefix name match
      const nameQ = query(usersRef, 
        where('name', '>=', term), 
        where('name', '<=', term + '\uf8ff'),
        limit(20)
      );

      // Try exact email match or prefix email match (emails are often lowercase)
      const emailQ = query(usersRef, 
        where('email', '>=', termLower), 
        where('email', '<=', termLower + '\uf8ff'),
        limit(20)
      );

      const [nameSnap, emailSnap] = await Promise.all([getDocs(nameQ), getDocs(emailQ)]);
      
      const resultsMap = new Map();
      
      // Combine results
      const processSnap = (snap) => {
        snap.docs.forEach(doc => {
          const data = doc.data();
          // Filter out non-students
          if (data.role !== 'admin' && data.role !== 'parent') {
            resultsMap.set(doc.id, { uid: doc.id, ...data });
          }
        });
      };

      processSnap(nameSnap);
      processSnap(emailSnap);

      // Special case: if user input contains an email-like pattern (e.g. "Name <email@xxx.com>")
      // try to extract it and search specifically by that email
      const emailMatch = term.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch && !resultsMap.has(term)) {
        const extractedEmail = emailMatch[0].toLowerCase();
        const specificEmailQ = query(usersRef, where('email', '==', extractedEmail));
        const specSnap = await getDocs(specificEmailQ);
        processSnap(specSnap);
      }

      const results = Array.from(resultsMap.values());
      setChildSearchResults(results);

      if (results.length === 0) {
        alert(`${term}에 해당하는 학생을 찾을 수 없습니다. (이름이나 이메일 앞부분만 입력해 보세요)`);
      }
    } catch (err) {
      console.error(err);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setSearchingChild(false);
    }
  };

  // Link child to parent
  const handleLinkChild = async (parentId, childUid, childName) => {
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;
    if (parent.childrenUids?.includes(childUid)) {
      return alert('이미 연결된 자녀입니다.');
    }

    try {
      const updatedChildren = [...(parent.childrenUids || []), childUid];
      await setDoc(doc(db, 'parents', parentId), { childrenUids: updatedChildren }, { merge: true });
      setLinkingParentId(null);
      setChildSearchTerm('');
      setChildSearchResults([]);
      alert(`${childName} 학생이 연결되었습니다! ✅`);
    } catch (err) {
      console.error(err);
      alert('연결 실패');
    }
  };

  // Unlink child from parent
  const handleUnlinkChild = async (parentId, childUid) => {
    if (!confirm('이 자녀 연결을 해제하시겠습니까?')) return;
    const parent = parents.find(p => p.id === parentId);
    if (!parent) return;

    try {
      const updatedChildren = (parent.childrenUids || []).filter(uid => uid !== childUid);
      await setDoc(doc(db, 'parents', parentId), { childrenUids: updatedChildren }, { merge: true });
    } catch (err) {
      console.error(err);
      alert('연결 해제 실패');
    }
  };

  // Delete parent account (Firestore doc only; Auth account remains but is harmless)
  const handleDeleteParent = async (parentId) => {
    if (!confirm('이 학부모 계정을 삭제하시겠습니까? (Firestore 문서만 삭제됩니다)')) return;
    try {
      await deleteDoc(doc(db, 'parents', parentId));
      alert('삭제 완료');
    } catch (err) {
      console.error(err);
      alert('삭제 실패');
    }
  };

  // We need to resolve child UIDs to names. Let's load them.
  const [childNames, setChildNames] = useState({});
  useEffect(() => {
    const allChildUids = [...new Set(parents.flatMap(p => p.childrenUids || []))];
    if (allChildUids.length === 0) return;

    // Fetch user docs for all child UIDs
    const fetchNames = async () => {
      const names = {};
      // Firestore 'in' queries support max 30 items
      for (let i = 0; i < allChildUids.length; i += 30) {
        const batch = allChildUids.slice(i, i + 30);
        const q = query(collection(db, 'users'), where('__name__', 'in', batch));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          names[d.id] = d.data().name || d.data().email || d.id;
        });
      }
      setChildNames(names);
    };
    fetchNames();
  }, [parents]);

  return (
    <div className="admin-page">
      <div className="admin-header-row">
        <h2><Users size={24} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: '#a55eea' }} />학부모 통합 관리</h2>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>

        {/* CREATE NEW PARENT */}
        <div className="editor-section block-appear" style={{ background: 'rgba(165, 94, 234, 0.08)', border: '1px solid rgba(165, 94, 234, 0.2)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ marginTop: 0, color: '#a55eea' }}><UserPlus size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />새 학부모 계정 생성</h3>
          <form onSubmit={handleCreateParent} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>전화번호</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="tel"
                  placeholder="010-1234-5678"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'white', fontSize: '1rem' }}
                  required
                />
              </div>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4, display: 'block' }}>비밀번호 (6자 이상)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="초기 비밀번호"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'white', fontSize: '1rem' }}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" className="primary-btn" disabled={creating} style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
              {creating ? '생성 중...' : '계정 생성'}
            </button>
          </form>
        </div>

        {/* PARENT LIST */}
        <div className="editor-section block-appear" style={{ padding: '20px' }}>
          <h3 style={{ marginTop: 0 }}>등록된 학부모 ({parents.length}명)</h3>

          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>로딩 중...</p>
          ) : parents.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>등록된 학부모 계정이 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {parents.map(parent => (
                <div key={parent.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', background: 'rgba(165, 94, 234, 0.15)', borderRadius: '50%' }}>
                        <Phone size={20} color="#a55eea" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {parent.phone?.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                          {parent.email}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteParent(parent.id)} style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#ff6060' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Connected Children */}
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>연결된 자녀:</div>
                    {(parent.childrenUids || []).length === 0 ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem', fontStyle: 'italic' }}>연결된 자녀가 없습니다.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(parent.childrenUids || []).map(uid => (
                          <span key={uid} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 243, 255, 0.1)', color: '#00f3ff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.9rem' }}>
                            {childNames[uid] || uid.substring(0, 8) + '...'}
                            <button onClick={() => handleUnlinkChild(parent.id, uid)} style={{ background: 'none', border: 'none', color: '#ff6060', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Link child button/form */}
                    {linkingParentId === parent.id ? (
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        <form onSubmit={handleChildSearch} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                          <input
                            type="text"
                            placeholder="학생 이름 또는 이메일"
                            value={childSearchTerm}
                            onChange={(e) => setChildSearchTerm(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--panel-bg)', color: 'white' }}
                          />
                          <button type="submit" className="secondary-btn" disabled={searchingChild} style={{ padding: '10px 16px' }}>
                            {searchingChild ? '...' : <><Search size={14}/> 검색</>}
                          </button>
                          <button type="button" onClick={() => { setLinkingParentId(null); setChildSearchResults([]); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>취소</button>
                        </form>
                        {childSearchResults.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {childSearchResults.map(child => (
                              <div key={child.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                <span>{child.name || '이름 없음'} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>({child.email})</span></span>
                                <button onClick={() => handleLinkChild(parent.id, child.uid, child.name)} className="primary-btn" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                                  <Link2 size={14} style={{ marginRight: 4 }} /> 연결
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setLinkingParentId(parent.id)}
                        style={{ marginTop: '10px', background: 'rgba(165, 94, 234, 0.1)', border: '1px dashed rgba(165, 94, 234, 0.4)', borderRadius: '8px', padding: '8px 16px', color: '#a55eea', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        <UserPlus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        자녀 연결하기
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
