import SubmissionIntro from '../../components/reporter/SubmissionIntro.jsx'
import ReportForm from '../../components/reporter/ReportForm.jsx'
import AppLayout from '../../layouts/AppLayout.jsx'

function ReportSubmitPage() {
  return (
    <AppLayout>
      <section className="report-submit-view">
        <SubmissionIntro />
        <ReportForm />
      </section>
    </AppLayout>
  )
}

export default ReportSubmitPage
