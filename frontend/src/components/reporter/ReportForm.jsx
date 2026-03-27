import { useRef, useState } from 'react'
import { submitReport } from '../../api/reports.js'
import CharacterCount from './form/CharacterCount.jsx'
import FieldRow from './form/FieldRow.jsx'
import FilePickerStatus from './form/FilePickerStatus.jsx'

const VULNERABILITY_TYPES = [
  'rce',
  'sql_injection',
  'xss',
  'csrf',
  'authentication_bypass',
  'authorization_bypass',
  'ssrf',
  'information_disclosure',
  'insecure_deserialization',
  'path_traversal',
  'other',
]

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical']

const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'image/png',
  'image/jpg',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
]

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

const INITIAL_VALUES = {
  title: '',
  vulnerability_type: '',
  reporter_severity_estimate: '',
  affected_area: '',
  reproduction_steps: '',
  impact_description: '',
  contact_email: '',
}

const FIELD_FOCUS_ORDER = [
  'title',
  'vulnerability_type',
  'reporter_severity_estimate',
  'affected_area',
  'reproduction_steps',
  'impact_description',
  'contact_email',
  'attachment',
]

function formatBytes(bytes) {
  if (!bytes) {
    return '0 B'
  }

  const kilobytes = bytes / 1024
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`
  }

  return `${(kilobytes / 1024).toFixed(2)} MB`
}

function validate(values, attachmentFile) {
  const errors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  } else if (values.title.length > 255) {
    errors.title = 'Title must be 255 characters or fewer.'
  }

  if (!values.vulnerability_type) {
    errors.vulnerability_type = 'Vulnerability type is required.'
  }

  if (!values.reporter_severity_estimate) {
    errors.reporter_severity_estimate = 'Severity estimate is required.'
  }

  if (!values.affected_area.trim()) {
    errors.affected_area = 'Affected area is required.'
  } else if (values.affected_area.length > 255) {
    errors.affected_area = 'Affected area must be 255 characters or fewer.'
  }

  if (!values.reproduction_steps.trim()) {
    errors.reproduction_steps = 'Reproduction steps are required.'
  }

  if (!values.impact_description.trim()) {
    errors.impact_description = 'Impact description is required.'
  }

  if (!values.contact_email.trim()) {
    errors.contact_email = 'Contact email is required.'
  } else if (!/^\S+@\S+\.\S+$/.test(values.contact_email.trim())) {
    errors.contact_email = 'Enter a valid email address.'
  }

  if (attachmentFile) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(attachmentFile.type)) {
      errors.attachment =
        'Attachment must be a PDF, TXT, PNG, JPG, JPEG, or ZIP file.'
    } else if (attachmentFile.size > MAX_ATTACHMENT_BYTES) {
      errors.attachment = 'Attachment must be 5 MB or smaller.'
    }
  }

  return errors
}

function ReportForm() {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [attachmentFile, setAttachmentFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successPayload, setSuccessPayload] = useState(null)
  const attachmentInputRef = useRef(null)

  function getErrorId(fieldName) {
    return `${fieldName}-error`
  }

  function handleChange(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  function handleAttachmentChange(event) {
    const file = event.target.files?.[0] ?? null
    setAttachmentFile(file)
  }

  function clearAttachment() {
    setAttachmentFile(null)
    setErrors((previous) => {
      const next = { ...previous }
      delete next.attachment
      return next
    })

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ''
    }
  }

  function resetForm() {
    setValues(INITIAL_VALUES)
    setAttachmentFile(null)
    setErrors({})
    setSubmitError('')

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ''
    }
  }

  function focusFirstInvalidField(nextErrors) {
    const firstField = FIELD_FOCUS_ORDER.find((fieldName) => nextErrors[fieldName])
    if (!firstField) {
      return
    }

    const target = document.getElementById(firstField)
    target?.focus()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const nextErrors = validate(values, attachmentFile)
    setErrors(nextErrors)
    setSubmitError('')

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors)
      return
    }

    setIsSubmitting(true)

    const result = await submitReport(values, attachmentFile)

    if (result.ok) {
      setSuccessPayload(result.data)
      resetForm()
      setIsSubmitting(false)
      return
    }

    if (result.type === 'validation') {
      const mappedErrors = result.fieldErrors || {}
      setErrors(mappedErrors)
      focusFirstInvalidField(mappedErrors)
      setIsSubmitting(false)
      return
    }

    setSubmitError(
      result.message || 'Something went wrong while submitting your report.',
    )
    setIsSubmitting(false)
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <section className="report-form-card" aria-label="Report submission form">
      <form className="report-form" onSubmit={handleSubmit} noValidate>
        {successPayload ? (
          <div className="form-success" role="status" aria-live="polite">
            <h2>Report submitted successfully</h2>
            {successPayload.message ? <p>{successPayload.message}</p> : null}
            {successPayload.id ? (
              <p>
                <strong>Report ID:</strong> {successPayload.id}
              </p>
            ) : null}
            {successPayload.status ? (
              <p>
                <strong>Status:</strong> {successPayload.status}
              </p>
            ) : null}
            <button
              type="button"
              className="form-secondary-action"
              onClick={() => setSuccessPayload(null)}
            >
              Submit another report
            </button>
          </div>
        ) : null}

        {submitError ? (
          <div className="form-alert form-alert--error" role="alert">
            {submitError}
          </div>
        ) : null}

        {hasErrors ? (
          <div className="form-alert" role="alert">
            Please review the highlighted fields and try again.
          </div>
        ) : null}

        <fieldset className="form-section">
          <legend>Report Summary</legend>

          <div className="form-grid form-grid--two-up">
            <FieldRow
              id="title"
              label="Title"
              required
              counter={<CharacterCount current={values.title.length} max={255} />}
              error={errors.title}
              errorId={getErrorId('title')}
            >
              <input
                id="title"
                name="title"
                type="text"
                value={values.title}
                onChange={handleChange}
                placeholder="Stored XSS in account profile"
                required
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? getErrorId('title') : undefined}
              />
            </FieldRow>

            <FieldRow
              id="affected_area"
              label="Affected Area"
              required
              counter={<CharacterCount current={values.affected_area.length} max={255} />}
              error={errors.affected_area}
              errorId={getErrorId('affected_area')}
            >
              <input
                id="affected_area"
                name="affected_area"
                type="text"
                value={values.affected_area}
                onChange={handleChange}
                placeholder="Settings > Profile editor"
                required
                aria-invalid={Boolean(errors.affected_area)}
                aria-describedby={errors.affected_area ? getErrorId('affected_area') : undefined}
              />
            </FieldRow>
          </div>

          <div className="form-grid form-grid--two-up">
            <FieldRow
              id="vulnerability_type"
              label="Vulnerability Type"
              required
              error={errors.vulnerability_type}
              errorId={getErrorId('vulnerability_type')}
            >
              <select
                id="vulnerability_type"
                name="vulnerability_type"
                value={values.vulnerability_type}
                onChange={handleChange}
                required
                aria-invalid={Boolean(errors.vulnerability_type)}
                aria-describedby={
                  errors.vulnerability_type
                    ? getErrorId('vulnerability_type')
                    : undefined
                }
              >
                <option value="">Select vulnerability type</option>
                {VULNERABILITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              id="reporter_severity_estimate"
              label="Severity Estimate"
              required
              error={errors.reporter_severity_estimate}
              errorId={getErrorId('reporter_severity_estimate')}
            >
              <select
                id="reporter_severity_estimate"
                name="reporter_severity_estimate"
                value={values.reporter_severity_estimate}
                onChange={handleChange}
                required
                aria-invalid={Boolean(errors.reporter_severity_estimate)}
                aria-describedby={
                  errors.reporter_severity_estimate
                    ? getErrorId('reporter_severity_estimate')
                    : undefined
                }
              >
                <option value="">Select severity estimate</option>
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </FieldRow>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Technical Details</legend>

          <FieldRow
            id="reproduction_steps"
            label="Reproduction Steps"
            required
            error={errors.reproduction_steps}
            errorId={getErrorId('reproduction_steps')}
          >
            <textarea
              id="reproduction_steps"
              name="reproduction_steps"
              value={values.reproduction_steps}
              onChange={handleChange}
              placeholder={
                '1. Login as a normal user\n2. Open profile editor\n3. Insert payload...'
              }
              required
              aria-invalid={Boolean(errors.reproduction_steps)}
              aria-describedby={
                errors.reproduction_steps
                  ? getErrorId('reproduction_steps')
                  : undefined
              }
            />
          </FieldRow>

          <FieldRow
            id="impact_description"
            label="Impact Description"
            required
            error={errors.impact_description}
            errorId={getErrorId('impact_description')}
          >
            <textarea
              id="impact_description"
              name="impact_description"
              value={values.impact_description}
              onChange={handleChange}
              placeholder="Explain business and user impact, including potential data exposure."
              required
              aria-invalid={Boolean(errors.impact_description)}
              aria-describedby={
                errors.impact_description
                  ? getErrorId('impact_description')
                  : undefined
              }
            />
          </FieldRow>
        </fieldset>

        <fieldset className="form-section">
          <legend>Reporter Contact</legend>

          <FieldRow
            id="contact_email"
            label="Contact Email"
            required
            error={errors.contact_email}
            errorId={getErrorId('contact_email')}
          >
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              value={values.contact_email}
              onChange={handleChange}
              placeholder="researcher@example.com"
              required
              aria-invalid={Boolean(errors.contact_email)}
              aria-describedby={
                errors.contact_email ? getErrorId('contact_email') : undefined
              }
            />
          </FieldRow>

          <FieldRow
            id="attachment"
            label="Attachment"
            className="field--file"
            error={errors.attachment}
            errorId={getErrorId('attachment')}
          >
            <input
              id="attachment"
              name="attachment"
              type="file"
              ref={attachmentInputRef}
              onChange={handleAttachmentChange}
              aria-invalid={Boolean(errors.attachment)}
              aria-describedby={errors.attachment ? getErrorId('attachment') : undefined}
            />
            <small>Accepted formats: PDF, TXT, PNG, JPG, JPEG, ZIP up to 5MB.</small>
            <FilePickerStatus
              file={attachmentFile}
              formatBytes={formatBytes}
              onClear={clearAttachment}
            />
          </FieldRow>
        </fieldset>

        <div className="form-actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default ReportForm
