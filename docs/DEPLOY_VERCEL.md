# Deploy PathLinks to Vercel

The project is already linked to Vercel as **pathlinks-clinical**. To push updates:

## 1. Log in to Vercel (one-time)

In your terminal, from the project root:

```bash
npx vercel login
```

Use **meenajim2025@gmail.com** when prompted. The CLI will open a browser or give you a link to authenticate.

## 2. Deploy to production

```bash
npm run deploy
```

or:

```bash
npx vercel --prod
```

Your live app will be at the URL Vercel shows (e.g. `pathlinks-clinical.vercel.app` or your custom domain).

## Optional: Deploy token (CI or no browser)

1. Go to [Vercel Dashboard](https://vercel.com/account/tokens) → **Create Token**.
2. Set the token when deploying:
   ```bash
   VERCEL_TOKEN=your_token_here npx vercel --prod
   ```
   Or add `VERCEL_TOKEN` to your environment so you don’t need to log in each time.
