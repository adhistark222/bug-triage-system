import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ReviewerLoginForm from './ReviewerLoginForm.jsx'
import { loginReviewer } from '../../api/auth.js'

vi.mock('../../api/auth.js', () => ({
  loginReviewer: vi.fn(),
}))

describe('ReviewerLoginForm', () => {
  beforeEach(() => {
    loginReviewer.mockReset()
    localStorage.clear()
  })

  it('stores token and calls success handler after valid login', async () => {
    loginReviewer.mockResolvedValue({
      ok: true,
      data: {
        token: 'reviewer-token-123',
      },
    })

    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(<ReviewerLoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText(/email/i), 'reviewer@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(localStorage.getItem('bug-triage-token')).toBe('reviewer-token-123')
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('shows invalid credential errors without clearing entered values', async () => {
    loginReviewer.mockResolvedValue({
      ok: false,
      type: 'auth',
      message: 'Invalid credentials.',
    })

    const user = userEvent.setup()

    render(<ReviewerLoginForm onSuccess={vi.fn()} />)

    await user.type(screen.getByLabelText(/email/i), 'reviewer@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toHaveValue('reviewer@example.com')
    expect(screen.getByLabelText(/password/i)).toHaveValue('wrong-password')
  })

  it('validates required fields before making the login request', async () => {
    const user = userEvent.setup()

    render(<ReviewerLoginForm onSuccess={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(loginReviewer).not.toHaveBeenCalled()
  })
})