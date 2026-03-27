function FilePickerStatus({ file, formatBytes, onClear }) {
  return (
    <div className="file-selection" aria-live="polite">
      {file ? (
        <>
          <p>
            Selected: <strong>{file.name}</strong> ({formatBytes(file.size)})
          </p>
          <button type="button" onClick={onClear}>
            Remove selected file
          </button>
        </>
      ) : (
        <p>No file selected.</p>
      )}
    </div>
  )
}

export default FilePickerStatus
