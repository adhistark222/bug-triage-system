function toFormData(values, attachmentFile) {
  const formData = new FormData()

  Object.entries(values).forEach(([key, value]) => {
    formData.append(key, value)
  })

  if (attachmentFile) {
    formData.append('attachment', attachmentFile)
  }

  return formData
}

function parseFirstFieldErrors(errorBag) {
  if (!errorBag || typeof errorBag !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(errorBag).map(([field, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        return [field, String(messages[0])]
      }
      return [field, String(messages || '')]
    }),
  )
}

async function tryParseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function submitReport(values, attachmentFile = null) {
  const payload = toFormData(values, attachmentFile)

  let response
  try {
    response = await fetch('/api/v1/reports', {
      method: 'POST',
      body: payload,
    })
  } catch {
    return {
      ok: false,
      type: 'network',
      message:
        'Unable to reach the server right now. Check your connection and try again.',
    }
  }

  const body = await tryParseJson(response)

  if (response.ok) {
    return {
      ok: true,
      data: body?.data ?? null,
    }
  }

  if (response.status === 422) {
    return {
      ok: false,
      type: 'validation',
      message: body?.message || 'The submitted data was invalid.',
      fieldErrors: parseFirstFieldErrors(body?.errors),
    }
  }

  return {
    ok: false,
    type: 'server',
    message: body?.message || 'Something went wrong while submitting your report.',
  }
}
