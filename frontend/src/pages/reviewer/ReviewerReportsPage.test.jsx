import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ReviewerReportsPage from './ReviewerReportsPage.jsx'
import { fetchReviewerReports } from '../../api/reviewerReports.js'

vi.mock('../../api/reviewerReports.js', () => ({
  fetchReviewerReports: vi.fn(),
}))

describe('ReviewerReportsPage', () => {
  beforeEach(() => {
    fetchReviewerReports.mockReset()
    localStorage.setItem('bug-triage-token', 'reviewer-token-123')
  })

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

    render(<ReviewerReportsPage />)

    expect(screen.getByText(/loading reviewer queue/i)).toBeInTheDocument()

    expect(await screen.findByText(/stored xss in profile/i)).toBeInTheDocument()
    expect(screen.getByText(/broken access control on invoices/i)).toBeInTheDocument()
    expect(screen.getByText(/critical priority/i)).toBeInTheDocument()
    expect(screen.getByText(/submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/2 reports loaded/i)).toBeInTheDocument()
    expect(fetchReviewerReports).toHaveBeenCalledWith('reviewer-token-123')
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

    render(<ReviewerReportsPage />)

    expect(await screen.findByText(/no reports match the current queue yet/i)).toBeInTheDocument()
  })

  it('shows auth/server errors when the queue request fails', async () => {
    fetchReviewerReports.mockResolvedValue({
      ok: false,
      type: 'auth',
      message: 'Unauthenticated.',
    })

    render(<ReviewerReportsPage />)

    expect(await screen.findByText(/unauthenticated/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(localStorage.getItem('bug-triage-token')).toBeNull()
    })
  })
})