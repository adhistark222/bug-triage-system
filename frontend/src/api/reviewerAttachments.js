function parseFilename(contentDisposition) {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/) 
  return match?.[1] || 'attachment'
}

export async function downloadReviewerAttachment(token, reportId) {
  let response

  try {
    response = await fetch(`/api/v1/reviewer/reports/${reportId}/attachment`, {
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

  if (!response.ok) {
    return {
      ok: false,
      type: response.status === 401 ? 'auth' : 'server',
      message: response.status === 401 ? 'Unauthenticated.' : 'Unable to download attachment.',
    }
  }

  return {
    ok: true,
    blob: await response.blob(),
    filename: parseFilename(response.headers.get('Content-Disposition')),
  }
}