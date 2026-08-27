import React, { useMemo, useState, useRef } from 'react';
import { Trash2, Image as ImageIcon, Sparkles, Type, EyeOff, Settings, Copy, ClipboardPaste, RefreshCw } from 'lucide-react';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../utils/storageUtils';
import { parseInlineFormatting } from '../../utils/formatUtils';
import WorkbookChoiceContent from '../../components/Space/WorkbookChoiceContent';
import {
  buildWorkbookChapterDraftPrompt,
  buildWorkbookDraftPrompt,
  buildWorkbookUnitDraftPrompt,
  normalizeWorkbookAnalysisPayload,
  parseWorkbookAnalysisJson
} from '../../utils/workbookDraftUtils';
import {
  WORKBOOK_GRADABLE_TYPES,
  WORKBOOK_INTERACTION_TYPES,
  getDefaultInteractionConfig,
  normalizeInteractionConfig,
  recommendWorkbookInteraction,
} from '../../utils/workbookInteractionUtils';
import { isSupportedWorkbookImage, sortWorkbookImageFiles } from '../../utils/workbookUploadUtils';
import 'katex/dist/katex.min.css';

const INTERACTION_LABELS = {
  grouping: '드래그 나누기',
  'number-line': '수직선',
  matching: '연결하기',
  ordering: '순서 정렬',
  coloring: '색칠하기',
};

const InteractionConfigEditor = ({ element, onUpdate }) => {
  const [text, setText] = useState(() => JSON.stringify(element.config || getDefaultInteractionConfig(element.type), null, 2));
  const [error, setError] = useState('');
  const apply = () => {
    try {
      const config = normalizeInteractionConfig(element.type, JSON.parse(text));
      onUpdate({ config });
      setText(JSON.stringify(config, null, 2));
      setError('');
    } catch (configError) {
      setError(configError.message);
    }
  };
  return (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      <label style={{ color: 'var(--planet-purple)' }}>{INTERACTION_LABELS[element.type]} 구성 JSON</label>
      <textarea value={text} onChange={(event) => setText(event.target.value)} style={{ minHeight: '240px', resize: 'vertical', padding: '0.75rem', background: 'rgba(5,10,25,0.9)', color: '#e0f2fe', border: `1px solid ${error ? '#ff4d4d' : 'rgba(255,255,255,0.2)'}`, borderRadius: '6px', fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }} />
      {error && <span style={{ color: '#ff8080', fontSize: '0.8rem' }}>{error}</span>}
      <button type="button" className="outline-btn" onClick={apply}>구성 검증 후 적용</button>
      <small style={{ color: 'var(--text-muted)', lineHeight: 1.45 }}>표시 문구(label)는 자유롭게 수정하고, 정답에서는 각 항목의 id를 사용합니다. ChatGPT JSON과 같은 구조입니다.</small>
    </div>
  );
};

