import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logoutReviewer } from '../../api/auth.js'
import { fetchReviewerReports } from '../../api/reviewerReports.js'
import { clearAuthToken, getAuthToken } from '../../auth/session.js'
import AppLayout from '../../layouts/AppLayout.jsx'

const INITIAL_FILTERS = {
  status: '',
  severity_bucket: '',
  sort_by: 'priority_score',
  sort_dir: 'desc',
}

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

function ReviewerReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      const token = getAuthToken()
      const result = await fetchReviewerReports(token, filters)

      if (!isMounted) {
        return
      }

      if (result.ok) {
        const total = result.meta?.total ?? result.data.length
        setReports(result.data)
        setSummary(`${total} ${total === 1 ? 'report' : 'reports'} loaded`)
        setErrorMessage('')
        setIsLoading(false)
        return
      }

      if (result.type === 'auth') {
        clearAuthToken()
      }

      setReports([])
      setSummary('')
      setErrorMessage(result.message || 'Unable to load reviewer queue.')
      setIsLoading(false)
    }

    loadReports()

    return () => {
      isMounted = false
    }
  }, [filters])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((previous) => ({ ...previous, [name]: value }))
    setIsLoading(true)
  }

  async function handleLogout() {
    if (isLoggingOut) {
      return
    }

    const token = getAuthToken()
    setIsLoggingOut(true)

    const result = await logoutReviewer(token)

    if (result.ok || result.type === 'auth') {
      clearAuthToken()
      navigate('/reviewer/login', { replace: true })
      setIsLoggingOut(false)
      return
    }

    setErrorMessage(result.message || 'Something went wrong while logging out.')
    setIsLoggingOut(false)
  }

  return (
    <AppLayout>
      <section className="reviewer-reports-view">
        <div className="reviewer-reports-hero">
          <div className="reviewer-reports-hero__topbar">
            <p className="report-intro__eyebrow">Reviewer workspace</p>
            <button
              type="button"
              className="reviewer-logout-button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              Log out
            </button>
          </div>
          <h1>Reviewer Reports</h1>
          <p className="report-intro__lead">
            Review the incoming queue, spot critical findings quickly, and move
            triaged reports toward a final reviewer decision.
          </p>
        </div>

        {isLoading ? (
          <section className="reviewer-state-card" aria-live="polite">
            <p>Loading reviewer queue...</p>
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section className="reviewer-state-card reviewer-state-card--error" role="alert">
            <p>{errorMessage}</p>
          </section>
        ) : null}

        {!isLoading && !errorMessage ? (
          <section className="reviewer-queue-card" aria-label="Reviewer report queue">
            <div className="reviewer-queue-card__header">
              <h2>Incoming queue</h2>
              <p>{summary}</p>
            </div>

            <div className="reviewer-filter-grid">
              <label className="reviewer-filter-field">
                <span>Status filter</span>
                <select name="status" value={filters.status} onChange={handleFilterChange}>
                  <option value="">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="triaged">Triaged</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="needs_more_info">Needs more info</option>
                </select>
              </label>

              <label className="reviewer-filter-field">
                <span>Severity filter</span>
                <select
                  name="severity_bucket"
                  value={filters.severity_bucket}
                  onChange={handleFilterChange}
                >
                  <option value="">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="reviewer-filter-field">
                <span>Sort by</span>
                <select name="sort_by" value={filters.sort_by} onChange={handleFilterChange}>
                  <option value="priority_score">Priority score</option>
                  <option value="created_at">Created time</option>
                </select>
              </label>

              <label className="reviewer-filter-field">
                <span>Sort direction</span>
                <select name="sort_dir" value={filters.sort_dir} onChange={handleFilterChange}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </label>
            </div>

            {reports.length === 0 ? (
              <div className="reviewer-empty-state">
                <p>No reports match the current queue yet.</p>
              </div>
            ) : (
              <div className="reviewer-report-list">
                {reports.map((report) => (
                  <article key={report.id} className="reviewer-report-card">
                    <div className="reviewer-report-card__header">
                      <div>
                        <h3>
                          <Link
                            className="reviewer-report-card__link"
                            to={`/reviewer/reports/${report.id}`}
                          >
                            {report.title}
                          </Link>
                        </h3>
                        <p>{formatLabel(report.vulnerability_type)}</p>
                      </div>
                      <span className={`reviewer-badge reviewer-badge--${report.status}`}>
                        {formatLabel(report.status)}
                      </span>
                    </div>

                    <div className="reviewer-report-card__meta">
                      <p>
                        <strong>Priority:</strong>{' '}
                        {report.triage_result?.severity_bucket
                          ? `${formatLabel(report.triage_result.severity_bucket)} priority`
                          : 'Awaiting triage'}
                      </p>
                      <p>
                        <strong>Score:</strong>{' '}
                        {report.triage_result?.priority_score ?? 'Pending'}
                      </p>
                      <p>
                        <strong>Attachment:</strong>{' '}
                        {report.has_attachment ? 'Included' : 'None'}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </section>
    </AppLayout>
  )
}

export default ReviewerReportsPage