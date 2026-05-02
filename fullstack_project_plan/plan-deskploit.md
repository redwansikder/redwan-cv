# DeskPilot Build Plan

Portfolio project — hybrid office desk and room booking system.

**Stack:** Next.js 14 · Express · PostgreSQL (Drizzle) · MongoDB · Socket.io · JWT · Docker · Railway

---

## About the project

**DeskPilot** is a self-hostable desk and meeting room booking system for hybrid offices, coworking spaces, and clinics. Shows live floor-plan availability and prevents double-booking at the database level.

### Problem it solves

Hybrid offices and shared spaces struggle with:

- **Desk conflicts** — employees arrive to find their desk taken
- **Room double-bookings** — two teams show up at the same meeting room
- **Zero utilization data** — companies pay for floors nobody uses on Fridays
- **Enterprise tool cost** — Robin, OfficeSpace, Envoy cost $4–10/user/month; overkill for 20-person offices
- **Manual spreadsheets** — shared Google Sheet for desk signup is a disaster by week 2

DeskPilot fixes this with **live floor-plan UI**, **DB-level conflict prevention** (PG `tstzrange` exclusion constraints), **check-in flow**, and **utilization analytics**.

### Target users

- 10–100 person hybrid companies
- Small coworking space operators
- Medical clinics renting rooms to independent practitioners
- Training centers booking classrooms

### Purpose and goals

1. Ship a real product small offices could deploy tomorrow
2. Exercise rare but powerful PG features (range types, exclusion constraints, GIST indexes)
3. Produce a visually striking demo — floor plan lighting up in real time is great in a Loom
4. Demonstrate production habits end-to-end

### Core features

- **Interactive floor plan** — SVG map of the office; admins pin desks and rooms to coordinates
- **Click-to-book** — click a desk, pick date/time, confirm
- **Live availability** — WebSocket pushes `desk:booked` / `desk:freed`; colors update on everyone's screen
- **Recurring bookings** — "every Tue and Thu for 8 weeks" expands to individual rows
- **Room slot booking** — 15-minute granularity, drag to extend duration
- **DB-level conflict prevention** — PG `EXCLUDE USING GIST (resource_id WITH =, time_range WITH &&)` — double-booking is physically impossible
- **QR check-in** — each desk has a unique QR; scanning marks booking as "checked-in"; cron releases no-shows after 30 min
- **Full-text search** — find rooms by amenity ("monitor", "whiteboard", "standing desk")
- **Activity log** — MongoDB records every booking, cancellation, check-in
- **Analytics** — utilization %, peak days, no-show rate, underused zones heatmap
- **Roles** — `admin` (floor config, members), `member` (book), `guest` (view only)
- **Self-hostable** — `docker compose up`

### Non-goals (explicit scope limits)

- No payments or coworking billing
- No Google/Outlook calendar sync
- No native mobile app (responsive web + QR scan via camera is enough)
- No Slack integration
- No multi-building in v1 (single floor-plan per org)

### Success criteria

- Live URL works, 2 tabs demonstrate real-time floor map update
- Recruiter clones, `docker compose up`, working booking < 5 min
- Attempting concurrent double-booking returns 409 from DB constraint (demoable)
- 3-minute Loom: book → live update → check-in via QR → analytics

---

## Phase 0 — Prep (1 day)

1. Create GitHub repo `deskpilot` — public, MIT license, README stub
2. Install: Node 20+, Docker Desktop, pnpm, VS Code
3. Deploy target: **Railway** (PG + Mongo free tier)
4. Pick subdomain: `deskpilot-redwan.up.railway.app`
5. Source or draw a sample office floor plan SVG (Figma export or excalidraw)

## Phase 1 — Monorepo scaffold (1 day)

1. `pnpm init` → workspace
2. Folders:
   ```
   deskpilot/
     apps/web        ← Next.js 14 (app router)
     apps/api        ← Express service
     packages/db     ← Drizzle schema + client
     packages/types  ← shared TS types
     docker-compose.yml
   ```
3. `pnpm create next-app apps/web` (TS, Tailwind, app router)
4. `apps/api` — Express + ts-node-dev
5. Commit: `chore: monorepo scaffold`

## Phase 2 — Database + Drizzle (with range types) (2 days)

1. `docker-compose.yml` — services: `postgres`, `mongo`
2. `packages/db` — install `drizzle-orm`, `drizzle-kit`, `pg`
3. Schema:
   - `users` — id, email, name, password_hash
   - `orgs` — id, name, floor_svg_url
   - `members` — user_id, org_id, role
   - `resources` — id, org_id, kind (desk/room), name, x, y, amenities (text[])
   - `bookings` — id, resource_id, user_id, time_range (`tstzrange`), status, checked_in_at
4. **Critical migration**: add `EXCLUDE USING GIST (resource_id WITH =, time_range WITH &&)` constraint — raw SQL via Drizzle `sql` template
5. GIST index on `bookings.time_range`
6. `tsvector` column on `resources` for FTS over `name + amenities`
7. Seed: 1 org + 1 SVG + 20 desks + 4 rooms + 50 bookings
8. Mongo `activity_log`
9. Commit: `feat(db): PG schema with range exclusion constraint`

## Phase 3 — Auth (JWT + RBAC) (1 day)

