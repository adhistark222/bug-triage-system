import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import ReviewerReportDetailPage from './ReviewerReportDetailPage.jsx'
import { fetchReviewerReportDetail } from '../../api/reviewerReportDetail.js'

vi.mock('../../api/reviewerReportDetail.js', () => ({
  fetchReviewerReportDetail: vi.fn(),
}))

describe('ReviewerReportDetailPage', () => {
  beforeEach(() => {
    fetchReviewerReportDetail.mockReset()
    localStorage.setItem('bug-triage-token', 'reviewer-token-123')
  })

  function renderPage() {
    render(
      <MemoryRouter initialEntries={['/reviewer/reports/report-1']}>
        <Routes>
          <Route path="/reviewer/reports" element={<h1>Reviewer Reports</h1>} />
          <Route path="/reviewer/login" element={<h1>Reviewer Sign In</h1>} />
          <Route path="/reviewer/reports/:reportId" element={<ReviewerReportDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('loads and renders report detail with triage breakdown', async () => {
    fetchReviewerReportDetail.mockResolvedValue({
      ok: true,
      data: {
        id: 'report-1',
        title: 'Stored XSS in profile',
        vulnerability_type: 'xss',
        reporter_severity_estimate: 'high',
        affected_area: 'Profile editor',
        reproduction_steps: '1. Login\n2. Save payload',
        impact_description: 'Payload executes for viewers.',
        contact_email: 'researcher@example.com',
        status: 'triaged',
        has_attachment: true,
        triage_result: {
          priority_score: 92,
          severity_bucket: 'critical',
          fingerprint: 'abc123',
          breakdown: {
            severity_score: 35,
            vuln_type_score: 25,
            completeness_score: 10,
            impact_score: 12,
            area_score: 10,
            total: 92,
          },
        },
      },
    })

    renderPage()

    expect(
      screen.getByRole('heading', { name: /loading report detail/i }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /stored xss in profile/i })).toBeInTheDocument()
    expect(screen.getByText(/critical/i)).toBeInTheDocument()
    expect(screen.getByText(/priority score/i)).toBeInTheDocument()
    expect(screen.getByText(/severity score/i)).toBeInTheDocument()
    expect(screen.getByText(/35/i)).toBeInTheDocument()
    expect(screen.getByText(/profile editor/i)).toBeInTheDocument()
    expect(fetchReviewerReportDetail).toHaveBeenCalledWith('reviewer-token-123', 'report-1')
  })

  it('returns to the reviewer queue from the detail page', async () => {
    fetchReviewerReportDetail.mockResolvedValue({
      ok: true,
      data: {
        id: 'report-1',
        title: 'Stored XSS in profile',
        vulnerability_type: 'xss',
        reporter_severity_estimate: 'high',
        affected_area: 'Profile editor',
        reproduction_steps: '1. Login\n2. Save payload',
        impact_description: 'Payload executes for viewers.',
        contact_email: 'researcher@example.com',
        status: 'triaged',
        has_attachment: true,
        triage_result: {
          priority_score: 92,
          severity_bucket: 'critical',
          fingerprint: 'abc123',
          breakdown: {
            severity_score: 35,
            vuln_type_score: 25,
            completeness_score: 10,
            impact_score: 12,
            area_score: 10,
            total: 92,
          },
        },
      },
    })

    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /stored xss in profile/i })
    await user.click(screen.getByRole('link', { name: /back to queue/i }))

    expect(await screen.findByRole('heading', { name: /reviewer reports/i })).toBeInTheDocument()
  })

  it('clears auth state and returns to login when detail request gets 401', async () => {
    fetchReviewerReportDetail.mockResolvedValue({
      ok: false,
      type: 'auth',
      message: 'Unauthenticated.',
    })

    renderPage()

    expect(await screen.findByText(/unauthenticated/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(localStorage.getItem('bug-triage-token')).toBeNull()
    })
  })
})