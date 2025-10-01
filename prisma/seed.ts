import { PrismaClient, Prisma } from "../generated/prisma/client.js";

const prisma = new PrismaClient();

const employeeData: Prisma.EmployeeCreateInput[] = [
  {
    name: "Max AI",
    priority: "high",
    reviewer: "Mother of Hedgehogs",
    reviewd: false,
    salaries: {
      create: [
        {
          timestamp: new Date('2025-01-01'),
          locationFactor: 1.0,
          level: 1.0,
          step: 1.1,
          benchmark: 100000,
          totalSalary: 110000,
          changePercentage: 0.1,
          changeAmount: 10000,
          exchangeRate: 1.0,
          totalSalaryLocal: 110000,
          amountTakenInOptions: 0,
          actualSalary: 110000,
          actualSalaryLocal: 110000,
          notes: "He is very spikey",
        },
        {
          timestamp: new Date('2024-01-01'),
          locationFactor: 1.0,
          level: 1.0,
          step: 1.0,
          benchmark: 100000,
          totalSalary: 100000,
          changePercentage: 0.0,
          changeAmount: 0,
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