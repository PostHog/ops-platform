import { createFileRoute } from '@tanstack/react-router'
import prisma from '@/db'

export const Route = createFileRoute('/sendKeeperTests')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const token = request.headers.get('Authorization')?.split(' ')[1]
                if (token !== process.env.SYNC_ENDPOINT_KEY) {
                    return new Response('Unauthorized' + token, { status: 401 })
                }

                const employees = await prisma.employee.findMany({
                    include: {
                        deelEmployee: true,
                    },
                })

                const getSlackMessageBody = (email: string, employeeId: string) => ({
                    "blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `Hey! It's Keeper Test Time! Please submit feedback for ${email}. If you get stuck or aren't familiar, check out <https://posthog.com/handbook/company/management#the-keeper-test|this> section of the Handbook.`
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "If this team member was leaving for a similar role at another company, would you try to keep them?"
                            },
                            "accessory": {
                                "type": "radio_buttons",
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Yes",
                                            "emoji": true
                                        },
                                        "value": "yes"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "No",
                                            "emoji": true
                                        },
                                        "value": "no"
                                    }
                                ],
                                "action_id": "keeper-test-question-1"
                            }
                        },
                        {
                            "type": "input",
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "keeper-test-question-1-text"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "If yes, what is it specifically that makes them so valuable to your team and PostHog?",
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Are they a driver or a passenger?"
                            },
                            "accessory": {
                                "type": "radio_buttons",
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Yes",
                                            "emoji": true
                                        },
                                        "value": "yes"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "No",
                                            "emoji": true
                                        },
                                        "value": "no"
                                    }
                                ],
                                "action_id": "keeper-test-question-2"
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Do they get things done proactively, today?"
                            },
                            "accessory": {
                                "type": "radio_buttons",
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Yes",
                                            "emoji": true
                                        },
                                        "value": "yes"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "No",
                                            "emoji": true
                                        },
                                        "value": "no"
                                    }
                                ],
                                "action_id": "keeper-test-question-3"
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Are they optimistic by default?"
                            },
                            "accessory": {
                                "type": "radio_buttons",
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Yes",
                                            "emoji": true
                                        },
                                        "value": "yes"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "No",
                                            "emoji": true
                                        },
                                        "value": "no"
                                    }
                                ],
                                "action_id": "keeper-test-question-4"
                            }
                        },
                        {
                            "type": "input",
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "keeper-test-question-4-text"
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Areas to watch",
                                "emoji": true
                            }
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "Have you shared this feedback with your team member?"
                            },
                            "accessory": {
                                "type": "radio_buttons",
                                "options": [
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "Yes",
                                            "emoji": true
                                        },
                                        "value": "yes"
                                    },
                                    {
                                        "text": {
                                            "type": "plain_text",
                                            "text": "No, but I will do right now!",
                                            "emoji": true
                                        },
                                        "value": "no"
                                    }
                                ],
                                "action_id": "keeper-test-question-5"
                            }
                        },
                        {
                            "type": "actions",
                            "block_id": "submit_block",
                            "elements": [
                                {
                                    "type": "button",
                                    "text": {
                                        "type": "plain_text",
                                        "text": "Submit",
                                        "emoji": true
                                    },
                                    "action_id": "submit_keeper_test",
                                    "value": `${email}|${employeeId}`
                                }
                            ]
                        }
                    ]
                })

                const res = await fetch('https://slack.com/api/chat.postMessage', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        channel: 'U05LD9R5P6E',
                        blocks: getSlackMessageBody(employees[0].email, employees[0].id).blocks
                    })
                  })

                const body = await res.json()
                return new Response(JSON.stringify(body))
            },
        },
    },
})