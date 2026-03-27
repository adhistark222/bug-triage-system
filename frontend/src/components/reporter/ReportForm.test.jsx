import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReportForm from './ReportForm.jsx'

function createLargeFile() {
  const largeContent = 'a'.repeat(5 * 1024 * 1024 + 1)
  return new File([largeContent], 'big.zip', { type: 'application/zip' })
}

describe('ReportForm', () => {
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
})
