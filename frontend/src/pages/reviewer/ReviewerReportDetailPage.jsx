import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchReviewerReportDetail } from '../../api/reviewerReportDetail.js'
import { clearAuthToken, getAuthToken } from '../../auth/session.js'
import AppLayout from '../../layouts/AppLayout.jsx'

function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

function ReviewerReportDetailPage() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadReport() {
      const token = getAuthToken()
      const result = await fetchReviewerReportDetail(token, reportId)

      if (!isMounted) {
        return
      }

      if (result.ok) {
        setReport(result.data)
        setErrorMessage('')
        setIsLoading(false)
        return
      }

      if (result.type === 'auth') {
        clearAuthToken()
      }

      setReport(null)
      setErrorMessage(result.message || 'Unable to load report detail.')
      setIsLoading(false)
    }

    loadReport()

    return () => {
      isMounted = false
    }
  }, [reportId])

  return (
    <AppLayout>
      <section className="reviewer-detail-view">
        <div className="reviewer-detail-hero">
          <Link className="reviewer-detail-backlink" to="/reviewer/reports">
            Back to queue
          </Link>
          {isLoading ? <h1>Loading report detail...</h1> : <h1>{report?.title || 'Report detail'}</h1>}
          <p className="report-intro__lead">
            Inspect the submission context, verify the scoring inputs, and prepare
            for final reviewer disposition.
          </p>
        </div>

        {isLoading ? (
          <section className="reviewer-state-card" aria-live="polite">
            <p>Loading report detail...</p>
          </section>
        ) : null}

        {!isLoading && errorMessage ? (
          <section className="reviewer-state-card reviewer-state-card--error" role="alert">
            <p>{errorMessage}</p>
          </section>
        ) : null}

        {!isLoading && report ? (
          <>
            <section className="reviewer-detail-card" aria-label="Report summary">
              <div className="reviewer-detail-card__header">
                <div>
                  <p className="report-intro__eyebrow">{formatLabel(report.status)}</p>
                  <h2>Submission snapshot</h2>
                </div>
                <div className="reviewer-detail-score">
                  <strong>{report.triage_result?.severity_bucket || 'pending'}</strong>
                  <span>Priority score {report.triage_result?.priority_score ?? 'Pending'}</span>
                </div>
              </div>

              <div className="reviewer-detail-grid">
                <div>
                  <h3>Affected area</h3>
                  <p>{report.affected_area}</p>
                </div>
                <div>
                  <h3>Vulnerability type</h3>
                  <p>{formatLabel(report.vulnerability_type)}</p>
                </div>
                <div>
                  <h3>Reporter severity</h3>
                  <p>{formatLabel(report.reporter_severity_estimate)}</p>
                </div>
                <div>
                  <h3>Contact email</h3>
                  <p>{report.contact_email}</p>
                </div>
              </div>
            </section>

            <section className="reviewer-detail-card" aria-label="Triage breakdown">
              <div className="reviewer-detail-card__header">
                <div>
                  <p className="report-intro__eyebrow">Triage result</p>
                  <h2>Scoring breakdown</h2>
                </div>
              </div>

              <div className="reviewer-breakdown-grid">
                {Object.entries(report.triage_result?.breakdown || {}).map(([key, value]) => (
                  <article key={key} className="reviewer-breakdown-item">
                    <h3>{formatLabel(key)}</h3>
                    <p>{value}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="reviewer-detail-card" aria-label="Full report narrative">
              <div className="reviewer-detail-grid reviewer-detail-grid--stacked">
                <div>
                  <h3>Reproduction steps</h3>
                  <p>{report.reproduction_steps}</p>
                </div>
                <div>
                  <h3>Impact description</h3>
                  <p>{report.impact_description}</p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </section>
    </AppLayout>
  )
}

export default ReviewerReportDetailPage