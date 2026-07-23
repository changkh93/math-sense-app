import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import './App.css'
import './styles/space-theme.css' /* Global Space Theme */
import SpaceHome from './components/Space/SpaceHome'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminRoute from './components/AdminRoute'
import LiveStatus from './pages/Admin/LiveStatus'
import ParentManager from './pages/Admin/ParentManager'
import CrewApproval from './pages/Admin/CrewApproval'
import Applications from './pages/Admin/Applications'
import VacationCampAdmin from './pages/Admin/VacationCampAdmin'

import ParentDashboard from './pages/Parent/ParentDashboard'

import ClusterManager from './pages/Admin/ClusterManager'
import UserAccessManager from './pages/Admin/UserAccessManager'
import ContentManager from './pages/Admin/ContentManager'
import MissionContentEditor from './pages/Admin/MissionContentEditor'
import AITaggingEditor from './pages/Admin/AITaggingEditor'
import QuizEditor from './pages/Admin/QuizEditor'
import GhostCleaner from './pages/Admin/GhostCleaner'
import StreakFixer from './pages/Admin/StreakFixer'
import GalaxyLearningLedgerBackfill from './pages/Admin/GalaxyLearningLedgerBackfill'
import TeacherQA from './pages/Admin/TeacherQA'
import PythonCourseBuilder from './pages/Admin/PythonCourseBuilder'
import MiddleSchoolMathBuilder from './pages/Admin/MiddleSchoolMathBuilder'
import AdminAssignments from './pages/Admin/AdminAssignments'
import MistakeNotebookAdmin from './pages/Admin/MistakeNotebookAdmin'
import AdminStudentReport from './pages/Admin/AdminStudentReport'
import MonthlyEvaluationAwards from './pages/Admin/MonthlyEvaluationAwards'
import Agora from './pages/Community/Agora'
import QuestionDetail from './pages/Community/QuestionDetail'
import PublicProfile from './pages/Community/PublicProfile'
import PrivacyPolicy from './pages/PrivacyPolicy'
import InviteHandler from './pages/InviteHandler'
import PublicApplication from './pages/PublicApplication'
import VacationCamp from './pages/VacationCamp'
import Signup from './pages/Signup'
import Terms from './pages/Terms'
import CrewGuestInvite from './pages/CrewGuestInvite'
import CrewGuestManager from './pages/Admin/CrewGuestManager'
import QuizBattleChallengeReceiver from './components/Space/QuizBattleChallengeReceiver'

import PrivateRoute from './components/PrivateRoute'
import { cleanExpiredAudioPreferences } from './audio/audioPreferences'
import { cleanExpiredLocalStorage } from './utils/storageUtils'

const AstraBuilderQa = import.meta.env.DEV
  ? lazy(() => import('./components/GalaxySocial/builder/AstraBuilderQa'))
  : null

function App() {
  // 앱 로드 시 일반 캐시와 UID별 오디오 선호 만료분을 함께 정리
  useEffect(() => {
    cleanExpiredLocalStorage();
    cleanExpiredAudioPreferences();
  }, []);

  return (
    <>
      <QuizBattleChallengeReceiver />
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
          element={<Suspense fallback={null}><AstraBuilderQa /></Suspense>}
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
    </>
  )
}

export default App
