# Canvasly — AI Oil Painting Generator

A small English-language practice project that turns one uploaded photo into an oil painting with an image editing API.

## Run it on your computer

```bash
npm install
cp .env.example .env.local
```

Fill in the OpenAI, Upstash, and Supabase values in `.env.local`. Keep that file private; it is ignored by Git.

```bash
npm run dev
```

Open <http://localhost:3000>. Use a JPG, PNG, or WebP image up to 4 MB. Sign in with Google to receive one free painting credit. Each successful painting uses one credit; failed generations return the credit. The generator also allows up to three attempts per IP per ten minutes.

## Set up Google sign-in and free credits

1. Create a Supabase project at <https://supabase.com/>.
2. In Supabase **SQL Editor**, open a new query, paste in `supabase/migrations/202610260001_credit_accounts.sql`, and click **Run**. This creates the account-credit table and the safe functions the site uses to subtract or return credits.
3. In Supabase **Project Settings → API Keys**, copy the Project URL and publishable key. Also copy the secret/service-role key. Put these in `.env.local` using the names in `.env.example`. The secret/service-role key must only go in Vercel's server-side environment variables; never send it in chat, put it in a screenshot, or add it to browser code.
4. In Google Cloud Console, create a project, set up the OAuth consent screen, and create an OAuth client for a **Web application**. In its authorized redirect URLs, add the callback address displayed on Supabase's Google provider setup page.
5. In Supabase **Authentication → Providers → Google**, turn on Google sign-in and paste in the OAuth client ID and secret from Google. Save the changes.
6. In Supabase **Authentication → URL Configuration**, set Site URL to `https://aioilpaintinggenerator.store`. Add `http://localhost:3000/**` and `https://aioilpaintinggenerator.store/**` to Redirect URLs.
7. In Vercel **Project → Settings → Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for Production (and Preview if desired). Set `SITE_URL` to `https://aioilpaintinggenerator.store`, then redeploy.

Until the Supabase and Google settings are complete, sign-in and generation will not work. Paid credit packages and checkout are not connected yet; they depend on the Waffo account type and package prices.

## Settings needed for a live deployment

Add these environment variables in Vercel:

- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SITE_URL=https://aioilpaintinggenerator.store`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The OpenAI, Upstash, and Supabase service-role values are secrets. Never commit them to GitHub or expose them in browser code. The `NEXT_PUBLIC_` Supabase values are designed to be public; access is controlled by the database's row rules.

## Routes

- `/` — generator and project information
- `/privacy` — privacy notice
- `/login` — Google sign-in
- `/account` — available painting credits and sign-out
- `/sitemap.xml` — sitemap, built from `SITE_URL`
- `/robots.txt` — crawl rules and sitemap address
- `/api/generate` — server endpoint for image edits
