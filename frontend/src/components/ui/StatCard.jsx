export default function StatCard({ icon: Icon, label, value, delta, tone = 'blue', onClick }) {
  return (
    <article
      className={`stat-card stat-${tone} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className={`stat-icon-wrap icon-${tone}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="stat-value-wrap">
        <strong className="stat-value">{value}</strong>
      </div>
      {delta && <span className="stat-delta">{delta}</span>}
    </article>
  )
}
