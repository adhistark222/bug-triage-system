import { useRef, useState } from 'react'

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

const REQUIRED_LABEL = ' (required)'
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

  function focusFirstInvalidField(nextErrors) {
    const firstField = FIELD_FOCUS_ORDER.find((fieldName) => nextErrors[fieldName])
    if (!firstField) {
      return
    }

    const target = document.getElementById(firstField)
    target?.focus()
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(values, attachmentFile)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors)
    }
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <section className="report-form-card" aria-label="Report submission form">
      <form className="report-form" onSubmit={handleSubmit} noValidate>
        {hasErrors ? (
          <div className="form-alert" role="alert">
            Please review the highlighted fields and try again.
          </div>
        ) : null}

        <fieldset className="form-section">
          <legend>Report Summary</legend>

          <div className="form-grid form-grid--two-up">
            <div className="field">
              <div className="field__label-row">
                <label htmlFor="title">
                  Title
                  <span className="field__required">{REQUIRED_LABEL}</span>
                </label>
                <small className="field-counter">{values.title.length}/255</small>
              </div>
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
              {errors.title ? <p id={getErrorId('title')}>{errors.title}</p> : null}
            </div>

            <div className="field">
              <div className="field__label-row">
                <label htmlFor="affected_area">
                  Affected Area
                  <span className="field__required">{REQUIRED_LABEL}</span>
                </label>
                <small className="field-counter">{values.affected_area.length}/255</small>
              </div>
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
              {errors.affected_area ? (
                <p id={getErrorId('affected_area')}>{errors.affected_area}</p>
              ) : null}
            </div>
          </div>

          <div className="form-grid form-grid--two-up">
            <div className="field">
              <label htmlFor="vulnerability_type">
                Vulnerability Type
                <span className="field__required">{REQUIRED_LABEL}</span>
              </label>
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
              {errors.vulnerability_type ? (
                <p id={getErrorId('vulnerability_type')}>
                  {errors.vulnerability_type}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="reporter_severity_estimate">
                Severity Estimate
                <span className="field__required">{REQUIRED_LABEL}</span>
              </label>
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
              {errors.reporter_severity_estimate ? (
                <p id={getErrorId('reporter_severity_estimate')}>
                  {errors.reporter_severity_estimate}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Technical Details</legend>

          <div className="field">
            <label htmlFor="reproduction_steps">
              Reproduction Steps
              <span className="field__required">{REQUIRED_LABEL}</span>
            </label>
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
            {errors.reproduction_steps ? (
              <p id={getErrorId('reproduction_steps')}>
                {errors.reproduction_steps}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="impact_description">
              Impact Description
              <span className="field__required">{REQUIRED_LABEL}</span>
            </label>
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
            {errors.impact_description ? (
              <p id={getErrorId('impact_description')}>
                {errors.impact_description}
              </p>
            ) : null}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Reporter Contact</legend>

          <div className="field">
            <label htmlFor="contact_email">
              Contact Email
              <span className="field__required">{REQUIRED_LABEL}</span>
            </label>
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
            {errors.contact_email ? (
              <p id={getErrorId('contact_email')}>{errors.contact_email}</p>
            ) : null}
          </div>

          <div className="field field--file">
            <label htmlFor="attachment">Attachment</label>
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
            <div className="file-selection" aria-live="polite">
              {attachmentFile ? (
                <>
                  <p>
                    Selected: <strong>{attachmentFile.name}</strong> ({formatBytes(attachmentFile.size)})
                  </p>
                  <button type="button" onClick={clearAttachment}>
                    Remove selected file
                  </button>
                </>
              ) : (
                <p>No file selected.</p>
              )}
            </div>
            {errors.attachment ? (
              <p id={getErrorId('attachment')}>{errors.attachment}</p>
            ) : null}
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit">Submit Report</button>
        </div>
      </form>
    </section>
  )
}

export default ReportForm
