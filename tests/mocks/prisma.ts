import { vi } from 'vitest'

function createModelMock() {
  return {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    aggregate: vi.fn(),
  }
}

const mockPrisma = {
  employee: createModelMock(),
  deelEmployee: createModelMock(),
  salary: createModelMock(),
  salaryDraft: createModelMock(),
  proposedHire: createModelMock(),
  cartaOptionGrant: createModelMock(),
  keeperTestFeedback: createModelMock(),
  commissionBonus: createModelMock(),
  ashbyInterviewScore: createModelMock(),
  performanceProgram: createModelMock(),
  performanceProgramChecklistItem: createModelMock(),
  performanceProgramFeedback: createModelMock(),
  file: createModelMock(),
  auditLog: createModelMock(),
  onboardingRecord: createModelMock(),
  cyclotronJob: createModelMock(),
  agentConversation: createModelMock(),
  agentMessage: createModelMock(),
  processDocument: createModelMock(),
  payrollScenario: createModelMock(),
  user: createModelMock(),
  session: createModelMock(),
  account: createModelMock(),
  verification: createModelMock(),
  $transaction: vi.fn((fn: unknown) =>
    typeof fn === 'function' ? fn(mockPrisma) : Promise.resolve(fn),
  ),
}

vi.mock('@/db', () => ({ default: mockPrisma }))

export default mockPrisma
