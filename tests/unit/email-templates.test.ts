import { describe, expect, it, vi } from 'vitest'
import { generateCommissionBonusEmail } from '@/lib/email-templates'
import type { CommissionBonusEmailData } from '@/lib/email-templates'
import { CSM_COMMISSION_TYPE } from '@/lib/commission-calculator'

// Mock the env var used for email signature
vi.stubEnv('COMMISSION_PAYOUT_EMAIL_SENDER', 'Charles')

function createEmailData(
  overrides: Partial<CommissionBonusEmailData> = {},
): CommissionBonusEmailData {
  return {
    firstName: 'Alice',
    quarter: 'Q1 2025',
    quota: 100000,
    attainment: 80000,
    attainmentPercentage: 80,
    bonusAmount: 30000,
    calculatedAmount: 24000,
    ...overrides,
  }
}

describe('generateCommissionBonusEmail', () => {
  it('generates standard email with breakdown', () => {
    const html = generateCommissionBonusEmail(createEmailData())
    expect(html).toContain('Hi Alice')
    expect(html).toContain('Q1 2025')
    expect(html).toContain('$100,000.00') // quota
    expect(html).toContain('80.0%') // attainment percentage
    expect(html).toContain('Charles') // signature
  })

  it('generates ramp-up only email when postRampUpMonths is 0', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({
        quarterBreakdown: {
          notEmployedMonths: 0,
          rampUpMonths: 3,
          postRampUpMonths: 0,
        },
      }),
    )
    expect(html).toContain('3 months of fixed commission')
    expect(html).not.toContain('Quota:')
  })

  it('shows single month text for 1 month ramp-up', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({
        quarterBreakdown: {
          notEmployedMonths: 2,
          rampUpMonths: 1,
          postRampUpMonths: 0,
        },
      }),
    )
    expect(html).toContain('1 month of fixed commission')
  })

  it('includes next quarter ramp-up amount when provided', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({
        quarterBreakdown: {
          notEmployedMonths: 0,
          rampUpMonths: 3,
          postRampUpMonths: 0,
        },
        nextQuarterRampUpAmount: 10000,
      }),
    )
    expect(html).toContain('$10,000.00')
    expect(html).toContain('next quarter')
  })

  it('includes notes when provided', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({ notes: 'Great quarter!' }),
    )
    expect(html).toContain('Great quarter!')
  })

  it('includes sheet link when provided', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({ sheet: 'https://sheets.example.com/abc' }),
    )
    expect(html).toContain('href="https://sheets.example.com/abc"')
    expect(html).toContain('this sheet')
  })

  it('shows amount held in breakdown', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({
        amountHeld: 5000,
        exchangeRate: 1,
        calculatedAmountLocal: 24000,
        localCurrency: 'USD',
      }),
    )
    expect(html).toContain('Amount held')
    expect(html).toContain('$5,000.00')
  })

  it('shows trailing 12-month performance when > 100%', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({ trailing12MonthsPerformance: 125 }),
    )
    expect(html).toContain('125%')
    expect(html).toContain('Awesome work')
  })

  it('does not show trailing 12-month performance when <= 100%', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({ trailing12MonthsPerformance: 90 }),
    )
    expect(html).not.toContain('Awesome work')
  })

  it('formats CSM quota as percentage', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({
        quota: 1.05,
        attainment: 1.1,
        commissionType: CSM_COMMISSION_TYPE,
      }),
    )
    expect(html).toContain('105.0%') // quota
    expect(html).toContain('110.0%') // attainment
  })

  it('shows local currency amounts', () => {
    const html = generateCommissionBonusEmail(
      createEmailData({
        calculatedAmountLocal: 20000,
        localCurrency: 'EUR',
        exchangeRate: 0.85,
      }),
    )
    expect(html).toContain('€')
  })
})
