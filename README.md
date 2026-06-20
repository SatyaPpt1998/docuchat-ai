# DocuChat AI — Deployment Guide

## ✅ Testing locally (right now)

Just double-click `index.html` to open it in your browser — login, signup,
document upload, and history **all work fully offline**, no server needed.

- **Sign up** with any email/username + password (min 4 characters) — name
  and an optional phone number are also collected.
- **Log in** again later with the same credentials — your account is saved
  in the browser's `localStorage`.
- Upload a document, ask questions, then check the **History** tab — your
  session is saved automatically and reloads when clicked.
- **Continue as guest** also works, but guest sessions are never saved.

⚠️ **Important — read this before going further:** the chatbot itself
(answering questions about your documents) calls the Anthropic API directly
from the browser using `USE_PROXY = false`. This requires you to either
temporarily paste a personal API key into the fetch call for testing, or —
better — skip straight to Step 3 below to wire up the secure proxy. Never
ship a public site with a real API key sitting in browser-visible code.

---

## 🚀 Deploy to Netlify in 5 minutes

### Step 1 — Upload to GitHub
1. Create a new repo on github.com
2. Upload all these files (drag-drop works on GitHub)
3. Commit

### Step 2 — Connect Netlify
1. Go to app.netlify.com → "Add new site" → "Import from Git"
2. Choose your GitHub repo
3. Build settings are auto-detected from `netlify.toml`
4. Click **Deploy**

### Step 3 — Add your API key (IMPORTANT)
1. In Netlify dashboard → Site settings → Environment variables
2. Add: `ANTHROPIC_API_KEY` = your key from console.anthropic.com
3. Redeploy

### Step 4 — Switch to secure proxy mode
In `index.html`, change:
```js
const USE_PROXY = false;
```
to:
```js
const USE_PROXY = true;
```
Push to GitHub — Netlify auto-redeploys. Now your API key never touches
the browser; `netlify/functions/chat.js` handles it server-side.

---

## 🔐 About login & history (current vs. production)

**Right now**, accounts and chat history are stored in the browser's
`localStorage`. This is genuinely useful for testing and even for a small
real userbase, but it has real limits you should know before you start
charging money for this:

| Limitation | Why it matters |
|---|---|
| Per-device only | A user who logs in on their phone won't see history from their laptop |
| No password recovery | If someone forgets their password, there's no "reset" — `localStorage` can't send emails |
| Cleared if browser data is cleared | Clearing cookies/site data wipes accounts and history |
| Not secure for sensitive data | Password hashing here is a lightweight fallback, not bank-grade |

**This is fine to launch and test with.** But once you're taking real
signups and money, migrate to a proper auth backend — the easiest is
**Supabase** (free tier, ~15 min setup):

1. Create a free project at supabase.com
2. Enable **Email** auth (on by default) and **Google** auth (Auth → Providers)
3. For **phone/SMS login**, you'll additionally need a Twilio account — SMS
   has a small per-message cost, so budget for that before enabling it
4. Replace the `sha256`/`getAccounts`/`loginAs` functions in `index.html`
   with calls to `supabase.auth.signUp()`, `signInWithPassword()`, and
   `signInWithOtp()` (full docs: supabase.com/docs/guides/auth)
5. Swap the `localStorage`-based history functions for Supabase's database
   (a `sessions` table keyed by `user_id`) so history syncs across devices

Ask me to do this migration for you when you're ready to launch publicly —
it's a contained change and I can wire it up end-to-end.

---

## 💰 Monetisation Ideas

| Model | How |
|---|---|
| **Freemium** | Free: 5 docs/day · Paid: unlimited. Use Stripe + auth |
| **Pay-per-use** | Charge per doc or per question. Stripe Checkout |
| **SaaS subscription** | $9/mo personal · $29/mo team. Use Lemon Squeezy |
| **White-label** | Sell to businesses who want their own branded chatbot |
| **API reselling** | Mark up Anthropic API cost (typical: 3–5×) |

## 🛠 Tech Stack
- Frontend: Pure HTML/CSS/JS (no framework — fast & deployable anywhere)
- PDF parsing: PDF.js (Mozilla)
- DOCX parsing: Mammoth.js
- AI: Claude claude-sonnet-4-6 via Anthropic API
- Hosting: Netlify (free tier works)
- Serverless proxy: Netlify Functions (Node.js) for the AI calls
- Auth + history: localStorage today → Supabase recommended before public launch