const WorkbookVisualEditor = ({
  workbookPages,
  setWorkbookPages,
  chapterId,
  unitId,
  unitTitle,
  onRefreshDraft,
  isRefreshingDraft = false,
  publishedPageCount = 0
}) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const [showPrompt, setShowPrompt] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [promptTarget, setPromptTarget] = useState(chapterId ? 'codex-chapter' : 'codex-unit');
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState('');
  
  // Drag state for creating new elements
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState(null);
  
  // Drag state for moving existing elements
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartMouse, setDragStartMouse] = useState(null);
  const [dragStartPos, setDragStartPos] = useState(null);

  const containerRef = useRef(null);

  const currentPage = workbookPages[currentPageIndex] || null;
  const pagePrompt = useMemo(() => buildWorkbookDraftPrompt({
    unitId,
    unitTitle,
    page: currentPage,
    pageIndex: currentPageIndex
  }), [unitId, unitTitle, currentPage, currentPageIndex]);
  const unitPrompt = useMemo(() => buildWorkbookUnitDraftPrompt({
    unitId,
    unitTitle,
    pages: workbookPages
  }), [unitId, unitTitle, workbookPages]);
  const chapterPrompt = useMemo(() => buildWorkbookChapterDraftPrompt({ chapterId }), [chapterId]);
  const currentPrompt = promptTarget === 'codex-chapter'
    ? chapterPrompt
    : (promptTarget === 'codex-unit' ? unitPrompt : pagePrompt);

  const handleImageUpload = async (e) => {
    const selectedFiles = sortWorkbookImageFiles(e.target.files);
    if (selectedFiles.length === 0) return;

    const unsupportedFiles = selectedFiles.filter(file => !isSupportedWorkbookImage(file));
    if (unsupportedFiles.length > 0) {
      alert(`JPG, PNG, WEBP 이미지만 등록할 수 있습니다.\n\n지원하지 않는 파일:\n${unsupportedFiles.map(file => `- ${file.name}`).join('\n')}`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress({ completed: 0, total: selectedFiles.length });
    try {
      const safeUnitId = String(unitId || 'workbook').replace(/[^a-zA-Z0-9_-]/g, '_');
      const batchId = Date.now();
      const uploadResults = await Promise.allSettled(selectedFiles.map(async (file, index) => {
        try {
          const compressedBlob = await compressImage(file);
          const safeBaseName = file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
            .slice(0, 80) || `page_${index + 1}`;
          const storageRef = ref(storage, `workbook_images/${safeUnitId}_${batchId}_${String(index + 1).padStart(3, '0')}_${safeBaseName}.jpg`);
          await uploadBytes(storageRef, compressedBlob, {
            contentType: 'image/jpeg',
            customMetadata: {
              source: 'smart-workbook-editor',
              unitId: String(unitId || ''),
              sourceFileName: file.name,
              batchOrder: String(index + 1)
            }
          });
          const url = await getDownloadURL(storageRef);
          return {
            id: `page_${batchId}_${index + 1}`,
            imageUrl: url,
            sourceFileName: file.name,
            elements: []
          };
        } finally {
          setUploadProgress(progress => ({ ...progress, completed: progress.completed + 1 }));
        }
      }));

      const uploadedPages = uploadResults
        .map((result, index) => ({ result, file: selectedFiles[index] }))
        .filter(({ result }) => result.status === 'fulfilled')
        .map(({ result }) => result.value);
      const failedUploads = uploadResults
        .map((result, index) => ({ result, file: selectedFiles[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (uploadedPages.length > 0) {
        const firstNewPageIndex = workbookPages.length;
        setWorkbookPages(previousPages => [...previousPages, ...uploadedPages]);
        setCurrentPageIndex(firstNewPageIndex);
        setSelectedElementId(null);
      }

      if (failedUploads.length > 0) {
        failedUploads.forEach(({ result, file }) => console.error(`Upload failed: ${file.name}`, result.reason));
        alert(`${uploadedPages.length}개 페이지를 파일명 순으로 등록했습니다.\n${failedUploads.length}개 파일은 업로드하지 못했습니다:\n${failedUploads.map(({ file }) => `- ${file.name}`).join('\n')}`);
      } else if (uploadedPages.length > 1) {
        alert(`${uploadedPages.length}개 페이지를 파일명 순으로 등록했습니다.\n검토 후 “변경사항 저장”을 눌러주세요.`);
      }
    } catch (error) {
      console.error("Upload failed", error);
      const message = error?.code === 'storage/unauthorized'
        ? '이미지 저장 권한을 확인할 수 없습니다. 다시 로그인한 뒤 재시도해주세요.'
        : `이미지 업로드에 실패했습니다.${error?.code ? ` (${error.code})` : ''}`;
      alert(message);
    } finally {
      setUploading(false);
      setUploadProgress({ completed: 0, total: 0 });
      e.target.value = '';
    }
  };

  const uploadLabel = uploading
    ? `업로드 중 ${uploadProgress.completed}/${uploadProgress.total}`
    : '+ 이미지 여러 장 추가';

  const handleCopyPrompt = async () => {
    if (!currentPrompt) return;
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (error) {
      console.error('Workbook prompt copy failed', error);
      alert('자동 복사에 실패했습니다. 아래 프롬프트 입력창을 클릭한 뒤 직접 복사해주세요.');
    }
  };

  const handleImportJson = () => {
    if (!currentPage) return;
    setImportError('');
    try {
      const parsed = parseWorkbookAnalysisJson(jsonInput);
      const normalized = normalizeWorkbookAnalysisPayload(parsed, {
        unitId,
        pageId: currentPage.id
      });
      const existingCount = Array.isArray(currentPage.elements) ? currentPage.elements.length : 0;
      if (existingCount > 0 && !window.confirm(`현재 페이지의 기존 요소 ${existingCount}개를 AI 결과 ${normalized.elements.length}개로 교체하시겠습니까?`)) {
        return;
      }

      const updatedPages = workbookPages.map((page, index) => index === currentPageIndex ? {
        ...page,
        elements: normalized.elements,
        learningDesign: normalized.learningDesign,
        draftStatus: 'ai_draft',
        analysis: normalized.analysis,
        analysisMeta: {
          source: 'manual-chat-prompt',
          schemaVersion: normalized.schemaVersion,
          generatedAt: new Date().toISOString(),
          elementCount: normalized.elements.length
        }
      } : page);
      setWorkbookPages(updatedPages);
      setSelectedElementId(null);
      setJsonInput('');
      setShowJsonImport(false);
      alert(`${normalized.elements.length}개 요소를 현재 페이지 초안에 적용했습니다. 검토 후 “변경사항 저장”을 눌러주세요.`);
    } catch (error) {
      setImportError(error.message);
    }
  };

  const getRelativePosition = (e) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { 
      leftPercent: (x / rect.width) * 100, 
      topPercent: (y / rect.height) * 100 
    };
  };

  const handleMouseDown = (e) => {
    if (!currentPage) return;
    
    const elTarget = e.target.closest('.wve-element');
    // If clicking on an element, don't start drawing, setup dragging instead
    if (elTarget) {
      const elId = elTarget.getAttribute('data-id');
      setSelectedElementId(elId);
      setIsDraggingElement(true);
      
      const el = currentPage.elements.find(e => e.id === elId);
      if (el) {
        setDragStartPos({ top: el.position.top, left: el.position.left });
        // Use clientX/Y directly for mouse delta tracking
        setDragStartMouse({ x: e.clientX, y: e.clientY });
      }
      return;
    }
    
    // Otherwise, start drawing new rect
    const pos = getRelativePosition(e);
    if (!pos) return;
    
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentRect({
      top: pos.topPercent,
      left: pos.leftPercent,
      width: 0,
      height: 0
    });
    setSelectedElementId(null);
  };

  const handleMouseMove = (e) => {
    if (!currentPage) return;

    if (isDraggingElement && selectedElementId && dragStartMouse && dragStartPos) {
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartMouse.x;
      const deltaY = e.clientY - dragStartMouse.y;
      
      const deltaPercentX = (deltaX / rect.width) * 100;
      const deltaPercentY = (deltaY / rect.height) * 100;

      updateSelectedElement({
        position: {
          ...currentPage.elements.find(el => el.id === selectedElementId).position,
          left: Math.max(0, Math.min(100 - selectedElement.position.width, dragStartPos.left + deltaPercentX)),
          top: Math.max(0, Math.min(100 - selectedElement.position.height, dragStartPos.top + deltaPercentY))
        }
      });
      return;
    }

    if (isDrawing) {
      const current = getRelativePosition(e);
      if (!current) return;

      const width = Math.abs(current.leftPercent - startPos.leftPercent);
      const height = Math.abs(current.topPercent - startPos.topPercent);
      const left = Math.min(startPos.leftPercent, current.leftPercent);
      const top = Math.min(startPos.topPercent, current.topPercent);

      setCurrentRect({ top, left, width, height });
    }
  };

  const handleMouseUp = () => {
    if (isDraggingElement) {
      setIsDraggingElement(false);
      setDragStartMouse(null);
      setDragStartPos(null);
      return;
    }

    if (!isDrawing || !currentPage || !currentRect) return;
    setIsDrawing(false);
    
    // Ignore too small boxes (clicks)
    if (currentRect.width < 1 || currentRect.height < 1) {
      setCurrentRect(null);
      return;
    }

    const newElement = {
      id: `el_${Date.now()}`,
      type: 'input', // default
      inputMode: 'integer',
      answer: '',
      position: { ...currentRect }
    };

    const updatedPages = [...workbookPages];
    updatedPages[currentPageIndex] = {
      ...currentPage,
      elements: [...currentPage.elements, newElement]
    };
    
    setWorkbookPages(updatedPages);
    setSelectedElementId(newElement.id);
    setCurrentRect(null);
  };

  const updateSelectedElement = (updates) => {
    if (!selectedElementId || !currentPage) return;
    
    const updatedElements = currentPage.elements.map(el => 
      el.id === selectedElementId ? { ...el, ...updates } : el
    );
    
    const updatedPages = [...workbookPages];
    updatedPages[currentPageIndex] = { ...currentPage, elements: updatedElements };
    setWorkbookPages(updatedPages);
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId || !currentPage) return;
    
    const updatedElements = currentPage.elements.filter(el => el.id !== selectedElementId);
    
    const updatedPages = [...workbookPages];
    updatedPages[currentPageIndex] = { ...currentPage, elements: updatedElements };
    setWorkbookPages(updatedPages);
    setSelectedElementId(null);
  };

  const selectedElement = currentPage?.elements.find(el => el.id === selectedElementId);

  return (
    <div className="card glass" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(167, 139, 250, 0.35)', color: '#ddd6fe', fontSize: '0.88rem', lineHeight: 1.55 }}>
        <strong>초안 편집 모드</strong> · 작업 중 {workbookPages.length}페이지 / 현재 공개본 {publishedPageCount}페이지<br/>
        이미지 등록, JSON 적용, Codex 자동 반영은 초안만 변경합니다. 학생 화면은 상단의 “워크북 최종 퍼블리시”를 누르기 전까지 그대로 유지됩니다.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--neon-blue)', whiteSpace: 'nowrap' }}>
          <ImageIcon size={20} /> 스마트 인터랙티브 워크북 (Smart Workbook)
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { setShowPrompt(value => !value); setShowJsonImport(false); }}
            disabled={!currentPage}
            className="icon-btn outline-btn" 
            style={{ borderColor: 'var(--crystal-cyan)', color: 'var(--crystal-cyan)', whiteSpace: 'nowrap', opacity: !currentPage ? 0.5 : 1, cursor: !currentPage ? 'not-allowed' : 'pointer' }}
          >
             <Sparkles size={16} /> 작업 프롬프트
          </button>
          <button
            onClick={() => { setShowJsonImport(value => !value); setShowPrompt(false); setImportError(''); }}
            disabled={!currentPage}
            className="icon-btn outline-btn"
            style={{ borderColor: 'var(--planet-purple)', color: 'var(--planet-purple)', whiteSpace: 'nowrap', opacity: !currentPage ? 0.5 : 1 }}
          >
            <ClipboardPaste size={16} /> AI 결과 JSON 붙여넣기
          </button>
          {onRefreshDraft && (
            <button
              onClick={onRefreshDraft}
              disabled={isRefreshingDraft}
              className="icon-btn outline-btn"
              title="Codex가 Firestore 초안에 반영한 뒤 눌러주세요."
              style={{ whiteSpace: 'nowrap', opacity: isRefreshingDraft ? 0.5 : 1 }}
            >
              <RefreshCw size={16} className={isRefreshingDraft ? 'spin' : ''} /> {isRefreshingDraft ? '새로고침 중...' : 'Codex 반영 새로고침'}
            </button>
          )}
          <label className="icon-btn outline-btn" style={{ whiteSpace: 'nowrap', opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploadLabel}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading}/>
          </label>
        </div>
      </div>

      {showPrompt && currentPage && (
        <div style={{ marginBottom: '1rem', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(0,243,255,0.35)', background: 'rgba(0, 20, 35, 0.75)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="outline-btn"
                  disabled={!chapterId}
                  onClick={() => { setPromptTarget('codex-chapter'); setPromptCopied(false); }}
                  style={{ padding: '0.45rem 0.7rem', borderColor: promptTarget === 'codex-chapter' ? 'var(--crystal-cyan)' : undefined, color: promptTarget === 'codex-chapter' ? 'var(--crystal-cyan)' : undefined, opacity: chapterId ? 1 : 0.45 }}
                  title={chapterId ? '이 챕터의 모든 단원을 일괄 처리합니다.' : '이 단원에 chapterId가 없습니다.'}
                >Codex · chapter 전체</button>
                <button
                  type="button"
                  className="outline-btn"
                  onClick={() => { setPromptTarget('codex-unit'); setPromptCopied(false); }}
                  style={{ padding: '0.45rem 0.7rem', borderColor: promptTarget === 'codex-unit' ? 'var(--crystal-cyan)' : undefined, color: promptTarget === 'codex-unit' ? 'var(--crystal-cyan)' : undefined }}
                >Codex · unit 전체</button>
                <button
                  type="button"
                  className="outline-btn"
                  onClick={() => { setPromptTarget('chatgpt-page'); setPromptCopied(false); }}
                  style={{ padding: '0.45rem 0.7rem', borderColor: promptTarget === 'chatgpt-page' ? 'var(--planet-purple)' : undefined, color: promptTarget === 'chatgpt-page' ? 'var(--planet-purple)' : undefined }}
                >ChatGPT · 현재 page</button>
              </div>
              <strong style={{ color: promptTarget.startsWith('codex-') ? 'var(--crystal-cyan)' : 'var(--planet-purple)' }}>
                {promptTarget === 'codex-chapter'
                  ? 'Codex 챕터 전체 작업 프롬프트'
                  : (promptTarget === 'codex-unit' ? 'Codex 단원 전체 작업 프롬프트' : 'ChatGPT 현재 페이지 작업 프롬프트')}
              </strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                {promptTarget === 'codex-chapter' ? <>챕터 ID <code>{chapterId}</code></> : <>문서 ID <code>{unitId}</code></>}
                {promptTarget === 'chatgpt-page' && <> · 페이지 ID <code>{currentPage.id}</code></>}<br/>
                {promptTarget === 'codex-chapter'
                  ? '챕터에 속한 모든 단원과 페이지를 한 번에 준비·분석·검증·초안 반영합니다. 먼저 각 단원에서 “변경사항 저장”을 눌러주세요.'
                  : promptTarget === 'codex-unit'
                  ? `등록된 ${workbookPages.length}페이지를 한 번에 분석·검증·초안 반영합니다. 먼저 상단의 “변경사항 저장”을 눌러주세요.`
                  : '현재 페이지만 분석하며, ChatGPT가 반환한 JSON은 “AI 결과 JSON 붙여넣기”로 적용합니다.'}
              </div>
            </div>
            <button className="primary-btn" onClick={handleCopyPrompt} style={{ padding: '0.65rem 1rem', background: promptCopied ? 'var(--planet-green)' : undefined }}>
              <Copy size={16} /> {promptCopied ? '복사 완료' : '프롬프트 복사'}
            </button>
          </div>
          <textarea
            readOnly
            value={currentPrompt}
            onFocus={(event) => event.target.select()}
            style={{ width: '100%', minHeight: '220px', resize: 'vertical', padding: '1rem', boxSizing: 'border-box', background: 'rgba(0,0,0,0.45)', color: '#dbeafe', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.78rem', lineHeight: 1.55 }}
          />
        </div>
      )}

      {showJsonImport && currentPage && (
        <div style={{ marginBottom: '1rem', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(157,0,255,0.4)', background: 'rgba(26, 10, 45, 0.72)' }}>
          <strong style={{ color: 'var(--planet-purple)' }}>ChatGPT/Codex 결과 JSON 적용</strong>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.55, margin: '0.5rem 0 0.8rem' }}>
            JSON 코드블록 전체를 그대로 붙여넣어도 됩니다. 문서 ID와 페이지 ID, 좌표, 정답, 마스크 연결을 검증한 뒤 현재 페이지의 초안 요소를 교체합니다. 공개본에는 반영되지 않습니다.
          </p>
          <textarea
            value={jsonInput}
            onChange={(event) => setJsonInput(event.target.value)}
            placeholder={'```json\n{ "schemaVersion": 2, "unitId": "...", "pageId": "...", "elements": [...] }\n```'}
            style={{ width: '100%', minHeight: '220px', resize: 'vertical', padding: '1rem', boxSizing: 'border-box', background: 'rgba(0,0,0,0.45)', color: '#f5f3ff', border: `1px solid ${importError ? '#ff4d4d' : 'rgba(255,255,255,0.15)'}`, borderRadius: '8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.82rem', lineHeight: 1.5 }}
          />
          {importError && <div style={{ color: '#ff8080', marginTop: '0.65rem', fontSize: '0.85rem' }}>{importError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.8rem' }}>
            <button className="primary-btn" onClick={handleImportJson} disabled={!jsonInput.trim()}>
              <ClipboardPaste size={16} /> 검증 후 현재 페이지 초안에 적용
            </button>
          </div>
        </div>
      )}

      {workbookPages.length > 0 ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Main Canvas Area */}
          <div style={{ flex: '1 1 60%', minWidth: '400px' }}>
             {/* Pagination */}
             <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {workbookPages.map((page, idx) => (
                  <button 
                    key={page.id}
                    onClick={() => { setCurrentPageIndex(idx); setSelectedElementId(null); }}
                    title={page.sourceFileName ? `${idx + 1}페이지 · ${page.sourceFileName}` : `${idx + 1}페이지`}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      background: currentPageIndex === idx ? 'var(--neon-blue)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Page {idx + 1}{page.sourceFileName && <small style={{ display: 'block', marginTop: '0.15rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page.sourceFileName}</small>}
                  </button>
                ))}
             </div>

             {/* Editor Canvas */}
             <div 
               ref={containerRef}
               style={{ 
                 position: 'relative', 
                 width: '100%', 
                 cursor: 'crosshair',
                 boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                 borderRadius: '8px',
                 overflow: 'hidden',
                 backgroundColor: 'rgba(0,0,0,0.5)'
               }}
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
             >
                <img 
                  src={currentPage.imageUrl} 
                  alt="Workbook Base" 
                  style={{ width: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }} 
                  draggable={false}
                />
                
                {currentPage.elements.map(el => (
                  <div 
                    key={el.id}
                    className="wve-element"
                    data-id={el.id}
                    style={{
                      position: 'absolute',
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                      border: selectedElementId === el.id ? '2px solid var(--neon-blue)' : (el.type === 'mask' ? '2px dashed var(--alert-red)' : '2px solid var(--planet-green)'),
                      backgroundColor: el.type === 'mask' ? 'rgba(255, 50, 50, 0.2)' : 'rgba(50, 255, 50, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isDraggingElement && selectedElementId === el.id ? 'grabbing' : 'grab',
                      zIndex: 10
                    }}
                  >
                    {el.type === 'input' ? <Type size={12} color="white" /> : el.type === 'multiple-choice' ? <Sparkles size={12} color="white" /> : el.type === 'mask' ? <EyeOff size={12} color="white" /> : <span style={{ fontSize: '9px', color: 'white' }}>{INTERACTION_LABELS[el.type] || el.type}</span>}
                    {selectedElementId === el.id && (
                       <div style={{ position: 'absolute', top: '-20px', left: 0, background: 'var(--neon-blue)', color: 'white', fontSize: '10px', padding: '2px 4px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                         {el.answer || el.type}
                       </div>
                    )}
                  </div>
                ))}

                {/* Render Drawing Rect */}
                {currentRect && (
                  <div style={{
                    position: 'absolute',
                    top: `${currentRect.top}%`,
                    left: `${currentRect.left}%`,
                    width: `${currentRect.width}%`,
                    height: `${currentRect.height}%`,
                    border: '2px solid yellow',
                    backgroundColor: 'rgba(255, 255, 0, 0.2)',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}/>
                )}
             </div>
             
             <div style={{ marginTop: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                * 배경 이미지를 마우스로 드래그하면 요소를 생성할 수 있습니다. 이미 등록된 요소를 클릭하면 속성을 수정할 수 있습니다.
             </div>
             <button 
                onClick={() => {
                  if(window.confirm('이 페이지를 삭제하시겠습니까?')) {
                    const newPages = workbookPages.filter((_, i) => i !== currentPageIndex);
                    setWorkbookPages(newPages);
                    setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
                    setSelectedElementId(null);
                  }
                }}
                className="outline-btn" style={{ marginTop: '1rem', borderColor: '#ff4444', color: '#ff4444' }}
              >
                현재 페이지 삭제
              </button>
          </div>

          {/* Properties Panel */}
          <div style={{ flex: '1 1 30%', minWidth: '300px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
             <h4 style={{ margin: '0 0 1.5rem 0', color: 'var(--crystal-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Settings size={18} /> 요소 속성 설정
             </h4>
             
             {selectedElement ? (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div className="form-group" style={{ marginBottom: '1rem' }}>
                   <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>요소 종류 (Type)</label>
                   <select 
                     value={selectedElement.type} 
                     onChange={(e) => {
                       const type = e.target.value;
                       updateSelectedElement({ type, ...(WORKBOOK_INTERACTION_TYPES.has(type) ? { config: getDefaultInteractionConfig(type) } : {}) });
                     }}
                     style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                   >
                     <option value="input">입력칸 (Input)</option>
                     <option value="multiple-choice">객관식 (Multiple Choice)</option>
                     <option value="mask">가리기 마스크 (Mask)</option>
                     <option value="grouping">드래그 나누기 (Grouping)</option>
                     <option value="number-line">수직선 (Number Line)</option>
                     <option value="matching">연결하기 (Matching)</option>
                     <option value="ordering">순서 정렬 (Ordering)</option>
                     <option value="coloring">색칠하기 (Coloring)</option>
                   </select>
                 </div>

                 <div className="form-group" style={{ display: 'grid', gap: '0.5rem' }}>
                   <label style={{ color: 'var(--text-muted)' }}>문제 지시문·AI 인식 원문</label>
                   <textarea value={selectedElement.sourceText || ''} onChange={(event) => updateSelectedElement({ sourceText: event.target.value })} placeholder="예: 구슬을 두 사람에게 똑같이 나누세요." style={{ minHeight: '72px', padding: '0.7rem', background: 'rgba(5,10,25,0.8)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '5px' }} />
                   <button type="button" className="outline-btn" onClick={() => {
                     const recommendation = recommendWorkbookInteraction({ sourceText: selectedElement.sourceText });
                     if (!WORKBOOK_INTERACTION_TYPES.has(recommendation.type)) {
                       alert(`추천: 입력칸\n${recommendation.reason}`);
                       return;
                     }
                     if (!window.confirm(`${INTERACTION_LABELS[recommendation.type]} 요소로 바꾸시겠습니까?\n\n${recommendation.reason}`)) return;
                     updateSelectedElement({ type: recommendation.type, config: getDefaultInteractionConfig(recommendation.type), recommendationReason: recommendation.reason });
                   }}>지시문 기반 상호작용 추천</button>
                 </div>

                 {selectedElement.type === 'input' ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                     <div className="form-group">
                       <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--planet-green)' }}>정답 (Answer)</label>
                       <input
                         type="text"
                         value={selectedElement.answer || ''}
                         onChange={(e) => updateSelectedElement({ answer: e.target.value })}
                         placeholder="예: 5 또는 18÷2"
                         style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid var(--planet-green)', color: 'white', borderRadius: '4px' }}
                       />
                     </div>
                     <div className="form-group">
                       <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>입력 형식</label>
                       <select
                         value={selectedElement.inputMode || 'integer'}
                         onChange={(e) => updateSelectedElement({ inputMode: e.target.value })}
                         style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                       >
                         <option value="integer">자연수·정수</option>
                         <option value="decimal">소수</option>
                         <option value="fraction">분수</option>
                         <option value="mixed-number">대분수</option>
                         <option value="expression">수식</option>
                         <option value="text">짧은 글자·단위</option>
                       </select>
                     </div>
                     <div className="form-group">
                       <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>허용할 다른 답안 (쉼표로 구분)</label>
                       <input
                         type="text"
                         value={(selectedElement.acceptedAnswers || []).join(', ')}
                         onChange={(e) => updateSelectedElement({ acceptedAnswers: e.target.value.split(',').map(value => value.trim()).filter(Boolean) })}
                         placeholder="예: 18 / 2, 18/2"
                         style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                       />
                     </div>
                   </div>
                 ) : selectedElement.type === 'multiple-choice' ? (
                   <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                     <label style={{ display: 'block', color: 'var(--planet-purple)' }}>객관식 선택지 및 정답 설정</label>
                     {(selectedElement.options || []).map((opt, idx) => (
                       <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <input 
                           type="radio" 
                           name="mc-answer"
                           checked={selectedElement.answer === opt && opt !== ''}
                           onChange={() => updateSelectedElement({ answer: opt })}
                           style={{ width: '20px', height: '20px', accentColor: 'var(--planet-purple)', cursor: 'pointer' }}
                         />
                         <input 
                           type="text" 
                           value={opt}
                           onChange={(e) => {
                             const newOptions = [...(selectedElement.options || [])];
                             newOptions[idx] = e.target.value;
                             // if this was the answer, update the answer text too
                             const newAnswer = (selectedElement.answer === opt) ? e.target.value : selectedElement.answer;
                             updateSelectedElement({ options: newOptions, answer: newAnswer });
                           }}
                           placeholder={`선택지 ${idx + 1}`}
                           style={{ flex: 1, padding: '0.6rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid var(--planet-purple)', color: 'white', borderRadius: '4px' }}
                         />
                         <div style={{ fontSize: '0.9rem', color: 'var(--crystal-cyan)', minWidth: '40px', textAlign: 'center' }}>
                           <WorkbookChoiceContent value={opt} keyPrefix={`editor-mc-opt-${selectedElement.id}-${idx}`} />
                         </div>
                         <button 
                           onClick={() => {
                             const newOptions = (selectedElement.options || []).filter((_, i) => i !== idx);
                             let newAnswer = selectedElement.answer;
                             if (selectedElement.answer === opt) newAnswer = '';
                             updateSelectedElement({ options: newOptions, answer: newAnswer });
                           }}
                           style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', padding: '0.5rem' }}
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     ))}
                     <button 
                       onClick={() => {
                         const newOptions = [...(selectedElement.options || []), `옵션 ${(selectedElement.options || []).length + 1}`];
                         updateSelectedElement({ options: newOptions });
                       }}
                       className="hud-btn secondary"
                       style={{ padding: '0.6rem', fontSize: '0.9rem', marginTop: '0.5rem' }}
                     >
                       + 선택지 추가
                     </button>
                   </div>
                 ) : WORKBOOK_INTERACTION_TYPES.has(selectedElement.type) ? (
                   <div style={{ display: 'grid', gap: '0.9rem' }}>
                     <InteractionConfigEditor key={`${selectedElement.id}-${selectedElement.type}`} element={selectedElement} onUpdate={updateSelectedElement} />
                     {selectedElement.recommendationReason && <small style={{ color: '#a5f3fc' }}>추천 근거: {selectedElement.recommendationReason}</small>}
                   </div>
                 ) : (
                   <div className="form-group">
                     <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--alert-red)' }}>활성화 조건 (Trigger By Input ID)</label>
                     <select 
                       value={selectedElement.triggerBy || ''} 
                       onChange={(e) => updateSelectedElement({ triggerBy: e.target.value })}
                       style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                     >
                       <option value="">선택 안함</option>
                       {currentPage.elements.filter(el => el.type !== 'mask').map(el => (
                         <option key={el.id} value={el.id}>{el.id} (정답: {el.answer})</option>
                       ))}
                     </select>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                       선택한 입력칸이 정답 처리될 때 이 마스크가 화면을 덮습니다. X표를 가리거나 정답 효과를 줄 때 사용하세요.
                     </div>
                   </div>
                 )}

                 {WORKBOOK_GRADABLE_TYPES.has(selectedElement.type) && (
                   <div style={{ display: 'grid', gap: '0.8rem', padding: '0.85rem', border: '1px solid rgba(245,158,11,0.28)', borderRadius: '8px', background: 'rgba(245,158,11,0.05)' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 0.7fr) minmax(160px, 1.3fr)', gap: '0.6rem' }}>
                       <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-muted)' }}>
                         교재 문제 번호
                         <input value={selectedElement.problemLabel || ''} onChange={(event) => updateSelectedElement({ problemLabel: event.target.value })} placeholder="예: (2)" style={{ padding: '0.65rem', background: '#071224', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '5px' }} />
                       </label>
                       <label style={{ display: 'grid', gap: '0.35rem', color: 'var(--text-muted)' }}>
                         답안 구분
                         <input value={selectedElement.responseLabel || ''} onChange={(event) => updateSelectedElement({ responseLabel: event.target.value })} placeholder="예: 전체를 구하는 식 / 나눗셈식" style={{ padding: '0.65rem', background: '#071224', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '5px' }} />
                       </label>
                     </div>
                     <label style={{ display: 'grid', gap: '0.4rem', color: 'var(--text-muted)' }}>
                       단계별 힌트 (쉬운 단서 → 구체적인 단서, 줄바꿈으로 구분, 최대 3개)
                       <textarea
                         value={(selectedElement.hints?.length ? selectedElement.hints : (selectedElement.hint ? [selectedElement.hint] : [])).join('\n')}
                         onChange={(event) => {
                           const hints = event.target.value.split('\n').map(value => value.trim()).filter(Boolean).slice(0, 3);
                           updateSelectedElement({ hints, hint: hints[0] || '' });
                         }}
                         placeholder={'1단계: 문제에서 알고 있는 것을 찾아보세요.\n2단계: 식의 순서를 생각해 보세요.\n3단계: 사용할 수와 기호를 확인해 보세요.'}
                         style={{ minHeight: '110px', padding: '0.7rem', background: '#071224', color: 'white', border: '1px solid rgba(245,158,11,0.5)', borderRadius: '5px' }}
                       />
                       <small style={{ color: '#fcd34d', lineHeight: 1.45 }}>교재 번호와 답안 구분은 학생 힌트에 표시됩니다. 비어 있으면 요소 ID와 문제 원문에서 자동 추론합니다.</small>
                     </label>
                   </div>
                 )}

                 {(selectedElement.sourceText || selectedElement.confidence !== undefined) && (
                   <div style={{ padding: '0.8rem', borderRadius: '6px', background: 'rgba(0,243,255,0.06)', border: '1px solid rgba(0,243,255,0.16)', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                     <strong style={{ color: 'var(--crystal-cyan)' }}>AI 분석 메모</strong><br/>
                     {selectedElement.sourceText || '인식 원문 없음'}
                     {selectedElement.confidence !== undefined && <><br/>신뢰도: {Math.round(Number(selectedElement.confidence || 0) * 100)}%</>}
                   </div>
                 )}

                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                     <label style={{ margin: 0, color: 'var(--text-muted)' }}>좌표 및 크기 정보 (%)</label>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>숫자 직접 입력 가능</span>
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div className="form-group">
                        <span style={{ display: 'inline-block', width: '50px', fontSize: '0.8rem', color: '#888' }}>Top</span>
                        <input 
                          type="number" step="0.1" 
                          value={selectedElement.position.top.toFixed(1)} 
                          onChange={(e) => updateSelectedElement({ position: { ...selectedElement.position, top: parseFloat(e.target.value) || 0 }})}
                          style={{ width: 'calc(100% - 60px)', padding: '0.4rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }} 
                        />
                      </div>
                      <div className="form-group">
                        <span style={{ display: 'inline-block', width: '50px', fontSize: '0.8rem', color: '#888' }}>Left</span>
                        <input 
                          type="number" step="0.1" 
                          value={selectedElement.position.left.toFixed(1)} 
                          onChange={(e) => updateSelectedElement({ position: { ...selectedElement.position, left: parseFloat(e.target.value) || 0 }})}
                          style={{ width: 'calc(100% - 60px)', padding: '0.4rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }} 
                        />
                      </div>
                      <div className="form-group">
                        <span style={{ display: 'inline-block', width: '50px', fontSize: '0.8rem', color: '#888' }}>Width</span>
                        <input 
                          type="number" step="0.1" 
                          value={selectedElement.position.width.toFixed(1)} 
                          onChange={(e) => updateSelectedElement({ position: { ...selectedElement.position, width: parseFloat(e.target.value) || 0 }})}
                          style={{ width: 'calc(100% - 60px)', padding: '0.4rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }} 
                        />
                      </div>
                      <div className="form-group">
                        <span style={{ display: 'inline-block', width: '50px', fontSize: '0.8rem', color: '#888' }}>Height</span>
                        <input 
                          type="number" step="0.1" 
                          value={selectedElement.position.height.toFixed(1)} 
                          onChange={(e) => updateSelectedElement({ position: { ...selectedElement.position, height: parseFloat(e.target.value) || 0 }})}
                          style={{ width: 'calc(100% - 60px)', padding: '0.4rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }} 
                        />
                      </div>
                   </div>
                 </div>

                 <button 
                   onClick={deleteSelectedElement} 
                   style={{ marginTop: 'auto', background: 'rgba(255,0,0,0.1)', color: '#ff4444', border: '1px solid #ff4444', padding: '0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                 >
                   <Trash2 size={16} /> 요소 삭제
                 </button>
               </div>
             ) : (
               <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                 <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Settings size={24} color="var(--text-muted)" />
                 </div>
                 <span>캔버스에서 요소를 선택하거나 드래그하여 새 요소를 추가하세요.</span>
               </div>
             )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)' }}>
          <div style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            <ImageIcon size={48} style={{ opacity: 0.5, marginBottom: '1rem' }}/>
            <p>등록된 워크북 페이지가 없습니다.</p>
          </div>
          <label className="primary-btn" style={{ display: 'inline-flex', cursor: 'pointer', padding: '1rem 2rem', alignItems: 'center', gap: '0.5rem' }}>
            {uploading ? uploadLabel : <><ImageIcon size={20} /> 이미지 여러 장 업로드</>}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading}/>
          </label>
        </div>
      )}
    </div>
  );
};

export default WorkbookVisualEditor;
