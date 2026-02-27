import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import type { ChecklistItemType } from '@prisma/client'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

/**
 * Get full name from firstName and lastName, with fallback to email
 */
export function getFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback?: string,
): string {
  const first = firstName?.trim() || ''
  const last = lastName?.trim() || ''
  const fullName = [first, last].filter(Boolean).join(' ')
  return fullName || fallback || ''
}

// Helper functions to convert KeeperTestRating enum values to display text
export function ratingToText(rating: string): string {
  const map: Record<string, string> = {
    STRONG_YES:
      '1000%, I would pull in the Blitzscale team to convince them to stay',
    YES: 'Yes, I would try and keep them',
    NO: 'No, they seem fine but we can find better',
    STRONG_NO:
      'Absolutely not - in fact we should consider letting this person go',
  }
  return map[rating] || rating
}

export function driverRatingToText(rating: string): string {
  const map: Record<string, string> = {
    STRONG_YES: "They're driving across the country with no stops",
    YES: 'They definitely drive but do sometimes need breaks',
    NO: 'A passenger',
    STRONG_NO: "They're asleep in the back of the cab",
  }
  return map[rating] || rating
}

export function proactiveRatingToText(rating: string): string {
  const map: Record<string, string> = {
    STRONG_YES: "It's very rare they are not proactive",
    YES: 'Mostly proactive',
    NO: 'Sometimes proactive',
    STRONG_NO: 'Not proactive',
  }
  return map[rating] || rating
}

export function optimisticRatingToText(rating: string): string {
  const map: Record<string, string> = {
    STRONG_YES: 'I think they might be Ted Lasso',
    YES: 'Yes, they are positive to be around',
    NO: 'They are a bit doom and gloom sometimes',
    STRONG_NO: 'Eeyore',
  }
  return map[rating] || rating
}

