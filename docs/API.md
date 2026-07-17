# Orbit REST API

Base URL: `/api`. All endpoints return JSON. Errors share one shape:

```json
{ "error": "Human-readable message", "details": { "field": ["issue"] } }
```

- `401` — not authenticated · `403` — insufficient role · `404` — not found
- `409` — conflict · `410` — expired token/link · `413/415` — upload violations
- `422` — validation failed (Zod details included) · `429` — rate limited · `500` — server error

Authentication is cookie-session based (Auth.js). All routes require a signed-in
user unless marked **public**.

---

## Auth & account

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/register` | **public** — create account, sends verification email. Body: `{ name, email, password }` |
| POST | `/api/verify-email` | **public** — `{ token }` → marks email verified |
| POST | `/api/password/forgot` | **public** — `{ email }` → sends reset link (enumeration-safe) |
| POST | `/api/password/reset` | **public** — `{ token, password }` |
| GET/PATCH | `/api/profile` | read / update profile (name, bio, image, timezone, language, socialLinks, statusMessage) |
| * | `/api/auth/*` | Auth.js handlers (signin, callback, session, signout) |

## Workspaces

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/workspaces` | my workspaces (with role + member count) |
| POST | `/api/workspaces` | create — `{ name, description? }` (creates #general + #random, caller becomes OWNER) |
| GET/PATCH/DELETE | `/api/workspaces/:id` | read · update (ADMIN+) · soft-delete (OWNER) |
| GET | `/api/workspaces/:id/members` | list members |
| PATCH/DELETE | `/api/workspaces/:id/members/:memberId` | change role (ADMIN+) · remove member (ADMIN+, not owner) |
| GET/POST | `/api/workspaces/:id/invites` | list active invites (MODERATOR+) · create invite `{ email?, role? }` → returns shareable URL |
| GET/POST | `/api/invites/:token` | invite preview (**public** GET) · accept (authenticated POST) |

## Channels

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/workspaces/:id/channels` | channels visible to me + unread counts |
| POST | `/api/workspaces/:id/channels` | create `{ name, description?, topic?, type: PUBLIC\|PRIVATE, memberIds? }` |
| GET/PATCH/DELETE | `/api/channels/:id` | read · update/archive (MODERATOR+) · delete (ADMIN+) |
| POST/DELETE | `/api/channels/:id/join` | join / leave a public channel |
| GET | `/api/channels/:id/members` | channel members (mention autocomplete) |
| GET | `/api/channels/:id/pins` | pinned messages |
| POST | `/api/channels/:id/read` | mark read — broadcasts read receipt |
| POST | `/api/channels/:id/typing` | broadcast "typing…" (rate limited) |

## Messages

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/channels/:id/messages?cursor=&limit=` | cursor-paginated history (newest first) |
| POST | `/api/channels/:id/messages` | send `{ content, parentId?, attachmentIds?, mentionedUserIds? }` |
| PATCH/DELETE | `/api/messages/:id` | edit (author) · soft-delete (author or MODERATOR+) |
| POST | `/api/messages/:id/reactions` | toggle reaction `{ emoji }` |
| POST | `/api/messages/:id/pin` | toggle pin |
| GET | `/api/messages/:id/thread` | thread root + replies |

## Direct messages

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/workspaces/:id/conversations` | my DM conversations (other member, last message, unread count) |
| POST | `/api/workspaces/:id/conversations` | open/reuse DM `{ userId }` |
| POST | `/api/conversations/:channelId/archive` | hide a conversation for me |

DMs are `Channel` rows with `type = DM`, so the message endpoints above work unchanged.

## Files, search, notifications, realtime

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/upload` | multipart `file` → Vercel Blob + Attachment row (images, video, PDF, Office, ZIP, ≤ 25 MB) |
| GET | `/api/workspaces/:id/search?q=&type=&limit=` | workspace-wide search (`all` \| `messages` \| `channels` \| `members` \| `files`) |
| GET/PATCH | `/api/notifications` | list + unread count · mark read `{ ids? }` |
| POST | `/api/pusher/auth` | Pusher private/presence channel authorization |

### Realtime events (Pusher)

| Channel | Events |
| --- | --- |
| `private-channel-{channelId}` | `message:new`, `message:update`, `message:delete`, `reaction:update`, `typing`, `read:update` |
| `private-workspace-{workspaceId}` | `message:new` (sidebar badges), `channel:update`, `member:update` |
| `private-user-{userId}` | `notification` |
| `presence-workspace-{workspaceId}` | online presence |
