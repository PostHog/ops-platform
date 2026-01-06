import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'

type AshbyErrorResponse = {
  success: false
  errorInfo: {
    code: string
    requestId: string
  }
  errors: Array<string>
}

type AshbyCandidateSearchSuccessResponse = {
  success: true
  results: Array<{
    id: string
    applicationIds: string[]
    primaryEmailAddress: {
      value: string
      type: string
      isPrimary: boolean
    }
  }>
}

type AshbyCandidateSearchResponse =
  | AshbyErrorResponse
  | AshbyCandidateSearchSuccessResponse

type AshbyFeedbackSuccessResponse = {
  success: true
  results: Array<{
    id: string
    applicationId: string
    interviewId?: string
    submittedValues: {
      overall_recommendation: string
      feedback?: string
    }
    submittedByUser: {
      email: string
      firstName: string
      lastName: string
    }
    submittedAt: string
  }>
  moreDataAvailable: boolean
  syncToken: string
}

type AshbyInterviewInfoSuccessResponse = {
  success: true
  results: {
    id: string
    title: string
    externalTitle: string
    isArchived: boolean
    isDebrief: boolean
    instructionsHtml: any
    instructionsPlain: any
    jobId: string
    feedbackFormDefinitionId: string
  }
}

type AshbyInterviewInfoResponse =
  | AshbyErrorResponse
  | AshbyInterviewInfoSuccessResponse

type AshbyFeedbackResponse = AshbyErrorResponse | AshbyFeedbackSuccessResponse

function getAuthHeader(): string {
  if (!process.env.ASHBY_API_KEY) {
    throw new Error('ASHBY_API_KEY environment variable is not set')
  }
  return `Basic ${Buffer.from(`${process.env.ASHBY_API_KEY}:`).toString('base64')}`
}

function handleAshbyError(data: AshbyErrorResponse): never {
  const errorMessage =
    data.errors.join(', ') || data.errorInfo.code || 'Unknown error'
  const requestId = data.errorInfo.requestId
  throw new Error(
    `Ashby API error: ${errorMessage}${requestId ? ` (requestId: ${requestId})` : ''}`,
  )
}

async function searchCandidateByEmail(
  email: string,
): Promise<AshbyCandidateSearchSuccessResponse> {
  const response = await fetch('https://api.ashbyhq.com/candidate.search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({ email }),
  })

  if (response.status !== 200) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(
      `Failed to search candidate: ${response.status} ${errorText}`,
    )
  }

  const data = (await response.json()) as AshbyCandidateSearchResponse
  if (data.success === false) {
    handleAshbyError(data)
  }
  return data as AshbyCandidateSearchSuccessResponse
}

