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
  serverTimestamp,
  where,
  increment
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
  ChevronUp
} from 'lucide-react';
import QuizPreviewModal from '../../components/Admin/QuizPreviewModal';
import { useQAMutations } from '../../hooks/useQA';
import './Admin.css';

export default function TeacherQA() {
  const { verifyAnswer } = useQAMutations();
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

  const handleDeleteAnswer = async (answerId, questionId) => {
    if (!confirm('답변을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'answers', answerId));
      // Sync answerCount
      await updateDoc(doc(db, 'questions', questionId), {
        answerCount: increment(-1)
      });
      alert('답변이 삭제되었습니다.');
    } catch (err) {
      console.error('Error deleting answer:', err);
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
                                  <button onClick={() => handleDeleteAnswer(ans.id, q.id)}><Trash2 size={12} /></button>
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
