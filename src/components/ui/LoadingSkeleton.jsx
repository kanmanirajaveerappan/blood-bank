export default function LoadingSkeleton({ type = 'card', count = 3, height }) {
  if (type === 'table') {
    return (
      <div className="skeleton-table-wrap">
        <div className="skeleton-table-header shimmer" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-table-row shimmer" />
        ))}
      </div>
    )
  }

  if (type === 'map') {
    return (
      <div className="skeleton-map shimmer" style={{ height: height || 400 }}>
        <div className="skeleton-map-radar" />
        <span className="skeleton-map-text">Initializing Geospatial View...</span>
      </div>
    )
  }

  return (
    <div className="skeleton-cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="skeleton-card shimmer" 
          style={{ height: height || 120 }} 
        />
      ))}
    </div>
  )
}
