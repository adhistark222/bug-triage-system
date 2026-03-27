import { Navigate, Route, Routes } from 'react-router-dom'
import ReportSubmitView from '../views/reporter/ReportSubmitView.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ReportSubmitView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
