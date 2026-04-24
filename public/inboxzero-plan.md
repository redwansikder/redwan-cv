# InboxZero Build Plan

Portfolio project — team shared inbox for small support teams.

**Stack:** Next.js 14 · Express · PostgreSQL (Drizzle) · MongoDB · Socket.io · JWT · Docker · Railway

---

## About the project

**InboxZero** is a lightweight, real-time shared inbox for small teams (2–10 people) handling customer support email. It sits between chaotic Gmail shared labels and expensive helpdesk tools like Zendesk or Intercom.

### Problem it solves

Small support teams struggle with:

- **Duplicate replies** — two agents answer the same email because nobody sees who's already on it
- **Invisible queue** — no way to see who is handling what or what's unanswered
- **No SLA tracking** — important emails slip past 24h with no warning
- **Tool cost** — Zendesk, Intercom, Front cost $50–100/seat; overkill for a 3-person team
- **Lost context** — replies happen in Gmail, notes happen in Slack, nothing is linked

InboxZero fixes this by putting **shared queue**, **collision detection**, **SLA timers**, and **searchable history** in one self-hostable tool.

### Target users

- 2–10 person support teams at startups
- Agencies handling client email on behalf of customers
- Solo founders working with a VA on support
- Small e-commerce shops managing `support@` inbox

### Purpose and goals

1. Ship a deployable product a small team could actually use
2. Exercise the full stack — email ingest, realtime, search, analytics
3. Showcase production habits — RBAC, validation, migrations, Docker
4. Produce a recruiter-friendly demo with live URL + 3-minute video

### Core features

- **Email ingest** — forward to `support@your-inboxzero.app` via Postmark/SendGrid webhook; Express endpoint parses and stores
- **Shared queue** — columns: `unread / in-progress / resolved`
- **Assignment** — click to assign; live update to all teammates over WebSocket
- **Collision detection** — "Alice is replying…" typing indicator via WS
- **Canned replies** — org-scoped templates, Drizzle-stored, insert with a click
- **SLA timers** — red badge if ticket unanswered > 24h; configurable per org
- **Full-text search** — PG `tsvector` across subject + body + sender email
- **Activity log** — MongoDB stores every assign, reply, status change per thread
- **Analytics** — avg first-response time, tickets per agent, resolution rate, busiest hour heatmap
- **Roles** — `admin` (billing, templates, members), `agent` (handle tickets), `viewer` (read-only client access)
- **Self-hostable** — `docker compose up` spins the full stack

### Non-goals (explicit scope limits)

- No outbound email send in v1 (copy reply into Gmail — enough for demo)
- No AI auto-reply
- No multi-channel (Slack, WhatsApp, Twitter DMs) — email only
- No mobile app (responsive web only)
- No attachments in v1

### Success criteria

- Live URL works, 2 tabs show collision indicator
- Recruiter clones, `docker compose up`, working inbox < 5 min
- Search returns < 300ms on seeded 5k tickets
- 3-minute Loom covers ingest → assign → reply → analytics

---

## Phase 0 — Prep (1 day)

1. Create GitHub repo `inboxzero` — public, MIT license, README stub
2. Install: Node 20+, Docker Desktop, pnpm, VS Code
3. Deploy target: **Railway** (PG + Mongo free tier)
4. Pick subdomain: `inboxzero-redwan.up.railway.app`
5. Free Postmark or SendGrid account for inbound email webhooks

## Phase 1 — Monorepo scaffold (1 day)

1. `pnpm init` → workspace
2. Folders:
   ```
   inboxzero/
     apps/web        ← Next.js 14 (app router)
     apps/api        ← Express service
     packages/db     ← Drizzle schema + client
     packages/types  ← shared TS types
     docker-compose.yml
   ```
3. `pnpm create next-app apps/web` (TS, Tailwind, app router)
4. `apps/api` — manual Express + ts-node-dev setup
5. Commit: `chore: monorepo scaffold`

## Phase 2 — Database + Drizzle (1 day)

1. `docker-compose.yml` — services: `postgres`, `mongo`
2. `packages/db` — install `drizzle-orm`, `drizzle-kit`, `pg`
3. Schema:
   - `users` — id, email, name, password_hash
   - `orgs` — id, name, sla_hours
   - `members` — user_id, org_id, role
   - `tickets` — id, org_id, subject, from_email, status, assigned_to, created_at
   - `messages` — id, ticket_id, direction (inbound/outbound), body, created_at
   - `templates` — id, org_id, name, body
4. `drizzle-kit generate` → migrations
5. Seed script: 1 org + 3 users + 20 tickets with messages
6. Mongo collection `activity_log` (ticket_id, action, actor, timestamp)
7. Commit: `feat(db): PG schema + Mongo activity log`

## Phase 3 — Auth (JWT + RBAC) (1 day)

1. `apps/api/src/routes/auth.ts` — `/register`, `/login`, `/me`
2. `bcrypt` pw hash, JWT in httpOnly cookie, 7-day expiry
3. Middleware: `requireAuth`, `requireRole('admin' | 'agent' | 'viewer')`
4. Zod schemas for validation
5. Postman collection in `/docs`
6. Commit: `feat(auth): JWT + RBAC + Zod validation`

