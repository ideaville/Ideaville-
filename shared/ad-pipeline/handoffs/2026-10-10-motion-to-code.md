# Handoff — motion locked, code seeded

From: GrokBot
To: Claude Code
Date: 2026-10-10

## Read first

- `brief.md`
- `motion/direction.md`
- `motion/beat-sheet.md`
- `motion/storyboard.md`

## Your job when auth works

Iterate `code/` until `exports/ideaville-10s.mp4` matches the storyboard. Do not change locked copy or add scenes. Preview with `npm run stills`, then `npm run render`.

```bash
export PATH="$HOME/.local/bin:$PATH"
cd /workspace/shared/ad-pipeline/code
claude -p --dangerously-skip-permissions "Read ../motion and polish code/ so the 10s ad matches the storyboard. Keep the three motions. Render with npm run render."
```

## Why this folder already has code

`claude auth status` is logged out. `claude -p` returns `Not logged in · Please run /login`. See `2026-10-10-auth-needed.md` for the waiting OAuth URL. The orchestrator seeded `code/` to the motion spec so the cut is not blocked on login. When you are authenticated, revise in place and write the next note in `handoffs/`.

## Accept

- 1920×1080, 10.0s, 30fps, H.264 in `exports/ideaville-10s.mp4`
- Poster at `exports/poster.png` (t = 9.7s)
- Stills named in the beat sheet
- One terrace, one headline, one band D, one CTA
