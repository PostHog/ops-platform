export type OnboardingTaskAssigneeType =
  | 'ops'
  | 'manager'
  | 'kendal'
  | 'hector'
  | 'scott'
  | 'new_hire'

export type OnboardingTaskTemplate = {
  id: string
  description: string
  assigneeType: OnboardingTaskAssigneeType
  /** Negative = days before start, 0 = start day, positive = days after start */
  daysFromStart: number
  triggerStatus: 'offer_accepted' | 'contract_signed'
  roleConditions?: string[]
  countryConditions?: string[]
}

// ─── Trigger: offer_accepted ─────────────────────────────────────────────────
// Tasks generated when a hire is first added to the tracker

const OFFER_ACCEPTED_TASKS: OnboardingTaskTemplate[] = [
  // ── Ops: contract & onboarding setup ──
  {
    id: 'ops-request-core-info',
    description: 'Request core information from candidate for contract',
    assigneeType: 'ops',
    daysFromStart: -30,
    triggerStatus: 'offer_accepted',
  },
  {
    id: 'ops-send-contract',
    description: 'Send employment contract to both parties for signature',
    assigneeType: 'ops',
    daysFromStart: -28,
    triggerStatus: 'offer_accepted',
  },
  {
    id: 'ops-send-ciia-us',
    description:
      'Send Confidential Information and Invention Assignment via DocuSign (US only)',
    assigneeType: 'ops',
    daysFromStart: -28,
    triggerStatus: 'offer_accepted',
    countryConditions: ['US', 'United States'],
  },
  {
    id: 'ops-download-contracts',
    description: 'Download signed contracts and file them',
    assigneeType: 'ops',
    daysFromStart: -21,
    triggerStatus: 'offer_accepted',
  },
  {
    id: 'ops-deel-onboarding',
    description:
      'Onboard to Deel with all relevant docs including PostHog email',
    assigneeType: 'ops',
    daysFromStart: -21,
    triggerStatus: 'offer_accepted',
  },
  {
    id: 'ops-zluri-birthright',
    description:
      'Complete Zluri Birth-Right onboarding: Google/Email, Slack, Brex, onboarding channel, GitHub issue',
    assigneeType: 'ops',
    daysFromStart: -14,
    triggerStatus: 'offer_accepted',
  },
  {
    id: 'ops-yubikey-request',
    description: 'Request employee orders YubiKeys right away',
    assigneeType: 'ops',
    daysFromStart: -14,
    triggerStatus: 'offer_accepted',
  },
  {
    id: 'ops-order-laptop',
    description: 'Order laptop for new hire',
    assigneeType: 'ops',
    daysFromStart: -14,
    triggerStatus: 'offer_accepted',
  },

  // ── Manager: upon offer acceptance ──
  {
    id: 'manager-welcome-message',
    description:
      'Post welcome message in team channel with introduction and proposed in-person onboarding schedule',
    assigneeType: 'manager',
    daysFromStart: -14,
    triggerStatus: 'offer_accepted',
  },
]

// ─── Trigger: contract_signed ────────────────────────────────────────────────
// Tasks generated when the hire's contract is signed

