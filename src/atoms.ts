import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const reviewQueueAtom = atom<Array<string>>([])

export const orgChartAutozoomingEnabledAtom = atomWithStorage<boolean>(
  'org-chart.autozoomingEnabled',
  false,
)

// Permanent opt-out stored in localStorage
export const permanentlyShowSensitiveDataAtom = atomWithStorage<boolean>(
  'settings.permanentlyShowSensitiveData',
  false,
)

// Session-level toggle (per tab, resets on refresh, defaults to hidden)
const sessionShowSensitiveDataAtom = atom<boolean>(false)

// Derived atom: data is hidden unless permanently opted out or session-toggled
export const hideSensitiveDataAtom = atom(
  (get) => {
    if (get(permanentlyShowSensitiveDataAtom)) return false
    return !get(sessionShowSensitiveDataAtom)
  },
  (_get, set, value: boolean) => {
    // Toggle the session atom (true = hide, so we invert)
    set(sessionShowSensitiveDataAtom, !value)
  },
)
