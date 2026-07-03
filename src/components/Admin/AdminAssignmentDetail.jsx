import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  useAssignmentWarningsForAssignment,
  useCancelAssignmentWarning,
  useIssueAssignmentWarning,
  useRejectWarningAppeal,
  useReviewAssignment,
  useStudentAssignmentWarnings,
} from '../../hooks/useAssignments';
import {
  buildAssignmentFeedbackContext,
  createFallbackAssignmentFeedback,
  saveAssignmentAiFeedback,
} from '../../services/assignmentFeedbackService';
import { generateAssignmentFeedback } from '../../services/zcodeApiService';
import { formatFeedbackForDisplay } from '../../utils/feedbackFormatting';
import FileViewerModal from './FileViewerModal';
import { AlertTriangle, CheckCircle, Eye, XCircle } from 'lucide-react';

const WARNING_POLICY_MESSAGE = '경고 3회 누적 시 수강료가 10% 인상될 수 있습니다.';

const WARNING_TYPE_LABELS = {
  poor_assignment_submission: '불성실 과제 제출',
  consecutive_missing_assignment: '연속 3회 미제출',
};

const getDefaultWarningMessage = (assignment) => {
  if (assignment?.aiFeedbackPayload?.revisionRequest) {
    return assignment.aiFeedbackPayload.revisionRequest;
  }
  return '이번 과제는 학습 기록과 제출 내용이 충분히 일치하지 않아 성실한 과제 수행으로 확인하기 어렵습니다.';
};

