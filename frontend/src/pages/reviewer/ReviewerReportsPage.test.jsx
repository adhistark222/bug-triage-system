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
      },
    })

    renderPage()

    expect(screen.getByText(/loading reviewer queue/i)).toBeInTheDocument()

    expect(await screen.findByText(/stored xss in profile/i)).toBeInTheDocument()
    expect(screen.getByText(/broken access control on invoices/i)).toBeInTheDocument()
    expect(screen.getByText(/critical priority/i)).toBeInTheDocument()
    expect(
      screen.getByText((text, element) => {
        return element?.tagName === 'SPAN' && text.trim() === 'submitted'
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/2 reports loaded/i)).toBeInTheDocument()
    expect(fetchReviewerReports).toHaveBeenCalledWith('reviewer-token-123', {
      status: '',
      severity_bucket: '',
      sort_by: 'priority_score',
      sort_dir: 'desc',
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
        meta: { total: 1, per_page: 15, current_page: 1 },
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
        meta: { total: 1, per_page: 15, current_page: 1 },
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
      })
    })

    expect(await screen.findByText(/broken access control on invoices/i)).toBeInTheDocument()
  })

  it('logs out through the backend, clears the token, and returns to login', async () => {
    fetchReviewerReports.mockResolvedValue({
      ok: true,
      data: [],
      meta: { total: 0, per_page: 15, current_page: 1 },
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
})