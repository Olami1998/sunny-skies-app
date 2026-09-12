# Sunny Skies

A weather dashboard built with React, TypeScript, Vite, Tailwind CSS, and Supabase Edge Functions. It fetches live conditions from OpenWeatherMap, supports city search, geolocation, saved favorites, and °C/°F.

## Setup

```sh
npm install
npm run dev
```

Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The `weather` Edge Function needs `OPENWEATHERMAP_API_KEY`.

## Scripts

- `npm run dev` — start the local server
- `npm run build` — production build
- `npm run preview` — preview the production build
