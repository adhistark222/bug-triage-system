import { useLocation, useNavigate } from 'react-router-dom'
import ReviewerLoginForm from '../../components/reviewer/ReviewerLoginForm.jsx'
import AppLayout from '../../layouts/AppLayout.jsx'

function ReviewerLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()

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
        </div>
        <ReviewerLoginForm onSuccess={handleSuccess} />
      </section>
    </AppLayout>
  )
}

export default ReviewerLoginPage