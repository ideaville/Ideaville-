# Blocker — Claude Code auth

CLI is installed (`~/.local/bin/claude`, v2.1.296) but **not logged in**.

Complete authentication in a terminal:

```bash
export PATH="$HOME/.local/bin:$PATH"
claude auth login
```

When the browser/OAuth prompt appears, sign in with your Claude account and paste the code back if asked.

After login, confirm with `claude auth status` (`loggedIn: true`), then GrokBot can hand motion + code through `/workspace/shared/ad-pipeline/` and iterate to the polished 10s ad in `exports/`.
