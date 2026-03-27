import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatLabel, getSeverityTone, getVulnerabilityTone } from '../../components/reviewer/reviewerPresentation.js'
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

const PER_PAGE_OPTIONS = [10, 15, 25, 50]

/**
 * Returns an array of page labels to render for the given pagination state.
 * Numbers are integers; '...' represents an ellipsis gap.
 * Always includes first, last, current, and up to 1 neighbour on each side.
 */
function buildPageNumbers(currentPage, lastPage) {
  if (lastPage <= 1) return []
  const pages = new Set([1, lastPage, currentPage])
  if (currentPage > 1) pages.add(currentPage - 1)
  if (currentPage < lastPage) pages.add(currentPage + 1)
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const withGaps = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      withGaps.push('...')
    }
    withGaps.push(sorted[i])
  }
  return withGaps
}

function ReviewerReportsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [meta, setMeta] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      const token = getAuthToken()
      const result = await fetchReviewerReports(token, {
        ...filters,
        page,
        per_page: perPage,
      })

      if (!isMounted) {
        return
      }

      if (result.ok) {
        setReports(result.data)
        setMeta(result.meta)
        setErrorMessage('')
        setIsLoading(false)
        return
      }

      if (result.type === 'auth') {
        clearAuthToken()
      }

      setReports([])
      setMeta(null)
      setErrorMessage(result.message || 'Unable to load reviewer queue.')
      setIsLoading(false)
    }

    loadReports()

    return () => {
      isMounted = false
    }
  }, [filters, page, perPage])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setFilters((previous) => ({ ...previous, [name]: value }))
    setPage(1)
    setIsLoading(true)
  }

  function handlePerPageChange(event) {
    setPerPage(Number(event.target.value))
    setPage(1)
    setIsLoading(true)
  }

  function handlePageChange(newPage) {
    setPage(newPage)
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
          <div className="reviewer-workspace-grid reviewer-workspace-grid--queue">
            <aside className="reviewer-side-rail" aria-label="Reviewer queue guidance">
              <section className="reviewer-side-card">
                <p className="report-intro__eyebrow">Queue guide</p>
                <h2>Stay on the highest-risk work</h2>
                <ul className="reviewer-side-list">
                  <li>Critical findings appear first by default.</li>
                  <li>Filters update live against the backend queue.</li>
                  <li>Click any card to inspect scoring and narrative detail.</li>
                </ul>
              </section>

              <section className="reviewer-side-card">
                <p className="report-intro__eyebrow">Live sort</p>
                <h2>{formatLabel(filters.sort_by)} {filters.sort_dir}</h2>
                {meta ? (
                  <p className="reviewer-side-copy">
                    Page {meta.current_page} of {meta.last_page} &mdash; {meta.total} {meta.total === 1 ? 'report' : 'reports'} total
                  </p>
                ) : null}
              </section>
            </aside>

            <section className="reviewer-queue-card" aria-label="Reviewer report queue">
              <div className="reviewer-queue-card__header">
                <h2>Incoming queue</h2>
                {meta ? (
                  <p>
                    Showing {meta.from ?? 1}&ndash;{meta.to ?? reports.length} of {meta.total} {meta.total === 1 ? 'report' : 'reports'}
                  </p>
                ) : null}
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

                <label className="reviewer-filter-field">
                  <span>Per page</span>
                  <select value={perPage} onChange={handlePerPageChange} aria-label="Entries per page">
                    {PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n} per page</option>
                    ))}
                  </select>
                </label>
              </div>

              {reports.length === 0 ? (
                <div className="reviewer-empty-state">
                  <p>No reports match the current queue yet.</p>
                </div>
              ) : (
                <div className="reviewer-report-list">
                  {reports.map((report) => {
                    const severityTone = getSeverityTone(report.triage_result?.severity_bucket)
                    const vulnerabilityTone = getVulnerabilityTone(report.vulnerability_type)

                    return (
                      <Link
                        key={report.id}
                        className="reviewer-report-card reviewer-report-card__surface"
                        to={`/reviewer/reports/${report.id}`}
                        aria-label={`Open report ${report.title}`}
                      >
                        <div className="reviewer-report-card__header">
                          <div>
                            <h3>{report.title}</h3>
                            <p>
                              <span
                                className={`reviewer-vuln-chip reviewer-vuln-chip--${vulnerabilityTone}`}
                              >
                                {report.vulnerability_type}
                              </span>
                            </p>
                          </div>
                          <span className={`reviewer-badge reviewer-badge--${report.status}`}>
                            {formatLabel(report.status)}
                          </span>
                        </div>

                        <div className="reviewer-report-card__meta">
                          <div>
                            <strong>Priority</strong>
                            <p>
                              {report.triage_result?.severity_bucket ? (
                                <span className={`reviewer-pill reviewer-pill--${severityTone}`}>
                                  {report.triage_result.severity_bucket}
                                </span>
                              ) : (
                                'Awaiting triage'
                              )}
                            </p>
                          </div>
                          <div>
                            <strong>Score</strong>
                            <p>
                              <span className={`reviewer-score reviewer-score--${severityTone}`}>
                                {report.triage_result?.priority_score ?? 'Pending'}
                              </span>
                            </p>
                          </div>
                          <div>
                            <strong>Attachment</strong>
                            <p>{report.has_attachment ? 'Included' : 'None'}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}

              {meta && meta.last_page > 1 ? (
                <nav className="reviewer-pagination" aria-label="Queue pagination">
                  <div className="reviewer-pagination__info">
                    Page {meta.current_page} of {meta.last_page}
                  </div>
                  <div className="reviewer-pagination__controls">
                    <button
                      type="button"
                      className="reviewer-pagination__button"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      &lsaquo; Prev
                    </button>

                    {buildPageNumbers(meta.current_page, meta.last_page).map((item, index) =>
                      item === '...' ? (
                        <span key={`gap-${index}`} className="reviewer-pagination__gap" aria-hidden="true">
                          &hellip;
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`reviewer-pagination__page-button${item === meta.current_page ? ' reviewer-pagination__page-button--active' : ''}`}
                          onClick={() => handlePageChange(item)}
                          aria-label={`Page ${item}`}
                          aria-current={item === meta.current_page ? 'page' : undefined}
                        >
                          {item}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      className="reviewer-pagination__button"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= meta.last_page}
                      aria-label="Next page"
                    >
                      Next &rsaquo;
                    </button>
                  </div>
                </nav>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>
    </AppLayout>
  )
}

export default ReviewerReportsPage