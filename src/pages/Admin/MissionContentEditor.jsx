import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminMutations } from '../../hooks/useContent';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../utils/storageUtils';
import { Save, ArrowLeft, Image as ImageIcon, Video, FileText, Sparkles, Copy, X, Rocket } from 'lucide-react';
import { db } from '../../firebase';
import { getDoc, doc } from 'firebase/firestore';
import MissionMarkdownViewer from '../../components/Space/MissionMarkdownViewer';
import WorkbookVisualEditor from './WorkbookVisualEditor';
import { validateWorkbookPagesForPublish } from '../../utils/workbookDraftUtils';

const normalizeWorkbookPagesForEditor = (pages) => Array.isArray(pages)
  ? pages.map(page => ({ ...page, elements: Array.isArray(page?.elements) ? page.elements : [] }))
  : [];

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

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
  const [publishing, setPublishing] = useState(false);
  const [refreshingDraft, setRefreshingDraft] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [transmissions, setTransmissions] = useState([]);
  const [learningText, setLearningText] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [workbookPages, setWorkbookPages] = useState([]);
  const [publishedWorkbookPages, setPublishedWorkbookPages] = useState([]);
  const [activeTab, setActiveTab] = useState('workbook');
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
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
          if (data.learningContents) {
            setLearningText(data.learningContents.text || '');
            setPdfUrl(data.learningContents.pdfUrl || '');
          }
          const publishedPages = normalizeWorkbookPagesForEditor(data.workbookPages);
          const draftPages = Array.isArray(data.workbookDraftPages)
            ? normalizeWorkbookPagesForEditor(data.workbookDraftPages)
            : publishedPages;
          setPublishedWorkbookPages(publishedPages);
          setWorkbookPages(draftPages);
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

  const validateTransmissions = () => {
    for (const tx of transmissions) {
      const vidId = tx.videoId?.trim();
      if (vidId && !/^[a-zA-Z0-9_-]{11}$/.test(vidId)) {
        alert(`유효하지 않은 유튜브 Video ID 형식입니다. (${tx.title || 'Untitled'})`);
        return false;
      }
      const st = Number(tx.start) || 0;
      const en = Number(tx.end) || 0;
      if (st > 0 && en > 0 && st >= en) {
        alert(`종료 시간은 시작 시간보다 커야 합니다. (${tx.title || 'Untitled'})`);
        return false;
      }
    }
    return true;
  };

  const buildMissionPayload = ({ publishWorkbook = false } = {}) => {
    const processedTransmissions = transmissions.map(tx => ({
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: tx.title || 'Untitled Transmission',
      videoId: tx.videoId?.trim() || '',
      start: Number(tx.start) || 0,
      end: Number(tx.end) || 0
    }));
    const nextPublishedPages = publishWorkbook ? workbookPages : publishedWorkbookPages;
    const contentFlags = {
      ...(unitData.contentFlags || {}),
      hasDataLog: !!(learningText?.trim() || pdfUrl?.trim()),
      hasTransmission: processedTransmissions.some(tx => tx.videoId),
      hasWorkbook: nextPublishedPages.length > 0
    };

    return {
      ...unitData,
      videoConfig: { videoId: '', start: 0, end: 0 },
      transmissions: processedTransmissions,
      learningContents: {
        text: learningText,
        pdfUrl: pdfUrl?.trim() || ''
      },
      workbookDraftPages: workbookPages,
      workbookPages: nextPublishedPages,
      workbookDraftUpdatedAt: new Date().toISOString(),
      ...(publishWorkbook ? {
        workbookPublication: {
          status: 'published',
          publishedAt: new Date().toISOString(),
          pageCount: workbookPages.length,
          schemaVersion: 2
        }
      } : {}),
      contentFlags
    };
  };

  const ensureNoRemoteDraftConflict = async () => {
    try {
      const latestSnap = await getDoc(doc(db, 'units', unitId));
      if (!latestSnap.exists()) return true;
      const remoteUpdatedAt = toMillis(latestSnap.data().workbookDraftUpdatedAt);
      const loadedUpdatedAt = toMillis(unitData?.workbookDraftUpdatedAt);
      if (remoteUpdatedAt > loadedUpdatedAt + 1000) {
        alert('Codex 또는 다른 운영자가 이 워크북 초안을 갱신했습니다. “Codex 반영 새로고침”으로 최신 초안을 불러온 뒤 다시 저장해주세요. 현재 화면의 내용은 저장하지 않았습니다.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Workbook draft conflict check failed', error);
      alert('최신 초안 버전을 확인하지 못해 저장을 중단했습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.');
      return false;
    }
  };

  const handleSave = async () => {
    if (!unitData || !validateTransmissions()) return;
    if (!(await ensureNoRemoteDraftConflict())) return;

    setSaving(true);
    try {
      const payload = buildMissionPayload();
      await saveUnit.mutateAsync(payload);
      setUnitData(payload);
      alert('변경사항을 초안으로 저장했습니다. 공개 중인 워크북은 변경되지 않습니다.');
    } catch (e) {
      console.error("Save failed", e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishWorkbook = async () => {
    if (!unitData || !validateTransmissions()) return;
    if (!(await ensureNoRemoteDraftConflict())) return;
    const issues = validateWorkbookPagesForPublish(workbookPages);
    if (issues.length > 0) {
      alert(`퍼블리시 전에 다음 항목을 수정해주세요.\n\n${issues.slice(0, 12).map(issue => `• ${issue}`).join('\n')}${issues.length > 12 ? `\n• 외 ${issues.length - 12}건` : ''}`);
      return;
    }
    if (!window.confirm(`검토 중인 ${workbookPages.length}개 페이지를 학생용 워크북으로 최종 퍼블리시하시겠습니까?`)) return;

    setPublishing(true);
    try {
      const payload = buildMissionPayload({ publishWorkbook: true });
      await saveUnit.mutateAsync(payload);
      setPublishedWorkbookPages(workbookPages);
      setUnitData(payload);
      alert('스마트 워크북을 최종 퍼블리시했습니다. 학생 화면에는 이제 이 버전이 표시됩니다.');
    } catch (error) {
      console.error('Workbook publish failed', error);
      alert('퍼블리시 중 오류가 발생했습니다. 공개 중인 기존 버전은 유지됩니다.');
    } finally {
      setPublishing(false);
    }
  };

  const handleRefreshWorkbookDraft = async () => {
    if (!window.confirm('Firestore의 최신 초안을 불러오면 현재 화면에서 아직 저장하지 않은 수정사항은 사라집니다. 계속하시겠습니까?')) return;
    setRefreshingDraft(true);
    try {
      const snap = await getDoc(doc(db, 'units', unitId));
      if (!snap.exists()) throw new Error('Unit not found');
      const data = snap.data();
      const nextDraft = Array.isArray(data.workbookDraftPages)
        ? normalizeWorkbookPagesForEditor(data.workbookDraftPages)
        : normalizeWorkbookPagesForEditor(data.workbookPages);
      setWorkbookPages(nextDraft);
      setPublishedWorkbookPages(normalizeWorkbookPagesForEditor(data.workbookPages));
      setUnitData(data);
      alert('Firestore의 최신 워크북 초안을 불러왔습니다.');
    } catch (error) {
      console.error('Workbook draft refresh failed', error);
      alert('워크북 초안을 새로고침하지 못했습니다.');
    } finally {
      setRefreshingDraft(false);
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

  const aiPromptTemplate = `당신은 초등 수학 교육 전문가이자 매력적인 학습 콘텐츠 에디터입니다. 
첨부된 이미지는 '수학감각' 교재의 내용입니다. 이 이미지를 바탕으로 학생들이 흥미를 느낄 수 있는 '탐사 대원용 데이터 로그' 형식의 마크다운 문서를 작성해 주세요.

### 작성 지침:
1. **톤앤매너:** 우주 탐사선에서 정보를 전달하는 듯한 전문적이면서도 친절한 말투를 사용하세요. (예: "탐사 대원 여러분", "우주 항로를 표기하듯")
2. **구조:** 아래의 형식을 반드시 따르세요.
    - 주제에 대한 짧은 도입
    - 번호가 매겨진 주요 개념 설명 (### 1, ### 2 등)
    - 표(Table)를 활용한 정리 (필요시)
    - 인용구(>)를 활용한 핵심 포인트 강조
    - 💡 오늘의 요약
3. **이미지 삽입:** 
    - 교재 이미지에서 설명하는 시각적 요소(도형, 수직선, 그림 등)가 들어가야 할 위치를 파악하세요.
    - 해당 위치에 \`> ![이미지 설명](여기에_Firebase_이미지_URL_넣기)\` 형식으로 표시해 주세요.
    - 이미지 설명에는 어떤 그림이 들어가면 좋을지 구체적으로 적어주세요.
4. **수식 표현:** 수학 기호나 식은 반드시 $...$ (인라인) 또는 $$...$$ (블록)를 사용하여 LaTeX 문법으로 작성하세요.
    - 수식 안에 한글이나 영문 텍스트(예: "또는", "일 때", "또는", "or")가 들어갈 때는 반드시 \\text{...}로 감싸세요. (예: $$\\boxed{x=1\\text{ 또는 }x=7}$$)
    - 수식 안에 \\text{} 없이 한글이나 일반 단어를 그대로 적지 마세요.

### 생성할 문서의 형식 예시:
---
두 대상의 크기를 비교하는 가장 기초적인 도구인 **'비'**에 대해 알아봅니다.
---
### 1. 비(比)의 의미: "가까이 마주하다"
'비'라는 글자는 **"대(對)하다"**, 즉 **"가까이 마주 보다"**라는 뜻에서 유래했습니다. 서로 다른 두 대상을 나란히 두고 그 크기를 비교하는 것이 탐사의 시작입니다.

* **수학적 정의:** 서로 다른 두 대상 사이의 크기(양)를 비교하여 그들 사이의 관계를 표현한 것.
* **어원:** 영어로 **Ratio(레이시오)**라고 하며, 이는 '헤아리다(Count)'라는 뜻을 품고 있습니다.

> ![탐사 가이드: 막대기와 지팡이 비교](여기에_Firebase_이미지_URL_넣기)
> *예시: 지팡이가 막대기보다 2배 더 길 때, 우리는 이 관계를 수학적으로 탐사합니다.*
---
### 2. 비를 쓰고 읽는 법
우주 항로를 표기하듯, 비를 나타내는 표현에도 약속된 규칙이 있습니다.

| 표현 형식 | 읽는 방법 (국문) | 읽는 방법 (Global) |
| :--- | :--- | :--- |
| $a : b$ | **$a$ 대 $b$** | **$a$ is to $b$** / **$a$ to $b$** |

* **핵심 포인트:** $a : b$는 "$a$가 $b$에 가서 마주하고 있는 상태"를 의미합니다.
---
### 3. 수학적 표현의 두 가지 형태
비는 상황에 따라 **콜론(:)**을 사용하거나 **분수**의 형태로 나타낼 수 있습니다.

1.  **기호 사용:** $1 : 2$
2.  **분수 사용:** $\\frac{1}{2}$

⚠️ **주의 (Pilot's Note):** 분수 형태($\\frac{1}{2}$)로 쓰더라도, 이는 '전체 중의 부분'이 아니라 **'동등한 관계'**를 나타내는 것입니다. 따라서 **'2분의 1'**이라고 읽기보다는 **'1 대 2'**라고 읽는 것이 수학적 탐사 목적에 더 정확합니다.

> ![비의 표현법 정리](여기에_두번째_이미지_URL_넣기)
---
### 💡 오늘의 요약
* 비는 두 양을 **마주 대어** 비교하는 것이다.
* $a : b$는 **$a$ 대 $b$**라고 읽는다.
* 분수 형태로 써도 **$a$ 대 $b$**로 읽는 습관을 들이자!
---`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPromptTemplate);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="secondary-btn" onClick={handleSave} disabled={saving || publishing}>
            <Save size={18} /> <span>{saving ? '저장 중...' : '변경사항 저장'}</span>
          </button>
          {activeTab === 'workbook' && (
            <button className="primary-btn" onClick={handlePublishWorkbook} disabled={saving || publishing || workbookPages.length === 0} style={{ background: 'linear-gradient(135deg, #7c3aed, #00b8d9)' }}>
              <Rocket size={18} /> <span>{publishing ? '퍼블리시 중...' : '워크북 최종 퍼블리시'}</span>
            </button>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('workbook')} 
          style={{ padding: '0.8rem 1.5rem', background: activeTab === 'workbook' ? 'var(--neon-blue)' : 'transparent', color: 'white', border: '1px solid ' + (activeTab === 'workbook' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.2)'), borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'workbook' ? 'bold' : 'normal', transition: 'all 0.2s' }}
        >
          인터랙티브 워크북
        </button>
        <button 
          onClick={() => setActiveTab('datalog')} 
          style={{ padding: '0.8rem 1.5rem', background: activeTab === 'datalog' ? 'var(--neon-blue)' : 'transparent', color: 'white', border: '1px solid ' + (activeTab === 'datalog' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.2)'), borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'datalog' ? 'bold' : 'normal', transition: 'all 0.2s' }}
        >
          데이터 로그 (마크다운)
        </button>
        <button 
          onClick={() => setActiveTab('video')} 
          style={{ padding: '0.8rem 1.5rem', background: activeTab === 'video' ? 'var(--neon-blue)' : 'transparent', color: 'white', border: '1px solid ' + (activeTab === 'video' ? 'var(--neon-blue)' : 'rgba(255,255,255,0.2)'), borderRadius: '4px', cursor: 'pointer', fontWeight: activeTab === 'video' ? 'bold' : 'normal', transition: 'all 0.2s' }}
        >
          전송 피드 (Video)
        </button>
      </div>

      <div className="editor-panels" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Interactive Workbook Setting */}
        {activeTab === 'workbook' && (
          <WorkbookVisualEditor 
              workbookPages={workbookPages} 
              setWorkbookPages={setWorkbookPages} 
              unitId={unitId}
              unitTitle={unitData?.title}
              onRefreshDraft={handleRefreshWorkbookDraft}
              isRefreshingDraft={refreshingDraft}
              publishedPageCount={publishedWorkbookPages.length}
          />
        )}

        {/* Transmission Feed (Multi-Video) Setting */}
        {activeTab === 'video' && (
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
        )}

        {/* Data Log (Text/Markdown) Setting */}
        {activeTab === 'datalog' && (
        <section className="card glass" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--crystal-cyan)' }}>
                    <FileText size={20} /> 데이터 로그 (Text & Images)
                </h3>
                <div className="toolbar" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
                    <label className="icon-btn outline-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifySelf: 'flex-end', gap: '0.5rem', padding: '0.5rem 1.2rem', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }}>
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
                    <button 
                        onClick={() => setIsAiPromptOpen(true)}
                        className="icon-btn outline-btn" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.2rem', borderColor: 'var(--planet-green)', color: 'var(--planet-green)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 'fit-content' }}
                    >
                        <Sparkles size={16} />
                        <span>AI 프롬프트</span>
                    </button>
                </div>
            </div>
            
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="editor-side">
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--neon-blue)' }}>PDF URL (Optional)</label>
                    <input 
                      type="text" 
                      value={pdfUrl} 
                      onChange={e => setPdfUrl(e.target.value)}
                      style={{ 
                          width: '100%', 
                          padding: '0.8rem',
                          background: 'rgba(5, 10, 25, 0.6)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px'
                      }}
                      placeholder="예: /pdfs/python/02_문자열.pdf (입력 시 텍스트 대신 PDF가 우선 표시됩니다)"
                    />
                  </div>
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
                          minHeight: '500px', 
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
        )}

      </div>

      {/* AI Prompt Modal */}
      {isAiPromptOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div className="card glass" style={{
            width: '100%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            position: 'relative',
            border: '1px solid var(--planet-green)'
          }}>
            <button 
              onClick={() => setIsAiPromptOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <X size={24} />
            </button>

            <h2 style={{ color: 'var(--planet-green)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={24} /> AI 프롬프트 복사하기
            </h2>
            
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              아래 프롬프트를 복사하여 Gemini에 교재 이미지와 함께 붙여넣으세요.
            </p>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.4)',
              padding: '1.5rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '1.5rem',
              color: '#d1d5db'
            }}>
              {aiPromptTemplate}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="secondary-btn" 
                onClick={() => setIsAiPromptOpen(false)}
              >
                닫기
              </button>
              <button 
                className="primary-btn" 
                onClick={handleCopyPrompt}
                style={{ background: copySuccess ? 'var(--planet-green)' : '' }}
              >
                {copySuccess ? (
                  <>체크됨! 복사 완료</>
                ) : (
                  <><Copy size={18} /> 프롬프트 복사</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionContentEditor;
