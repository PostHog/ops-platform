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

export const Route = createFileRoute('/syncAshbyInterviewScores')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get('Authorization')?.split(' ')[1]
        if (token !== process.env.SYNC_ENDPOINT_KEY) {
          return new Response('Unauthorized', { status: 401 })
        }

        const logs: string[] = []
        const errors: string[] = []

        try {
          // Get all Employees with linked DeelEmployee that has personalEmail
          // Only process employees that haven't been imported yet
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

          logs.push(`Processing ${employees.length} employees`)

          let processedCount = 0
          let scoresCreated = 0
          let scoresSkipped = 0

          // Process each employee
          for (const employee of employees) {
            if (!employee.deelEmployee?.personalEmail) {
              continue
            }

            const deelEmployee = employee.deelEmployee

            try {
              const candidateResponse = await searchCandidateByEmail(
                deelEmployee.personalEmail!,
              )

              if (!candidateResponse.results?.length) {
                logs.push(
                  `No candidate found for ${deelEmployee.personalEmail}`,
                )
                continue
              }

              const candidate = candidateResponse.results[0]
              if (!candidate.applicationIds?.length) {
                logs.push(
                  `No applications found for candidate ${deelEmployee.personalEmail}`,
                )
                continue
              }

              for (const applicationId of candidate.applicationIds) {
                try {
                  const feedbackResponse =
                    await getApplicationFeedback(applicationId)

                  if (!feedbackResponse.results?.length) {
                    logs.push(
                      `No feedback found for application ${applicationId}`,
                    )
                    continue
                  }

                  for (const feedback of feedbackResponse.results) {
                    try {
                      const ratingString =
                        feedback.submittedValues.overall_recommendation
                      if (!ratingString) {
                        errors.push(
                          `Missing rating for feedback ${feedback.id} in application ${applicationId}`,
                        )
                        continue
                      }

                      const rating = parseInt(ratingString, 10)
                      if (isNaN(rating) || rating < 1 || rating > 4) {
                        errors.push(
                          `Invalid rating ${ratingString} for feedback ${feedback.id}`,
                        )
                        continue
                      }

                      const feedbackText =
                        feedback.submittedValues.feedback || ''
                      const submittedAt = new Date(feedback.submittedAt)

                      if (isNaN(submittedAt.getTime())) {
                        errors.push(
                          `Invalid submittedAt date for feedback ${feedback.id}: ${feedback.submittedAt}`,
                        )
                        continue
                      }

                      const interviewer = await prisma.employee.findUnique({
                        where: { email: feedback.submittedByUser.email },
                      })

                      if (!interviewer) {
                        errors.push(
                          `Interviewer not found: ${feedback.submittedByUser.email} (for feedback ${feedback.id})`,
                        )
                        continue
                      }

                      // Fetch interview name if interviewId is available
                      let interviewName: string | null = null
                      if (feedback.interviewId) {
                        try {
                          const interviewInfo = await getInterviewInfo(
                            feedback.interviewId,
                          )
                          interviewName =
                            interviewInfo.results.externalTitle ||
                            interviewInfo.results.title ||
                            null
                        } catch (error) {
                          // Log error but continue processing
                          logs.push(
                            `Failed to fetch interview info for interviewId ${feedback.interviewId}: ${
                              error instanceof Error
                                ? error.message
                                : 'Unknown error'
                            }`,
                          )
                        }
                      }

                      const existing =
                        await prisma.ashbyInterviewScore.findFirst({
                          where: {
                            employeeId: employee.id,
                            interviewerId: interviewer.id,
                            rating,
                            feedback: feedbackText,
                          },
                        })

                      if (existing) {
                        scoresSkipped++
                        continue
                      }

                      await prisma.ashbyInterviewScore.create({
                        data: {
                          employeeId: employee.id,
                          interviewerId: interviewer.id,
                          rating,
                          feedback: feedbackText,
                          interviewName,
                          createdAt: submittedAt,
                        },
                      })

                      scoresCreated++
                    } catch (error) {
                      errors.push(
                        `Error processing feedback ${feedback.id}: ${
                          error instanceof Error
                            ? error.message
                            : 'Unknown error'
                        }`,
                      )
                    }
                  }

                  await new Promise((resolve) => setTimeout(resolve, 100))
                } catch (error) {
                  errors.push(
                    `Error fetching feedback for application ${applicationId}: ${
                      error instanceof Error ? error.message : 'Unknown error'
                    }`,
                  )
                }
              }

              // Mark employee as imported after processing all applications
              await prisma.employee.update({
                where: { id: employee.id },
                data: { ashbyInterviewScoresImported: true },
              })

              processedCount++
              await new Promise((resolve) => setTimeout(resolve, 200))
            } catch (error) {
              errors.push(
                `Error processing employee ${deelEmployee.personalEmail}: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
              )
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              processed: processedCount,
              scoresCreated,
              scoresSkipped,
              errors: errors.length,
              logs: logs.slice(0, 50),
              errorMessages: errors.slice(0, 50),
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
