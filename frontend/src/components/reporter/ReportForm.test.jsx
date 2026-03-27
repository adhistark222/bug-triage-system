import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ReportForm from './ReportForm.jsx'
import { submitReport } from '../../api/reports.js'

vi.mock('../../api/reports.js', () => ({
  submitReport: vi.fn(),
}))

function createLargeFile() {
  const largeContent = 'a'.repeat(5 * 1024 * 1024 + 1)
  return new File([largeContent], 'big.zip', { type: 'application/zip' })
}

async function fillValidRequiredFields(user) {
  await user.type(
    screen.getByLabelText(/title/i),
    'Stored XSS in account profile',
  )
  await user.selectOptions(screen.getByLabelText(/vulnerability type/i), 'xss')
  await user.selectOptions(screen.getByLabelText(/severity estimate/i), 'high')
  await user.type(screen.getByLabelText(/affected area/i), 'Profile settings page')
  await user.type(
    screen.getByLabelText(/reproduction steps/i),
    '1. Login\n2. Edit bio\n3. Save payload',
  )
  await user.type(
    screen.getByLabelText(/impact description/i),
    'Script executes when profile is viewed by other users.',
  )
  await user.type(screen.getByLabelText(/contact email/i), 'researcher@example.com')
}

describe('ReportForm', () => {
  beforeEach(() => {
    submitReport.mockReset()
  })

  it('renders required report fields and submit action', () => {
    render(<ReportForm />)

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vulnerability type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/severity estimate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/affected area/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/reproduction steps/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/impact description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/attachment/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /submit report/i }),
    ).toBeInTheDocument()
  })

  it('shows required field errors on empty submit', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    expect(
      screen.getByText(/vulnerability type is required/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/severity estimate is required/i)).toBeInTheDocument()
    expect(screen.getByText(/affected area is required/i)).toBeInTheDocument()
    expect(screen.getByText(/reproduction steps are required/i)).toBeInTheDocument()
    expect(screen.getByText(/impact description is required/i)).toBeInTheDocument()
    expect(screen.getByText(/contact email is required/i)).toBeInTheDocument()
  })

  it('shows email format error for invalid email value', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    await user.type(screen.getByLabelText(/contact email/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument()
  })

  it('shows title max-length error when title exceeds 255 chars', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    await user.type(screen.getByLabelText(/title/i), 'a'.repeat(256))
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(
      screen.getByText(/title must be 255 characters or fewer/i),
    ).toBeInTheDocument()
  })

  it('shows file type error for unsupported attachment type', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    const badFile = new File(['content'], 'malware.exe', {
      type: 'application/x-msdownload',
    })

    await user.upload(screen.getByLabelText(/attachment/i), badFile)
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(
      screen.getByText(/attachment must be a pdf, txt, png, jpg, jpeg, or zip file/i),
    ).toBeInTheDocument()
  })

  it('shows file size error for oversized attachment', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    await user.upload(screen.getByLabelText(/attachment/i), createLargeFile())
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(screen.getByText(/attachment must be 5 mb or smaller/i)).toBeInTheDocument()
  })

  it('moves focus to the first invalid field on submit', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(screen.getByLabelText(/title/i)).toHaveFocus()
  })

  it('shows clear required indicators on all required labels', () => {
    render(<ReportForm />)

    expect(screen.getAllByText(/\(required\)/i)).toHaveLength(7)
  })

  it('renders live character counters for title and affected area', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    expect(screen.getAllByText('0/255')).toHaveLength(2)

    await user.type(screen.getByLabelText(/title/i), 'abc')
    await user.type(screen.getByLabelText(/affected area/i), 'abcd')

    expect(screen.getByText('3/255')).toBeInTheDocument()
    expect(screen.getByText('4/255')).toBeInTheDocument()
  })

  it('shows selected attachment name and supports clearing the file', async () => {
    const user = userEvent.setup()
    render(<ReportForm />)

    const attachmentInput = screen.getByLabelText(/attachment/i)
    const file = new File(['ok'], 'evidence.txt', { type: 'text/plain' })

    await user.upload(attachmentInput, file)

    expect(screen.getByText(/evidence.txt/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /remove selected file/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove selected file/i }))

    expect(screen.getByText(/no file selected/i)).toBeInTheDocument()
    expect(attachmentInput.files).toHaveLength(0)
  })

  it('disables duplicate submits while request is in flight', async () => {
    let resolveSubmission
    const pendingPromise = new Promise((resolve) => {
      resolveSubmission = resolve
    })

    submitReport.mockReturnValue(pendingPromise)

    const user = userEvent.setup()
    render(<ReportForm />)

    await fillValidRequiredFields(user)

    const submitButton = screen.getByRole('button', { name: /submit report/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()

    await user.click(submitButton)
    expect(submitReport).toHaveBeenCalledTimes(1)

    resolveSubmission({ ok: true, data: { message: 'Report received.' } })
    await waitFor(() => expect(submitButton).not.toBeDisabled())
  })

  it('maps 422 field errors into existing field-level error UI', async () => {
    submitReport.mockResolvedValue({
      ok: false,
      type: 'validation',
      message: 'The given data was invalid.',
      fieldErrors: {
        contact_email: 'The contact email must be a valid email address.',
      },
    })

    const user = userEvent.setup()
    render(<ReportForm />)

    await fillValidRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(
      await screen.findByText(/the contact email must be a valid email address/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/contact email/i)).toHaveFocus()
  })

  it('shows top-level error for network/server failures and preserves form values', async () => {
    submitReport.mockResolvedValue({
      ok: false,
      type: 'network',
      message: 'Unable to reach the server right now. Check your connection and try again.',
    })

    const user = userEvent.setup()
    render(<ReportForm />)

    await fillValidRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    expect(
      await screen.findByText(/unable to reach the server right now/i),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toHaveValue('Stored XSS in account profile')
    expect(screen.getByLabelText(/contact email/i)).toHaveValue('researcher@example.com')
  })

  it('shows success confirmation using returned api fields', async () => {
    submitReport.mockResolvedValue({
      ok: true,
      data: {
        id: 'abc-123',
        status: 'submitted',
        message: 'Your security report has been received and is being processed.',
      },
    })

    const user = userEvent.setup()
    render(<ReportForm />)

    await fillValidRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /submit report/i }))

    const successRegion = await screen.findByRole('status')

    expect(within(successRegion).getByText(/report submitted successfully/i)).toBeInTheDocument()
    expect(within(successRegion).getByText(/abc-123/i)).toBeInTheDocument()
    expect(within(successRegion).getByText((text) => text.trim() === 'submitted')).toBeInTheDocument()
    expect(
      within(successRegion).getByText(
        /your security report has been received and is being processed/i,
      ),
    ).toBeInTheDocument()
  })
})
