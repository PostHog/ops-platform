import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useAtom } from 'jotai'
import {
  AlertCircle,
  ArrowLeft,
  ChevronsLeftRight,
  ChevronsRightLeft,
  Search,
  Check,
  MoreVertical,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createToast } from 'vercel-toast'
import { useQuery } from '@tanstack/react-query'
import { useLocalStorage } from 'usehooks-ts'
import { months } from './employees'
import 'vercel-toast/dist/vercel-toast.css'
import type { ColumnDef } from '@tanstack/react-table'
import type { Prisma, Salary } from '@prisma/client'
import { reviewQueueAtom } from '@/atoms'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SalaryHistoryCard } from '@/components/SalaryHistoryCard'
import { FeedbackCard } from '@/components/FeedbackCard'
import { PerformanceProgramTimelineCard } from '@/components/PerformanceProgramTimelineCard'
import { CommissionBonusTimelineCard } from '@/components/CommissionBonusTimelineCard'
import { AshbyInterviewScoreTimelineCard } from '@/components/AshbyInterviewScoreTimelineCard'
import {
  bonusPercentage,
  locationFactor,
  sfBenchmark,
  cn,
  getFullName,
} from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import prisma from '@/db'
import { createAdminFn, createInternalFn } from '@/lib/auth-middleware'
import { useSession } from '@/lib/auth-client'
import { ROLES } from '@/lib/consts'
import { NewSalaryForm } from '@/components/NewSalaryForm'
import { ManagerHierarchyTree } from '@/components/ManagerHierarchyTree'
import type { HierarchyNode } from '@/lib/types'
import { getDeelEmployeesAndProposedHires } from './org-chart'
import { PerformanceProgramPanel } from '@/components/PerformanceProgramPanel'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export const Route = createFileRoute('/employee/$employeeId')({
  component: EmployeeOverview,
  loader: async ({ params }) =>
    await getEmployeeById({ data: { employeeId: params.employeeId } }),
})

