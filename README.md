# Canvasly — AI Oil Painting Generator

A small English-language practice project that turns one uploaded photo into an oil painting with an image editing API.

## Run it on your computer

```bash
npm install
cp .env.example .env.local
```

Fill in the Cloudflare, Upstash, and Supabase values in `.env.local`. Keep that file private; it is ignored by Git.

```bash
npm run dev
```

Open <http://localhost:3000>. Use a JPG, PNG, or WebP image up to 4 MB. Sign in with Google to receive one free painting credit. Each successful painting uses one credit; failed generations return the credit. The generator also allows up to three attempts per IP per ten minutes.

## Set up Google sign-in and credits

1. Create a Supabase project at <https://supabase.com/>.
2. In Supabase **SQL Editor**, open a new query, paste in `supabase/migrations/202610260001_credit_accounts.sql`, and click **Run**. This creates the account-credit table and the safe functions the site uses to subtract or return credits.
3. In Supabase **Project Settings → API Keys**, copy the Project URL and publishable key. Also copy the secret/service-role key. Put these in `.env.local` using the names in `.env.example`. The secret/service-role key must only go in Vercel's server-side environment variables; never send it in chat, put it in a screenshot, or add it to browser code.
4. In Google Cloud Console, create a project, set up the OAuth consent screen, and create an OAuth client for a **Web application**. In its authorized redirect URLs, add the callback address displayed on Supabase's Google provider setup page.
5. In Supabase **Authentication → Providers → Google**, turn on Google sign-in and paste in the OAuth client ID and secret from Google. Save the changes.
6. In Supabase **Authentication → URL Configuration**, set Site URL to `https://aioilpaintinggenerator.store`. Add `http://localhost:3000/**` and `https://aioilpaintinggenerator.store/**` to Redirect URLs.
7. In Vercel **Project → Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for Production (and Preview if desired). Set `SITE_URL` to `https://aioilpaintinggenerator.store`, then redeploy.
8. In Supabase SQL Editor, run `supabase/migrations/202610260002_waffo_credit_packs.sql` after the first migration. This adds expiring paid-credit lots and the order ledger.

## Set up image generation with Cloudflare Workers AI

1. In the Cloudflare dashboard, open **Workers AI** and find the account ID shown for your account.
2. Open **Manage Account → API Tokens** and create a token with the **Workers AI** permissions needed to run models. Keep it private; never put it in browser code or send it in chat.
3. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to `.env.local` for local development and to Vercel **Project → Settings → Environment Variables** for Production.
4. Redeploy the Vercel project after adding or changing the values.

The site uses Cloudflare model `@cf/black-forest-labs/flux-2-klein-4b` to turn the uploaded photo into an oil-painting style image. The model's free usage is limited by Cloudflare's daily quota; it is not unlimited, and generation can stop when the quota is exhausted. Check Cloudflare's current Workers AI pricing and limits before launch. The input photo is resized in your browser to meet the model's reference-image size limit before it is sent for processing.

## Set up Waffo one-time credit packs

Create and publish two **one-time USD products** in the Waffo dashboard:

- Starter Pack: $4.99
- Value Pack: $14.99

Copy the two product IDs shown by Waffo. In Vercel **Project → Settings → Environment Variables**, set `WAFFO_MERCHANT_ID`, `WAFFO_STORE_ID`, `WAFFO_PRIVATE_KEY`, `WAFFO_PRODUCT_ID_STARTER`, and `WAFFO_PRODUCT_ID_VALUE` for Production. The private key is a secret: enter it only in the Vercel value box and never commit it or send it in chat. Set `WAFFO_MERCHANT_ID` to your merchant ID and `WAFFO_STORE_ID` to the store used by those products.

The merchant, store, and product IDs provided for this site are already wired into the server-side catalog. In Vercel, add `WAFFO_PRIVATE_KEY` using the production API private key. Keep it secret; do not commit it or send it in chat.

In Waffo, add a production webhook pointing to `https://aioilpaintinggenerator.store/api/waffo/webhook` and subscribe to `order.completed` and `refund.succeeded`. The webhook handler verifies Waffo's production signature, store, currency, amount, signed pack metadata, and authenticated buyer before granting credits. Do not grant credits from a browser redirect. Redeploy after adding the Vercel variable.

Paid credits are added only after a verified payment event. Each paid credit creates an HD generation and expires 12 months after purchase. Free and legacy credits create standard-definition generations. When both types are available, paid credits closest to expiration are used first.

## Settings needed for a live deployment

Add these environment variables in Vercel:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SITE_URL=https://aioilpaintinggenerator.store`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WAFFO_PRIVATE_KEY`

The Cloudflare API token, Upstash values, and Supabase service-role value are secrets. Never commit them to GitHub or expose them in browser code. The `NEXT_PUBLIC_` Supabase values are designed to be public; access is controlled by the database's row rules.

## Routes

- `/` — generator and project information
- `/privacy` — privacy notice
- `/login` — Google sign-in
- `/account` — available painting credits and sign-out
- `/payment/success` — payment confirmation status
- `/api/checkout` — authenticated Waffo checkout session
- `/api/waffo/webhook` — signed payment notifications
- `/sitemap.xml` — sitemap, built from `SITE_URL`
- `/robots.txt` — crawl rules and sitemap address
- `/api/generate` — server endpoint for image edits
