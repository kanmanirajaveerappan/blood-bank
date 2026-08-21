export const HaversineKM = (lat1, lon1, lat2, lon2) => {
  const toRadians = (deg) => (deg * Math.PI) / 180
  const earthRadiusKm = 6371

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export const eligibleDonorGroups = (requestedGroup) => compatibilityMatrix[requestedGroup] ?? []

export const compatibilityMatrix = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
}

export const findPotentialDonors = ({ requestGroup, requestLat, requestLon, donors, k = 5, maxDistanceKm = 25 }) => {
  const allowedGroups = eligibleDonorGroups(requestGroup)

  const candidates = donors
    .filter((donor) => donor.availability)
    .filter((donor) => allowedGroups.includes(donor.bloodGroup))
    .map((donor) => {
      const distanceKm = HaversineKM(requestLat, requestLon, donor.latitude, donor.longitude)
      return {
        ...donor,
        distanceKm: Number(distanceKm.toFixed(2)),
      }
    })
    .filter((donor) => donor.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)

  return candidates.slice(0, k)
}

export const rankCandidatesKnn = (donors = [], requestGroup = 'O+', requestLat = 13.0827, requestLon = 80.2707, maxDistanceKm = 25, k = 10) => {
  const allowedGroups = eligibleDonorGroups(requestGroup)

  const candidates = donors
    .filter((donor) => allowedGroups.includes(donor.bloodGroup || donor.blood_group))
    .map((donor) => {
      const lat = donor.latitude ?? donor.lat ?? 13.0827
      const lon = donor.longitude ?? donor.lng ?? donor.lon ?? 80.2707
      const distanceKm = HaversineKM(requestLat, requestLon, lat, lon)

      // Priority score calculation: distance (40%), exact group match (30%), availability (20%), freshness (10%)
      const isExactMatch = (donor.bloodGroup || donor.blood_group) === requestGroup
      const distScore = Math.max(0, 100 - (distanceKm / maxDistanceKm) * 60)
      const exactScore = isExactMatch ? 100 : 80
      const availScore = donor.availability !== false ? 100 : 40
      const priorityScore = Math.round(distScore * 0.45 + exactScore * 0.30 + availScore * 0.25)

      return {
        ...donor,
        id: donor.id || donor.donor_id,
        latitude: lat,
        longitude: lon,
        distanceKm: Number(distanceKm.toFixed(1)),
        priorityScore: Math.min(99, Math.max(50, priorityScore)),
        location_freshness: donor.location_freshness || 'FRESH',
      }
    })
    .filter((c) => c.distanceKm <= maxDistanceKm)
    .sort((a, b) => b.priorityScore - a.priorityScore)

  return candidates.slice(0, k)
}

