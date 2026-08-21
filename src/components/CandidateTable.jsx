import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

const ROWS_PER_PAGE = 10

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="sort-neutral-icon">⇅</span>
  return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
}

function PriorityBadge({ score }) {
  const s = Number(score) || 0
  if (s >= 90) return <span className="candidate-priority-badge priority-critical">HIGH</span>
  if (s >= 75) return <span className="candidate-priority-badge priority-medium">MED</span>
  return <span className="candidate-priority-badge priority-low">LOW</span>
}

export default function CandidateTable({ candidates = [], onNotify, onView }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('priority_score')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all') // all | available | high

  const filtered = useMemo(() => {
    let list = [...candidates]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.blood_group || '').toLowerCase().includes(q) ||
        (c.name || c.donor_id || '').toLowerCase().includes(q)
      )
    }

    if (filter === 'available') list = list.filter(c => c.availability !== false)
    if (filter === 'high') list = list.filter(c => Number(c.priority_score) >= 85)

    list.sort((a, b) => {
      const av = Number(a[sortField]) || 0
      const bv = Number(b[sortField]) || 0
      return sortDir === 'asc' ? av - bv : bv - av
    })

    return list
  }, [candidates, search, sortField, sortDir, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  return (
    <div className="candidate-table-wrapper">
      {/* Table Controls */}
      <div className="table-controls-bar">
        <div className="table-search-wrap">
          <Search size={14} className="table-search-icon" />
          <input
            type="text"
            placeholder="Search by blood group or ID..."
            className="table-search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="table-filter-pills">
          {['all', 'available', 'high'].map(f => (
            <button
              key={f}
              type="button"
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => { setFilter(f); setPage(1) }}
            >
              {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'High Priority'}
            </button>
          ))}
        </div>
        <span className="table-result-count">{filtered.length} candidates</span>
      </div>

      {/* Desktop Table */}
      <div className="responsive-table-container">
        <table className="candidate-data-table">
          <thead>
            <tr>
              <th>#</th>
              <th className="sortable-th" onClick={() => handleSort('priority_score')}>
                Priority <SortIcon field="priority_score" sortField={sortField} sortDir={sortDir} />
              </th>
              <th>Blood</th>
              <th className="sortable-th" onClick={() => handleSort('distance_km')}>
                Distance <SortIcon field="distance_km" sortField={sortField} sortDir={sortDir} />
              </th>
              <th>Availability</th>
              <th>Location</th>
              <th className="sortable-th" onClick={() => handleSort('priority_score')}>
                Score <SortIcon field="priority_score" sortField={sortField} sortDir={sortDir} />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={8} className="table-empty-cell">No candidates found</td></tr>
            ) : (
              paginated.map((c, i) => (
                <tr key={c.donor_id || c.id || i} className="candidate-table-row">
                  <td className="table-rank-cell">{(page - 1) * ROWS_PER_PAGE + i + 1}</td>
                  <td><PriorityBadge score={c.priority_score} /></td>
                  <td><span className="blood-tag">{c.blood_group || '—'}</span></td>
                  <td>
                    <span className="distance-chip-sm">
                      📍 {c.distance_km ? `${c.distance_km} km` : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`avail-badge ${c.availability !== false ? 'avail-yes' : 'avail-no'}`}>
                      {c.availability !== false ? '● Available' : '○ Offline'}
                    </span>
                  </td>
                  <td>
                    <span className={`freshness-sm freshness-${(c.location_freshness || 'FRESH').toLowerCase()}`}>
                      {c.location_freshness || 'FRESH'}
                    </span>
                  </td>
                  <td>
                    <div className="table-score-bar-wrap">
                      <span className="table-score-number">{c.priority_score || '—'}</span>
                      {c.priority_score && (
                        <div className="score-bar-mini">
                          <div className="score-bar-fill" style={{ width: `${Math.min(100, c.priority_score)}%` }} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table-action-btns">
                      {onView && (
                        <button type="button" className="ghost-button small-btn" onClick={() => onView(c)}>View</button>
                      )}
                      {onNotify && (
                        <button type="button" className="primary-button small-btn" onClick={() => onNotify(c.donor_id || c.id)}>Notify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Fallback */}
      <div className="candidate-mobile-cards">
        {paginated.map((c, i) => (
          <div key={c.donor_id || i} className="candidate-mobile-card">
            <div className="cmc-header">
              <PriorityBadge score={c.priority_score} />
              <span className="blood-tag">{c.blood_group}</span>
              <span className="cmc-score">Score: {c.priority_score || '—'}</span>
            </div>
            <div className="cmc-body">
              <span className="distance-chip-sm">📍 {c.distance_km || '—'} km</span>
              <span className={`avail-badge ${c.availability !== false ? 'avail-yes' : 'avail-no'}`}>
                {c.availability !== false ? 'Available' : 'Offline'}
              </span>
              <span className={`freshness-sm freshness-${(c.location_freshness || 'FRESH').toLowerCase()}`}>
                {c.location_freshness || 'FRESH'}
              </span>
            </div>
            <div className="cmc-actions">
              {onView && <button type="button" className="ghost-button small-btn" onClick={() => onView(c)}>View</button>}
              {onNotify && <button type="button" className="primary-button small-btn" onClick={() => onNotify(c.donor_id)}>Notify</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="table-pagination">
          <button type="button" className="ghost-button small-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={14} />
          </button>
          <span className="pagination-info">Page {page} of {totalPages}</span>
          <button type="button" className="ghost-button small-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
