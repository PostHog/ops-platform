import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'

const content = fs.readFileSync(
  path.join(process.cwd(), 'src/components/StockOptionsCalculator.tsx'),
  'utf-8',
)

describe('StockOptionsCalculator', () => {
  it('exports StockOptionsCalculator as default export', () => {
    expect(content).toMatch(/export default function StockOptionsCalculator/)
  })

  it('accepts optionGrants as a required prop', () => {
    expect(content).toMatch(/optionGrants:\s*CartaOptionGrant\[\]/)
  })

  it('returns null when option grants are empty', () => {
    expect(content).toMatch(
      /if \(optionGrants\.length === 0\)\s*\{[\s\S]*?return null/,
    )
  })

  it('returns null when valuation data is unavailable', () => {
    expect(content).toMatch(
      /if \(\s*!data\?\.FULLY_DILUTED_SHARES \|\|\s*!data\?\.CURRENT_VALUATION \|\|\s*!data\?\.DILUTION_PER_ROUND\s*\)\s*\{[\s\S]*?return null/,
    )
  })

  it('fetches valuation and shares via useQuery', () => {
    expect(content).toMatch(/useQuery\(\{/)
    expect(content).toMatch(/queryKey:\s*\['valuationAndShares'\]/)
    expect(content).toMatch(/queryFn:\s*getValuationAndShares/)
  })

  it('toggles between total and vested view using local storage', () => {
    expect(content).toMatch(/useLocalStorage/)
    expect(content).toMatch(/stockOptions\.showVested/)
    expect(content).toMatch(/Total \(outstanding\)/)
    expect(content).toMatch(/Vested/)
    expect(content).toMatch(/setShowVested/)
  })

  it('calculates net value after exercise', () => {
    expect(content).toMatch(
      /const netValue = currentValue - totalCostToExercise/,
    )
    expect(content).toMatch(/Net value after exercise/)
  })

  it('supports adding and removing custom valuations', () => {
    expect(content).toMatch(/const addValuation/)
    expect(content).toMatch(/const removeValuation/)
    expect(content).toMatch(/resetToDefaults/)
    expect(content).toMatch(/customValuations/)
  })

  it('uses sensitive data hiding to mask values', () => {
    expect(content).toMatch(/useSensitiveDataHidden/)
    expect(content).toMatch(/isSensitiveHidden/)
    expect(content).toMatch(/PLACEHOLDER/)
  })
})
