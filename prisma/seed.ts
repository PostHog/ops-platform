import { PrismaClient, Prisma } from "../generated/prisma/client.js";

const prisma = new PrismaClient();

const employeeData: Prisma.EmployeeCreateInput[] = [
  {
    priority: "high",
    reviewed: false,
    email: "max@posthog.com",
    salaries: {
      create: [
        {
          timestamp: new Date('2025-01-01'),
          country: "United States",
          area: "Connecticut",
          locationFactor: 1.0,
          level: 1.0,
          step: 1.1,
          benchmark: "Product Engineer",
          benchmarkFactor: 1.0,
          totalSalary: 110000,
          changePercentage: 0.1,
          changeAmount: 10000,
          localCurrency: "USD",
          exchangeRate: 1.0,
          totalSalaryLocal: 110000,
          amountTakenInOptions: 0,
          actualSalary: 110000,
          actualSalaryLocal: 110000,
          notes: "He is very spikey",
        },
        {
          timestamp: new Date('2024-01-01'),
          country: "United States",
          area: "Connecticut",
          locationFactor: 1.0,
          level: 1.0,
          step: 1.0,
          benchmark: "Product Engineer",
          benchmarkFactor: 1.0,
          totalSalary: 100000,
          changePercentage: 0.0,
          changeAmount: 0,
          localCurrency: "USD",
          exchangeRate: 1.0,
          totalSalaryLocal: 100000,
          amountTakenInOptions: 0,
          actualSalary: 100000,
          actualSalaryLocal: 100000,
          notes: "He just joined the company",
        },
      ],
    },
  },
  {
    priority: "high",
    reviewed: false,
    email: 'alice@posthog.com',
    salaries: {
      create: [
        {
          timestamp: new Date('2024-01-01'),
          country: "Germany",
          area: "Cologne/Dusseldorf",
          locationFactor: 0.6,
          level: 0.59,
          step: 0.85,
          benchmark: "Product Engineer",
          benchmarkFactor: 243000,
          totalSalary: 73118.7,
          changePercentage: 0.0,
          changeAmount: 0,
          localCurrency: "EUR",
          exchangeRate: 0.879,
          totalSalaryLocal: 64271.33,
          amountTakenInOptions: 0,
          actualSalary: 73118.7,
          actualSalaryLocal: 64271.33,
          notes: "She just joined the company",
        },
      ],
    },
  },
  {
    priority: "low",
    reviewed: false,
    email: 'bob@posthog.com',
    salaries: {
      create: [
        {
          timestamp: new Date('2025-01-01'),
          country: "United Kingdom",
          area: "London, England",
          locationFactor: 0.67,
          level: 0.78,
          step: 0.95,
          benchmark: "Product Engineer",
          benchmarkFactor: 243000,
          totalSalary: 155430,
          changePercentage: 0.1,
          changeAmount: 10000,
          localCurrency: "GBP",
          exchangeRate: 0.879,
          totalSalaryLocal: 136811.97,
          amountTakenInOptions: 0,
          actualSalary: 110000,
          actualSalaryLocal: 110000,
          notes: "He is very spikey",
        },
        {
          timestamp: new Date('2024-01-01'),
          country: "United States",
          area: "Connecticut",
          locationFactor: 1.0,
          level: 1.0,
          step: 1.0,
          benchmark: "Product Engineer",
          benchmarkFactor: 1.0,
          totalSalary: 100000,
          changePercentage: 0.0,
          changeAmount: 0,
          localCurrency: "USD",
          exchangeRate: 1.0,
          totalSalaryLocal: 100000,
          amountTakenInOptions: 0,
          actualSalary: 100000,
          actualSalaryLocal: 100000,
          notes: "He just joined the company",
        },
      ],
    },
  },
];

export async function main() {
  for (const e of employeeData) {
    await prisma.employee.create({ data: e });
  }
}

main();