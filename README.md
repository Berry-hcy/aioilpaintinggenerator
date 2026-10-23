# Canvasly — AI Oil Painting Generator

A small English-language practice project that turns one uploaded photo into an oil painting with an image editing API.

## Run it on your computer

```bash
npm install
cp .env.example .env.local
```

Fill in the OpenAI and Upstash values in `.env.local`. Keep that file private; it is ignored by Git.

```bash
npm run dev
```

Open <http://localhost:3000>. Use a JPG, PNG, or WebP image up to 4 MB. The generator allows up to three attempts per IP per ten minutes.

## Settings needed for a live deployment

Add these environment variables in Vercel:

- `OPENAI_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SITE_URL=https://aioilpaintinggenerator.store`

The OpenAI and Upstash values are secrets. Never commit them to GitHub or expose them in browser code.

## Routes

- `/` — generator and project information
- `/privacy` — privacy notice
- `/sitemap.xml` — sitemap, built from `SITE_URL`
- `/robots.txt` — crawl rules and sitemap address
- `/api/generate` — server endpoint for image edits
