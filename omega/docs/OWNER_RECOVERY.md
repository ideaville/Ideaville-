# Owner one-use recovery (staging preview)

**Status:** Implemented in branch code; **not deployed** until separate owner approval.

## What it does
- Updates `password_hash` **only** for fixed admin `85929a87-fd66-4633-aa97-c4bb6e8ea8de`
- Deletes that user’s sessions
- One-use claim stored in existing `settings` key `__omega_owner_recovery` (no new migration)
- Does **not** auto-login; owner uses `/login` afterward
- Password and recovery authorization entered only in the HTTPS form (`/recover`)
- Targets **existing** admin id only; does not create/recreate users; bootstrap `newId()` unchanged
- Requires **Postgres** store on preview (no memory fallback)
- Consumed marker in `settings.__omega_owner_recovery` is durable; **secret rotation alone does not reopen** — owner must explicitly delete that settings row (separate approval) before another grant
- In-process rate limit is **not** distributed across serverless isolates (residual; secret entropy is primary control)

## Fail-closed gates (all required)
1. `OMEGA_ALLOW_OWNER_RECOVERY=1`
2. `VERCEL_ENV=preview` (production always denied)
3. `OMEGA_OWNER_RECOVERY_SECRET` — owner-generated, ≥24 chars, set in **Vercel UI** only (never chat)
4. `OMEGA_OWNER_RECOVERY_EXPIRES_AT` — ISO-8601, must be in the future and within **48h** server max TTL

After success, replay fails even if the secret is rotated. Re-enable only by deleting `__omega_owner_recovery` (explicit owner SQL) then setting a new short-lived grant env.

## Owner provisioning (future approval — do not set yet without deploy approval)
1. Approve deploy of this code to protected preview.
2. In Vercel → omega-staging → Settings → Environment Variables (**Preview**):
   - Generate secret locally (`openssl rand -base64 32`) — paste into Vercel UI only
   - Set `OMEGA_ALLOW_OWNER_RECOVERY=1`
   - Set `OMEGA_OWNER_RECOVERY_EXPIRES_AT` to a short window (e.g. +2 hours ISO UTC)
3. Redeploy preview so env is live.
4. Open protected `/recover` on iPhone/Safari, enter authorization + new password + confirm.
5. Sign in at `/login`. Confirm `/admin`.
6. Immediately clear/disable: remove `OMEGA_ALLOW_OWNER_RECOVERY` or set to `0`, rotate/delete recovery secret, redeploy.

## Explicit non-goals
Does not prove historical login root cause. Does not change protection, payments, activation, or production.
