// Restore the course only for the archive. Fresh NAV landings still start at Multi-Verse.
export function initialAssignmentCluster(view, location, savedCluster) {
  if (view !== 'assignment_hub') return null
  return location.state?.clusterId || new URLSearchParams(location.search).get('clusterId') || savedCluster || null
}
