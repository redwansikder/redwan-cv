# TaskFlow Build Plan

Portfolio project to showcase full stack bullets on CV.

**Stack:** Next.js 14 · Express · PostgreSQL (Drizzle) · MongoDB · Socket.io · JWT · Docker · Railway

---

## About the project

**TaskFlow** is a lightweight, real-time task and project tracker for small teams (2–20 people) who find Jira too heavy, Trello too simple, and Notion too unstructured.

### Problem it solves

Small teams (agencies, startup squads, freelance collectives) struggle with:

- **Visibility gap** — managers can't see what everyone is working on without pinging people
- **Stale boards** — one person drags a card, others don't know until they refresh
- **No insight** — existing tools show *what* tasks exist but not *how the team is performing* (velocity, bottlenecks, who is overloaded)
- **Heavy tooling** — Jira requires a full-time admin; small teams waste hours on setup instead of work
- **Scattered context** — comments in Slack, tasks in Trello, reports in spreadsheets

TaskFlow fixes this by putting **live collaboration**, **role-based access**, and **analytics** in one tool a team can self-host or run on a cheap cloud instance.

### Target users

- Small dev/design agencies managing client projects
- Remote teams across time zones needing live board sync
- Founders who want one dashboard for team performance
- Freelancers collaborating with clients (viewer role for client access)

### Purpose and goals

1. **Ship a real, deployable product** — not a toy CRUD demo; something a small team could actually use on day one
2. **Prove full-stack depth** — every layer (DB → API → UI → realtime → deploy) built intentionally, not glued together from tutorials
3. **Demonstrate production habits** — RBAC, validation, migrations, Docker, monorepo, CI, typed APIs
4. **Be recruiter-friendly** — clickable live demo, clean repo, architecture diagram, 3-minute video

### Core features

- **Kanban board** with drag-drop and live multi-user sync over WebSockets
- **Role-based access** — `admin`, `member`, `viewer` (client-safe read-only role)
- **Orgs + members** — multi-tenant; one user can belong to many orgs
- **Tags + filters** — categorize tasks, search by tag
- **Full-text search** — PG `tsvector` across task title + description
- **Activity log** — every change written to MongoDB, queryable per task
- **Analytics dashboard** — tasks per user, velocity trend, overdue report, tag distribution
- **JWT auth** via httpOnly cookies — register, login, password hashing
- **Self-hostable** — single `docker compose up` spins entire stack

### Non-goals (explicit scope limits)

Kept out deliberately so project stays shippable in ~2 weeks:

- No mobile app (responsive web only)
- No email / push notifications (realtime WS covers the demo)
- No billing / subscription tier
- No file uploads (can add later if needed)
- No integrations (Slack, GitHub) — keeps surface area small

### Success criteria

- Live URL works, 2 tabs demonstrate realtime sync
- Recruiter can clone, run `docker compose up`, see it working in < 5 min
- Analytics page loads < 500ms with seed data
- Full test user flow shown in 3-minute Loom video

---

## Phase 0 — Prep (1 day)

1. Create GitHub repo `taskflow` — public, MIT license, README stub
2. Install: Node 20+, Docker Desktop, pnpm, VS Code
3. Deploy target: **Railway** (PG + Mongo free tier)
4. Pick subdomain: `taskflow-redwan.up.railway.app`

## Phase 1 — Monorepo scaffold (1 day)

