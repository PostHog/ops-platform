# Request for comments: Onboarding Platform — Carol Donnelly

## Problem statement

**Who are we building for?**

The Ops team, Talent team, managers, and new hires joining PostHog.

**What are their needs?**

PostHog's onboarding process spans 6+ tools (Gmail, Google Sheets, GitHub Issues, Deel, DocuSign, Zluri, Make, Slack). While Zluri and Make handle provisioning and automation, much of the coordination between these tools is manual.

- **No single source of truth.** Hire status lives across a Google Sheet tracker, GitHub issue checklists, Deel contract status, and Slack conversations.
- **Passive task delivery.** The GitHub issue checklist tags people and hopes they notice/complete. No reminders, no escalation, no visibility into what's overdue.
- **Manual country/role logic.** Contract routing (US vs UK vs Germany vs international), provisioning playbooks (Engineering vs Sales), and compliance tasks (I-9, right to work) are tracked manually by the Ops team.
- **No contract monitoring.** For international hires on Deel, Ops manually checks multiple times over several days to see if the contract was signed. No notification exists.
- **Manual offer and contract creation.** Talent builds offers in a Google Sheet calculator, then manually communicates details to Ops via email. Candidate information is re-entered across multiple systems (Deel, DocuSign, the tracker), creating opportunities for data errors in compensation figures, contract details, and start dates.

**Example cases:**

- A new hire in the UK needs a right to work check, a DocuSign contract with 4 signatories, and specific provisioning steps. All of this is tracked in Ops' head and a GitHub issue that the assignees may not check.
- Talent sends an offer acceptance email to Ops. The candidate's name, role, team, salary, start date, and manager are manually re-entered into the Google Sheet tracker by talent. Ops then again into Deel, then referenced when creating the GitHub issue checklist. Each handoff is an opportunity for error.
- A manager is tagged in a GitHub issue with 6 tasks due before their new hire starts. There are no reminders. If they miss it, people discover the gap on the hire's first day or later.

## Success criteria

**How do we know this is successful?**

- A new hire's onboarding can be initiated and tracked entirely from the platform — no Google Sheet, no manual GitHub issue creation
- The right people are told the right things at the right time automatically
- Country-specific and role-specific logic is encoded in the system, not dependent on institutional knowledge
- The Google Sheet tracker, GitHub issue checklist, and salary calculator spreadsheet are all retired
- A new hire opens their employee page and see their employee lifecycle from onboarding hub, pay/equity changes, and feedback history
- Time from offer acceptance to fully provisioned is measurably shorter
- Zero missed onboarding tasks and platform access'(currently tracked by Ops manually noticing gaps)

**What's out of scope?**

- Payroll integration (handled by existing Deel sync)
- Benefits enrollment automation (BambooHR and Next currently manual)
- Offboarding (future phase)

**What makes this ambitious?**

Replacing 3 entrenched workflows (Google Sheet tracker, GitHub issue checklist, salary calculator) with a single platform while maintaining continuity for active hires during the transition.

## Context

**Technical constraints:**
- The ops-platform (ops.posthog.dev) already exists with TanStack Start, Prisma, PostgreSQL, Better Auth
- Deel API has a 5 req/sec org-wide rate limit — relevant for contract monitoring
- Ashby (ATS) has limited seat access — integration will need coordination with Talent
- Slack bot infrastructure already exists (used by keeper tests and performance programs) — onboarding notifications will use a dedicated Onboarding Bot in Slack

**What are teams asking for?**
- Higher accuracy within employee lifecyce that doesn't depend on manual behaviors. 
- Managers want to know what they need to do for incoming hires without digging through GitHub issues
- Ops wants visibility across all active onboardings in one place and proactive task delivery instead of manual tracking
- New hires needing a better experience completing their onboarding

**External motivations:**
- PostHog is hiring at pace — the manual process creates risk as volume increases
- The Google Sheet tracker and GitHub issue template have accumulated workarounds that make them fragile
- The ops platform creates an environment for the entire employee lifecycle to come together in one space, from offer to alumni employee

## Design

**Key UX decisions:**

