import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import ReviewerReportDetailPage from './ReviewerReportDetailPage.jsx'
import { logoutReviewer } from '../../api/auth.js'
import { fetchReviewerReportDetail } from '../../api/reviewerReportDetail.js'
import { updateReviewerReportStatus } from '../../api/reviewerDisposition.js'
import { downloadReviewerAttachment } from '../../api/reviewerAttachments.js'

vi.mock('../../api/auth.js', () => ({
  logoutReviewer: vi.fn(),
}))

vi.mock('../../api/reviewerReportDetail.js', () => ({
  fetchReviewerReportDetail: vi.fn(),
}))

vi.mock('../../api/reviewerDisposition.js', () => ({
  updateReviewerReportStatus: vi.fn(),
}))

vi.mock('../../api/reviewerAttachments.js', () => ({
  downloadReviewerAttachment: vi.fn(),
}))

describe('ReviewerReportDetailPage', () => {
  beforeEach(() => {
    logoutReviewer.mockReset()
    fetchReviewerReportDetail.mockReset()
    updateReviewerReportStatus.mockReset()
    downloadReviewerAttachment.mockReset()
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
    expect(screen.getByText(/priority score/i)).toBeInTheDocument()
    expect(screen.getByText(/severity score/i)).toBeInTheDocument()
    expect(screen.getByText(/35/i)).toBeInTheDocument()
    expect(screen.getByText(/profile editor/i)).toBeInTheDocument()
    expect(screen.getByText(/reviewer actions/i)).toBeInTheDocument()
    expect(screen.getByText(/scoring criteria/i)).toBeInTheDocument()
    expect(screen.getByText(/severity estimate: 0-30 points/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /download attachment/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mark accepted/i })).toBeInTheDocument()
    expect(
      screen.getAllByText((text, element) => {
        return element?.classList.contains('reviewer-pill') && text.trim() === 'critical'
      })[0],
    ).toHaveClass('reviewer-pill', 'reviewer-pill--critical')
    expect(
      screen.getByText((text, element) => {
        return element?.classList.contains('reviewer-vuln-chip') && text.trim() === 'xss'
      }),
    ).toHaveClass('reviewer-vuln-chip', 'reviewer-vuln-chip--hot')
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

  it('logs out from the detail page', async () => {
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
    logoutReviewer.mockResolvedValue({ ok: true })

    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /stored xss in profile/i })
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(logoutReviewer).toHaveBeenCalledWith('reviewer-token-123')
    })
    await waitFor(() => {
      expect(localStorage.getItem('bug-triage-token')).toBeNull()
    })
    expect(await screen.findByRole('heading', { name: /reviewer sign in/i })).toBeInTheDocument()
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

  it('downloads the attachment when the report includes one', async () => {
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
    downloadReviewerAttachment.mockResolvedValue({
      ok: true,
      blob: new Blob(['file']),
      filename: 'evidence.pdf',
    })

    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /stored xss in profile/i })
    await user.click(screen.getByRole('button', { name: /download attachment/i }))

    expect(downloadReviewerAttachment).toHaveBeenCalledWith('reviewer-token-123', 'report-1')
  })

  it('updates report status from the reviewer actions rail', async () => {
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
    updateReviewerReportStatus.mockResolvedValue({
      ok: true,
      data: {
        id: 'report-1',
        status: 'accepted',
      },
    })

    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /stored xss in profile/i })
    await user.click(screen.getByRole('button', { name: /mark accepted/i }))

    expect(updateReviewerReportStatus).toHaveBeenCalledWith(
      'reviewer-token-123',
      'report-1',
      'accepted',
      { override: false },
    )
    expect(await screen.findByText(/report status updated to accepted/i)).toBeInTheDocument()
    expect(
      screen.getByText((text, element) => {
        return element?.classList.contains('reviewer-badge') && text.trim() === 'accepted'
      }),
    ).toHaveClass('reviewer-badge', 'reviewer-badge--accepted')
  })

  it('shows breakdown fallback message when triage breakdown is unavailable', async () => {
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
          breakdown: {},
        },
      },
    })

    renderPage()

    await screen.findByRole('heading', { name: /stored xss in profile/i })
    expect(
      screen.getByText(/does not have a computed score breakdown yet/i),
    ).toBeInTheDocument()
  })

  it('allows override actions for non-triaged reports', async () => {
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
        status: 'needs_more_info',
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
    updateReviewerReportStatus.mockResolvedValue({
      ok: true,
      data: {
        id: 'report-1',
        status: 'accepted',
      },
    })

    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: /stored xss in profile/i })
    const acceptButton = screen.getByRole('button', { name: /mark accepted/i })
    expect(acceptButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /enable override actions/i }))
    expect(acceptButton).toBeEnabled()

    await user.click(acceptButton)
    expect(updateReviewerReportStatus).toHaveBeenCalledWith(
      'reviewer-token-123',
      'report-1',
      'accepted',
      { override: true },
    )
  })
})