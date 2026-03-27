import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchReviewerReports } from './reviewerReports.js'

describe('fetchReviewerReports', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends reviewer token and returns paginated report data', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
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
        meta: {
          total: 1,
          per_page: 15,
          current_page: 1,
        },
      }),
    })

    const result = await fetchReviewerReports('token-123', {
      status: 'triaged',
      sort_by: 'priority_score',
      sort_dir: 'desc',
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/reviewer/reports?status=triaged&sort_by=priority_score&sort_dir=desc',
      {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-123',
      },
      },
    )

    expect(result).toEqual({
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
      meta: {
        total: 1,
        per_page: 15,
        current_page: 1,
      },
    })
  })

  it('returns auth error when reviewer token is rejected', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({
        message: 'Unauthenticated.',
      }),
    })

    const result = await fetchReviewerReports('expired-token')

    expect(result).toEqual({
      ok: false,
      type: 'auth',
      message: 'Unauthenticated.',
    })
  })

  it('returns network error when the request fails', async () => {
    fetch.mockRejectedValue(new Error('Failed to fetch'))

    const result = await fetchReviewerReports('token-123')

    expect(result).toEqual({
      ok: false,
      type: 'network',
      message: 'Unable to reach the server right now. Check your connection and try again.',
    })
  })
})