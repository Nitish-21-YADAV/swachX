export const formatDate = d =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }) : '—'

export const fmtScore = s =>
  s != null ? `${(s * 100).toFixed(1)}%` : '—'

export const statusDot = s => ({
  Pending:  '🟡', Cleaned: '🟢', Rejected: '🔴', Review: '🟣'
})[s] || '⚪'

export const severityLabel = s => ({
  CRITICAL:'🔴 Critical', HIGH:'🟠 High', MEDIUM:'🟡 Medium', LOW:'🟢 Low'
})[s] || s

export const errMsg = e =>
  e?.response?.data?.error || e?.message || 'An unexpected error occurred'
