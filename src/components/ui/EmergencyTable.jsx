import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, Navigation, Radio } from 'lucide-react'
import StatusBadge from './StatusBadge'

const ROWS_PER_PAGE = 8

export default function EmergencyTable({
  requests = [],
  selectedId,
  onSelect,
  onNavigate,
  onTrack,
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(r =>
      (r.id || '').toLowerCase().includes(q) ||
      (r.hospital_name || '').toLowerCase().includes(q) ||
      (r.blood_group || '').toLowerCase().includes(q) ||
      (r.urgency || '').toLowerCase().includes(q)
    )
  }, [requests, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  return (
    <div className="emergency-table-container">
      <div className="table-controls-bar">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input
            type="text"
            placeholder="Search emergencies by ID, hospital, blood group..."
            className="table-search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <span className="table-result-count">{filtered.length} Requests</span>
      </div>

      <div className="responsive-table-container">
        <table className="candidate-data-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Hospital</th>
              <th>Blood</th>
              <th>Units</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="table-empty-cell">No emergency requests found</td></tr>
            ) : (
              paginated.map(req => {
                const isSelected = selectedId === req.id
                return (
                  <tr
                    key={req.id}
                    className={`candidate-table-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect && onSelect(req)}
                  >
                    <td><strong>{req.id}</strong></td>
                    <td>{req.hospital_name || 'Emergency Center'}</td>
                    <td><span className="blood-tag critical">{req.blood_group}</span></td>
                    <td>{req.units_required || 2} Units</td>
                    <td><StatusBadge status={req.urgency} /></td>
                    <td><span className="status-text">● {req.status || 'Active'}</span></td>
                    <td>
                      <div className="table-action-btns" onClick={e => e.stopPropagation()}>
                        {onNavigate && (
                          <button
                            type="button"
                            className="ghost-button small-btn"
                            onClick={() => onNavigate(req.id)}
                          >
                            <Navigation size={12} /> Nav
                          </button>
                        )}
                        {onTrack && (
                          <button
                            type="button"
                            className="primary-button small-btn"
                            onClick={() => onTrack(req.id)}
                          >
                            <Radio size={12} /> Track
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            type="button"
            className="ghost-button small-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button
            type="button"
            className="ghost-button small-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
