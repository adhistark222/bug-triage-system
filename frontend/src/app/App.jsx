import { Navigate, Route, Routes } from 'react-router-dom'
import ReportSubmitPage from '../pages/reporter/ReportSubmitPage.jsx'
import ReviewerLoginPage from '../pages/reviewer/ReviewerLoginPage.jsx'
import ReviewerReportDetailPage from '../pages/reviewer/ReviewerReportDetailPage.jsx'
import ReviewerReportsPage from '../pages/reviewer/ReviewerReportsPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ReportSubmitPage />} />
      <Route path="/reviewer/login" element={<ReviewerLoginPage />} />
      <Route
        path="/reviewer/reports"
        element={
          <ProtectedRoute>
            <ReviewerReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviewer/reports/:reportId"
        element={
          <ProtectedRoute>
            <ReviewerReportDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
