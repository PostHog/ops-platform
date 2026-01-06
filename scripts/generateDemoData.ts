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

// Helper function to parse command-line arguments
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

// Helper function to get random enum value
function randomEnum<T extends Record<string, string | number>>(
  enumObject: T,
): T[keyof T] {
  const values = Object.values(enumObject)
  return faker.helpers.arrayElement(values) as T[keyof T]
}

// Helper function to generate unique emails
const usedEmails = new Set<string>()
function generateUniqueEmail(): string {
  let email: string
  do {
    email = faker.internet.email().toLowerCase()
  } while (usedEmails.has(email))
  usedEmails.add(email)
  return email
}

// Helper function to generate realistic dates in the past
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

// Stage 1: Clear existing data
async function clearExistingData(): Promise<void> {
  console.log('Clearing existing data...')

  // Delete in reverse dependency order
  await prisma.commissionBonus.deleteMany()
  await prisma.ashbyInterviewScore.deleteMany()
  await prisma.keeperTestFeedback.deleteMany()
  await prisma.proposedHire.deleteMany()
  await prisma.salary.deleteMany()
  await prisma.deelEmployee.deleteMany()
  await prisma.employee.deleteMany()

  console.log('Existing data cleared.')
}

// Stage 2: Generate Employees
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

// Stage 2: Generate DeelEmployees with manager hierarchies
async function generateDeelEmployees(
  employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log(`Generating DeelEmployees for ${employees.length} employees...`)

  const deelEmployees = []
  const titles = Object.keys(sfBenchmark)

  // First, create all DeelEmployees without manager relationships
  for (const employee of employees) {
    const startDate = generatePastDate(faker.number.int({ min: 30, max: 1000 }))
    const team = faker.helpers.arrayElement(VALID_TEAMS)
    // All exec employees should have title "Cofounder" to connect to root-node
    const title =
      team === 'Exec' ? 'Cofounder' : faker.helpers.arrayElement(titles)

    const deelEmployee = await prisma.deelEmployee.create({
      data: {
        id: faker.string.uuid(),
        name: faker.person.fullName(),
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

  // Now set up manager hierarchies
  // Structure: Exec team -> Team leads -> Regular employees

  // Step 1: Identify exec employees (they are top-level)
  const execEmployees = deelEmployees.filter((de) => de.team === 'Exec')

  // Step 2: For each non-exec team, identify team leads (first employee in each team)
  const teamLeads: typeof deelEmployees = []
  const regularEmployees: typeof deelEmployees = []

  for (const team of VALID_TEAMS) {
    if (team === 'Exec') continue

    const teamMembers = deelEmployees.filter((de) => de.team === team)
    if (teamMembers.length > 0) {
      // First employee in each team is the team lead
      teamLeads.push(teamMembers[0])
      regularEmployees.push(...teamMembers.slice(1))
    }
  }

  // Step 3: Assign team leads to report to exec employees
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

    // Update the team lead object
    teamLead.managerId = execManager.id
    teamLead.topLevelManagerId = execManager.id
  }

  // Step 4: Assign regular employees to report to their team leads
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

    // Update the employee object
    employee.managerId = teamLead.id
    employee.topLevelManagerId = topLevelManager.id
  }

  console.log(
    `Generated ${deelEmployees.length} DeelEmployees with manager hierarchies.`,
  )
  return deelEmployees
}

// Stage 3: Generate Salary History
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

    // Get employee's start date from DeelEmployee if available
    const deelEmployee = await prisma.deelEmployee.findUnique({
      where: { workEmail: employee.email },
    })
    const startDate = deelEmployee?.startDate || generatePastDate(365)

    // Generate base salary (starting point)
    let baseSalary = faker.number.float({
      min: 50000,
      max: 300000,
      fractionDigits: 2,
    })
    const country = faker.helpers.arrayElement(countries)
    const areasForCountry = getAreasByCountry(country)
    const area = faker.helpers.arrayElement(areasForCountry)

    // Find the location factor entry to get currency
    const locationEntry = locationFactor.find(
      (loc) => loc.country === country && loc.area === area,
    )
    const localCurrency = locationEntry?.currency || 'USD'
    const locationFactorValue = locationEntry?.locationFactor || 1

    // Get exchange rate from currencyData
    const exchangeRate = currencyData[localCurrency] || 1

    for (let i = 0; i < numSalaries; i++) {
      // First salary is the base, subsequent ones have increases
      if (i > 0) {
        // Increase by 0-20% for raises
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
      // Use the locationFactor from the location entry
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

      // Calculate change from previous salary
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

// Stage 4: Generate Proposed Hires
async function generateProposedHires(
  employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating proposed hires...')

  const numProposedHires = faker.number.int({ min: 5, max: 15 })
  const proposedHireTitles = Object.keys(sfBenchmark)

  // Get employees that can be managers (those with DeelEmployees)
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

// Stage 5: Generate Keeper Test Feedback
async function generateKeeperTestFeedback(
  _employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating keeper test feedback...')

  // Get employees with managers (those that have DeelEmployees with managers)
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

      // Generate timestamp after start date
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

// Stage 6: Generate Ashby Interview Scores
async function generateAshbyInterviewScores(
  _employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating Ashby interview scores...')

  // Get employees with personalEmail (for realism)
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

  // Get all employees that can be interviewers
  const interviewerCandidates = await prisma.employee.findMany({
    take: 30,
  })

  let totalScores = 0

  for (const employee of employeesWithPersonalEmail) {
    const numScores = faker.number.int({ min: 2, max: 5 })
    const startDate = employee.deelEmployee?.startDate || generatePastDate(365)

    for (let i = 0; i < numScores; i++) {
      // Interviewers should be different from interviewee
      const interviewerCandidatesFiltered = interviewerCandidates.filter(
        (e) => e.id !== employee.id,
      )

      if (interviewerCandidatesFiltered.length === 0) {
        continue
      }

      const interviewer = faker.helpers.arrayElement(
        interviewerCandidatesFiltered,
      )

      // Interviews typically happen before start date
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

// Stage 7: Generate Commission Bonuses
async function generateCommissionBonuses(
  _employees: Awaited<ReturnType<typeof generateEmployees>>,
) {
  console.log('Generating commission bonuses...')

  // Get employees with bonusAmount > 0 in their latest salary
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

  // Generate quarters for the past 2 years
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
      // Check if bonus already exists for this employee/quarter
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

// Main function
async function generateDemoData() {
  const config = parseArgs()

  // Initialize faker with seed if provided
  if (config.seed !== undefined) {
    faker.seed(config.seed)
    console.log(`Using seed: ${config.seed}`)
  }

  console.log(`Generating demo data for ${config.numEmployees} employees...`)
  console.log(`Clear existing data: ${config.clearExisting}`)
  console.log('')

  try {
    // Clear existing data if requested
    if (config.clearExisting) {
      await clearExistingData()
      console.log('')
    }

    // Generate data in dependency order
    const employees = await generateEmployees(config.numEmployees)
    console.log('')

    await generateDeelEmployees(employees)
    console.log('')

    await generateSalaries(employees)
    console.log('')

    await generateProposedHires(employees)
    console.log('')

    await generateKeeperTestFeedback(employees)
    console.log('')

    await generateAshbyInterviewScores(employees)
    console.log('')

    await generateCommissionBonuses(employees)
    console.log('')

    // Print summary
    const summary = {
      employees: await prisma.employee.count(),
      deelEmployees: await prisma.deelEmployee.count(),
      salaries: await prisma.salary.count(),
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

// Run the script
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