1. `/register`, `/login`, `/me`
2. `bcrypt`, JWT httpOnly cookie, 7-day
3. Middleware: `requireAuth`, `requireRole`
4. Zod validation
5. Postman collection in `/docs`
6. Commit: `feat(auth): JWT + RBAC + Zod validation`

## Phase 4 — Booking API (1 day)

1. `POST /api/bookings` — insert; DB constraint rejects overlaps with clean 409 response
2. `DELETE /api/bookings/:id` — owner or admin only
3. `POST /api/bookings/:id/check-in` — sets `checked_in_at`
4. `GET /api/resources?date=...` — returns desks/rooms with booking state for that day
5. Recurring booking expander: client sends rule, server writes N rows in a transaction
6. Cron: release no-shows after 30 min grace period (`node-cron`)
7. Every action → activity log
8. Commit: `feat(bookings): CRUD + conflict guard + recurring + no-show cron`

## Phase 5 — Frontend floor plan (2 days)

1. `/floor` — SVG floor plan rendered with React; desks/rooms as `<circle>` or `<rect>` at `x, y`
2. Color states: green (free) / yellow (booked by someone) / blue (booked by you) / red (occupied now)
3. Click desk → side drawer with time picker, book button
4. Date navigator (arrows + calendar)
5. MUI drawer, Tailwind utilities for SVG overlay
6. TanStack Query for resource + booking fetch; optimistic updates
7. Commit: `feat(web): SVG floor plan + booking drawer`

## Phase 6 — WebSockets live sync (1 day)

1. Socket.io server, room per org
2. Events:
   - `booking:created` — recolor desk on all clients
   - `booking:cancelled` — free desk
   - `booking:checked-in` — mark red
3. Client: subscribe on `/floor` mount, invalidate queries on events
4. **Demo moment**: Tab A books desk 14 → Tab B sees it turn yellow instantly → Tab A cancels → turns green
5. Commit: `feat(realtime): floor map live sync`

## Phase 7 — QR check-in (1 day)

1. Route `GET /api/resources/:id/qr` — returns QR image (`qrcode` npm) encoding `https://deskpilot.app/check-in/:resourceId`
2. Page `/check-in/[resourceId]` — finds active booking for current user + resource, calls check-in API
3. Admin can print QR sheet from `/floor` (PDF export via `react-pdf` or print stylesheet)
4. Commit: `feat(checkin): QR generation + check-in page`

## Phase 8 — Analytics dashboard (1 day)

1. Route `/analytics` — admin only
2. Drizzle queries:
   - **Utilization %** per resource — `sum(duration) / total_open_hours`
   - **Peak days**: group bookings by day-of-week, count
   - **No-show rate**: bookings with no `checked_in_at` before start+30min
   - **Underused zones heatmap**: bucket resources by area (derived from x/y), average utilization
   - **FTS**: search resources by amenity
3. Materialized view `mv_weekly_utilization`; refresh route
4. UI: recharts — bar (utilization per desk), line (bookings per day), heatmap of floor
5. Commit: `feat(analytics): utilization + no-show + FTS`

## Phase 9 — Docker + deploy (1 day)

1. Multi-stage `Dockerfile` for `apps/api` and `apps/web`
2. `docker compose up` runs full stack
3. Railway deploy with PG + Mongo plugins, env vars
4. Verify live URL
5. Commit: `chore: Dockerfiles + Railway config`

## Phase 10 — Polish for recruiters (1 day)

1. **README.md**:
   - GIF of floor plan lighting up across 2 tabs
   - Architecture diagram
   - Highlight: "Double-booking is prevented at the database level with `EXCLUDE USING GIST`"
   - Local setup
   - Live URL + test creds (`demo@deskpilot.app` / `demo1234`)
2. Loom (2–3 min):
   - Open floor plan in 2 tabs
   - Book desk → live color change
   - Try concurrent double-book via Postman → show 409 from DB constraint
   - Scan QR with phone → check-in page
   - Switch to analytics → utilization chart
3. Pin repo on GitHub profile
4. LinkedIn post

## Phase 11 — Wire into CV (10 min)

Add **Projects** section to `cv-fullstack.html`:
```
DeskPilot — Real-time desk and room booking with live floor plan
[live demo] · [code]
Next.js 14, Express, PostgreSQL (Drizzle, tstzrange, GIST exclusion
constraint, FTS), MongoDB, Socket.io, JWT, Docker, QR check-in
```

---

## Timeline

- Full-time: ~12 working days (range-type migration + QR flow add a day each vs TaskFlow)
- Evenings/weekends: 4 weeks

## MVP cut

Skip recurring bookings + QR check-in + heatmap. Keep single bookings, live sync, basic analytics. 7 days.

---

## Why DeskPilot stands out

- **Uncommon idea** — most portfolio projects are task trackers or chat apps; recruiters see dozens. DeskPilot is unusual, memorable.
- **PG exclusion constraint** — rare real-world use of range types and GIST; strong interview talking point.
- **Visual demo** — floor plan lighting up live is more striking than a kanban card moving.
- **Real product** — easy to pitch as something a 20-person office could genuinely deploy.

---

## CV bullet coverage map

| CV bullet | Phase |
|---|---|
| React + Next.js + Express/API routes | 1, 4, 5 |
| REST + JWT + validation + RBAC | 3, 4 |
| PG + Mongo + ORM (Drizzle) | 2, 4, 8 |
| WebSockets real-time | 6 |
| MUI/Tailwind + TanStack Query | 5 |
| Docker + Git workflow | 9 |
