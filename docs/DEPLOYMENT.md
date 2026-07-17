# Deployment guide — GitHub + Vercel

This guide takes Orbit from a fresh clone to a production deployment in ~15 minutes.

---

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Orbit"
git branch -M main
git remote add origin git@github.com:<you>/orbit.git
git push -u origin main
```

## 2. Create the Vercel project

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. Vercel auto-detects **Next.js** — keep the defaults (no Docker needed).
3. Don't deploy yet — add storage first.

## 3. Provision storage (Vercel dashboard → Storage)

### Postgres
1. **Create Database → Postgres** (serverless, free hobby tier is fine).
2. Connect it to your project. Vercel injects:
   - `POSTGRES_PRISMA_URL` (pooled — used by Prisma Client)
   - `POSTGRES_URL_NON_POOLING` (direct — used by Prisma migrations)

### Blob
1. **Create Database → Blob**.
2. Connect it to your project. Vercel injects `BLOB_READ_WRITE_TOKEN`.

## 4. Configure environment variables

In **Project → Settings → Environment Variables**, add:

| Variable | How to get it |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://<your-app>.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | same as `AUTH_URL` |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | [pusher.com](https://pusher.com) → Channels → new app (free tier) |
| `NEXT_PUBLIC_PUSHER_KEY` / `NEXT_PUBLIC_PUSHER_CLUSTER` | same values as above (client-side) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API keys (optional but recommended) |
| `EMAIL_FROM` | e.g. `Orbit <noreply@yourdomain.com>` |

### Optional OAuth
- **Google**: Google Cloud Console → Credentials → OAuth client ID →
  redirect URI `https://<your-app>.vercel.app/api/auth/callback/google` → set
  `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
- **GitHub**: GitHub → Settings → Developer settings → OAuth Apps →
  callback `https://<your-app>.vercel.app/api/auth/callback/github` → set
  `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`.

## 5. Deploy

Press **Deploy**. The build runs `prisma generate && next build` automatically.

## 6. Run migrations (one-time)

```bash
npm i -g vercel
vercel link
vercel env pull .env.local          # downloads production env vars
npx prisma migrate deploy           # creates all tables
npx prisma db seed                  # optional demo data
```

Open `https://<your-app>.vercel.app` — register, create a workspace, invite your team.

---

## Updating

Every `git push` to `main` triggers a new deployment. When the Prisma schema changes:

```bash
npx prisma migrate dev --name <change>   # locally, creates a new migration
git add prisma/migrations && git commit && git push
vercel env pull .env.local && npx prisma migrate deploy   # apply to production
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `P1001: Can't reach database` | You're using the pooled URL for migrations — ensure `directUrl` uses `POSTGRES_URL_NON_POOLING`. |
| Realtime not working | Check all six `PUSHER_*`/`NEXT_PUBLIC_PUSHER_*` vars; the cluster must match your Pusher app. |
| Emails not arriving | Verify `RESEND_API_KEY` and that your sender domain is verified in Resend. Without a key, links are logged server-side (see Vercel → Logs). |
| Uploads fail | `BLOB_READ_WRITE_TOKEN` missing or Blob store not connected to the project. |
| OAuth error 400 | Redirect URI mismatch — must be exactly `https://<domain>/api/auth/callback/<provider>`. |
