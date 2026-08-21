import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, ShieldCheck } from 'lucide-react'

export default function StatusBadge({ status, size = 'medium', showIcon = true }) {
  if (!status) return null

  const s = String(status).toUpperCase()

  let colorClass = 'badge-neutral'
  let Icon = Info
  let label = status

  switch (s) {
    case 'CRITICAL':
    case 'URGENT':
      colorClass = 'badge-critical'
      Icon = AlertCircle
      label = 'CRITICAL'
      break
    case 'HIGH':
      colorClass = 'badge-high'
      Icon = AlertTriangle
      label = 'HIGH'
      break
    case 'MEDIUM':
      colorClass = 'badge-medium'
      Icon = Info
      label = 'MEDIUM'
      break
    case 'LOW':
      colorClass = 'badge-low'
      Icon = Info
      label = 'LOW'
      break
    case 'AVAILABLE':
    case 'HEALTHY':
    case 'ELIGIBLE':
    case 'VERIFIED':
    case 'ACCEPTED':
    case 'COMPLETED':
    case 'DELIVERED':
    case 'FRESH':
      colorClass = 'badge-success'
      Icon = s === 'VERIFIED' ? ShieldCheck : CheckCircle2
      break
    case 'UNAVAILABLE':
    case 'OFFLINE':
    case 'DECLINED':
    case 'EXPIRED':
      colorClass = 'badge-danger'
      Icon = AlertCircle
      break
    case 'IN TRANSIT':
    case 'MATCHING DONORS':
    case 'PENDING':
    case 'RECENT':
      colorClass = 'badge-warning'
      Icon = Clock
      break
    default:
      colorClass = 'badge-neutral'
      Icon = Info
  }

  return (
    <span className={`status-badge ${colorClass} size-${size}`}>
      {showIcon && <Icon className="badge-icon" size={size === 'small' ? 12 : 14} />}
      <span className="badge-text">{label}</span>
    </span>
  )
}
