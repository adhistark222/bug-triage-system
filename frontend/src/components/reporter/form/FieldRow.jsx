const REQUIRED_LABEL = ' (required)'

function FieldRow({
  id,
  label,
  required = false,
  counter = null,
  errorId,
  error,
  className = '',
  children,
}) {
  const wrapperClassName = ['field', className].filter(Boolean).join(' ')

  return (
    <div className={wrapperClassName}>
      <div className="field__label-row">
        <label htmlFor={id}>
          {label}
          {required ? <span className="field__required">{REQUIRED_LABEL}</span> : null}
        </label>
        {counter}
      </div>
      {children}
      {error ? <p id={errorId}>{error}</p> : null}
    </div>
  )
}

export default FieldRow
