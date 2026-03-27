import { Navigate, Route, Routes } from 'react-router-dom'
import ReportSubmitPage from '../pages/reporter/ReportSubmitPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ReportSubmitPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