- **Unified view over separate tabs.** The pipeline and tracker are combined into one table with expandable rows rather than separate views. Clicking a hire shows all their details inline — reduces context switching.
- **Read-only by default, edit via menu.** Expandable rows show data as read-only. Edit mode is accessed through an ellipsis menu to prevent accidental changes. Edit mode is visually distinct.
- **Phase-grouped tables.** Hires are automatically sorted into 4 tables (Active Onboardings, First Day, First Week, Started) based on start date. Each table has its own color scheme and independent sorting.
- **CSV import for transition.** Rather than requiring manual re-entry of existing hires, a CSV import tool lets Ops bulk-load data from the current Google Sheet. Import is idempotent — re-importing updates existing records without duplicates.
- **Task system flagged off.** The smart task delivery system is built but hidden behind a `SHOW_TASKS` feature flag. This allows the GitHub issue workflow to continue until the team is ready to switch.

**Key technical decisions:**

- Task templates defined in code (not DB) for version control, type safety, and easy review
- Server functions use `createAdminFn` (write operations) and `createOrgChartFn` (read-only views) for role-based access
- Idempotent CSV import follows the existing CommissionImportPanel pattern
- Slack notifications sent via a dedicated Onboarding Bot that privately DMs each assignee (Ops, managers, new hires, etc.) with their specific tasks to complete, including details and due dates — separate from the existing performance program notifications
- Test coverage infrastructure added alongside the feature ([#301](https://github.com/PostHog/ops-platform/pull/301))

**Country routing logic (for Offer & Contract Builder):**

| Country | Contract Platform | Signatories |
|---------|------------------|-------------|
| US | DocuSign | Candidate + Tim Glaser |
| UK | DocuSign | Candidate + Witness + Tim Glaser + Fraser Hopper |
| Germany | DocuSign EU QES | Candidate + James Hawkins |
| All other | Deel | Fraser Hopper |

All hires are also added to Deel regardless of contract type.

## Sprints

### Sprint 1 — Pipeline & Tracker (complete)

Built, pending merge: [#300](https://github.com/PostHog/ops-platform/pull/300)

- Unified `/onboarding` page with expandable rows
- 4 phase-grouped tables (Active Onboardings, First Day, First Week, Started)
- Add/edit/delete hires with inline editing
- CSV import for bulk loading from Google Sheet
- Status tracking (offer accepted → contract sent → contract signed → provisioned → started)
- Column filters (team, phase, status) + global search
- Autocomplete fields for manager, team, and referral (from Deel data)
- Laptop tracking, welcome call date, contract type fields
- Accessible to admin and org-chart roles

### Sprint 2 — Smart Task Delivery (complete, flagged off)

Built, flagged off behind `SHOW_TASKS`: [#300](https://github.com/PostHog/ops-platform/pull/300)

- 76 task templates encoded from the GitHub issue checklist
- Auto-generation on status transitions (offer_accepted, contract_signed)
- Bidirectional sync: forward generates tasks, backward removes incomplete (preserves completed)
- Task panel with grouped checkboxes by assignee (Ops, Manager, Kendal, Hector, Scott, New Hire)
- Role-conditional tasks (engineers get Temporal access, PM call)
- Country-conditional tasks (US gets I-9, UK gets right to work check)
- Slack daily digest endpoint for upcoming/overdue tasks
- Ready to activate once GitHub issue workflow is retired

### Sprint 3 — Offer & Contract Builder (next)

- Salary calculator moved from Google Sheet into platform
- Input: candidate name, role, team, manager, country, level, step
- Platform calculates: benchmark salary, location factor, gross salary, equity, OTE
- Generate offer for Talent to route through email to send candidate/download similar to spreadsheet 
- Generate contract and route to DocuSign or Deel based on country
- Contract status tracked in platform
- Auto-populate candidate data into the onboarding pipeline from Talent salary calculation creation

### Sprint 4 — Manager Portal

- Lightweight view for managers showing their incoming hires
- Their onboarding tasks with due dates and completion status
- Auto-filtered to show only hires they manage

### Sprint 5 — New Hire Portal

- Personalized onboarding page for each new hire
- Checklist, key contacts, timeline, PostHog context
- Accessible via unique link or PostHog email login

### Sprint 6 — Contract Monitoring & Provisioning

- Deel webhook to detect signed contracts automatically
- Platform triggers Zluri playbooks for provisioning

### Future — Ashby Integration, Analytics, Offboarding

- ATS acceptance auto-creates onboarding records
- Completion rates, time-to-productivity reporting
- Offboarding checklists and deprovisioning
