import { faker } from '@faker-js/faker'
import {
  PrismaClient,
  Priority,
  KeeperTestRating,
  KeeperTestRecommendation,
  SalaryDeviationStatus,
} from '@prisma/client'
import {
  sfBenchmark,
  locationFactor,
  getCountries,
  getAreasByCountry,
  currencyData,
  SALARY_LEVEL_OPTIONS,
} from '../src/lib/utils'

const prisma = new PrismaClient()

interface Config {
  numEmployees: number
  clearExisting: boolean
  seed?: number
}

function parseArgs(): Config {
  const args = process.argv.slice(2)
  const config: Config = {
    numEmployees: 50,
    clearExisting: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: tsx scripts/generateDemoData.ts [options]

Options:
  --num-employees <number>  Number of employees to generate (default: 50)
  --clear                   Clear existing data before generation
  --seed <number>           Seed for faker (for reproducible data)
  --help, -h                Show this help message
`)
      process.exit(0)
    } else if (arg === '--num-employees' && args[i + 1]) {
      config.numEmployees = parseInt(args[i + 1], 10)
      i++
    } else if (arg === '--clear') {
      config.clearExisting = true
    } else if (arg === '--seed' && args[i + 1]) {
      config.seed = parseInt(args[i + 1], 10)
      i++
    }
  }

  return config
}

function randomEnum<T extends Record<string, string | number>>(
  enumObject: T,
): T[keyof T] {
  const values = Object.values(enumObject)
  return faker.helpers.arrayElement(values) as T[keyof T]
}

const usedEmails = new Set<string>(['dev@posthog.com'])
function generateUniqueEmail(): string {
  let email: string
  do {
    email = faker.internet.email().toLowerCase()
  } while (usedEmails.has(email))
  usedEmails.add(email)
  return email
}

function generatePastDate(daysAgo: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return faker.date.past({ refDate: date })
}

const VALID_TEAMS = [
  'Exec',
  'Engineering',
  'Product',
  'Sales',
  'Operations',
  'People',
]

const INTERVIEW_NAMES = [
  'Technical Interview',
  'Culture Fit',
  'System Design',
  'Behavioral Interview',
  'Product Interview',
  'Leadership Interview',
  'Final Round',
]

const CHECK_IN_TITLES = [
  '30 Day check-in',
  '60 Day check-in',
  '80 Day check-in',
  'Manager feedback',
]

// Must match DevLoginForm.tsx
const DEV_USER_EMAIL = 'dev@posthog.com'

async function clearExistingData(): Promise<void> {
  console.log('Clearing existing data...')

  await prisma.commissionBonus.deleteMany()
  await prisma.ashbyInterviewScore.deleteMany()
  await prisma.keeperTestFeedback.deleteMany()
  await prisma.proposedHire.deleteMany()
  await prisma.salary.deleteMany()
  await prisma.cartaOptionGrant.deleteMany()
  await prisma.deelEmployee.deleteMany()
  await prisma.employee.deleteMany()

  // Auth tables - dev user will be recreated on sign up
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  console.log('Existing data cleared.')
}

async function generateDevUser() {
  console.log('Generating dev user for local development...')

  const DEV_CARTA_STAKEHOLDER_ID = 'dev-stakeholder-id'

  const existingEmployee = await prisma.employee.findUnique({
    where: { email: DEV_USER_EMAIL },
  })

  if (existingEmployee) {
    console.log(`Dev user (${DEV_USER_EMAIL}) already exists, skipping.`)
    return existingEmployee
  }

  const devEmployee = await prisma.employee.create({
    data: {
      email: DEV_USER_EMAIL,
      priority: 'high',
      reviewed: true,
      checkIn30DaysScheduled: true,
      checkIn60DaysScheduled: true,
      checkIn80DaysScheduled: true,
      cartaStakeholderId: DEV_CARTA_STAKEHOLDER_ID,
    },
  })

  await prisma.deelEmployee.create({
    data: {
      id: 'dev-user-deel-id',
      firstName: 'Dev',
      lastName: 'User',
      title: 'Cofounder',
      team: 'Exec',
      workEmail: DEV_USER_EMAIL,
      personalEmail: 'dev.personal@example.com',
      managerId: null,
      topLevelManagerId: null,
      startDate: new Date('2020-01-01'),
    },
  })

  await prisma.cartaOptionGrant.createMany({
    data: [
      {
        grantId: 'grant-001',
        stakeholderId: DEV_CARTA_STAKEHOLDER_ID,
        vestingStartDate: new Date('2020-01-01'),
        vestingSchedule: '4 years, 1 year cliff',
        exercisePrice: 5.6,
        issuedQuantity: 10000,
        exercisedQuantity: 0,
        vestedQuantity: 10000,
        expiredQuantity: 0,
      },
      {
        grantId: 'grant-002',
        stakeholderId: DEV_CARTA_STAKEHOLDER_ID,
        vestingStartDate: new Date('2022-01-01'),
        vestingSchedule: '4 years, 1 year cliff',
        exercisePrice: 22.2,
        issuedQuantity: 5000,
        exercisedQuantity: 0,
        vestedQuantity: 3750,
        expiredQuantity: 0,
      },
    ],
  })

  // Dev user salary: USD, San Francisco
  await prisma.salary.create({
    data: {
      employeeId: devEmployee.id,
      timestamp: new Date('2020-01-01'),
      country: 'United States',
      area: 'San Francisco, California',
      locationFactor: 1.0,
      level: 7,
      step: 0.8,
      benchmark: 'Product Engineer',
      benchmarkFactor: 1.0,
      totalSalary: 250000,
      bonusPercentage: 0,
      bonusAmount: 0,
      changePercentage: 0,
      changeAmount: 0,
      exchangeRate: 1.0,
      localCurrency: 'USD',
      totalSalaryLocal: 250000,
      amountTakenInOptions: 0,
      actualSalary: 250000,
      actualSalaryLocal: 250000,
      equityRefreshPercentage: 0.1,
      equityRefreshAmount: 25000,
      equityRefreshGranted: true,
      employmentCountry: 'United States',
      employmentArea: 'San Francisco, California',
      notes: 'Initial salary',
      synced: true,
      communicated: true,
    },
  })

  console.log(`Created dev user: ${DEV_USER_EMAIL}`)
  console.log(`  - 2 option grants (150,000 total options)`)
  console.log(`  - Salary: $250,000 USD`)
  return devEmployee
}

async function generateOptionGrants(
  employees: { id: string; email: string }[],
) {
  console.log(`Generating option grants for ${employees.length} employees...`)

  const CURRENT_STOCK_PRICE = 93
  const TARGET_TOTAL_OPTIONS = 10000

  let totalGrants = 0

  for (const employee of employees) {
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { cartaStakeholderId: true },
    })

    // Skip employees who already have grants (like dev user)
    if (existingEmployee?.cartaStakeholderId) {
      continue
    }

    const stakeholderId = `stakeholder-${employee.id}`

    await prisma.employee.update({
      where: { id: employee.id },
      data: { cartaStakeholderId: stakeholderId },
    })

    const deelEmployee = await prisma.deelEmployee.findUnique({
      where: { workEmail: employee.email },
    })
    const startDate = deelEmployee?.startDate || faker.date.past({ years: 3 })

    const numGrants = faker.number.int({ min: 1, max: 3 })
    let remainingOptions = TARGET_TOTAL_OPTIONS

    for (let i = 0; i < numGrants; i++) {
      const isLastGrant = i === numGrants - 1

      const grantOptions = isLastGrant
        ? remainingOptions
        : faker.number.int({
            min: Math.floor(remainingOptions * 0.2),
            max: Math.floor(remainingOptions * 0.6),
          })
      remainingOptions -= grantOptions

      // Earlier grants have lower exercise prices
      const maxExercisePrice = CURRENT_STOCK_PRICE * (0.3 + i * 0.2)
      const exercisePrice = faker.number.float({
        min: maxExercisePrice / 10,
        max: maxExercisePrice,
        fractionDigits: 2,
      })

      const grantDate = new Date(startDate)
      grantDate.setFullYear(grantDate.getFullYear() + i)

      // 4-year vesting schedule
      const now = new Date()
      const monthsElapsed = Math.max(
        0,
        (now.getFullYear() - grantDate.getFullYear()) * 12 +
          (now.getMonth() - grantDate.getMonth()),
      )
      const vestedRatio = Math.min(1, monthsElapsed / 48)
      const vestedQuantity = Math.floor(grantOptions * vestedRatio)

      await prisma.cartaOptionGrant.create({
        data: {
          grantId: `grant-${employee.id}-${i + 1}`,
          stakeholderId,
          vestingStartDate: grantDate,
          vestingSchedule: '4 years, 1 year cliff',
          exercisePrice,
          issuedQuantity: grantOptions,
          exercisedQuantity: 0,
          vestedQuantity,
          expiredQuantity: 0,
        },
      })

      totalGrants++
    }
  }

  console.log(`Generated ${totalGrants} option grants.`)
}

async function generateEmployees(count: number) {
  console.log(`Generating ${count} employees...`)

  const employees = []
  const priorities: Priority[] = ['low', 'medium', 'high']

  for (let i = 0; i < count; i++) {
    const email = generateUniqueEmail()
    const employee = await prisma.employee.create({
      data: {
        email,
        priority: faker.helpers.arrayElement(priorities),
        reviewed: faker.datatype.boolean(),
        checkIn30DaysScheduled: faker.datatype.boolean(),
        checkIn60DaysScheduled: faker.datatype.boolean(),
        checkIn80DaysScheduled: faker.datatype.boolean(),
        salaryDeviationStatus: faker.datatype.boolean()
          ? randomEnum(SalaryDeviationStatus)
          : null,
        salaryDeviationCheckedAt: faker.date.past(),
      },
    })
    employees.push(employee)
  }

  console.log(`Generated ${employees.length} employees.`)
  return employees
}

async function generateDeelEmployees(
  employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log(`Generating DeelEmployees for ${employees.length} employees...`)

  const deelEmployees = []
  const titles = Object.keys(sfBenchmark)

  for (const employee of employees) {
    const startDate = generatePastDate(faker.number.int({ min: 30, max: 1000 }))
    const team = faker.helpers.arrayElement(VALID_TEAMS)
    const title =
      team === 'Exec' ? 'Cofounder' : faker.helpers.arrayElement(titles)

    const deelEmployee = await prisma.deelEmployee.create({
      data: {
        id: faker.string.uuid(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        title,
        team,
        workEmail: employee.email,
        personalEmail: faker.datatype.boolean(0.8)
          ? faker.internet.email().toLowerCase()
          : null,
        managerId: null,
        topLevelManagerId: null,
        startDate,
      },
    })
    deelEmployees.push(deelEmployee)
  }

  // Set up manager hierarchies: Exec -> Team leads -> Regular employees
  const execEmployees = deelEmployees.filter((de) => de.team === 'Exec')
  const teamLeads: typeof deelEmployees = []
  const regularEmployees: typeof deelEmployees = []

  for (const team of VALID_TEAMS) {
    if (team === 'Exec') continue

    const teamMembers = deelEmployees.filter((de) => de.team === team)
    if (teamMembers.length > 0) {
      teamLeads.push(teamMembers[0])
      regularEmployees.push(...teamMembers.slice(1))
    }
  }

  for (const teamLead of teamLeads) {
    if (execEmployees.length === 0) break

    const execManager = faker.helpers.arrayElement(execEmployees)
    await prisma.deelEmployee.update({
      where: { id: teamLead.id },
      data: {
        managerId: execManager.id,
        topLevelManagerId: execManager.id,
      },
    })

    teamLead.managerId = execManager.id
    teamLead.topLevelManagerId = execManager.id
  }

  for (const employee of regularEmployees) {
    const teamLead = teamLeads.find((tl) => tl.team === employee.team)
    if (!teamLead) continue

    const topLevelManager = teamLead.topLevelManagerId
      ? deelEmployees.find((de) => de.id === teamLead.topLevelManagerId) ||
        teamLead
      : teamLead

    await prisma.deelEmployee.update({
      where: { id: employee.id },
      data: {
        managerId: teamLead.id,
        topLevelManagerId: topLevelManager.id,
      },
    })

    employee.managerId = teamLead.id
    employee.topLevelManagerId = topLevelManager.id
  }

  console.log(
    `Generated ${deelEmployees.length} DeelEmployees with manager hierarchies.`,
  )
  return deelEmployees
}

async function generateSalaries(
  employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log(`Generating salary history for ${employees.length} employees...`)

  const countries = getCountries()
  const benchmarks = Object.keys(sfBenchmark)

  let totalSalaries = 0

  for (const employee of employees) {
    const numSalaries = faker.number.int({ min: 2, max: 5 })
    const salaries = []

    const deelEmployee = await prisma.deelEmployee.findUnique({
      where: { workEmail: employee.email },
    })
    const startDate = deelEmployee?.startDate || generatePastDate(365)

    let baseSalary = faker.number.float({
      min: 50000,
      max: 300000,
      fractionDigits: 2,
    })
    const country = faker.helpers.arrayElement(countries)
    const areasForCountry = getAreasByCountry(country)
    const area = faker.helpers.arrayElement(areasForCountry)

    const locationEntry = locationFactor.find(
      (loc) => loc.country === country && loc.area === area,
    )
    const localCurrency = locationEntry?.currency || 'USD'
    const locationFactorValue = locationEntry?.locationFactor || 1

    const exchangeRate = currencyData[localCurrency] || 1

    for (let i = 0; i < numSalaries; i++) {
      if (i > 0) {
        const increasePercent = faker.number.float({
          min: 0,
          max: 0.2,
          fractionDigits: 4,
        })
        baseSalary = baseSalary * (1 + increasePercent)
      }

      const timestamp =
        i === 0
          ? startDate
          : faker.date.between({ from: startDate, to: new Date() })

      const level = faker.helpers.arrayElement(SALARY_LEVEL_OPTIONS).value
      const step = faker.number.float({ min: 0, max: 1, fractionDigits: 2 })
      const benchmark = faker.helpers.arrayElement(benchmarks)
      const benchmarkFactor = faker.number.float({
        min: 0.8,
        max: 1.2,
        fractionDigits: 4,
      })

      const bonusPercentage = faker.datatype.boolean(0.3)
        ? faker.number.float({ min: 0.1, max: 0.3, fractionDigits: 4 })
        : 0
      const bonusAmount = baseSalary * bonusPercentage

      const totalSalary = baseSalary
      const totalSalaryLocal = totalSalary * exchangeRate
      const amountTakenInOptions = faker.datatype.boolean(0.2)
        ? faker.number.float({
            min: 0,
            max: totalSalary * 0.3,
            fractionDigits: 2,
          })
        : 0
      const actualSalary = totalSalary - amountTakenInOptions
      const actualSalaryLocal = actualSalary * exchangeRate

      const previousSalary: { actualSalary: number } | undefined =
        salaries[i - 1]
      const changeAmount: number = previousSalary
        ? actualSalary - previousSalary.actualSalary
        : 0
      const changePercentage: number =
        previousSalary && previousSalary.actualSalary > 0
          ? changeAmount / previousSalary.actualSalary
          : 0

      const equityRefreshPercentage = faker.datatype.boolean(0.4)
        ? faker.number.float({ min: 0.05, max: 0.2, fractionDigits: 4 })
        : 0
      const equityRefreshAmount = baseSalary * equityRefreshPercentage

      const salary = await prisma.salary.create({
        data: {
          timestamp,
          country,
          area,
          locationFactor: locationFactorValue,
          level,
          step,
          benchmark,
          benchmarkFactor,
          totalSalary,
          bonusPercentage,
          bonusAmount,
          changePercentage,
          changeAmount,
          exchangeRate,
          localCurrency,
          totalSalaryLocal,
          amountTakenInOptions,
          actualSalary,
          actualSalaryLocal,
          equityRefreshPercentage,
          equityRefreshAmount,
          equityRefreshGranted: faker.datatype.boolean(0.9),
          employmentCountry: country,
          employmentArea: area,
          notes: faker.lorem.sentence(),
          employeeId: employee.id,
          synced: faker.datatype.boolean(0.8),
          communicated: faker.datatype.boolean(0.6),
        },
      })

      salaries.push(salary)
      totalSalaries++
    }
  }

  console.log(`Generated ${totalSalaries} salary records.`)
}

async function generateProposedHires(
  employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating proposed hires...')

  const numProposedHires = faker.number.int({ min: 5, max: 15 })
  const proposedHireTitles = Object.keys(sfBenchmark)

  const managerCandidates = await prisma.employee.findMany({
    where: {
      deelEmployee: { isNot: null },
    },
    take: Math.min(employees.length, 20),
  })

  if (managerCandidates.length === 0) {
    console.log('No manager candidates found, skipping proposed hires.')
    return
  }

  for (let i = 0; i < numProposedHires; i++) {
    const manager = faker.helpers.arrayElement(managerCandidates)
    const numTalentPartners = faker.number.int({ min: 1, max: 3 })
    const talentPartners = faker.helpers.arrayElements(
      managerCandidates.filter((e) => e.id !== manager.id),
      Math.min(numTalentPartners, managerCandidates.length - 1),
    )

    await prisma.proposedHire.create({
      data: {
        title: faker.helpers.arrayElement(proposedHireTitles),
        managerId: manager.id,
        priority: randomEnum(Priority),
        hiringProfile: faker.lorem.paragraphs(2),
        talentPartners: {
          connect: talentPartners.map((tp) => ({ id: tp.id })),
        },
      },
    })
  }

  console.log(`Generated ${numProposedHires} proposed hires.`)
}

async function generateKeeperTestFeedback(
  _employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating keeper test feedback...')

  const employeesWithManagers = await prisma.employee.findMany({
    where: {
      deelEmployee: {
        managerId: { not: null },
      },
    },
    include: {
      deelEmployee: {
        include: {
          manager: {
            include: {
              employee: true,
            },
          },
        },
      },
    },
  })

  if (employeesWithManagers.length === 0) {
    console.log(
      'No employees with managers found, skipping keeper test feedback.',
    )
    return
  }

  let totalFeedback = 0

  for (const employee of employeesWithManagers) {
    const numFeedback = faker.number.int({ min: 1, max: 3 })
    const deelEmployee = employee.deelEmployee
    const managerDeelEmployee = deelEmployee?.manager

    if (
      !deelEmployee ||
      !managerDeelEmployee ||
      !managerDeelEmployee.employee
    ) {
      continue
    }

    const startDate = deelEmployee.startDate

    for (let i = 0; i < numFeedback; i++) {
      const title = faker.helpers.arrayElement(CHECK_IN_TITLES)

      const daysSinceStart = faker.number.int({ min: 30, max: 365 })
      const timestamp = new Date(startDate)
      timestamp.setDate(timestamp.getDate() + daysSinceStart)

      await prisma.keeperTestFeedback.create({
        data: {
          title,
          employeeId: employee.id,
          managerId: managerDeelEmployee.employee.id,
          wouldYouTryToKeepThem: randomEnum(KeeperTestRating),
          whatMakesThemValuable: faker.lorem.paragraph(),
          driverOrPassenger: randomEnum(KeeperTestRating),
          proactiveToday: randomEnum(KeeperTestRating),
          optimisticByDefault: randomEnum(KeeperTestRating),
          areasToWatch: faker.lorem.paragraph(),
          recommendation: faker.datatype.boolean(0.8)
            ? randomEnum(KeeperTestRecommendation)
            : null,
          sharedWithTeamMember: faker.datatype.boolean(),
          timestamp,
        },
      })

      totalFeedback++
    }
  }

  console.log(`Generated ${totalFeedback} keeper test feedback records.`)
}

async function generateAshbyInterviewScores(
  _employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating Ashby interview scores...')

  const employeesWithPersonalEmail = await prisma.employee.findMany({
    where: {
      deelEmployee: {
        personalEmail: { not: null },
      },
    },
    include: {
      deelEmployee: true,
    },
  })

  if (employeesWithPersonalEmail.length === 0) {
    console.log(
      'No employees with personalEmail found, skipping Ashby interview scores.',
    )
    return
  }

  const interviewerCandidates = await prisma.employee.findMany({
    take: 30,
  })

  let totalScores = 0

  for (const employee of employeesWithPersonalEmail) {
    const numScores = faker.number.int({ min: 2, max: 5 })
    const startDate = employee.deelEmployee?.startDate || generatePastDate(365)

    for (let i = 0; i < numScores; i++) {
      const interviewerCandidatesFiltered = interviewerCandidates.filter(
        (e) => e.id !== employee.id,
      )

      if (interviewerCandidatesFiltered.length === 0) {
        continue
      }

      const interviewer = faker.helpers.arrayElement(
        interviewerCandidatesFiltered,
      )

      const daysBeforeStart = faker.number.int({ min: 30, max: 180 })
      const createdAt = new Date(startDate)
      createdAt.setDate(createdAt.getDate() - daysBeforeStart)

      await prisma.ashbyInterviewScore.create({
        data: {
          employeeId: employee.id,
          interviewerId: interviewer.id,
          rating: faker.number.int({ min: 1, max: 4 }),
          feedback: faker.lorem.paragraphs(
            faker.number.int({ min: 1, max: 3 }),
          ),
          interviewName: faker.helpers.arrayElement(INTERVIEW_NAMES),
          createdAt,
        },
      })

      totalScores++
    }
  }

  console.log(`Generated ${totalScores} Ashby interview scores.`)
}

async function generateCommissionBonuses(
  _employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating commission bonuses...')

  const employeesWithBonuses = await prisma.employee.findMany({
    include: {
      salaries: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      },
    },
    where: {
      salaries: {
        some: {
          bonusAmount: { gt: 0 },
        },
      },
    },
  })

  if (employeesWithBonuses.length === 0) {
    console.log(
      'No employees with bonus amounts found, skipping commission bonuses.',
    )
    return
  }

  const quarters: string[] = []
  const currentYear = new Date().getFullYear()
  for (let year = currentYear - 2; year <= currentYear; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      quarters.push(`${year}-Q${quarter}`)
    }
  }

  let totalBonuses = 0

  for (const employee of employeesWithBonuses) {
    const latestSalary = employee.salaries[0]
    if (!latestSalary || latestSalary.bonusAmount <= 0) {
      continue
    }

    const numBonuses = faker.number.int({ min: 1, max: 4 })
    const selectedQuarters = faker.helpers.arrayElements(
      quarters,
      Math.min(numBonuses, quarters.length),
    )

    for (const quarter of selectedQuarters) {
      const existing = await prisma.commissionBonus.findUnique({
        where: {
          employeeId_quarter: {
            employeeId: employee.id,
            quarter,
          },
        },
      })

      if (existing) {
        continue
      }

      const quota = faker.number.float({
        min: 50000,
        max: 500000,
        fractionDigits: 2,
      })
      const attainment = faker.number.float({
        min: quota * 0.5,
        max: quota * 1.5,
        fractionDigits: 2,
      })
      const calculatedAmount = (attainment / quota) * latestSalary.bonusAmount
      const calculatedAmountLocal = calculatedAmount * latestSalary.exchangeRate

      await prisma.commissionBonus.create({
        data: {
          employeeId: employee.id,
          quarter,
          quota,
          attainment,
          bonusAmount: latestSalary.bonusAmount,
          calculatedAmount,
          exchangeRate: latestSalary.exchangeRate,
          localCurrency: latestSalary.localCurrency,
          calculatedAmountLocal,
          communicated: faker.datatype.boolean(0.7),
          synced: faker.datatype.boolean(0.5),
          createdAt: faker.date.past(),
        },
      })

      totalBonuses++
    }
  }

  console.log(`Generated ${totalBonuses} commission bonuses.`)
}

async function generateDemoData() {
  const config = parseArgs()

  if (config.seed !== undefined) {
    faker.seed(config.seed)
    console.log(`Using seed: ${config.seed}`)
  }

  console.log(`Generating demo data for ${config.numEmployees} employees...`)
  console.log(`Clear existing data: ${config.clearExisting}`)
  console.log('')

  try {
    if (config.clearExisting) {
      await clearExistingData()
      console.log('')
    }

    const devEmployee = await generateDevUser()
    console.log('')

    const randomEmployees = await generateEmployees(config.numEmployees)
    const employees = [devEmployee, ...randomEmployees]
    console.log('')

    await generateDeelEmployees(randomEmployees)
    console.log('')

    await generateSalaries(randomEmployees)
    console.log('')

    await generateOptionGrants(employees)
    console.log('')

    await generateProposedHires(employees)
    console.log('')

    await generateKeeperTestFeedback(employees)
    console.log('')

    await generateAshbyInterviewScores(employees)
    console.log('')

    await generateCommissionBonuses(employees)
    console.log('')

    const summary = {
      employees: await prisma.employee.count(),
      deelEmployees: await prisma.deelEmployee.count(),
      salaries: await prisma.salary.count(),
      optionGrants: await prisma.cartaOptionGrant.count(),
      proposedHires: await prisma.proposedHire.count(),
      keeperTestFeedback: await prisma.keeperTestFeedback.count(),
      ashbyInterviewScores: await prisma.ashbyInterviewScore.count(),
      commissionBonuses: await prisma.commissionBonus.count(),
    }

    console.log('=== Generation Complete ===')
    console.log('Summary:')
    console.log(`  Employees: ${summary.employees}`)
    console.log(`  DeelEmployees: ${summary.deelEmployees}`)
    console.log(`  Salaries: ${summary.salaries}`)
    console.log(`  Option Grants: ${summary.optionGrants}`)
    console.log(`  Proposed Hires: ${summary.proposedHires}`)
    console.log(`  Keeper Test Feedback: ${summary.keeperTestFeedback}`)
    console.log(`  Ashby Interview Scores: ${summary.ashbyInterviewScores}`)
    console.log(`  Commission Bonuses: ${summary.commissionBonuses}`)
  } catch (error) {
    console.error('Error generating demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

generateDemoData()
  .then(() => {
    console.log('')
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
