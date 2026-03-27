import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { submitReport } from './reports.js'

const VALID_VALUES = {
  title: 'Stored XSS in profile bio',
  vulnerability_type: 'xss',
  reporter_severity_estimate: 'high',
  affected_area: 'Profile editor',
  reproduction_steps: '1. Login\n2. Edit profile\n3. Save payload',
  impact_description: 'Script executes for readers of the profile page.',
  contact_email: 'researcher@example.com',
}

describe('submitReport', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends multipart request and returns success data', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        data: {
          id: 'abc-123',
          status: 'submitted',
          message: 'Report received.',
        },
      }),
    })

    const result = await submitReport(VALID_VALUES)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/v1/reports')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('title')).toBe(VALID_VALUES.title)
    expect(options.body.get('contact_email')).toBe(VALID_VALUES.contact_email)
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'abc-123',
        status: 'submitted',
        message: 'Report received.',
      },
    })
  })

  it('maps laravel 422 field errors into first-message strings', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({
        message: 'The given data was invalid.',
        errors: {
          title: ['The title field is required.'],
          contact_email: ['The contact email must be a valid email address.'],
        },
      }),
    })

    const result = await submitReport(VALID_VALUES)

    expect(result).toEqual({
      ok: false,
      type: 'validation',
      message: 'The given data was invalid.',
      fieldErrors: {
        title: 'The title field is required.',
        contact_email: 'The contact email must be a valid email address.',
      },
    })
  })

  it('returns network error shape when request throws', async () => {
    fetch.mockRejectedValue(new Error('Failed to fetch'))

    const result = await submitReport(VALID_VALUES)

    expect(result).toEqual({
      ok: false,
      type: 'network',
      message:
        'Unable to reach the server right now. Check your connection and try again.',
    })
  })

  it('returns server error shape for non-422 responses', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({
        message: 'Internal server error',
      }),
    })

    const result = await submitReport(VALID_VALUES)

    expect(result).toEqual({
      ok: false,
      type: 'server',
      message: 'Internal server error',
    })
  })
})