export function getChecklistItemTypeLabel(
  type: ChecklistItemType | undefined,
): string {
  switch (type) {
    case 'SLACK_FEEDBACK_MEETING':
      return 'Step 1 - after starting the process, DM the person letting them know in slack and upload a screenshot of that here'
    case 'EMAIL_FEEDBACK_MEETING':
      return "Step 2 - If you don't see immediate improvements after roughly a week, you should loop in Fraser to send a more formal message via email"
    default:
      return 'Unknown Checklist Item Type'
  }
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD',
): string {
  if (amount === null || amount === undefined) return '$0.00'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// compensation data updated on 2026-02-24

export const currencyData: Record<string, number> = {
  CAD: 1.264,
  HKD: 7.796,
  ISK: 129.79,
  PHP: 51,
  DKK: 6.539,
  HUF: 324.71,
  CZK: 21.872,
  GBP: 0.733,
  RON: 4.351,
  SEK: 9.05,
  IDR: 14242,
  INR: 74.514,
  BRL: 5.571,
  RUB: 74.792,
  HRK: 6.61,
  JPY: 115.108,
  THB: 33.195,
  CHF: 0.912,
  EUR: 0.879,
  MYR: 4.177,
  BGN: 1.718,
  TRY: 13.321,
  CNY: 6.356,
  NOK: 8.818,
  NZD: 1.462,
  ZAR: 15.951,
  USD: 1,
  MXN: 20.497,
  SGD: 1.349,
  AUD: 1.376,
  ILS: 3.113,
  KRW: 1188.88,
  PLN: 4.035,
  RSD: 107.5,
  COP: 4925,
}

export const bonusPercentage: Record<string, number> = {
  'Account Executive (OTE)': 0.5,
  'Customer Success Manager (OTE)': 0.2,
  'Business Development Representative (OTE)': 0.0,
}

export const sfBenchmark: Record<string, number> = {
  'Product Engineer': 262000,
  'Account Executive (OTE)': 300000,
  'Backend Engineer': 262000,
  'Billing Support Specialist': 154619,
  'Business Development Representative (OTE)': 182000,
  'Content Marketer': 190910,
  'Community Manager': 185000,
  'Customer Success Manager (OTE)': 237375,
  'Data Engineer': 262000,
  'Design Lead': 236000,
  'Events Manager': 165000,
  'Finance Manager': 181680,
  'Front End Developer': 212000,
  'Forward Deployed Engineer': 211000,
  'Full Stack Engineer': 262000,
  'Graphic Designer': 147530,
  'Mobile Engineer': 262000,
  'Onboarding Specialist': 211000,
  'Operations & Finance Lead': 225000,
  'Operations Manager': 181680,
  'People Operations Manager': 153311,
  'Performance Marketer': 160680,
  'Product Designer': 186000,
  'Product Manager': 213600,
  'Product Marketer': 218000,
  'Revenue Ops Manager': 192000,
  'Site Reliability Engineer': 236000,
  'Support Engineer': 189000,
  'Talent Partner': 210000,
  'Talent Sourcer': 165000,
  'Video Producer': 166800,
}

interface CompensationCalculatorLocation {
  country: string
  area: string
  locationFactor: number
  currency?: string
}

export const getCountries = () => {
  return [...new Set(locationFactor.map(({ country }) => country))]
}

export const getAreasByCountry = (country: string) => {
  return [
    ...new Set(
      locationFactor
        .filter(({ country: c }) => c === country)
        .map(({ area }) => area),
    ),
  ]
}

export const roleTypeOptions = {
  Engineer: 0.75,
  Sales: 0.15,
  CS: 0.3,
  'Everyone else': 0.4,
}

export const roleType: Record<
  keyof typeof sfBenchmark,
  keyof typeof roleTypeOptions
> = {
  'Product Engineer': 'Engineer',
  'Account Executive (OTE)': 'Sales',
  'Backend Engineer': 'Engineer',
  'Billing Support Specialist': 'Everyone else',
  'Business Development Representative (OTE)': 'Sales',
  'Content Marketer': 'Everyone else',
  'Community Manager': 'Everyone else',
  'Customer Success Manager (OTE)': 'CS',
  'Data Engineer': 'Engineer',
  'Design Lead': 'Everyone else',
  'Events Manager': 'Everyone else',
  'Finance Manager': 'Everyone else',
  'Front End Developer': 'Engineer',
  'Full Stack Engineer': 'Engineer',
  'Graphic Designer': 'Everyone else',
  'Mobile Engineer': 'Engineer',
  'Onboarding Specialist': 'Everyone else',
  'Operations & Finance Lead': 'Everyone else',
  'Operations Manager': 'Everyone else',
  'People Operations Manager': 'Everyone else',
  'Performance Marketer': 'Everyone else',
  'Product Designer': 'Everyone else',
  'Product Manager': 'Everyone else',
  'Product Marketer': 'Everyone else',
  'Revenue Ops Manager': 'Everyone else',
  'Site Reliability Engineer': 'Engineer',
  'Support Engineer': 'Everyone else',
  'Talent Partner': 'Everyone else',
  'Video Producer': 'Everyone else',
}

export const stepModifier: Record<string, Array<number>> = {
  Learning: [0.85, 0.94],
  Established: [0.95, 1.04],
  Thriving: [1.05, 1.1],
  Expert: [1.11, 1.2],
}

export const SALARY_LEVEL_OPTIONS: Array<{
  name: string
  value: number
}> = [
  { name: 'Junior', value: 0.59 },
  { name: 'Intermediate', value: 0.78 },
  { name: 'Senior', value: 1 },
  { name: 'Staff', value: 1.2 },
  { name: 'Director', value: 1.4 },
]

export function getCountryFlag(countryName: string): string {
  const countryToCode: Record<string, string> = {
    'United States': 'US',
    Canada: 'CA',
    Bermuda: 'BM',
    Bahamas: 'BS',
    'Dominican Republic': 'DO',
    Jamaica: 'JM',
    'Puerto Rico': 'PR',
    Cuba: 'CU',
    'Trinidad and Tobago': 'TT',
    'El Salvador': 'SV',
    Guatemala: 'GT',
    Mexico: 'MX',
    'Costa Rica': 'CR',
    Nicaragua: 'NI',
    Panama: 'PA',
    Suriname: 'SR',
    Venezuela: 'VE',
    Paraguay: 'PY',
    Colombia: 'CO',
    Ecuador: 'EC',
    Argentina: 'AR',
    Chile: 'CL',
    Peru: 'PE',
    Uruguay: 'UY',
    Brazil: 'BR',
    Algeria: 'DZ',
    Egypt: 'EG',
    Libya: 'LY',
    Morocco: 'MA',
    Tunisia: 'TN',
    Uganda: 'UG',
    Rwanda: 'RW',
    Zimbabwe: 'ZW',
    Zambia: 'ZM',
    Kenya: 'KE',
    Ethiopia: 'ET',
    Tanzania: 'TZ',
    Namibia: 'NA',
    Ghana: 'GH',
    'South Africa': 'ZA',
    Nigeria: 'NG',
    Benin: 'BJ',
    Singapore: 'SG',
    Cyprus: 'CY',
    Turkey: 'TR',
    Israel: 'IL',
    Bulgaria: 'BG',
    Moldova: 'MD',
    Romania: 'RO',
    Ukraine: 'UA',
    Slovakia: 'SK',
    Hungary: 'HU',
    Poland: 'PL',
    'Czech Republic': 'CZ',
    Denmark: 'DK',
    Finland: 'FI',
    Ireland: 'IE',
    Norway: 'NO',
    Latvia: 'LV',
    Lithuania: 'LT',
    Estonia: 'EE',
    'United Kingdom': 'GB',
    Albania: 'AL',
    'Bosnia and Herzegovina': 'BA',
    Croatia: 'HR',
    Greece: 'GR',
    Malta: 'MT',
    Montenegro: 'ME',
    Belgium: 'BE',
    Portugal: 'PT',
    Serbia: 'RS',
    Slovenia: 'SI',
    Spain: 'ES',
    Macedonia: 'MK',
    Kosovo: 'XK',
    Austria: 'AT',
    France: 'FR',
    Germany: 'DE',
    Netherlands: 'NL',
    Andorra: 'AD',
  }

  const countryCode = countryToCode[countryName]
  if (!countryCode) return ''

  // Convert country code to flag emoji
  // Flag emojis are created using regional indicator symbols
  // Each letter is offset from 'A' (0x1F1E6)
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)

  return String.fromCodePoint(...codePoints)
}

