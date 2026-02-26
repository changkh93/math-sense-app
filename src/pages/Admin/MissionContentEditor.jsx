import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnits, useAdminMutations, useChapters, useRegions } from '../../hooks/useContent';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../utils/storageUtils';
import { Save, ArrowLeft, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { db } from '../../firebase';
import { getDoc, doc } from 'firebase/firestore';
import MissionMarkdownViewer from '../../components/Space/MissionMarkdownViewer';

const MissionContentEditor = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const { saveUnit } = useAdminMutations();
  
  // To get the specific unit data, we need all units in all chapters, 
  // or we can just fetch the specific unit if we had a useUnit hook. 
  // For now, let's use the hook structure available or just fetch it here.
  // Actually, useUnits requires chapterId. Wait, we don't have chapterId in URL.
  // Hook structure already covers this but doing it directly for ease:
  const [unitData, setUnitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [transmissions, setTransmissions] = useState([]);
  const [learningText, setLearningText] = useState('');
  
  const textAreaRef = useRef(null);
  const cursorPosRef = useRef(0); // Save cursor position before file dialog opens

  useEffect(() => {
    const fetchUnit = async () => {
      try {
        const docRef = doc(db, 'units', unitId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUnitData(data);
          if (data.transmissions) {
            setTransmissions(data.transmissions);
          } else if (data.videoConfig && data.videoConfig.videoId) {
            // Migrate old videoConfig to new structure
            setTransmissions([{
              id: `tx_${Date.now()}`,
              title: 'Main Transmission',
              videoId: data.videoConfig.videoId,
              start: data.videoConfig.start,
              end: data.videoConfig.end
            }]);
          }
          if (data.learningContents) setLearningText(data.learningContents.text || '');
        } else {
           console.error("Unit not found");
        }
      } catch (err) {
        console.error("Error fetching unit:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUnit();
  }, [unitId]);

  const handleSave = async () => {
    if (!unitData) return;

    // Validation
    for (const tx of transmissions) {
      const vidId = tx.videoId?.trim();
      if (vidId && !/^[a-zA-Z0-9_-]{11}$/.test(vidId)) {
        alert(`유효하지 않은 유튜브 Video ID 형식입니다. (${tx.title || 'Untitled'})`);
        return;
      }
      const st = Number(tx.start) || 0;
      const en = Number(tx.end) || 0;
      if (st > 0 && en > 0 && st >= en) {
        alert(`종료 시간은 시작 시간보다 커야 합니다. (${tx.title || 'Untitled'})`);
        return;
      }
    }

    setSaving(true);
    try {
      const processedTransmissions = transmissions.map(tx => ({
          id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title: tx.title || 'Untitled Transmission',
          videoId: tx.videoId?.trim() || '',
          start: Number(tx.start) || 0,
          end: Number(tx.end) || 0
      }));

      // Pre-compute content flags for instant routing (no flash)
      const contentFlags = {
        hasDataLog: !!(learningText?.trim()),
        hasTransmission: processedTransmissions.some(tx => tx.videoId),
      };

      await saveUnit.mutateAsync({
        ...unitData,
        videoConfig: { videoId: '', start: 0, end: 0 },
        transmissions: processedTransmissions,
        learningContents: {
            text: learningText
        },
        contentFlags
      });
      alert('미션 콘텐츠가 성공적으로 저장되었습니다.');
      navigate('/admin/content');
    } catch (e) {
      console.error("Save failed", e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `mission_images/${unitId}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      // Insert markdown image tag at saved cursor position
      const textarea = textAreaRef.current;
      const startPos = cursorPosRef.current || 0;
      const textBefore = learningText.substring(0, startPos);
      const textAfter = learningText.substring(startPos);
      const imageMarkdown = `\n![이미지 설명](${url})\n`;
      
      setLearningText(textBefore + imageMarkdown + textAfter);
      
      // Focus back to textarea after insertion
      if (textarea) {
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = startPos + imageMarkdown.length;
          textarea.focus();
        }, 0);
      }

    } catch (error) {
      console.error("Upload failed", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      // clear input
      e.target.value = '';
    }
  };

  if (loading) return <div className="loading">Loading Mission Content...</div>;
  if (!unitData) return <div className="error">Unit Not Found.</div>;

  return (
    <div className="mission-content-editor" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <button onClick={() => navigate('/admin/content')} className="text-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ArrowLeft size={16} /> 목록으로 돌아가기
          </button>
          <h1>Mission Editor</h1>
          <p style={{ color: 'var(--crystal-cyan)', fontWeight: 'bold' }}>{unitData?.title}</p>
        </div>
        <button className="primary-btn" onClick={handleSave} disabled={saving}>
          <Save size={18} /> <span>{saving ? '저장 중...' : '저장하기'}</span>
        </button>
      </header>

      <div className="editor-panels" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Transmission Feed (Multi-Video) Setting */}
        <section className="card glass" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--planet-green)' }}>
                    <Video size={20} /> 전송 피드 (Multi-Transmission)
                </h3>
                <button onClick={() => setTransmissions([...transmissions, { id: `tx_${Date.now()}`, title: '', videoId: '', start: 0, end: 0 }])} className="outline-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    + 트랜스미션 추가
                </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {transmissions.map((tx, index) => (
                    <div key={tx.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--crystal-cyan)' }}>Transmission #{index + 1}</h4>
                            <button onClick={() => setTransmissions(transmissions.filter(t => t.id !== tx.id))} style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>삭제</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>제목 (Title)</label>
                                <input 
                                    type="text" 
                                    value={tx.title} 
                                    onChange={e => {
                                        const newTx = [...transmissions];
                                        newTx[index].title = e.target.value;
                                        setTransmissions(newTx);
                                    }}
                                    placeholder="예: 개념 설명 1"
                                />
                            </div>
                            <div className="form-group">
                                <label>YouTube Video ID</label>
                                <input 
                                    type="text" 
                                    value={tx.videoId} 
                                    onChange={e => {
                                        const newTx = [...transmissions];
                                        newTx[index].videoId = e.target.value;
                                        setTransmissions(newTx);
                                    }}
                                    placeholder="예: dQw4w9WgXcQ"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group flex-1">
                                <label>시작 시간 (초)</label>
                                <input 
                                    type="number" 
                                    value={tx.start} 
                                    onChange={e => {
                                        const newTx = [...transmissions];
                                        newTx[index].start = e.target.value;
                                        setTransmissions(newTx);
                                    }}
                                />
                            </div>
                            <div className="form-group flex-1">
                                <label>종료 시간 (초) - 0이면 끝까지 재생</label>
                                <input 
                                    type="number" 
                                    value={tx.end} 
                                    onChange={e => {
                                        const newTx = [...transmissions];
                                        newTx[index].end = e.target.value;
                                        setTransmissions(newTx);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
                {transmissions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        등록된 영상이 없습니다. [+ 트랜스미션 추가] 버튼을 눌러 영상을 등록하세요.
                    </div>
                )}
            </div>
        </section>

        {/* Data Log (Text/Markdown) Setting */}
        <section className="card glass" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--crystal-cyan)' }}>
                    <FileText size={20} /> 데이터 로그 (Text & Images)
                </h3>
                <div className="toolbar" style={{ display: 'flex', gap: '0.5rem' }}>
                    <label className="icon-btn outline-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                        <ImageIcon size={16} /> 
                        <span>{uploading ? '업로드 중...' : '이미지 첨부'}</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            style={{ display: 'none' }} 
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>
            
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="editor-side">
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>내용 (Markdown 문법 지원, 수식은 $...$ 사용)</label>
                  <textarea 
                      ref={textAreaRef}
                      value={learningText} 
                      onChange={e => setLearningText(e.target.value)}
                      onSelect={e => { cursorPosRef.current = e.target.selectionStart; }}
                      onKeyUp={e => { cursorPosRef.current = e.target.selectionStart; }}
                      onClick={e => { cursorPosRef.current = e.target.selectionStart; }}
                      style={{ 
                          width: '100%', 
                          minHeight: '600px', 
                          fontFamily: 'monospace', 
                          lineHeight: '1.6', 
                          padding: '1rem',
                          background: 'rgba(5, 10, 25, 0.6)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                      }}
                      placeholder="# 제목\n\n개념 설명을 작성하세요.\n\n수식 예시: $a^2 + b^2 = c^2$"
                  />
                </div>
                <div className="preview-side">
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--planet-green)' }}>Live Preview (학생 화면 시뮬레이션)</label>
                  <div style={{ 
                      width: '100%', 
                      height: '600px', 
                      overflowY: 'auto',
                      padding: '2rem',
                      background: 'rgba(5, 10, 25, 0.9)', 
                      borderRadius: '8px',
                      border: '1px solid var(--neon-blue)'
                  }}>
                      <MissionMarkdownViewer text={learningText} />
                  </div>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
};

export default MissionContentEditor;
