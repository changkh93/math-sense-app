import { Routes, Route } from 'react-router-dom'
import './App.css'
import GameHome from './components/GameHome'
import MigratePage from './pages/MigratePage'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminRoute from './components/AdminRoute'

import ContentManager from './pages/Admin/ContentManager'
import QuizEditor from './pages/Admin/QuizEditor'

function App() {
  return (
    <Routes>
      <Route path="/" element={<GameHome />} />
      <Route path="/migrate" element={<MigratePage />} />
      
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route index element={<AdminDashboard />} />
        <Route path="content" element={<ContentManager />} />
        <Route path="quizzes/:unitId" element={<QuizEditor />} />
      </Route>
    </Routes>
  )
}

export default App
