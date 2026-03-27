import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchReviewerReportDetail } from './reviewerReportDetail.js'

describe('fetchReviewerReportDetail', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns report detail data for an authenticated reviewer request', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
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
      }),
    })

    const result = await fetchReviewerReportDetail('token-123', 'report-1')

    expect(fetch).toHaveBeenCalledWith('/api/v1/reviewer/reports/report-1', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-123',
      },
    })
    expect(result.ok).toBe(true)
    expect(result.data.id).toBe('report-1')
    expect(result.data.triage_result.breakdown.total).toBe(92)
  })

  it('returns auth error when reviewer token is rejected', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ message: 'Unauthenticated.' }),
    })

    const result = await fetchReviewerReportDetail('expired-token', 'report-1')

    expect(result).toEqual({
      ok: false,
      type: 'auth',
      message: 'Unauthenticated.',
    })
  })
})