1. `pnpm init` → workspace
2. Folders:
   ```
   taskflow/
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
3. Schema: `users`, `orgs`, `tasks`, `members` (role: admin/member/viewer), `tags`, `task_tags`
4. `drizzle-kit generate` → migrations folder
5. Seed script: 1 admin + 5 users + 20 tasks + tags
6. Mongo via `mongoose` — single collection `activity_log`
7. Commit: `feat(db): PG schema + Mongo activity log`

## Phase 3 — Auth (JWT + RBAC) (1 day)

1. `apps/api/src/routes/auth.ts` — `/register`, `/login`, `/me`
2. Hash pw with `bcrypt`, sign JWT, 7-day expiry, httpOnly cookie
3. Middleware: `requireAuth`, `requireRole('admin')`
4. Zod schemas for request validation
5. Postman collection committed to `/docs`
6. Commit: `feat(auth): JWT + RBAC + Zod validation`

## Phase 4 — Task CRUD REST API (1 day)

1. Routes: `GET/POST/PATCH/DELETE /api/tasks`
2. RBAC: viewer read-only, member write own, admin full
3. Drizzle queries — type-safe selects with joins (task + assignee + tags)
4. Every mutation → write to Mongo `activity_log`
5. Commit: `feat(tasks): CRUD with RBAC + activity log`

## Phase 5 — Frontend (2 days)

1. `apps/web` — TanStack Query, MUI core, Tailwind utilities
2. Pages: `/login`, `/register`, `/board`, `/analytics`, `/settings`
3. Kanban board — drag-drop with `@dnd-kit`
4. Server state via TanStack; optimistic updates
5. Commit: `feat(web): kanban board + auth pages`

## Phase 6 — WebSockets (1 day)

1. `apps/api` — `socket.io` server, room per org
2. On task create/update/delete → emit to org room
3. `apps/web` — `socket.io-client`, subscribe on board mount
4. TanStack `queryClient.invalidateQueries` on incoming event
5. **Demo moment**: 2 browsers → drag card → both update live
6. Commit: `feat(realtime): socket.io live task sync`

## Phase 7 — Analytics dashboard (PG + Drizzle deep dive) (1 day)

1. New page `/analytics` — admin only (RBAC gate)
2. Drizzle queries showcase:
   - **Aggregations**: tasks per status / per user / per org — `count()`, `groupBy()`
   - **Joins**: task + assignee + org + tags in single typed query
   - **Window functions**: task velocity rolling 7-day avg (raw `sql` template)
   - **Full-text search**: PG `tsvector` on `tasks.title + description`
   - **Transactions**: bulk status update with rollback
3. Migration adds FTS index, FK constraints, check constraints
4. Materialized view for weekly report; refresh route
5. UI: recharts — bar chart (tasks/user), line chart (velocity), search box
6. Commit: `feat(analytics): Drizzle aggregations + FTS + materialized view`

## Phase 8 — Docker + deploy (1 day)

1. `Dockerfile` for `apps/api` and `apps/web` (multi-stage, alpine)
2. Full stack local run: `docker compose up`
3. Push to Railway:
   - Link GitHub repo
   - Add PG + Mongo plugins
   - Env vars (JWT_SECRET, DATABASE_URL, MONGO_URL, etc.)
4. Verify live URL works
5. Commit: `chore: Dockerfiles + Railway config`

## Phase 9 — Polish for recruiters (1 day)

1. **README.md**:
   - Screenshot / GIF of kanban + analytics
   - Architecture diagram (excalidraw → PNG)
   - Tech list
   - Local setup (`docker compose up`)
   - Live demo link + test creds (`demo@taskflow.app` / `demo1234`)
2. Loom video (2–3 min):
   - Login → create task → 2nd browser → realtime
   - Switch to `/analytics` → charts + FTS
   - DevTools: JWT cookie, WS frames
3. Pin repo on GitHub profile
4. LinkedIn post with live link

## Phase 10 — Wire into CV (10 min)

1. Add **Projects** section to `cv-fullstack.html`:
   ```
   TaskFlow — Real-time team task tracker with analytics
   [live demo] · [code]
   Next.js 14, Express, PostgreSQL (Drizzle, FTS, window fns),
   MongoDB, Socket.io, JWT, Docker
   ```
2. Commit CV repo, deploy

---

## Timeline

- Full-time: ~10 working days
- Evenings/weekends: 3–4 weeks

## MVP cut (if tight)

Skip analytics depth in Phase 7 — ship basic aggregations only. Still covers all CV bullets in 5–6 days.

---

## CV bullet coverage map

| CV bullet | Phase |
|---|---|
| React + Next.js + Express/API routes | 1, 4, 5 |
| REST + JWT + validation + RBAC | 3, 4 |
| PG + Mongo + ORM (Drizzle) | 2, 4, 7 |
| WebSockets real-time | 6 |
| MUI/Tailwind + TanStack Query | 5 |
| Docker + Git workflow | 8 |
