import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { logoutReviewer } from '../api/auth.js'
import { clearAuthToken, getAuthToken } from '../auth/session.js'

const REVIEWER_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000
const REVIEWER_ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart']

function ProtectedRoute({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const timeoutRef = useRef(null)
  const token = getAuthToken()

  useEffect(() => {
    if (!token) {
      return undefined
    }

    let isMounted = true

    async function expireSession() {
      const currentToken = getAuthToken()

      if (!currentToken) {
        return
      }

      await logoutReviewer(currentToken)

      if (!isMounted) {
        return
      }

      clearAuthToken()
      navigate('/reviewer/login', {
        replace: true,
        state: { from: location, reason: 'inactive-timeout' },
      })
    }

    function resetInactivityTimer() {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(expireSession, REVIEWER_INACTIVITY_TIMEOUT_MS)
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        resetInactivityTimer()
      }
    }

    resetInactivityTimer()

    for (const eventName of REVIEWER_ACTIVITY_EVENTS) {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      window.clearTimeout(timeoutRef.current)

      for (const eventName of REVIEWER_ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, resetInactivityTimer)
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [location, navigate, token])

  if (!token) {
    return <Navigate to="/reviewer/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute