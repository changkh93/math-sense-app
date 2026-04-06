import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, where, orderBy, documentId } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { parseInlineFormatting } from '../../utils/formatUtils';

export default function AdminDarkMatterTab({ userId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const iqSnap = await getDocs(query(collection(db, 'users', userId, 'incorrect_questions'), orderBy('lastFailedAt', 'desc')));
      const rmSnap = await getDocs(query(collection(db, 'users', userId, 'review_marks'), where('status', '==', 'active')));
      
      const iqMeta = iqSnap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'incorrect' }));
      const rmMeta = rmSnap.docs.map(d => ({ id: d.id, ...d.data(), _source: 'review' }));
      
      const allIds = Array.from(new Set([...iqMeta.map(m => m.id), ...rmMeta.map(m => m.id)]));
      
      if (allIds.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      const freshQuestions = [];
      for (let i = 0; i < allIds.length; i += 30) {
        const chunk = allIds.slice(i, i + 30);
        const qSnap = await getDocs(query(collection(db, 'quizzes'), where(documentId(), 'in', chunk)));
        
        qSnap.docs.forEach(doc => {
          const id = doc.id;
          const qData = doc.data();
          const rmItem = rmMeta.find(m => m.id === id);
          const iqItem = iqMeta.find(m => m.id === id);
          
          freshQuestions.push({
            ...qData,
            id,
            _source: iqItem ? 'incorrect' : 'review',
            _reviewMark: !!rmItem,
            unitId: qData.unitId || iqItem?.unitId || rmItem?.unitId
          });
        });
      }

      const uniqueUnitIds = Array.from(new Set(freshQuestions.map(q => q.unitId).filter(Boolean)));
      if (uniqueUnitIds.length > 0) {
        const unitTitlesMap = {};
        for (let i = 0; i < uniqueUnitIds.length; i += 30) {
          const chunk = uniqueUnitIds.slice(i, i + 30);
          const uSnap = await getDocs(query(collection(db, 'units'), where(documentId(), 'in', chunk)));
          uSnap.docs.forEach(doc => {
            unitTitlesMap[doc.id] = doc.data().title;
          });
        }
        
        freshQuestions.forEach(q => {
          q.unitTitle = unitTitlesMap[q.unitId] || q.unitTitle || "수학 탐사";
        });
      }

      setQuestions(freshQuestions);
    } catch (err) {
      console.error('Error fetching admin dark matter:', err);
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    questions.forEach(q => {
      const key = q.unitId || 'unknown';
      if (!map[key]) {
        map[key] = {
          unitId: key,
          unitTitle: q.unitTitle || key,
          questions: []
        };
      }
      map[key].questions.push(q);
    });
    return Object.values(map).sort((a, b) => (a.unitTitle || '').localeCompare(b.unitTitle || ''));
  }, [questions]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        <div className="loading-spinner" style={{ marginRight: '1rem' }}></div>
        다크 매터 분석 중...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌟</div>
          <p>정화할 다크 매터가 없습니다.<br/>학생의 지식이 빛나고 있습니다.</p>
        </div>
      </div>
    );
  }

  const selectedGroup = selectedUnitId ? grouped.find(g => g.unitId === selectedUnitId) : null;

  return (
    <div className="admin-dark-matter-tab">
      <AnimatePresence mode="wait">
        {!selectedUnitId ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div style={{ marginBottom: '1.5rem', padding: '1.2rem', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '15px' }}>
              <h3 style={{ margin: 0, color: '#a855f7', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🌌 다크 매터 분석 리포트
              </h3>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                이 학생이 어려워하거나 정답을 맞히지 못한 {questions.length}개의 문항이 {grouped.length}개 유닛에서 감지되었습니다.
              </p>
            </div>

            <h3 style={{ color: 'var(--text-bright)', marginBottom: '1.2rem', fontSize: '1rem', fontWeight: 800 }}>
              📂 카테고리별 분류
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {grouped.map((group, idx) => (
                <motion.div
                  key={group.unitId}
                  whileHover={{ scale: 1.01, background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => setSelectedUnitId(group.unitId)}
                  className="glass-card"
                  style={{ 
                    padding: '1.2rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-bright)', fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>
                      {group.unitTitle}
                    </div>
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.8rem' }}>
                      <span style={{ color: '#ef4444' }}>
                        ❌ {group.questions.filter(q => q._source === 'incorrect').length}개 오답
                      </span>
                      <span style={{ color: '#a855f7' }}>
                        🔖 {group.questions.filter(q => q._reviewMark).length}개 재검토
                      </span>
                    </div>
                  </div>
                  <div style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'rgba(168, 85, 247, 0.15)', 
                    border: '1px solid rgba(168, 85, 247, 0.3)', 
                    borderRadius: '10px', 
                    color: '#c084fc', 
                    fontSize: '0.85rem', 
                    fontWeight: 700 
                  }}>
                    상세 보기 ({group.questions.length})
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => setSelectedUnitId(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'var(--text-bright)',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ← 목록으로
              </button>
              <h3 style={{ margin: 0, color: 'var(--crystal-cyan)', fontSize: '1.2rem' }}>
                {selectedGroup?.unitTitle}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {selectedGroup?.questions.map((q, idx) => (
                <div key={q.id} className="glass-card" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>문항 {idx + 1}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {q._reviewMark && <span style={{ fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a855f7' }}>🔖 재검토</span>}
                      {q._source === 'incorrect' && <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', border: '1px solid #ef4444' }}>❌ 오답</span>}
                    </div>
                  </div>

                  {q.imageUrl && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                      <img src={q.imageUrl} alt="Question" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  )}

                  <div style={{ 
                    color: 'var(--text-bright)', 
                    fontSize: '1.2rem', 
                    lineHeight: '1.6', 
                    marginBottom: '1.5rem', 
                    wordBreak: 'keep-all'
                  }}>
                    {parseInlineFormatting(q.question, { keyPrefix: `q-${q.id}` })}
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                      {q.options.map((opt, i) => {
                        const isCorrect = (i + 1).toString() === q.answer;
                        return (
                          <div key={i} style={{ 
                            padding: '0.8rem', 
                            borderRadius: '8px', 
                            background: isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.05)',
                            border: isCorrect ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                            fontSize: '1rem',
                            color: isCorrect ? '#4ade80' : 'var(--text-muted)'
                          }}>
                            <span style={{ marginRight: '0.8rem', opacity: 0.5, fontWeight: 'bold' }}>{i + 1}</span> 
                            {parseInlineFormatting(opt, { keyPrefix: `opt-${q.id}-${i}` })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'short_answer' && (
                    <div style={{ padding: '1rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                      정답: {q.answer}
                    </div>
                  )}

                  {q.explanation && (
                    <div style={{ padding: '1.2rem', background: 'rgba(0, 212, 255, 0.05)', borderRadius: '10px', fontSize: '0.95rem', color: 'var(--text-muted)', borderLeft: '4px solid var(--crystal-cyan)' }}>
                      <div style={{ color: 'var(--crystal-cyan)', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Solution Commentary</div>
                      {parseInlineFormatting(q.explanation, { keyPrefix: `exp-${q.id}` })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
