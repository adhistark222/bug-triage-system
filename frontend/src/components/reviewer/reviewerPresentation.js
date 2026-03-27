export function formatLabel(value) {
  return value.replaceAll('_', ' ')
}

export function getSeverityTone(value) {
  if (value === 'critical') {
    return 'critical'
  }

  if (value === 'high') {
    return 'high'
  }

  if (value === 'medium') {
    return 'medium'
  }

  if (value === 'low') {
    return 'low'
  }

  return 'neutral'
}

export function getVulnerabilityTone(value) {
  if (['xss', 'sql_injection', 'rce', 'authentication_bypass', 'authorization_bypass'].includes(value)) {
    return 'hot'
  }

  if (['csrf', 'ssrf', 'path_traversal', 'information_disclosure'].includes(value)) {
    return 'elevated'
  }

  return 'standard'
}