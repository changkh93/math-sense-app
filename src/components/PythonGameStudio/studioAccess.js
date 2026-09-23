export const PUBLIC_STUDIO_UID = 'public-code-studio'

export function hasFullStudioAccess(user, userData) {
  return Boolean(
    user
    && !user.isAnonymous
    && !userData?.isGuest
    && !userData?.dataLoadError
    && (userData?.role === 'admin' || ['python', '파이썬'].some(id => userData?.clusterAccess?.[id] === 'active'))
  )
}
