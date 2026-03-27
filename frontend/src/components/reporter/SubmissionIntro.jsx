function SubmissionIntro() {
  return (
    <header className="report-intro" aria-label="Submission guidance">
      <p className="report-intro__eyebrow">Public Security Intake</p>
      <h1>Submit Security Report</h1>
      <p className="report-intro__lead">
        Share clear, reproducible details so the reviewer team can triage your
        report quickly and accurately.
      </p>
      <ul className="report-intro__checklist" aria-label="Submission tips">
        <li>Use concrete reproduction steps and expected behavior.</li>
        <li>Keep impact focused on user or business risk.</li>
        <li>Optional attachment supports screenshots, logs, and archives.</li>
      </ul>
    </header>
  )
}

export default SubmissionIntro
