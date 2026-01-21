import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export const reviewQueueAtom = atom<Array<string>>([])

export const orgChartAutozoomingEnabledAtom = atomWithStorage<boolean>(
  'org-chart.autozoomingEnabled',
  false,
)

export const hideSensitiveDataAtom = atomWithStorage<boolean>(
  'settings.hideSensitiveData',
  false,
)
