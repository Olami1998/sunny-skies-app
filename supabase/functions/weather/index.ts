import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENWEATHERMAP_API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY");
const BASE_URL = "https://api.openweathermap.org";

function localDateKey(unixSeconds: number, timezoneOffset: number): string {
  return new Date((unixSeconds + timezoneOffset) * 1000).toISOString().slice(0, 10);
}

function localHour(unixSeconds: number, timezoneOffset: number): number {
  return new Date((unixSeconds + timezoneOffset) * 1000).getUTCHours();
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
    Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle)
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
      }

      const nightDelta = Math.abs(hour - 21);
      if (nightDelta < existing._nightDelta) {
        existing._nightDelta = nightDelta;
        existing.temp.night = item.main.temp;
        existing.feels_like.night = item.main.feels_like;
      }
    }
  }

  return Array.from(dailyMap.values()).map(({ _noonDelta, _nightDelta, ...day }) => day);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!OPENWEATHERMAP_API_KEY) {
      console.error("OpenWeatherMap API key not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let apiUrl: string;
    let response: Response;

    switch (action) {
      case "weather": {
        const lat = url.searchParams.get("lat");
        const lon = url.searchParams.get("lon");

        if (!lat || !lon) {
          return new Response(
            JSON.stringify({ error: "Missing lat/lon parameters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const currentUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;

        const [currentRes, forecastRes] = await Promise.all([
          fetch(currentUrl),
          fetch(forecastUrl),
        ]);

        if (!currentRes.ok) {
          const errorText = await currentRes.text();
          console.error(`OpenWeatherMap current API error: ${currentRes.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ error: `API error: ${currentRes.status}`, details: errorText }),
            { status: currentRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (!forecastRes.ok) {
          const errorText = await forecastRes.text();
          console.error(`OpenWeatherMap forecast API error: ${forecastRes.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ error: `API error: ${forecastRes.status}`, details: errorText }),
            { status: forecastRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();
        const timezoneOffset = currentData.timezone ?? 0;
        const clouds = currentData.clouds?.all ?? 0;
        const uvi = estimateUvi(Number(lat), currentData.dt, timezoneOffset, clouds);

        const transformedData = {
          lat: currentData.coord?.lat ?? Number(lat),
          lon: currentData.coord?.lon ?? Number(lon),
          timezone: currentData.timezone,
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
            sunrise: currentData.sys?.sunrise ?? 0,
            sunset: currentData.sys?.sunset ?? 0,
            rain_1h: currentData.rain?.["1h"] ?? 0,
            snow_1h: currentData.snow?.["1h"] ?? 0,
          },
          hourly: forecastData.list.map((item: any) => ({
            dt: item.dt,
            temp: item.main.temp,
            feels_like: item.main.feels_like,
            humidity: item.main.humidity,
            weather: item.weather,
            pop: typeof item.pop === "number" ? item.pop : 0,
            wind_speed: item.wind?.speed ?? 0,
          })),
          daily: getDailyForecast(forecastData.list, timezoneOffset).map((day: any) => ({
            ...day,
            sunrise: currentData.sys?.sunrise ?? 0,
            sunset: currentData.sys?.sunset ?? 0,
            uvi,
          })),
        };

        return new Response(
          JSON.stringify(transformedData),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "geocode": {
        const query = url.searchParams.get("q");

        if (!query) {
          return new Response(
            JSON.stringify({ error: "Missing query parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        apiUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OPENWEATHERMAP_API_KEY}`;
        response = await fetch(apiUrl);
        break;
      }

      case "reverse-geocode": {
        const lat = url.searchParams.get("lat");
        const lon = url.searchParams.get("lon");

        if (!lat || !lon) {
          return new Response(
            JSON.stringify({ error: "Missing lat/lon parameters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        apiUrl = `${BASE_URL}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
        response = await fetch(apiUrl);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: weather, geocode, or reverse-geocode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in weather function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
