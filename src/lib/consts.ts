export const ROLES = {
  ADMIN: 'admin',
  BLITZSCALE: 'blitzscale',
  ORG_CHART: 'org-chart',
  USER: 'user',
}

export const hasAdminAccess = (role: string | null | undefined): boolean =>
  role === ROLES.ADMIN || role === ROLES.BLITZSCALE
