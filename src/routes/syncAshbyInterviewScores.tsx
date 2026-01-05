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

type AshbyFeedbackResponse = AshbyErrorResponse | AshbyFeedbackSuccessResponse

// Search for candidate by email
async function searchCandidateByEmail(
  email: string,
): Promise<AshbyCandidateSearchSuccessResponse> {
  if (!process.env.ASHBY_API_KEY) {
    throw new Error('ASHBY_API_KEY environment variable is not set')
  }

  // Basic auth: username is API key, password is empty
  const authHeader = `Basic ${Buffer.from(`${process.env.ASHBY_API_KEY}:`).toString('base64')}`

  const response = await fetch('https://api.ashbyhq.com/candidate.search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
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
    // TypeScript knows this is AshbyErrorResponse when success is false
    const errorResponse = data as AshbyErrorResponse
    const errorMessage =
      errorResponse.errors.join(', ') ||
      errorResponse.errorInfo.code ||
      'Unknown error'
    const requestId = errorResponse.errorInfo.requestId
    throw new Error(
      `Ashby API error: ${errorMessage}${requestId ? ` (requestId: ${requestId})` : ''}`,
    )
  }

  // After checking success, TypeScript knows data is the success type
  return data as AshbyCandidateSearchSuccessResponse
}

// Get application feedback
async function getApplicationFeedback(
  applicationId: string,
): Promise<AshbyFeedbackSuccessResponse> {
  if (!process.env.ASHBY_API_KEY) {
    throw new Error('ASHBY_API_KEY environment variable is not set')
  }

  // Basic auth: username is API key, password is empty
  const authHeader = `Basic ${Buffer.from(`${process.env.ASHBY_API_KEY}:`).toString('base64')}`

  const response = await fetch(
    'https://api.ashbyhq.com/applicationFeedback.list',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
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
    // TypeScript knows this is AshbyErrorResponse when success is false
    const errorResponse = data as AshbyErrorResponse
    const errorMessage =
      errorResponse.errors.join(', ') ||
      errorResponse.errorInfo.code ||
      'Unknown error'
    const requestId = errorResponse.errorInfo.requestId
    throw new Error(
      `Ashby API error: ${errorMessage}${requestId ? ` (requestId: ${requestId})` : ''}`,
    )
  }

  // After checking success, TypeScript knows data is the success type
  return data as AshbyFeedbackSuccessResponse
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
          // Get all DeelEmployees with personalEmail and linked Employee
          const deelEmployees = await prisma.deelEmployee.findMany({
            where: {
              personalEmail: { not: null },
              employee: { isNot: null },
            },
            include: {
              employee: true,
            },
            take: 1,
          })

          logs.push(
            `Found ${deelEmployees.length} employees with personalEmail`,
          )

          let processedCount = 0
          let scoresCreated = 0
          let scoresSkipped = 0

          // Process each employee
          for (const deelEmployee of deelEmployees) {
            if (!deelEmployee.personalEmail || !deelEmployee.employee) {
              continue
            }

            try {
              // Search for candidate in Ashby
              const candidateResponse = await searchCandidateByEmail(
                deelEmployee.personalEmail,
              )

              // After the function returns, we know it's the success type (errors throw)
              if (
                !candidateResponse.results ||
                candidateResponse.results.length === 0
              ) {
                logs.push(
                  `No candidate found for ${deelEmployee.personalEmail} (${deelEmployee.name})`,
                )
                continue
              }

              const candidate = candidateResponse.results[0]

              if (
                !candidate.applicationIds ||
                candidate.applicationIds.length === 0
              ) {
                logs.push(
                  `No applications found for candidate ${deelEmployee.personalEmail}`,
                )
                continue
              }

              // Process all applications for this candidate
              for (const applicationId of candidate.applicationIds) {
                try {
                  // Fetch feedback for this application
                  const feedbackResponse =
                    await getApplicationFeedback(applicationId)

                  // After the function returns, we know it's the success type (errors throw)
                  if (
                    !feedbackResponse.results ||
                    feedbackResponse.results.length === 0
                  ) {
                    logs.push(
                      `No feedback found for application ${applicationId}`,
                    )
                    continue
                  }

                  // Process each feedback item
                  for (const feedback of feedbackResponse.results) {
                    try {
                      // Extract and validate rating
                      const ratingString =
                        feedback.submittedValues.overall_recommendation
                      if (!ratingString) {
                        errors.push(
                          `Missing rating for feedback ${feedback.id} in application ${applicationId}`,
                        )
                        continue
                      }

                      const rating = parseInt(ratingString)

                      // Extract feedback text (use empty string if missing)
                      const feedbackText =
                        feedback.submittedValues.feedback || ''

                      // Find interviewer by email
                      const interviewer = await prisma.employee.findUnique({
                        where: { email: feedback.submittedByUser.email },
                      })

                      if (!interviewer) {
                        errors.push(
                          `Interviewer not found: ${feedback.submittedByUser.email} (for feedback ${feedback.id})`,
                        )
                        continue
                      }

                      // Check if this interview score already exists
                      // (to avoid duplicates if sync is run multiple times)
                      const existing =
                        await prisma.ashbyInterviewScore.findFirst({
                          where: {
                            employeeId: deelEmployee.employee.id,
                            interviewerId: interviewer.id,
                            rating: rating,
                            feedback: feedbackText,
                          },
                        })

                      if (existing) {
                        scoresSkipped++
                        continue
                      }

                      // Create interview score record
                      await prisma.ashbyInterviewScore.create({
                        data: {
                          employeeId: deelEmployee.employee.id,
                          interviewerId: interviewer.id,
                          rating: rating,
                          feedback: feedbackText,
                        },
                      })

                      scoresCreated++
                    } catch (error) {
                      const errorMessage =
                        error instanceof Error ? error.message : 'Unknown error'
                      errors.push(
                        `Error processing feedback ${feedback.id}: ${errorMessage}`,
                      )
                    }
                  }

                  // Small delay to avoid rate limiting
                  await new Promise((resolve) => setTimeout(resolve, 100))
                } catch (error) {
                  const errorMessage =
                    error instanceof Error ? error.message : 'Unknown error'
                  errors.push(
                    `Error fetching feedback for application ${applicationId}: ${errorMessage}`,
                  )
                }
              }

              processedCount++

              // Small delay between employees to avoid rate limiting
              await new Promise((resolve) => setTimeout(resolve, 200))
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error'
              errors.push(
                `Error processing employee ${deelEmployee.personalEmail}: ${errorMessage}`,
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
              logs: logs.slice(0, 50), // Limit logs to first 50
              errorMessages: errors.slice(0, 50), // Limit errors to first 50
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          return new Response(
            JSON.stringify({
              success: false,
              error: errorMessage,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
