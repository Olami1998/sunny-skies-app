import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENWEATHERMAP_API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");
const BASE_URL = "https://api.openweathermap.org";
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

const DEFAULT_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:5173",
  "https://weather-app-psi-three-gdnqfaj3gh.vercel.app",
  "https://olami1998.github.io",
];

const extraOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set([...DEFAULT_ORIGINS, ...extraOrigins]);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function originAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowOrigin = origin && originAllowed(origin) ? origin : "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

function parseCoord(value: string | null, min: number, max: number): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function localDateKey(unixSeconds: number, timezoneOffset: number): string {
  return new Date((unixSeconds + timezoneOffset) * 1000).toISOString().slice(0, 10);
}

function localHour(unixSeconds: number, timezoneOffset: number): number {
  return new Date((unixSeconds + timezoneOffset) * 1000).getUTCHours();
}

function localSecondsOfDay(unixSeconds: number, timezoneOffset: number): number {
  const local = unixSeconds + timezoneOffset;
  return ((local % 86400) + 86400) % 86400;
}

function localMidnightUnix(unixSeconds: number, timezoneOffset: number): number {
  const local = unixSeconds + timezoneOffset;
  return local - (((local % 86400) + 86400) % 86400) - timezoneOffset;
}

function sunForDay(
  dayUnix: number,
  referenceSunrise: number,
  referenceSunset: number,
  timezoneOffset: number,
): { sunrise: number; sunset: number } {
  const midnight = localMidnightUnix(dayUnix, timezoneOffset);
  return {
    sunrise: midnight + localSecondsOfDay(referenceSunrise, timezoneOffset),
    sunset: midnight + localSecondsOfDay(referenceSunset, timezoneOffset),
  };
}

function estimateUvi(lat: number, unixSeconds: number, timezoneOffset: number, clouds: number): number {
  const date = new Date((unixSeconds + timezoneOffset) * 1000);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const decl = (23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180)) * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const hourAngle = (hour - 12) * 15 * Math.PI / 180;
  const elevation = Math.asin(
    Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle),
  );
  if (elevation <= 0) return 0;
  const clearSky = 11 * Math.sin(elevation);
  const cloudFactor = 1 - (Math.min(100, Math.max(0, clouds)) / 100) * 0.65;
  return Math.round(Math.max(0, clearSky * cloudFactor) * 10) / 10;
}

function getDailyForecast(forecastList: any[], timezoneOffset: number) {
  const dailyMap = new Map<string, any>();

  for (const item of forecastList) {
    const key = localDateKey(item.dt, timezoneOffset);
    const hour = localHour(item.dt, timezoneOffset);
    const pop = typeof item.pop === "number" ? item.pop : 0;

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        dt: item.dt,
        temp: {
          min: item.main.temp_min,
          max: item.main.temp_max,
          day: item.main.temp,
          night: item.main.temp,
        },
        feels_like: {
          day: item.main.feels_like,
          night: item.main.feels_like,
        },
        humidity: item.main.humidity,
        weather: item.weather,
        pop,
        sunrise: 0,
        sunset: 0,
        uvi: 0,
        wind_speed: item.wind?.speed ?? 0,
        _clouds: item.clouds?.all ?? 0,
        _noonDelta: Math.abs(hour - 12),
        _nightDelta: Math.abs(hour - 21),
      });
    } else {
      const existing = dailyMap.get(key);
      existing.temp.min = Math.min(existing.temp.min, item.main.temp_min);
      existing.temp.max = Math.max(existing.temp.max, item.main.temp_max);
      existing.pop = Math.max(existing.pop, pop);
      existing.wind_speed = Math.max(existing.wind_speed, item.wind?.speed ?? 0);
      existing.humidity = Math.max(existing.humidity, item.main.humidity);

      const noonDelta = Math.abs(hour - 12);
      if (noonDelta < existing._noonDelta) {
        existing._noonDelta = noonDelta;
        existing.temp.day = item.main.temp;
        existing.feels_like.day = item.main.feels_like;
        existing.weather = item.weather;
        existing.dt = item.dt;
        existing._clouds = item.clouds?.all ?? existing._clouds;
      }

      const nightDelta = Math.abs(hour - 21);
      if (nightDelta < existing._nightDelta) {
        existing._nightDelta = nightDelta;
        existing.temp.night = item.main.temp;
        existing.feels_like.night = item.main.feels_like;
      }
    }
  }

  return Array.from(dailyMap.values()).map(({ _noonDelta, _nightDelta, _clouds, ...day }) => ({
    ...day,
    _clouds,
  }));
}

