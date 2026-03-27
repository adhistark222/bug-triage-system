import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { logoutReviewer } from '../../api/auth.js'
import { downloadReviewerAttachment } from '../../api/reviewerAttachments.js'
import { updateReviewerReportStatus } from '../../api/reviewerDisposition.js'
import {
  formatLabel,
  getSeverityTone,
  getVulnerabilityTone,
} from '../../components/reviewer/reviewerPresentation.js'
import { fetchReviewerReportDetail } from '../../api/reviewerReportDetail.js'
import { clearAuthToken, getAuthToken } from '../../auth/session.js'
import AppLayout from '../../layouts/AppLayout.jsx'

function ReviewerReportDetailPage() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false)
  const [isOverrideEnabled, setIsOverrideEnabled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
        setActionMessage('')
        setIsOverrideEnabled(false)
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

  async function handleDownloadAttachment() {
    if (isDownloadingAttachment) {
      return
    }

    setIsDownloadingAttachment(true)
    const token = getAuthToken()
    const result = await downloadReviewerAttachment(token, reportId)

    if (!result.ok) {
      if (result.type === 'auth') {
        clearAuthToken()
      }

      setErrorMessage(result.message || 'Unable to download attachment.')
      setIsDownloadingAttachment(false)
      return
    }

    const downloadUrl = window.URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)
    setIsDownloadingAttachment(false)
  }

  async function handleStatusUpdate(nextStatus) {
    if (isUpdatingStatus) {
      return
    }

    setIsUpdatingStatus(true)
    const token = getAuthToken()
    const result = await updateReviewerReportStatus(token, reportId, nextStatus, {
      override: isOverrideEnabled,
    })

    if (!result.ok) {
      if (result.type === 'auth') {
        clearAuthToken()
      }

      setErrorMessage(result.message || 'Unable to update report status.')
      setIsUpdatingStatus(false)
      return
    }

    setReport((previous) => ({ ...previous, status: result.data.status }))
    setActionMessage(`Report status updated to ${formatLabel(result.data.status)}.`)
    setIsOverrideEnabled(false)
    setErrorMessage('')
    setIsUpdatingStatus(false)
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

  const severityTone = getSeverityTone(report?.triage_result?.severity_bucket)
  const vulnerabilityTone = getVulnerabilityTone(report?.vulnerability_type || 'other')
  const hasBreakdown = Object.keys(report?.triage_result?.breakdown || {}).length > 0
  const canDisposition = report?.status === 'triaged' || isOverrideEnabled
  const requiresOverride = report?.status !== 'triaged'

  return (
    <AppLayout>
      <section className="reviewer-detail-view">
        <div className="reviewer-detail-hero">
          <div className="reviewer-detail-hero__topbar">
            <Link className="reviewer-detail-backlink reviewer-detail-backlink--pill" to="/reviewer/reports">
              Back to queue
            </Link>
            <button
              type="button"
              className="reviewer-logout-button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              Log out
            </button>
          </div>
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
          <div className="reviewer-workspace-grid reviewer-workspace-grid--detail">
            <aside className="reviewer-side-rail" aria-label="Reviewer actions">
              <section className="reviewer-side-card">
                <p className="report-intro__eyebrow">Reviewer actions</p>
                <h2>Disposition and evidence</h2>
                <div className="reviewer-action-group">
                  {report.has_attachment ? (
                    <button
                      type="button"
                      className="reviewer-action-button reviewer-action-button--secondary"
                      onClick={handleDownloadAttachment}
                      disabled={isDownloadingAttachment}
                    >
                      {isDownloadingAttachment ? 'Downloading attachment...' : 'Download attachment'}
                    </button>
                  ) : (
                    <p className="reviewer-side-copy">No attachment was included with this report.</p>
                  )}
                </div>

                {requiresOverride ? (
                  <div className="reviewer-action-override">
                    <p className="reviewer-side-copy">
                      This report is currently <strong>{formatLabel(report.status)}</strong>. Enable override to change its disposition.
                    </p>
                    <button
                      type="button"
                      className={`reviewer-action-button reviewer-action-button--secondary${isOverrideEnabled ? ' reviewer-action-button--active' : ''}`}
                      onClick={() => setIsOverrideEnabled((previous) => !previous)}
                      disabled={isUpdatingStatus}
                    >
                      {isOverrideEnabled ? 'Disable override' : 'Enable override actions'}
                    </button>
                  </div>
                ) : null}

                <div className="reviewer-action-stack">
                  <button
                    type="button"
                    className="reviewer-action-button reviewer-action-button--accept"
                    onClick={() => handleStatusUpdate('accepted')}
                    disabled={!canDisposition || isUpdatingStatus}
                  >
                    Mark accepted
                  </button>
                  <button
                    type="button"
                    className="reviewer-action-button reviewer-action-button--reject"
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={!canDisposition || isUpdatingStatus}
                  >
                    Mark rejected
                  </button>
                  <button
                    type="button"
                    className="reviewer-action-button reviewer-action-button--secondary"
                    onClick={() => handleStatusUpdate('needs_more_info')}
                    disabled={!canDisposition || isUpdatingStatus}
                  >
                    Request more info
                  </button>
                </div>

                {!canDisposition ? (
                  <p className="reviewer-side-copy">Enable override actions to unlock disposition controls.</p>
                ) : null}

                {actionMessage ? <p className="reviewer-side-success">{actionMessage}</p> : null}
              </section>

              <section className="reviewer-side-card">
                <p className="report-intro__eyebrow">At a glance</p>
                <div className="reviewer-side-facts">
                  <div>
                    <strong>Status</strong>
                    <span className={`reviewer-badge reviewer-badge--${report.status}`}>
                      {formatLabel(report.status)}
                    </span>
                  </div>
                  <div>
                    <strong>Priority</strong>
                    <span className={`reviewer-pill reviewer-pill--${severityTone}`}>
                      {report.triage_result?.severity_bucket || 'pending'}
                    </span>
                  </div>
                  <div>
                    <strong>Fingerprint</strong>
                    <span>{report.triage_result?.fingerprint || 'n/a'}</span>
                  </div>
                </div>
              </section>

              <section className="reviewer-side-card">
                <p className="report-intro__eyebrow">Scoring criteria</p>
                <h2>How priority is calculated</h2>
                <ul className="reviewer-side-list reviewer-side-list--criteria">
                  <li>Severity estimate: 0-30 points</li>
                  <li>Vulnerability type: 0-25 points</li>
                  <li>Reproduction completeness: 0-25 points</li>
                  <li>Impact description quality: 0-15 points</li>
                  <li>Affected area sensitivity: 0-5 points</li>
                </ul>
                <p className="reviewer-side-copy">
                  Buckets: 0-24 low, 25-49 medium, 50-74 high, 75-100 critical.
                </p>
              </section>
            </aside>

            <div className="reviewer-main-column">
              <section className="reviewer-detail-card" aria-label="Report summary">
                <div className="reviewer-detail-card__header">
                  <div>
                    <p className="report-intro__eyebrow">{formatLabel(report.status)}</p>
                    <h2>Submission snapshot</h2>
                  </div>
                  <div className={`reviewer-detail-score reviewer-detail-score--${severityTone}`}>
                    <strong className={`reviewer-pill reviewer-pill--${severityTone}`}>
                      {report.triage_result?.severity_bucket || 'pending'}
                    </strong>
                    <span>
                      Priority score{' '}
                      <span className={`reviewer-score reviewer-score--${severityTone}`}>
                        {report.triage_result?.priority_score ?? 'Pending'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="reviewer-detail-grid">
                  <div>
                    <h3>Affected area</h3>
                    <p>{report.affected_area}</p>
                  </div>
                  <div>
                    <h3>Vulnerability type</h3>
                    <p>
                      <span className={`reviewer-vuln-chip reviewer-vuln-chip--${vulnerabilityTone}`}>
                        {report.vulnerability_type}
                      </span>
                    </p>
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

                {hasBreakdown ? (
                  <div className="reviewer-breakdown-grid">
                    {Object.entries(report.triage_result?.breakdown || {}).map(([key, value]) => (
                      <article key={key} className="reviewer-breakdown-item">
                        <h3>{formatLabel(key)}</h3>
                        <p>{value}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="reviewer-side-copy">
                    This report does not have a computed score breakdown yet. Attachment presence does not affect score visibility.
                  </p>
                )}
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
            </div>
          </div>
        ) : null}
      </section>
    </AppLayout>
  )
}

export default ReviewerReportDetailPage