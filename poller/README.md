# AI chat with Claude on the VPS (Claude Max plan)

The AI tab's chat can be answered by **Claude Code CLI running on our VPS**, logged in to the Claude Max plan,
instead of Gemini. Netlify and Firebase stay as they are; the VPS only makes outbound connections.

```
Teacher's browser ──POST /api/qa-chat──► Netlify function ──► Firestore ai_jobs/{id}  (status: pending)
        ▲                                                           │
        └──GET /api/qa-chat?job=<id> every 2 s ◄────────────────────┤
                                                                    ▼
                         VPS: gyan-seedhi-poller (this folder) watches pending jobs, claims one,
                         runs `claude -p` (no built-in tools, JSON answer), writes the answer back
```

- One job = one AI turn. The browser still runs the tools (murli fetch, question list, proposal cards with
  Apply / Cancel) exactly as before; only the "ask the AI for the next turn" step goes through the queue.
- `server/claudeTurn.js` turns the chat into a transcript + a JSON schema of the answer (`text` + `tool_calls`,
  each tool with its exact input schema) and reads Claude's answer back into chat blocks.
- Only the Admin SDK touches `ai_jobs`, `ai_workers` and `ai_meta`; the browser never does, so `firestore.rules`
  are unchanged (they deny anything not listed, including these collections).
- `ai_workers/<host>` is the poller's heartbeat (every 20 s). If no poller has written one in 90 s, the chat says
  "the AI computer (VPS) is not connected" at once instead of waiting.
- A daily cap (`AI_DAILY_TURNS`, default 400 turns, all chats together, India date) stops a runaway loop from
  using up the Max plan. Jobs older than 2 days are deleted by the poller.
- Translation (`/api/translate`) still uses Gemini.

## Switch the chat to Claude (Netlify)

Site configuration → Environment variables:

| Variable | Value |
|---|---|
| `AI_PROVIDER` | `claude-vps` (remove it to go back to Gemini) |
| `FIREBASE_SERVICE_ACCOUNT` | the whole service-account JSON (one line is fine) |
| `AI_DAILY_TURNS` | optional, default `400` |

Then redeploy the site. The chat header shows **Claude** when this is on.

The service account: Firebase console → Project settings → Service accounts → **Generate new private key**.
It is a secret: put it only in Netlify and on the VPS, never in git.

## Install on the VPS (once)

```bash
# code (only these files are needed on the VPS)
mkdir -p ~/gyan-seedhi/server ~/gyan-seedhi/poller ~/.config/gyan-seedhi
#   copy poller/{poller.mjs,package.json} and server/{claudeTurn.js,qaPrompt.js,languageRules.js}
cd ~/gyan-seedhi/poller && npm install --omit=dev

# secrets (chmod 600)
#   ~/.config/gyan-seedhi/service-account.json   the Firebase key
#   ~/.config/gyan-seedhi/poller.env:
#     GOOGLE_APPLICATION_CREDENTIALS=/home/radhikas/.config/gyan-seedhi/service-account.json
#     CLAUDE_CODE_OAUTH_TOKEN=<from `claude setup-token`>
#     CLAUDE_MODEL=sonnet
#     POLLER_CONCURRENCY=2

sudo cp gyan-seedhi-poller.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now gyan-seedhi-poller
journalctl -u gyan-seedhi-poller -f        # "job … done in 9.8 s · tools offer_questions"
```

After changing `server/qaPrompt.js` (the AI's instructions) or `server/claudeTurn.js`, copy them to the VPS too
and `sudo systemctl restart gyan-seedhi-poller` — the poller reads the instructions from there.

## Notes

- Each turn starts `claude` fresh: about 4 s for a short reply, about 10 s for a set of questions from a murli.
- Each slot has its own `CLAUDE_CONFIG_DIR` under `~/.gyan-seedhi-poller/`, so it never touches the Anna poller's
  Claude sessions. Both share the Max plan's usage limits; when the limit is reached the chat says Claude is busy.
- A Max plan is a personal subscription; check Anthropic's terms for using it behind an app.
- Testing: `CLAUDE_BIN` may point to a `.mjs` stand-in, and `FIRESTORE_EMULATOR_HOST` makes both the Netlify code
  and the poller use the Firestore emulator.