const CONTRACT_SIGNED_TASKS: OnboardingTaskTemplate[] = [
  // ── Ops: week before start ──
  {
    id: 'ops-engineer-pm-call',
    description:
      'Schedule onboarding call with a PM on how to be a product engineer (engineers only)',
    assigneeType: 'ops',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
    roleConditions: ['engineer'],
  },
  {
    id: 'ops-temporal-access',
    description: 'Grant read-only Temporal access (engineers only)',
    assigneeType: 'ops',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
    roleConditions: ['engineer'],
  },
  {
    id: 'ops-uk-right-to-work',
    description: 'Complete right to work checks on PeopleCheck.com (UK only)',
    assigneeType: 'ops',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
    countryConditions: ['UK', 'United Kingdom'],
  },
  {
    id: 'ops-birthdays-calendar',
    description: 'Add new hire to birthdays/anniversaries calendar',
    assigneeType: 'ops',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-slack-equipment-reminder',
    description:
      'Slack team member reminding them to purchase additional equipment (prioritize YubiKey)',
    assigneeType: 'ops',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-1password',
    description: 'Add to 1Password (no more than 5 days before start)',
    assigneeType: 'ops',
    daysFromStart: -5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-zluri-key-systems',
    description: 'Grant access to key systems via Zluri: Zendesk, GitHub',
    assigneeType: 'ops',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-small-team-page',
    description:
      'Add new hire to relevant small team page on website (Friday before)',
    assigneeType: 'ops',
    daysFromStart: -3,
    triggerStatus: 'contract_signed',
  },

  // ── Kendal ──
  {
    id: 'kendal-merch-pack',
    description:
      'Send merch pack via Micromerch (backpack, 3x vert stickers, mug, socks)',
    assigneeType: 'kendal',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'kendal-hedgehog',
    description: "Sponsor a hedgehog on new hire's behalf",
    assigneeType: 'kendal',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },

  // ── Hector ──
  {
    id: 'hector-share-options',
    description: "Add team member's share options to the share options sheet",
    assigneeType: 'hector',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },

  // ── Scott ──
  {
    id: 'scott-strategy-call',
    description: 'Schedule group onboarding call with Tim on company strategy',
    assigneeType: 'scott',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },

  // ── Manager: week before ──
  {
    id: 'manager-onboarding-plan',
    description: 'Create onboarding plan for first day/week/month/six months',
    assigneeType: 'manager',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'manager-in-person-calendar',
    description:
      'Add in-person onboarding to the onboarding calendar and announce in Slack',
    assigneeType: 'manager',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'manager-user-interviews',
    description:
      'Schedule user interviews for first week (product engineers only)',
    assigneeType: 'manager',
    daysFromStart: -7,
    triggerStatus: 'contract_signed',
    roleConditions: ['product engineer'],
  },

  // ── Ops: first day ──
  {
    id: 'ops-welcome-call',
    description: 'Welcome call and check-in with new hire on first day',
    assigneeType: 'ops',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-github-org',
    description: 'Add team member to PostHog organization in GitHub',
    assigneeType: 'ops',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-posthog-app',
    description: 'Add team member to the PostHog app (and relevant projects)',
    assigneeType: 'ops',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'ops-uk-drg-form',
    description: 'Send new starter form to DRG (UK only)',
    assigneeType: 'ops',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
    countryConditions: ['UK', 'United Kingdom'],
  },
  {
    id: 'ops-uk-health-benefits',
    description: 'Ask about health benefits and tell Parallel (UK only)',
    assigneeType: 'ops',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
    countryConditions: ['UK', 'United Kingdom'],
  },
  {
    id: 'ops-drata-removal',
    description:
      'Remove background check requirements from Drata for non-US team members',
    assigneeType: 'ops',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
  },

  // ── Manager: first day/week ──
  {
    id: 'manager-1-1-booking',
    description: 'Book a weekly 1:1 with the team member',
    assigneeType: 'manager',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'manager-interview-feedback',
    description:
      'Share high-level interview feedback with new hire (not raw scores)',
    assigneeType: 'manager',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'manager-hype-emoji',
    description: 'Create a team member hype emoji',
    assigneeType: 'manager',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'manager-slack-group',
    description: "Add new hire to their team's Slack group",
    assigneeType: 'manager',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },

  // ── Ops: first week ──
  {
    id: 'ops-us-guideline-next',
    description: 'Add to Guideline and Next insurance (US only)',
    assigneeType: 'ops',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
    countryConditions: ['US', 'United States'],
  },
  {
    id: 'ops-us-i9',
    description:
      'Complete employer section of I-9 and run E-Verify within first 3 days (US only)',
    assigneeType: 'ops',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
    countryConditions: ['US', 'United States'],
  },
  {
    id: 'ops-archive-channel',
    description: 'Archive onboarding channel end of week',
    assigneeType: 'ops',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },

  // ── New hire: first week ──
  {
    id: 'newhire-accept-posthog-app',
    description: 'Accept your invite to the PostHog app',
    assigneeType: 'new_hire',
    daysFromStart: 0,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-postit-training',
    description: 'Complete Post-it Note Training',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-security-handbook',
    description: 'Read handbook pages on security and communication',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-phishing-quiz',
    description: 'Take the phishing quiz',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-staff-access',
    description: 'Ask manager for Staff access to PostHog app (Django admin)',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-handbook-chapters',
    description: 'Read the introductory Chapters sections of the Handbook',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-meet-buddy',
    description: 'Meet your onboarding buddy (in person or virtually)',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-team-handbook',
    description: "Read your team's section of the Handbook",
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-exec-intro',
    description: 'Schedule 15-min intro call with Charles, Ben, or Raquel',
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-referral-chat',
    description: 'Schedule 90-day referral chat with talent partner',
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-uk-p45',
    description: 'Email People & Ops your P45 (UK only)',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
    countryConditions: ['UK', 'United Kingdom'],
  },
  {
    id: 'newhire-us-i9-employee',
    description: 'Complete employee section of I-9 in Deel (US only)',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
    countryConditions: ['US', 'United States'],
  },
  {
    id: 'newhire-data-privacy',
    description: 'Read through Data Privacy 101',
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-slack-channels',
    description: 'Join relevant Slack channels',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-community-profile',
    description:
      'Reset community profile password, fill out bio and special moderator fields',
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-yubikeys',
    description:
      'Install YubiKeys (locked out of Google after 30 days without)',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-slack-profile',
    description:
      'Fill out Slack profile: timezone, team, start date, community profile link, full name',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-slack-keywords',
    description: 'Set up Slack notification keywords relevant for your team',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-google-calendar-hours',
    description: 'Add preferred hours to Google Calendar',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-github-ssh',
    description: 'Set up GitHub SSH key and commit signing',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-incident-handling',
    description:
      'Read incident handling docs and watch the video (engineers only)',
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
    roleConditions: ['engineer'],
  },
  {
    id: 'newhire-git-email',
    description: 'Set Git author email to PostHog email on dev machine',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
    roleConditions: ['engineer'],
  },
  {
    id: 'newhire-screen-sharing',
    description: 'Enable screen sharing for Chrome',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-drata',
    description: 'Complete Drata security onboarding and background check',
    assigneeType: 'new_hire',
    daysFromStart: 5,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-gcal-slack-app',
    description: 'Add Google Calendar app to Slack for meeting reminders',
    assigneeType: 'new_hire',
    daysFromStart: 1,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-github-slack-extension',
    description: 'Set up GitHub review notifications via Slack extension',
    assigneeType: 'new_hire',
    daysFromStart: 3,
    triggerStatus: 'contract_signed',
  },

  // ── New hire: first 30 days ──
  {
    id: 'newhire-work-hours',
    description: 'Add normal work hours to PostHog Google Calendar',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-team-intros',
    description: 'Book time with relevant team members for intros',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-time-off-calendar',
    description: 'Add team time off calendar to Google Calendar',
    assigneeType: 'new_hire',
    daysFromStart: 7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-customer-interviews-calendar',
    description: 'Add yourself to the customer interviews calendar',
    assigneeType: 'new_hire',
    daysFromStart: 7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-merch-order',
    description: 'Order PostHog merch (tee, sweater, hat) with discount code',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-user-interview-notes',
    description: 'Read user interview notes',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-refined-github',
    description: 'Install the Refined GitHub extension',
    assigneeType: 'new_hire',
    daysFromStart: 7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-github-profile',
    description:
      'Set actual name on GitHub profile and optionally add profile picture',
    assigneeType: 'new_hire',
    daysFromStart: 7,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-company-details',
    description: 'Bookmark the Important Company Details sheet',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-illustrated-photo',
    description:
      'Submit photo for illustration via Slack workflow (for team page)',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-support-shadowing',
    description:
      'Schedule 30-min shadowing session with nearest support engineer',
    assigneeType: 'new_hire',
    daysFromStart: 21,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-pto-booking',
    description: 'Book known PTO in Slack Time Off by Deel app',
    assigneeType: 'new_hire',
    daysFromStart: 14,
    triggerStatus: 'contract_signed',
  },
  {
    id: 'newhire-demo-reading',
    description: 'Read the section on How to give good demos',
    assigneeType: 'new_hire',
    daysFromStart: 21,
    triggerStatus: 'contract_signed',
  },
]

// ─── Combined templates ──────────────────────────────────────────────────────

export const ONBOARDING_TASK_TEMPLATES: OnboardingTaskTemplate[] = [
  ...OFFER_ACCEPTED_TASKS,
  ...CONTRACT_SIGNED_TASKS,
]

// ─── Filter helper ───────────────────────────────────────────────────────────

export function getApplicableTemplates(
  triggerStatus: 'offer_accepted' | 'contract_signed',
  role: string,
  location: string | null,
): OnboardingTaskTemplate[] {
  return ONBOARDING_TASK_TEMPLATES.filter((t) => {
    if (t.triggerStatus !== triggerStatus) return false

    if (t.roleConditions?.length) {
      const roleLower = role.toLowerCase()
      if (!t.roleConditions.some((rc) => roleLower.includes(rc.toLowerCase())))
        return false
    }

    if (t.countryConditions?.length) {
      if (!location) return false
      const locLower = location.toLowerCase()
      if (
        !t.countryConditions.some((cc) => locLower.includes(cc.toLowerCase()))
      )
        return false
    }

    return true
  })
}
