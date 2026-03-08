import React, { useState, useRef } from 'react';
import { Trash2, Image as ImageIcon, Sparkles, Type, EyeOff, Settings } from 'lucide-react';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImage } from '../../utils/storageUtils';
import { analyzeWorkbookImage } from '../../services/geminiService';
import { parseInlineFormatting } from '../../utils/formatUtils';
import 'katex/dist/katex.min.css';

const WorkbookVisualEditor = ({ workbookPages, setWorkbookPages, unitId }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `workbook_images/${unitId}_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      
      const newPage = {
        id: `page_${Date.now()}`,
        imageUrl: url,
        elements: []
      };
      
      setWorkbookPages([...workbookPages, newPage]);
      setCurrentPageIndex(workbookPages.length); // point to new page (which is length before adding)
    } catch (error) {
      console.error("Upload failed", error);
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAiScan = async () => {
    if (!currentPage || !currentPage.imageUrl) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch(currentPage.imageUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });
      
      const base64data = reader.result.split(',')[1];
      const mimeType = blob.type;

      const aiResults = await analyzeWorkbookImage(base64data, mimeType);

      if (aiResults && Array.isArray(aiResults)) {
        const newElements = aiResults.map((item, index) => {
          const id = `el_ai_${Date.now()}_${index}`;
          return {
            ...item,
            id,
            type: item.type === 'mask' ? 'mask' : 'input',
            answer: item.answer || '',
            triggerBy: '',
            position: {
              top: item.position?.top || 0,
              left: item.position?.left || 0,
              width: item.position?.width || 5,
              height: Math.max(item.position?.height || 3.5, 3.5)
            }
          };
        });
        
        const updatedPages = [...workbookPages];
        updatedPages[currentPageIndex] = {
          ...currentPage,
          elements: [...currentPage.elements, ...newElements]
        };
        setWorkbookPages(updatedPages);
        alert('AI 자동 분석이 완료되었습니다. 요소들을 확인하고 조정해주세요.');
      } else {
        alert('분석 결과가 없습니다.');
      }
    } catch (error) {
      console.error("AI Scan Failed:", error);
      alert('AI 스캔 중 오류가 발생했습니다.');
    } finally {
      setAnalyzing(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--neon-blue)', whiteSpace: 'nowrap' }}>
          <ImageIcon size={20} /> 스마트 인터랙티브 워크북 (Smart Workbook)
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={handleAiScan}
            disabled={analyzing || !currentPage}
            className="icon-btn outline-btn" 
            style={{ borderColor: 'var(--crystal-cyan)', color: 'var(--crystal-cyan)', whiteSpace: 'nowrap', opacity: analyzing || !currentPage ? 0.5 : 1, cursor: analyzing || !currentPage ? 'not-allowed' : 'pointer' }}
          >
             <Sparkles size={16} /> {analyzing ? 'AI 분석 중...' : 'Magic AI Scan'}
          </button>
          <label className="icon-btn outline-btn" style={{ whiteSpace: 'nowrap', opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? '업로드 중...' : '+ 페이지 추가'}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading}/>
          </label>
        </div>
      </div>

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
                    Page {idx + 1}
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
                    {el.type === 'input' ? <Type size={12} color="white" /> : (el.type === 'multiple-choice' ? <Sparkles size={12} color="white" /> : <EyeOff size={12} color="white" />)}
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
                     onChange={(e) => updateSelectedElement({ type: e.target.value })}
                     style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                   >
                     <option value="input">입력칸 (Input)</option>
                     <option value="multiple-choice">객관식 (Multiple Choice)</option>
                     <option value="mask">가리기 마스크 (Mask)</option>
                   </select>
                 </div>

                 {selectedElement.type === 'input' ? (
                   <div className="form-group">
                     <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--planet-green)' }}>정답 (Answer)</label>
                     <input 
                       type="text" 
                       value={selectedElement.answer || ''} 
                       onChange={(e) => updateSelectedElement({ answer: e.target.value })}
                       placeholder="예: 5"
                       style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid var(--planet-green)', color: 'white', borderRadius: '4px' }}
                     />
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
                           {parseInlineFormatting(opt)}
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
                 ) : (
                   <div className="form-group">
                     <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--alert-red)' }}>활성화 조건 (Trigger By Input ID)</label>
                     <select 
                       value={selectedElement.triggerBy || ''} 
                       onChange={(e) => updateSelectedElement({ triggerBy: e.target.value })}
                       style={{ width: '100%', padding: '0.8rem', background: 'rgba(5, 10, 25, 0.8)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                     >
                       <option value="">선택 안함</option>
                       {currentPage.elements.filter(el => el.type === 'input' || el.type === 'multiple-choice').map(el => (
                         <option key={el.id} value={el.id}>{el.id} (정답: {el.answer})</option>
                       ))}
                     </select>
                     <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                       선택한 입력칸이 정답 처리될 때 이 마스크가 화면을 덮습니다. X표를 가리거나 정답 효과를 줄 때 사용하세요.
                     </div>
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
            {uploading ? '업로드 중...' : <><ImageIcon size={20} /> 첫 번째 이미지 업로드</>}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading}/>
          </label>
        </div>
      )}
    </div>
  );
};

export default WorkbookVisualEditor;
