import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import NotebookViewer from './NotebookViewer';
import DailyLearningTimeline from './DailyLearningTimeline';
import { useLearningHistory } from '../../hooks/useLearningHistory';
import '../../styles/space-theme.css';
import { formatFeedbackForDisplay } from '../../utils/feedbackFormatting';

/**
 * Assignment Chronicle (The Logbook / E-Book View)
 * Single-column, book-like view with inline file previews and compact feedback.
 */
const WARNING_POLICY_MESSAGE = '경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.';

const warningTypeLabel = (type) => {
  if (type === 'consecutive_missing_assignment') return '연속 3회 미제출';
  return '불성실 과제 제출';
};

export default function AssignmentChronicle({ assignments, warnings = [], onClose, onAppealRequest }) {
  const validAssignments = useMemo(() => {
    if (!assignments) return [];
    return [...assignments]
      .filter(a => a.status === 'submitted' || a.status === 'reviewed' || a.status === 'needs_revision')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [assignments]);

  const [currentPage, setCurrentPage] = useState(validAssignments.length > 0 ? validAssignments.length - 1 : 0);
  const [showIndex, setShowIndex] = useState(false);
  const [activeTab, setActiveTab] = useState('report'); 
  const [warningModalDismissed, setWarningModalDismissed] = useState(false);

  // Reset page when assignments change
  useEffect(() => {
    if (validAssignments.length > 0 && currentPage >= validAssignments.length) {
      setCurrentPage(validAssignments.length - 1);
    }
    setActiveTab('report');
  }, [validAssignments, currentPage]);

  const nextPage = () => {
    if (currentPage < validAssignments.length - 1) setCurrentPage(p => p + 1);
  };
  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  const currentLog = validAssignments[currentPage] || {};
  const isReviewed = currentLog.status === 'reviewed';
  const isNeedsRevision = currentLog.status === 'needs_revision';
  const bonusCrystals = Number(currentLog.bonusCrystals) || 0;
  const activeWarnings = useMemo(
    () => (warnings || []).filter(item => ['active', 'appealed'].includes(item.status)),
    [warnings]
  );
  const cancelledWarnings = useMemo(
    () => (warnings || []).filter(item => item.status === 'cancelled'),
    [warnings]
  );
  const currentWarnings = useMemo(
    () => activeWarnings.filter(item => (
      item.date === currentLog.date ||
      (item.assignmentId && item.assignmentId === currentLog.id)
    )),
    [activeWarnings, currentLog.date, currentLog.id]
  );
  const currentCancelledWarnings = useMemo(
    () => cancelledWarnings.filter(item => (
      item.date === currentLog.date ||
      (item.assignmentId && item.assignmentId === currentLog.id)
    )),
    [cancelledWarnings, currentLog.date, currentLog.id]
  );

  const showWarningModal = activeWarnings.length > 0 && !warningModalDismissed;

  const { activities, groupedActivities, dailyStats, loading: timelineLoading } = useLearningHistory(
    activeTab === 'timeline' ? currentLog.userId : null, 
    activeTab === 'timeline' ? currentLog.date : null
  );

  if (validAssignments.length === 0) {
    return (
      <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10001, background: 'rgba(5,5,16,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 className="font-title" style={{ color: 'var(--text-muted)' }}>작성된 항해 일지가 없습니다.</h2>
        <button className="space-btn cosmic-btn" onClick={onClose} style={{ marginTop: '2rem' }}>닫기</button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      pointerEvents: 'auto', 
      background: 'rgba(5, 5, 16, 0.98)', 
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10001, // Navbar is 1000, we must be higher
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      <AnimatePresence>
        {showWarningModal && activeWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 10050,
              background: 'rgba(2,6,23,0.82)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.2rem',
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="glass-card"
              style={{
                width: 'min(560px, 100%)',
                padding: '1.5rem',
                border: '1px solid rgba(251,191,36,0.5)',
                background: 'rgba(15,23,42,0.96)',
                boxShadow: '0 20px 70px rgba(0,0,0,0.45)',
              }}
            >
              <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                학습 경고
              </div>
              <h3 className="font-title" style={{ color: 'var(--text-bright)', margin: '0 0 0.8rem', fontSize: '1.45rem' }}>
                경고가 기록되었습니다
              </h3>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1rem' }}>
                현재 누적 경고는 <strong style={{ color: '#fbbf24' }}>{activeWarnings.length}회</strong>입니다.
                {activeWarnings.length >= 3 && (
                  <>
                    <br />
                    {WARNING_POLICY_MESSAGE}
                  </>
                )}
              </div>
              <div style={{ display: 'grid', gap: '0.6rem', maxHeight: 220, overflowY: 'auto', marginBottom: '1rem' }}>
                {activeWarnings.slice(0, 4).map((warning) => (
                  <div key={warning.id} style={{ padding: '0.8rem', borderRadius: 8, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', marginBottom: '0.35rem' }}>
                      <strong style={{ color: '#fbbf24' }}>{warningTypeLabel(warning.type)}</strong>
                      <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{warning.date}</span>
                    </div>
                    <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                      {warning.activeWarningOrdinal ? `${warning.activeWarningOrdinal}번째 학습 경고입니다.` : '학습 경고입니다.'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.2rem' }}>경고 사유</div>
                    <div style={{ color: 'var(--text-bright)', lineHeight: 1.5, fontSize: '0.92rem' }}>{warning.message}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="space-btn cosmic-btn font-tech"
                  onClick={() => setWarningModalDismissed(true)}
                >
                  확인했습니다
                </button>
                <button
                  type="button"
                  className="space-btn font-tech"
                  style={{ borderColor: '#fbbf24', color: '#fbbf24' }}
                  onClick={() => {
                    const target = activeWarnings[0];
                    setWarningModalDismissed(true);
                    onAppealRequest?.(target);
                  }}
                >
                  이의신청하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Persistent Top Bar Container */}
      <div style={{ 
        width: '100%', 
        padding: '1rem 5%', 
        background: 'rgba(5, 5, 16, 0.6)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '1200px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '1rem' 
        }}>
          <button className="space-nav-link font-tech" onClick={onClose} style={{ fontSize: '0.85rem' }}>← 돌아가기</button>
          
          <h2 className="font-title" style={{ 
            color: 'var(--star-gold)', 
            margin: 0, 
            letterSpacing: '2px', 
            fontSize: 'clamp(1rem, 3vw, 1.4rem)', 
            textAlign: 'center',
            flex: 1
          }}>
            항해 일지 (CHRONICLE)
          </h2>

          <button 
            className="space-btn cosmic-btn font-tech" 
            onClick={() => setShowIndex(!showIndex)}
            style={{ 
              borderColor: showIndex ? 'var(--crystal-cyan)' : '', 
              fontSize: '0.8rem', 
              padding: '0.4rem 1rem',
              whiteSpace: 'nowrap'
            }}
          >
            {showIndex ? '목차 닫기' : '항해 목차'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Index Panel (Left Sidebar) */}
        <AnimatePresence>
          {showIndex && (
            <motion.div 
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="glass-card"
              style={{ width: '280px', margin: '1rem 0 1rem 1rem', padding: '1rem', overflowY: 'auto', flexShrink: 0 }}
            >
              <h3 className="font-tech" style={{ color: 'var(--crystal-cyan)', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>항해 목차</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {validAssignments.map((log, idx) => (
                  <button 
                    key={log.id}
                    onClick={() => { setCurrentPage(idx); setShowIndex(false); }}
                    style={{
                      background: currentPage === idx ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                      border: 'none',
                      color: currentPage === idx ? '#fff' : 'var(--text-muted)',
                      textAlign: 'left',
                      padding: '0.6rem 0.8rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span className="font-tech">{log.date}</span>
                    {log.status === 'reviewed' && <span style={{ color: 'var(--crystal-cyan)' }}>✓</span>}
                    {log.status === 'needs_revision' && <span style={{ color: '#ff4500' }}>!</span>}
                    {log.status === 'submitted' && <span style={{ color: 'var(--star-gold)' }}>⏳</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area - Single Column Book */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'stretch', // Keep height for book
          padding: '1rem', 
          gap: '1rem', 
          overflow: 'hidden',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          
          {/* Prev */}
          <button 
            className="cosmic-btn" 
            onClick={prevPage} 
            disabled={currentPage === 0}
            style={{ 
              opacity: currentPage === 0 ? 0.3 : 1, 
              padding: '0.5rem 1rem', 
              fontSize: '1.2rem', 
              flexShrink: 0,
              alignSelf: 'center',
              display: validAssignments.length > 1 ? 'block' : 'none'
            }}
          >◀</button>

          {/* Single Page Content */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentLog.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="glass-card"
              style={{ 
                flex: 1, 
                height: '100%',
                display: 'flex', 
                flexDirection: 'column',
                padding: 0, 
                overflow: 'hidden',
                boxShadow: '0 0 30px rgba(0,0,0,0.5)'
              }}
            >
              {/* Page Header & Tabs */}
              <div style={{ 
                padding: '1.5rem 2rem 0 2rem', 
                borderBottom: '1px solid rgba(255,255,255,0.1)', 
                flexShrink: 0,
                background: 'rgba(0,0,0,0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 className="font-title" style={{ fontSize: '1.4rem', color: 'var(--text-bright)', margin: 0 }}>항해 일지</h3>
                    {/* Status Badge */}
                    {isReviewed && <span className="font-tech" style={{ background: 'rgba(0,212,255,0.2)', color: 'var(--crystal-cyan)', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid var(--crystal-cyan)' }}>✓ APPROVED</span>}
                    {isNeedsRevision && <span className="font-tech siren-pulse" style={{ background: 'rgba(255,69,0,0.2)', color: '#ff4500', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid #ff4500' }}>⚠ REVISION</span>}
                    {currentLog.status === 'submitted' && <span className="font-tech" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid #fbbf24' }}>⏳ 검토 대기</span>}
                    {currentWarnings.length > 0 && <span className="font-tech" style={{ background: 'rgba(251,191,36,0.16)', color: '#fbbf24', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', border: '1px solid #fbbf24' }}>누적 경고 {activeWarnings.length}</span>}
                  </div>
                  <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '1.1rem' }}>{currentLog.date}</span>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <button 
                    onClick={() => setActiveTab('report')}
                    style={{
                      background: 'none', border: 'none',
                      color: activeTab === 'report' ? 'var(--crystal-cyan)' : 'var(--text-muted)',
                      borderBottom: activeTab === 'report' ? '2px solid var(--crystal-cyan)' : '2px solid transparent',
                      padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-tech)'
                    }}
                  >
                    탐사과제 보고서
                  </button>
                  <button 
                    onClick={() => setActiveTab('timeline')}
                    style={{
                      background: 'none', border: 'none',
                      color: activeTab === 'timeline' ? 'var(--crystal-cyan)' : 'var(--text-muted)',
                      borderBottom: activeTab === 'timeline' ? '2px solid var(--crystal-cyan)' : '2px solid transparent',
                      padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer', fontFamily: 'var(--font-tech)'
                    }}
                  >
                    일일 학습 기록
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                {activeTab === 'report' && (
                  <>
                    {bonusCrystals > 0 && (
                      <div style={{
                        marginBottom: '1rem',
                        padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.16), rgba(0, 212, 255, 0.08))',
                        border: '1px solid rgba(255, 215, 0, 0.55)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 0 18px rgba(255, 215, 0, 0.12)'
                      }}>
                        <div>
                          <div className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                            TEACHER BONUS
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                            과제 피드백과 함께 지급된 보너스 광석
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-bright)', fontSize: '1.45rem', fontWeight: 900, whiteSpace: 'nowrap' }}>
                          💎 +{bonusCrystals}
                        </div>
                      </div>
                    )}

                    {currentWarnings.length > 0 && (
                      <div style={{
                        marginBottom: '1rem',
                        padding: '1rem 1.25rem',
                        background: 'rgba(251,191,36,0.08)',
                        border: '1px solid rgba(251,191,36,0.45)',
                        borderRadius: 8,
                      }}>
                        <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.82rem', marginBottom: '0.55rem' }}>
                          학습 경고 · 현재 누적 {activeWarnings.length}회
                        </div>
                        {currentWarnings.map(warning => (
                          <div key={warning.id} style={{ color: 'var(--text-bright)', lineHeight: 1.6, marginBottom: '0.55rem' }}>
                            <strong style={{ color: '#fbbf24' }}>{warningTypeLabel(warning.type)}</strong>
                            <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                              {warning.activeWarningOrdinal ? `${warning.activeWarningOrdinal}번째 학습 경고입니다.` : '학습 경고입니다.'}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>경고 사유</div>
                            <div>{warning.message}</div>
                            {activeWarnings.length >= 3 && (
                              <div style={{ color: '#fca5a5', fontSize: '0.84rem', marginTop: '0.25rem' }}>
                                {warning.policyMessage || WARNING_POLICY_MESSAGE}
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          className="space-btn font-tech"
                          style={{ marginTop: '0.3rem', borderColor: '#fbbf24', color: '#fbbf24', fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
                          onClick={() => onAppealRequest?.(currentWarnings[0])}
                        >
                          이의신청하기
                        </button>
                      </div>
                    )}

                    {currentCancelledWarnings.length > 0 && (
                      <div style={{
                        marginBottom: '1rem',
                        padding: '1rem 1.25rem',
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.35)',
                        borderRadius: 8,
                      }}>
                        <div className="font-tech" style={{ color: '#34d399', fontSize: '0.82rem', marginBottom: '0.55rem' }}>
                          취소된 학습 경고
                        </div>
                        {currentCancelledWarnings.map(warning => (
                          <div key={warning.id} style={{ color: 'var(--text-bright)', lineHeight: 1.6, marginBottom: '0.55rem' }}>
                            <strong style={{ color: '#34d399' }}>{warningTypeLabel(warning.type)} 취소</strong>
                            <div>관리자 검토로 이 날짜의 경고가 취소되었습니다.</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '0.25rem' }}>
                              취소 사유: {warning.cancelReason || '관리자 검토로 경고 취소'}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                              이 기록은 현재 누적 경고 {activeWarnings.length}회에 포함되지 않습니다.
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Feedback Banner (if exists) - shown at top */}
                    {currentLog.feedback && (
                      <div style={{ 
                        marginBottom: '2rem', 
                        padding: '1.2rem 1.5rem', 
                        background: isNeedsRevision ? 'rgba(255,69,0,0.08)' : 'rgba(0,212,255,0.08)', 
                        borderLeft: `4px solid ${isNeedsRevision ? '#ff4500' : 'var(--crystal-cyan)'}`,
                        borderRadius: '0 8px 8px 0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '1rem' }}>📡</span>
                          <span className="font-tech" style={{ fontSize: '0.8rem', color: isNeedsRevision ? '#ff4500' : 'var(--crystal-cyan)' }}>사령부 피드백</span>
                          {bonusCrystals > 0 && (
                            <span className="font-tech" style={{ marginLeft: 'auto', color: 'var(--star-gold)', fontSize: '0.9rem', fontWeight: 900 }}>💎 +{bonusCrystals} 보너스</span>
                          )}
                        </div>
                        <div className="markdown-content feedback-markdown" style={{ color: 'var(--text-bright)', lineHeight: '1.75', fontSize: '0.95rem' }}>
                          <ReactMarkdown>{formatFeedbackForDisplay(currentLog.feedback)}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Main Written Content */}
                    <div className="markdown-content" style={{ color: 'var(--text-bright)', lineHeight: '1.8', fontSize: '1.05rem', marginBottom: '2rem' }}>
                      <ReactMarkdown>{currentLog.content}</ReactMarkdown>
                    </div>

                    {/* Inline File Previews */}
                    {currentLog.attachments?.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 className="font-tech" style={{ color: 'var(--star-gold)', marginBottom: '1rem', fontSize: '0.9rem' }}>첨부 자료</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {currentLog.attachments.map((att, i) => (
                            <FilePreview key={i} attachment={att} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Link Previews */}
                    {currentLog.links?.length > 0 && (
                      <div style={{ marginBottom: '2rem' }}>
                        <h4 className="font-tech" style={{ color: 'var(--star-gold)', marginBottom: '1rem', fontSize: '0.9rem' }}>참고 링크</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {currentLog.links.map((lnk, i) => (
                            <LinkPreview key={i} link={lnk} notebookData={currentLog.notebookData} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'timeline' && (
                  <DailyLearningTimeline 
                    groupedActivities={groupedActivities}
                    activities={activities} 
                    dailyStats={dailyStats}
                    loading={timelineLoading} 
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Next */}
          <button 
            className="cosmic-btn" 
            onClick={nextPage}
            disabled={currentPage === validAssignments.length - 1}
            style={{ 
              opacity: currentPage === validAssignments.length - 1 ? 0.3 : 1, 
              padding: '0.5rem 1rem', 
              fontSize: '1.2rem', 
              flexShrink: 0,
              alignSelf: 'center',
              display: validAssignments.length > 1 ? 'block' : 'none'
            }}
          >▶</button>
        </div>
      </div>
      
      {/* Page Indicator */}
      <div style={{ padding: '0.8rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
        <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          PAGE {currentPage + 1} OF {validAssignments.length}
        </span>
      </div>
    </div>
  );
}

/**
 * Inline file preview component
 * - Images: rendered inline
 * - PDFs: embedded iframe viewer
 * - Code files (.py, .js, .html, .css, .md, .txt, .json): fetched and displayed in a code block
 * - Others: download link
 */
function FilePreview({ attachment }) {
  const { name, url, type } = attachment;
  const ext = (type || name?.split('.').pop() || '').toLowerCase();
  const [codeContent, setCodeContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
  const isPdf = ext === 'pdf';
  const isCode = ['py', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'txt', 'md', 'java', 'c', 'cpp', 'h', 'rb', 'go', 'rs', 'sql', 'sh', 'bat', 'yaml', 'yml', 'xml', 'csv'].includes(ext);

  // Fetch code content for text-based files
  useEffect(() => {
    if (isCode && url && !codeContent) {
      setLoading(true);
      fetch(url)
        .then(res => res.text())
        .then(text => {
          setCodeContent(text);
          setLoading(false);
        })
        .catch(() => {
          setCodeContent('// 파일을 불러올 수 없습니다.');
          setLoading(false);
        });
    }
  }, [isCode, url, codeContent]);

  // Image Preview
  if (isImage) {
    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>🖼️ {name}</span>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>새 탭에서 보기 ↗</a>
        </div>
        <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '6px', objectFit: 'contain', display: 'block' }} />
      </div>
    );
  }

  // PDF Preview
  if (isPdf) {
    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📑 {name}</span>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>새 탭에서 보기 ↗</a>
        </div>
        <iframe src={url} title={name} style={{ width: '100%', height: '600px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: '#fff' }} />
      </div>
    );
  }

  // Code / Text Preview
  if (isCode) {
    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)' }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📝 {name}</span>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>다운로드 ↗</a>
        </div>
        {loading ? (
          <div className="font-tech" style={{ color: 'var(--text-muted)', padding: '1rem' }}>로딩 중...</div>
        ) : (
          <pre style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '1rem',
            margin: 0,
            overflowX: 'auto',
            maxHeight: '500px',
            overflowY: 'auto',
            color: '#e0e0e0',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            whiteSpace: 'pre'
          }}>
            {codeContent}
          </pre>
        )}
      </div>
    );
  }

  // Default: Download Link
  return (
    <a href={url} target="_blank" rel="noreferrer" className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '1rem', color: 'white', textDecoration: 'none', background: 'rgba(0, 212, 255, 0.05)', gap: '0.5rem' }}>
      <span style={{ fontSize: '1.5rem' }}>📄</span>
      <span style={{ flex: 1 }}>{name}</span>
      <span className="font-tech" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem' }}>다운로드 ↗</span>
    </a>
  );
}

/**
 * Link Preview component
 * - YouTube: embedded player (iframe allowed)
 * - Google Colab: branded card with open button (iframe blocked by Google)
 * - Google Drive: embedded viewer (iframe allowed with /preview)
 * - Others: card with domain info and open button
 */
function LinkPreview({ link, notebookData }) {
  const { url } = link;

  // YouTube detection
  const getYouTubeId = (rawUrl) => {
    const match = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  // Site detection
  const isColab = url.includes('colab.research.google.com');
  const isDrive = url.includes('drive.google.com');
  const youtubeId = getYouTubeId(url);

  // Extract readable info from URL
  const getDomain = (rawUrl) => {
    try { return new URL(rawUrl).hostname; } catch { return rawUrl; }
  };

  const getColabTitle = (rawUrl) => {
    // Try to extract notebook name from URL path
    const parts = rawUrl.split('/');
    const lastPart = parts[parts.length - 1]?.split('?')[0];
    if (lastPart && lastPart !== 'drive' && lastPart.length > 5) {
      return `Colab Notebook`;
    }
    return 'Google Colab Notebook';
  };

  // YouTube embed (allowed by YouTube)
  if (youtubeId) {
    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>▶️ YouTube</span>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>새 탭에서 보기 ↗</a>
        </div>
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe 
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '6px' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Google Colab - inline notebook viewer
  if (isColab) {
    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <NotebookViewer colabUrl={url} cachedData={notebookData} />
      </div>
    );
  }

  // Google Drive - try iframe with /preview endpoint
  if (isDrive) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const embedUrl = fileIdMatch 
      ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
      : url;

    return (
      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📁 Google Drive</span>
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)', fontSize: '0.8rem', textDecoration: 'none' }}>Drive에서 열기 ↗</a>
        </div>
        <iframe 
          src={embedUrl}
          title="Google Drive"
          style={{ width: '100%', height: '500px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: '#fff' }}
          allow="autoplay"
        />
      </div>
    );
  }

  // General URL: branded card with domain info
  const domain = getDomain(url);
  const isGithub = domain.includes('github.com');
  const isNotion = domain.includes('notion.so') || domain.includes('notion.site');

  // Pick brand color and icon
  let brandIcon = '🔗';
  let brandColor = 'var(--neon-blue)';
  let brandName = domain;
  if (isGithub) { brandIcon = '🐙'; brandColor = '#8b5cf6'; brandName = 'GitHub'; }
  else if (isNotion) { brandIcon = '📝'; brandColor = '#999'; brandName = 'Notion'; }
  else if (domain.includes('kaggle.com')) { brandIcon = '📊'; brandColor = '#20beff'; brandName = 'Kaggle'; }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noreferrer"
      className="glass-card"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '1rem 1.2rem', 
        background: 'rgba(0,0,0,0.2)',
        textDecoration: 'none',
        gap: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: `1px solid rgba(255,255,255,0.1)`
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = brandColor}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
    >
      <div style={{ 
        width: '40px', height: '40px', 
        background: `rgba(255,255,255,0.05)`, 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '1.4rem',
        flexShrink: 0
      }}>
        {brandIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-tech" style={{ color: brandColor, fontSize: '0.7rem', marginBottom: '0.2rem' }}>{brandName.toUpperCase()}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
      </div>
      <div style={{ 
        color: brandColor, 
        fontSize: '0.8rem', 
        flexShrink: 0
      }}>
        열기 ↗
      </div>
    </a>
  );
}
