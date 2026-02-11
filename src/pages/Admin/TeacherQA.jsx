import { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  where
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
import './Admin.css';

export default function TeacherQA() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // questionId -> Array of answers
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); 
  const [replyText, setReplyText] = useState({}); 
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [previewInfo, setPreviewInfo] = useState({ isOpen: false, unitId: null, quizId: null });
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    let q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    if (filter !== 'all') {
      q = query(collection(db, 'questions'), where('status', '==', filter), orderBy('createdAt', 'desc'));
    }

    const unsubscribeQuestions = onSnapshot(q, (snapshot) => {
      const qs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qs);
      setLoading(false);
    });

    // Listen to all answers to keep UI in sync
    const unsubscribeAnswers = onSnapshot(collection(db, 'answers'), (snapshot) => {
      const ansMap = {};
      snapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (!ansMap[data.questionId]) ansMap[data.questionId] = [];
        ansMap[data.questionId].push(data);
      });
      // Sort answers by date within each question
      Object.keys(ansMap).forEach(key => {
        ansMap[key].sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      });
      setAnswers(ansMap);
    });

    return () => {
      unsubscribeQuestions();
      unsubscribeAnswers();
    };
  }, [filter]);

  const handleDeleteAnswer = async (answerId, questionId) => {
    if (!confirm('답변을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'answers', answerId));
      // If no more answers, we should technically consider reverting status but for now let's keep it
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

  const handleReply = async (questionId) => {
    const text = replyText[questionId];
    if (!text?.trim()) return;

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

      // 2. Update question status
      await updateDoc(doc(db, 'questions', questionId), {
        status: 'answered',
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
                    quizId: q.quizContext?.questionId 
                  })}
                >
                  <ExternalLink size={14} />
                  <strong>[{q.quizContext?.quizTitle || '단원 정보 없음'}]</strong> 
                  {q.quizContext?.questionId && ` - 문제 번호: ${q.quizContext.questionId}`}
                </div>

                <div className="qa-content">
                  <p>{q.content}</p>
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
                                {ans.content}
                              </div>
                              <div className="ans-footer">
                                <span className="ans-date">{ans.createdAt?.toDate().toLocaleString()}</span>
                                <div className="ans-actions">
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
      />
    </div>
  );
}
