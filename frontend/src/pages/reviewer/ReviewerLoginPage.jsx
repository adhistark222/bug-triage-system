import { useLocation, useNavigate } from 'react-router-dom'
import ReviewerLoginForm from '../../components/reviewer/ReviewerLoginForm.jsx'
import AppLayout from '../../layouts/AppLayout.jsx'

function ReviewerLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isInactiveTimeout = location.state?.reason === 'inactive-timeout'

  function handleSuccess() {
    const nextPath = location.state?.from?.pathname || '/reviewer/reports'
    navigate(nextPath, { replace: true })
  }

  return (
    <AppLayout>
      <section className="reviewer-login-view">
        <div className="reviewer-login-intro">
          <p className="report-intro__eyebrow">Reviewer workspace</p>
          <h1>Reviewer Sign In</h1>
          <p className="report-intro__lead">
            Sign in with your reviewer account to inspect submissions, apply filters,
            and disposition triaged reports.
          </p>
          <p className="reviewer-login-note">
            Reviewer sessions automatically sign out after 5 minutes of inactivity.
          </p>
        </div>
        {isInactiveTimeout ? (
          <section className="reviewer-state-card reviewer-state-card--warning" role="status">
            <p>You were signed out after 5 minutes of inactivity. Sign in again to continue reviewing.</p>
          </section>
        ) : null}
        <ReviewerLoginForm onSuccess={handleSuccess} />
      </section>
    </AppLayout>
  )
}

export default ReviewerLoginPage