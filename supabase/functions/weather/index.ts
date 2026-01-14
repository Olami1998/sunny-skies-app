import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENWEATHERMAP_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
const BASE_URL = 'https://api.openweathermap.org';

// Helper function to aggregate 3-hour forecast data into daily forecasts
function getDailyForecast(forecastList: any[]) {
  const dailyMap = new Map();
  
  for (const item of forecastList) {
    const date = new Date(item.dt * 1000).toDateString();
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        dt: item.dt,
        temp: { min: item.main.temp_min, max: item.main.temp_max },
        weather: item.weather,
        items: [item]
      });
    } else {
      const existing = dailyMap.get(date);
      existing.temp.min = Math.min(existing.temp.min, item.main.temp_min);
      existing.temp.max = Math.max(existing.temp.max, item.main.temp_max);
      existing.items.push(item);
    }
  }
  
  return Array.from(dailyMap.values()).slice(0, 7);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (!OPENWEATHERMAP_API_KEY) {
      console.error('OpenWeatherMap API key not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiUrl: string;
    let response: Response;

    switch (action) {
      case 'weather': {
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');
        
        if (!lat || !lon) {
          return new Response(
            JSON.stringify({ error: 'Missing lat/lon parameters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Use free API endpoints (2.5) instead of One Call 3.0 which requires paid subscription
        const currentUrl = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        const forecastUrl = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        
        console.log(`Fetching weather for lat=${lat}, lon=${lon}`);
        
        const [currentRes, forecastRes] = await Promise.all([
          fetch(currentUrl),
          fetch(forecastUrl)
        ]);

        if (!currentRes.ok) {
          const errorText = await currentRes.text();
          console.error(`OpenWeatherMap current API error: ${currentRes.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ error: `API error: ${currentRes.status}`, details: errorText }),
            { status: currentRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!forecastRes.ok) {
          const errorText = await forecastRes.text();
          console.error(`OpenWeatherMap forecast API error: ${forecastRes.status} - ${errorText}`);
          return new Response(
            JSON.stringify({ error: `API error: ${forecastRes.status}`, details: errorText }),
            { status: forecastRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        // Transform to match the expected format from useWeather hook
        const transformedData = {
          current: {
            dt: currentData.dt,
            temp: currentData.main.temp,
            feels_like: currentData.main.feels_like,
            humidity: currentData.main.humidity,
            wind_speed: currentData.wind.speed,
            uvi: 0, // Not available in free API
            weather: currentData.weather,
            visibility: currentData.visibility,
            pressure: currentData.main.pressure,
          },
          hourly: forecastData.list.slice(0, 24).map((item: any) => ({
            dt: item.dt,
            temp: item.main.temp,
            weather: item.weather,
          })),
          daily: getDailyForecast(forecastData.list),
          timezone_offset: currentData.timezone,
        };

        console.log(`Successfully fetched weather data`);
        return new Response(
          JSON.stringify(transformedData),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'geocode': {
        const query = url.searchParams.get('q');
        
        if (!query) {
          return new Response(
            JSON.stringify({ error: 'Missing query parameter' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        apiUrl = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${OPENWEATHERMAP_API_KEY}`;
        console.log(`Geocoding query: ${query}`);
        
        response = await fetch(apiUrl);
        break;
      }

      case 'reverse-geocode': {
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');
        
        if (!lat || !lon) {
          return new Response(
            JSON.stringify({ error: 'Missing lat/lon parameters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        apiUrl = `${BASE_URL}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHERMAP_API_KEY}`;
        console.log(`Reverse geocoding lat=${lat}, lon=${lon}`);
        
        response = await fetch(apiUrl);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use: weather, geocode, or reverse-geocode' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Successfully fetched data for action: ${action}`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in weather function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
