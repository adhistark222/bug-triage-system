import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import ReviewerReportsPage from './ReviewerReportsPage.jsx'
import { fetchReviewerReports } from '../../api/reviewerReports.js'
import { logoutReviewer } from '../../api/auth.js'

vi.mock('../../api/reviewerReports.js', () => ({
  fetchReviewerReports: vi.fn(),
}))

vi.mock('../../api/auth.js', () => ({
  logoutReviewer: vi.fn(),
}))

describe('ReviewerReportsPage', () => {
  beforeEach(() => {
    fetchReviewerReports.mockReset()
    logoutReviewer.mockReset()
    localStorage.setItem('bug-triage-token', 'reviewer-token-123')
  })

  function renderPage() {
    render(
      <MemoryRouter initialEntries={['/reviewer/reports']}>
        <Routes>
          <Route path="/reviewer/reports" element={<ReviewerReportsPage />} />
          <Route path="/reviewer/login" element={<h1>Reviewer Sign In</h1>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('loads and renders reviewer reports from the API', async () => {
    fetchReviewerReports.mockResolvedValue({
      ok: true,
      data: [
        {
          id: 'report-1',
          title: 'Stored XSS in profile',
          vulnerability_type: 'xss',
          status: 'triaged',
          has_attachment: true,
          triage_result: {
            priority_score: 92,
            severity_bucket: 'critical',
          },
          created_at: '2026-03-26T00:00:00Z',
        },
        {
          id: 'report-2',
          title: 'Broken access control on invoices',
          vulnerability_type: 'authorization_bypass',
          status: 'submitted',
          has_attachment: false,
          triage_result: null,
          created_at: '2026-03-25T00:00:00Z',
        },
      ],
      meta: {
        total: 2,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: 1,
        to: 2,
      },
    })

    renderPage()

    expect(screen.getByText(/loading reviewer queue/i)).toBeInTheDocument()

    expect(await screen.findByText(/stored xss in profile/i)).toBeInTheDocument()
    expect(screen.getByText(/broken access control on invoices/i)).toBeInTheDocument()
    expect(
      screen.getByText((text, element) => {
        return element?.tagName === 'SPAN' && text.trim() === 'submitted'
      }),
    ).toBeInTheDocument()
    // Summary shows "Showing 1–2 of 2 reports" in the queue header
    expect(screen.getByText(/showing 1/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /open report stored xss in profile/i }),
    ).toHaveAttribute('href', '/reviewer/reports/report-1')
    expect(screen.getByText(/queue guide/i)).toBeInTheDocument()
    expect(screen.getByText(/critical findings appear first by default/i)).toBeInTheDocument()
    expect(
      screen.getByText((text, element) => {
        return element?.classList.contains('reviewer-pill') && text.trim() === 'critical'
      }),
    ).toHaveClass('reviewer-pill', 'reviewer-pill--critical')
    expect(
      screen.getByText((text, element) => {
        return element?.classList.contains('reviewer-score') && text.trim() === '92'
      }),
    ).toHaveClass('reviewer-score', 'reviewer-score--critical')
    expect(
      screen.getByText((text, element) => {
        return element?.classList.contains('reviewer-vuln-chip') && text.trim() === 'xss'
      }),
    ).toHaveClass('reviewer-vuln-chip', 'reviewer-vuln-chip--hot')
    expect(fetchReviewerReports).toHaveBeenCalledWith('reviewer-token-123', {
      status: '',
      severity_bucket: '',
      sort_by: 'priority_score',
      sort_dir: 'desc',
      page: 1,
      per_page: 15,
    })
  })

  it('shows empty state when no reports are returned', async () => {
    fetchReviewerReports.mockResolvedValue({
      ok: true,
      data: [],
      meta: {
        total: 0,
        per_page: 15,
        current_page: 1,
        last_page: 1,
        from: null,
        to: null,
      },
    })

    renderPage()

    expect(await screen.findByText(/no reports match the current queue yet/i)).toBeInTheDocument()
  })

  it('shows auth/server errors when the queue request fails', async () => {
    fetchReviewerReports.mockResolvedValue({
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

  it('refetches the queue when reviewer filter controls change', async () => {
    fetchReviewerReports
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-1',
            title: 'Stored XSS in profile',
            vulnerability_type: 'xss',
            status: 'triaged',
            has_attachment: true,
            triage_result: {
              priority_score: 92,
              severity_bucket: 'critical',
            },
            created_at: '2026-03-26T00:00:00Z',
          },
        ],
        meta: { total: 1, per_page: 15, current_page: 1, last_page: 1, from: 1, to: 1 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-2',
            title: 'Broken access control on invoices',
            vulnerability_type: 'authorization_bypass',
            status: 'submitted',
            has_attachment: false,
            triage_result: null,
            created_at: '2026-03-25T00:00:00Z',
          },
        ],
        meta: { total: 1, per_page: 15, current_page: 1, last_page: 1, from: 1, to: 1 },
      })

    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/stored xss in profile/i)

    await user.selectOptions(screen.getByLabelText(/status filter/i), 'submitted')

    await waitFor(() => {
      expect(fetchReviewerReports).toHaveBeenLastCalledWith('reviewer-token-123', {
        status: 'submitted',
        severity_bucket: '',
        sort_by: 'priority_score',
        sort_dir: 'desc',
        page: 1,
        per_page: 15,
      })
    })

    expect(await screen.findByText(/broken access control on invoices/i)).toBeInTheDocument()
  })

  it('logs out through the backend, clears the token, and returns to login', async () => {
    fetchReviewerReports.mockResolvedValue({
      ok: true,
      data: [],
      meta: { total: 0, per_page: 15, current_page: 1, last_page: 1, from: null, to: null },
    })
    logoutReviewer.mockResolvedValue({
      ok: true,
      message: 'Logged out successfully.',
    })

    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/no reports match the current queue yet/i)
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await waitFor(() => {
      expect(logoutReviewer).toHaveBeenCalledWith('reviewer-token-123')
    })
    await waitFor(() => {
      expect(localStorage.getItem('bug-triage-token')).toBeNull()
    })
    expect(await screen.findByRole('heading', { name: /reviewer sign in/i })).toBeInTheDocument()
  })

  it('shows pagination bar when more than one page is available', async () => {
    fetchReviewerReports.mockResolvedValue({
      ok: true,
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `report-${i + 1}`,
        title: `Report ${i + 1}`,
        vulnerability_type: 'xss',
        status: 'triaged',
        has_attachment: false,
        triage_result: { priority_score: 50, severity_bucket: 'medium' },
        created_at: '2026-03-26T00:00:00Z',
      })),
      meta: {
        total: 30,
        per_page: 10,
        current_page: 1,
        last_page: 3,
        from: 1,
        to: 10,
      },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Report 1' })).toBeInTheDocument()

    expect(screen.getByRole('navigation', { name: /queue pagination/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /page 1/i })).toHaveClass(
      'reviewer-pagination__page-button--active',
    )
    expect(screen.getByRole('button', { name: /page 3/i })).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: /queue pagination/i }),
    ).toHaveTextContent(/page 1 of 3/i)
  })

  it('navigates to the next page when Next button is clicked', async () => {
    const page1Meta = { total: 20, per_page: 15, current_page: 1, last_page: 2, from: 1, to: 15 }
    const page2Meta = { total: 20, per_page: 15, current_page: 2, last_page: 2, from: 16, to: 20 }

    fetchReviewerReports
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-a',
            title: 'SQL Injection in login',
            vulnerability_type: 'sql_injection',
            status: 'triaged',
            has_attachment: false,
            triage_result: { priority_score: 80, severity_bucket: 'high' },
            created_at: '2026-03-26T00:00:00Z',
          },
        ],
        meta: page1Meta,
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-b',
            title: 'CSRF on profile update',
            vulnerability_type: 'csrf',
            status: 'accepted',
            has_attachment: false,
            triage_result: { priority_score: 40, severity_bucket: 'low' },
            created_at: '2026-03-25T00:00:00Z',
          },
        ],
        meta: page2Meta,
      })

    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/sql injection in login/i)

    await user.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() => {
      expect(fetchReviewerReports).toHaveBeenLastCalledWith('reviewer-token-123', {
        status: '',
        severity_bucket: '',
        sort_by: 'priority_score',
        sort_dir: 'desc',
        page: 2,
        per_page: 15,
      })
    })

    expect(await screen.findByText(/csrf on profile update/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled()
  })

  it('changing filter resets to page 1', async () => {
    const pageMeta = { total: 20, per_page: 15, current_page: 2, last_page: 2, from: 16, to: 20 }

    fetchReviewerReports
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-a',
            title: 'SQL Injection in login',
            vulnerability_type: 'sql_injection',
            status: 'triaged',
            has_attachment: false,
            triage_result: { priority_score: 80, severity_bucket: 'high' },
            created_at: '2026-03-26T00:00:00Z',
          },
        ],
        meta: { total: 20, per_page: 10, current_page: 1, last_page: 2, from: 1, to: 10 },
      })
      .mockResolvedValueOnce({ ok: true, data: [{ id: 'r-p2', title: 'Page two report', vulnerability_type: 'xss', status: 'triaged', has_attachment: false, triage_result: { priority_score: 50, severity_bucket: 'medium' }, created_at: '2026-03-25T00:00:00Z' }], meta: pageMeta })
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-c',
            title: 'Accepted report after filter reset',
            vulnerability_type: 'xss',
            status: 'accepted',
            has_attachment: false,
            triage_result: { priority_score: 60, severity_bucket: 'high' },
            created_at: '2026-03-24T00:00:00Z',
          },
        ],
        meta: { total: 5, per_page: 10, current_page: 1, last_page: 1, from: 1, to: 5 },
      })

    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/sql injection in login/i)

    // Navigate to page 2
    await user.click(screen.getByRole('button', { name: /next page/i }))
    await screen.findByText(/page two report/i)

    // Change a filter — should reset to page 1
    await user.selectOptions(screen.getByLabelText(/status filter/i), 'accepted')

    await waitFor(() => {
      expect(fetchReviewerReports).toHaveBeenLastCalledWith('reviewer-token-123', {
        status: 'accepted',
        severity_bucket: '',
        sort_by: 'priority_score',
        sort_dir: 'desc',
        page: 1,
        per_page: 15,
      })
    })
  })

  it('changing per page resets to page 1 and passes new per_page', async () => {
    fetchReviewerReports
      .mockResolvedValueOnce({
        ok: true,
        data: [
          {
            id: 'report-a',
            title: 'SQL Injection in login',
            vulnerability_type: 'sql_injection',
            status: 'triaged',
            has_attachment: false,
            triage_result: { priority_score: 80, severity_bucket: 'high' },
            created_at: '2026-03-26T00:00:00Z',
          },
        ],
        meta: { total: 50, per_page: 15, current_page: 1, last_page: 4, from: 1, to: 15 },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: [],
        meta: { total: 50, per_page: 25, current_page: 1, last_page: 2, from: 1, to: 25 },
      })

    const user = userEvent.setup()
    renderPage()

    await screen.findByText(/sql injection in login/i)

    await user.selectOptions(screen.getByLabelText(/entries per page/i), '25')

    await waitFor(() => {
      expect(fetchReviewerReports).toHaveBeenLastCalledWith('reviewer-token-123', {
        status: '',
        severity_bucket: '',
        sort_by: 'priority_score',
        sort_dir: 'desc',
        page: 1,
        per_page: 25,
      })
    })
  })
})