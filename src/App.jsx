import { Routes, Route } from 'react-router-dom'
import './App.css'
import SpaceHome from './components/Space/SpaceHome'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminRoute from './components/AdminRoute'

import ContentManager from './pages/Admin/ContentManager'
import MissionContentEditor from './pages/Admin/MissionContentEditor'
import AITaggingEditor from './pages/Admin/AITaggingEditor'
import QuizEditor from './pages/Admin/QuizEditor'
import DataSync from './pages/Admin/DataSync'
import GhostCleaner from './pages/Admin/GhostCleaner'
import TeacherQA from './pages/Admin/TeacherQA'
import Agora from './pages/Community/Agora'
import QuestionDetail from './pages/Community/QuestionDetail'
import PrivacyPolicy from './pages/PrivacyPolicy'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SpaceHome />} />
      
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="content" element={<ContentManager />} />
        <Route path="mission/:unitId" element={<MissionContentEditor />} />
        <Route path="mission/:unitId/ai-tagging" element={<AITaggingEditor />} />
        <Route path="quizzes/:unitId" element={<QuizEditor />} />
        <Route path="data-sync" element={<DataSync />} />
        <Route path="ghost-cleaner" element={<GhostCleaner />} />
        <Route path="qa" element={<TeacherQA />} />
      </Route>

      <Route path="/agora" element={<Agora />} />
      <Route path="/agora/:questionId" element={<QuestionDetail />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
    </Routes>
  )
}

export default App
