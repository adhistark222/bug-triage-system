async function tryParseJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function loginReviewer(credentials) {
  let response

  try {
    response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
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
      message: body?.message || 'Invalid credentials.',
    }
  }

  if (response.status === 422) {
    return {
      ok: false,
      type: 'validation',
      message: body?.message || 'The submitted data was invalid.',
      fieldErrors: body?.errors ?? {},
    }
  }

  return {
    ok: false,
    type: 'server',
    message: body?.message || 'Something went wrong while signing in.',
  }
}