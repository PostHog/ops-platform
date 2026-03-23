import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const reviewQueueAtom = atom<Array<string>>([])

export const chatSidebarOpenAtom = atom(false)

export const orgChartAutozoomingEnabledAtom = atomWithStorage<boolean>(
  'org-chart.autozoomingEnabled',
  false,
)

// Persisted default for "hide sensitive data" across sessions
export const defaultHideSensitiveDataAtom = atomWithStorage<boolean>(
  'settings.defaultHideSensitiveData',
  false,
)

// Session override (null = use persisted default)
const sessionOverrideAtom = atom<boolean | null>(null)

// Derived atom: uses session override if set, otherwise the persisted default
export const hideSensitiveDataAtom = atom(
  (get) => {
    const override = get(sessionOverrideAtom)
    return override !== null ? override : get(defaultHideSensitiveDataAtom)
  },
  (_get, set, value: boolean) => {
    set(sessionOverrideAtom, value)
  },
)
