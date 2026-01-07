import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENWEATHERMAP_API_KEY = Deno.env.get('OPENWEATHERMAP_API_KEY');
const BASE_URL = 'https://api.openweathermap.org';

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

        apiUrl = `${BASE_URL}/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${OPENWEATHERMAP_API_KEY}`;
        console.log(`Fetching weather for lat=${lat}, lon=${lon}`);
        
        response = await fetch(apiUrl);
        break;
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