const getEmployeeById = createInternalFn({
  method: 'GET',
})
  .inputValidator((d: { employeeId: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo
    const isManager = !isAdmin && managedEmployeeIds.includes(data.employeeId)

    const employee = await prisma.employee.findUnique({
      where: {
        id: data.employeeId,
        ...(!isAdmin && !isManager ? { email: context.user.email } : {}),
      },
      select: {
        id: true,
        email: true,
        // Admin-only fields
        ...(isAdmin ? { priority: true, reviewed: true } : {}),
        // Keeper tests: available to admin and managers
        // Managers only see tests from the last 12 months
        ...(isAdmin || isManager
          ? {
              keeperTestFeedback: {
                ...(isManager
                  ? {
                      where: {
                        timestamp: {
                          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 12 months ago
                        },
                      },
                    }
                  : {}),
                orderBy: {
                  timestamp: 'desc',
                },
                include: {
                  manager: {
                    include: {
                      deelEmployee: true,
                    },
                  },
                },
              },
            }
          : {}),
        // Performance programs: admin and managers (not visible to employees viewing their own profile)
        ...(isAdmin || isManager
          ? {
              performancePrograms: {
                ...(isManager
                  ? {
                      where: {
                        employeeId: {
                          in: context.managerInfo.managedEmployeeIds,
                        },
                      },
                    }
                  : {}),
                include: {
                  checklistItems: {
                    include: {
                      files: true,
                      completedBy: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                      assignedTo: {
                        select: {
                          id: true,
                          email: true,
                          deelEmployee: {
                            select: {
                              firstName: true,
                              lastName: true,
                            },
                          },
                        },
                      },
                    },
                    orderBy: {
                      createdAt: 'asc',
                    },
                  },
                  feedback: {
                    orderBy: {
                      createdAt: 'desc',
                    },
                    include: {
                      givenBy: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                      files: true,
                    },
                  },
                  startedBy: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
                orderBy: {
                  startedAt: 'desc',
                },
              },
            }
          : {}),
        salaries: {
          orderBy: {
            timestamp: 'desc',
          },
          ...(isAdmin
            ? {}
            : isManager
              ? {
                  take: 0, // Return empty for managers
                }
              : {
                  select: {
                    id: true,
                    timestamp: true,
                    country: true,
                    area: true,
                    locationFactor: true,
                    level: true,
                    step: true,
                    bonusPercentage: true,
                    bonusAmount: true,
                    benchmark: true,
                    benchmarkFactor: true,
                    totalSalary: true,
                    changePercentage: true,
                    changeAmount: true,
                    exchangeRate: true,
                    localCurrency: true,
                    totalSalaryLocal: true,
                    amountTakenInOptions: true,
                    actualSalary: true,
                    actualSalaryLocal: true,
                  },
                  where: {
                    OR: [
                      {
                        communicated: true,
                      },
                      {
                        timestamp: {
                          lte: new Date(
                            new Date().setDate(new Date().getDate() - 30),
                          ),
                        },
                      },
                    ],
                  },
                }),
        },
        // Commission bonuses: visible to admin, managers (last 12 months), and employees (their own)
        commissionBonuses: {
          ...(isManager && !isAdmin
            ? {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 12 months ago
                  },
                },
              }
            : {}),
          orderBy: {
            createdAt: 'desc',
          },
        },
        // Interview scores: visible to admin and managers, but not to employees themselves
        ...(isAdmin || isManager
          ? {
              ashbyInterviewScoresReceived: {
                ...(isManager
                  ? {
                      where: {
                        createdAt: {
                          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 12 months ago
                        },
                      },
                    }
                  : {}),
                include: {
                  interviewer: {
                    select: {
                      id: true,
                      email: true,
                      deelEmployee: {
                        select: {
                          firstName: true,
                          lastName: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            }
          : {}),
        deelEmployee: {
          include: {
            topLevelManager: true,
          },
        },
      },
    })

    if (!isAdmin && !isManager && employee?.email !== context.user.email) {
      throw new Error('Unauthorized')
    }

    return employee
  })

type Employee = Prisma.EmployeeGetPayload<{
  include: {
    salaries: {
      orderBy: {
        timestamp: 'desc'
      }
    }
    deelEmployee: {
      include: {
        topLevelManager: true
      }
    }
    keeperTestFeedback: {
      include: {
        manager: {
          include: {
            deelEmployee: true
          }
        }
      }
    }
    performancePrograms: {
      include: {
        checklistItems: {
          include: {
            files: true
            completedBy: {
              select: {
                id: true
                name: true
                email: true
              }
            }
            assignedTo: {
              select: {
                id: true
                name: true
                workEmail: true
              }
            }
          }
        }
        feedback: {
          include: {
            givenBy: {
              select: {
                id: true
                name: true
                email: true
              }
            }
          }
        }
        startedBy: {
          select: {
            id: true
            name: true
            email: true
          }
        }
      }
    }
    commissionBonuses: {
      orderBy: {
        createdAt: 'desc'
      }
    }
    ashbyInterviewScoresReceived: {
      include: {
        interviewer: {
          select: {
            id: true
            email: true
            deelEmployee: {
              select: {
                firstName: true
                lastName: true
              }
            }
          }
        }
      }
      orderBy: {
        createdAt: 'desc'
      }
    }
  }
}>

export const getReferenceEmployees = createAdminFn({
  method: 'GET',
})
  .inputValidator(
    (d: {
      level: number
      step: number
      benchmark: string
      filterByLevel?: boolean
      filterByExec?: boolean
      filterByTitle?: boolean
      topLevelManagerId?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    const whereClause: Prisma.EmployeeWhereInput = {
      salaries: {
        some: {
          ...(data.filterByLevel !== false ? { level: data.level } : {}),
          ...(data.filterByTitle !== false
            ? { benchmark: data.benchmark }
            : {}),
        },
      },
      deelEmployee: {
        ...(data.filterByExec && data.topLevelManagerId
          ? {
              topLevelManagerId: data.topLevelManagerId,
            }
          : {
              isNot: null,
            }),
      },
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        salaries: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        deelEmployee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return employees
      .filter(
        (employee) =>
          (data.filterByLevel !== false
            ? employee.salaries[0]?.level === data.level
            : true) &&
          (data.filterByTitle !== false
            ? employee.salaries[0]?.benchmark === data.benchmark
            : true),
      )
      .map((employee) => ({
        id: employee.id,
        name: getFullName(
          employee.deelEmployee?.firstName,
          employee.deelEmployee?.lastName,
          employee.email,
        ),
        level: employee.salaries[0]?.level,
        step: employee.salaries[0]?.step,
        locationFactor: employee.salaries[0]?.locationFactor ?? 1,
        location:
          employee.salaries[0]?.country + ', ' + employee.salaries[0]?.area,
        salary: employee.salaries[0]?.totalSalary ?? 0,
      }))
      .sort((a, b) => a.step * a.level - b.step * b.level)
  })

export const getDeelEmployees = createInternalFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.deelEmployee.findMany({
    orderBy: {
      lastName: 'asc',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      workEmail: true,
    },
  })
})

export const updateSalary = createAdminFn({
  method: 'POST',
})
  .inputValidator(
    (
      d: Omit<
        Salary,
        'id' | 'timestamp' | 'communicated' | 'synced' | 'equityRefreshGranted'
      >,
    ) => d,
  )
  .handler(async ({ data }) => {
    // Create the salary entry
    const salary = await prisma.salary.create({
      data: {
        ...data,
      },
    })

    // Update the employee's reviewed status to true
    await prisma.employee.update({
      where: { id: data.employeeId },
      data: { reviewed: true },
    })

    return salary
  })

export const deleteSalary = createAdminFn({
  method: 'POST',
})
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const existingSalary = await prisma.salary.findUnique({
      where: { id: data.id },
    })

    if (!existingSalary) {
      throw new Error('Salary not found')
    }

    const hoursSinceCreation =
      (Date.now() - existingSalary.timestamp.getTime()) / (1000 * 60 * 60)
    if (hoursSinceCreation > 24) {
      throw new Error('Cannot delete salary after 24 hours')
    }

    await prisma.salary.delete({
      where: { id: data.id },
    })

    return { success: true }
  })

export const createPerformanceProgram = createInternalFn({
  method: 'POST',
})
  .inputValidator((d: { employeeId: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo
    const isManager = !isAdmin && managedEmployeeIds.includes(data.employeeId)

    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }
    const existingProgram = await prisma.performanceProgram.findFirst({
      where: {
        employeeId: data.employeeId,
        status: 'ACTIVE',
      },
    })

    if (existingProgram) {
      throw new Error('Employee already has an active performance program')
    }

    // Get the employee's manager
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: {
        deelEmployee: {
          select: {
            managerId: true,
          },
        },
      },
    })

    if (!employee?.deelEmployee?.managerId) {
      throw new Error('Manager not found')
    }

    const managerEmployee = await prisma.deelEmployee.findUnique({
      where: {
        id: employee?.deelEmployee?.managerId,
      },
      include: {
        employee: {
          select: {
            id: true,
          },
        },
      },
    })

    const managerId = managerEmployee?.employee?.id

    if (!managerId) {
      throw new Error('Manager employee not found')
    }

    // Create program with initial checklist items
    const now = new Date()
    const slackDueDate = new Date(now)
    slackDueDate.setDate(now.getDate() + 5)
    const emailDueDate = new Date(now)
    emailDueDate.setDate(now.getDate() + 7)

    const program = await prisma.performanceProgram.create({
      data: {
        employeeId: data.employeeId,
        startedByUserId: context.user.id,
        checklistItems: {
          create: [
            {
              type: 'SLACK_FEEDBACK_MEETING',
              assignedToEmployeeId: managerId,
              dueDate: slackDueDate,
            },
            {
              type: 'EMAIL_FEEDBACK_MEETING',
              assignedToEmployeeId: managerId,
              dueDate: emailDueDate,
            },
          ],
        },
      },
      include: {
        checklistItems: {
          include: {
            files: true,
            completedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                email: true,
                deelEmployee: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        feedback: {
          include: {
            givenBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            files: true,
          },
        },
        startedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return program
  })

export const updateChecklistItem = createInternalFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      checklistItemId: string
      completed: boolean
      notes?: string
      assignedToEmployeeId?: string | null
      dueDate?: string | null
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    const checklistItem =
      await prisma.performanceProgramChecklistItem.findUnique({
        where: { id: data.checklistItemId },
        include: {
          program: true,
        },
      })

    if (!checklistItem) {
      throw new Error('Checklist item not found')
    }

    // Check authorization: admins can update any checklist item, managers can only update items for their reports
    const isManager =
      !isAdmin && managedEmployeeIds.includes(checklistItem.program.employeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    const updated = await prisma.performanceProgramChecklistItem.update({
      where: { id: data.checklistItemId },
      data: {
        completed: data.completed,
        completedAt: data.completed ? new Date() : null,
        completedByUserId: data.completed ? context.user.id : null,
        notes: data.notes,
        assignedToEmployeeId: data.assignedToEmployeeId,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        files: true,
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            deelEmployee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    return updated
  })

export const addProgramFeedback = createInternalFn({
  method: 'POST',
})
  .inputValidator((d: { programId: string; feedback: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    const program = await prisma.performanceProgram.findUnique({
      where: { id: data.programId },
    })

    if (!program) {
      throw new Error('Performance program not found')
    }

    // Check authorization: admins can add feedback to any program, managers can only add feedback to programs for their reports
    const isManager =
      !isAdmin && managedEmployeeIds.includes(program.employeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    const feedback = await prisma.performanceProgramFeedback.create({
      data: {
        programId: data.programId,
        feedback: data.feedback,
        givenByUserId: context.user.id,
      },
      include: {
        givenBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: true,
      },
    })

    return feedback
  })

export const resolvePerformanceProgram = createInternalFn({
  method: 'POST',
})
  .inputValidator((d: { programId: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    const program = await prisma.performanceProgram.findUnique({
      where: { id: data.programId },
      include: {
        checklistItems: true,
      },
    })

    if (!program) {
      throw new Error('Performance program not found')
    }

    // Check authorization: admins can resolve any program, managers can only resolve programs for their reports
    const isManager =
      !isAdmin && managedEmployeeIds.includes(program.employeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    if (program.status !== 'ACTIVE') {
      throw new Error('Program is not active')
    }

    // Check if all checklist items are completed
    const allCompleted = program.checklistItems.every((item) => item.completed)

    if (!allCompleted) {
      throw new Error('All checklist items must be completed before resolving')
    }

    const updated = await prisma.performanceProgram.update({
      where: { id: data.programId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
      include: {
        checklistItems: {
          include: {
            files: true,
            completedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        feedback: {
          include: {
            givenBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        startedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return updated
  })

export const getProofFileUploadUrl = createInternalFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      checklistItemId?: string
      programId?: string
      fileName: string
      fileSize: number
      mimeType: string
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    if (!data.checklistItemId && !data.programId) {
      throw new Error('Either checklistItemId or programId must be provided')
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (data.fileSize > maxSize) {
      throw new Error('File size exceeds 10MB limit')
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'text/plain',
    ]
    if (!allowedTypes.includes(data.mimeType)) {
      throw new Error('File type not allowed')
    }

    let programId: string
    let fileKey: string
    let programEmployeeId: string

    if (data.checklistItemId) {
      const checklistItem =
        await prisma.performanceProgramChecklistItem.findUnique({
          where: { id: data.checklistItemId },
          include: {
            program: true,
          },
        })

      if (!checklistItem) {
        throw new Error('Checklist item not found')
      }

      programId = checklistItem.programId
      programEmployeeId = checklistItem.program.employeeId

      // Generate file key for checklist item
      const { generateFileKey } = await import('@/lib/s3')
      fileKey = generateFileKey(programId, data.checklistItemId, data.fileName)
    } else {
      // For feedback files, verify program exists
      const program = await prisma.performanceProgram.findUnique({
        where: { id: data.programId! },
      })

      if (!program) {
        throw new Error('Performance program not found')
      }

      programId = data.programId!
      programEmployeeId = program.employeeId

      // Generate file key for feedback
      const sanitizedFileName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const timestamp = Date.now()
      fileKey = `performance-programs/${programId}/feedback/${timestamp}-${sanitizedFileName}`
    }

    // Check authorization: admins can upload files for any program, managers can only upload files for programs for their reports
    const isManager = !isAdmin && managedEmployeeIds.includes(programEmployeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    // Generate presigned upload URL
    const { getPresignedUploadUrl } = await import('@/lib/s3')
    const uploadUrl = await getPresignedUploadUrl(
      fileKey,
      data.mimeType,
      3600, // 1 hour
    )

    return {
      uploadUrl,
      fileKey,
    }
  })

export const createProofFileRecord = createInternalFn({
  method: 'POST',
})
  .inputValidator(
    (d: {
      checklistItemId?: string
      feedbackId?: string
      fileName: string
      fileSize: number
      mimeType: string
      fileKey: string
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    if (!data.checklistItemId && !data.feedbackId) {
      throw new Error('Either checklistItemId or feedbackId must be provided')
    }

    // Get the program to check authorization
    let programEmployeeId: string
    if (data.checklistItemId) {
      const checklistItem =
        await prisma.performanceProgramChecklistItem.findUnique({
          where: { id: data.checklistItemId },
          include: { program: true },
        })
      if (!checklistItem) {
        throw new Error('Checklist item not found')
      }
      programEmployeeId = checklistItem.program.employeeId
    } else {
      const feedback = await prisma.performanceProgramFeedback.findUnique({
        where: { id: data.feedbackId! },
        include: { program: true },
      })
      if (!feedback) {
        throw new Error('Feedback not found')
      }
      programEmployeeId = feedback.program.employeeId
    }

    // Check authorization: admins can create file records for any program, managers can only create records for programs for their reports
    const isManager = !isAdmin && managedEmployeeIds.includes(programEmployeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    // Create database record
    const proofFile = await prisma.file.create({
      data: {
        checklistItemId: data.checklistItemId || null,
        feedbackId: data.feedbackId || null,
        fileName: data.fileName,
        fileUrl: data.fileKey, // Store the S3 key
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedByUserId: context.user.id,
      },
    })

    return proofFile
  })

export const getProofFileUrl = createInternalFn({
  method: 'GET',
})
  .inputValidator((d: { proofFileId: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    const proofFile = await prisma.file.findUnique({
      where: { id: data.proofFileId },
      include: {
        checklistItem: {
          include: { program: true },
        },
        feedback: {
          include: { program: true },
        },
      },
    })

    if (!proofFile) {
      throw new Error('Proof file not found')
    }

    // Get the program employee ID
    const programEmployeeId = proofFile.checklistItem
      ? proofFile.checklistItem.program.employeeId
      : proofFile.feedback
        ? proofFile.feedback.program.employeeId
        : null

    if (!programEmployeeId) {
      throw new Error('Unable to determine program employee')
    }

    // Check authorization: admins can get file URLs for any program, managers can only get URLs for programs for their reports
    const isManager = !isAdmin && managedEmployeeIds.includes(programEmployeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    // Generate presigned download URL
    const { getPresignedDownloadUrl } = await import('@/lib/s3')
    const url = await getPresignedDownloadUrl(proofFile.fileUrl, 3600) // 1 hour

    return { url, fileName: proofFile.fileName }
  })

export const deleteProofFile = createInternalFn({
  method: 'POST',
})
  .inputValidator((d: { proofFileId: string }) => d)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user.role === ROLES.ADMIN
    const { managedEmployeeIds } = context.managerInfo

    const proofFile = await prisma.file.findUnique({
      where: { id: data.proofFileId },
      include: {
        checklistItem: {
          include: { program: true },
        },
        feedback: {
          include: { program: true },
        },
      },
    })

    if (!proofFile) {
      throw new Error('Proof file not found')
    }

    // Get the program employee ID
    const programEmployeeId = proofFile.checklistItem
      ? proofFile.checklistItem.program.employeeId
      : proofFile.feedback
        ? proofFile.feedback.program.employeeId
        : null

    if (!programEmployeeId) {
      throw new Error('Unable to determine program employee')
    }

    // Check authorization: admins can delete files for any program, managers can only delete files for programs for their reports
    const isManager = !isAdmin && managedEmployeeIds.includes(programEmployeeId)
    if (!isAdmin && !isManager) {
      throw new Error('Unauthorized')
    }

    // Delete from database (cascade will handle relations)
    await prisma.file.delete({
      where: { id: data.proofFileId },
    })

    // Note: We don't delete from S3 to avoid potential issues
    // The file will remain in S3 but won't be accessible through the app

    return { success: true }
  })

function EmployeeOverview() {
  const { data: session } = useSession()
  const user = session?.user
  const [showNewSalaryForm, setShowNewSalaryForm] = useState(
    user?.role === ROLES.ADMIN,
  )
  const [showOverrideMode, setShowOverrideMode] = useState(false)
  const [showReferenceEmployees, setShowReferenceEmployees] = useState(false)
  const [filterByExec, setFilterByExec] = useState(false)
  const [filterByLevel, setFilterByLevel] = useState(true)
  const [filterByTitle, setFilterByTitle] = useState(true)
  const [expandAll, setExpandAll] = useState<boolean | null>(null)
  const [expandAllCounter, setExpandAllCounter] = useState(0)

  const router = useRouter()
  const employee: Employee = Route.useLoaderData()
  const [reviewQueue, setReviewQueue] = useAtom(reviewQueueAtom)
  const createProgram = useServerFn(createPerformanceProgram)
  const [level, setLevel] = useState(employee.salaries[0]?.level ?? 1)
  const [step, setStep] = useState(employee.salaries[0]?.step ?? 1)
  const [benchmark, setBenchmark] = useState(
    employee.salaries[0]?.benchmark ?? 'Product Engineer',
  )

  const showBonusPercentage =
    employee.salaries.some((salary) => salary.bonusPercentage > 0) ||
    Object.keys(bonusPercentage).includes(benchmark)

  if (!employee) return null

  const handleStartPerformanceProgram = async () => {
    try {
      await createProgram({
        data: {
          employeeId: employee.id,
        },
      })
      createToast('Performance program started', { timeout: 3000 })
      router.invalidate()
    } catch (error) {
      createToast(
        error instanceof Error
          ? error.message
          : 'Failed to start performance program',
        { timeout: 3000 },
      )
    }
  }

  const handleDeleteSalary = async (salaryId: string) => {
    try {
      await deleteSalary({ data: { id: salaryId } })
      createToast('Salary deleted successfully.', {
        timeout: 3000,
      })
      router.invalidate()
    } catch (error) {
      createToast(
        error instanceof Error ? error.message : 'Failed to delete salary.',
        {
          timeout: 3000,
        },
      )
    }
  }

  const { data: referenceEmployees } = useQuery({
    queryKey: [
      'referenceEmployees',
      employee.id,
      level,
      step,
      benchmark,
      filterByExec,
      filterByLevel,
      filterByTitle,
    ],
    queryFn: () =>
      getReferenceEmployees({
        data: {
          level,
          step,
          benchmark,
          filterByExec,
          filterByLevel,
          filterByTitle,
          topLevelManagerId: employee.deelEmployee?.topLevelManagerId ?? null,
        },
      }),
    placeholderData: (prevData, prevQuery) => {
      if (prevQuery?.queryKey[1] === employee.id) return prevData
    },
    enabled: !!level && !!step && !!benchmark && user?.role === ROLES.ADMIN,
  })

  const { data: deelEmployeesAndProposedHiresData } = useQuery({
    queryKey: ['deelEmployeesAndProposedHires'],
    queryFn: () => getDeelEmployeesAndProposedHires(),
  })
  const deelEmployees = deelEmployeesAndProposedHiresData?.employees
  const proposedHires = deelEmployeesAndProposedHiresData?.proposedHires || []
  const managerDeelEmployeeId =
    deelEmployeesAndProposedHiresData?.managerDeelEmployeeId

  // Build hierarchy tree from flat list
  const managerHierarchy = useMemo(() => {
    if (!deelEmployees) return null

    const managerMap = new Map<string, Array<(typeof deelEmployees)[0]>>()
    for (const emp of deelEmployees) {
      if (emp.managerId) {
        const reports = managerMap.get(emp.managerId) || []
        reports.push(emp)
        managerMap.set(emp.managerId, reports)
      }
    }

    // Map proposed hires by manager
    const proposedHiresByManager = new Map<string, typeof proposedHires>()
    proposedHires
      .filter(
        ({ manager, priority }) =>
          manager.deelEmployee && ['low', 'medium', 'high'].includes(priority),
      )
      .forEach((ph) => {
        const managerId = ph.manager.deelEmployee!.id
        if (!proposedHiresByManager.has(managerId)) {
          proposedHiresByManager.set(managerId, [])
        }
        proposedHiresByManager.get(managerId)!.push(ph)
      })

    const buildTree = (
      employee: (typeof deelEmployees)[0],
      visited = new Set<string>(),
    ): HierarchyNode => {
      if (visited.has(employee.id)) {
        return {
          id: employee.id,
          name: getFullName(employee.firstName, employee.lastName),
          title: employee.title,
          team: employee.team,
          employeeId: employee.employee?.id,
          workEmail: employee.workEmail,
          startDate: employee.startDate,
          hasActivePerformanceProgram:
            employee.employee?.performancePrograms &&
            employee.employee.performancePrograms.length > 0,
          children: [],
        }
      }

      visited.add(employee.id)
      const directReports = (managerMap.get(employee.id) || []).sort((a, b) =>
        getFullName(a.firstName, a.lastName).localeCompare(
          getFullName(b.firstName, b.lastName),
        ),
      )

      // Add proposed hires for this manager
      const managerProposedHires = (
        proposedHiresByManager.get(employee.id) || []
      ).map((ph) => ({
        id: `employee-${ph.id}`,
        name: '',
        title: ph.title || '',
        team: ph.manager.deelEmployee!.team || undefined,
        employeeId: undefined,
        workEmail: undefined,
        startDate: null,
        hiringPriority: ph.priority as 'low' | 'medium' | 'high',
        children: [],
      }))

      const reportNodes = directReports.map((child) =>
        buildTree(child, visited),
      )
      const allChildren = [...reportNodes, ...managerProposedHires].sort(
        (a, b) => {
          // Sort: employees first (by name), then proposed hires (by title)
          if (a.name && !b.name) return -1
          if (!a.name && b.name) return 1
          if (a.name && b.name) return a.name.localeCompare(b.name)
          return (a.title || '').localeCompare(b.title || '')
        },
      )

      return {
        id: employee.id,
        name: getFullName(employee.firstName, employee.lastName),
        title: employee.title,
        team: employee.team,
        employeeId: employee.employee?.id,
        workEmail: employee.workEmail,
        startDate: employee.startDate,
        hasActivePerformanceProgram:
          employee.employee?.performancePrograms &&
          employee.employee.performancePrograms.length > 0,
        children: allChildren,
      }
    }

    // For non-admins, start from manager's DeelEmployee
    if (user?.role !== ROLES.ADMIN && managerDeelEmployeeId) {
      const managerEmployee = deelEmployees.find(
        (e) => e.id === managerDeelEmployeeId,
      )
      if (managerEmployee) {
        return buildTree(managerEmployee)
      }
      // Fallback: if manager not found in filtered list, return first employee
      if (deelEmployees.length > 0) {
        return buildTree(deelEmployees[0])
      }
      return null
    }

    // For admins, find top-level managers (Cofounders or employees without managers)
    const topLevelManagers = deelEmployees.filter(
      (e) => e.title === 'Cofounder' || !e.managerId,
    )

    if (topLevelManagers.length === 0) {
      // Fallback: if no top-level managers found, return first employee as root
      if (deelEmployees.length > 0) {
        return buildTree(deelEmployees[0])
      }
      return null
    }

    // Return array of top-level managers (sorted by name)
    const trees = topLevelManagers
      .sort((a, b) =>
        getFullName(a.firstName, a.lastName).localeCompare(
          getFullName(b.firstName, b.lastName),
        ),
      )
      .map((manager) => buildTree(manager))

    // Return single node or array of nodes
    return trees.length === 1 ? trees[0] : trees
  }, [deelEmployees, proposedHires, user?.role, managerDeelEmployeeId])

  // Flatten hierarchy to get all employees for search
  const allHierarchyEmployees = useMemo(() => {
    if (!managerHierarchy) return []
    const flatten = (node: HierarchyNode): Array<HierarchyNode> => {
      return [node, ...node.children.flatMap(flatten)]
    }
    const nodes = Array.isArray(managerHierarchy)
      ? managerHierarchy
      : [managerHierarchy]
    return nodes.flatMap(flatten).filter((n) => n.employeeId)
  }, [managerHierarchy])

  // Get all employee IDs in the manager hierarchy (for filtering in team mode)
  const managerHierarchyEmployeeIds = useMemo(() => {
    // Use the already computed allHierarchyEmployees to get employee IDs
    return new Set(
      allHierarchyEmployees.map((n) => n.employeeId).filter(Boolean),
    )
  }, [allHierarchyEmployees])

  const [searchOpen, setSearchOpen] = useState(false)
  const [managerTreeViewMode, setManagerTreeViewMode] = useLocalStorage<
    'manager' | 'team'
  >('manager-tree.viewMode', 'manager')

  // Filter employees to only those in manager's hierarchy when in team mode for non-admin users
  const filteredDeelEmployees = useMemo(() => {
    if (!deelEmployees) return null
    // For admins, show all employees
    if (user?.role === ROLES.ADMIN) return deelEmployees
    // For team mode, filter to only employees in the manager's hierarchy
    if (managerTreeViewMode === 'team') {
      return deelEmployees.filter((emp) => {
        // Include the manager themselves
        if (emp.id === managerDeelEmployeeId) return true
        // Include only employees that are in the manager hierarchy
        return emp.employee?.id
          ? managerHierarchyEmployeeIds.has(emp.employee.id)
          : false
      })
    }
    // For manager mode, return all (already filtered by manager hierarchy)
    return deelEmployees
  }, [
    deelEmployees,
    user?.role,
    managerTreeViewMode,
    managerDeelEmployeeId,
    managerHierarchyEmployeeIds,
  ])

  // Combine reference employees with current employee (using form values if available)
  const combinedReferenceEmployees = useMemo(() => {
    const refs = referenceEmployees ?? []
    const currentEmployeeRef: ReferenceEmployee = {
      id: employee.id,
      name: getFullName(
        employee.deelEmployee?.firstName,
        employee.deelEmployee?.lastName,
        employee.email,
      ),
      level: level,
      step: step,
      locationFactor: employee.salaries[0]?.locationFactor ?? 1,
      location:
        employee.salaries[0]?.country + ', ' + employee.salaries[0]?.area,
      salary: employee.salaries[0]?.totalSalary ?? 0,
    }

    // Filter out current employee from refs if it exists, then add it back with updated values
    const filteredRefs = refs.filter((ref) => ref.id !== employee.id)
    const combined = [...filteredRefs, currentEmployeeRef]

    // Sort by step
    return combined.sort((a, b) => a.step * a.level - b.step * b.level)
  }, [referenceEmployees, employee, level, step])

  // Combine and sort salary history with feedback and performance programs, grouped by month
  const timelineByMonth = useMemo(() => {
    const salaryItems = employee.salaries.map((salary) => ({
      type: 'salary' as const,
      timestamp: salary.timestamp,
      data: salary,
    }))

    const feedbackItems = (employee.keeperTestFeedback || []).map(
      (feedback) => ({
        type: 'feedback' as const,
        timestamp: feedback.timestamp,
        data: feedback,
      }),
    )

    const performanceProgramItems: Array<{
      type: 'performance-program'
      timestamp: Date
      data: {
        event: 'started' | 'resolved' | 'checklist-completed' | 'feedback'
        program?: any
        checklistItem?: any
        feedback?: any
      }
    }> = []

    if (
      'performancePrograms' in employee &&
      employee.performancePrograms &&
      employee.performancePrograms.length > 0
    ) {
      const programs = employee.performancePrograms
      programs.forEach((program) => {
        // Program start
        performanceProgramItems.push({
          type: 'performance-program',
          timestamp: program.startedAt,
          data: {
            event: 'started',
            program,
          },
        })

        // Program resolution
        if (program.resolvedAt) {
          performanceProgramItems.push({
            type: 'performance-program',
            timestamp: program.resolvedAt,
            data: {
              event: 'resolved',
              program,
            },
          })
        }

        // Checklist item completions
        program.checklistItems.forEach((item) => {
          if (item.completed && item.completedAt) {
            performanceProgramItems.push({
              type: 'performance-program',
              timestamp: item.completedAt,
              data: {
                event: 'checklist-completed',
                program,
                checklistItem: item,
              },
            })
          }
        })

        // Feedback entries
        program.feedback.forEach((feedback) => {
          performanceProgramItems.push({
            type: 'performance-program',
            timestamp: feedback.createdAt,
            data: {
              event: 'feedback',
              program,
              feedback,
            },
          })
        })
      })
    }

    const commissionBonusItems = (
      'commissionBonuses' in employee && employee.commissionBonuses
        ? employee.commissionBonuses
        : []
    ).map((bonus) => ({
      type: 'commission-bonus' as const,
      timestamp: bonus.createdAt,
      data: bonus,
    }))

    const interviewScoreItems = (
      'ashbyInterviewScoresReceived' in employee &&
      employee.ashbyInterviewScoresReceived
        ? employee.ashbyInterviewScoresReceived
        : []
    ).map((score) => ({
      type: 'ashby-interview-score' as const,
      timestamp: score.createdAt,
      data: score,
    }))

    const allItems = [
      ...salaryItems,
      ...feedbackItems,
      ...performanceProgramItems,
      ...commissionBonusItems,
      ...interviewScoreItems,
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Group items by month/year
    const grouped = new Map<
      string,
      {
        month: number
        year: number
        items: typeof allItems
      }
    >()

    allItems.forEach((item) => {
      const date = new Date(item.timestamp)
      const key = `${date.getFullYear()}-${date.getMonth()}`

      if (!grouped.has(key)) {
        grouped.set(key, {
          month: date.getMonth(),
          year: date.getFullYear(),
          items: [],
        })
      }
      grouped.get(key)!.items.push(item)
    })

    return Array.from(grouped.values())
  }, [
    employee.salaries,
    employee.keeperTestFeedback,
    employee.performancePrograms,
    'commissionBonuses' in employee ? employee.commissionBonuses : [],
    'ashbyInterviewScoresReceived' in employee
      ? employee.ashbyInterviewScoresReceived
      : [],
  ])

  const handleMoveToNextEmployee = () => {
    const currentIndex = reviewQueue.indexOf(employee.id)
    const nextEmployee = reviewQueue[currentIndex + 1] ?? null
    if (nextEmployee) {
      router.navigate({
        to: '/employee/$employeeId',
        params: { employeeId: nextEmployee },
      })
      setShowNewSalaryForm(true)
      setShowOverrideMode(false)
    } else {
      createToast(
        'No more employees in review queue, navigating to overview.',
        {
          timeout: 3000,
        },
      )
      setReviewQueue([])
      router.navigate({ to: '/employees' })
    }
  }

  const benchmarkUpdated =
    employee.salaries[0] &&
    sfBenchmark[employee.salaries[0]?.benchmark] !==
      employee.salaries[0].benchmarkFactor

  // vesting start of last grant is between 12 and 16 months ago (including the initial grant when joining)
  // TODO: include carta last option grant date in this logic
  const monthsSinceStart = dayjs().diff(
    employee.deelEmployee?.startDate,
    'month',
  )
  const eligibleForEquityRefresh =
    false &&
    monthsSinceStart >= 10 &&
    [11, 0, 1, 2, 3].includes(monthsSinceStart % 12)

  const isManager =
    (deelEmployeesAndProposedHiresData?.managedEmployeeIds?.length ?? 0) > 0
  const showEmployeeTree =
    managerHierarchy && (user?.role === ROLES.ADMIN || isManager)

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col items-center justify-center gap-5 overflow-hidden pt-4">
      <div className="flex h-full w-full gap-5 2xl:max-w-[2000px]">
        {/* Sidebar with hierarchy */}
        {showEmployeeTree && (
          <div className="hidden w-96 flex-shrink-0 border-r px-4 lg:block">
            <div className="mb-2 flex items-center justify-between">
              <Select
                value={managerTreeViewMode}
                onValueChange={(value) =>
                  setManagerTreeViewMode(value as 'manager' | 'team')
                }
              >
                <SelectTrigger className="h-8 w-[140px] bg-white text-sm font-semibold text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>View modes</SelectLabel>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <TooltipProvider>
                <div className="flex items-center gap-1">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Search employee</p>
                      </TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search employee..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No employee found.</CommandEmpty>
                          <CommandGroup>
                            {allHierarchyEmployees
                              .filter((node) => node.employeeId)
                              .map((node) => (
                                <CommandItem
                                  key={node.id}
                                  value={`${node.id} - ${node.name} - ${node.employeeId} - ${node.workEmail || ''}`}
                                  onSelect={(currentValue) => {
                                    const selectedEmployeeId =
                                      currentValue.split(' - ')[2]
                                    if (
                                      selectedEmployeeId &&
                                      selectedEmployeeId !== employee.id
                                    ) {
                                      router.navigate({
                                        to: '/employee/$employeeId',
                                        params: {
                                          employeeId: selectedEmployeeId,
                                        },
                                      })
                                    }
                                    setSearchOpen(false)
                                  }}
                                >
                                  {node.name}
                                  <Check
                                    className={cn(
                                      'ml-auto',
                                      employee.id === node.employeeId
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )}
                                  />
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpandAll(true)
                          setExpandAllCounter((prev) => prev + 1)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronsLeftRight className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expand All</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpandAll(false)
                          setExpandAllCounter((prev) => prev + 1)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronsRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Collapse All</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
            <div className="h-[calc(100vh-7rem)] overflow-hidden rounded-lg border bg-white">
              <ManagerHierarchyTree
                hierarchy={managerHierarchy}
                currentEmployeeId={employee.id}
                expandAll={expandAll}
                expandAllCounter={expandAllCounter}
                deelEmployees={filteredDeelEmployees || deelEmployees}
                proposedHires={proposedHires}
                viewMode={managerTreeViewMode}
                onViewModeChange={(mode: 'manager' | 'team') =>
                  setManagerTreeViewMode(mode)
                }
              />
            </div>
          </div>
        )}
        <div
          className={cn(
            'flex w-full min-w-0 flex-1 flex-col gap-5 overflow-y-auto',
            showEmployeeTree ? 'pr-4 pl-4 lg:pl-0' : 'px-4',
          )}
        >
          {user?.role === ROLES.ADMIN ? (
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.navigate({ to: '/employees' })}
              className="-ml-2 self-start"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to overview
            </Button>
          ) : null}
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-bold">
                {getFullName(
                  employee.deelEmployee?.firstName,
                  employee.deelEmployee?.lastName,
                  employee.email,
                ) || 'Edit employee'}
              </span>
              <div className="mt-1 flex gap-4 text-sm text-gray-600">
                <span>Email: {employee.email}</span>
                {employee.priority ? (
                  <span>Priority: {employee.priority}</span>
                ) : null}
                {(employee.deelEmployee?.topLevelManager?.firstName ||
                  employee.deelEmployee?.topLevelManager?.lastName) && (
                  <span>
                    Reviewer:{' '}
                    {getFullName(
                      employee.deelEmployee.topLevelManager.firstName,
                      employee.deelEmployee.topLevelManager.lastName,
                    )}
                  </span>
                )}
                {typeof employee.reviewed === 'boolean' ? (
                  <span>Reviewed: {employee.reviewed ? 'Yes' : 'No'}</span>
                ) : null}
                {employee.deelEmployee?.startDate && (
                  <span>
                    Start Date:{' '}
                    {dayjs(employee.deelEmployee.startDate).format('M/D/YYYY')}{' '}
                    ({dayjs(employee.deelEmployee.startDate).fromNow()})
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {reviewQueue.length > 0 ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleMoveToNextEmployee}
                >
                  Move to next employee
                </Button>
              ) : null}
              {'performancePrograms' in employee &&
              employee.performancePrograms !== undefined ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleStartPerformanceProgram}>
                      Start Performance Program
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>

          {'performancePrograms' in employee &&
          employee.performancePrograms !== undefined ? (
            <div className="w-full">
              <PerformanceProgramPanel
                employeeId={employee.id}
                program={
                  'performancePrograms' in employee &&
                  employee.performancePrograms &&
                  employee.performancePrograms.length > 0
                    ? (employee.performancePrograms[0] as any)
                    : null
                }
                onUpdate={() => router.invalidate()}
              />
            </div>
          ) : null}

          <div className="mt-2 flex flex-row items-center justify-between gap-2">
            <div className="flex gap-2">
              {showNewSalaryForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setShowReferenceEmployees(!showReferenceEmployees)
                  }
                >
                  {showReferenceEmployees
                    ? 'Hide reference employees'
                    : 'Show reference employees'}
                </Button>
              ) : null}
              {showNewSalaryForm ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOverrideMode(!showOverrideMode)}
                >
                  {showOverrideMode
                    ? 'Disable override mode'
                    : 'Enable override mode'}
                </Button>
              ) : null}
              {user?.role === ROLES.ADMIN ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSalaryForm(!showNewSalaryForm)}
                >
                  {showNewSalaryForm ? 'Cancel' : 'Add New Salary'}
                </Button>
              ) : null}
            </div>
          </div>

          {employee.salaries[0] &&
            (() => {
              const locationFactorUpdated =
                locationFactor.find(
                  (l) =>
                    l.country === employee.salaries[0].country &&
                    l.area === employee.salaries[0].area,
                )?.locationFactor !== employee.salaries[0].locationFactor

              return (
                <>
                  {benchmarkUpdated && user?.role === ROLES.ADMIN && (
                    <Alert variant="default">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>
                        This employee is currently on an old benchmark factor.
                      </AlertTitle>
                      <AlertDescription>
                        You can keep it that way by choosing `
                        {employee.salaries[0].benchmark} (old)` as the
                        benchmark, or updated it by choosing `
                        {employee.salaries[0].benchmark.replace(' (old)', '')}`
                        as the benchmark.
                      </AlertDescription>
                    </Alert>
                  )}

                  {locationFactorUpdated && user?.role === ROLES.ADMIN && (
                    <Alert variant="default">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>
                        This employee is currently on an old location factor.
                      </AlertTitle>
                      <AlertDescription>
                        The location factor will be updated on the next salary
                        update.
                      </AlertDescription>
                    </Alert>
                  )}

                  {eligibleForEquityRefresh && user?.role === ROLES.ADMIN && (
                    <Alert variant="default">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>
                        This employee is eligible for an equity refresh.
                      </AlertTitle>
                      <AlertDescription>
                        Enter an equity refresh percentage in the next salary
                        update. In the majority of cases, this will be between
                        18% and 25%.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )
            })()}

          {showNewSalaryForm && showReferenceEmployees ? (
            <ReferenceEmployeesTable
              referenceEmployees={combinedReferenceEmployees}
              currentEmployee={employee}
              filterByLevel={filterByLevel}
              setFilterByLevel={setFilterByLevel}
              filterByExec={filterByExec}
              setFilterByExec={setFilterByExec}
              filterByTitle={filterByTitle}
              setFilterByTitle={setFilterByTitle}
            />
          ) : null}

          <div className="w-full flex-grow">
            <div className="mb-8">
              {showNewSalaryForm && (
                <NewSalaryForm
                  employeeId={employee.id}
                  showOverride={showOverrideMode}
                  setShowOverride={setShowOverrideMode}
                  latestSalary={employee.salaries[0]}
                  totalAmountInStockOptions={employee.salaries.reduce(
                    (acc, salary) => acc + salary.amountTakenInOptions,
                    0,
                  )}
                  onSuccess={() => {
                    setShowNewSalaryForm(false)
                    router.invalidate()
                  }}
                  onCancel={() => setShowNewSalaryForm(false)}
                  benchmarkUpdated={benchmarkUpdated}
                  setLevel={setLevel}
                  setStep={setStep}
                  setBenchmark={setBenchmark}
                  showBonusPercentage={showBonusPercentage}
                  eligibleForEquityRefresh={eligibleForEquityRefresh}
                />
              )}
              {timelineByMonth.length > 0 ? (
                timelineByMonth.map((monthGroup, monthGroupIndex) => (
                  <div key={`${monthGroup.year}-${monthGroup.month}`}>
                    <div
                      className={`flex items-center border border-gray-200 px-4 py-2 ${monthGroupIndex !== 0 ? 'border-t-0' : 'rounded-t-md'}`}
                    >
                      <h3 className="text-lg font-bold">
                        {months[monthGroup.month]} {monthGroup.year}
                      </h3>
                      <span className="mx-2">·</span>
                      <p className="text-sm text-gray-500">
                        {(() => {
                          const now = new Date()
                          const diffMonths =
                            (now.getFullYear() - monthGroup.year) * 12 +
                            (now.getMonth() - monthGroup.month)

                          if (diffMonths === 0) return 'this month'
                          if (diffMonths === 1) return '1 month ago'
                          if (diffMonths < 12) return `${diffMonths} months ago`

                          const years = Math.floor(diffMonths / 12)
                          const remainingMonths = diffMonths % 12
                          if (remainingMonths === 0) {
                            return years === 1
                              ? '1 year ago'
                              : `${years} years ago`
                          }
                          return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} ago`
                        })()}
                      </p>
                    </div>
                    <div className="w-full">
                      {monthGroup.items.map((item, itemIndex) => {
                        const isLastMonth =
                          monthGroupIndex === timelineByMonth.length - 1
                        const isLastItemInMonth =
                          itemIndex === monthGroup.items.length - 1
                        const lastTableItem = isLastMonth && isLastItemInMonth

                        if (item.type === 'salary') {
                          return (
                            <SalaryHistoryCard
                              key={`salary-${item.data.id}`}
                              salary={item.data}
                              isAdmin={user?.role === ROLES.ADMIN}
                              onDelete={handleDeleteSalary}
                              lastTableItem={lastTableItem}
                            />
                          )
                        } else if (item.type === 'feedback') {
                          return (
                            <FeedbackCard
                              key={`feedback-${item.data.id}`}
                              feedback={item.data}
                              lastTableItem={lastTableItem}
                            />
                          )
                        } else if (item.type === 'performance-program') {
                          return (
                            <PerformanceProgramTimelineCard
                              key={`perf-program-${item.data.program.id}-${item.data.event}-${item.data.checklistItem?.id || item.data.feedback?.id || ''}`}
                              event={item.data.event}
                              program={item.data.program}
                              checklistItem={item.data.checklistItem}
                              feedback={item.data.feedback}
                              lastTableItem={lastTableItem}
                            />
                          )
                        } else if (item.type === 'commission-bonus') {
                          return (
                            <CommissionBonusTimelineCard
                              key={`commission-bonus-${item.data.id}`}
                              bonus={item.data}
                              lastTableItem={lastTableItem}
                            />
                          )
                        } else if (item.type === 'ashby-interview-score') {
                          return (
                            <AshbyInterviewScoreTimelineCard
                              key={`ashby-interview-score-${item.data.id}`}
                              score={item.data}
                              lastTableItem={lastTableItem}
                            />
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-500">
                  No history available.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type ReferenceEmployee = {
  id: string
  name: string
  level: number
  step: number
  locationFactor: number
  location: string
  salary: number
}

function ReferenceEmployeesTable({
  referenceEmployees,
  currentEmployee,
  filterByLevel,
  setFilterByLevel,
  filterByExec,
  setFilterByExec,
  filterByTitle,
  setFilterByTitle,
}: {
  referenceEmployees: Array<ReferenceEmployee>
  currentEmployee: Employee
  filterByLevel: boolean
  setFilterByLevel: (filterByLevel: boolean) => void
  filterByExec: boolean
  setFilterByExec: (filterByExec: boolean) => void
  filterByTitle: boolean
  setFilterByTitle: (filterByTitle: boolean) => void
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentEmployeeRowRef = useRef<HTMLTableRowElement>(null)

  const columns: Array<ColumnDef<ReferenceEmployee>> = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <div>{row.original.name}</div>,
      },
      {
        accessorKey: 'level',
        header: 'Level',
        cell: ({ row }) => <div>{row.original.level}</div>,
      },
      {
        accessorKey: 'step',
        header: 'Step',
        cell: ({ row }) => <div>{row.original.step}</div>,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: referenceEmployees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    filterFns: {
      fuzzy: () => true,
    },
  })

  useEffect(() => {
    if (currentEmployeeRowRef.current && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure the DOM has updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const row = currentEmployeeRowRef.current
          const container = scrollContainerRef.current
          if (!row || !container) return

          // Calculate position relative to the scroll container
          const containerRect = container.getBoundingClientRect()
          const rowRect = row.getBoundingClientRect()
          const rowOffsetTop =
            rowRect.top - containerRect.top + container.scrollTop
          const rowHeight = rowRect.height
          const containerHeight = container.clientHeight

          // Scroll to center the row in the container
          const scrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2

          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth',
          })
        })
      })
    }
  }, [referenceEmployees, currentEmployee.id])

  return (
    <>
      <div className="mt-2 flex flex-row items-center justify-between gap-2">
        <span className="text-md font-bold">Reference employees</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="filter-by-level"
              checked={filterByLevel}
              onCheckedChange={setFilterByLevel}
            />
            <Label htmlFor="filter-by-level" className="text-sm">
              Filter by level
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="filter-by-exec"
              checked={filterByExec}
              onCheckedChange={setFilterByExec}
            />
            <Label htmlFor="filter-by-exec" className="text-sm">
              Filter by exec
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="filter-by-title"
              checked={filterByTitle}
              onCheckedChange={setFilterByTitle}
            />
            <Label htmlFor="filter-by-title" className="text-sm">
              Filter by title
            </Label>
          </div>
        </div>
      </div>

      <div className="w-full flex-grow">
        <div
          ref={scrollContainerRef}
          className="max-h-[300px] overflow-hidden overflow-y-auto rounded-md border"
        >
          <Table className="text-xs">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    ref={(el) => {
                      if (currentEmployee.id === row.original.id) {
                        currentEmployeeRowRef.current = el
                      }
                    }}
                    onClick={() =>
                      window.open(`/employee/${row.original.id}`, '_blank')
                    }
                    className={`cursor-pointer ${currentEmployee.id === row.original.id ? 'bg-blue-200 font-semibold' : ''}`}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
