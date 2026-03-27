async function tryParseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function fetchReviewerReports(token, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== '' && value != null),
  ).toString()
  const url = query ? `/api/v1/reviewer/reports?${query}` : '/api/v1/reviewer/reports'

  let response

  try {
    response = await fetch(url, {
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
      data: body?.data ?? [],
      meta: body?.meta ?? null,
    }
  }

  if (response.status === 401) {
    return {
      ok: false,
      type: 'auth',
      message: body?.message || 'Unauthenticated.',
    }
  }

  return {
    ok: false,
    type: 'server',
    message: body?.message || 'Something went wrong while loading reviewer reports.',
  }
}