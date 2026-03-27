import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginReviewer } from './auth.js'

describe('loginReviewer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns token data for valid reviewer credentials', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          token: 'token-123',
        },
      }),
    })

    const result = await loginReviewer({
      email: 'reviewer@example.com',
      password: 'password',
    })

    expect(fetch).toHaveBeenCalledWith('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'reviewer@example.com',
        password: 'password',
      }),
    })

    expect(result).toEqual({
      ok: true,
      data: {
        token: 'token-123',
      },
    })
  })

  it('returns auth error for invalid reviewer credentials', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({
        message: 'Invalid credentials.',
      }),
    })

    const result = await loginReviewer({
      email: 'reviewer@example.com',
      password: 'wrong-password',
    })

    expect(result).toEqual({
      ok: false,
      type: 'auth',
      message: 'Invalid credentials.',
    })
  })

  it('returns network error shape when login request fails', async () => {
    fetch.mockRejectedValue(new Error('Failed to fetch'))

    const result = await loginReviewer({
      email: 'reviewer@example.com',
      password: 'password',
    })

    expect(result).toEqual({
      ok: false,
      type: 'network',
      message: 'Unable to reach the server right now. Check your connection and try again.',
    })
  })
})