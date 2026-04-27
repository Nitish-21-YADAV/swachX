export default function StatusBadge({ status }) {
  const map = {
    Pending:  'badge-Pending',
    Cleaned:  'badge-Cleaned',
    Rejected: 'badge-Rejected',
    Review:   'badge-Review',
  }
  const dot = { Pending:'🟡', Cleaned:'🟢', Rejected:'🔴', Review:'🟣' }
  return (
    <span className={`badge ${map[status] || 'badge-Pending'}`}>
      <span>{dot[status] || '⚪'}</span> {status || 'Pending'}
    </span>
  )
}
