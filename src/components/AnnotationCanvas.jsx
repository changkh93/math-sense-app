import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { useSpeechToText } from '../hooks/useSpeechToText';
import './AnnotationCanvas.css';

const MODES = {
  DRAW: 'draw',
  HIGHLIGHT: 'highlight',
  TEXT: 'text',
  SELECT: 'select',
  ERASE: 'erase',
  STAMP: 'stamp',
  MIC: 'mic'
};

const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#ffffff'];

export default function AnnotationCanvas({ backgroundImage, initialState, onComplete, onCancel }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [mode, setMode] = useState(MODES.DRAW);
  const [color, setColor] = useState(COLORS[0]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryUpdate = useRef(false);

  // Derived state to show color picker only for relevant tools
  const showColorPicker = [MODES.DRAW, MODES.HIGHLIGHT, MODES.TEXT].includes(mode);

  // STT Integration
  const { isListening, transcript, interimTranscript, startListening, stopListening, isSupported } = useSpeechToText();
  const sttTextObjectRef = useRef(null);
  const micRequestedRef = useRef(false);

  // Sync mode when STT stops natively
  useEffect(() => {
    if (isListening) {
      micRequestedRef.current = false;
    } else if (mode === MODES.MIC && !micRequestedRef.current) {
      setMode(MODES.SELECT);
    }
  }, [isListening, mode]);

  const handleModeChange = (newMode) => {
    if (newMode === MODES.MIC) {
      micRequestedRef.current = true;
    }
    if (isListening && newMode !== MODES.MIC) {
      stopListening();
    }
    setMode(newMode);
  };

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      selection: true,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    setCanvas(initCanvas);

    // Save initial blank state
    saveHistory(initCanvas);

    const handleResize = () => {
      initCanvas.setWidth(containerRef.current.clientWidth);
      initCanvas.setHeight(containerRef.current.clientHeight);
      initCanvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      initCanvas.dispose();
    };
  }, []);

  // Load Background Image
  useEffect(() => {
    if (canvas && backgroundImage) {
      fabric.Image.fromURL(backgroundImage, (img) => {
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        
        img.set({
          originX: 'center',
          originY: 'center',
          left: canvas.width / 2,
          top: canvas.height / 2,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        // Set as background image
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        
        if (initialState) {
          isHistoryUpdate.current = true;
          canvas.loadFromJSON(initialState, () => {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            saveHistory(canvas);
            isHistoryUpdate.current = false;
          });
        } else {
          saveHistory(canvas);
        }
      });
    }
  }, [canvas, backgroundImage, initialState]);

  // History tracking (Undo/Redo logic)
  const saveHistory = useCallback((activeCanvas = canvas) => {
    if (!activeCanvas || isHistoryUpdate.current) return;
    
    // Crucial: Only serialize objects, exclude background to prevent memory leaks
    const json = activeCanvas.toJSON(['selectable', 'evented']);
    
    setHistory(prev => {
      // Prevent saving identical consecutive states (e.g., from path:created + object:added firing together)
      if (prev.length > 0 && JSON.stringify(prev[prev.length - 1]) === JSON.stringify(json)) {
        return prev;
      }
      
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(json);
      setHistoryIndex(Math.min(newHistory.length - 1, 49));
      return newHistory.slice(-50); // Keep last 50 states maximum
    });
  }, [canvas, historyIndex]);

  useEffect(() => {
    if (!canvas) return;
    
    const onObjectChange = () => saveHistory(canvas);

    canvas.on('object:added', onObjectChange);
    canvas.on('object:modified', onObjectChange);
    canvas.on('object:removed', onObjectChange);
    canvas.on('path:created', onObjectChange);

    return () => {
      canvas.off('object:added', onObjectChange);
      canvas.off('object:modified', onObjectChange);
      canvas.off('object:removed', onObjectChange);
      canvas.off('path:created', onObjectChange);
    };
  }, [canvas, saveHistory]);

  const undo = () => {
    if (!canvas || historyIndex <= 0) return;
    loadHistoryJSON(history[historyIndex - 1]);
    setHistoryIndex(prev => prev - 1);
  };

  const redo = () => {
    if (!canvas || historyIndex >= history.length - 1) return;
    loadHistoryJSON(history[historyIndex + 1]);
    setHistoryIndex(prev => prev + 1);
  };

  const loadHistoryJSON = (json) => {
    isHistoryUpdate.current = true;
    const bg = canvas.backgroundImage;
    canvas.loadFromJSON(json, () => {
      // Restore background since we didn't serialize it
      canvas.setBackgroundImage(bg, canvas.renderAll.bind(canvas));
      isHistoryUpdate.current = false;
    });
  };

  const clearAll = () => {
    if (!canvas) return;
    // Clear all objects from the canvas to start fresh
    canvas.clear();
    // Re-apply the background since clear() removes everything
    if (backgroundImage) {
      fabric.Image.fromURL(backgroundImage, (img) => {
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        img.set({
          originX: 'center', originY: 'center',
          left: canvas.width / 2, top: canvas.height / 2,
          scaleX: scale, scaleY: scale,
          selectable: false, evented: false,
        });
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        saveHistory(canvas); // Save the cleared state to history
      });
    }
  };

  // Keyboard Event Management (Delete selected objects)
  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = (e) => {
      // Allow default behavior for inputs and textareas
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        const activeObjects = canvas.getActiveObjects();
        
        // Don't delete if we are currently editing a text inside the canvas
        if (activeObjects.length === 1 && activeObjects[0].isEditing) {
          return;
        }

        if (activeObjects.length > 0) {
          e.preventDefault(); // Prevent navigating back in browser
          activeObjects.forEach((obj) => {
            canvas.remove(obj);
          });
          canvas.discardActiveObject();
          canvas.requestRenderAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas]);

  // Mode & Tool Management
  useEffect(() => {
    if (!canvas) return;

    canvas.isDrawingMode = (mode === MODES.DRAW || mode === MODES.HIGHLIGHT);
    canvas.selection = (mode === MODES.SELECT); // Disable selection box for ERASE
    
    // Configure Brush
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      if (mode === MODES.HIGHLIGHT) {
        // Hex to RGBA for highlighter
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 0.3)`;
        canvas.freeDrawingBrush.width = 18;
      } else {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = 4;
      }
    }

    // Make objects selectable vs non-selectable based on mode
    canvas.forEachObject(obj => {
      obj.selectable = (mode === MODES.SELECT || mode === MODES.ERASE);
      obj.evented = (mode === MODES.SELECT || mode === MODES.ERASE);
    });
    canvas.requestRenderAll();

  }, [canvas, mode, color]);

  // Handle Canvas Clicks for specific modes
  useEffect(() => {
    if (!canvas) return;

    let isErasing = false;

    const onMouseDown = (o) => {
      if (mode === MODES.TEXT && !o.target) {
        const pointer = canvas.getPointer(o.e);
        const text = new fabric.IText('', {
          left: pointer.x,
          top: pointer.y - 12,
          fontFamily: 'Noto Sans KR, sans-serif',
          fill: color,
          fontSize: 24,
          editable: true,
          borderColor: '#00f3ff',
          cornerColor: '#00f3ff',
          transparentCorners: false,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.hiddenTextarea.focus();
        setMode(MODES.SELECT); // Switch back to select mode after creating text
      } 
      else if (mode === MODES.ERASE) {
        isErasing = true;
        if (o.target) {
          canvas.remove(o.target);
          canvas.requestRenderAll();
        }
      }
      else if (mode === MODES.STAMP && !o.target) {
        const pointer = canvas.getPointer(o.e);
        const text = new fabric.Text('❓', {
          left: pointer.x - 20,
          top: pointer.y - 20,
          fontSize: 40,
          selectable: true,
        });
        canvas.add(text);
      }
    };

    const onMouseMove = (o) => {
      if (mode === MODES.ERASE && isErasing) {
        // Find if pointer is over any object
        const pointer = canvas.getPointer(o.e);
        
        // Find object under mouse since o.target might not always fire reliably during drag
        const objects = canvas.getObjects();
        for (let i = objects.length - 1; i >= 0; i--) {
          const obj = objects[i];
          if (obj.containsPoint(pointer)) {
            canvas.remove(obj);
            canvas.requestRenderAll();
            break; // Stop checking after removing the top-most object at pointer
          }
        }
      }
    };

    const onMouseUp = () => {
      isErasing = false;
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [canvas, mode, color]);

  // Handle Voice-To-Text Updates
  useEffect(() => {
    if (!canvas || !isListening) return;

    const fullText = transcript + interimTranscript;
    
    if (fullText.trim().length > 0) {
      if (!sttTextObjectRef.current) {
        // Create a new text object in center
        const text = new fabric.Textbox(fullText, {
          left: canvas.width / 2 - 150,
          top: canvas.height / 2 - 50,
          width: 300,
          fontFamily: 'Noto Sans KR, sans-serif',
          fill: color,
          fontSize: 24,
          backgroundColor: 'rgba(0,0,0,0.5)', // Better visibility for STT
          borderColor: '#00f3ff',
          cornerColor: '#00f3ff',
          transparentCorners: false,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        sttTextObjectRef.current = text;
      } else {
        // Update existing
        sttTextObjectRef.current.set('text', fullText);
        canvas.requestRenderAll();
      }
    }
  }, [canvas, isListening, transcript, interimTranscript, color]);

  // Reset STT ref when listening stops
  useEffect(() => {
    if (!isListening && sttTextObjectRef.current) {
      sttTextObjectRef.current = null;
    }
  }, [isListening]);

  // Export
  const handleComplete = () => {
    if (!canvas) return;
    
    // Temporarily deselect everything so selection box doesn't appear in export
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 0.9,
      multiplier: 1 // Keep same resolution
    });
    
    const json = canvas.toJSON(['selectable', 'evented']);
    
    if (onComplete) onComplete(dataUrl, json);
  };

  return (
    <div className="annotation-canvas-wrapper">
      <div className="annotation-canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>

      {mode === MODES.MIC && (
        <div className="stt-indicator" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>🔴 듣고 있습니다...</span>
          <button type="button" 
            onClick={() => { stopListening(); setMode(MODES.SELECT); }} 
            style={{ 
              background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#fff', 
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', 
              fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            ✔️ 완료
          </button>
        </div>
      )}

      {/* Floating Toolbar */}
      <div className="floating-toolbar">
        {/* Contextual Color Palette Popover */}
        {showColorPicker && (
          <div className="color-picker-popover">
            {COLORS.map(c => (
              <button type="button"
                key={c}
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label="색상 선택"
              />
            ))}
          </div>
        )}
        
        {/* Tool Group */}
          <div className="toolbar-group">
            <button type="button" className={`toolbar-btn ${mode === MODES.SELECT ? 'active' : ''}`} onClick={() => handleModeChange(MODES.SELECT)} aria-label="선택/이동">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="5 9 2 12 5 15"></polyline>
                <polyline points="9 5 12 2 15 5"></polyline>
                <polyline points="19 9 22 12 19 15"></polyline>
                <polyline points="15 19 12 22 9 19"></polyline>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <line x1="12" y1="2" x2="12" y2="22"></line>
              </svg>
            </button>
            <button type="button" className={`toolbar-btn ${mode === MODES.DRAW ? 'active' : ''}`} onClick={() => handleModeChange(MODES.DRAW)} aria-label="펜">
              ✏️
            </button>
            <button type="button" className={`toolbar-btn ${mode === MODES.HIGHLIGHT ? 'active' : ''}`} onClick={() => handleModeChange(MODES.HIGHLIGHT)} aria-label="형광펜">
              🖍️
            </button>
            <button type="button" className={`toolbar-btn ${mode === MODES.TEXT ? 'active' : ''}`} onClick={() => handleModeChange(MODES.TEXT)} aria-label="텍스트">
              T
            </button>
            <button type="button" className={`toolbar-btn ${mode === MODES.STAMP ? 'active' : ''}`} onClick={() => handleModeChange(MODES.STAMP)} aria-label="질문 스탬프">
              ❓
            </button>
            <button type="button" className={`toolbar-btn ${mode === MODES.ERASE ? 'active' : ''}`} onClick={() => handleModeChange(MODES.ERASE)} aria-label="부분 지우기">
              🧽
            </button>
            
            {isSupported && (
              <button type="button" 
                className={`toolbar-btn ${mode === MODES.MIC ? 'active' : ''}`} 
                onClick={() => {
                  if (mode === MODES.MIC) {
                    handleModeChange(MODES.SELECT);
                  } else {
                    handleModeChange(MODES.MIC);
                    startListening();
                  }
                }} 
                aria-label={mode === MODES.MIC ? '음성 입력 완료' : '음성으로 텍스트 입력'}
                style={{ color: mode === MODES.MIC ? '#ef4444' : undefined }}
              >
                {mode === MODES.MIC ? '⏹️' : '🎤'}
              </button>
            )}
          </div>

          <div className="toolbar-divider" />

          {/* Control Group */}
          <div className="toolbar-group">
            <button type="button" className="toolbar-btn" onClick={undo} disabled={historyIndex <= 0} aria-label="실행 취소">
              ↩️
            </button>
            <button type="button" className="toolbar-btn" onClick={redo} disabled={historyIndex >= history.length - 1} aria-label="다시 실행">
              ↪️
            </button>
            <button type="button" className="toolbar-btn" onClick={clearAll} aria-label="전체 지우기" style={{ color: '#ef4444' }}>
              🗑️
            </button>
          </div>
        </div>

      <div className="annotation-actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="action-btn complete" onClick={handleComplete} style={{ transform: 'scale(1.1)' }}>
          ✅ 질문 첨부하기
        </button>
      </div>
    </div>
  );
}
