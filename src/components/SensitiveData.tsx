import { useAtomValue } from 'jotai'
import { hideSensitiveDataAtom } from '@/atoms'

/**
 * Hook to check if sensitive data should be hidden
 */
export function useSensitiveDataHidden(): boolean {
  return useAtomValue(hideSensitiveDataAtom)
}
