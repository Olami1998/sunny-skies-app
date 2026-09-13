# Sunny Skies

A weather dashboard built with React, TypeScript, Vite, Tailwind CSS, and Supabase Edge Functions. It fetches live conditions from OpenWeatherMap, supports city search, geolocation, saved favorites, and °C/°F.

## Setup

```sh
npm install
npm run dev
```

Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The `weather` Edge Function needs `OPENWEATHERMAP_API_KEY`.

## GitHub Pages

The UI deploys from `main` via GitHub Actions to `https://olami1998.github.io/sunny-skies-app/`. Weather data still comes from the Supabase Edge Function.

Pages must be turned on before the first deploy: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then add Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Local `npm run dev` still uses `/` so it is unchanged.

On Vercel, set the same `VITE_` variables in Project Settings → Environment Variables and redeploy. Vite only reads them at build time. If they are missing, weather requests go to `/undefined/functions/v1/weather` and the UI shows “Unable to load weather”.

## Scripts

- `npm run dev` — start the local server
- `npm run build` — production build
- `npm run preview` — preview the production build
