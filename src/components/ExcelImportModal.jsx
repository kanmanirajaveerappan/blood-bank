import { useState } from 'react'
import { validateExcelImport, confirmExcelImport } from '../services/api'

export default function ExcelImportModal({ isOpen, onClose, onImportCompleted }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [importing, setImporting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setLoading(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const res = await validateExcelImport(formData)
      if (res.success) {
        setAnalysis(res)
      } else {
        setErrorMessage(res.error || 'Failed to parse file. Please upload a valid .xlsx or .csv.')
      }
    } catch (err) {
      setErrorMessage(err.message || 'File upload failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!analysis || !analysis.valid_count) return
    setImporting(true)
    try {
      const res = await confirmExcelImport(analysis.valid_records || analysis.valid_count)
      setSuccessMessage(`Successfully committed ${analysis.valid_count} validated donor profiles to PostgreSQL database!`)
      if (onImportCompleted) onImportCompleted(analysis.valid_count)
      setTimeout(() => {
        onClose()
      }, 1800)
    } catch (err) {
      setErrorMessage(`Import error: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container excel-modal panel">
        <div className="modal-header">
          <div>
            <span className="micro-label">Admin Intelligence</span>
            <h2 className="modal-title">📊 Excel / CSV Donor Batch Import</h2>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Upload Zone */}
        {!analysis && (
          <div className="upload-dropzone">
            <div className="dropzone-icon">📁</div>
            <h3>Upload .xlsx or .csv Donor Roster</h3>
            <p>Select your donor spreadsheet file to validate and import into the live database.</p>
            
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              id="excel-file-input"
              className="file-hidden-input"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
            <label htmlFor="excel-file-input" className="primary-button dropzone-cta">
              Browse Spreadsheet File
            </label>

            {loading && <p className="loading-text">Validating rows, blood groups, and GPS locations...</p>}
            {errorMessage && <p className="error-text" style={{ color: 'var(--danger)', marginTop: 10 }}>{errorMessage}</p>}
          </div>
        )}

        {/* Analysis Results View */}
        {analysis && (
          <div className="analysis-view">
            <div className="analysis-stats-grid">
              <div className="analysis-stat-card">
                <span>Total Analyzed</span>
                <strong>{analysis.total_records}</strong>
              </div>
              <div className="analysis-stat-card good">
                <span>Valid & Ready</span>
                <strong>{analysis.valid_count}</strong>
              </div>
              <div className="analysis-stat-card bad">
                <span>Invalid Format</span>
                <strong>{analysis.invalid_count}</strong>
              </div>
              <div className="analysis-stat-card warn">
                <span>Duplicates</span>
                <strong>{analysis.duplicate_count}</strong>
              </div>
            </div>

            {/* Validation Breakdown Table */}
            {analysis.valid_records_preview && analysis.valid_records_preview.length > 0 && (
              <div className="preview-table-container">
                <h4>Valid Records Sample ({analysis.valid_records_preview.length})</h4>
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Name</th>
                      <th>Blood</th>
                      <th>City</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.valid_records_preview.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td>#{row.row_number}</td>
                        <td>{row.name}</td>
                        <td><span className="blood-tag small">{row.blood_group}</span></td>
                        <td>{row.city}</td>
                        <td>{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Success confirmation notification */}
            {successMessage && (
              <div className="alert-box alert-success" style={{ marginTop: 15 }}>
                ✓ {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="alert-box alert-danger" style={{ marginTop: 15 }}>
                ✕ {errorMessage}
              </div>
            )}

            {/* Action Bar */}
            <div className="modal-footer-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => { setAnalysis(null); setFile(null); }}
              >
                Upload Different File
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmImport}
                disabled={importing || analysis.valid_count === 0 || !!successMessage}
              >
                {importing ? 'Committing to DB...' : `Commit ${analysis.valid_count} Records to Database ➔`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
