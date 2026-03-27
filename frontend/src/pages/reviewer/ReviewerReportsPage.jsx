import AppLayout from '../../layouts/AppLayout.jsx'

function ReviewerReportsPage() {
  return (
    <AppLayout>
      <section className="reviewer-reports-view">
        <div className="reviewer-reports-hero">
          <p className="report-intro__eyebrow">Reviewer workspace</p>
          <h1>Reviewer Reports</h1>
          <p className="report-intro__lead">
            Dashboard data wiring comes next. This shell confirms authenticated route
            access and gives the upcoming list view a stable entry point.
          </p>
        </div>
      </section>
    </AppLayout>
  )
}

export default ReviewerReportsPage