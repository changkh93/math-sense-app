import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import './styles/space-theme.css' /* Global Space Theme */
import SpaceHome from './components/Space/SpaceHome'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminRoute from './components/AdminRoute'
import LiveStatus from './pages/Admin/LiveStatus'
import ParentManager from './pages/Admin/ParentManager'

import ParentLogin from './pages/Parent/ParentLogin'
import ParentDashboard from './pages/Parent/ParentDashboard'

import ClusterManager from './pages/Admin/ClusterManager'
import UserAccessManager from './pages/Admin/UserAccessManager'
import ContentManager from './pages/Admin/ContentManager'
import MissionContentEditor from './pages/Admin/MissionContentEditor'
import AITaggingEditor from './pages/Admin/AITaggingEditor'
import QuizEditor from './pages/Admin/QuizEditor'
import GhostCleaner from './pages/Admin/GhostCleaner'
import StreakFixer from './pages/Admin/StreakFixer'
import TeacherQA from './pages/Admin/TeacherQA'
import PythonCourseBuilder from './pages/Admin/PythonCourseBuilder'
import MiddleSchoolMathBuilder from './pages/Admin/MiddleSchoolMathBuilder'
import AdminAssignments from './pages/Admin/AdminAssignments'
import AdminStudentReport from './pages/Admin/AdminStudentReport'
import Agora from './pages/Community/Agora'
import QuestionDetail from './pages/Community/QuestionDetail'
import PrivacyPolicy from './pages/PrivacyPolicy'
import InviteHandler from './pages/InviteHandler'

import PrivateRoute from './components/PrivateRoute'

function App() {
  // 앱 로드 시 만료된 localStorage 캐시(7일 이상) 일괄 정리
  useEffect(() => {
    import('./utils/storageUtils').then(({ cleanExpiredLocalStorage }) => {
      cleanExpiredLocalStorage();
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<SpaceHome />} />
      <Route path="/invite/:inviteCode" element={<InviteHandler />} />
      
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
        <Route path="content" element={<ContentManager />} />
        <Route path="assignments" element={<AdminAssignments />} />
        <Route path="student-report" element={<AdminStudentReport />} />
        <Route path="mission/:unitId" element={<MissionContentEditor />} />
        <Route path="mission/:unitId/ai-tagging" element={<AITaggingEditor />} />
        <Route path="quizzes/:unitId" element={<QuizEditor />} />
        <Route path="ghost-cleaner" element={<GhostCleaner />} />
        <Route path="streak-fixer" element={<StreakFixer />} />
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
      <Route path="/privacy" element={<PrivacyPolicy />} />

      {/* Parent Portal */}
      <Route path="/parent" element={<ParentLogin />} />
      <Route path="/parent/dashboard" element={<ParentDashboard />} />
    </Routes>
  )
}

export default App
