import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStudentReport } from '../../hooks/useStudentReport';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Legend
} from 'recharts';
import { toPng } from 'html-to-image';
import { Download, ArrowLeft } from 'lucide-react';
import { formatFeedbackForDisplay } from '../../utils/feedbackFormatting';
import './StudentReport.css';

// ══════════════════════════════════════════════════
// Colors
// ══════════════════════════════════════════════════
const CLUSTER_COLORS = {
  'cluster_elementary': '#f472b6',
  'python': '#00ffa0',
  'middle-math': '#45aaf2',
  'western-classic': '#fbbf24',
  'math-history': '#a55eea'
};

// ══════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════
const formatTimeSeconds = (seconds) => {
  if (!seconds || seconds <= 0) return '0분';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
};

const formatTimeMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return '0분';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
};

// ══════════════════════════════════════════════════
// StudentReport Component
// ══════════════════════════════════════════════════
export default function StudentReport({ userId, days = 30, onDaysChange, onBack, isParentView = false }) {
  const { data: report, isLoading, error } = useStudentReport(userId, days);
  const [selectedCluster, setSelectedCluster] = useState('all');
  const reportRef = useRef(null);

  const handleExportImage = async () => {
    if (!reportRef.current) return;
    try {
      const dataUrl = await toPng(reportRef.current, {
        backgroundColor: '#0a0e1a',
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains('report-toolbar')
      });
      const link = document.createElement('a');
      link.download = `${report?.student?.name || 'student'}_리포트_${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('이미지 저장에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <div className="report-spinner" />
          <span>학습 데이터를 분석하고 있습니다...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="report-container">
        <div className="report-loading">
          <span style={{ color: '#ff6b6b' }}>⚠️ 리포트를 생성할 수 없습니다: {error?.message || '데이터가 없습니다.'}</span>
          {onBack && <button onClick={onBack} style={{ marginTop: 16, padding: '8px 20px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: 'white', cursor: 'pointer' }}>← 돌아가기</button>}
        </div>
      </div>
    );
  }

  const { student, activeClusters, REGION_NAMES, REGION_TO_CLUSTER, attendance, learning, assignments, progress, peerComparison, predictions, focusIndex, insights, meta } = report;

  const isAll = selectedCluster === 'all';
  const parentClusterId = !isAll ? REGION_TO_CLUSTER?.[selectedCluster] : null;

  const cAttendance = isAll ? attendance : (attendance.byCluster[parentClusterId] || { totalDays: 0, lateDays: 0, lateRate: 0 });
  const cLearning = isAll ? learning : (learning.byCluster[selectedCluster] || { videoSeconds: 0, quizCount: 0, avgScore: null });
  const cAssignments = isAll ? assignments : (assignments.byCluster[parentClusterId] || { count: 0, reviewed: 0 });

  const displayAttendanceDays = cAttendance.totalDays || 0;
  const displayLateDays = cAttendance.lateDays || 0;
  const displayLateRate = cAttendance.lateRate || 0;

  const displayVideoSeconds = isAll ? learning.totalVideoSeconds : (cLearning.videoSeconds || 0);
  const displayVideoFormatted = formatTimeSeconds(displayVideoSeconds);
  const displayQuizCount = isAll ? learning.totalQuizCount : (cLearning.quizCount || 0);
  const displayAvgScore = isAll ? learning.avgQuizScore : cLearning.avgScore;

  const displayAssignments = isAll ? assignments.totalCount : (cAssignments.count || 0);
  const displayReviewed = isAll ? assignments.reviewedCount : (cAssignments.reviewed || 0);
  const assignmentAttendanceRatio = displayAttendanceDays > 0
    ? Math.round((displayAssignments / displayAttendanceDays) * 100)
    : 0;
  const assignmentAttendanceLabel = `${assignmentAttendanceRatio}%(${displayAssignments}/${displayAttendanceDays})`;

  return (
    <div className="report-container" ref={reportRef}>
      {/* ═══ HEADER ═══ */}
      <div className="report-header">
        <div className="report-header-inner">
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <ArrowLeft size={16} /> 돌아가기
            </button>
          )}
          <h1 className="report-title">📊 {student.name} 학생 성장 리포트</h1>
          <p className="report-subtitle">
            최근 {meta.days}일간의 학습 데이터 분석 · {meta.generatedAt.toLocaleDateString('ko-KR')} 생성
          </p>
          <div className="report-meta-badges">
            <span className="report-badge" style={{ color: '#00ffa0' }}>💎 {student.crystals.toLocaleString()} 크리스탈</span>
            <span className="report-badge" style={{ color: '#fbbf24' }}>🔥 {student.streak}일 연속 출석</span>
            {student.joinedAt && <span className="report-badge" style={{ color: '#45aaf2' }}>📅 가입 {Math.floor((Date.now() - student.joinedAt.getTime()) / 86400000)}일째</span>}
            <span className="report-badge" style={{ color: '#f472b6' }}>🎯 집중도 {focusIndex.label}</span>
          </div>

          {/* Toolbar */}
          <div className="report-toolbar" style={{ marginTop: 18 }}>
            <select value={selectedCluster} onChange={(e) => setSelectedCluster(e.target.value)}>
              <option value="all">모든 과정 종합</option>
              {activeClusters.map(cid => (
                <option key={cid} value={cid}>{REGION_NAMES?.[cid] || cid}</option>
              ))}
            </select>
            <select value={days} onChange={(e) => onDaysChange?.(Number(e.target.value))}>
              <option value={30}>최근 30일</option>
              <option value={60}>최근 60일</option>
              <option value={90}>최근 90일</option>
            </select>
            <button className="primary" onClick={handleExportImage}>
              <Download size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> 이미지 저장
            </button>
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="report-body">

        {/* ─── Section 1: Dashboard Stats ─── */}
        <div className="report-section">
          <div className="report-section-header">
            <span className="report-section-icon">📈</span>
            <h2 className="report-section-title">출석 · 학습 · 과제 종합 {isAll ? '' : `(${REGION_NAMES?.[selectedCluster] || selectedCluster})`}</h2>
          </div>
          <div className="report-section-body">
            <div className="report-stats-grid">
              <div className="report-stat-card stat-green">
                <div className="report-stat-value">{displayAttendanceDays}</div>
                <div className="report-stat-label">출석일</div>
                <div className="report-stat-sub">지각 {displayLateDays}회 ({displayLateRate}%)</div>
              </div>
              <div className="report-stat-card stat-purple">
                <div className="report-stat-value" style={{ fontSize: displayVideoFormatted.length > 5 ? '1.4rem' : '1.8rem' }}>{displayVideoFormatted}</div>
                <div className="report-stat-label">영상 시청</div>
                <div className="report-stat-sub">{isAll ? `활성 학습일 ${learning.activeDays}일` : '-'}</div>
              </div>
              <div className="report-stat-card stat-blue">
                <div className="report-stat-value">{displayQuizCount}</div>
                <div className="report-stat-label">퀴즈 수행</div>
                <div className="report-stat-sub">평균 {displayAvgScore ?? '집계 중'}점</div>
              </div>
              <div className="report-stat-card stat-gold">
                <div className="report-stat-value">{displayAssignments}</div>
                <div className="report-stat-label">과제 제출</div>
                <div className="report-stat-sub">확인완료 {displayReviewed}건</div>
              </div>
              <div className="report-stat-card stat-pink">
                <div className="report-stat-value">{focusIndex.score}</div>
                <div className="report-stat-label">집중도 점수</div>
                <div className="report-stat-sub">
                  {focusIndex.totalOpportunities > 0
                    ? `${focusIndex.hitCount}/${focusIndex.totalOpportunities} 광석 획득 · ${focusIndex.label}`
                    : focusIndex.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Section 2: Weekly Trend ─── */}
        {learning.weeklyTrend.length > 1 && (
          <div className="report-section">
            <div className="report-section-header">
              <span className="report-section-icon">📉</span>
              <h2 className="report-section-title">주간 학습 추이</h2>
            </div>
            <div className="report-section-body">
              {/* --- Video Chart --- */}
              <div className="report-weekly-chart-wrapper">
                <div style={{fontSize: '0.8rem', color: '#a55eea', marginBottom: 8}}>■ 영상 시청 추이</div>
                <div style={{ height: 180, width: '100%', position: 'relative', minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <LineChart data={learning.weeklyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={(v) => v.slice(5).replace('-','/')} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                      <Tooltip 
                        contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem' }} 
                        formatter={(value, name) => [formatTimeMinutes(value), name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }} />
                      {isAll ? activeClusters.map(cid => (
                        <Line key={`v-${cid}`} type="monotone" dataKey={`video_${cid}`} name={REGION_NAMES?.[cid]||cid} stroke={CLUSTER_COLORS[cid] || '#fff'} strokeWidth={2} dot={{ r: 3 }} />
                      )) : (
                        <Line type="monotone" dataKey={`video_${selectedCluster}`} name={REGION_NAMES?.[selectedCluster]||selectedCluster} stroke={CLUSTER_COLORS[selectedCluster] || '#a55eea'} strokeWidth={2} dot={{ r: 4 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* --- Quiz Chart --- */}
              <div className="report-weekly-chart-wrapper" style={{ marginTop: 32 }}>
                <div style={{fontSize: '0.8rem', color: '#00ffa0', marginBottom: 8}}>■ 퀴즈 수행 추이 (회)</div>
                <div style={{ height: 180, width: '100%', position: 'relative', minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <LineChart data={learning.weeklyTrend} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="week" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={(v) => v.slice(5).replace('-','/')} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1a1b2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'white', fontSize: '0.85rem' }} />
                      <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }} />
                      {isAll ? activeClusters.map(cid => (
                        <Line key={`q-${cid}`} type="monotone" dataKey={`quiz_${cid}`} name={REGION_NAMES?.[cid]||cid} stroke={CLUSTER_COLORS[cid] || '#fff'} strokeWidth={2} dot={{ r: 3 }} />
                      )) : (
                        <Line type="monotone" dataKey={`quiz_${selectedCluster}`} name={REGION_NAMES?.[selectedCluster]||selectedCluster} stroke={CLUSTER_COLORS[selectedCluster] || '#00ffa0'} strokeWidth={2} dot={{ r: 4 }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Section 3: Hourly Pattern ─── */}
        <div className="report-section">
          <div className="report-section-header">
            <span className="report-section-icon">🕐</span>
            <h2 className="report-section-title">시간대별 학습 패턴</h2>
          </div>
          <div className="report-section-body">
            <HourlyHeatmap data={learning.dailyPattern} />
          </div>
        </div>

        {/* ─── Section 4: Peer Comparison ─── */}
        {Object.values(peerComparison).some(comp => comp.available) && (
          <div className="report-section">
            <div className="report-section-header">
              <span className="report-section-icon">👥</span>
              <h2 className="report-section-title">과정별 성과 비교</h2>
            </div>
            <div className="report-section-body">
              <div className="report-peer-grid">
                {Object.entries(peerComparison).filter(([, comp]) => comp.available).map(([clusterId, comp]) => (
                  <PeerComparisonCard key={clusterId} comp={comp} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Section 5: Predictions ─── */}
        {Object.values(predictions).some(p => p.available) && (
          <div className="report-section">
            <div className="report-section-header">
              <span className="report-section-icon">🔮</span>
              <h2 className="report-section-title">예상 완강일</h2>
            </div>
            <div className="report-section-body">
              <div className="report-stats-grid">
                {Object.entries(predictions).filter(([, p]) => p.available).map(([clusterId, pred]) => (
                  <div key={clusterId} className="report-stat-card stat-blue">
                    <div className="report-stat-value" style={{ fontSize: '1.2rem' }}>
                      {pred.isCompleted ? '완료됨' : (pred.predictedDate || '계산 중')}
                    </div>
                    <div className="report-stat-label">{pred.clusterName}</div>
                    <div className="report-stat-sub" style={{ marginTop: '8px', lineHeight: '1.4' }}>
                      {pred.isCompleted 
                        ? `전체 완강 🌟` 
                        : (
                          <>
                            {pred.frontierUnitTitle && (
                              <div style={{ color: '#00ffa0', marginBottom: '4px' }}>
                                📍 {pred.frontierChapterTitle && `${pred.frontierChapterTitle} - `}{pred.frontierUnitTitle} (진도 {pred.progressPercentage}%)
                              </div>
                            )}
                            <div>실제 완료: {pred.completedUnits}개 · 예상 잔여: {pred.remainingUnits}단원</div>
                          </>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Section 6: Recent Assignments ─── */}
        {assignments.recentList.length > 0 && (
          <div className="report-section">
            <div className="report-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="report-section-icon">📝</span>
                <h2 className="report-section-title">최근 과제 하이라이트</h2>
                <span className="report-badge" style={{ color: '#45aaf2' }}>
                  출석 대비 과제 제출 {assignmentAttendanceLabel}
                </span>
              </div>
            </div>
            <div className="report-section-body">
              {assignments.recentList.map(a => (
                <div key={a.id} className="report-assignment-item">
                  <div className="report-assignment-date">
                    {a.date} · {REGION_NAMES?.[a.regionId || a.clusterId] || a.regionId || a.clusterId}
                    <span className="report-assignment-status" style={{
                      background: a.status === 'reviewed' ? 'rgba(0,255,160,0.15)' : a.status === 'needs_revision' ? 'rgba(255,69,0,0.15)' : 'rgba(251,191,36,0.15)',
                      color: a.status === 'reviewed' ? '#00ffa0' : a.status === 'needs_revision' ? '#ff4500' : '#fbbf24'
                    }}>
                      {a.status === 'reviewed' ? '✅ 확인완료' : a.status === 'needs_revision' ? '🔄 보완요청' : '⏳ 대기중'}
                    </span>
                    {a.bonusCrystals > 0 && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#fbbf24' }}>💎 +{a.bonusCrystals}</span>}
                  </div>
                  <div className="report-assignment-content">
                    {(a.content || '').length > 150 ? a.content.slice(0, 150) + '...' : a.content}
                  </div>
                  {a.feedback && (
                    <div className="report-assignment-feedback">
                      <div className="report-assignment-feedback-label">💬 피드백</div>
                      <ReactMarkdown>{formatFeedbackForDisplay(a.feedback)}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Section 7: Insights ─── */}
        <div className="report-section">
          <div className="report-section-header">
            <span className="report-section-icon">💡</span>
            <h2 className="report-section-title">강점 & 성장 포인트</h2>
          </div>
          <div className="report-section-body">
            {insights.strengths.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', color: '#00ffa0', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                  ✨ 강점
                </div>
                {insights.strengths.map((s, i) => (
                  <div key={`s-${i}`} className="report-insight-card strength">
                    <div className="report-insight-icon">{s.icon}</div>
                    <div>
                      <div className="report-insight-title">{s.title}</div>
                      <p className="report-insight-detail">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {insights.growthPoints.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700, marginBottom: 10, marginTop: 20, textTransform: 'uppercase', letterSpacing: 1 }}>
                  🌱 성장 포인트
                </div>
                {insights.growthPoints.map((g, i) => (
                  <div key={`g-${i}`} className="report-insight-card growth">
                    <div className="report-insight-icon">{g.icon}</div>
                    <div>
                      <div className="report-insight-title">{g.title}</div>
                      <p className="report-insight-detail">{g.detail}</p>
                    </div>
                  </div>
                ))}
              </>
            )}
            {insights.strengths.length === 0 && insights.growthPoints.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.4)' }}>
                데이터가 더 쌓이면 자동으로 분석 결과가 표시됩니다.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', padding: '20px 0' }}>
          수학감각 · {meta.generatedAt.toLocaleDateString('ko-KR')} {meta.generatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 생성
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════

function HourlyHeatmap({ data }) {
  const max = Math.max(...data, 1);
  return (
    <>
      <div className="report-heatmap">
        {data.map((count, hour) => {
          const intensity = count / max;
          const bg = count === 0
            ? 'rgba(255,255,255,0.03)'
            : `rgba(165, 94, 234, ${0.15 + intensity * 0.7})`;
          return (
            <div
              key={hour}
              className="report-heatmap-cell"
              style={{ background: bg }}
              title={`${hour}시: ${count}건`}
            />
          );
        })}
      </div>
      <div className="report-heatmap-labels">
        {data.map((_, hour) => (
          <div key={hour} className="report-heatmap-label">
            {hour % 3 === 0 ? `${hour}` : ''}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
        주로 활동하는 시간대: {getPeakHours(data)}
      </div>
    </>
  );
}

function getPeakHours(data) {
  const sorted = data.map((count, hour) => ({ hour, count }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return '데이터 없음';
  const top = sorted.slice(0, 3).map(d => `${d.hour}시`);
  return top.join(', ');
}

function PeerComparisonCard({ comp }) {
  if (!comp.available) {
    return (
      <div className="report-peer-card">
        <div className="report-peer-card-title">{comp.clusterName}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>비교 데이터가 부족합니다.</div>
      </div>
    );
  }

  const percentileClass = comp.percentile >= 70 ? 'percentile-top'
    : comp.percentile >= 40 ? 'percentile-mid' : 'percentile-low';
  const percentileLabel = comp.percentile >= 80 ? `상위 ${100 - comp.percentile}%`
    : comp.percentile >= 50 ? '중상위권' : '성장 잠재력 높음';

  const comparisons = [
    { label: '평균 점수', my: comp.myAvgScore, class: comp.classAvgScore, format: v => `${v}점`, color: '#00ffa0' },
    { label: '영상 시청', my: comp.myVideoHours * 60, class: comp.classAvgVideoHours * 60, format: formatTimeMinutes, color: '#a55eea' },
    { label: '퀴즈 수행', my: comp.myQuizCount, class: comp.classAvgQuizCount, format: v => `${v}회`, color: '#45aaf2' },
  ];

  return (
    <div className="report-peer-card">
      <div className="report-peer-card-title">
        {comp.clusterName}
        <span className={`report-percentile-badge ${percentileClass}`}>
          {percentileLabel}
        </span>
      </div>
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
        전체 {comp.totalStudents}명 기준
      </div>
      {comparisons.map(c => {
        const maxVal = Math.max(c.my, c.class, 1);
        return (
          <div key={c.label} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <span>{c.label}</span>
              <span>나 {c.format(c.my)} / 평균 {c.format(c.class)}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, height: 6 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(c.my / maxVal) * 100}%`, height: '100%', background: c.color, borderRadius: 3, transition: 'width 0.6s' }} />
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(c.class / maxVal) * 100}%`, height: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: 3, transition: 'width 0.6s' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              <span style={{ color: c.color }}>▲ 나</span>
              <span>▲ 전체 평균</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
