import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { updateReviewerReportStatus } from './reviewerDisposition.js'

describe('updateReviewerReportStatus', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('patches reviewer disposition status and returns updated report data', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          id: 'report-1',
          status: 'accepted',
        },
      }),
    })

    const result = await updateReviewerReportStatus('token-123', 'report-1', 'accepted')

    expect(fetch).toHaveBeenCalledWith('/api/v1/reviewer/reports/report-1/status', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'accepted' }),
    })
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'report-1',
        status: 'accepted',
      },
    })
  })

  it('sends override when redisposition is explicitly enabled', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          id: 'report-1',
          status: 'rejected',
        },
      }),
    })

    await updateReviewerReportStatus('token-123', 'report-1', 'rejected', { override: true })

    expect(fetch).toHaveBeenCalledWith('/api/v1/reviewer/reports/report-1/status', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'rejected', override: true }),
    })
  })
})