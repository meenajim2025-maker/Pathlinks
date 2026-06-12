# Deploy PathLinks to Vercel

The project is linked to Vercel as **pathlinks-clinical**. Live: https://pathlinks-clinical.vercel.app

## 1. Log in (one-time per machine)

```bash
npx vercel login
```

Use **meenajim2025@gmail.com** when prompted.

## 2. Environment variables

Voice triage needs **`PATHREADY_API_KEY`** on Vercel (Production). Set in Dashboard → Project → Settings → Environment Variables, or:

```bash
printf '%s' 'YOUR_KEY' | npx vercel env add PATHREADY_API_KEY production
```

Local key lives in `.env` (gitignored). Never commit keys.

## 3. Deploy to production (recommended)

**Important:** Vercel CLI 44+ may block deploys when local git author email (`pathlinks@nhs.net`) does not match the Vercel account. Use prebuilt deploy with CLI v43:

```bash
npx vercel pull --yes --environment=production
npx vercel build --yes --prod
npx vercel@43.3.0 deploy --prebuilt --prod --yes
```

## 4. Quick deploy (may be blocked)

```bash
npm run deploy
# or
npx vercel --prod --yes
```

If you see `TEAM_ACCESS_REQUIRED` / deployment **BLOCKED**, use the prebuilt + v43 workflow above, or link GitHub in Vercel Account Settings and add `pathlinks@nhs.net` as a verified secondary email.

## Optional: Deploy token (CI, no browser)

1. [Vercel Dashboard → Tokens](https://vercel.com/account/tokens) → Create Token
2. `VERCEL_TOKEN=your_token npx vercel@43.3.0 deploy --prebuilt --prod --yes`

## After UI changes

Keep root `index.html` in sync with `app/index.html` before deploying.
