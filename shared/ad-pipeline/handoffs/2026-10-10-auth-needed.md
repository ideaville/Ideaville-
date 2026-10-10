# Blocker — Claude Code auth

CLI is installed (`~/.local/bin/claude`, v2.1.296) but **not logged in**.

Complete authentication in a terminal:

```bash
export PATH="$HOME/.local/bin:$PATH"
claude auth login
```

A login is already waiting in tmux session `claude-auth` (started on this machine). If the browser did not open, finish it by visiting this exact URL, signing in with your Claude account, and pasting the returned code into that waiting prompt:

```
https://claude.com/cai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fplatform.claude.com%2Foauth%2Fcode%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference+user%3Asessions%3Aclaude_code+user%3Amcp_servers+user%3Afile_upload+user%3Aplugins&code_challenge=JkdgqlmWWVy46YnqvXD7ZYncE-It3Spbfm0OW8mcYTc&code_challenge_method=S256&state=eFdUHybTllEvvHN5ytBagYif0_JREt91sAs21ykpKec
```

Non-interactive check from this session: `claude -p` returns `Not logged in · Please run /login`. No `ANTHROPIC_API_KEY` is set. The PKCE verifier lives only in that waiting process; if it exits, run `claude auth login` again (the URL above will no longer match).

After login, confirm with `claude auth status` (`loggedIn: true`), then GrokBot can hand motion + code through `/workspace/shared/ad-pipeline/` and iterate to the polished 10s ad in `exports/`.