export default function AdminAssignmentDetail({ assignment, onReviewed }) {
  const reviewMutation = useReviewAssignment();
  const issueWarningMutation = useIssueAssignmentWarning();
  const cancelWarningMutation = useCancelAssignmentWarning();
  const rejectAppealMutation = useRejectWarningAppeal();
  const { data: assignmentWarnings = [] } = useAssignmentWarningsForAssignment(assignment?.id);
  const { data: studentWarnings = [] } = useStudentAssignmentWarnings(assignment?.userId, assignment?.clusterId);
  
  const [feedback, setFeedback] = useState(assignment?.feedback || '');
  const [bonusCrystals, setBonusCrystals] = useState(assignment?.bonusCrystals ?? 40);
  const [feedbackStyle, setFeedbackStyle] = useState('balanced');
  const [aiFeedback, setAiFeedback] = useState(assignment?.aiFeedbackPayload || null);
  const [aiContext, setAiContext] = useState(null);
  const [aiAction, setAiAction] = useState('');
  const [aiError, setAiError] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [shouldIssueWarning, setShouldIssueWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState(getDefaultWarningMessage(assignment));
  const [warningCancelReason, setWarningCancelReason] = useState('');
  const [appealResponse, setAppealResponse] = useState('');

  useEffect(() => {
    setFeedback(assignment?.feedback || '');
    setBonusCrystals(assignment?.bonusCrystals ?? 40);
    setAiFeedback(assignment?.aiFeedbackPayload || (assignment?.aiFeedbackDraft ? {
      studentFeedback: assignment.aiFeedbackDraft,
      evidence: assignment.aiFeedbackEvidence || [],
      rubricScores: assignment.aiFeedbackRubricScores || {},
    } : null));
    setAiContext(null);
    setAiError('');
    setShouldIssueWarning(false);
    setWarningMessage(getDefaultWarningMessage(assignment));
    setWarningCancelReason('');
    setAppealResponse('');
  }, [assignment]);

  if (!assignment) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
        왼쪽 목록에서 과제를 선택하세요.
      </div>
    );
  }

  if (assignment.isMock) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ flex: '3', padding: '1.5rem', overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', pb: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ margin: 0 }}>{assignment.userName} 대원의 보고서 <span style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem'}}>({assignment.clusterId})</span></h3>
            <span style={{ color: 'var(--crystal-cyan)' }}>{assignment.date}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px', color: '#ef4444', fontWeight: 'bold' }}>
            이 날짜에 출석은 하였으나, 과제를 제출하지 않았습니다.
          </div>
        </div>
      </div>
    );
  }

  const handleReview = async (status) => {
    const isApproved = status === 'reviewed';
    if (!isApproved && !feedback.trim()) {
      alert("보완요청/누락 처리 시에는 피드백(사유)을 반드시 입력해야 합니다.");
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        assignmentId: assignment.id,
        userId: assignment.userId,
        feedback,
        status,
        bonusCrystals: isApproved ? Number(bonusCrystals) : 0,
        previousBonusCrystals: assignment.status === 'reviewed' ? (assignment.bonusCrystals || 0) : 0,
        previousStatus: assignment.status
      });
      if (shouldIssueWarning) {
        await issueWarningMutation.mutateAsync({
          assignment,
          type: 'poor_assignment_submission',
          message: warningMessage,
          evidence: {
            reason: 'admin_review',
            assignmentStatus: status,
            suggestedBonusCrystals: Number(bonusCrystals) || 0,
            aiEvidence: aiFeedback?.evidence || assignment.aiFeedbackEvidence || [],
          },
        });
      }
      alert("검토 처리되었습니다.");
      if (onReviewed) onReviewed({ ...assignment, status, feedback, bonusCrystals: isApproved ? Number(bonusCrystals) : 0 });
    } catch (error) {
      console.error("Review failed:", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const applyMacro = (text) => {
    setFeedback(prev => prev + (prev ? '\n\n' : '') + text);
  };

  const handlePreview = (att) => {
    setPreviewFile(att);
    setIsPreviewOpen(true);
  };

  const handleGenerateAiFeedback = async () => {
    if (!assignment?.id || aiAction) return;

    setAiAction('generating');
    setAiError('');

    try {
      const context = await buildAssignmentFeedbackContext(assignment, feedbackStyle);
      setAiContext(context);

      let payload;
      try {
        payload = await generateAssignmentFeedback(context, feedbackStyle);
      } catch (error) {
        console.warn('AI feedback generation failed; using local fallback:', error);
        payload = createFallbackAssignmentFeedback(context, feedbackStyle);
        setAiError('AI 호출에 실패해 로컬 규칙 기반 초안을 생성했습니다. 문장을 한 번 더 확인해주세요.');
      }

      const nextPayload = {
        ...payload,
        feedbackStyle,
        contextSummary: {
          studentName: context.student.name,
          courseLabel: context.student.courseLabel,
          previousCount: context.previousSubmissions.length,
          sameDayCount: context.sameDaySubmissions.length,
          learningActivityCount: context.dailyLearningSummary.activityCount,
          allLearningActivityCount: context.dailyLearningSummary.allActivityCount ?? context.dailyLearningSummary.activityCount,
          excludedOtherCourseTitles: context.dailyLearningSummary.excludedOtherCourseTitles || [],
          codeTraceCount: context.dailyLearningSummary.codeTraceCount || 0,
          codeTraceProgressCount: context.dailyLearningSummary.codeTraceProgressCount || 0,
          codeTraces: context.dailyLearningSummary.codeTraces || [],
          inProgressCodeTraces: context.dailyLearningSummary.inProgressCodeTraces || [],
          codeTraceTitles: [
            ...(context.dailyLearningSummary.codeTraces || []).map(item => {
              const count = `${item.completedExerciseCount || 0}/${item.totalExerciseCount || '?'}`;
              const accuracy = item.accuracy != null ? ` ${item.accuracy}%` : '';
              return `${item.title || 'CODE TRACE'} 완료 ${count}${accuracy}`;
            }),
            ...(context.dailyLearningSummary.inProgressCodeTraces || []).map(item => {
              const count = `${item.completedExerciseCount || 0}/${item.totalExerciseCount || '?'}`;
              const accuracy = item.bestAccuracy != null ? ` 최고 ${item.bestAccuracy}%` : '';
              return `${item.title || 'CODE TRACE'} 진행 ${count}${accuracy}`;
            })
          ],
          learningLoad: context.dailyLearningSummary.learningLoad || null,
          attention: context.dailyLearningSummary.attention || null,
          codeComparisonSummary: context.currentSubmission.codeComparison?.summary || '',
          darkMatterCount: context.darkMatterSummary.totalActive,
        },
      };

      await saveAssignmentAiFeedback(assignment.id, nextPayload);
      setAiFeedback(nextPayload);
      setFeedback(nextPayload.studentFeedback || '');
      if (Number.isFinite(Number(nextPayload.suggestedBonusCrystals))) {
        setBonusCrystals(Number(nextPayload.suggestedBonusCrystals));
      }
      if (context.feedbackPolicyGuidance?.isVeryLowLearning) {
        setShouldIssueWarning(true);
        const videoMinutes = Number(context.feedbackPolicyGuidance.videoMinutes || 0);
        const codeComparisonSummary = context.currentSubmission.codeComparison?.summary || '';
        const hasCodeImprovement = Boolean(
          context.currentSubmission.codeComparison?.currentCodeAvailable &&
          context.currentSubmission.codeComparison?.previousCodeAvailable &&
          !context.currentSubmission.codeComparison?.isIdenticalToPrevious &&
          ((context.currentSubmission.codeComparison?.addedLineCount || 0) > 0 ||
            (context.currentSubmission.codeComparison?.removedLineCount || 0) > 0)
        );
        setWarningMessage(
          `${context.student.courseLabel} 제출일 학습 기록이 매우 낮습니다` +
          (videoMinutes > 0 ? `(${videoMinutes}분). ` : '. ') +
          (hasCodeImprovement
            ? `첨부 코드 개선은 확인됩니다(${codeComparisonSummary}). 다만 학습 기록과 제출 설명의 일치 여부는 별도 확인이 필요합니다.`
            : context.currentSubmission.codeComparison?.currentCodeAvailable
              ? `첨부 코드(${context.currentSubmission.codeComparison.currentFileName || '코드 파일'})는 별도 검토했으나, 제출일 학습 기록이 경고 기준에 해당합니다.`
              : '영상/퀴즈/데이터 로그/코드 실행 근거가 충분히 확인되지 않습니다.')
        );
      }
    } catch (error) {
      console.error('Failed to prepare assignment feedback:', error);
      setAiError(error?.message || 'AI 피드백 컨텍스트를 만들지 못했습니다.');
    } finally {
      setAiAction('');
    }
  };

  const applyAiDraftToFeedback = () => {
    if (!aiFeedback?.studentFeedback) return;
    setFeedback(aiFeedback.studentFeedback);
    if (Number.isFinite(Number(aiFeedback.suggestedBonusCrystals))) {
      setBonusCrystals(Number(aiFeedback.suggestedBonusCrystals));
    }
  };

  const applyRevisionRequest = () => {
    const text = aiFeedback?.revisionRequest || '이번 과제는 제출 내용의 일부가 확인되지 않습니다. 필요한 자료를 보완해서 다시 제출해 주세요.';
    setFeedback(text);
  };

  const studentWarningById = new Map(studentWarnings.map(item => [item.id, item]));
  const enrichedAssignmentWarnings = assignmentWarnings.map(item => ({
    ...item,
    ...(studentWarningById.get(item.id) || {}),
  }));
  const activeStudentWarnings = studentWarnings.filter(item => ['active', 'appealed'].includes(item.status));
  const activeWarnings = enrichedAssignmentWarnings.filter(item => ['active', 'appealed'].includes(item.status));
  const cancelledWarnings = enrichedAssignmentWarnings.filter(item => item.status === 'cancelled');
  const appealWarnings = enrichedAssignmentWarnings.filter(item => item.appeal?.status === 'submitted');
  const nextWarningOrdinal = activeStudentWarnings.length + 1;

  const handleCancelWarning = async (warning) => {
    if (!warning?.id) return;
    const reason = warningCancelReason.trim() || '관리자 검토로 경고 취소';
    try {
      await cancelWarningMutation.mutateAsync({ warning, reason });
      setWarningCancelReason('');
      alert('경고를 취소했습니다.');
    } catch (error) {
      console.error('Cancel warning failed:', error);
      alert('경고 취소에 실패했습니다.');
    }
  };

  const handleRejectAppeal = async (warning) => {
    if (!warning?.id) return;
    try {
      await rejectAppealMutation.mutateAsync({
        warning,
        adminResponse: appealResponse || '관리자 검토 결과 경고를 유지합니다.',
      });
      setAppealResponse('');
      alert('이의신청을 기각 처리했습니다.');
    } catch (error) {
      console.error('Reject appeal failed:', error);
      alert('이의신청 처리에 실패했습니다.');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Target Data (Readonly) */}
      <div style={{ flex: '3', padding: '1.5rem', overflowY: 'auto', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', pb: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 style={{ margin: 0 }}>{assignment.userName} 대원의 보고서 <span style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem'}}>({assignment.clusterId})</span></h3>
          <span style={{ color: 'var(--crystal-cyan)' }}>{assignment.date}</span>
        </div>

        <div className="markdown-content" style={{ color: 'var(--text-bright)', lineHeight: '1.6', fontSize: '1.05rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
          <ReactMarkdown>{assignment.content || '내용 없음'}</ReactMarkdown>
        </div>

        {assignment.attachments?.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ color: 'var(--star-gold)', marginBottom: '0.8rem' }}>첨부 파일</h4>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              {assignment.attachments.map((att, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <a 
                    href={att.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    title="원본 파일 열기"
                    style={{ 
                      padding: '0.5rem 1rem', 
                      color: 'white', 
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      borderRight: '1px solid rgba(255,255,255,0.1)',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    📄 {att.name}
                  </a>
                  <button 
                    onClick={() => handlePreview(att)}
                    title="미리보기"
                    style={{ 
                      padding: '0.5rem', 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--crystal-cyan)', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {assignment.links?.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--star-gold)', marginBottom: '0.5rem' }}>첨부 링크</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {assignment.links.map((lnk, i) => (
                <a key={i} href={lnk.url} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-blue)' }}>
                  🔗 {lnk.url}
                </a>
              ))}
            </div>
          </div>
        )}

        {(aiFeedback || aiContext) && (
          <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.8rem' }}>
            <h4 style={{ color: 'var(--crystal-cyan)', margin: 0 }}>AI 분석 요약</h4>
            <div style={{ padding: '1rem', borderRadius: 8, background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.16)', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              <div>최근 과제 비교: {aiFeedback?.contextSummary?.previousCount ?? aiContext?.previousSubmissions?.length ?? 0}건</div>
              <div>같은 날짜 다른 제출: {aiFeedback?.contextSummary?.sameDayCount ?? aiContext?.sameDaySubmissions?.length ?? 0}건</div>
              <div>
                제출일 해당 과정 학습 기록: {aiFeedback?.contextSummary?.learningActivityCount ?? aiContext?.dailyLearningSummary?.activityCount ?? 0}건
                {' / 전체 '}
                {aiFeedback?.contextSummary?.allLearningActivityCount ?? aiContext?.dailyLearningSummary?.allActivityCount ?? aiFeedback?.contextSummary?.learningActivityCount ?? aiContext?.dailyLearningSummary?.activityCount ?? 0}건
              </div>
              {(
                (aiFeedback?.contextSummary?.codeTraceCount || aiContext?.dailyLearningSummary?.codeTraceCount || 0) > 0 ||
                (aiFeedback?.contextSummary?.codeTraceProgressCount || aiContext?.dailyLearningSummary?.codeTraceProgressCount || 0) > 0
              ) && (
                <div>
                  CODE TRACE: 완료 {aiFeedback?.contextSummary?.codeTraceCount ?? aiContext?.dailyLearningSummary?.codeTraceCount ?? 0}건
                  {' / 진행 '}
                  {aiFeedback?.contextSummary?.codeTraceProgressCount ?? aiContext?.dailyLearningSummary?.codeTraceProgressCount ?? 0}건
                  {((aiFeedback?.contextSummary?.codeTraceTitles || [
                    ...(aiContext?.dailyLearningSummary?.codeTraces || []).map(item => {
                      const count = `${item.completedExerciseCount || 0}/${item.totalExerciseCount || '?'}`;
                      const accuracy = item.accuracy != null ? ` ${item.accuracy}%` : '';
                      return `${item.title || 'CODE TRACE'} 완료 ${count}${accuracy}`;
                    }),
                    ...(aiContext?.dailyLearningSummary?.inProgressCodeTraces || []).map(item => {
                      const count = `${item.completedExerciseCount || 0}/${item.totalExerciseCount || '?'}`;
                      const accuracy = item.bestAccuracy != null ? ` 최고 ${item.bestAccuracy}%` : '';
                      return `${item.title || 'CODE TRACE'} 진행 ${count}${accuracy}`;
                    })
                  ]).length > 0) && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      {' - '}
                      {(aiFeedback?.contextSummary?.codeTraceTitles || [
                        ...(aiContext?.dailyLearningSummary?.codeTraces || []).map(item => {
                          const count = `${item.completedExerciseCount || 0}/${item.totalExerciseCount || '?'}`;
                          const accuracy = item.accuracy != null ? ` ${item.accuracy}%` : '';
                          return `${item.title || 'CODE TRACE'} 완료 ${count}${accuracy}`;
                        }),
                        ...(aiContext?.dailyLearningSummary?.inProgressCodeTraces || []).map(item => {
                          const count = `${item.completedExerciseCount || 0}/${item.totalExerciseCount || '?'}`;
                          const accuracy = item.bestAccuracy != null ? ` 최고 ${item.bestAccuracy}%` : '';
                          return `${item.title || 'CODE TRACE'} 진행 ${count}${accuracy}`;
                        })
                      ]).join(', ')}
                    </span>
                  )}
                </div>
              )}
              {(aiFeedback?.contextSummary?.excludedOtherCourseTitles?.length > 0 || aiContext?.dailyLearningSummary?.excludedOtherCourseTitles?.length > 0) && (
                <div style={{ color: '#fbbf24' }}>
                  제외된 다른 과정 기록: {(aiFeedback?.contextSummary?.excludedOtherCourseTitles || aiContext?.dailyLearningSummary?.excludedOtherCourseTitles || []).join(', ')}
                </div>
              )}
              {(aiFeedback?.contextSummary?.codeComparisonSummary || aiContext?.currentSubmission?.codeComparison?.summary) && (
                <div>첨부 코드 비교: {aiFeedback?.contextSummary?.codeComparisonSummary || aiContext?.currentSubmission?.codeComparison?.summary}</div>
              )}
              <div>다크 매터 연결: {aiFeedback?.contextSummary?.darkMatterCount ?? aiContext?.darkMatterSummary?.totalActive ?? 0}건</div>
            </div>
          </div>
        )}

        {enrichedAssignmentWarnings.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
            <h4 style={{ color: '#fbbf24', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} /> 경고 기록 · 현재 누적 {activeStudentWarnings.length}회
            </h4>
            {enrichedAssignmentWarnings.map((warning) => (
              <div
                key={warning.id}
                style={{
                  padding: '1rem',
                  borderRadius: 8,
                  background: warning.status === 'cancelled' ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${warning.status === 'cancelled' ? 'rgba(16,185,129,0.35)' : 'rgba(251,191,36,0.35)'}`,
                  color: 'var(--text-bright)',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <strong style={{ color: warning.status === 'cancelled' ? '#10b981' : '#fbbf24' }}>
                    {WARNING_TYPE_LABELS[warning.type] || warning.type}
                  </strong>
                  <span className="font-tech" style={{ color: warning.status === 'cancelled' ? '#10b981' : '#fbbf24', fontSize: '0.75rem' }}>
                    {warning.status === 'cancelled' ? '취소됨' : warning.status === 'appealed' ? '이의신청 접수' : '활성'}
                  </span>
                </div>
                {warning.status !== 'cancelled' && (
                  <div className="font-tech" style={{ color: '#fbbf24', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                    {warning.activeWarningOrdinal ? `${warning.activeWarningOrdinal}번째 학습 경고입니다.` : `현재 활성 경고 ${activeStudentWarnings.length}회 중 하나입니다.`}
                  </div>
                )}
                {warning.status === 'cancelled' && (
                  <div className="font-tech" style={{ color: '#10b981', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                    취소된 경고이며 현재 누적 {activeStudentWarnings.length}회에 포함되지 않습니다.
                  </div>
                )}
                <div>{warning.message}</div>
                {warning.status === 'cancelled' && (
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.45rem', fontSize: '0.82rem' }}>
                    취소 사유: {warning.cancelReason || '관리자 검토로 경고 취소'}
                  </div>
                )}
                <div style={{ color: '#fca5a5', marginTop: '0.45rem', fontSize: '0.82rem' }}>{warning.policyMessage || WARNING_POLICY_MESSAGE}</div>
                {warning.appeal?.text && (
                  <div style={{ marginTop: '0.8rem', padding: '0.75rem', borderRadius: 6, background: 'rgba(255,255,255,0.05)' }}>
                    <strong style={{ color: 'var(--crystal-cyan)' }}>이의신청</strong>
                    <div style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{warning.appeal.text}</div>
                    {warning.appeal.status === 'rejected' && warning.appeal.adminResponse && (
                      <div style={{ marginTop: '0.5rem', color: '#fca5a5' }}>기각 사유: {warning.appeal.adminResponse}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Area (Write Feedback) */}
      <div style={{ flex: '2', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(5, 5, 10, 0.4)' }}>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                ['gentle', '부드럽게'],
                ['balanced', '보통'],
                ['strict', '엄격하게'],
                ['parent', '학부모용'],
                ['short', '학생용 짧게'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className="admin-btn secondary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.32rem 0.55rem',
                    background: feedbackStyle === key ? 'rgba(0, 212, 255, 0.2)' : undefined,
                    borderColor: feedbackStyle === key ? 'var(--crystal-cyan)' : undefined,
                    color: feedbackStyle === key ? 'var(--crystal-cyan)' : undefined,
                  }}
                  onClick={() => setFeedbackStyle(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="admin-btn primary"
              onClick={handleGenerateAiFeedback}
              disabled={!!aiAction}
              style={{ whiteSpace: 'nowrap' }}
            >
              {aiAction === 'generating' ? 'AI 초안 생성 중...' : '✨ AI 피드백 생성'}
            </button>
          </div>

          {aiError && (
            <div style={{ color: '#fca5a5', fontSize: '0.85rem', lineHeight: 1.5 }}>
              {aiError}
            </div>
          )}

          {aiFeedback && (
            <div style={{ display: 'grid', gap: '0.75rem', padding: '1rem', borderRadius: 10, background: 'rgba(15,23,42,0.68)', border: '1px solid rgba(0, 212, 255, 0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--crystal-cyan)' }}>AI 피드백 초안 <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(PREVIEW)</span></strong>
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <button className="admin-btn secondary" style={{ fontSize: '0.78rem', padding: '0.32rem 0.55rem' }} onClick={applyAiDraftToFeedback}>
                    초안 적용
                  </button>
                  <button className="admin-btn secondary" style={{ fontSize: '0.78rem', padding: '0.32rem 0.55rem' }} onClick={applyRevisionRequest}>
                    보완요청 문구 적용
                  </button>
                </div>
              </div>

              <div className="markdown-content" style={{ maxHeight: 190, overflowY: 'auto', padding: '0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.22)', color: 'var(--text-bright)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                <ReactMarkdown>{formatFeedbackForDisplay(aiFeedback.studentFeedback) || '생성된 초안이 없습니다.'}</ReactMarkdown>
              </div>

              {aiFeedback.evidence?.length > 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--star-gold)' }}>근거</strong>
                  <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                    {aiFeedback.evidence.slice(0, 6).map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                </div>
              )}

              {aiFeedback.rubricScores && Object.keys(aiFeedback.rubricScores).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.4rem' }}>
                  {Object.entries(aiFeedback.rubricScores).map(([key, value]) => (
                    <div key={key} style={{ padding: '0.45rem 0.55rem', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {key}: <span style={{ color: 'var(--crystal-cyan)', fontWeight: 700 }}>{value}/3</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          <button className="admin-btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => applyMacro('정말 훌륭합니다! 핵심을 정확히 파악했네요. 🚀')}>훌륭함</button>
          <button className="admin-btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => applyMacro('좋은 시도입니다. 하지만 조금 더 구체적으로 작성해주면 좋을 것 같아요.')}>보완필요</button>
          <button className="admin-btn secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={() => applyMacro('첨부 파일이 열리지 않거나 내용이 누락되었습니다. 다시 확인 후 재전송 해주세요.')}>누락됨</button>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem', padding: '1rem', borderRadius: 10, background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
          <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', color: '#fbbf24', fontWeight: 800 }}>
            <input
              type="checkbox"
              checked={shouldIssueWarning}
              onChange={(event) => setShouldIssueWarning(event.target.checked)}
              disabled={activeWarnings.some(item => item.type === 'poor_assignment_submission')}
            />
            불성실 과제 제출 경고 1회 저장
          </label>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
            불성실 제출 경고 1회, 연속 3회 미제출 경고 1회로 누적됩니다. 경고 3회 누적 시 “{WARNING_POLICY_MESSAGE}” 문구가 학생에게 표시됩니다.
            <br />
            현재 이 학생의 활성 학습 경고는 {activeStudentWarnings.length}회입니다.
            {activeWarnings.some(item => item.type === 'poor_assignment_submission')
              ? ` 이 과제의 경고는 ${activeWarnings.find(item => item.type === 'poor_assignment_submission')?.activeWarningOrdinal || activeStudentWarnings.length}번째 학습 경고입니다.`
              : ` 새 경고를 저장하면 ${nextWarningOrdinal}번째 학습 경고가 됩니다.`}
          </div>
          {shouldIssueWarning && (
            <textarea
              className="admin-input"
              value={warningMessage}
              onChange={(event) => setWarningMessage(event.target.value)}
              rows={3}
              style={{ resize: 'vertical', lineHeight: 1.55 }}
            />
          )}
          {activeWarnings.some(item => item.type === 'poor_assignment_submission') && (
            <div style={{ color: '#fca5a5', fontSize: '0.84rem' }}>이 과제에는 이미 활성 불성실 제출 경고가 있습니다.</div>
          )}
          {activeWarnings.length > 0 && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <input
                className="admin-input"
                value={warningCancelReason}
                onChange={(event) => setWarningCancelReason(event.target.value)}
                placeholder="경고 취소 사유"
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {activeWarnings.map(warning => (
                  <button
                    key={warning.id}
                    type="button"
                    className="admin-btn secondary"
                    style={{ fontSize: '0.78rem', padding: '0.32rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    disabled={cancelWarningMutation.isPending}
                    onClick={() => handleCancelWarning(warning)}
                  >
                    <XCircle size={14} /> {WARNING_TYPE_LABELS[warning.type] || '경고'} 취소
                  </button>
                ))}
              </div>
            </div>
          )}
          {appealWarnings.length > 0 && (
            <div style={{ display: 'grid', gap: '0.55rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <strong style={{ color: 'var(--crystal-cyan)' }}>이의신청 검토</strong>
              <textarea
                className="admin-input"
                value={appealResponse}
                onChange={(event) => setAppealResponse(event.target.value)}
                placeholder="기각 시 학생에게 표시할 답변"
                rows={2}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {appealWarnings.map(warning => (
                  <React.Fragment key={warning.id}>
                    <button
                      type="button"
                      className="admin-btn primary"
                      style={{ fontSize: '0.78rem', padding: '0.32rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      disabled={cancelWarningMutation.isPending}
                      onClick={() => handleCancelWarning(warning)}
                    >
                      <CheckCircle size={14} /> 수락하고 경고 취소
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger"
                      style={{ fontSize: '0.78rem', padding: '0.32rem 0.55rem' }}
                      disabled={rejectAppealMutation.isPending}
                      onClick={() => handleRejectAppeal(warning)}
                    >
                      이의신청 기각
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
          {cancelledWarnings.length > 0 && (
            <div style={{ color: '#10b981', fontSize: '0.82rem' }}>
              취소된 경고 {cancelledWarnings.length}건은 누적 경고 수에서 제외됩니다.
            </div>
          )}
        </div>

        <textarea 
          className="admin-input" 
          placeholder="사령부 회신 (피드백) 내용 작성..." 
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          style={{
            flex: '0 0 auto',
            minHeight: '240px',
            height: 'clamp(240px, 32vh, 420px)',
            resize: 'vertical',
            marginBottom: '1rem',
            lineHeight: 1.7,
            padding: '1rem',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)' }}>보너스 광석:</label>
            <input 
              type="number" 
              className="admin-input" 
              style={{ width: '80px' }} 
              value={bonusCrystals}
              onChange={e => setBonusCrystals(e.target.value)}
              min="0"
              max="500"
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="admin-btn danger" 
              onClick={() => handleReview('missing')}
              disabled={reviewMutation.isPending || issueWarningMutation.isPending}
            >
              ⛔ 누락 처리
            </button>
            <button 
              className="admin-btn danger" 
              onClick={() => handleReview('needs_revision')}
              disabled={reviewMutation.isPending || issueWarningMutation.isPending}
            >
              ⚠️ 반려 (보완요청)
            </button>
            <button 
              className="admin-btn primary" 
              style={{ background: '#10b981', borderColor: '#10b981' }}
              onClick={() => handleReview('reviewed')}
              disabled={reviewMutation.isPending || issueWarningMutation.isPending}
            >
              ✓ 승인 (APPROVE)
            </button>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      <FileViewerModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        file={previewFile}
      />
    </div>
  );
}
