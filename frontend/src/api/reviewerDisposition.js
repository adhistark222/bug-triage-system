async function tryParseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function updateReviewerReportStatus(token, reportId, status, options = {}) {
  let response
  const payload = { status }

  if (options.override) {
    payload.override = true
  }

  try {
    response = await fetch(`/api/v1/reviewer/reports/${reportId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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

  if (response.status === 401) {
    return {
      ok: false,
      type: 'auth',
      message: body?.message || 'Unauthenticated.',
    }
  }

  if (response.status === 422) {
    return {
      ok: false,
      type: 'validation',
      message: body?.errors?.status?.[0] || body?.message || 'The submitted status was invalid.',
    }
  }

  return {
    ok: false,
    type: 'server',
    message: body?.message || 'Something went wrong while updating report status.',
  }
}