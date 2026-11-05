# DFY Frontend Work History

This document records the frontend work completed during the October 2026 task-workspace and Paystack payout work across DFY-FE and DFY-BE. It describes code pushed to `main`; a GitHub push does not by itself confirm that staging or production has deployed the change.

## Task workspaces and navigation

- Added paginated task workspaces, including Completed, Browse, My Posted, and My Active tasks. The UI uses backend pagination and retains task-specific links when opening a task from a notification or chat.
- Added task status tabs and counts to My Posted tasks and Completed tasks. Completed-task filters include awaiting creator confirmation, payout issues, payout processing, and paid tasks.
- Added pagination and status-aware task filtering to the action-required and completed-task views.
- Refined task and workspace search bars, layouts, and responsive presentation, including consistent task-card sizing and the My Active desktop grid.
- Updated notification navigation so task-related notifications can open their associated task and relevant workflow view.
- Updated the task-claim experience to explain the verified payout-account prerequisite and direct runners to Payout Settings when they are not ready to accept work.

## Paystack payment and payout experience

- Switched the checkout experience from Ozow to Paystack and added staging lifecycle coverage. Automated lifecycle tests that simulate payment state are distinguished from the manual provider test, which requires a confirmed Paystack Test Mode setup.
- Added a gated manual Paystack checkout scenario for validating payment through payout in Test Mode. Synthetic staging app logins were also provisioned during setup; they are ordinary DFY logins, not Paystack credentials or payout-ready bank accounts.
- Added runner payout settings for adding, verifying, retrying verification, and removing bank accounts. The UI refreshes account status after verification attempts, shows provider feedback, and counts an account as payout-ready only when the API reports it as verified with a Paystack recipient.
- Added clear treatment for the legacy “DFY E2E Test Bank” fixture. It is identified as test-only, explains that it has no real bank details or Paystack recipient, and can be removed; it is not presented as an account suitable for payouts.
- Added a **Make default** action for verified payout-ready accounts. The selected account is labelled as the default payout account. The page explains that the preference affects new payouts only; payouts already in progress retain their recorded destination.

## Frontend/backend contract

The frontend uses the following authenticated banking operations:

| Operation | Endpoint |
|---|---|
| List active bank accounts | `GET /banking/accounts` |
| List Paystack-supported banks | `GET /banking/banks` |
| Add an account | `POST /banking/accounts` |
| Retry account verification | `POST /banking/bank-accounts/{id}/verify` |
| Select the default payout account | `PUT /banking/bank-accounts/{id}/default` |
| Remove an account from active settings | `DELETE /banking/bank-accounts/{id}` |

The account response includes `isVerified`, `verificationMessage`, and `isDefaultPayout`. The API is authoritative: an account is payout-ready only when it has an active, verified Paystack recipient.

## Validation recorded

- Frontend production builds passed after the account-management and preferred-account changes.
- Playwright staging scenarios were listed and exercised during development; the dispute test helper was restored after CI exposed its removal.
- A production build is not a substitute for running the staging end-to-end flow against a deployed backend and a real Paystack Test Mode recipient.

## Deployment and operational notes

- Frontend changes for account management and default payout selection were pushed to `main` (latest related commit: `f60df31`).
- Backend support and its database migration are required for the default-account control to work. Deployment of both repositories and application of the backend migration must be confirmed in their hosting environment; repository pushes alone do not establish deployment.
- Never put Paystack keys, real bank details, or staging passwords in this repository or this document.
- The manual Paystack checkout scenario must only be run against a non-production environment with explicit Test Mode confirmation and matching backend keys/webhook configuration.
