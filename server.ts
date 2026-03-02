import express from "express";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Dynamic import for Vite to avoid loading it in production
let createViteServer: any = null;
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    const viteModule = await import("vite");
    createViteServer = viteModule.createServer;
  } catch (e) {
    console.warn("Vite not found, skipping dev server setup.");
  }
}

try {
  dotenv.config();
} catch (e) {
  console.warn("Dotenv config failed (expected in some environments)");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sanitizeEnv = (val: string | undefined) => {
  if (!val) return val;
  return val.trim().replace(/^['"]|['"]$/g, "");
};

const app = express();
const PORT = 3000;

// --- Health Check (Top Level) ---
app.get("/api/health", (req, res) => {
  console.log("Health check requested");
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: {
      hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasAppUrl: !!process.env.APP_URL,
      nodeEnv: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL
    }
  });
});

// Supabase Setup
const supabaseUrl = sanitizeEnv(process.env.VITE_SUPABASE_URL);
const supabaseServiceKey = sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

const isValidUrl = (url: string | undefined) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

if (!isValidUrl(supabaseUrl) || !supabaseServiceKey) {
  console.warn("INVALID OR MISSING SUPABASE CREDENTIALS. Server may not function correctly.");
}

const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl! : "https://placeholder.supabase.co", 
  supabaseServiceKey || "placeholder"
);

console.log("Server initializing...", {
  supabaseUrl: isValidUrl(supabaseUrl) ? "VALID" : "INVALID/MISSING",
  hasServiceKey: !!supabaseServiceKey,
  hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
  appUrl: process.env.APP_URL
});

// Google OAuth Setup
const getOAuth2Client = (redirectUri?: string) => {
  const clientId = sanitizeEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = sanitizeEnv(process.env.GOOGLE_CLIENT_SECRET);
  const appUrl = sanitizeEnv(process.env.APP_URL);

  if (!clientId || !clientSecret) {
    console.warn("MISSING GOOGLE OAUTH CREDENTIALS. Google features will be disabled.");
    return null;
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri || (appUrl ? `${appUrl}/auth/callback` : undefined)
  );
};

const oauth2Client = getOAuth2Client();

