import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadReviewerAttachment } from './reviewerAttachments.js'

describe('downloadReviewerAttachment', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('downloads the reviewer attachment with bearer auth', async () => {
    const blob = new Blob(['file'])
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(blob),
      headers: {
        get: vi.fn().mockReturnValue('attachment; filename="evidence.pdf"'),
      },
    })

    const result = await downloadReviewerAttachment('token-123', 'report-1')

    expect(fetch).toHaveBeenCalledWith('/api/v1/reviewer/reports/report-1/attachment', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-123',
      },
    })
    expect(result.ok).toBe(true)
    expect(result.filename).toBe('evidence.pdf')
    expect(result.blob).toBe(blob)
  })
})