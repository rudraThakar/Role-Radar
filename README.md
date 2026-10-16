# RoleRadar

RoleRadar is a learning-first, production-style job discovery and recommendation platform.

The goal is not to use every possible technology. The goal is to build a simple, understandable, industry-level project in disciplined steps: clear domain logic, tested behavior, explainable recommendations, and a clean architecture that can grow later.

## What We Are Building

RoleRadar helps a user maintain multiple career profiles, such as `Backend SDE` and `Digital Hardware`, and receive profile-specific job recommendations from permitted official sources.

The application should eventually support:

- User accounts and multiple career profiles
- Resume upload and extracted profile suggestions
- Job ingestion from official/ATS sources
- Normalization, deduplication, classification, eligibility, and ranking
- Explainable recommendation feeds
- Saved, hidden, viewed, and applied job states
- Tests, documented architecture decisions, and reproducible local setup

RoleRadar does not apply to jobs or fill forms. It only discovers, ranks, explains, and links to original listings.

## Learning Principles

This project will be built so that each step teaches a real backend/software engineering concept.

- Domain first: eligibility, ranking, deduplication, and classification should be understandable without reading framework code.
- Vertical slices first: one useful end-to-end flow is better than many empty services.
- Tests travel with features: rules and behavior should be proven as they are added.
- Infrastructure later: Kafka, Redis, OpenSearch, and observability are introduced when the simpler version already works.
- Explainability matters: every recommendation should say why it was accepted, rejected, or uncertain.

## Architecture Direction

We will keep the architecture intentionally simple.

For the main project, RoleRadar will use:

- `apps/web`: React frontend
- `apps/api`: Node.js runtime with Express.js framework
- `packages/domain`: pure business rules
- `packages/contracts`: shared API/event types
- PostgreSQL as the source of truth
- One background worker inside the backend or as a simple worker app when needed

We will not start with Kafka, OpenSearch, Kubernetes, or many microservices. Those are useful learning topics later, but they are not needed for the first strong version of this project.

The simple MVP architecture is:

```text
React Web App
     |
Node.js + Express API
     |
PostgreSQL
     |
Simple background job runner
for polling jobs and calculating matches
```

This is still industry-level because it keeps strong boundaries:

- Controllers handle HTTP.
- Services coordinate workflows.
- Domain functions decide eligibility, scoring, classification, and deduplication.
- Repositories handle database access.
- Tests prove behavior.

## Current Step

Step 1 is project foundation.

We are setting up:

- A monorepo layout
- Shared domain and contract packages
- API and web app placeholders
- Architecture documentation
- The first ADR: keep the MVP simple and vertical-slice-first

No production behavior is implemented yet. The next step is to add the first tested domain logic for job classification, eligibility, and ranking.

## Proposed Milestones

### Milestone 1: Domain Core

Learn: domain modeling, pure functions, TypeScript types, unit testing.

Build:

- Canonical job and career profile models
- Deterministic domain classification
- Fresher eligibility rules
- Match scoring with reasons, gaps, and evidence
- Unit tests for the rules

### Milestone 2: Express API With PostgreSQL

Learn: REST APIs, validation, persistence, migrations, authentication boundaries.

Build:

- Node.js + Express API
- PostgreSQL schema through Prisma migrations
- User registration and login
- Career profile CRUD
- Job and recommendation read APIs

### Milestone 3: First Ingestion Flow

Learn: external integration, normalization, deduplication, reliability basics.

Build:

- Greenhouse connector
- Raw job normalization
- Exact duplicate merging
- Manual or scheduled poll command
- Persisted recommendations per profile

### Milestone 4: Simple Web UI

Learn: frontend state, API integration, product workflows.

Build:

- Profile list and editor
- Recommendation feed
- Filters and search
- Save, hide, mark applied
- Open original listing

### Milestone 5: Production-Style Processing, Optional Later

Learn: event-driven systems, idempotency, queues, retries.

Build only after the simple MVP works:

- Kafka event contracts
- Transactional outbox
- Worker split
- Redis/BullMQ scheduled jobs
- Retry and dead-letter handling

### Milestone 6: Search and Observability, Optional Later

Learn: derived indexes, monitoring, load testing, operational thinking.

Build:

- OpenSearch derived index
- Reindex command
- OpenTelemetry traces
- Prometheus metrics
- k6 load tests

## Repository Layout

```text
apps/
  api/                  # Main backend API, added after domain core
  web/                  # React dashboard, added after API basics
packages/
  domain/               # Framework-independent business rules
  contracts/            # API/event schemas shared across apps
docs/
  architecture/         # System design notes
  adr/                  # Architecture Decision Records
infrastructure/
  docker/               # Local infrastructure config
tests/
  contract/             # Contract tests
  end-to-end/           # End-to-end workflow tests
```

## Development Notes

The project spec recommends `pnpm`, but this project currently uses npm workspaces to keep setup simple.

The first implementation target is the domain package because it teaches the most important system behavior without requiring Docker, databases, queues, or external services.

## Local API And Database

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Create `apps/api/.env` from `apps/api/.env.example`, then run:

```bash
npm --workspace @roleradar/api run db:generate
npm --workspace @roleradar/api run db:migrate
npm run build
npm --workspace @roleradar/api run seed
npm --workspace @roleradar/api start
```

The API runs on `http://localhost:3000`.

For hosted deployment notes, required environment variables, CORS setup, and production Prisma migrations, see [docs/deployment.md](docs/deployment.md).

Register and call an authenticated route:

```bash
curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H 'content-type: application/json' \
  --data '{"email":"rudra@example.com","password":"password123","name":"Rudra"}'
```

Use the returned `accessToken` as a Bearer token for `/api/v1/profiles`.

The seed command creates:

- Demo user: `demo@roleradar.local`
- Demo password: `password123`
- `Backend SDE` and `Digital Hardware` profiles
- Sample software, hardware, embedded, and senior jobs

After login, compare:

```text
GET /api/v1/profiles/:profileId/recommendations
```

The two profiles should receive different recommendation rankings.

## Matching Defaults

Recommendations use hard filters before scoring:

- Jobs requiring more experience than the profile has are not shown.
- Onsite and hybrid jobs outside the profile's preferred locations are not shown.
- Remote jobs still require the profile to allow remote work.

For example, an India-focused fresher profile will not see USA onsite/hybrid jobs by default. To opt in, add `USA` or a specific USA city to that profile's preferred locations.

## Resume Metadata

The API currently supports resume metadata per profile:

```text
GET   /api/v1/profiles/:profileId/resumes
POST  /api/v1/profiles/:profileId/resumes
PATCH /api/v1/profiles/:profileId/resumes/:resumeId/activate
```

Uploaded PDFs are handled in memory by the API, uploaded to Supabase Storage, recorded with a SHA-256 checksum, parsed for text extraction, and stored with extraction status on the resume row. The API does not write resume files to local disk.

Set these backend-only variables before testing resume uploads:

```env
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SECRET_KEY="sb_secret_your-backend-only-secret-key"
SUPABASE_RESUME_BUCKET="resumes"
```
