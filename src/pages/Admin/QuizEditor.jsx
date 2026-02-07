import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizzes, useAdminMutations } from '../../hooks/useContent';
import { storage, db } from '../../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from '../../utils/storageUtils';
import { Plus, Trash2, Save, X, Image as ImageIcon, Check, Edit3 } from 'lucide-react';

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

  const handleEdit = (quiz) => setEditingQuiz(quiz);
  const handleAddNew = () => setEditingQuiz({
    unitId,
    question: '',
    options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }],
    score: 1,
    hint: '',
    imageUrl: ''
  });

  const handleSave = async (e) => {
    e.preventDefault();
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

  if (isLoading) return <div>Loading Quizzes...</div>;

  return (
    <div className="quiz-editor">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Quiz Editor [v1.1]</h1>
          <p>Unit ID: {unitId}</p>
        </div>
        {!editingQuiz && (
          <button className="primary-btn" onClick={handleAddNew}>
            <Plus size={18} /> <span>Add New Quiz</span>
          </button>
        )}
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
                onClick={() => setEditingQuiz({...editingQuiz, question: editingQuiz.question + '$\\frac{}{}$'})}
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
              {editingQuiz.imageUrl && <img src={editingQuiz.imageUrl} alt="Preview" className="img-preview" />}
              <input type="file" onChange={handleImageUpload} accept="image/*" />
              {uploading && <span>Uploading...</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Options (Check correct one)</label>
            <div className="options-list">
              {editingQuiz.options.map((opt, index) => (
                <div key={index} className="option-item">
                  <input 
                    type="radio" 
                    name="correct-opt" 
                    checked={opt.isCorrect} 
                    onChange={() => {
                      const newOpts = editingQuiz.options.map((o, i) => ({ ...o, isCorrect: i === index }));
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
                    $\frac{n}{d}$
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
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Score Points</label>
              <input 
                type="number" 
                value={editingQuiz.score} 
                onChange={e => setEditingQuiz({ ...editingQuiz, score: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group flex-2">
              <label>Hint (Optional)</label>
              <input 
                type="text" 
                value={editingQuiz.hint} 
                onChange={e => setEditingQuiz({ ...editingQuiz, hint: e.target.value })}
              />
            </div>
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
                  if (confirm('Delete this quiz?')) deleteQuiz.mutate(q.id);
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
