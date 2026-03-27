import { useState } from 'react'
import { loginReviewer } from '../../api/auth.js'
import { setAuthToken } from '../../auth/session.js'
import FieldRow from '../reporter/form/FieldRow.jsx'

const INITIAL_VALUES = {
  email: '',
  password: '',
}

function validate(values) {
  const errors = {}

  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  }

  if (!values.password) {
    errors.password = 'Password is required.'
  }

  return errors
}

function ReviewerLoginForm({ onSuccess }) {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function getErrorId(fieldName) {
    return `${fieldName}-error`
  }

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const nextErrors = validate(values)
    setErrors(nextErrors)
    setSubmitError('')

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    const result = await loginReviewer(values)

    if (result.ok && result.data?.token) {
      setAuthToken(result.data.token)
      onSuccess?.()
      setIsSubmitting(false)
      return
    }

    setSubmitError(result.message || 'Something went wrong while signing in.')
    setIsSubmitting(false)
  }

  return (
    <section className="reviewer-auth-card" aria-label="Reviewer login form">
      <form className="report-form" onSubmit={handleSubmit} noValidate>
        {submitError ? (
          <div className="form-alert form-alert--error" role="alert">
            {submitError}
          </div>
        ) : null}

        <FieldRow
          id="email"
          label="Email"
          required
          error={errors.email}
          errorId={getErrorId('email')}
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? getErrorId('email') : undefined}
          />
        </FieldRow>

        <FieldRow
          id="password"
          label="Password"
          required
          error={errors.password}
          errorId={getErrorId('password')}
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? getErrorId('password') : undefined}
          />
        </FieldRow>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            Sign in
          </button>
        </div>
      </form>
    </section>
  )
}

export default ReviewerLoginForm