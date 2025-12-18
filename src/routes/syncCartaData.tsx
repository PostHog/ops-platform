import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'

export interface CartaConfig {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface CartaStakeholder {
  id: string
  issuerId: string
  fullName: string
  email: string
  employeeId: string
  relationship: string
  group: string
  entityType: string
}

interface CartaOptionGrant {
  id: string
  issuerId: string
  stakeholderId: string
  equityIncentivePlanName: string
  issueDate: {
    value: string
  }
  vestingStartDate: {
    value: string
  }
  grantExpirationDate: {
    value: string
  }
  lastExercisableDate: {
    value: string
  }
  isoNsoSplit: boolean
  stockOptionType: string
  quantity: {
    value: string
  }
  outstandingQuantity: {
    value: string
  }
  vestedQuantity: {
    value: string
  }
  exercisedQuantity: {
    value: string
  }
  exercisePrice: {
    currencyCode: {
      value: string
    }
    amount: {
      value: string
    }
  }
  securityLabel: string
  earlyExercisable: boolean
  vestingEvents: Array<{
    id: string
    vestDate: {
      value: string
    }
    quantity: {
      value: string
    }
    isoQuantity: {
      value: string
    }
    nsoQuantity: {
      value: string
    }
    performanceCondition: boolean
    vested: boolean
    maxQuantity: {
      value: string
    }
    targetQuantity: {
      value: string
    }
    vestedQuantity: {
      value: string
    }
  }>
  exercises: Array<any>
  vestingSchedule: {
    name: string
    lastModifiedDate: {
      value: string
    }
    startDate: {
      value: string
    }
    endDate: {
      value: string
    }
  }
  canceledQuantity: {
    value: string
  }
  forfeitedQuantity: {
    value: string
  }
  expiredQuantity: {
    value: string
  }
  returnedToPoolQuantity: {
    value: string
  }
  returnedToTreasuryQuantity: {
    value: string
  }
  lastModifiedDatetime: {
    value: string
  }
  exercisePeriods: {
    voluntaryTerminationCount: number
    voluntaryTerminationPeriod: string
    involuntaryTerminationCauseCount: number
    involuntaryTerminationCausePeriod: string
    involuntaryTerminationCount: number
    involuntaryTerminationPeriod: string
    deathExerciseCount: number
    deathExercisePeriod: string
    disabilityExerciseCount: number
    disabilityExercisePeriod: string
    retirementExerciseCount: number
    retirementExercisePeriod: string
  }
}

export const CARTA_API_BASE_URL = 'https://api.playground.carta.team'

const fetchCartaStakeholders = async (): Promise<CartaStakeholder[]> => {
  const allStakeholders: CartaStakeholder[] = []
  let pageToken = ''
  let hasMore = true

  const integration = await prisma.integration.findFirst({
    where: { kind: 'carta' },
  })

  if (!integration || !integration.config) {
    throw new Error('Carta integration not configured')
  }

  const config = integration.config as unknown as CartaConfig
  const issuerId = 40

  while (hasMore) {
    const response = await fetch(
      `${CARTA_API_BASE_URL}/v1alpha1/issuers/${issuerId}/stakeholders?page_size=100&page_token=${pageToken}`,
      {
        headers: {
          Authorization: `Bearer ${config?.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch Carta stakeholders: ${response.status} ${response.statusText}`,
      )
    }

    const data: {
      stakeholders: CartaStakeholder[]
      nextPageToken: string
    } = await response.json()

    allStakeholders.push(...data.stakeholders)

    pageToken = data.nextPageToken || ''
    hasMore = !!pageToken
  }

  return allStakeholders
}

const fetchCartaOptionGrants = async (): Promise<CartaOptionGrant[]> => {
  const allOptionGrants: CartaOptionGrant[] = []
  let pageToken = ''
  let hasMore = true

  const integration = await prisma.integration.findFirst({
    where: { kind: 'carta' },
  })

  if (!integration || !integration.config) {
    throw new Error('Carta integration not configured')
  }

  const config = integration.config as unknown as CartaConfig
  const issuerId = 40

  while (hasMore) {
    const response = await fetch(
      `${CARTA_API_BASE_URL}/v1alpha1/issuers/${issuerId}/optionGrants?page_size=50&page_token=${pageToken}`,
      {
        headers: {
          Authorization: `Bearer ${config?.access_token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (response.status !== 200) {
      throw new Error(
        `Failed to fetch Carta option grants: ${response.status} ${response.statusText}`,
      )
    }

    const data: {
      optionGrants: CartaOptionGrant[]
      nextPageToken: string
    } = await response.json()

    allOptionGrants.push(...data.optionGrants)

    pageToken = data.nextPageToken || ''
    hasMore = !!pageToken
  }

  return allOptionGrants
}

export const Route = createFileRoute('/syncCartaData')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const cartaStakeholders = await fetchCartaStakeholders()

        let syncedCount = 0
        let skippedCount = 0

        for (const stakeholder of cartaStakeholders) {
          if (!stakeholder.email) {
            skippedCount++
            continue
          }

          const result = await prisma.employee.updateMany({
            where: { email: stakeholder.email },
            data: { cartaStakeholderId: stakeholder.id },
          })

          if (result.count > 0) {
            syncedCount += result.count
          } else {
            skippedCount++
          }
        }

        const cartaOptionGrants = await fetchCartaOptionGrants()

        const validStakeholderIds = new Set(
          (
            await prisma.employee.findMany({
              select: { cartaStakeholderId: true },
            })
          )
            .map((e) => e.cartaStakeholderId)
            .filter((id) => id !== null),
        )

        const validGrants = cartaOptionGrants.filter((grant) =>
          validStakeholderIds.has(grant.stakeholderId),
        )

        await prisma.cartaOptionGrant.deleteMany({})

        await prisma.cartaOptionGrant.createMany({
          data: validGrants.map((grant) => ({
            stakeholderId: grant.stakeholderId,
            grantId: grant.id,
            vestingStartDate: grant?.vestingStartDate?.value
              ? new Date(grant.vestingStartDate.value)
              : null,
            vestingSchedule: grant?.vestingSchedule?.name,
            exercisePrice: Number(grant.exercisePrice.amount.value),
            quantity: Number(grant.quantity.value),
            vestedQuantity: Number(grant.vestedQuantity.value),
            expiredQuantity: Number(grant.expiredQuantity.value),
          })),
        })

        return new Response(
          JSON.stringify({
            success: true,
          }),
        )
      },
    },
  },
})
