import { Navigate, useLocation } from 'react-router-dom'
import { getAuthToken } from '../auth/session.js'

function ProtectedRoute({ children }) {
  const location = useLocation()

  if (!getAuthToken()) {
    return <Navigate to="/reviewer/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute