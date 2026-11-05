# DFY API contract snapshot

- Canonical source: [DoForYou-ZA/DFY-BE `docs/openapi.json`](https://github.com/DoForYou-ZA/DFY-BE/blob/main/docs/openapi.json)
- Generated TypeScript declarations: `src/api/openapi.d.ts`
- Generator: `openapi-typescript@7.6.1`

When DFY-BE changes endpoints, request/response DTOs, or response fields, refresh `contracts/openapi.json` from the backend main branch and regenerate `src/api/openapi.d.ts`. CI verifies that the declaration file is reproducible from the vendored snapshot.

For CI to also detect drift against the current private DFY-BE main branch, configure a repository secret named `DFY_BE_READ_TOKEN` with read-only Contents access to `DoForYou-ZA/DFY-BE`. Without that secret, CI still checks the local snapshot/declaration pair and emits a warning that cross-repository freshness was not checked.

Generated types describe API shape only. DFY-BE remains authoritative for task lifecycle, permissions, fees, payment verification, escrow, disputes, the 24-hour confirmation deadline, and payout eligibility.
