import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import soundManager from '../../utils/SoundManager';
import MathKeypad from './MathKeypad';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { createParticleBurst, shakeScreen } from './ParticleEffects';
import { parseInlineFormatting } from '../../utils/formatUtils';
import 'katex/dist/katex.min.css';
import StarField from './StarField';
import './WorkbookPlayer.css';

const WorkbookPlayer = ({ pages, unitId, unitTitle, onComplete, onClose }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { id: value }
  const [checkedElements, setCheckedElements] = useState({}); // { id: { isCorrect, isChecked } }
  const [checkedPages, setCheckedPages] = useState({}); // { pageIndex: true }
  
  const [activeInputId, setActiveInputId] = useState(null);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isResultMode, setIsResultMode] = useState(false);
  const [inputMode, setInputMode] = useState('math'); // 'math' or 'native'
  const [floatingMarkers, setFloatingMarkers] = useState([]); // { id, text, type, x, y }
  const [sessionCrystals, setSessionCrystals] = useState(0);
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState({}); // { elId: [shuffledArray] }
  const inputRefs = React.useRef({});

  const currentPage = pages[currentPageIndex];

  // Whitespace-agnostic comparison
  const checkAnswer = (inputId, expectedAnswer) => {
    const userVal = answers[inputId] || '';
    const cleanUser = userVal.replace(/\s/g, '');
    const cleanExpected = expectedAnswer.toString().replace(/\s/g, '');
    return cleanUser === cleanExpected;
  };

  const handleInputActivate = (el, e) => {
    if (checkedPages[currentPageIndex] || isResultMode) return;
    setActiveInputId(el.id);
    
    // Auto-scroll logic to bring the activated input into view above the keypad
    if (e && e.target) {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }

    if (inputMode === 'math') {
      setShowKeypad(true);
    }
    soundManager.playClick();
  };

  const handleKeypadChange = (newValue) => {
    if (!activeInputId || checkedPages[currentPageIndex]) return;
    setAnswers(prev => ({ ...prev, [activeInputId]: newValue }));
  };

  const addMarker = (text, type, x, y) => {
    const id = Date.now() + Math.random();
    setFloatingMarkers(prev => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingMarkers(prev => prev.filter(m => m.id !== id));
    }, 2000);
  };

  const handleCheckPage = (e) => {
    if (checkedPages[currentPageIndex]) return;

    let localCorrect = 0;
    let localWrong = 0;
    let anyWrong = false;
    const newCheckedElements = { ...checkedElements };
    const rect = e.currentTarget.getBoundingClientRect();

    // Check all inputs on current page
    currentPage.elements.forEach((el, idx) => {
      if (el.type === 'input' || el.type === 'multiple-choice') {
        const isCorrect = checkAnswer(el.id, el.answer);
        newCheckedElements[el.id] = { isCorrect, isChecked: true };

        // Play particle effect roughly at center of button or random area
        const pX = rect.left + rect.width / 2 + (Math.random() * 40 - 20);
        const pY = rect.top + (Math.random() * 40 - 20);

        if (isCorrect) {
          localCorrect++;
          setTimeout(() => {
            soundManager.playCorrect();
            createParticleBurst(pX, pY, 'star');
            addMarker(`+1`, 'gain', pX, pY);
          }, idx * 150); // wrap in slight stagger
        } else {
           localWrong++;
           anyWrong = true;
           setTimeout(() => {
             soundManager.playWrong();
             createParticleBurst(pX, pY, 'wrong');
             addMarker(`-2`, 'loss', pX, pY);
           }, idx * 150);
        }
      }
    });

    if (anyWrong) {
        shakeScreen(300);
    }

    const earnedCrystals = Math.max(0, localCorrect * 1 - localWrong * 2);
    setSessionCrystals(prev => Math.max(0, prev + (localCorrect * 1) - (localWrong * 2)));

    setCheckedElements(newCheckedElements);
    setCheckedPages(prev => ({ ...prev, [currentPageIndex]: true }));
    setActiveInputId(null);
    setShowKeypad(false);
  };

  const handleSubmitFinal = () => {
    let globalCorrect = 0;
    let globalTotalInputs = 0;

    pages.forEach(page => {
      page.elements.forEach(el => {
        if (el.type === 'input' || el.type === 'multiple-choice') {
          globalTotalInputs++;
          if (checkedElements[el.id]?.isCorrect) {
            globalCorrect++;
          }
        }
      });
    });

    soundManager.playClick();
    setIsResultMode(true);
  };

  const completeWorkbook = () => {
    let globalCorrect = 0;
    let globalTotalInputs = 0;

    pages.forEach(page => {
      page.elements.forEach(el => {
        if (el.type === 'input' || el.type === 'multiple-choice') {
          globalTotalInputs++;
          if (checkedElements[el.id]?.isCorrect) {
            globalCorrect++;
          }
        }
      });
    });

    const score100 = globalTotalInputs === 0 ? 100 : Math.round((globalCorrect / globalTotalInputs) * 100);
    const isPerfect = (globalCorrect === globalTotalInputs) && globalTotalInputs > 0;
    const finalCrystals = sessionCrystals + (isPerfect ? 10 : 0);

    soundManager.playWarp();
    onComplete({
        score: score100,
        totalCount: globalTotalInputs,
        correctCount: globalCorrect,
        isPerfect: isPerfect,
        crystalsEarned: finalCrystals,
        type: 'workbook'
    });
  };

  const goToPrev = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
      setActiveInputId(null);
      setShowKeypad(false);
      soundManager.playClick();
    }
  };

  const goToNext = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
      setActiveInputId(null);
      setShowKeypad(false);
      soundManager.playClick();
    }
  };

  // Determine indicator text for keypad
  const activeElement = useMemo(() => {
    if (!activeInputId || !currentPage) return null;
    return currentPage.elements.find(el => el.id === activeInputId);
  }, [activeInputId, currentPage]);

  if (!pages || pages.length === 0) {
    return (
      <div className="workbook-player-empty">
        <h3 className="font-title">페이지가 없습니다.</h3>
        <button className="hud-btn secondary" onClick={onClose}>돌아가기</button>
      </div>
    );
  }

  // --- Final Results View Mode ---
  if (isResultMode) {
    let globalCorrect = 0;
    let globalTotalInputs = 0;

    pages.forEach(page => {
      page.elements.forEach(el => {
        if (el.type === 'input' || el.type === 'multiple-choice') {
          globalTotalInputs++;
          if (checkedElements[el.id]?.isCorrect) {
            globalCorrect++;
          }
        }
      });
    });

    const score100 = globalTotalInputs === 0 ? 100 : Math.round((globalCorrect / globalTotalInputs) * 100);
    const isPerfect = (globalCorrect === globalTotalInputs) && globalTotalInputs > 0;
    const finalCrystalsDisplay = sessionCrystals + (isPerfect ? 10 : 0);

    return (
      <div className="space-bg" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000 }}>
        <StarField count={150} />
        <div className="space-quiz-container fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <div className="glass-card space-quiz-card" style={{ textAlign: 'center', padding: '3rem 2rem', maxWidth: '500px', width: '90%' }}>
            
            <h2 className="font-title" style={{ fontSize: '2rem', color: 'var(--text-bright)', marginBottom: '2rem' }}>
              🎉 워크북 학습 완료!
            </h2>

            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: `4px solid ${isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: isPerfect ? 'var(--glow-gold)' : 'var(--glow-cyan)'
            }}>
              <span className="font-tech" style={{ 
                fontSize: '3rem', 
                fontWeight: 900,
                color: isPerfect ? 'var(--star-gold)' : 'var(--crystal-cyan)'
              }}>{score100}</span>
              <span style={{ color: 'var(--text-muted)' }}>점</span>
            </div>

            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>
              {globalCorrect} / {globalTotalInputs} 정답
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '2.5rem',
              background: 'rgba(0,243,255,0.1)',
              padding: '1rem',
              borderRadius: '15px'
            }}>
              <div className="crystal-icon" style={{ width: '24px', height: '24px' }}></div>
              <span style={{ color: 'var(--crystal-cyan)', fontWeight: 800, fontSize: '1.2rem' }}>
                +{finalCrystalsDisplay} 광석 획득!
              </span>
            </div>

            <button
              onClick={completeWorkbook}
              className="hud-btn primary"
              style={{
                width: '100%',
                padding: '1.2rem',
                background: 'linear-gradient(135deg, var(--planet-green), #22c55e)',
                border: 'none',
                borderRadius: '15px',
                color: 'white',
                fontSize: '1.2rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)'
              }}
            >
              📤 결과 저장 및 우주로 복귀
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCurrentPageChecked = !!checkedPages[currentPageIndex];

  return (
    <div className="workbook-player-container fade-in">
      {/* Floating Gain/Loss Markers */}
      <AnimatePresence>
        {floatingMarkers.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -50, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{
              position: 'fixed',
              left: m.x,
              top: m.y,
              color: m.type === 'gain' ? '#00ff88' : '#ff4d4d',
              fontWeight: 900,
              fontSize: '2rem',
              textShadow: m.type === 'gain' ? '0 0 10px rgba(0,255,136,0.8)' : '0 0 10px rgba(255,77,77,0.8)',
              pointerEvents: 'none',
              zIndex: 9999
            }}
          >
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="workbook-header hud-border glass-card">
        <button className="back-btn" onClick={onClose}>✕</button>
        <span className="font-title unit-title">{unitTitle || '스마트 워크북'}</span>
        <div className="page-indicator font-tech">
          {currentPageIndex + 1} / {pages.length}
        </div>
      </div>

      <div className="workbook-canvas-area" onClick={() => { setActiveInputId(null); setShowKeypad(false); }}>
        {currentPage && (
          <div className="workbook-page-container">
            <img 
              src={currentPage.imageUrl} 
              alt={`Page ${currentPageIndex + 1}`} 
              className="workbook-page-img"
              draggable={false}
            />
            
            {/* Elements Overlay */}
            {currentPage.elements.map((el, idx) => {
              if (el.type === 'input') {
                const elemStatus = checkedElements[el.id];
                const isActive = activeInputId === el.id;
                const val = answers[el.id] || '';
                
                return (
                  <div
                    key={el.id}
                    className={`wb-element wb-input ${isActive ? 'active' : ''} ${elemStatus?.isChecked ? (elemStatus.isCorrect ? 'correct' : 'wrong') : ''}`}
                    style={{
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInputActivate(el, e);
                    }}
                  >
                    {/* Always render an actual input so native focus works properly on mobile */}
                    <input 
                      ref={node => {
                        if (node) inputRefs.current[el.id] = node;
                        else delete inputRefs.current[el.id];
                      }}
                      type="text"
                      className="wb-native-input"
                      value={val}
                      readOnly={inputMode === 'math'}
                      onChange={(e) => inputMode === 'native' && handleKeypadChange(e.target.value)}
                      onFocus={() => {
                        if (inputMode === 'native') setActiveInputId(el.id);
                      }}
                      style={{ 
                        width: '100%', height: '100%', border: 'none', background: 'transparent', 
                        textAlign: 'center', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', outline: 'none',
                        pointerEvents: inputMode === 'native' ? 'auto' : 'none',
                        caretColor: inputMode === 'native' ? 'auto' : 'transparent'
                      }}
                    />
                    {!val && inputMode === 'math' && <span className="input-val" style={{ position: 'absolute', pointerEvents: 'none' }}></span>}
                    {elemStatus?.isChecked && (
                      <div className="result-icon">
                        {elemStatus.isCorrect ? <CheckCircle size={20} color="#00ff88" /> : <XCircle size={20} color="#ff4d4d" />}
                      </div>
                    )}
                  </div>
                );
              }
              
              if (el.type === 'multiple-choice') {
                const elemStatus = checkedElements[el.id];
                const isActive = activeInputId === el.id;
                const val = answers[el.id] || '';
                
                return (
                  <div
                    key={el.id}
                    className={`wb-element wb-mc ${isActive ? 'active' : ''} ${elemStatus?.isChecked ? (elemStatus.isCorrect ? 'correct' : 'wrong') : ''}`}
                    style={{
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                      border: isActive ? '2px solid var(--neon-blue)' : (val ? '2px solid var(--planet-purple)' : '2px dashed #ccc'),
                      backgroundColor: val ? 'rgba(157, 0, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      zIndex: 10,
                      boxShadow: isActive ? '0 0 10px var(--neon-blue)' : 'none'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (elemStatus?.isChecked) return;
                      soundManager.playClick();
                      
                      // Shuffle options if not already shuffled for this element
                      if (!shuffledOptionsMap[el.id]) {
                        const originalOptions = el.options || [];
                        const shuffled = [...originalOptions].sort(() => Math.random() - 0.5);
                        setShuffledOptionsMap(prev => ({ ...prev, [el.id]: shuffled }));
                      }
                      
                      setActiveInputId(el.id);
                      setShowKeypad(false); // Make sure keypad isn't shown
                    }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: val ? 'bold' : 'normal', color: val ? 'var(--text-bright)' : '#888', display: 'flex', alignItems: 'center' }}>
                      {val ? parseInlineFormatting(val) : '선택'}
                    </span>
                    {elemStatus?.isChecked && (
                      <div className="result-icon">
                        {elemStatus.isCorrect ? <CheckCircle size={20} color="#00ff88" /> : <XCircle size={20} color="#ff4d4d" />}
                      </div>
                    )}
                  </div>
                );
              }

              if (el.type === 'mask') {
                const triggerEl = currentPage.elements.find(e => e.id === el.triggerBy);
                // Reveal mask ONLY if the page has been checked and the trigger was correct
                const isTriggerCheckedAndCorrect = !!checkedElements[triggerEl?.id]?.isCorrect;
                
                return (
                  <motion.div
                    key={el.id}
                    className="wb-element wb-mask"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isTriggerCheckedAndCorrect ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      top: `${el.position.top}%`,
                      left: `${el.position.left}%`,
                      width: `${el.position.width}%`,
                      height: `${el.position.height}%`,
                      backgroundColor: 'white' // Mask covers underlying content with white
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      <div className="workbook-footer glass-card">
        <button 
          className="hud-btn pagination-btn" 
          onClick={goToPrev} 
          disabled={currentPageIndex === 0}
        >
          <span style={{ color: '#00f3ff', display: 'flex' }}>
            <ArrowLeft size={24} color="currentColor" strokeWidth={2.5} />
          </span>
        </button>

        {/* Center Main Action Button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {!isCurrentPageChecked ? (
            <button 
              className="hud-btn primary submit-btn font-title" 
              onClick={handleCheckPage}
              style={{ background: 'linear-gradient(135deg, var(--planet-purple), var(--neon-blue))' }}
            >
              정답 확인
            </button>
          ) : (
            currentPageIndex === pages.length - 1 ? (
              <button 
                className="hud-btn primary submit-btn font-title" 
                onClick={handleSubmitFinal}
              >
                제출하기
              </button>
            ) : (
              <button 
                className="hud-btn secondary submit-btn font-title" 
                onClick={goToNext}
                style={{ background: 'linear-gradient(135deg, rgba(0,243,255,0.2), rgba(0,255,136,0.2))', border: '1px solid var(--crystal-cyan)', color: 'var(--text-bright)' }}
              >
                다음 페이지 
                <ArrowRight size={20} style={{ marginLeft: 8 }} />
              </button>
            )
          )}
        </div>

        <button 
          className="hud-btn pagination-btn" 
          onClick={goToNext} 
          disabled={currentPageIndex === pages.length - 1 || (!isCurrentPageChecked)}
        >
          <span style={{ color: '#00f3ff', display: 'flex', opacity: (!isCurrentPageChecked) ? 0.3 : 1 }}>
            <ArrowRight size={24} color="currentColor" strokeWidth={2.5} />
          </span>
        </button>
      </div>

      {/* Option Selector for Multiple Choice */}
      <AnimatePresence>
        {activeInputId && activeElement?.type === 'multiple-choice' && !checkedPages[currentPageIndex] && (
          <motion.div 
            className="math-keypad-overlay" 
            onClick={() => { setActiveInputId(null); setShowKeypad(false); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="math-keypad-container" 
              initial={{ y: '20px', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '20px', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>정답을 선택하세요</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxWidth: '400px', margin: '0 auto' }}>
                {(shuffledOptionsMap[activeInputId] || activeElement.options || []).map((opt, idx) => (
                  <button
                    key={idx}
                    className="glass-card"
                    style={{
                      padding: '1rem', textAlign: 'center', fontSize: '1.2rem', color: 'white', fontWeight: 'bold',
                      border: answers[activeInputId] === opt ? '2px solid var(--neon-blue)' : '1px solid rgba(255,255,255,0.1)',
                      background: answers[activeInputId] === opt ? 'rgba(0, 243, 243, 0.15)' : 'rgba(255,255,255,0.05)',
                      cursor: 'pointer', borderRadius: '12px', transition: 'all 0.2s',
                      boxShadow: answers[activeInputId] === opt ? '0 0 15px rgba(0,243,255,0.3)' : 'none',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}
                    onClick={() => {
                      soundManager.playClick();
                      setAnswers(prev => ({ ...prev, [activeInputId]: opt }));
                      setActiveInputId(null);
                    }}
                  >
                    {parseInlineFormatting(opt)}
                  </button>
                ))}
              </div>
              <button 
                className="hud-btn secondary" 
                onClick={() => setActiveInputId(null)}
                style={{ width: '100%', maxWidth: '400px', margin: '1.5rem auto 0', display: 'block' }}
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual Keypad Modal Overlay */}
      <AnimatePresence>
        {showKeypad && activeInputId && inputMode === 'math' && (
          <MathKeypad 
            value={answers[activeInputId] || ''}
            onChange={handleKeypadChange}
            onSubmit={() => {
              setShowKeypad(false);
              setActiveInputId(null);
              soundManager.playClick();
            }}
            indicatorText={activeElement?.answer?.includes('/') ? '분수/수식 입력' : '정답 입력'}
            visible={showKeypad}
            onClose={() => {
              setShowKeypad(false);
              setActiveInputId(null);
            }}
            onNativeModeSwitch={() => {
               setInputMode('native');
               setShowKeypad(false);
               soundManager.playClick();
               // Try to focus immediately
               setTimeout(() => {
                 if (activeInputId && inputRefs.current[activeInputId]) {
                   inputRefs.current[activeInputId].focus();
                 }
               }, 10);
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Button for Math Mode explicitly unhidden when in native text mode */}
      {inputMode === 'native' && (
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           style={{ position: 'absolute', bottom: '3rem', left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1000, pointerEvents: 'none' }}
         >
           <button 
             onClick={(e) => { 
                e.stopPropagation();
                setInputMode('math'); 
                if (activeInputId) setShowKeypad(true); 
             }}
             style={{ 
               background: 'var(--crystal-cyan)', color: 'black', border: 'none', 
               borderRadius: '30px', padding: '0.8rem 1.5rem', fontWeight: 'bold', 
               boxShadow: '0 10px 30px rgba(0, 243, 255, 0.5)', cursor: 'pointer', pointerEvents: 'auto'
             }}
           >
             🧮 수학 키패드로 복귀
           </button>
         </motion.div>
      )}
    </div>
  );
};

export default WorkbookPlayer;
