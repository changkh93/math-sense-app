import { Routes, Route } from 'react-router-dom'
import './App.css'
import SpaceHome from './components/Space/SpaceHome'
import GameHome from './components/GameHome'
import MigratePage from './pages/MigratePage'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminRoute from './components/AdminRoute'
import { usePerformance } from './contexts/PerformanceContext'

import ContentManager from './pages/Admin/ContentManager'
import QuizEditor from './pages/Admin/QuizEditor'
import DataSync from './pages/Admin/DataSync'

function App() {
  const { isLowMode, performanceMode } = usePerformance();

  if (performanceMode === 'detecting') {
    return <div className="loading-screen">성능 최적화 중...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={isLowMode ? <GameHome /> : <SpaceHome />} />
      <Route path="/migrate" element={<MigratePage />} />
      
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="content" element={<ContentManager />} />
        <Route path="quizzes/:unitId" element={<QuizEditor />} />
        <Route path="data-sync" element={<DataSync />} />
      </Route>
    </Routes>
  )
}

export default App