async function getApplicationFeedback(
  applicationId: string,
): Promise<AshbyFeedbackSuccessResponse> {
  const response = await fetch(
    'https://api.ashbyhq.com/applicationFeedback.list',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ applicationId }),
    },
  )

  if (response.status !== 200) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(`Failed to fetch feedback: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as AshbyFeedbackResponse
  if (data.success === false) {
    handleAshbyError(data)
  }
  return data as AshbyFeedbackSuccessResponse
}

async function getInterviewInfo(
  interviewId: string,
): Promise<AshbyInterviewInfoSuccessResponse> {
  const response = await fetch('https://api.ashbyhq.com/interview.info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify({ id: interviewId }),
  })

  if (response.status !== 200) {
    const errorText = await response.text().catch(() => response.statusText)
    throw new Error(
      `Failed to fetch interview info: ${response.status} ${errorText}`,
    )
  }

  const data = (await response.json()) as AshbyInterviewInfoResponse
  if (!data.success) {
    handleAshbyError(data as AshbyErrorResponse)
  }
  return data as AshbyInterviewInfoSuccessResponse
}

type ValidatedFeedback = {
  rating: number
  feedbackText: string
  submittedAt: Date
  interviewerId: string
  interviewName: string | null
}

export const Route = createFileRoute('/syncAshbyInterviewScores')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        try {
          const employees = await prisma.employee.findMany({
            where: {
              ashbyInterviewScoresImported: false,
              deelEmployee: {
                personalEmail: { not: null },
              },
            },
            include: {
              deelEmployee: true,
            },
            take: 5,
          })

          const results = []

          for (const employee of employees) {
            if (!employee.deelEmployee?.personalEmail) {
              continue
            }

            try {
              // 2. Fetch from ashby api: application, feedback, interviewName
              const candidateResponse = await searchCandidateByEmail(
                employee.deelEmployee.personalEmail,
              )

              if (!candidateResponse.results?.length) {
                results.push({
                  employee: employee.email,
                  status: 'no_candidate',
                })
                continue
              }

              const candidate = candidateResponse.results[0]
              if (!candidate.applicationIds?.length) {
                results.push({
                  employee: employee.email,
                  status: 'no_applications',
                })
                continue
              }

              const validatedFeedbackItems: ValidatedFeedback[] = []

              // Fetch and validate all feedback for all applications
              for (const applicationId of candidate.applicationIds) {
                const feedbackResponse =
                  await getApplicationFeedback(applicationId)

                if (!feedbackResponse.results?.length) {
                  continue
                }

                for (const feedback of feedbackResponse.results) {
                  // 3. Validate all data
                  const ratingString =
                    feedback.submittedValues.overall_recommendation
                  if (!ratingString) {
                    throw new Error(
                      `Missing rating for feedback ${feedback.id} in application ${applicationId}`,
                    )
                  }

                  const rating = parseInt(ratingString, 10)
                  if (isNaN(rating) || rating < 1 || rating > 4) {
                    throw new Error(
                      `Invalid rating ${ratingString} for feedback ${feedback.id}`,
                    )
                  }

                  const feedbackText = feedback.submittedValues.feedback || ''
                  const submittedAt = new Date(feedback.submittedAt)

                  if (isNaN(submittedAt.getTime())) {
                    throw new Error(
                      `Invalid submittedAt date for feedback ${feedback.id}: ${feedback.submittedAt}`,
                    )
                  }

                  const interviewer = await prisma.employee.findUnique({
                    where: { email: feedback.submittedByUser.email },
                  })

                  if (!interviewer) {
                    throw new Error(
                      `Interviewer not found: ${feedback.submittedByUser.email} (for feedback ${feedback.id})`,
                    )
                  }

                  // Fetch interview name if interviewId is available
                  let interviewName: string | null = null
                  if (feedback.interviewId) {
                    const interviewInfo = await getInterviewInfo(
                      feedback.interviewId,
                    )
                    interviewName =
                      interviewInfo.results.externalTitle ||
                      interviewInfo.results.title ||
                      null
                  }

                  validatedFeedbackItems.push({
                    rating,
                    feedbackText,
                    submittedAt,
                    interviewerId: interviewer.id,
                    interviewName,
                  })
                }
              }

              // 4. If all valid save interviewscores and set ashbyimported to true
              for (const item of validatedFeedbackItems) {
                await prisma.ashbyInterviewScore.create({
                  data: {
                    employeeId: employee.id,
                    interviewerId: item.interviewerId,
                    rating: item.rating,
                    feedback: item.feedbackText,
                    interviewName: item.interviewName,
                    createdAt: item.submittedAt,
                  },
                })
              }

              await prisma.employee.update({
                where: { id: employee.id },
                data: { ashbyInterviewScoresImported: true },
              })

              results.push({
                employee: employee.email,
                status: 'success',
                scoresCreated: validatedFeedbackItems.length,
              })
            } catch (error) {
              results.push({
                employee: employee.email,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              results,
            }),
          )
        } catch (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
              status: 500,
            },
          )
        }
      },
    },
  },
})