## Phase 4 — Email ingest + ticket creation (1 day)

1. Route `POST /api/email/inbound` — parse Postmark/SendGrid JSON payload
2. Logic:
   - Find/create ticket by `Message-ID` or `In-Reply-To` header (threading)
   - Create message row
   - Write to `activity_log`
3. Secure endpoint with webhook signature verification
4. Mock script `scripts/send-fake-email.ts` for local testing (no real Postmark needed)
5. Commit: `feat(ingest): email webhook + threading`

## Phase 5 — Ticket CRUD + RBAC (1 day)

1. Routes: `GET /api/tickets`, `GET /api/tickets/:id`, `PATCH /api/tickets/:id`
2. Actions: assign, change status, add template reply (stored as outbound message)
3. RBAC: viewer read-only, agent write, admin full
4. Drizzle type-safe joins: ticket + assignee + messages + org
5. Every action → activity log
6. Commit: `feat(tickets): CRUD with RBAC + activity log`

## Phase 6 — Frontend 3-pane inbox (2 days)

1. Layout: list (left) / thread (center) / info (right)
2. List: status filters, SLA red badges, search box
3. Thread: messages chronological, reply composer with template picker
4. Info: assignee dropdown, status, ticket metadata, activity log feed
5. TanStack Query for server state, optimistic updates
6. MUI components + Tailwind utilities
7. Commit: `feat(web): 3-pane inbox UI`

## Phase 7 — WebSockets (realtime + collision) (1 day)

1. Socket.io server, room per org (`org:{id}`)
2. Events:
   - `ticket:new` — broadcast on inbound email
   - `ticket:assigned` — broadcast on assignment change
   - `ticket:status` — broadcast on status change
   - `ticket:typing` — typing indicator (debounce 500ms)
3. Client: subscribe on inbox mount, `queryClient.invalidateQueries` on events
4. Reply composer emits `typing` every keystroke while editing
5. **Demo moment**: Tab A types → Tab B shows "Alice is replying…"
6. Commit: `feat(realtime): socket.io + collision detection`

## Phase 8 — Analytics dashboard (1 day)

1. Route `/analytics` — admin + agent, viewer blocked
2. Drizzle queries:
   - **Aggregations**: tickets per status / per agent / per day
   - **First-response time**: window function — first outbound message after inbound, averaged
   - **SLA breach rate**: count where `resolved_at - created_at > sla_hours`
   - **Heatmap**: tickets per hour × day-of-week
   - **Full-text search**: FTS across subject + body, ranked
3. Materialized view `mv_daily_ticket_stats`, refreshed via cron
4. UI: recharts — line (response time trend), bar (per agent), heatmap grid
5. Commit: `feat(analytics): FTS + window fns + materialized view`

## Phase 9 — Docker + deploy (1 day)

1. Multi-stage `Dockerfile` for `apps/api` and `apps/web`
2. `docker compose up` runs full stack locally
3. Push to Railway:
   - GitHub integration
   - Add PG + Mongo plugins
   - Env: `JWT_SECRET`, `DATABASE_URL`, `MONGO_URL`, `POSTMARK_WEBHOOK_SECRET`
4. Verify live URL
5. Commit: `chore: Dockerfiles + Railway config`

## Phase 10 — Polish for recruiters (1 day)

1. **README.md**:
   - GIF of collision indicator + assignment live sync
   - Architecture diagram (excalidraw PNG)
   - Tech list
   - Local setup with `docker compose up` + `pnpm seed`
   - Live URL + test creds (`demo@inboxzero.app` / `demo1234`)
2. Loom (2–3 min):
   - Send fake email via script → ticket pops in inbox live
   - Tab A types reply → Tab B shows indicator
   - Assign to other agent → Tab B sidebar updates
   - Switch to analytics → charts + FTS
3. Pin repo on GitHub profile
4. LinkedIn post with live link

## Phase 11 — Wire into CV (10 min)

Add **Projects** section to `cv-fullstack.html`:
```
InboxZero — Real-time shared inbox for small support teams
[live demo] · [code]
Next.js 14, Express, PostgreSQL (Drizzle, FTS, window fns),
MongoDB, Socket.io, JWT, Docker, Postmark webhook ingest
```

---

## Timeline

- Full-time: ~11 working days
- Evenings/weekends: 3–4 weeks

## MVP cut

Skip analytics heatmap + materialized view — ship basic aggregations only. Still covers CV bullets in 6–7 days.

---

## CV bullet coverage map

| CV bullet | Phase |
|---|---|
| React + Next.js + Express/API routes | 1, 5, 6 |
| REST + JWT + validation + RBAC | 3, 5 |
| PG + Mongo + ORM (Drizzle) | 2, 5, 8 |
| WebSockets real-time | 7 |
| MUI/Tailwind + TanStack Query | 6 |
| Docker + Git workflow | 9 |
