import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { 
  Navigation, 
  Play, 
  Pause, 
  RotateCcw, 
  ExternalLink, 
  Compass, 
  Radio, 
  Car, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  ArrowRight,
  Layers,
  MapPin,
  Clock,
  Zap,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

// Available Ultra-Clear Map Tile Providers
const MAP_TILE_PROVIDERS = {
  streets: {
    id: 'streets',
    label: '🗺️ Crisp Streets',
    desc: 'High-contrast road geometry & visible street names',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  osm: {
    id: 'osm',
    label: '🌐 OpenStreetMap',
    desc: 'Detailed standard international road network',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    label: '🛰️ Satellite Hybrid',
    desc: 'High-res aerial imagery with street labels',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
  },
  medical: {
    id: 'medical',
    label: '🏥 Medical Light',
    desc: 'Clean high-visibility healthcare navigation',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  dark: {
    id: 'dark',
    label: '🌙 Midnight Dark',
    desc: 'High-contrast night HUD mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
  },
}

// Clean Two-Point (Start A & Destination B) Marker Creator
const createTwoPointMarkerIcon = (pointType, label, color, isPulse = false) => {
  const isStart = pointType === 'start'
  const tagBg = isStart ? 'rgba(5, 150, 105, 0.95)' : 'rgba(220, 38, 38, 0.95)'
  const tagText = isStart ? '🟢 START (A)' : '🔴 DESTINATION (B)'
  const iconEmoji = isStart ? '🏥' : '🚨'

  return L.divIcon({
    className: 'custom-leaflet-clean-pin',
    html: `
      <div class="two-point-pin-anchor ${isPulse ? 'pin-pulsing' : ''}">
        <div class="two-point-badge" style="border-color: ${color}; box-shadow: 0 4px 18px rgba(0,0,0,0.6);">
          <span class="two-point-tag" style="background: ${tagBg};">${tagText}</span>
          <span class="two-point-title">${label}</span>
        </div>
        <div class="two-point-pin-head" style="border-color: ${color}; box-shadow: 0 0 16px ${color}bb; background: #0c1833;">
          <span class="pin-emoji">${iconEmoji}</span>
        </div>
        <div class="two-point-pin-needle" style="border-top-color: ${color};"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -60],
  })
}

// Simple Live Vehicle Moving Pin (Small and Non-Intrusive)
const createVehiclePin = () => {
  return L.divIcon({
    className: 'custom-leaflet-vehicle-pin',
    html: `
      <div class="vehicle-nav-pin">
        <div class="vehicle-pulse-ring"></div>
        <div class="vehicle-core-icon">🚗</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 3.2
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function GoogleMapView({
  center = { lat: 11.0168, lng: 76.9558 },
  destination = null,
  zoom = 14,
  height = 500,
  markers = [],
  showLegend = true,
  showControls = true,
  mode = 'normal',
  theme = 'dark',
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const tileLayerRef = useRef(null)
  const labelLayerRef = useRef(null)
  const vehicleMarkerRef = useRef(null)
  const routePolylineRef = useRef(null)
  const routeGlowLineRef = useRef(null)
  const watchIdRef = useRef(null)
  const prevCoordRef = useRef(null)

  // Map Tile Style State
  const [mapStyle, setMapStyle] = useState('streets')
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const [showDirectionsDrawer, setShowDirectionsDrawer] = useState(false)

  // Navigation & Telemetry State
  const [trackingMode, setTrackingMode] = useState('gps') // 'gps' | 'simulate'
  const [isGpsActive, setIsGpsActive] = useState(false)
  const [isStationary, setIsStationary] = useState(true)
  const [speed, setSpeed] = useState(0)
  const [gpsStatus, setGpsStatus] = useState('GPS Ready — Two-Point Route Active')
  const [audioAlerts, setAudioAlerts] = useState(false)
  const [isRouteLoading, setIsRouteLoading] = useState(false)

  // Coordinates for Two Clear Points
  const originLat = parseFloat(center?.lat) || 11.0168
  const originLng = parseFloat(center?.lng) || 76.9558

  const emergencyMarker = markers.find(m => m.type === 'emergency')
  const targetLat = destination?.lat || (emergencyMarker?.lat) || (originLat + 0.024)
  const targetLng = destination?.lng || (emergencyMarker?.lng) || (originLng + 0.018)

  // Clean, Short Readable Point Labels
  const rawStartName = markers.find(m => m.type === 'hospital')?.label?.split('—')?.[1]?.trim() || center?.label || 'KMCH Hospital'
  const rawDestName = emergencyMarker?.label?.split('—')?.[1]?.trim() || destination?.label || 'Emergency Site (Peelamedu)'

  const startLabel = rawStartName.length > 28 ? rawStartName.slice(0, 26) + '…' : rawStartName
  const destLabel = rawDestName.length > 28 ? rawDestName.slice(0, 26) + '…' : rawDestName

  const [currentCoord, setCurrentCoord] = useState({ lat: originLat, lng: originLng })
  const [routeGeometry, setRouteGeometry] = useState([])
  const [turnGuidanceSteps, setTurnGuidanceSteps] = useState([
    {
      step: 1,
      road: 'Avinashi Road (NH 544)',
      instruction: `Depart ${startLabel} and proceed on Avinashi Road`,
      maneuver: '⬆️ Proceed Straight',
      distanceToTurn: '400 meters',
      icon: '⬆️',
    },
    {
      step: 2,
      road: 'Peelamedu Main Corridor',
      instruction: 'Turn right toward Emergency Incident Site',
      maneuver: '➡️ Turn Right',
      distanceToTurn: '1.2 km',
      icon: '➡️',
    },
    {
      step: 3,
      road: 'Emergency Incident Approach',
      instruction: `Arrive at Destination (${destLabel})`,
      maneuver: '🏁 Arrive at Destination',
      distanceToTurn: '200 meters',
      icon: '🏁',
    },
  ])
  const [routeSummary, setRouteSummary] = useState({
    distanceKm: '3.8',
    durationMin: 8,
    traffic: 'Optimal Flow (Fastest Route)',
  })

  // Simulation State
  const [simProgress, setSimProgress] = useState(0)
  const [isSimRunning, setIsSimRunning] = useState(false)
  const [currentManeuverIndex, setCurrentManeuverIndex] = useState(0)

  const { t } = useLanguage()

  // 1. Fetch Real-Road Route from OSRM
  const fetchBestRoadRoute = useCallback(async (startLat, startLng, endLat, endLng) => {
    setIsRouteLoading(true)
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
      const res = await fetch(url)
      const data = await res.json()

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        setRouteGeometry(coords)

        const distKm = (route.distance / 1000).toFixed(1)
        const durMin = Math.max(2, Math.round(route.duration / 60))
        setRouteSummary({
          distanceKm: distKm,
          durationMin: durMin,
          traffic: 'Fastest Real-Road Route',
        })

        if (route.legs && route.legs[0] && route.legs[0].steps) {
          const steps = route.legs[0].steps.map((s, idx) => {
            const maneuverType = s.maneuver.type || 'turn'
            const modifier = s.maneuver.modifier || 'straight'
            let icon = '⬆️'
            let maneuverLabel = 'Proceed Straight'

            if (modifier.includes('right')) {
              icon = '➡️'
              maneuverLabel = 'Turn Right'
            } else if (modifier.includes('left')) {
              icon = '⬅️'
              maneuverLabel = 'Turn Left'
            } else if (maneuverType === 'arrive') {
              icon = '🏁'
              maneuverLabel = `Arrive at ${destLabel}`
            } else if (maneuverType === 'roundabout') {
              icon = '🔄'
              maneuverLabel = 'Take Roundabout'
            }

            const stepDistMeters = Math.round(s.distance)
            const distDisplay = stepDistMeters >= 1000 ? `${(stepDistMeters / 1000).toFixed(1)} km` : `${stepDistMeters} meters`

            return {
              step: idx + 1,
              road: s.name || 'Emergency Corridor',
              instruction: s.name ? `${maneuverLabel} onto ${s.name}` : `Follow emergency corridor toward ${destLabel}`,
              maneuver: `${icon} ${maneuverLabel}`,
              distanceToTurn: distDisplay,
              icon: icon,
            }
          })
          if (steps.length > 0) setTurnGuidanceSteps(steps)
        }

        if (mapInstanceRef.current && coords.length > 0) {
          if (routePolylineRef.current) routePolylineRef.current.remove()
          if (routeGlowLineRef.current) routeGlowLineRef.current.remove()

          routeGlowLineRef.current = L.polyline(coords, {
            color: '#00d2ff',
            weight: 9,
            opacity: 0.45,
            lineCap: 'round',
          }).addTo(mapInstanceRef.current)

          routePolylineRef.current = L.polyline(coords, {
            color: '#10b981',
            weight: 5,
            dashArray: '10, 6',
            lineCap: 'round',
          }).addTo(mapInstanceRef.current)

          mapInstanceRef.current.fitBounds(L.latLngBounds(coords), { padding: [60, 60], maxZoom: 16 })
        }
      }
    } catch (err) {
      console.warn('OSRM Route fallback:', err)
      const fallbackWaypoints = [
        [startLat, startLng],
        [startLat + 0.006, startLng + 0.005],
        [startLat + 0.014, startLng + 0.011],
        [endLat, endLng],
      ]
      setRouteGeometry(fallbackWaypoints)

      if (mapInstanceRef.current) {
        if (routePolylineRef.current) routePolylineRef.current.remove()
        if (routeGlowLineRef.current) routeGlowLineRef.current.remove()

        routeGlowLineRef.current = L.polyline(fallbackWaypoints, {
          color: '#00d2ff',
          weight: 9,
          opacity: 0.45,
          lineCap: 'round',
        }).addTo(mapInstanceRef.current)

        routePolylineRef.current = L.polyline(fallbackWaypoints, {
          color: '#10b981',
          weight: 5,
          dashArray: '10, 6',
          lineCap: 'round',
        }).addTo(mapInstanceRef.current)

        mapInstanceRef.current.fitBounds(L.latLngBounds(fallbackWaypoints), { padding: [60, 60] })
      }
    } finally {
      setIsRouteLoading(false)
    }
  }, [destLabel])

  // 2. Initialize Leaflet Map (ONLY 2 CLEAN START/DESTINATION MARKERS)
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapContainerRef.current, {
      center: [originLat, originLng],
      zoom: zoom || 14,
      zoomControl: true,
      attributionControl: false,
    })

    const selectedTile = MAP_TILE_PROVIDERS[mapStyle] || MAP_TILE_PROVIDERS.streets
    tileLayerRef.current = L.tileLayer(selectedTile.url, {
      maxZoom: selectedTile.maxZoom || 19,
      subdomains: selectedTile.subdomains || 'abcd',
    }).addTo(map)

    if (selectedTile.labelUrl) {
      labelLayerRef.current = L.tileLayer(selectedTile.labelUrl, {
        maxZoom: 19,
        subdomains: selectedTile.subdomains || 'abcd',
      }).addTo(map)
    }

    // POINT A: START POINT MARKER
    const startIcon = createTwoPointMarkerIcon('start', startLabel, '#10b981', false)
    const startMarker = L.marker([originLat, originLng], { icon: startIcon, zIndexOffset: 800 }).addTo(map)
    startMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 2px;">
        <strong style="color: #059669; font-size: 0.85rem;">🟢 START POINT (A)</strong>
        <p style="margin: 4px 0 2px 0; font-weight: 700; font-size: 0.82rem; color: #0f172a;">${rawStartName}</p>
        <small style="color: #64748b;">Coordinates: ${originLat.toFixed(4)}, ${originLng.toFixed(4)}</small>
      </div>
    `)

    // POINT B: DESTINATION POINT MARKER
    const destIcon = createTwoPointMarkerIcon('destination', destLabel, '#ef4444', true)
    const destMarker = L.marker([targetLat, targetLng], { icon: destIcon, zIndexOffset: 900 }).addTo(map)
    destMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 2px;">
        <strong style="color: #dc2626; font-size: 0.85rem;">🔴 DESTINATION POINT (B)</strong>
        <p style="margin: 4px 0 2px 0; font-weight: 700; font-size: 0.82rem; color: #0f172a;">${rawDestName}</p>
        <small style="color: #64748b;">Coordinates: ${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}</small>
      </div>
    `)

    // Live Vehicle Navigation Marker
    const vehicleIcon = createVehiclePin()
    const vehicleMarker = L.marker([originLat, originLng], { icon: vehicleIcon, zIndexOffset: 1200 }).addTo(map)
    vehicleMarkerRef.current = vehicleMarker

    mapInstanceRef.current = map

    // Calculate Best Road Route
    fetchBestRoadRoute(originLat, originLng, targetLat, targetLng)

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [originLat, originLng, targetLat, targetLng, mapStyle, startLabel, destLabel, rawStartName, rawDestName])

  const handleSelectMapStyle = (styleKey) => {
    setMapStyle(styleKey)
    setShowStyleMenu(false)
  }

  const handleAutoFitRoute = () => {
    if (mapInstanceRef.current && routeGeometry.length > 0) {
      mapInstanceRef.current.fitBounds(L.latLngBounds(routeGeometry), { padding: [60, 60], maxZoom: 16 })
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([originLat, originLng])
      mapInstanceRef.current.setZoom(15)
    }
  }

  // 3. Real Device GPS Tracking
  const startRealGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported on this browser')
      return
    }

    setIsGpsActive(true)
    setGpsStatus('Acquiring real-time device GPS satellites...')

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const uLat = pos.coords.latitude
        const uLng = pos.coords.longitude
        const accuracy = Math.round(pos.coords.accuracy || 10)

        let calculatedSpeed = 0
        if (pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed)) {
          calculatedSpeed = Math.round(pos.coords.speed * 3.6)
        } else if (prevCoordRef.current) {
          const distKm = getDistanceKm(prevCoordRef.current.lat, prevCoordRef.current.lng, uLat, uLng)
          const hrs = (Date.now() - prevCoordRef.current.time) / (1000 * 3600)
          if (hrs > 0) calculatedSpeed = Math.round(distKm / hrs)
        }

        const isMoving = calculatedSpeed >= 2
        setIsStationary(!isMoving)
        setSpeed(isMoving ? calculatedSpeed : 0)
        setCurrentCoord({ lat: uLat, lng: uLng })
        prevCoordRef.current = { lat: uLat, lng: uLng, time: Date.now() }

        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([uLat, uLng])
        }

        if (isMoving) {
          setGpsStatus(`🟢 En Route to Destination (${calculatedSpeed} km/h • ±${accuracy}m)`)
          if (mapInstanceRef.current) mapInstanceRef.current.panTo([uLat, uLng])
        } else {
          setGpsStatus(`🛑 Stationary at GPS Position (0 km/h • GPS Lock ±${accuracy}m)`)
        }
      },
      (err) => {
        setGpsStatus('⚠️ GPS signal paused. Holding location.')
        setIsStationary(true)
        setSpeed(0)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    )
  }, [])

  const stopRealGpsTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsGpsActive(false)
    setIsStationary(true)
    setSpeed(0)
    setGpsStatus('GPS Guidance Paused — Holding Current Location')
  }, [])

  // 4. Road Simulation Controls
  useEffect(() => {
    if (trackingMode !== 'simulate' || !isSimRunning) {
      if (trackingMode === 'simulate') setSpeed(0)
      return
    }

    const waypoints = routeGeometry.length > 0 ? routeGeometry : [
      [originLat, originLng],
      [originLat + 0.010, originLng + 0.008],
      [targetLat, targetLng],
    ]

    const timer = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          setIsSimRunning(false)
          setSpeed(0)
          setIsStationary(true)
          setCurrentManeuverIndex(turnGuidanceSteps.length - 1)
          setGpsStatus('✅ Arrived at Emergency Site Destination')
          return 100
        }

        const nextProgress = prev + 2
        const simSpeed = Math.floor(45 + Math.random() * 8)
        setSpeed(simSpeed)
        setIsStationary(false)

        const totalSegs = waypoints.length - 1
        const segProgress = (nextProgress / 100) * totalSegs
        const curSeg = Math.min(Math.floor(segProgress), totalSegs - 1)
        const frac = segProgress - curSeg

        const p1 = waypoints[curSeg]
        const p2 = waypoints[curSeg + 1]

        const cLat = p1[0] + (p2[0] - p1[0]) * frac
        const cLng = p1[1] + (p2[1] - p1[1]) * frac

        setCurrentCoord({ lat: cLat, lng: cLng })
        const stepIdx = Math.min(
          Math.floor((nextProgress / 100) * turnGuidanceSteps.length),
          turnGuidanceSteps.length - 1
        )
        setCurrentManeuverIndex(stepIdx)

        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng([cLat, cLng])
        }

        const activeStep = turnGuidanceSteps[stepIdx] || turnGuidanceSteps[0]
        setGpsStatus(`🟢 Traveling on ${activeStep.road} (${simSpeed} km/h)`)
        return nextProgress
      })
    }, 700)

    return () => clearInterval(timer)
  }, [trackingMode, isSimRunning, routeGeometry, turnGuidanceSteps, originLat, originLng, targetLat, targetLng])

  const handleSimStart = () => {
    if (simProgress >= 100) {
      setSimProgress(0)
      if (vehicleMarkerRef.current) vehicleMarkerRef.current.setLatLng([originLat, originLng])
    }
    setIsSimRunning(true)
    setIsStationary(false)
  }

  const handleSimStop = () => {
    setIsSimRunning(false)
    setIsStationary(true)
    setSpeed(0)
    setGpsStatus('🛑 Vehicle Paused on Road Corridor (0 km/h)')
  }

  const handleReset = () => {
    setIsSimRunning(false)
    setSimProgress(0)
    setIsStationary(true)
    setSpeed(0)
    setCurrentManeuverIndex(0)
    setCurrentCoord({ lat: originLat, lng: originLng })
    if (vehicleMarkerRef.current) vehicleMarkerRef.current.setLatLng([originLat, originLng])
    if (mapInstanceRef.current) mapInstanceRef.current.panTo([originLat, originLng])
    setGpsStatus('Reset to Origin Facility')
  }

  const openOfficialGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${currentCoord.lat},${currentCoord.lng}&destination=${targetLat},${targetLng}&travelmode=driving`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const activeTurn = turnGuidanceSteps[currentManeuverIndex] || turnGuidanceSteps[0]
  const remainingDistKm = getDistanceKm(currentCoord.lat, currentCoord.lng, targetLat, targetLng).toFixed(1)
  const remainingMinutes = Math.max(1, Math.round((remainingDistKm / 35) * 60))

  return (
    <div className={`leaflet-geo-map-root map-style-${mapStyle}`} style={{ height: height || 500 }}>
      {/* 1. Leaflet Canvas Container */}
      <div ref={mapContainerRef} className="leaflet-map-canvas" style={{ height: '100%', width: '100%' }} />

      {/* 2. Top Ultra-Clear Turn Guidance HUD Banner */}
      <div className="leaflet-hud-banner-premium">
        <div className="maneuver-icon-badge">
          <span style={{ fontSize: '1.4rem' }}>{activeTurn.icon}</span>
        </div>

        <div className="maneuver-direction-info">
          <div className="maneuver-header-line">
            <span className="maneuver-action-text">{activeTurn.maneuver}</span>
            <span className="maneuver-distance-pill">In {activeTurn.distanceToTurn}</span>
            {isRouteLoading && <span className="route-loading-pill">⚡ Calculating Route...</span>}
          </div>
          <div className="maneuver-sub-instruction">
            <span>{activeTurn.instruction}</span>
          </div>
          <div className="maneuver-current-road">
            🛣️ {t('currentRoad')}: <strong>{activeTurn.road}</strong>
          </div>
        </div>

        <div className="maneuver-hud-metrics">
          <span className={`hud-live-badge ${!isStationary ? 'badge-moving' : 'badge-stopped'}`}>
            {!isStationary ? `🟢 ${t('inMotion')} (${speed} km/h)` : `🛑 ${t('stationary')}`}
          </span>
          <span className="hud-remaining-tag">
            ⏱️ {remainingMinutes} mins • {remainingDistKm} km left
          </span>
          <button
            type="button"
            className={`audio-toggle-btn ${audioAlerts ? 'audio-on' : 'audio-off'}`}
            onClick={() => setAudioAlerts(!audioAlerts)}
            title="Toggle Voice Prompts"
          >
            {audioAlerts ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span>{audioAlerts ? t('voiceOn') : t('voiceMute')}</span>
          </button>
        </div>
      </div>

      {/* 3. Floating User-Friendly Start ➔ Destination Journey Bar */}
      <div className="map-two-points-journey-bar">
        <div className="journey-point start-point">
          <span className="point-indicator-dot dot-green" />
          <div className="point-info">
            <span className="point-type-tag">START (A)</span>
            <strong className="point-name">{startLabel}</strong>
          </div>
        </div>

        <div className="journey-connector">
          <span className="journey-route-arrow">➔</span>
          <span className="journey-metrics-badge">
            {routeSummary.distanceKm} km • ~{routeSummary.durationMin} mins
          </span>
        </div>

        <div className="journey-point dest-point">
          <span className="point-indicator-dot dot-red" />
          <div className="point-info">
            <span className="point-type-tag">DESTINATION (B)</span>
            <strong className="point-name">{destLabel}</strong>
          </div>
        </div>
      </div>

      {/* 4. Floating Map Style Layer Switcher */}
      <div className="map-floating-layer-widget">
        <button
          type="button"
          className="layer-switcher-trigger-btn"
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          title="Change Map Visibility & Layer Type"
        >
          <Layers size={15} />
          <span>{MAP_TILE_PROVIDERS[mapStyle]?.label || 'Map Layer'}</span>
          <ChevronDown size={13} />
        </button>

        {showStyleMenu && (
          <div className="layer-switcher-dropdown">
            <div className="layer-dropdown-title">Select Map Clarity:</div>
            {Object.values(MAP_TILE_PROVIDERS).map((style) => (
              <button
                key={style.id}
                type="button"
                className={`layer-style-option ${mapStyle === style.id ? 'selected' : ''}`}
                onClick={() => handleSelectMapStyle(style.id)}
              >
                <strong>{style.label}</strong>
                <small>{style.desc}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. Navigation Control Bar */}
      <div className="donor-travel-control-bar">
        <div className="travel-controls-left">
          {/* Mode Switch */}
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-btn ${trackingMode === 'gps' ? 'mode-btn-active' : ''}`}
              onClick={() => {
                setTrackingMode('gps')
                handleSimStop()
              }}
            >
              <Radio size={13} /> Real GPS
            </button>
            <button
              type="button"
              className={`mode-btn ${trackingMode === 'simulate' ? 'mode-btn-active' : ''}`}
              onClick={() => {
                setTrackingMode('simulate')
                stopRealGpsTracking()
              }}
            >
              <Car size={13} /> Sim Drive
            </button>
          </div>

          {/* Controls for Real GPS Mode */}
          {trackingMode === 'gps' && (
            <>
              {!isGpsActive ? (
                <button type="button" className="ctrl-btn-action btn-move-start" onClick={startRealGpsTracking}>
                  <Play size={15} /> {t('startGpsGuidance')}
                </button>
              ) : (
                <button type="button" className="ctrl-btn-action btn-move-stop" onClick={stopRealGpsTracking}>
                  <Pause size={15} /> {t('holdLocation')}
                </button>
              )}
            </>
          )}

          {/* Controls for Simulation Mode */}
          {trackingMode === 'simulate' && (
            <>
              {!isSimRunning ? (
                <button type="button" className="ctrl-btn-action btn-move-start" onClick={handleSimStart}>
                  <Play size={15} /> {simProgress > 0 ? t('resumeTravel') : t('startTravel')}
                </button>
              ) : (
                <button type="button" className="ctrl-btn-action btn-move-stop" onClick={handleSimStop}>
                  <Pause size={15} /> {t('stopAtLocation')}
                </button>
              )}
              <button type="button" className="ctrl-btn-ghost" onClick={handleReset} title={t('reset')}>
                <RotateCcw size={14} /> {t('reset')}
              </button>
            </>
          )}

          {/* Recalculate Route */}
          <button
            type="button"
            className="ctrl-btn-ghost"
            onClick={() => fetchBestRoadRoute(originLat, originLng, targetLat, targetLng)}
            title="Recalculate Fastest Road Corridor"
          >
            <Zap size={13} /> Fastest Route
          </button>

          {/* Steps Toggle */}
          <button
            type="button"
            className={`ctrl-btn-ghost ${showDirectionsDrawer ? 'active-fast' : ''}`}
            onClick={() => setShowDirectionsDrawer(!showDirectionsDrawer)}
            title="View Turn by Turn Road Steps"
          >
            <Navigation size={13} /> {turnGuidanceSteps.length} Steps
          </button>
        </div>

        <div className="travel-controls-right">
          <button type="button" className="ctrl-btn-icon" onClick={handleAutoFitRoute} title="Auto-Fit Entire Route">
            <Maximize2 size={16} />
          </button>
          <button type="button" className="ctrl-btn-icon" onClick={openOfficialGoogleMaps} title={t('openGoogleMaps')}>
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      {/* 6. Turn-by-Turn Road Steps Drawer */}
      {showDirectionsDrawer && (
        <div className="map-road-steps-drawer">
          <div className="road-steps-header">
            <div>
              <strong>📍 Route: {startLabel} ➔ {destLabel}</strong>
              <small style={{ display: 'block', color: 'var(--cyan)' }}>
                {routeSummary.distanceKm} km total • ~{routeSummary.durationMin} mins • {routeSummary.traffic}
              </small>
            </div>
            <button
              type="button"
              className="ghost-button small-btn"
              onClick={() => setShowDirectionsDrawer(false)}
            >
              ✕ Close
            </button>
          </div>
          <div className="road-steps-list">
            {turnGuidanceSteps.map((step, idx) => (
              <div
                key={idx}
                className={`road-step-item ${idx === currentManeuverIndex ? 'active-step' : ''}`}
                onClick={() => setCurrentManeuverIndex(idx)}
              >
                <span className="step-badge-icon">{step.icon}</span>
                <div className="step-details-col">
                  <p className="step-main-text">{step.instruction}</p>
                  <span className="step-road-sub">{step.road} • {step.distanceToTurn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Bottom Status Bar */}
      <div className="leaflet-bottom-status-bar">
        <div className="telemetry-left">
          <span className={`live-telemetry-dot ${!isStationary ? 'telemetry-green' : 'telemetry-red'}`} />
          <span className="telemetry-coords">
            📍 {currentCoord.lat.toFixed(4)}° N, {currentCoord.lng.toFixed(4)}° E
          </span>
          <span className="telemetry-state">{gpsStatus}</span>
        </div>
        <div className="telemetry-right">
          <span className="telemetry-legend leg-hosp">🟢 Point A (Start)</span>
          <span className="telemetry-legend leg-emrg">🔴 Point B (Destination)</span>
        </div>
      </div>
    </div>
  )
}