export const locationFactor: Array<CompensationCalculatorLocation> = [
  {
    country: 'United States',
    area: 'Connecticut',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Maine',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Portland, Maine',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Massachusetts',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Boston, Massachusetts',
    locationFactor: 0.85,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'New Hampshire',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Providence, Rhode Island',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Vermont',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'New Jersey',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, New York',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'NYC, New York',
    locationFactor: 0.9,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Pennsylvania',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Pittsburgh, Pennsylvania',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Philadelphia, Pennsylvania',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Indiana',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Indianapolis, Indiana',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Michigan',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Detroit, Michigan',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Ohio',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Columbus, Ohio',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Cleveland, Ohio',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Cincinnati, Ohio',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Wisconsin',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Milwaukee, Wisconsin',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Chicago, Illinois',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Illinois',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Iowa',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Des Moines, Iowa',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Nebraska',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Lincoln/Omaha, Nebraska',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Kansas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'North Dakota',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Minnesota',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Minneapolis, Minnesota',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'South Dakota',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Missouri',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Kansas City, Missouri / Kansas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'St Louis, Missouri',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Delaware',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Washington DC',
    locationFactor: 0.85,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Florida',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Fort Myers, Florida',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Miami/Fort Lauderdale, Florida',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Jacksonville, Florida',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Orlando/Tampa, Florida',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Georgia',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Atlanta, Georgia',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Maryland',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, North Carolina',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Charlotte, North Carolina',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Raleigh, North Carolina',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'South Carolina',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Virginia',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Richmond, Virginia',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Virginia Beach, Virginia',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'West Virginia',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Alabama',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Birmingham, Alabama',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Kentucky',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Louisville/Lexington, Kentucky',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Mississippi',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Jackson, Mississippi',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Tennessee',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Nashville, Tennessee',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Arkansas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Fayetteville, Arkansas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Louisiana',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'New Orleans, Louisiana',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Oklahoma',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Texas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Dallas, Texas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Houston, Texas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Austin, Texas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'San Antonio, Texas',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Arizona',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Phoenix, Arizona',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Tucson, Arizona',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Colorado',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Denver/Boulder, Colorado',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Idaho',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Boise, Idaho',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'New Mexico',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Montana',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Salt Lake City, Utah',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Utah',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Nevada',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Las Vegas, Nevada',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Reno, Nevada',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Wyoming',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Jackson, Wyoming',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Cheyenne, Wyoming',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Alaska',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, California',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Sacramento, California',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'San Francisco, California',
    locationFactor: 1,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Santa Barbara, California',
    locationFactor: 0.85,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Los Angeles, California',
    locationFactor: 0.85,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Santa Cruz, California',
    locationFactor: 0.85,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'San Diego, California',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Hawaii',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Oregon',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Portland, Oregon',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Bend, Oregon',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Eugene, Oregon',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Everywhere else, Washington',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Seattle, Washington',
    locationFactor: 0.9,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Bellingham, Washington',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'United States',
    area: 'Spokane, Washington',
    locationFactor: 0.8,
    currency: 'USD',
  },
  {
    country: 'Canada',
    area: 'Calgary, Alberta',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Edmonton, Alberta',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Everywhere else, Alberta',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Vancouver, British Columbia',
    locationFactor: 0.7,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Victoria, British Columbia',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Everywhere else, British Columbia',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Everywhere else, Manitoba',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Winnipeg, Manitoba',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'New Brunswick',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Newfoundland and Labrador',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Northwest Territories',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Nova Scotia',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Nunavut',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Toronto, Ontario',
    locationFactor: 0.75,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Ottawa, Ontario',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Everywhere else, Ontario',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Prince Edward Island',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Everywhere else, Quebec',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Montreal, Quebec',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Quebec City, Quebec',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Everywhere else, Saskatchewan',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Regina, Saskatchewan',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Saskatoon, Saskatchewan',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Canada',
    area: 'Yukon',
    locationFactor: 0.65,
    currency: 'CAD',
  },
  {
    country: 'Bermuda',
    area: 'All',
    locationFactor: 0.6,
    currency: 'BMD',
  },
  {
    country: 'Bahamas',
    area: 'All',
    locationFactor: 0.6,
    currency: 'BSD',
  },
  {
    country: 'Dominican Republic',
    area: 'All',
    locationFactor: 0.6,
    currency: 'DOP',
  },
  {
    country: 'Jamaica',
    area: 'All',
    locationFactor: 0.6,
    currency: 'JMD',
  },
  {
    country: 'Puerto Rico',
    area: 'All',
    locationFactor: 0.6,
    currency: 'USD',
  },
  {
    country: 'Cuba',
    area: 'All',
    locationFactor: 0.6,
    currency: 'CUP',
  },
  {
    country: 'Trinidad and Tobago',
    area: 'All',
    locationFactor: 0.6,
    currency: 'TTD',
  },
  {
    country: 'El Salvador',
    area: 'All',
    locationFactor: 0.6,
    currency: 'USD',
  },
  {
    country: 'Guatemala',
    area: 'All',
    locationFactor: 0.6,
    currency: 'GTQ',
  },
  {
    country: 'Mexico',
    area: 'All',
    locationFactor: 0.6,
    currency: 'MXN',
  },
  {
    country: 'Costa Rica',
    area: 'All',
    locationFactor: 0.6,
    currency: 'CRC',
  },
  {
    country: 'Nicaragua',
    area: 'All',
    locationFactor: 0.6,
    currency: 'NIO',
  },
  {
    country: 'Panama',
    area: 'All',
    locationFactor: 0.6,
    currency: 'PAB',
  },
  {
    country: 'Suriname',
    area: 'All',
    locationFactor: 0.6,
    currency: 'SRD',
  },
  {
    country: 'Venezuela',
    area: 'All',
    locationFactor: 0.6,
    currency: 'VEF',
  },
  {
    country: 'Paraguay',
    area: 'All',
    locationFactor: 0.6,
    currency: 'PYG',
  },
  {
    country: 'Colombia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'COP',
  },
  {
    country: 'Ecuador',
    area: 'All',
    locationFactor: 0.6,
    currency: 'USD',
  },
  {
    country: 'Argentina',
    area: 'All',
    locationFactor: 0.6,
    currency: 'ARS',
  },
  {
    country: 'Chile',
    area: 'All',
    locationFactor: 0.6,
    currency: 'CLP',
  },
  {
    country: 'Peru',
    area: 'All',
    locationFactor: 0.6,
    currency: 'PEN',
  },
  {
    country: 'Uruguay',
    area: 'All',
    locationFactor: 0.6,
    currency: 'UYU',
  },
  {
    country: 'Brazil',
    area: 'All',
    locationFactor: 0.6,
    currency: 'BRL',
  },
  {
    country: 'Algeria',
    area: 'All',
    locationFactor: 0.6,
    currency: 'DZD',
  },
  {
    country: 'Egypt',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EGP',
  },
  {
    country: 'Libya',
    area: 'All',
    locationFactor: 0.6,
    currency: 'LYD',
  },
  {
    country: 'Morocco',
    area: 'All',
    locationFactor: 0.6,
    currency: 'MAD',
  },
  {
    country: 'Tunisia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'TND',
  },
  {
    country: 'Uganda',
    area: 'All',
    locationFactor: 0.6,
    currency: 'UGX',
  },
  {
    country: 'Rwanda',
    area: 'All',
    locationFactor: 0.6,
    currency: 'RWF',
  },
  {
    country: 'Zimbabwe',
    area: 'All',
    locationFactor: 0.6,
    currency: 'ZWL',
  },
  {
    country: 'Zambia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'ZMK',
  },
  {
    country: 'Kenya',
    area: 'All',
    locationFactor: 0.6,
    currency: 'KES',
  },
  {
    country: 'Ethiopia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'ETB',
  },
  {
    country: 'Tanzania',
    area: 'All',
    locationFactor: 0.6,
    currency: 'TZS',
  },
  {
    country: 'Namibia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'NAD',
  },
  {
    country: 'Ghana',
    area: 'All',
    locationFactor: 0.6,
    currency: 'GHS',
  },
  {
    country: 'South Africa',
    area: 'All',
    locationFactor: 0.6,
    currency: 'ZAR',
  },
  {
    country: 'Nigeria',
    area: 'All',
    locationFactor: 0.6,
    currency: 'NGN',
  },
  {
    country: 'Benin',
    area: 'All',
    locationFactor: 0.6,
    currency: 'XOF',
  },
  {
    country: 'Singapore',
    area: 'All',
    locationFactor: 0.75,
    currency: 'SGD',
  },
  {
    country: 'Cyprus',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Turkey',
    area: 'All',
    locationFactor: 0.6,
    currency: 'TRY',
  },
  {
    country: 'Israel',
    area: 'All',
    locationFactor: 0.63,
    currency: 'ILS',
  },
  {
    country: 'Bulgaria',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Moldova',
    area: 'All',
    locationFactor: 0.6,
    currency: 'MDL',
  },
  {
    country: 'Romania',
    area: 'All',
    locationFactor: 0.6,
    currency: 'RON',
  },
  {
    country: 'Ukraine',
    area: 'All',
    locationFactor: 0.6,
    currency: 'UAH',
  },
  {
    country: 'Slovakia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Hungary',
    area: 'All',
    locationFactor: 0.6,
    currency: 'HUF',
  },
  {
    country: 'Poland',
    area: 'All',
    locationFactor: 0.6,
    currency: 'PLN',
  },
  {
    country: 'Czech Republic',
    area: 'All',
    locationFactor: 0.6,
    currency: 'CZK',
  },
  {
    country: 'Denmark',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'DKK',
  },
  {
    country: 'Denmark',
    area: 'Copenhagen',
    locationFactor: 0.65,
    currency: 'DKK',
  },
  {
    country: 'Finland',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Finland',
    area: 'Helsinki',
    locationFactor: 0.65,
    currency: 'EUR',
  },
  {
    country: 'Ireland',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Ireland',
    area: 'Dublin',
    locationFactor: 0.7,
    currency: 'EUR',
  },
  {
    country: 'Norway',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'NOK',
  },
  {
    country: 'Norway',
    area: 'Oslo',
    locationFactor: 0.65,
    currency: 'NOK',
  },
  {
    country: 'Latvia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Lithuania',
    area: 'All',
    locationFactor: 0.6,
    currency: 'LTL',
  },
  {
    country: 'Estonia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'United Kingdom',
    area: 'Northern Ireland',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Wales',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'London, England',
    locationFactor: 0.75,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Bristol, England',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Cambridge, England',
    locationFactor: 0.65,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Birmingham, England',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Leeds, England',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Manchester/Liverpool, England',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Everywhere else, England',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Glasgow / Edinburgh, Scotland',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'United Kingdom',
    area: 'Everywhere else, Scotland',
    locationFactor: 0.6,
    currency: 'GBP',
  },
  {
    country: 'Albania',
    area: 'All',
    locationFactor: 0.6,
    currency: 'ALL',
  },
  {
    country: 'Bosnia and Herzegovina',
    area: 'All',
    locationFactor: 0.6,
    currency: 'BAM',
  },
  {
    country: 'Croatia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Greece',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Malta',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Montenegro',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Belgium',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Belgium',
    area: 'Brussels',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Portugal',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Serbia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'RSD',
  },
  {
    country: 'Slovenia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Spain',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Macedonia',
    area: 'All',
    locationFactor: 0.6,
    currency: 'MKD',
  },
  {
    country: 'Kosovo',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Austria',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'France',
    area: 'Paris',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'France',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Munich/Nuremberg',
    locationFactor: 0.65,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Ruhrgebiet',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Frankfurt/Stuttgart',
    locationFactor: 0.65,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Cologne/Dusseldorf',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Hamburg/Bremen',
    locationFactor: 0.65,
    currency: 'EUR',
  },
  {
    country: 'Germany',
    area: 'Berlin/Leipzig',
    locationFactor: 0.65,
    currency: 'EUR',
  },
  {
    country: 'Netherlands',
    area: 'Everywhere else',
    locationFactor: 0.6,
    currency: 'EUR',
  },
  {
    country: 'Netherlands',
    area: 'Amsterdam',
    locationFactor: 0.65,
    currency: 'EUR',
  },
  {
    country: 'Andorra',
    area: 'All',
    locationFactor: 0.6,
    currency: 'EUR',
  },
]
