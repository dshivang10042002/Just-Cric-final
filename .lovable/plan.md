# Cricket app — 4 feature additions

I'll ship these **one at a time** so each is testable. After each feature I'll pause for you to try it before moving on.

---

## Feature 1 — Invite-only team joining (phone / link / QR)

Today any captain can free-form type a player name into `team_members`. We replace that with 3 invite paths only.

**Schema changes** (one migration):
- `profiles.phone` (text, unique, nullable) + index. Users add it on Profile page.
- `team_members.user_id` (uuid, nullable, FK → auth.users) — links a roster spot to a real account.
- `team_invites` table — `id, team_id, invited_by, phone (nullable), token (uuid), status (pending|accepted|expired), created_at, expires_at, accepted_by, accepted_at`.
- RLS: owner can create invites for own team; invitee (or anyone with token) can accept; team_members insert allowed only when (a) owner inserts with linked invite, or (b) self-insert via valid token / matching phone.

**UI changes**:
- `teams/$teamId` "Add player" panel → 3 tabs:
  1. **By phone** — captain enters number. If a profile with that phone exists → invite auto-accepted, player added. Else → pending invite created, captain copies the personalised link.
  2. **Share link** — shows `https://app/join-team?code=<team.join_code>`, copy button.
  3. **QR code** — same link rendered as QR (using `qrcode` npm package).
- `join-team?code=…` — accept flow (already partly exists, will be tightened).
- Profile page — add phone input.

Free-form "add player by name" is removed (per your requirement).

---

## Feature 2 — City-wise team rankings

- New route `/rankings` (and link in nav).
- Server function aggregates per team: matches played, wins, losses, win %, grouped by `teams.city`.
- City selector dropdown + "All cities" view. Sorted by matches played desc, wins as tiebreaker.

No schema change — derived from existing `matches` + `teams`.

---

## Feature 3 — Cricbuzz-style live match dashboard

Refactor `match/$matchId` into a tabbed view:
- **Live** — current score, current batters/bowler, last 6 balls, run-rate, required rate (chase).
- **Scorecard** — full batting + bowling tables, fall of wickets, extras breakdown, per-innings.
- **Commentary** — ball-by-ball feed (auto-generated from `balls` rows, newest first).
- **Summary** — match result, top performers, key moments (50s/100s, wickets in over).
- **Squads** — both team rosters.
- Realtime subscription to `balls` + `innings` so the Live tab updates as the scorer adds balls. Cricbuzz-style sticky header with score + overs.

---

## Feature 4 — Follow system (teams + players)

**Schema** (one migration):
- `follows` table — `id, follower_id, entity_type ('team'|'player'), entity_id, created_at`, unique(follower_id, entity_type, entity_id). RLS: users manage own rows; counts readable by all.

**UI**:
- Follow / Unfollow button on team page and player page, with follower count.
- New `/feed` route — chronological list of recent matches and milestones (50s, 5-fers, wins) from followed teams/players.
- `/my-follows` section in profile listing who you follow.

---

## Technical notes

- All new tables get explicit `GRANT` statements (RLS alone is not enough on this template).
- All queries scoped via existing RLS patterns (`auth.uid()`); `has_role` not needed here.
- QR generation client-side with `qrcode` (lightweight, no service).
- Live dashboard uses Supabase Realtime channels filtered by `match_id`.
- Nothing about Vercel/Render deploy config changes — your existing `vercel.json` / `render.yaml` keep working.

---

## Order & checkpoints

1. **Build Feature 1 now** → you test invite flow → I continue.
2. Feature 2 (rankings).
3. Feature 3 (live dashboard) — the largest of the four.
4. Feature 4 (follow system).

Approve and I'll start with Feature 1.
