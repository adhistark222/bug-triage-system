import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import App from '../App.jsx'

describe('App routing', () => {
  function renderApp(initialEntries) {
    render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>,
    )
  }

  it('renders reporter submission page at root route', () => {
    renderApp(['/'])

    expect(
      screen.getByRole('heading', { name: /submit security report/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /reviewer sign in/i }),
    ).toHaveAttribute('href', '/reviewer/login')
  })

  it('renders reviewer login page at reviewer login route', () => {
    renderApp(['/reviewer/login'])

    expect(
      screen.getByRole('heading', { name: /reviewer sign in/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated reviewer route access to login', () => {
    localStorage.removeItem('bug-triage-token')

    renderApp(['/reviewer/reports'])

    expect(
      screen.getByRole('heading', { name: /reviewer sign in/i }),
    ).toBeInTheDocument()
  })

  it('redirects unauthenticated reviewer detail route access to login', () => {
    localStorage.removeItem('bug-triage-token')

    renderApp(['/reviewer/reports/report-123'])

    expect(
      screen.getByRole('heading', { name: /reviewer sign in/i }),
    ).toBeInTheDocument()
  })
})
