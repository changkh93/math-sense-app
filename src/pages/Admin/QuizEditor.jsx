import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizzes, useAdminMutations } from '../../hooks/useContent';
import { storage, db } from '../../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '../../utils/storageUtils';
import { Plus, Trash2, Save, X, Image as ImageIcon, Check, Edit3, ArrowLeft } from 'lucide-react';
import { auditQuizOptionLengths } from '../../utils/quizOptionLengthAudit';

const QuizEditor = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  console.log(`[DEBUG] QuizEditor rendering for UnitId:`, unitId);
  const { data: quizzes, isLoading, error } = useQuizzes(unitId);
  
  if (error) {
    console.error(`[CRITICAL] QuizEditor query error:`, error);
  }
  
  console.log(`[DEBUG] QuizEditor state - isLoading: ${isLoading}, quizzes:`, quizzes);
  
  const { saveQuiz, deleteQuiz } = useAdminMutations();
  
  const [editingQuiz, setEditingQuiz] = useState(null); // null = list, {} = new, {id...} = edit
  const [uploading, setUploading] = useState(false);
  const optionLengthAudit = editingQuiz
    ? auditQuizOptionLengths(editingQuiz.options)
    : null;

  const handleEdit = (quiz) => setEditingQuiz(quiz);
  const handleAddNew = () => setEditingQuiz({
    unitId,
    question: '',
    options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
    score: 1,
    hint: '',
    explanation: '',
    imageUrl: ''
  });

  const handleSave = async (e) => {
    e.preventDefault();
    // Validate: at least one correct answer must be selected
    const correctCount = editingQuiz.options.filter(o => o.isCorrect).length;
    if (correctCount === 0) {
      alert('정답을 최소 1개 이상 선택해주세요.');
      return;
    }
    if (optionLengthAudit?.suspicious) {
      const shouldContinue = confirm(
        `정답이 유일하게 가장 깁니다 (${optionLengthAudit.correctLength}자, 오답 최대 ${optionLengthAudit.longestIncorrectLength}자).\n` +
        '학생이 길이만 보고 정답을 추측할 수 있습니다. 그래도 저장하시겠습니까?'
      );
      if (!shouldContinue) return;
    }
    saveQuiz.mutate(editingQuiz, {
      onSuccess: () => setEditingQuiz(null)
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // Compress image before upload
      const compressedBlob = await compressImage(file);
      
      const storageRef = ref(storage, `quiz_images/${unitId}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      // If there was an old image uploaded in this editing session, delete it
      if (editingQuiz.imageUrl && editingQuiz.imageUrl.includes('firebasestorage')) {
        try {
          const oldRef = ref(storage, editingQuiz.imageUrl);
          await deleteObject(oldRef);
        } catch (e) {
          console.warn("Could not delete previous image session file", e);
        }
      }

      setEditingQuiz(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
      console.error("Upload failed", error);
      alert("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!editingQuiz.imageUrl) return;
    if (editingQuiz.imageUrl.includes('firebasestorage')) {
      try {
        const oldRef = ref(storage, editingQuiz.imageUrl);
        await deleteObject(oldRef);
      } catch (e) {
        console.warn("Could not delete image from storage", e);
      }
    }
    setEditingQuiz(prev => ({ ...prev, imageUrl: '' }));
  };

  if (isLoading) return <div>Loading Quizzes...</div>;

  return (
    <div className="quiz-editor">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/admin/content')} className="text-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> 목록으로 돌아가기
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Quiz Editor [v1.1]</h1>
            <p style={{ color: 'var(--crystal-cyan)', fontWeight: 'bold' }}>Unit ID: {unitId}</p>
          </div>
          {!editingQuiz && (
            <button className="primary-btn" onClick={handleAddNew}>
              <Plus size={18} /> <span>Add New Quiz</span>
            </button>
          )}
        </div>
      </div>

      {editingQuiz ? (
        <form className="quiz-form card glass" onSubmit={handleSave}>
          <div className="form-header">
            <h3>{editingQuiz.id ? 'Edit Quiz' : 'New Quiz'}</h3>
            <button type="button" className="icon-btn" onClick={() => setEditingQuiz(null)}><X size={20} /></button>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Question (LaTeX supported)</span>
              <button 
                type="button" 
                className="text-btn" 
                style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                onClick={() => setEditingQuiz({...editingQuiz, question: editingQuiz.question + '$\\\\frac{}{}$'})}
              >
                + 분수 틀($\frac{}{}$) 넣기
              </button>
            </label>
            <textarea 
              value={editingQuiz.question} 
              onChange={e => setEditingQuiz({...editingQuiz, question: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Image (Optional)</label>
            <div className="image-upload-area">
              {editingQuiz.imageUrl && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={editingQuiz.imageUrl} alt="Preview" className="img-preview" />
                  <button
                    type="button"
                    onClick={handleImageDelete}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      background: 'rgba(220,38,38,0.85)', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: 24, height: 24, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', lineHeight: 1
                    }}
                    title="이미지 삭제"
                  >×</button>
                </div>
              )}
              <input type="file" onChange={handleImageUpload} accept="image/*" />
              {uploading && <span>Uploading...</span>}
              {editingQuiz.imageUrl && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  새 파일 선택 시 기존 이미지가 교체됩니다
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>정제소 변형문항 / Refinery Prompt</label>
            <textarea
              value={editingQuiz.refineryPrompt || ''}
              onChange={e => setEditingQuiz({ ...editingQuiz, refineryPrompt: e.target.value })}
              placeholder="정제소에서 사용할 변형 조건 문장을 입력하세요. 비워두면 코드/원문 기준으로 출제됩니다."
              style={{
                width: '100%',
                minHeight: '120px',
                fontFamily: 'monospace',
                lineHeight: '1.6',
                padding: '1rem',
                background: 'rgba(5, 10, 25, 0.6)',
                color: '#fff',
                border: '1px solid rgba(251,191,36,0.25)',
                borderRadius: '8px'
              }}
            />
          </div>

          <div className="form-group">
            <label>정제소 참고 이미지 URL</label>
            <input
              type="text"
              value={editingQuiz.refineryImageUrl || ''}
              onChange={e => setEditingQuiz({ ...editingQuiz, refineryImageUrl: e.target.value })}
              placeholder="비워두면 원본 이미지를 사용합니다."
            />
          </div>

          <div className="form-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label>Concept ID</label>
              <input
                type="text"
                value={editingQuiz.conceptId || ''}
                onChange={e => setEditingQuiz({ ...editingQuiz, conceptId: e.target.value })}
                placeholder="예: prism_edge_count"
              />
            </div>
            <div>
              <label>Variant Group ID</label>
              <input
                type="text"
                value={editingQuiz.variantGroupId || ''}
                onChange={e => setEditingQuiz({ ...editingQuiz, variantGroupId: e.target.value })}
                placeholder="예: april_eval_solid_01"
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Options (Check correct answers - 복수 선택 가능)</span>
              <span style={{ 
                fontSize: '0.8rem', 
                color: editingQuiz.options.filter(o => o.isCorrect).length > 1 ? 'var(--star-gold)' : 'var(--planet-green)',
                fontWeight: 'bold'
              }}>
                ✓ 정답 {editingQuiz.options.filter(o => o.isCorrect).length}개 선택됨
              </span>
            </label>
            <div className="options-list">
              {editingQuiz.options.map((opt, index) => (
                <div key={index} className="option-item">
                  <input 
                    type="checkbox" 
                    checked={opt.isCorrect} 
                    onChange={() => {
                      const newOpts = [...editingQuiz.options];
                      newOpts[index] = { ...newOpts[index], isCorrect: !newOpts[index].isCorrect };
                      setEditingQuiz({ ...editingQuiz, options: newOpts });
                    }} 
                  />
                  <input 
                    type="text" 
                    value={opt.text} 
                    placeholder={`Option ${index + 1}`}
                    onChange={e => {
                      const newOpts = [...editingQuiz.options];
                      newOpts[index].text = e.target.value;
                      setEditingQuiz({ ...editingQuiz, options: newOpts });
                    }}
                    required
                  />
                  <button 
                    type="button" 
                    className="icon-btn" 
                    title="분수 넣기"
                    onClick={() => {
                      const newOpts = [...editingQuiz.options];
                      newOpts[index].text = newOpts[index].text + '$\\frac{}{}$';
                      setEditingQuiz({ ...editingQuiz, options: newOpts });
                    }}
                  >
                    {'$\\frac{n}{d}$'}
                  </button>
                  {editingQuiz.options.length > 2 && (
                    <button type="button" className="icon-btn delete-btn" onClick={() => {
                      const newOpts = editingQuiz.options.filter((_, i) => i !== index);
                      setEditingQuiz({ ...editingQuiz, options: newOpts });
                    }}><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              {editingQuiz.options.length < 5 && (
                <button type="button" className="text-btn" onClick={() => {
                  setEditingQuiz({ ...editingQuiz, options: [...editingQuiz.options, { text: '', isCorrect: false }] });
                }}>+ Add Option</button>
              )}
            </div>
            {optionLengthAudit?.suspicious && (
              <div
                role="alert"
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem 0.9rem',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                  borderRadius: '8px',
                  background: 'rgba(251, 191, 36, 0.08)',
                  color: '#fbbf24',
                  fontSize: '0.9rem',
                  lineHeight: 1.5
                }}
              >
                선택지 길이 단서 경고: 정답 {optionLengthAudit.correctLength}자 / 오답 최대 {optionLengthAudit.longestIncorrectLength}자입니다.
                정답을 간결하게 줄이거나 오답도 같은 수준의 구체성으로 작성하세요.
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Score Points</label>
            <input 
              type="number" 
              value={editingQuiz.score} 
              onChange={e => setEditingQuiz({ ...editingQuiz, score: parseInt(e.target.value) })}
              style={{ width: '150px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--crystal-cyan)', fontWeight: 'bold' }}>AI 설명 / Hint (Markdown Supported, Optional)</label>
            <textarea 
              value={editingQuiz.hint} 
              onChange={e => setEditingQuiz({ ...editingQuiz, hint: e.target.value })}
              placeholder="# 제목\n\n중학생이 통찰력을 가질 수 있도록 돕는 단계별 유도 질문형 가이드를 마크다운으로 작성하세요.\n\n수식 예시: $x^2$"
              style={{
                width: '100%',
                minHeight: '200px',
                fontFamily: 'monospace',
                lineHeight: '1.6',
                padding: '1rem',
                background: 'rgba(5, 10, 25, 0.6)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
          </div>

          <div className="form-group">
            <label style={{ color: 'var(--planet-green)', fontWeight: 'bold' }}>상세 해설 / Explanation (Markdown Supported, Optional)</label>
            <textarea 
              value={editingQuiz.explanation || ''} 
              onChange={e => setEditingQuiz({ ...editingQuiz, explanation: e.target.value })}
              placeholder="# 문제 해설\n\n학생이 문제를 완전히 이해할 수 있도록 깊이 있는 해설, 풀이 과정, 핵심 개념을 상세하게 작성하세요.\n\n수식 예시: $x^2 + y^2 = z^2$"
              style={{
                width: '100%',
                minHeight: '200px',
                fontFamily: 'monospace',
                lineHeight: '1.6',
                padding: '1rem',
                background: 'rgba(5, 10, 25, 0.6)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-btn" disabled={saveQuiz.isLoading}>
              <Save size={18} /> <span>{saveQuiz.isLoading ? 'Saving...' : 'Save Quiz'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="quiz-list">
          {quizzes?.length === 0 ? <p>No quizzes yet.</p> : 
           quizzes?.map(q => (
            <div key={q.id} className="quiz-item card glass">
              <div className="quiz-info">
                <span className="quiz-id">#{q.id}</span>
                <p className="quiz-text">{q.question}</p>
                <div className="quiz-meta">
                  <span>{q.options.length} options</span> • <span>Score: {q.score}</span>
                </div>
              </div>
              <div className="node-actions">
                <button className="icon-btn edit-btn" onClick={() => handleEdit(q)}><Edit3 size={18} /></button>
                <button className="icon-btn delete-btn" onClick={() => {
                  if (confirm('Delete this quiz?')) deleteQuiz.mutate({ quizId: q.id, unitId });
                }}><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizEditor;
