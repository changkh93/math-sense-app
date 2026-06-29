import { useState, useEffect } from 'react';
import { parseInlineFormatting } from '../../utils/formatUtils';
import 'katex/dist/katex.min.css';
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  where,
  increment,
  writeBatch,
  limit
} from 'firebase/firestore';
import { 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  Filter, 
  User, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldOff
} from 'lucide-react';
import QuizPreviewModal from '../../components/Admin/QuizPreviewModal';
import { useQAMutations } from '../../hooks/useQA';
import './Admin.css';

export default function TeacherQA() {
  const { verifyAnswer } = useQAMutations();
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> Array of answers
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); 
  const [replyText, setReplyText] = useState({}); 
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [previewInfo, setPreviewInfo] = useState({ 
    isOpen: false, 
    unitId: null, 
    quizId: null,
    type: 'quiz',
    videoId: null,
    startTime: null,
    title: ''
  });
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const [banSearchTerm, setBanSearchTerm] = useState('');
  const [banSearchResults, setBanSearchResults] = useState([]);
  const [banSearchLoading, setBanSearchLoading] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [banActionUid, setBanActionUid] = useState('');

  useEffect(() => {
    setLoading(true);
    let unsubscribeQuestions = null;
    let cleanupTimeout = null;

    let q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    if (filter !== 'all') {
      q = query(collection(db, 'questions'), where('status', '==', filter), orderBy('createdAt', 'desc'));
    }

    unsubscribeQuestions = onSnapshot(q, 
      (snapshot) => {
        const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuestions(qs);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Questions listener error:", error);
        setLoading(false);
      }
    );

    return () => {
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
      if (unsubscribeQuestions) {
        if (!auth.currentUser) {
           unsubscribeQuestions();
        } else {
           cleanupTimeout = setTimeout(() => {
             if (unsubscribeQuestions) unsubscribeQuestions();
           }, 100);
        }
      }
    };
  }, [filter]);

  // 2. Global listener for all answers (sync once)
  useEffect(() => {
    console.log("📡 Subscribing to all answers...");
    const unsubscribeAnswers = onSnapshot(collection(db, 'answers'), 
      (snapshot) => {
        const ansMap = {};
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          if (data.questionId) {
            if (!ansMap[data.questionId]) ansMap[data.questionId] = [];
            ansMap[data.questionId].push(data);
          }
        });

        // Sort answers within each group
        Object.keys(ansMap).forEach(key => {
          ansMap[key].sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || Date.now();
            const timeB = b.createdAt?.toMillis() || Date.now();
            return timeA - timeB;
          });
        });

        setAnswers(ansMap);
        console.log(`✅ Answers updated: ${snapshot.size} total.`);
      },
      (error) => {
        console.error("❌ Answers listener error:", error);
      }
    );

    return () => unsubscribeAnswers();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'agoraBannedUsers'), orderBy('bannedAt', 'desc'));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        setBannedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error('❌ Agora banned users listener error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleDeleteAnswer = async (answer, questionId) => {
    if (!confirm('답변을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'answers', answer.id));
      if (!answer.parentAnswerId) {
        await updateDoc(doc(db, 'questions', questionId), {
          answerCount: increment(-1)
        });
      }
      alert('답변이 삭제되었습니다.');
    } catch (err) {
      console.error('Error deleting answer:', err);
      alert('답변 삭제에 실패했습니다.');
    }
  };

  const handleDeleteQuestion = async (question) => {
    const preview = String(question.content || '').slice(0, 80);
    const confirmed = confirm(
      `이 아고라 게시물을 삭제할까요?\n\n작성자: ${question.userName || '익명 학생'}\n내용: ${preview}${preview.length >= 80 ? '...' : ''}\n\n연결된 답변도 함께 삭제됩니다.`
    );
    if (!confirmed) return;

    setDeletingQuestionId(question.id);
    try {
      const answersSnap = await getDocs(query(
        collection(db, 'answers'),
        where('questionId', '==', question.id)
      ));
      const refsToDelete = [
        doc(db, 'questions', question.id),
        ...answersSnap.docs.map(answerDoc => answerDoc.ref)
      ];

      for (let i = 0; i < refsToDelete.length; i += 450) {
        const batch = writeBatch(db);
        refsToDelete.slice(i, i + 450).forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      alert(`게시물을 삭제했습니다. 연결 답변 ${answersSnap.size}개도 함께 삭제했습니다.`);
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('게시물 삭제에 실패했습니다.');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleBanSearch = async (e) => {
    e.preventDefault();
    const term = banSearchTerm.trim();
    if (!term) return;

    setBanSearchLoading(true);
    setBanSearchResults([]);
    try {
      const termLower = term.toLowerCase();
      const usersRef = collection(db, 'users');
      const nameQ = query(usersRef, where('name', '>=', term), where('name', '<=', term + '\uf8ff'), limit(20));
      const studentNameQ = query(usersRef, where('studentName', '>=', term), where('studentName', '<=', term + '\uf8ff'), limit(20));
      const emailQ = query(usersRef, where('email', '>=', termLower), where('email', '<=', termLower + '\uf8ff'), limit(20));
      const [nameSnap, studentNameSnap, emailSnap] = await Promise.all([
        getDocs(nameQ),
        getDocs(studentNameQ),
        getDocs(emailQ)
      ]);

      const resultsMap = new Map();
      [nameSnap, studentNameSnap, emailSnap].forEach((snap) => {
        snap.docs.forEach(userDoc => {
          resultsMap.set(userDoc.id, { uid: userDoc.id, ...userDoc.data() });
        });
      });

      setBanSearchResults(Array.from(resultsMap.values()));
    } catch (err) {
      console.error('Error searching users for agora ban:', err);
      alert('이용자 검색 중 오류가 발생했습니다.');
    } finally {
      setBanSearchLoading(false);
    }
  };

  const handleBanUser = async (targetUser) => {
    if (!targetUser?.uid || banActionUid) return;
    if (targetUser.role === 'admin') {
      alert('관리자 계정은 아고라 게시글 금지 대상으로 추가할 수 없습니다.');
      return;
    }
    const displayName = targetUser.studentName || targetUser.name || targetUser.email || targetUser.uid;
    if (!confirm(`${displayName} 학생의 아고라 게시글 작성을 금지할까요?`)) return;

    setBanActionUid(targetUser.uid);
    try {
      await setDoc(doc(db, 'agoraBannedUsers', targetUser.uid), {
        userId: targetUser.uid,
        userName: targetUser.studentName || targetUser.name || '이름 없음',
        email: targetUser.email || '',
        role: targetUser.role || 'student',
        bannedAt: serverTimestamp(),
        bannedBy: auth.currentUser?.uid || '',
        bannedByEmail: auth.currentUser?.email || ''
      }, { merge: true });
      setBanSearchResults(prev => prev.map(user => (
        user.uid === targetUser.uid ? { ...user, agoraBanned: true } : user
      )));
    } catch (err) {
      console.error('Error banning agora user:', err);
      alert('아고라 게시글 금지 처리에 실패했습니다.');
    } finally {
      setBanActionUid('');
    }
  };

  const handleUnbanUser = async (targetUser) => {
    const targetUid = targetUser?.userId || targetUser?.uid || targetUser?.id;
    if (!targetUid || banActionUid) return;
    const displayName = targetUser.userName || targetUser.studentName || targetUser.name || targetUser.email || targetUid;
    if (!confirm(`${displayName} 학생의 아고라 게시글 금지를 해제할까요?`)) return;

    setBanActionUid(targetUid);
    try {
      await deleteDoc(doc(db, 'agoraBannedUsers', targetUid));
      setBanSearchResults(prev => prev.map(user => (
        user.uid === targetUid ? { ...user, agoraBanned: false } : user
      )));
    } catch (err) {
      console.error('Error unbanning agora user:', err);
      alert('아고라 게시글 금지 해제에 실패했습니다.');
    } finally {
      setBanActionUid('');
    }
  };

  const startEditAnswer = (answer) => {
    setEditingAnswerId(answer.id);
    setEditBuffer(answer.content);
  };

  const handleUpdateAnswer = async (answerId) => {
    if (!editBuffer.trim()) return;
    try {
      await updateDoc(doc(db, 'answers', answerId), {
        content: editBuffer,
        updatedAt: serverTimestamp()
      });
      setEditingAnswerId(null);
    } catch (err) {
      console.error('Error updating answer:', err);
    }
  };

  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async (questionId) => {
    if (isReplying) return;
    const text = replyText[questionId];
    if (!text?.trim()) return;
    setIsReplying(true);

    try {
      // 1. Add answer
      await addDoc(collection(db, 'answers'), {
        questionId,
        userId: 'admin', // In real app, get from auth
        isTeacher: true,
        content: text,
        isAccepted: false,
        isVerified: true,
        createdAt: serverTimestamp()
      });

      // 2. Update question status and answerCount
      await updateDoc(doc(db, 'questions', questionId), {
        status: 'answered',
        answerCount: increment(1),
        updatedAt: serverTimestamp()
      });

      setReplyText(prev => ({ ...prev, [questionId]: '' }));
      
      // 3. Create Notification
      try {
        const questionDoc = questions.find(q => q.id === questionId);
        if (questionDoc && questionDoc.userId) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: questionDoc.userId,
            type: 'reply',
            message: '선생님이 질문에 답변을 남겼습니다.',
            link: `/agora/${questionId}`,
            questionId: questionId,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (notifErr) {
        console.error('Error creating notification:', notifErr);
        // Continue flow even if notification fails
      }

      alert('답변이 등록되었습니다.');
    } catch (err) {
      console.error('Error replying:', err);
      alert('답변 등록에 실패했습니다.');
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="admin-qa-container">
      <div className="admin-page-header">
        <h1>질문 관리 대시보드</h1>
        <div className="filter-bar">
          <button
            className={`filter-btn ${activeTab === 'questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('questions')}
          >
            <MessageSquare size={16} /> 질문 관리
          </button>
          <button
            className={`filter-btn ${activeTab === 'bans' ? 'active' : ''}`}
            onClick={() => setActiveTab('bans')}
          >
            <ShieldOff size={16} /> 작성 금지
          </button>
        </div>
      </div>

      {activeTab === 'bans' ? (
        <div className="agora-ban-panel">
          <section className="agora-ban-card glass">
            <div className="agora-ban-section-header">
              <div>
                <h2>금지할 이용자 추가</h2>
                <p>이름 또는 이메일 앞부분으로 학생을 검색한 뒤 아고라 게시글 작성을 금지합니다.</p>
              </div>
            </div>
            <form className="agora-ban-search" onSubmit={handleBanSearch}>
              <input
                type="text"
                value={banSearchTerm}
                onChange={(e) => setBanSearchTerm(e.target.value)}
                placeholder="학생 이름 또는 이메일 검색"
              />
              <button type="submit" disabled={banSearchLoading}>
                <Search size={16} /> {banSearchLoading ? '검색 중...' : '검색'}
              </button>
            </form>

            <div className="agora-ban-results">
              {banSearchResults.length === 0 ? (
                <div className="empty-msg">검색 결과가 여기에 표시됩니다.</div>
              ) : (
                banSearchResults.map((targetUser) => {
                  const isBanned = targetUser.agoraBanned || bannedUsers.some(banned => banned.userId === targetUser.uid || banned.id === targetUser.uid);
                  const isAdminAccount = targetUser.role === 'admin';
                  return (
                    <div key={targetUser.uid} className="agora-ban-row">
                      <div className="agora-ban-user">
                        <strong>{targetUser.studentName || targetUser.name || '이름 없음'}</strong>
                        <span>{targetUser.email || '이메일 없음'} · UID: {targetUser.uid}</span>
                      </div>
                      {isBanned ? (
                        <button
                          type="button"
                          className="agora-ban-action secondary"
                          onClick={() => handleUnbanUser(targetUser)}
                          disabled={banActionUid === targetUser.uid}
                        >
                          {banActionUid === targetUser.uid ? '처리 중...' : '금지 해제'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="agora-ban-action danger"
                          onClick={() => handleBanUser(targetUser)}
                          disabled={banActionUid === targetUser.uid || isAdminAccount}
                          title={isAdminAccount ? '관리자 계정은 금지할 수 없습니다.' : '아고라 게시글 작성 금지'}
                        >
                          {isAdminAccount ? '관리자 제외' : banActionUid === targetUser.uid ? '처리 중...' : '게시글 금지'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="agora-ban-card glass">
            <div className="agora-ban-section-header">
              <div>
                <h2>금지된 이용자 목록</h2>
                <p>목록에 있는 학생은 새 아고라 질문 게시글을 등록할 수 없습니다.</p>
              </div>
              <span className="agora-ban-count">{bannedUsers.length}명</span>
            </div>
            <div className="agora-ban-results">
              {bannedUsers.length === 0 ? (
                <div className="empty-msg">현재 금지된 이용자가 없습니다.</div>
              ) : (
                bannedUsers.map((bannedUser) => (
                  <div key={bannedUser.id || bannedUser.userId} className="agora-ban-row">
                    <div className="agora-ban-user">
                      <strong>{bannedUser.userName || '이름 없음'}</strong>
                      <span>
                        {bannedUser.email || '이메일 없음'} · UID: {bannedUser.userId || bannedUser.id}
                        {bannedUser.bannedAt?.toDate ? ` · ${bannedUser.bannedAt.toDate().toLocaleString()}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="agora-ban-action secondary"
                      onClick={() => handleUnbanUser(bannedUser)}
                      disabled={banActionUid === (bannedUser.userId || bannedUser.id)}
                    >
                      {banActionUid === (bannedUser.userId || bannedUser.id) ? '처리 중...' : '금지 해제'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : (
      <>
        <div className="filter-bar qa-status-filter">
          <button 
            className={`filter-btn ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            <Clock size={16} /> 대기중
          </button>
          <button 
            className={`filter-btn ${filter === 'answered' ? 'active' : ''}`}
            onClick={() => setFilter('answered')}
          >
            <CheckCircle size={16} /> 답변완료
          </button>
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <Filter size={16} /> 전체보기
          </button>
        </div>

      {loading ? (
        <div className="loading-msg">질문을 불러오는 중...</div>
      ) : (
        <div className="questions-list">
          {questions.length === 0 ? (
            <div className="empty-msg">해당 조건의 질문이 없습니다.</div>
          ) : (
            questions.map(q => (
              <div key={q.id} className={`qa-card glass ${q.status}`}>
                <div className="qa-card-header">
                  <span className="user-info">
                    <User size={14} /> {q.userName || '익명 학생'}
                  </span>
                  <div className="header-right">
                    <span className="timestamp">
                      {q.createdAt?.toDate().toLocaleString()}
                    </span>
                    <span className={`status-badge ${q.status}`}>
                      {q.status === 'open' ? '답변 대기' : '답변 완료'}
                    </span>
                    <button
                      type="button"
                      className="qa-delete-question-btn"
                      onClick={() => handleDeleteQuestion(q)}
                      disabled={deletingQuestionId === q.id}
                      title="게시물 삭제"
                    >
                      <Trash2 size={14} />
                      {deletingQuestionId === q.id ? '삭제 중...' : '게시물 삭제'}
                    </button>
                  </div>
                </div>

                <div 
                  className="qa-context linkable" 
                  onClick={() => setPreviewInfo({ 
                    isOpen: true, 
                    unitId: q.quizContext?.unitId || q.quizId, 
                    quizId: q.quizContext?.questionId,
                    type: q.type || 'quiz',
                    videoId: q.quizContext?.videoId,
                    startTime: q.quizContext?.startTime,
                    title: q.quizContext?.transmissionTitle || q.quizContext?.quizTitle
                  })}
                >
                  <ExternalLink size={14} />
                  <strong>[{q.quizContext?.transmissionTitle || q.quizContext?.quizTitle || '단원 정보 없음'}]</strong> 
                  {q.quizContext?.questionId ? ` - 문제 번호: ${q.quizContext.questionId}` : ''}
                </div>

                <div className="qa-content">
                  <div className="qa-text">
                    {parseInlineFormatting(q.content, { 
                      boldColor: '#4cc9f0', 
                      italicColor: '#f72585',
                      keyPrefix: `q-${q.id}` 
                    })}
                  </div>
                  {q.drawingUrl && (
                    <div className="qa-drawing">
                      <img 
                        src={q.drawingUrl} 
                        alt="Student Drawing" 
                        onClick={() => window.open(q.drawingUrl, '_blank')} 
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginTop: '10px', cursor: 'zoom-in', border: '1px solid #ccc' }} 
                      />
                    </div>
                  )}
                </div>

                <div className="answers-section">
                  <div 
                    className="answers-header" 
                    onClick={() => setExpandedQuestions(prev => ({...prev, [q.id]: !prev[q.id]}))}
                  >
                    <span>답변 내역 ({answers[q.id]?.length || 0})</span>
                    {expandedQuestions[q.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {expandedQuestions[q.id] && (
                    <div className="answers-list">
                      {answers[q.id]?.map(ans => (
                        <div key={ans.id} className="answer-bubble">
                          {editingAnswerId === ans.id ? (
                            <div className="edit-box">
                              <textarea 
                                value={editBuffer}
                                onChange={(e) => setEditBuffer(e.target.value)}
                              ></textarea>
                              <div className="edit-actions">
                                <button onClick={() => handleUpdateAnswer(ans.id)}>저장</button>
                                <button className="cancel" onClick={() => setEditingAnswerId(null)}>취소</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="ans-text">
                                {ans.isTeacher ? <span className="teacher-badge-small">선생님</span> : <span className="student-badge-small">학생</span>}
                                {ans.isVerified && <span className="verified-badge-small">✨ 인증됨</span>}
                                <div className="ans-content-text">
                                  {parseInlineFormatting(ans.content, {
                                    boldColor: '#4cc9f0',
                                    italicColor: '#f72585',
                                    keyPrefix: `ans-${ans.id}`
                                  })}
                                </div>
                              </div>
                              <div className="ans-footer">
                                <span className="ans-date">{ans.createdAt?.toDate().toLocaleString()}</span>
                                <div className="ans-actions">
                                  {!ans.isTeacher && !ans.isVerified && (
                                    <button 
                                      className="verify-action-btn"
                                      onClick={() => verifyAnswer.mutate({ questionId: q.id, answerId: ans.id })}
                                      title="우수 답변으로 인증하고 10광석 선물"
                                    >
                                      인증⭐
                                    </button>
                                  )}
                                  <button onClick={() => startEditAnswer(ans)}><Edit3 size={12} /></button>
                                  <button onClick={() => handleDeleteAnswer(ans, q.id)}><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="reply-section">
                  <textarea 
                    placeholder="새로운 답변을 입력하세요..."
                    value={replyText[q.id] || ''}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [q.id]: e.target.value }))}
                  ></textarea>
                  <button onClick={() => handleReply(q.id)}>답변 등록</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </>
      )}

      <QuizPreviewModal 
        isOpen={previewInfo.isOpen}
        onClose={() => setPreviewInfo({ ...previewInfo, isOpen: false })}
        unitId={previewInfo.unitId}
        quizId={previewInfo.quizId}
        type={previewInfo.type}
        videoId={previewInfo.videoId}
        startTime={previewInfo.startTime}
        title={previewInfo.title}
      />
    </div>
  );
}
