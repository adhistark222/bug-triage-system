import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute.jsx'
import { logoutReviewer } from '../api/auth.js'

vi.mock('../api/auth.js', () => ({
  logoutReviewer: vi.fn(),
}))

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    logoutReviewer.mockReset()
    logoutReviewer.mockResolvedValue({ ok: true })
    localStorage.setItem('bug-triage-token', 'reviewer-token-123')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('logs the reviewer out after five minutes of inactivity', async () => {
    render(
      <MemoryRouter initialEntries={['/reviewer/reports']}>
        <Routes>
          <Route
            path="/reviewer/reports"
            element={
              <ProtectedRoute>
                <h1>Reviewer Reports</h1>
              </ProtectedRoute>
            }
          />
          <Route path="/reviewer/login" element={<h1>Reviewer Sign In</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /reviewer reports/i })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(logoutReviewer).toHaveBeenCalledWith('reviewer-token-123')
    expect(localStorage.getItem('bug-triage-token')).toBeNull()
    expect(screen.getByRole('heading', { name: /reviewer sign in/i })).toBeInTheDocument()
  })
})