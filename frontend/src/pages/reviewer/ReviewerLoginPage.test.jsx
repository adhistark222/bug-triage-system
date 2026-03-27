import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ReviewerLoginPage from './ReviewerLoginPage.jsx'

describe('ReviewerLoginPage', () => {
  it('shows the reviewer inactivity timeout note on the sign-in page', () => {
    render(
      <MemoryRouter initialEntries={['/reviewer/login']}>
        <Routes>
          <Route path="/reviewer/login" element={<ReviewerLoginPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText(/automatically sign out after 5 minutes of inactivity/i)).toBeInTheDocument()
  })

  it('shows an explicit sign-out warning after inactivity timeout redirect', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/reviewer/login',
            state: {
              reason: 'inactive-timeout',
              from: { pathname: '/reviewer/reports' },
            },
          },
        ]}
      >
        <Routes>
          <Route path="/reviewer/login" element={<ReviewerLoginPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/you were signed out after 5 minutes of inactivity/i),
    ).toBeInTheDocument()
  })
})