app.use(express.json());
app.use(
  cookieSession({
    name: "session",
    keys: [sanitizeEnv(process.env.SESSION_SECRET) || "default-secret"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // Required for SameSite=None in iframe
    sameSite: "none", // Required for iframe
  })
);

// --- Health Check ---
// (Moved to top)

app.get("/api/profile", async (req, res) => {
  console.log("Profile fetch requested");
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Try to find a google_id from identities or metadata
      const googleId = user.identities?.find(i => i.provider === 'google')?.id || 
                       user.user_metadata?.sub || 
                       user.id;

      const { data: newProfile, error: createError } = await supabase
        .from("users")
        .upsert({ 
          id: user.id, 
          email: user.email,
          google_id: googleId 
        })
        .select()
        .single();
      
      if (createError) throw createError;
      return res.json({ 
        ...newProfile, 
        full_name: newProfile.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: newProfile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
        city: user.user_metadata?.city || "São Luís" 
      });
    }

    res.json({ 
      ...data, 
      full_name: data.full_name || user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: data.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
      city: user.user_metadata?.city || "São Luís",
      dashboard_layouts: user.user_metadata?.dashboard_layouts
    });
  } catch (error: any) {
    console.error("Error in /api/profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- Auth Routes ---

app.post("/api/auth/sync-google", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { provider_token, provider_refresh_token } = req.body;

    const updateData: any = {
      id: user.id,
      email: user.email,
      google_email: user.email,
      google_id: user.identities?.find(i => i.provider === 'google')?.id || user.id
    };

    if (provider_refresh_token) {
      console.log(`[SYNC] Syncing Google refresh token for user: ${user.id}`);
      updateData.google_refresh_token = provider_refresh_token;
    }

    const { error } = await supabase
      .from("users")
      .upsert(updateData, { onConflict: 'id' });
    
    if (error) {
      console.error("[SYNC] Error upserting tokens in Supabase:", error);
      throw error;
    }
    
    // Also update session for immediate use
    if (provider_token) {
      if (!req.session) {
        console.warn("[SYNC] req.session is missing, cannot store tokens in session.");
      } else {
        req.session.tokens = {
          access_token: provider_token,
          refresh_token: provider_refresh_token || req.session.tokens?.refresh_token,
          token_type: "Bearer",
          expiry_date: Date.now() + 3600 * 1000 // Assume 1 hour
        };
      }
    }
    console.log("[SYNC] Tokens synced successfully.");

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/auth/sync-google:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  console.log("Logging out user, clearing session.");
  req.session = null;
  res.json({ success: true });
});

app.get("/api/auth/url", (req, res) => {
  const { userId } = req.query;
  const client = getOAuth2Client();
  if (!client) {
    return res.status(500).json({ error: "Google OAuth not configured" });
  }
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state: userId as string,
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query; 
  const userId = state as string;
  const client = getOAuth2Client();

  if (!client) {
    console.error("Google OAuth client not initialized in callback");
    return res.status(500).send("Authentication failed: Server misconfigured");
  }

  try {
    console.log(`Received callback for user: ${userId}`);
    const { tokens } = await client.getToken(code as string);
    
    if (!tokens.refresh_token) {
      console.warn("CRITICAL: No refresh_token received from Google. Connection may not persist or activate.");
    } else {
      console.log("Refresh token received successfully.");
    }
    
    req.session!.tokens = tokens;

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const userInfo = await oauth2.userinfo.get();
    console.log(`Google user info: ${userInfo.data.email}`);

    if (userId) {
      const updateData: any = {
        google_email: userInfo.data.email,
        google_id: userInfo.data.id || (userInfo.data as any).sub
      };
      
      if (tokens.refresh_token) {
        updateData.google_refresh_token = tokens.refresh_token;
      }

      console.log("Upserting Supabase user", userId, "with:", updateData);

      const { data, error } = await supabase.from("users")
        .upsert({
          id: userId,
          email: userInfo.data.email, // Include email in case it's a new record
          ...updateData
        })
        .select();
      
      if (error) {
        console.error("Error updating tokens in Supabase:", error.message || error);
        console.error("Full error object:", JSON.stringify(error, null, 2));
      } else {
        console.log("Supabase upsert result:", data);
      }
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Connection successful! This window will close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error in Google callback:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/profile/metadata", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No authorization header" });

  try {
    const metadata = req.body;
    const token = authHeader.replace("Bearer ", "");
    
    // 1. Verify the user's token using the service role client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error verifying token:", authError);
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    // 2. Update the user's metadata using the admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: { ...user.user_metadata, ...metadata } }
    );

    if (updateError) throw updateError;

    // 3. Also update the users table for consistency if city or other fields are present
    if (metadata.city || metadata.full_name) {
      const updateData: any = {};
      if (metadata.city) updateData.city = metadata.city;
      if (metadata.full_name) updateData.full_name = metadata.full_name;
      
      await supabase.from("users").update(updateData).eq("id", user.id);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error updating metadata:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper for robust fetching with timeout and http fallback
async function robustFetch(url: string, options: any = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout
  
  try {
    const response = await fetch(url, { 
      ...options, 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // If it's an SSL error or fetch failed, try HTTP fallback if it was HTTPS
    if (url.startsWith('https://') && (error.message?.includes('SSL') || error.message?.includes('fetch failed') || error.name === 'AbortError' || error.message?.includes('packet length too long'))) {
      console.warn(`[FETCH] HTTPS failed for ${url}, trying HTTP fallback...`, error.message);
      const httpUrl = url.replace('https://', 'http://');
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 12000);
      try {
        const fallbackResponse = await fetch(httpUrl, { 
          ...options, 
          signal: fallbackController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            ...(options.headers || {})
          }
        });
        clearTimeout(fallbackTimeoutId);
        return fallbackResponse;
      } catch (fallbackError: any) {
        clearTimeout(fallbackTimeoutId);
        throw fallbackError;
      }
    }
    throw error;
  }
}

app.get("/api/weather", async (req, res) => {
  const city = req.query.city as string || "São Luís";
  try {
    // 1. Geocode city to get lat/lon and timezone
    const searchQuery = city.toLowerCase().includes("brasil") || city.toLowerCase().includes(", br") 
      ? city 
      : `${city}, Brasil`;
      
    console.log(`[WEATHER] Searching for: ${searchQuery}`);
    const geoRes = await robustFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=pt&format=json`);
    if (!geoRes.ok) throw new Error("Geocoding service unavailable");
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      // Try one more time without the "Brasil" suffix if it failed
      const retryRes = await robustFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`);
      const retryData = await retryRes.json();
      if (!retryData.results || retryData.results.length === 0) {
        console.warn(`[WEATHER] City "${city}" not found, falling back to São Luís...`);
        // Use hardcoded coordinates for São Luís as a final fallback
        geoData.results = [{
          latitude: -2.52972,
          longitude: -44.30278,
          timezone: "America/Sao_Paulo",
          name: "São Luís",
          admin1: "Maranhão",
          country: "Brasil"
        }];
      } else {
        geoData.results = retryData.results;
      }
    }
    
    const { latitude, longitude, timezone, name, admin1, country } = geoData.results[0];
    console.log(`[WEATHER] Found: ${name}, ${admin1} (${latitude}, ${longitude}) - Timezone: ${timezone} - Country: ${country}`);

    // 2. Fetch weather data using coordinates
    let current;
    let weatherData;
    
    // Force Brazil timezone if city is in Brazil
    const isBrazil = country === "Brasil" || country === "Brazil";
    const targetTimezone = isBrazil ? "America/Sao_Paulo" : (timezone || "auto");

    try {
      const weatherRes = await robustFetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=${encodeURIComponent(targetTimezone)}`);
      if (!weatherRes.ok) throw new Error("Weather service unavailable");
      weatherData = await weatherRes.json();
      current = weatherData.current;
    } catch (weatherError: any) {
      console.warn("[WEATHER] Open-Meteo failed, trying wttr.in fallback...", weatherError.message);
      // Fallback to wttr.in which is often more resilient
      const wttrRes = await robustFetch(`https://wttr.in/${latitude},${longitude}?format=j1&lang=pt`);
      if (wttrRes.ok) {
        const wttrData = await wttrRes.json();
        const wttrCurrent = wttrData.current_condition[0];
        return res.json({
          temp: Math.round(parseFloat(wttrCurrent.temp_C)),
          description: wttrCurrent.lang_pt?.[0]?.value || wttrCurrent.weatherDesc[0].value,
          icon: "01d", 
          humidity: `${wttrCurrent.humidity}%`,
          wind: `${wttrCurrent.windspeedKmph} km/h`,
          timezone: isBrazil ? "America/Sao_Paulo" : (timezone || "America/Sao_Paulo"),
          city: name,
          region: admin1
        });
      }
      throw weatherError;
    }

    // 3. Map WMO weather codes to descriptions and icons
    const code = current.weather_code;
    let description = "Céu limpo";
    let icon = "01d";

    if (code === 0) { description = "Céu limpo"; icon = "01d"; }
    else if (code >= 1 && code <= 3) { description = "Parcialmente nublado"; icon = "03d"; }
    else if (code === 45 || code === 48) { description = "Nevoeiro"; icon = "50d"; }
    else if (code >= 51 && code <= 55) { description = "Garoa"; icon = "09d"; }
    else if (code >= 61 && code <= 65) { description = "Chuvoso"; icon = "10d"; }
    else if (code >= 71 && code <= 75) { description = "Nevando"; icon = "13d"; }
    else if (code >= 80 && code <= 82) { description = "Pancadas de chuva"; icon = "09d"; }
    else if (code >= 95) { description = "Tempestade"; icon = "11d"; }

    res.json({
      temp: Math.round(current.temperature_2m),
      description: description,
      icon: icon,
      humidity: `${current.relative_humidity_2m}%`,
      wind: `${current.wind_speed_10m} km/h`,
      timezone: weatherData.timezone || targetTimezone === "auto" ? "America/Sao_Paulo" : targetTimezone,
      city: name,
      region: admin1
    });
  } catch (error: any) {
    console.error("Weather error:", error.message);
    // Fallback to safe defaults for Brazil
    res.json({
      temp: 30, // More realistic for São Luís
      description: "Ensolarado",
      icon: "01d",
      humidity: "70%",
      wind: "15 km/h",
      timezone: "America/Sao_Paulo",
      city: city.split(',')[0],
      region: "Brasil"
    });
  }
});

app.get("/api/cities", async (req, res) => {
  const query = req.query.search as string;
  if (!query) return res.json([]);
  
  try {
    const response = await robustFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=pt&format=json`);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    const suggestions = data.results?.map((r: any) => {
      const parts = [r.name];
      if (r.admin1) parts.push(r.admin1);
      if (r.country) parts.push(r.country);
      return parts.join(', ');
    }) || [];
    
    res.json(suggestions);
  } catch (error: any) {
    console.error("Error proxying city search:", error.message);
    res.status(500).json({ error: "Failed to fetch city suggestions" });
  }
});

// --- Google API Routes ---

const getGoogleUser = async (req: express.Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

app.get("/api/google/gmail", async (req, res) => {
  try {
    const user = await getGoogleUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data } = await supabase.from("users").select("google_refresh_token").eq("id", user.id).single();
    if (!data?.google_refresh_token) return res.status(400).json({ error: "Google not connected" });

    const client = getOAuth2Client();
    if (!client) return res.status(500).json({ error: "Google OAuth not configured" });
    client.setCredentials({ refresh_token: data.google_refresh_token });

    const gmail = google.gmail({ version: "v1", auth: client });
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 50,
      q: "label:INBOX category:primary",
    });
    
    const messages = await Promise.all(
      (response.data.messages || []).map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({ userId: "me", id: msg.id! });
          const headers = detail.data.payload?.headers;
          return {
            id: msg.id,
            snippet: detail.data.snippet,
            subject: headers?.find(h => h.name === 'Subject')?.value,
            from: headers?.find(h => h.name === 'From')?.value,
            date: headers?.find(h => h.name === 'Date')?.value,
            unread: detail.data.labelIds?.includes('UNREAD'),
          };
        } catch (e) {
          console.error(`Error fetching message ${msg.id}:`, e);
          return null;
        }
      })
    );
    res.json(messages.filter(m => m !== null));
  } catch (error: any) {
    console.error("Gmail fetch error:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

app.get("/api/google/gmail/:id", async (req, res) => {
  const { id } = req.params;
  console.log(`[GMAIL] Detail requested for ID: ${id}`);
  
  if (!id || id === 'undefined' || id === '[object Object]' || id.length < 5) {
    console.warn(`[GMAIL] Invalid ID received: ${id}`);
    return res.status(400).json({ error: "Invalid email ID" });
  }
  
  try {
    const user = await getGoogleUser(req);
    if (!user) {
      console.warn("[GMAIL] Unauthorized detail request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data } = await supabase.from("users").select("google_refresh_token").eq("id", user.id).single();
    if (!data?.google_refresh_token) {
      console.warn(`[GMAIL] Google not connected for user: ${user.id}`);
      return res.status(400).json({ error: "Google not connected" });
    }

    const client = getOAuth2Client();
    if (!client) return res.status(500).json({ error: "Google OAuth not configured" });
    client.setCredentials({ refresh_token: data.google_refresh_token });

    const gmail = google.gmail({ version: "v1", auth: client });
    console.log(`[GMAIL] Fetching message ${id} from Google API...`);
    const response = await gmail.users.messages.get({ userId: "me", id });
    
    // Extract body
    let body = "";
    const payload = response.data.payload;
    
    const getBodyFromPart = (part: any) => {
      if (part?.body?.data) {
        // Gmail uses base64url encoding
        const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString();
      }
      return "";
    };

    if (payload?.parts) {
      // Prefer HTML, fallback to plain
      const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
      const plainPart = payload.parts.find(p => p.mimeType === 'text/plain');
      
      if (htmlPart) body = getBodyFromPart(htmlPart);
      else if (plainPart) body = getBodyFromPart(plainPart);
      
      // If still empty, check nested parts (multipart/alternative)
      if (!body) {
        for (const part of payload.parts) {
          if (part.parts) {
            const nestedHtml = part.parts.find((p: any) => p.mimeType === 'text/html');
            if (nestedHtml) {
              body = getBodyFromPart(nestedHtml);
              break;
            }
          }
        }
      }
    } else if (payload?.body?.data) {
      body = getBodyFromPart(payload);
    }

    const headers = response.data.payload?.headers;
    console.log(`Successfully fetched Gmail detail for ID: ${req.params.id}`);
    res.json({
      id: response.data.id,
      threadId: response.data.threadId,
      snippet: response.data.snippet,
      subject: headers?.find(h => h.name === 'Subject')?.value,
      from: headers?.find(h => h.name === 'From')?.value,
      to: headers?.find(h => h.name === 'To')?.value,
      date: headers?.find(h => h.name === 'Date')?.value,
      messageId: headers?.find(h => h.name === 'Message-ID')?.value,
      body
    });
  } catch (error: any) {
    console.error(`Gmail detail error for ID ${req.params.id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/google/gmail/:id/read", async (req, res) => {
  try {
    const user = await getGoogleUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data } = await supabase.from("users").select("google_refresh_token").eq("id", user.id).single();
    if (!data?.google_refresh_token) return res.status(400).json({ error: "Google not connected" });

    const client = getOAuth2Client();
    if (!client) return res.status(500).json({ error: "Google OAuth not configured" });
    client.setCredentials({ refresh_token: data.google_refresh_token });

    const gmail = google.gmail({ version: "v1", auth: client });
    await gmail.users.messages.batchModify({
      userId: "me",
      requestBody: {
        ids: [req.params.id],
        removeLabelIds: ["UNREAD"]
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Gmail mark as read error:", error);
    if (error.code === 403 || error.message?.includes('insufficient authentication scopes')) {
      return res.status(403).json({ 
        error: "Permissões insuficientes. Por favor, reconecte sua conta do Google para autorizar a marcação de e-mails como lidos.",
        code: "INSUFFICIENT_SCOPES"
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/google/calendar", async (req, res) => {
  try {
    const user = await getGoogleUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data } = await supabase.from("users").select("google_refresh_token").eq("id", user.id).single();
    if (!data?.google_refresh_token) return res.status(400).json({ error: "Google not connected" });

    const client = getOAuth2Client();
    if (!client) return res.status(500).json({ error: "Google OAuth not configured" });
    client.setCredentials({ refresh_token: data.google_refresh_token });
    
    const calendar = google.calendar({ version: "v3", auth: client });
    
    const now = new Date();
    let timeMin = req.query.timeMin as string || now.toISOString();
    let timeMax = req.query.timeMax as string || undefined;

    if (req.query.today === 'true') {
      // Start of today to end of today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      timeMin = startOfDay.toISOString();
      timeMax = endOfDay.toISOString();
    } else if (!req.query.timeMin) {
      // Default: from now to 30 days in the future for the calendar view if no range provided
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      timeMax = thirtyDaysLater.toISOString();
    }

    const response: any = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 100,
      singleEvents: true,
      orderBy: "startTime",
      conferenceDataVersion: 1
    } as any);
    res.json(response.data.items);
  } catch (error: any) {
    console.error("Calendar fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/google/drive", async (req, res) => {
  try {
    const user = await getGoogleUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { data } = await supabase.from("users").select("google_refresh_token").eq("id", user.id).single();
    if (!data?.google_refresh_token) return res.status(400).json({ error: "Google not connected" });

    const client = getOAuth2Client();
    if (!client) return res.status(500).json({ error: "Google OAuth not configured" });
    client.setCredentials({ refresh_token: data.google_refresh_token });

    const drive = google.drive({ version: "v3", auth: client });
    const response = await drive.files.list({
      pageSize: 20,
      fields: "files(id, name, mimeType, modifiedTime, iconLink)",
      q: "trashed = false",
    });
    res.json(response.data.files);
  } catch (error: any) {
    console.error("Drive fetch error:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// API 404 handler - must be before startServer's SPA fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found", path: req.originalUrl });
});

// --- Supabase Proxy Routes (Optional, but good for keeping keys hidden) ---
// For this MVP, we'll let the frontend use the anon key for notes/todos if configured correctly,
// but we can also proxy them here.

async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL && createViteServer) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    // Only serve static files if NOT on Vercel (Vercel handles this via vercel.json)
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

export default app;

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("GLOBAL ERROR HANDLER:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
