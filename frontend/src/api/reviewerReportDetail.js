async function tryParseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchReviewerReportDetail(token, reportId) {
  let response

  try {
    response = await fetch(`/api/v1/reviewer/reports/${reportId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

  if (response.status === 404) {
    return {
      ok: false,
      type: 'not-found',
      message: body?.message || 'Report not found.',
    }
  }

  return {
    ok: false,
    type: 'server',
    message: body?.message || 'Something went wrong while loading report detail.',
  }
}