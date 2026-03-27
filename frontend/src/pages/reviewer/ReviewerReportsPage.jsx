import { useEffect, useState } from 'react'
import { fetchReviewerReports } from '../../api/reviewerReports.js'
import { clearAuthToken, getAuthToken } from '../../auth/session.js'
import AppLayout from '../../layouts/AppLayout.jsx'

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

function ReviewerReportsPage() {
  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      const token = getAuthToken()
      const result = await fetchReviewerReports(token)

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
  }, [])

  return (
    <AppLayout>
      <section className="reviewer-reports-view">
        <div className="reviewer-reports-hero">
          <p className="report-intro__eyebrow">Reviewer workspace</p>
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
                        <h3>{report.title}</h3>
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