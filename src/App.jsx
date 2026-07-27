import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import './App.css'
import './styles/space-theme.css' /* Global Space Theme */
import SpaceHome from './components/Space/SpaceHome'
import AdminRoute from './components/AdminRoute'
import QuizBattleChallengeReceiver from './components/Space/QuizBattleChallengeReceiver'

import PrivateRoute from './components/PrivateRoute'
import { cleanExpiredAudioPreferences } from './audio/audioPreferences'
import { cleanExpiredLocalStorage } from './utils/storageUtils'

const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/Admin/Dashboard'))
const LiveStatus = lazy(() => import('./pages/Admin/LiveStatus'))
const ParentManager = lazy(() => import('./pages/Admin/ParentManager'))
const CrewApproval = lazy(() => import('./pages/Admin/CrewApproval'))
const Applications = lazy(() => import('./pages/Admin/Applications'))
const VacationCampAdmin = lazy(() => import('./pages/Admin/VacationCampAdmin'))
const ClusterManager = lazy(() => import('./pages/Admin/ClusterManager'))
const UserAccessManager = lazy(() => import('./pages/Admin/UserAccessManager'))
const ContentManager = lazy(() => import('./pages/Admin/ContentManager'))
const MissionContentEditor = lazy(() => import('./pages/Admin/MissionContentEditor'))
const AITaggingEditor = lazy(() => import('./pages/Admin/AITaggingEditor'))
const QuizEditor = lazy(() => import('./pages/Admin/QuizEditor'))
const GhostCleaner = lazy(() => import('./pages/Admin/GhostCleaner'))
const StreakFixer = lazy(() => import('./pages/Admin/StreakFixer'))
const GalaxyLearningLedgerBackfill = lazy(() => import('./pages/Admin/GalaxyLearningLedgerBackfill'))
const TeacherQA = lazy(() => import('./pages/Admin/TeacherQA'))
const PythonCourseBuilder = lazy(() => import('./pages/Admin/PythonCourseBuilder'))
const MiddleSchoolMathBuilder = lazy(() => import('./pages/Admin/MiddleSchoolMathBuilder'))
const AdminAssignments = lazy(() => import('./pages/Admin/AdminAssignments'))
const MistakeNotebookAdmin = lazy(() => import('./pages/Admin/MistakeNotebookAdmin'))
const AdminStudentReport = lazy(() => import('./pages/Admin/AdminStudentReport'))
const MonthlyEvaluationAwards = lazy(() => import('./pages/Admin/MonthlyEvaluationAwards'))
const CrewGuestManager = lazy(() => import('./pages/Admin/CrewGuestManager'))
const ParentDashboard = lazy(() => import('./pages/Parent/ParentDashboard'))
const Agora = lazy(() => import('./pages/Community/Agora'))
const QuestionDetail = lazy(() => import('./pages/Community/QuestionDetail'))
const PublicProfile = lazy(() => import('./pages/Community/PublicProfile'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const InviteHandler = lazy(() => import('./pages/InviteHandler'))
const PublicApplication = lazy(() => import('./pages/PublicApplication'))
const VacationCamp = lazy(() => import('./pages/VacationCamp'))
const Signup = lazy(() => import('./pages/Signup'))
const Terms = lazy(() => import('./pages/Terms'))
const CrewGuestInvite = lazy(() => import('./pages/CrewGuestInvite'))

const AstraBuilderQa = import.meta.env.DEV
  ? lazy(() => import('./components/GalaxySocial/builder/AstraBuilderQa'))
  : null

function RouteFallback() {
  return (
    <div
      role="status"
      className="space-bg space-hud"
      style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--crystal-cyan)' }}
    >
      <div className="font-tech">항로 모듈을 불러오고 있습니다...</div>
    </div>
  )
}

function App() {
  // 앱 로드 시 일반 캐시와 UID별 오디오 선호 만료분을 함께 정리
  useEffect(() => {
    cleanExpiredLocalStorage();
    cleanExpiredAudioPreferences();
  }, []);

  return (
    <>
      <QuizBattleChallengeReceiver />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/" element={<SpaceHome />} />
      <Route path="/journey" element={<Navigate to="/?view=journey" replace />} />
      <Route path="/streak" element={<Navigate to="/?view=journey" replace />} />
      <Route path="/agora-connect/:uid" element={<Navigate to="/?view=journey" replace />} />
      <Route path="/invite/:inviteCode" element={<InviteHandler />} />
      <Route path="/crew-invite/:crewId" element={<CrewGuestInvite />} />
      <Route path="/trial" element={<PublicApplication fixedType="trial" />} />
      <Route path="/consultation" element={<PublicApplication fixedType="consultation" />} />
      <Route path="/vacation" element={<VacationCamp />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/terms" element={<Terms />} />
      {AstraBuilderQa && (
        <Route
          path="/dev/astra-builder"
          element={<AstraBuilderQa />}
        />
      )}
      
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="live-status" element={<LiveStatus />} />
        <Route path="clusters" element={<ClusterManager />} />
        <Route path="users" element={<UserAccessManager />} />
        <Route path="parents" element={<ParentManager />} />
        <Route path="applications" element={<Applications />} />
        <Route path="vacation-camp" element={<VacationCampAdmin />} />
        <Route path="crews" element={<CrewApproval />} />
        <Route path="crew-guests" element={<CrewGuestManager />} />
        <Route path="content" element={<ContentManager />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="monthly-evaluations" element={<MonthlyEvaluationAwards />} />
        <Route path="mistake-notebook" element={<MistakeNotebookAdmin />} />
        <Route path="student-report" element={<AdminStudentReport />} />
        <Route path="mission/:unitId" element={<MissionContentEditor />} />
        <Route path="mission/:unitId/ai-tagging" element={<AITaggingEditor />} />
        <Route path="quizzes/:unitId" element={<QuizEditor />} />
        <Route path="ghost-cleaner" element={<GhostCleaner />} />
        <Route path="streak-fixer" element={<StreakFixer />} />
        <Route path="galaxy-ledger" element={<GalaxyLearningLedgerBackfill />} />
        <Route path="qa" element={<TeacherQA />} />
        <Route path="python-builder" element={<PythonCourseBuilder />} />
        <Route path="middle-math-builder" element={<MiddleSchoolMathBuilder />} />
      </Route>

      <Route path="/agora" element={
        <PrivateRoute>
          <Agora />
        </PrivateRoute>
      } />
      <Route path="/agora/:questionId" element={
        <PrivateRoute>
          <QuestionDetail />
        </PrivateRoute>
      } />
      <Route path="/profile/:uid" element={
        <PrivateRoute>
          <PublicProfile />
        </PrivateRoute>
      } />
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Parent Portal */}
      <Route path="/parent" element={<Navigate to="/" replace />} />
      <Route path="/parent/dashboard" element={<ParentDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}

export default App
