# ◐ Orbit

**Free, open-source team collaboration.** Channels, DMs, threads, reactions, file sharing, realtime search and notifications — no subscriptions, no premium tiers, no ads, no tracking.

Built with Next.js 15, React 19, TypeScript, TailwindCSS, Prisma, Auth.js and Pusher.

---

## Features

| Area | What's included |
| --- | --- |
| **Auth** | Email + password, Google & GitHub OAuth, email verification, forgot/reset password, protected routes, JWT sessions |
| **Workspaces** | Create/switch workspaces, roles (Owner / Admin / Moderator / Member), email + link invites, settings |
| **Channels** | Public & private channels, topics, descriptions, archive, member management |
| **Chat** | Realtime messaging (Pusher), threads, emoji reactions, @mentions with autocomplete, markdown + code blocks with syntax highlighting, pins, edit & delete, quote replies, typing indicators, read receipts, unread badges |
| **DMs** | Private 1:1 conversations with presence dots and instant notifications |
| **Files** | Upload images, videos, PDFs, Office docs, ZIPs to Vercel Blob with inline previews |
| **Notifications** | Realtime mention/reply/DM/invite notifications, unread counter, browser notifications |
| **Search** | ⌘K command palette searching messages, channels, people and files |
| **Profile** | Avatar, bio, status message, timezone, language, social links, dark/light theme |
| **Design** | Glassmorphism, gradients, skeletons, empty & error states, Framer Motion micro-interactions, fully responsive |

## Tech stack

- **Next.js 15** (App Router, Server Components, Route Handlers) + **React 19** + **TypeScript** (strict)
- **TailwindCSS** + shadcn-style component system + **Framer Motion** + **Lucide** icons
- **Prisma ORM** + **Vercel Postgres** — UUID ids, indexes, soft delete, audit fields
- **Auth.js v5** — credentials + OAuth, JWT sessions, edge middleware
- **Pusher** — realtime events, private & presence channels
- **Vercel Blob** — file storage
- **Zod** validation everywhere, **React Hook Form**, **SWR** for data + infinite scroll

## Quick start

```bash
# 1. Clone and install
git clone <your-repo-url> orbit && cd orbit
npm install

# 2. Configure environment
cp .env.example .env
#    → fill in POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING (Vercel Postgres)
#    → AUTH_SECRET (openssl rand -base64 32)
#    → Pusher keys (pusher.com, free tier)
#    → BLOB_READ_WRITE_TOKEN (Vercel Blob)
#    → optional: Google/GitHub OAuth, Resend for email

# 3. Database
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # demo workspace (ava@orbit.dev / password123)

# 4. Run
npm run dev                 # http://localhost:3000
```

> **Email without Resend:** when `RESEND_API_KEY` is unset, verification/reset links are
> printed to the server console in development, so the full flow works offline.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project** → import the repo (framework auto-detected).
3. Add **Storage**: create a **Postgres** database and a **Blob** store — Vercel injects
   `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` and `BLOB_READ_WRITE_TOKEN` automatically.
4. Add the remaining env vars from `.env.example` (Pusher, `AUTH_SECRET`, OAuth, Resend).
5. **Deploy**, then run migrations once:

   ```bash
   npx vercel env pull .env.local   # pull production env vars
   npx prisma migrate deploy
   ```

Full step-by-step guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
REST API reference: [docs/API.md](docs/API.md).

## Project structure

```
app/            App Router — pages, layouts and REST route handlers
components/     UI primitives (ui/) and feature components (chat/, sidebar/, modals/…)
actions/        Server Actions
hooks/          React hooks (realtime, infinite scroll, typing, presence)
providers/      Client providers (theme, session, toasts)
services/       Server-side business logic shared by routes
lib/            Auth, Prisma client, Pusher, email, validations, rate limiting
types/          Shared TypeScript types
utils/          Formatting helpers
prisma/         Schema, migrations and seed script
docs/           Deployment guide and API documentation
```

## Security

- Role-based access control enforced in services (never trust the client)
- Zod validation on every route handler input
- Rate limiting on auth, messaging, typing and upload endpoints
- bcrypt (cost 12) password hashing; single-use, expiring tokens
- Pusher private/presence channels authorized per-user server-side
- Soft deletes preserve audit trails

## Roadmap

The architecture is designed to grow without rewrites: projects/tasks (Kanban), CRM,
AI assistant, admin panel and optional paid plans can be layered onto the existing
workspace/role model.

## License

MIT — free for everyone, forever.
