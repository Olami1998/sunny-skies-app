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

In the repo: **Settings → Pages → Source → GitHub Actions**. Add Actions secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Local `npm run dev` still uses `/` so it is unchanged.

## Scripts

- `npm run dev` — start the local server
- `npm run build` — production build
- `npm run preview` — preview the production build