serve(async (req) => {
  const cors = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    if (!cors["Access-Control-Allow-Origin"] && req.headers.get("Origin")) {
      return new Response(null, { status: 403, headers: cors });
    }
    return new Response(null, { headers: cors });
  }

  if (req.method !== "GET") {
    return jsonResponse(req, { error: "Method not allowed" }, 405);
  }

  const origin = req.headers.get("Origin");
  if (origin && !originAllowed(origin)) {
    return jsonResponse(req, { error: "Origin not allowed" }, 403);
  }

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!OPENWEATHERMAP_API_KEY) {
      console.error("OpenWeatherMap API key not configured");
      return jsonResponse(req, { error: "Weather service is not configured" }, 500);
    }

    let apiUrl: string;
    let response: Response;

    switch (action) {
      case "weather": {
        const lat = parseCoord(url.searchParams.get("lat"), -90, 90);
        const lon = parseCoord(url.searchParams.get("lon"), -180, 180);

        if (lat == null || lon == null) {
          return jsonResponse(req, { error: "Invalid lat/lon parameters" }, 400);
        }

        const currentUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;

        const [currentRes, forecastRes] = await Promise.all([
          fetch(currentUrl),
          fetch(forecastUrl),
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
          console.error(
            `OpenWeatherMap weather error: current=${currentRes.status} forecast=${forecastRes.status}`,
          );
          return jsonResponse(req, { error: "Weather provider unavailable" }, 502);
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        const timezoneOffset = currentData.timezone ?? 0;
        const clouds = currentData.clouds?.all ?? 0;
        const sunrise = currentData.sys?.sunrise ?? 0;
        const sunset = currentData.sys?.sunset ?? 0;
        const uvi = estimateUvi(lat, currentData.dt, timezoneOffset, clouds);

        const dailyRaw = getDailyForecast(forecastData.list ?? [], timezoneOffset);
        const todayKey = localDateKey(currentData.dt, timezoneOffset);
        const today = dailyRaw.find((d) => localDateKey(d.dt, timezoneOffset) === todayKey);
        if (today) {
          const curTemp = currentData.main.temp;
          today.temp.min = Math.min(today.temp.min, currentData.main.temp_min ?? curTemp, curTemp);
          today.temp.max = Math.max(today.temp.max, currentData.main.temp_max ?? curTemp, curTemp);
        }

        const transformedData = {
          lat: currentData.coord?.lat ?? lat,
          lon: currentData.coord?.lon ?? lon,
          timezone: timezoneOffset,
          timezone_offset: timezoneOffset,
          current: {
            dt: currentData.dt,
            temp: currentData.main.temp,
            feels_like: currentData.main.feels_like,
            humidity: currentData.main.humidity,
            wind_speed: currentData.wind?.speed ?? 0,
            wind_deg: currentData.wind?.deg ?? 0,
            uvi,
            weather: currentData.weather,
            visibility: currentData.visibility ?? 10000,
            pressure: currentData.main.pressure,
            clouds,
            sunrise,
            sunset,
            rain_1h: currentData.rain?.["1h"] ?? 0,
            snow_1h: currentData.snow?.["1h"] ?? 0,
          },
          hourly: (forecastData.list ?? []).map((item: any) => ({
            dt: item.dt,
            temp: item.main.temp,
            feels_like: item.main.feels_like,
            humidity: item.main.humidity,
            weather: item.weather,
            pop: typeof item.pop === "number" ? item.pop : 0,
            wind_speed: item.wind?.speed ?? 0,
          })),
          daily: dailyRaw.map((day: any) => {
            const { _clouds, ...rest } = day;
            const sun = sunrise && sunset
              ? sunForDay(day.dt, sunrise, sunset, timezoneOffset)
              : { sunrise: 0, sunset: 0 };
            const noon = localMidnightUnix(day.dt, timezoneOffset) + 12 * 3600;
            return {
              ...rest,
              ...sun,
              uvi: estimateUvi(lat, noon, timezoneOffset, _clouds ?? clouds),
            };
          }),
        };

        return jsonResponse(req, transformedData);
      }

      case "geocode": {
        const query = url.searchParams.get("q")?.trim() ?? "";
        if (query.length < 2 || query.length > 80) {
          return jsonResponse(req, { error: "Invalid query parameter" }, 400);
        }

        apiUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OPENWEATHERMAP_API_KEY}`;
        response = await fetch(apiUrl);
        break;
      }

      case "reverse-geocode": {
        const lat = parseCoord(url.searchParams.get("lat"), -90, 90);
        const lon = parseCoord(url.searchParams.get("lon"), -180, 180);

        if (lat == null || lon == null) {
          return jsonResponse(req, { error: "Invalid lat/lon parameters" }, 400);
        }

        apiUrl = `${BASE_URL}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
        response = await fetch(apiUrl);
        break;
      }

      default:
        return jsonResponse(req, { error: "Invalid action. Use: weather, geocode, or reverse-geocode" }, 400);
    }

    if (!response.ok) {
      console.error(`OpenWeatherMap API error: ${response.status}`);
      return jsonResponse(req, { error: "Weather provider unavailable" }, 502);
    }

    const data = await response.json();
    return jsonResponse(req, data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in weather function:", errorMessage);
    return jsonResponse(req, { error: "Weather request failed" }, 500);
  }
});
