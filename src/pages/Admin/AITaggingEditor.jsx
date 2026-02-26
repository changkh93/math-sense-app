import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Bot, Save, ArrowLeft, Play, CheckCircle } from 'lucide-react';
import { autoTagQuizToVideo } from '../../services/geminiService';

const AITaggingEditor = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [unitData, setUnitData] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  
  const [isTagsGenerating, setIsTagsGenerating] = useState(false);
  const [proposedTags, setProposedTags] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // For preview player
  const [previewTxId, setPreviewTxId] = useState(null);
  const [previewTimestamp, setPreviewTimestamp] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Unit definitions (transmissions, learning text)
        const unitRef = doc(db, 'units', unitId);
        const unitSnap = await getDoc(unitRef);
        if (unitSnap.exists()) {
          setUnitData(unitSnap.data());
        }

        // Fetch Quizzes for this unit
        const qQuery = query(collection(db, 'quizzes'), where('unitId', '==', unitId));
        const qSnap = await getDocs(qQuery);
        const fetchedQuizzes = [];
        qSnap.forEach(doc => {
          fetchedQuizzes.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by order or just visually
        fetchedQuizzes.sort((a, b) => (a.order || 0) - (b.order || 0));
        setQuizzes(fetchedQuizzes);
        
      } catch (err) {
        console.error("Error fetching AI tagging data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [unitId]);

  const handleRunAIProcess = async () => {
    if (!unitData?.transmissions || unitData.transmissions.length === 0) {
        alert("이 단원에 등록된 트랜스미션 영상이 없습니다. 관리자 콘텐츠 에디터에서 영상을 먼저 등록해 주세요.");
        return;
    }
    
    if (quizzes.length === 0) {
        alert("진행할 퀴즈가 없습니다.");
        return;
    }

    if (!confirm(`이 단원의 총 ${quizzes.length}개 퀴즈에 대해 AI 분석을 실행하시겠습니까?\n(API 무료 요금제를 고려하여 각 문제마다 약간의 지연 시간이 포함됩니다)`)) {
        return;
    }
    
    setIsTagsGenerating(true);
    setProposedTags({});
    
    // 텍스트 블록 인덱싱 및 상대적 길이 계산 (가이드)
    const textBlocks = (unitData.learningContents?.text || '').split('\n').filter(l => l.trim() !== '');
    const indexedText = textBlocks.map((line, idx) => `[텍스트 블록 ${idx + 1}/${textBlocks.length}]: ${line}`).join('\n');

    const contextData = `
        [영상 트랜스미션 메타데이터 목록]
        (주의: 영상의 전체 길이를 바탕으로, 텍스트 블록의 상대적 진행도(%)를 계산하여 타임스탬프를 수학적으로 비례 추정하세요)
        ${unitData.transmissions.map((tx, idx) => `
        - 트랜스미션 ID: ${tx.id}
        - 제목: ${tx.title}
        - 구간(초): ${tx.start}초 ~ ${tx.end || '끝(대략 600초로 가정)'}초
        `).join('\n')}
        
        [단원 텍스트 요약 (총 ${textBlocks.length}개 블록 중 위치 파악용)]
        ${indexedText}
    `.trim();

    const newTags = {};
    
    for (let i = 0; i < quizzes.length; i++) {
        const quiz = quizzes[i];
        setProgress({ current: i + 1, total: quizzes.length });
        try {
            console.log(`Analyzing Quiz ${i + 1}/${quizzes.length}: ${quiz.question}`);
            
            // 퀴즈 문제 + 선택지를 포함한 풍부한 컨텍스트 구성
            const quizFullText = [
                quiz.question,
                ...(quiz.options || []).map((opt, oi) => `  보기${oi + 1}: ${opt}`),
                quiz.answer ? `  정답: ${quiz.answer}` : ''
            ].filter(Boolean).join('\n');
            
            const result = await autoTagQuizToVideo(quizFullText, contextData);
            
            if (result) {
                const txIdMatch = result.transmissionId || (unitData.transmissions[0]?.id);
                newTags[quiz.id] = {
                    transmissionId: txIdMatch,
                    timestamp: result.timestamp || 0,
                    confidence: result.confidence || 0,
                    uncertain: result.uncertain || false,
                    reason: result.reason || 'AI Analysis Completed'
                };
                // 실시간으로 결과 반영 (진행 중 열람 가능)
                setProposedTags(prev => ({ ...prev, [quiz.id]: newTags[quiz.id] }));
            }
            
            // Rate limit: gemini-2.0-flash free tier = 15 RPM, so ~4s간격 + 여유 버퍼
            if (i < quizzes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 8000));
            }
            
        } catch (e) {
            console.error(`AI 분석 실패 (퀴즈 ID: ${quiz.id})`, e);
        }
    }
    
    setProposedTags(newTags);
    setIsTagsGenerating(false);
    setProgress({ current: 0, total: 0 });
    alert(`AI 분석 완료! ${Object.keys(newTags).length}/${quizzes.length}개 퀴즈 매핑 성공.`);
  };

  const handleApplyAll = async () => {
    if (Object.keys(proposedTags).length === 0) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(db);
        Object.keys(proposedTags).forEach(quizId => {
            const tag = proposedTags[quizId];
            const qRef = doc(db, 'quizzes', quizId);
            batch.update(qRef, {
                reference: {
                    transmissionId: tag.transmissionId,
                    timestamp: tag.timestamp,
                    confidence: tag.confidence
                }
            });
        });
        await batch.commit();
        
        // Update local quiz states
        setQuizzes(prev => prev.map(q => {
            if (proposedTags[q.id]) {
                return { ...q, reference: proposedTags[q.id] };
            }
            return q;
        }));
        
        setProposedTags({}); // Clear proposals
        alert("선택된 AI 매핑이 성공적으로 적용되었습니다.");
    } catch (e) {
        console.error("적용 실패", e);
        alert("데이터 저장 중 오류가 발생했습니다.");
    } finally {
        setIsSaving(false);
    }
  };

  const handlePreviewTag = (transmissionId, timestamp) => {
      const tx = unitData?.transmissions?.find(t => t.id === transmissionId);
      if (tx) {
          setPreviewTxId(tx.videoId);
          setPreviewTimestamp(timestamp);
      }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Loading Unit Data...</div>;
  if (!unitData) return <div style={{ padding: '2rem', color: 'red' }}>Unit not found.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', color: 'white' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate('/admin/content')} className="text-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <ArrowLeft size={16} /> 목록으로 돌아가기
          </button>
          <h1><Bot size={28} style={{ color: '#ec4899', marginRight: '0.5rem', verticalAlign: 'middle' }}/> AI Auto-Tagging Editor</h1>
          <p style={{ color: 'var(--crystal-cyan)', fontWeight: 'bold' }}>{unitData.title}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
                onClick={handleRunAIProcess} 
                disabled={isTagsGenerating || isSaving}
                style={{
                    padding: '0.8rem 1.5rem',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (isTagsGenerating || isSaving) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                {isTagsGenerating ? `⏳ 분석 중 (${progress.current}/${progress.total})...` : 'AI 자동 매핑 실행'}
            </button>

            {Object.keys(proposedTags).length > 0 && (
                <button 
                    onClick={handleApplyAll} 
                    disabled={isSaving}
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'linear-gradient(135deg, var(--planet-green), #22c55e)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <CheckCircle size={18} /> 전체 매핑 확정 저장
                </button>
            )}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Mapping List Panel */}
        <section className="glass-card" style={{ padding: '2rem', background: 'rgba(5,10,25,0.8)' }}>
            <h3 style={{ color: 'var(--crystal-cyan)', marginBottom: '1.5rem' }}>퀴즈 목록 ({quizzes.length}문항)</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {quizzes.map((quiz, idx) => {
                    const existingRef = quiz.reference;
                    const proposedRef = proposedTags[quiz.id];
                    const activeRef = proposedRef || existingRef;

                    return (
                        <div key={quiz.id} style={{ 
                            background: proposedRef ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.05)', 
                            border: `1px solid ${proposedRef ? '#ec4899' : existingRef ? 'var(--planet-green)' : 'rgba(255,255,255,0.1)'}`,
                            padding: '1rem', 
                            borderRadius: '8px' 
                        }}>
                            <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                                Q{idx + 1}. {quiz.question}
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    {activeRef ? (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            <span style={{ color: proposedRef ? '#ec4899' : 'var(--planet-green)', fontWeight: 'bold' }}>
                                                {proposedRef ? '✨ AI 제안:' : '✅ 저장됨:'} 
                                            </span>
                                            <span style={{ marginLeft: '0.5rem', color: 'var(--crystal-cyan)', fontSize: '0.8rem' }}>
                                                [{activeRef.transmissionId}]
                                            </span>
                                            <span style={{ marginLeft: '0.5rem' }}>
                                                시작: {activeRef.timestamp}초 (신뢰도: {activeRef.confidence?.toFixed(0) || 100}%)
                                            </span>
                                            {activeRef.uncertain && (
                                                <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.5rem', background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                                    ⚠️ 검토 필요
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>매핑 정보 없음</div>
                                    )}
                                </div>
                                
                                {activeRef && (
                                    <button 
                                        onClick={() => handlePreviewTag(activeRef.transmissionId, activeRef.timestamp)}
                                        style={{ background: 'none', border: '1px solid #9ca3af', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                                    >
                                        <Play size={12} /> 미리보기
                                    </button>
                                )}
                            </div>
                            {proposedRef?.reason && (
                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>
                                    💡 AI 이유: {proposedRef.reason}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>

        {/* Video Preview Panel */}
        <section className="glass-card" style={{ padding: '2rem', height: 'fit-content', position: 'sticky', top: '2rem', background: 'rgba(5,10,25,0.8)' }}>
            <h3 style={{ color: 'var(--planet-green)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Play size={20} /> 미니 플레이어 검수
            </h3>
            
            {previewTxId ? (
                <div>
                   <div style={{ width: '100%', aspectRatio: '16/9', background: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                      <iframe 
                          key={`${previewTxId}_${previewTimestamp}`}
                          width="100%" 
                          height="100%" 
                          src={`https://www.youtube.com/embed/${previewTxId}?start=${previewTimestamp}&autoplay=1`} 
                          title="YouTube video player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen
                      ></iframe>
                   </div>
                   <div style={{ marginTop: '1rem', textAlign: 'center', color: '#ccc' }}>
                       현재 지점: <span style={{ color: 'var(--crystal-cyan)', fontWeight: 'bold' }}>{previewTimestamp}초</span> 부터 재생 중
                   </div>
                </div>
            ) : (
                <div style={{ width: '100%', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', color: '#666' }}>
                    좌측 목록에서 '미리보기'를 클릭하세요
                </div>
            )}
        </section>
      </div>
    </div>
  );
};

export default AITaggingEditor;
