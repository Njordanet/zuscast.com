/**
 * ZüsCast (zuscast.com) — Web Weather Dashboard & Panda v2.0 Dataset Workbench
 * Connected by default to ZüsAPI v2.0 on PC `panda` (http://192.168.1.65:8000/api/v1)
 * with automatic GPS location acquisition on startup.
 */

const DEFAULT_PANDA_API = "http://192.168.1.65:8000/api/v1";

const SACRED_PRESETS = [
  { name: "Mount Olympus", country: "Greece", latitude: 40.0856, longitude: 22.3585 },
  { name: "Athens", country: "Greece", latitude: 37.9838, longitude: 23.7275 },
  { name: "New York", country: "USA", latitude: 40.7128, longitude: -74.006 },
  { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { name: "London", country: "UK", latitude: 51.5074, longitude: -0.1278 },
  { name: "Reykjavik", country: "Iceland", latitude: 64.1466, longitude: -21.9426 },
];

const WEATHER_CONDITIONS = {
  Clear: {
    label: "Clear",
    quote: "Olympus shines with golden radiance today.",
    theme: "theme-clear",
    icon: "clear",
  },
  "Partly Cloudy": {
    label: "Partly Cloudy",
    quote: "Gentle clouds drift across the heavens.",
    theme: "theme-clear",
    icon: "partlyCloudy",
  },
  Overcast: {
    label: "Overcast",
    quote: "A veil of mist covers the throne of the sky.",
    theme: "theme-rain",
    icon: "overcast",
  },
  Foggy: {
    label: "Foggy",
    quote: "The mortal realm is wrapped in twilight fog.",
    theme: "theme-rain",
    icon: "fog",
  },
  Drizzle: {
    label: "Drizzle",
    quote: "A calm shower to nourish the earth below.",
    theme: "theme-rain",
    icon: "drizzle",
  },
  Rain: {
    label: "Rain",
    quote: "The skies unleash a steady downpour.",
    theme: "theme-rain",
    icon: "rain",
  },
  "Heavy Rain": {
    label: "Heavy Rain",
    quote: "Torrents fall from the mountain crests!",
    theme: "theme-rain",
    icon: "heavyRain",
  },
  Snow: {
    label: "Snow",
    quote: "Frost cloaks the ancient summits.",
    theme: "theme-rain",
    icon: "snow",
  },
  Thunderstorm: {
    label: "Thunderstorm",
    quote: "Feel the wrath of Züs! Lightning illuminates the sky!",
    theme: "theme-storm",
    icon: "thunderstorm",
  },
  "Severe Thunderstorm": {
    label: "Severe Thunderstorm",
    quote: "THUNDERBOLTS OF OLYMPUS! Seek divine shelter!",
    theme: "theme-storm",
    icon: "severeThunderstorm",
  },
};

function conditionFromWMO(code) {
  switch (Number(code)) {
    case 0:
      return WEATHER_CONDITIONS["Clear"];
    case 1:
    case 2:
      return WEATHER_CONDITIONS["Partly Cloudy"];
    case 3:
      return WEATHER_CONDITIONS["Overcast"];
    case 45:
    case 48:
      return WEATHER_CONDITIONS["Foggy"];
    case 51:
    case 53:
    case 55:
      return WEATHER_CONDITIONS["Drizzle"];
    case 61:
    case 63:
      return WEATHER_CONDITIONS["Rain"];
    case 65:
    case 80:
    case 81:
    case 82:
      return WEATHER_CONDITIONS["Heavy Rain"];
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return WEATHER_CONDITIONS["Snow"];
    case 95:
      return WEATHER_CONDITIONS["Thunderstorm"];
    case 96:
    case 99:
      return WEATHER_CONDITIONS["Severe Thunderstorm"];
    default:
      return WEATHER_CONDITIONS["Clear"];
  }
}

function getWeatherSVG(type) {
  switch (type) {
    case "clear":
      return `<svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="14" fill="#FFD600"/>
        <g stroke="#FFD600" stroke-width="3.5" stroke-linecap="round">
          <line x1="32" y1="6" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="58"/>
          <line x1="6" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="58" y2="32"/>
          <line x1="13.6" y1="13.6" x2="17.8" y2="17.8"/><line x1="46.2" y1="46.2" x2="50.4" y2="50.4"/>
          <line x1="50.4" y1="13.6" x2="46.2" y2="17.8"/><line x1="17.8" y1="46.2" x2="13.6" y2="50.4"/>
        </g>
      </svg>`;
    case "partlyCloudy":
      return `<svg viewBox="0 0 64 64" fill="none">
        <circle cx="24" cy="24" r="10" fill="#FFD600"/>
        <path d="M22 46H46C51.5 46 56 41.5 56 36C56 30.8 52.1 26.6 47 26.1C45.4 19.2 39.2 14 31.8 14C23.1 14 16 21.1 16 29.8C16 30.3 16 30.8 16.1 31.3C12.6 32.6 10 36 10 40C10 43.3 12.7 46 16 46H22Z" fill="#E2E8F0"/>
      </svg>`;
    case "overcast":
    case "fog":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 46H48C53.5 46 58 41.5 58 36C58 30.8 54 26.5 48.9 26.1C47.2 18.6 40.5 13 32.5 13C23.4 13 16 20.4 16 29.5C16 30.1 16 30.7 16.1 31.2C11.5 32.1 8 36.1 8 41C8 43.8 10.2 46 13 46H18Z" fill="#94A3B8"/>
      </svg>`;
    case "drizzle":
    case "rain":
    case "heavyRain":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 40H48C53 40 57 36 57 31C57 26.3 53.4 22.5 48.8 22.1C47.2 15.2 41 10 33.5 10C24.9 10 18 16.9 18 25.5C18 26 18 26.5 18.1 27C14 27.8 11 31.4 11 35.7C11 38.1 12.9 40 15.3 40H18Z" fill="#94A3B8"/>
        <g stroke="#59C7FF" stroke-width="3" stroke-linecap="round">
          <line x1="22" y1="45" x2="19" y2="55"/>
          <line x1="33" y1="45" x2="30" y2="55"/>
          <line x1="44" y1="45" x2="41" y2="55"/>
        </g>
      </svg>`;
    case "snow":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 40H48C53 40 57 36 57 31C57 26.3 53.4 22.5 48.8 22.1C47.2 15.2 41 10 33.5 10C24.9 10 18 16.9 18 25.5C18 26 18 26.5 18.1 27C14 27.8 11 31.4 11 35.7C11 38.1 12.9 40 15.3 40H18Z" fill="#CBD5E1"/>
        <circle cx="22" cy="50" r="3" fill="#59C7FF"/>
        <circle cx="33" cy="53" r="3" fill="#59C7FF"/>
        <circle cx="44" cy="50" r="3" fill="#59C7FF"/>
      </svg>`;
    case "thunderstorm":
    case "severeThunderstorm":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 38H48C53 38 57 34 57 29C57 24.3 53.4 20.5 48.8 20.1C47.2 13.2 41 8 33.5 8C24.9 8 18 14.9 18 23.5C18 24 18 24.5 18.1 25C14 25.8 11 29.4 11 33.7C11 36.1 12.9 38 15.3 38H18Z" fill="#64748B"/>
        <path d="M35 30L23 45H33L29 59L45 42H35L35 30Z" fill="#FFD600"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="14" fill="#FFD600"/></svg>`;
  }
}

/* Application State */
const state = {
  location: { ...SACRED_PRESETS[2] }, // Default to New York while awaiting GPS
  useFahrenheit: localStorage.getItem("zus_unit_f") !== "false",
  zusApiUrl: localStorage.getItem("zus_api_url") || DEFAULT_PANDA_API,
  forcedStormMode: false,
  weather: null,
  rawPandaPayload: null,
  pandaInventory: null,
  radarBlips: [],
  radarAngle: 0,
};

/* Utility Formatters */
function formatTemp(celsius, showUnit = false) {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) return "--°";
  const val = state.useFahrenheit ? (celsius * 9) / 5 + 32 : celsius;
  const suffix = showUnit ? (state.useFahrenheit ? "°F" : "°C") : "°";
  return `${Math.round(val)}${suffix}`;
}

function formatTempExact(celsius) {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) return "--";
  const val = state.useFahrenheit ? (celsius * 9) / 5 + 32 : celsius;
  const unit = state.useFahrenheit ? "°F" : "°C";
  return `${val.toFixed(1)}${unit}`;
}

function formatTempDelta(deltaCelsius) {
  if (deltaCelsius === null || deltaCelsius === undefined || Number.isNaN(deltaCelsius)) return "--";
  const val = state.useFahrenheit ? deltaCelsius * 1.8 : deltaCelsius;
  const unit = state.useFahrenheit ? "°F" : "°C";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}${unit}`;
}

function formatWind(kmh) {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return "--";
  if (state.useFahrenheit) {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

function compassDirection(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8];
}

function uvAdvice(uv) {
  if (uv < 3) return "Low — Safe under Olympus skies";
  if (uv < 6) return "Moderate — Sun protection advised";
  if (uv < 8) return "High — Seek shade at solar zenith";
  if (uv < 11) return "Very High — Extra protection required";
  return "Extreme — Unshielded solar radiance";
}

/* Render Sacred Presets Bar */
function renderPresets() {
  const bar = document.getElementById("presets-bar");
  bar.innerHTML = `<span class="presets-label">⚡ Sacred Realms:</span>`;
  SACRED_PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive =
      Math.abs(preset.latitude - state.location.latitude) < 0.05 &&
      Math.abs(preset.longitude - state.location.longitude) < 0.05;
    btn.className = `preset-chip ${isActive ? "active" : ""}`;
    btn.textContent = preset.name;
    btn.addEventListener("click", () => {
      state.location = { ...preset };
      renderPresets();
      loadWeatherForCurrentLocation();
    });
    bar.appendChild(btn);
  });
}

/* Fetch Panda PostGIS Inventory */
async function fetchPandaInventory(baseUrl) {
  try {
    const resp = await fetch(`${baseUrl}/dataset/inventory`);
    if (!resp.ok) return null;
    const inv = await resp.json();
    state.pandaInventory = inv;
    renderPandaInventory(inv);
    return inv;
  } catch (_) {
    return null;
  }
}

function renderPandaInventory(inv) {
  const db = inv?.database;
  if (!db) return;

  document.getElementById("postgis-engine-label").textContent =
    db.engine || "PostgreSQL 16 + PostGIS 3.4";
  document.getElementById("kpi-db-size").textContent = db.database_size || "--";
  document.getElementById("kpi-cells").textContent = String(db.tracked_cells_count ?? 0);
  document.getElementById("kpi-stations").textContent = String(db.stations_indexed ?? 0);
  document.getElementById("kpi-obs").textContent = String(
    db.station_observations_stored ?? 0
  );
  document.getElementById("kpi-snapshots").textContent = String(
    db.forecast_snapshots_stored ?? 0
  );
  document.getElementById("kpi-verified").textContent = String(
    db.verified_predictions_count ?? 0
  );

  const cellsContainer = document.getElementById("active-cells-list");
  const cells = db.active_cells || [];
  if (!cells.length) {
    cellsContainer.innerHTML = `<span class="search-result-meta">No active cells recorded yet.</span>`;
    return;
  }

  cellsContainer.innerHTML = "";
  cells.forEach((cell) => {
    const [latStr, lonStr] = String(cell.cell_id || "").split(":");
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cell-chip";
    btn.innerHTML = `
      <strong>${cell.city_name}</strong>
      <span class="cell-chip-meta">${cell.cell_id} &bull; ${cell.region_mode} &bull; ${Math.round(
      cell.elevation_m || 0
    )}m &bull; ${cell.request_count} reqs</span>
    `;
    btn.addEventListener("click", () => {
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        state.location = {
          name: cell.city_name,
          country: `${cell.region_mode} (${cell.cell_id})`,
          latitude: lat,
          longitude: lon,
        };
        renderPresets();
        loadWeatherForCurrentLocation();
      }
    });
    cellsContainer.appendChild(btn);
  });
}

/* Fetch Weather + Convective Telemetry + Panda Dataset */
async function loadWeatherForCurrentLocation() {
  const { latitude, longitude, name, country } = state.location;
  document.getElementById("hero-city").textContent = name;
  document.getElementById("location-country-badge").innerHTML = `<span>⚡ ${
    country || "Global Telemetry"
  }</span>`;
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  document.getElementById("hero-coords").textContent = `${Math.abs(latitude).toFixed(
    4
  )}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
  document.getElementById("last-updated").textContent = "Syncing Panda ZüsAPI...";

  // 1. Query Panda ZüsAPI v2.0 first
  const candidateUrls = [
    state.zusApiUrl,
    DEFAULT_PANDA_API,
    "http://panda.local:8000/api/v1",
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  for (const rawBase of candidateUrls) {
    try {
      const base = rawBase.replace(/\/+$/, "");
      const [wResp, lResp] = await Promise.all([
        fetch(
          `${base}/weather?lat=${latitude}&lon=${longitude}&city=${encodeURIComponent(name)}`
        ),
        fetch(`${base}/lightning?lat=${latitude}&lon=${longitude}`),
      ]);
      if (wResp.ok) {
        const wData = await wResp.json();
        const lData = lResp.ok ? await lResp.json() : null;
        const invData = await fetchPandaInventory(base);

        state.rawPandaPayload = {
          endpoint: base,
          weather: wData,
          lightning: lData,
          inventory: invData,
        };

        state.weather = normalizeZusApiResponse(wData, lData);
        updateDashboardUI(wData.source || "Panda ZüsAPI v2.0", true);
        return;
      }
    } catch (_) {
      // Try next candidate URL or fall back to Open-Meteo
    }
  }

  // 2. Fallback to Direct Open-Meteo if Panda is unreachable (e.g. off-LAN or HTTPS Mixed Content)
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      hourly:
        "temperature_2m,weather_code,precipitation_probability,cape,lifted_index,visibility",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
      timezone: "auto",
      forecast_days: "10",
    });

    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const raw = await resp.json();
    state.rawPandaPayload = {
      note: "Panda LAN endpoint (http://192.168.1.65:8000) was unreachable from this browser context (e.g. HTTPS mixed-content or off-LAN). Showing Open-Meteo direct feed.",
      openMeteoRaw: raw,
    };
    state.weather = normalizeOpenMeteoResponse(raw);
    updateDashboardUI("Open-Meteo Fallback", false);
  } catch (err) {
    document.getElementById("last-updated").textContent = "Offline fallback active";
  }
}

function normalizeZusApiResponse(wData, lData) {
  const curr = wData.current || {};
  const condMap = {
    Clear: 0,
    "Partly Cloudy": 2,
    Overcast: 3,
    Foggy: 45,
    Drizzle: 51,
    Rain: 61,
    "Heavy Rain": 65,
    Snow: 71,
    Thunderstorm: 95,
    "Severe Thunderstorm": 99,
  };
  const wmoCode = condMap[curr.condition] ?? 0;
  return {
    temperature: curr.temperature,
    feelsLike: curr.feelsLike,
    humidity: curr.humidity,
    pressure: curr.airPressure,
    windSpeed: curr.windSpeed,
    windDirection: curr.windDirection,
    windGusts: curr.windSpeed * 1.28,
    wmoCode,
    tempMax: curr.tempMax,
    tempMin: curr.tempMin,
    uvIndex: curr.uvIndex ?? 5,
    sunrise: null,
    sunset: null,
    visibilityKm: curr.visibility ?? 10,
    cape: lData?.capeJkg ?? 120,
    liftedIndex: lData?.liftedIndex ?? 1.2,
    // Panda v2.0 Consensus & Hyperlocal Fields
    consensusScore: curr.consensusScore ?? 95,
    dominantModel: curr.dominantModel || "Multi-Model Blend",
    localStationName: curr.localStationName || null,
    localStationDistanceKm: curr.localStationDistanceKm ?? null,
    elevationMeters: curr.elevationMeters ?? null,
    usAqi: curr.usAqi ?? null,
    aqiCategory: curr.aqiCategory || null,
    dewPoint: curr.dewPoint ?? null,
    comfortLevel: curr.comfortLevel || "Comfortable",
    nowcastSummary:
      wData.nowcast?.summaryText ||
      curr.nowcastSummary ||
      "Clear skies for the next 60 minutes.",
    regionMode: wData.regionMode || "GLOBAL_ENSEMBLE",
    modelWeights: wData.modelWeights || [],
    nearbyStations: wData.nearbyStations || [],
    hourly: (wData.hourly || []).map((item) => ({
      time: new Date(item.time),
      temperature: item.temperature,
      wmoCode: condMap[item.condition] ?? 0,
      precipProb: item.precipitationChance ?? 0,
    })),
    daily: (wData.daily || []).map((item) => ({
      date: new Date(item.date),
      wmoCode: condMap[item.condition] ?? 0,
      tempMin: item.minTemperature,
      tempMax: item.maxTemperature,
      precipProb: item.precipitationChance ?? 0,
    })),
  };
}

function normalizeOpenMeteoResponse(raw) {
  const c = raw.current || {};
  const h = raw.hourly || {};
  const d = raw.daily || {};

  const nowMs = Date.now();
  let startIdx = 0;
  if (Array.isArray(h.time)) {
    const found = h.time.findIndex((t) => new Date(t).getTime() >= nowMs - 3600000);
    if (found >= 0) startIdx = found;
  }

  const cape = Number(h.cape?.[startIdx] ?? 0);
  const liftedIndex = Number(h.lifted_index?.[startIdx] ?? 2.0);
  const visibilityMeters = Number(h.visibility?.[startIdx] ?? 10000);
  const wmoCode = Number(c.weather_code ?? 0);

  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const idx = startIdx + i;
    if (!h.time || idx >= h.time.length) break;
    hourly.push({
      time: new Date(h.time[idx]),
      temperature: h.temperature_2m[idx],
      wmoCode: h.weather_code[idx],
      precipProb: h.precipitation_probability?.[idx] ?? 0,
    });
  }

  const daily = [];
  const dayLen = Math.min(d.time?.length || 0, 10);
  for (let i = 0; i < dayLen; i++) {
    daily.push({
      date: new Date(`${d.time[i]}T12:00:00`),
      wmoCode: d.weather_code[i],
      tempMin: d.temperature_2m_min[i],
      tempMax: d.temperature_2m_max[i],
      precipProb: d.precipitation_probability_max?.[i] ?? 0,
    });
  }

  return {
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    pressure: c.surface_pressure,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m ?? c.wind_speed_10m * 1.25,
    wmoCode,
    tempMax: d.temperature_2m_max?.[0] ?? c.temperature_2m,
    tempMin: d.temperature_2m_min?.[0] ?? c.temperature_2m,
    uvIndex: d.uv_index_max?.[0] ?? 5,
    sunrise: d.sunrise?.[0] ?? null,
    sunset: d.sunset?.[0] ?? null,
    visibilityKm: visibilityMeters / 1000,
    cape,
    liftedIndex,
    consensusScore: 90,
    dominantModel: "Open-Meteo Direct",
    localStationName: "Direct Grid Cell",
    localStationDistanceKm: 0,
    elevationMeters: raw.elevation ?? 0,
    usAqi: null,
    aqiCategory: null,
    dewPoint: c.temperature_2m - (100 - c.relative_humidity_2m) / 5,
    comfortLevel: "Standard",
    nowcastSummary: "Direct Open-Meteo feed active (connect over HTTP LAN for Panda PostGIS).",
    regionMode: "DIRECT_OPEN_METEO",
    modelWeights: [],
    nearbyStations: [],
    hourly,
    daily,
  };
}

/* Update All Dashboard & Panda Workbench UI Elements */
function updateDashboardUI(sourceName, isPandaConnected) {
  const w = state.weather;
  if (!w) return;

  const effectiveWmo = state.forcedStormMode ? 96 : w.wmoCode;
  const cond = conditionFromWMO(effectiveWmo);

  document.body.className = cond.theme;
  document.getElementById("data-source-text").textContent = sourceName;

  // Hero card
  document.getElementById("hero-icon-container").innerHTML = getWeatherSVG(cond.icon);
  document.getElementById("hero-temp").textContent = formatTemp(w.temperature);
  document.getElementById("hero-condition").textContent = cond.label;
  document.getElementById("hero-high-low").innerHTML = `H: ${formatTemp(
    w.tempMax
  )} &nbsp; L: ${formatTemp(w.tempMin)}`;
  document.getElementById("hero-feels-like").textContent = `Feels like ${formatTemp(
    w.feelsLike
  )}`;
  document.getElementById("zeus-quote").textContent = `"${cond.quote}"`;
  document.getElementById("last-updated").textContent = `Synced ${new Date().toLocaleTimeString(
    [],
    { hour: "2-digit", minute: "2-digit", second: "2-digit" }
  )}`;

  // Consensus & Hyperlocal Banner
  document.getElementById("chip-consensus").textContent = `${w.consensusScore ?? 95}%`;
  document.getElementById("chip-model").textContent = w.dominantModel || "Ensemble";
  if (w.localStationName) {
    const dist =
      w.localStationDistanceKm !== null && w.localStationDistanceKm !== undefined
        ? ` (${w.localStationDistanceKm.toFixed(1)} km)`
        : "";
    document.getElementById("chip-station").textContent = `${w.localStationName}${dist}`;
  } else {
    document.getElementById("chip-station").textContent = "Grid Interpolated";
  }
  const elevStr =
    w.elevationMeters !== null && w.elevationMeters !== undefined
      ? `${Math.round(w.elevationMeters)}m`
      : "--";
  const aqiStr =
    w.usAqi !== null && w.usAqi !== undefined
      ? `${w.usAqi} (${w.aqiCategory || "Good"})`
      : "N/A";
  document.getElementById("chip-elev").textContent = elevStr;
  document.getElementById("chip-aqi").textContent = aqiStr;
  document.getElementById(
    "nowcast-summary-text"
  ).textContent = `📡 60-Min Radar Nowcast: ${w.nowcastSummary}`;

  // Convective & Lightning Telemetry
  const effectiveCape = state.forcedStormMode ? Math.max(w.cape, 2650) : w.cape;
  const effectiveLi = state.forcedStormMode ? Math.min(w.liftedIndex, -5.4) : w.liftedIndex;

  let threat = "Calm";
  let threatClass = "threat-calm";
  if (effectiveWmo === 96 || effectiveWmo === 99 || effectiveCape >= 2500) {
    threat = "Divine Wrath (Severe)";
    threatClass = "threat-severe";
  } else if (effectiveWmo === 95 || effectiveCape >= 1000) {
    threat = "High Threat";
    threatClass = "threat-high";
  } else if (effectiveCape >= 300 || effectiveLi < 0) {
    threat = "Moderate";
    threatClass = "threat-moderate";
  } else if (effectiveCape >= 100) {
    threat = "Low";
    threatClass = "threat-low";
  }

  const badge = document.getElementById("threat-badge");
  badge.textContent = threat;
  badge.className = `threat-badge ${threatClass}`;

  document.getElementById("cape-value").textContent = `${Math.round(effectiveCape)} J/kg`;
  document.getElementById("cape-desc").textContent =
    effectiveCape >= 1000
      ? "Strong storm updrafts"
      : effectiveCape >= 300
      ? "Moderate instability"
      : "Stable atmosphere";

  const liSign = effectiveLi > 0 ? "+" : "";
  document.getElementById("lifted-index-value").textContent = `${liSign}${effectiveLi.toFixed(
    1
  )}°C`;
  document.getElementById("lifted-desc").textContent =
    effectiveLi < -3
      ? "Severe storm potential"
      : effectiveLi < 0
      ? "Unstable parcel lift"
      : "Low updraft risk";

  document.getElementById("region-mode-value").textContent =
    w.regionMode === "US_HYPERLOCAL" ? "US Hyperlocal" : "Global Ensemble";
  document.getElementById("comfort-level-sub").textContent = `Comfort: ${
    w.comfortLevel || "Optimal"
  }`;
  document.getElementById("gust-value").textContent = formatWind(w.windGusts);

  const capePct = Math.min(100, Math.max(5, (effectiveCape / 3000) * 100));
  document.getElementById("cape-meter-fill").style.width = `${capePct}%`;
  document.getElementById(
    "cape-scale-readout"
  ).textContent = `${Math.round(effectiveCape)} / 3000 J/kg`;

  regenerateRadarBlips(effectiveCape, effectiveWmo);

  // Render Panda Model Weights Leaderboard
  renderModelWeightsTable(w.modelWeights, w.regionMode);

  // Render Panda Nearby Hyperlocal Stations Table
  renderNearbyStationsTable(w.nearbyStations);

  // 24-Hour Strip
  const hourlyScroll = document.getElementById("hourly-scroll");
  hourlyScroll.innerHTML = "";
  w.hourly.forEach((hItem, idx) => {
    const hCond = conditionFromWMO(hItem.wmoCode);
    const el = document.createElement("div");
    el.className = `hour-item ${idx === 0 ? "now" : ""}`;
    const timeLabel =
      idx === 0
        ? "Now"
        : hItem.time.toLocaleTimeString([], { hour: "numeric", hour12: true });
    el.innerHTML = `
      <div class="hour-time">${timeLabel}</div>
      <div class="hour-icon">${getWeatherSVG(hCond.icon)}</div>
      <div class="hour-precip">${hItem.precipProb >= 15 ? `${hItem.precipProb}%` : ""}</div>
      <div class="hour-temp">${formatTemp(hItem.temperature)}</div>
    `;
    hourlyScroll.appendChild(el);
  });

  // 10-Day Forecast List
  const dailyList = document.getElementById("daily-list");
  dailyList.innerHTML = "";
  const allMins = w.daily.map((d) => d.tempMin);
  const allMaxs = w.daily.map((d) => d.tempMax);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const totalSpan = Math.max(1, globalMax - globalMin);

  w.daily.forEach((dItem, idx) => {
    const dCond = conditionFromWMO(dItem.wmoCode);
    const dayName =
      idx === 0
        ? "Today"
        : dItem.date.toLocaleDateString([], { weekday: "short" });
    const leftPct = ((dItem.tempMin - globalMin) / totalSpan) * 100;
    const widthPct = Math.max(6, ((dItem.tempMax - dItem.tempMin) / totalSpan) * 100);

    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = `
      <div class="daily-day">${dayName}</div>
      <div class="daily-icon">${getWeatherSVG(dCond.icon)}</div>
      <div class="daily-precip">${dItem.precipProb >= 15 ? `${dItem.precipProb}%` : ""}</div>
      <div class="daily-range-group">
        <span class="daily-min">${formatTemp(dItem.tempMin)}</span>
        <div class="range-track">
          <div class="range-bar" style="left: ${leftPct}%; width: ${widthPct}%"></div>
        </div>
        <span class="daily-max">${formatTemp(dItem.tempMax)}</span>
      </div>
    `;
    dailyList.appendChild(row);
  });

  // 6 Detail Cards
  document.getElementById("detail-wind").textContent = formatWind(w.windSpeed);
  document.getElementById("detail-wind-dir").textContent = `Direction: ${
    w.windDirection
  }° (${compassDirection(w.windDirection)})`;

  document.getElementById("detail-humidity").textContent = `${Math.round(w.humidity)}%`;
  const dewPointC =
    w.dewPoint !== null && w.dewPoint !== undefined
      ? w.dewPoint
      : w.temperature - (100 - w.humidity) / 5;
  document.getElementById("detail-dewpoint").textContent = `Dew point: ${formatTemp(
    dewPointC
  )} (${w.comfortLevel || "Optimal"})`;

  const uv = Math.round(w.uvIndex * 10) / 10;
  document.getElementById("detail-uv").textContent = `${uv}`;
  document.getElementById("uv-dot").style.left = `${Math.min(100, (uv / 11) * 100)}%`;
  document.getElementById("detail-uv-advice").textContent = uvAdvice(uv);

  document.getElementById("detail-pressure").textContent = `${Math.round(
    w.pressure
  )} hPa`;
  document.getElementById("detail-pressure-desc").textContent =
    w.pressure < 1008
      ? "Low pressure trough"
      : w.pressure > 1020
      ? "High pressure ridge"
      : "Standard barometric pressure";

  const visVal = state.useFahrenheit
    ? `${(w.visibilityKm * 0.621371).toFixed(1)} mi`
    : `${w.visibilityKm.toFixed(1)} km`;
  document.getElementById("detail-visibility").textContent = visVal;
  document.getElementById("detail-visibility-desc").textContent =
    w.visibilityKm >= 9 ? "Crystal clear horizon" : "Reduced atmospheric clarity";

  if (w.sunrise && w.sunset) {
    const sr = new Date(w.sunrise).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const ss = new Date(w.sunset).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("detail-sunrise").textContent = sr;
    document.getElementById("detail-sunset").textContent = `Sunset: ${ss}`;
  } else {
    document.getElementById("detail-sunrise").textContent = "06:18 AM";
    document.getElementById("detail-sunset").textContent = "Sunset: 07:45 PM";
  }
}

function renderModelWeightsTable(models, regionMode) {
  const tbody = document.getElementById("model-weights-tbody");
  const cellLabel = `${state.location.latitude.toFixed(1)}:${state.location.longitude.toFixed(
    1
  )} (${regionMode || "ENSEMBLE"})`;
  document.getElementById("leaderboard-cell-label").textContent = cellLabel;

  if (!models || !models.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--zeus-text-muted);">Connect to Panda ZüsAPI (http://localhost:8080 or LAN) to view live NWP model weights.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  models.forEach((m) => {
    const pctWeight = Math.round((m.weight || 0) * 100);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="model-name-badge">⚡ ${m.modelName}</span></td>
      <td>
        <div class="weight-bar-wrap">
          <div class="weight-bar-track">
            <div class="weight-bar-fill" style="width: ${Math.min(100, pctWeight * 2)}%"></div>
          </div>
          <span>${pctWeight}%</span>
        </div>
      </td>
      <td style="color: var(--zeus-success); font-weight: 700;">${Number(
        m.accuracyPercent || 0
      ).toFixed(1)}%</td>
      <td>${formatTempDelta(m.maeCelsius).replace("+", "")}</td>
      <td>${formatTempDelta(m.biasCelsius)}</td>
      <td>${m.samplesVerified ?? 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderNearbyStationsTable(stations) {
  const tbody = document.getElementById("nearby-stations-tbody");
  document.getElementById("stations-count-label").textContent = `${
    stations?.length || 0
  } Stations Assimilated`;

  if (!stations || !stations.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: var(--zeus-text-muted);">No local PWS/METAR stations returned for this grid cell.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  stations.forEach((s) => {
    const qcClass = s.qcPassed ? "qc-pass" : "qc-fail";
    const qcText = s.qcPassed ? `PASS (z=${Number(s.zScore || 0).toFixed(1)})` : "REJECTED";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${s.stationId}</strong>
        <div style="font-size: 0.7rem; color: var(--zeus-text-muted);">${s.stationName}</div>
      </td>
      <td><span class="telemetry-chip">${s.network}</span></td>
      <td>${Number(s.distanceKm || 0).toFixed(1)} km &bull; ${Math.round(
      s.elevationMeters || 0
    )}m</td>
      <td>
        ${formatTempExact(s.rawTempCelsius)} &rarr;
        <strong style="color: var(--zeus-gold);">${formatTempExact(
          s.elevationAdjustedTempCelsius
        )}</strong>
      </td>
      <td>${s.humidity !== null ? `${s.humidity}%` : "--"} &bull; ${
      s.windSpeedKmh !== null ? formatWind(s.windSpeedKmh) : "--"
    }</td>
      <td><span class="qc-badge ${qcClass}">${qcText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

/* Convective Radar Canvas */
function regenerateRadarBlips(cape, wmoCode) {
  let count = 0;
  if (wmoCode >= 95 || cape >= 1200) count = 9;
  else if (cape >= 300) count = 4;
  else if (cape >= 80) count = 2;

  state.radarBlips = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 38;
    return {
      x: 59 + Math.cos(angle) * dist,
      y: 59 + Math.sin(angle) * dist,
    };
  });
}

function animateRadar() {
  const canvas = document.getElementById("radar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const cx = 59;
  const cy = 59;
  const r = 54;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 214, 0, 0.18)";
  ctx.lineWidth = 1;
  [18, 36, 52].forEach((radius) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  state.radarAngle = (state.radarAngle + 0.03) % (Math.PI * 2);
  const grad = ctx.createConicGradient(state.radarAngle, cx, cy);
  grad.addColorStop(0, "rgba(255, 214, 0, 0.35)");
  grad.addColorStop(0.2, "rgba(255, 214, 0, 0.0)");
  grad.addColorStop(1, "rgba(255, 214, 0, 0.0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 52, 0, Math.PI * 2);
  ctx.fill();

  state.radarBlips.forEach((b) => {
    ctx.fillStyle = `rgba(255, 214, 0, ${0.45 + 0.5 * Math.sin(Date.now() * 0.006 + b.x)})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animateRadar);
}

/* Fullscreen Zeus Atmospheric Storm & Lightning Canvas */
const stormEngine = {
  drops: [],
  bolts: [],
  init() {
    const canvas = document.getElementById("storm-canvas");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    this.drops = Array.from({ length: 95 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: 12 + Math.random() * 18,
      speed: 7 + Math.random() * 8,
    }));

    const loop = () => {
      this.render(canvas);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    setInterval(() => {
      const wmo = state.forcedStormMode ? 96 : state.weather?.wmoCode ?? 0;
      if (wmo >= 95 && Math.random() < 0.45) {
        this.triggerBolt();
      }
    }, 3800);
  },

  triggerBolt(customX) {
    const canvas = document.getElementById("storm-canvas");
    const startX = customX ?? canvas.width * (0.2 + Math.random() * 0.6);
    const segments = [];
    let x = startX;
    let y = 0;
    const targetY = canvas.height * (0.55 + Math.random() * 0.35);

    while (y < targetY) {
      const nextX = x + (Math.random() - 0.5) * 68;
      const nextY = y + 18 + Math.random() * 28;
      segments.push({ x1: x, y1: y, x2: nextX, y2: nextY, width: 2.8 });

      if (Math.random() < 0.28) {
        let bx = nextX;
        let by = nextY;
        for (let i = 0; i < 4; i++) {
          const nbx = bx + (Math.random() - 0.5) * 45;
          const nby = by + 14 + Math.random() * 20;
          segments.push({ x1: bx, y1: by, x2: nbx, y2: nby, width: 1.2 });
          bx = nbx;
          by = nby;
        }
      }
      x = nextX;
      y = nextY;
    }

    this.bolts.push({ segments, alpha: 1.0 });

    const flash = document.getElementById("lightning-flash");
    flash.style.opacity = "0.85";
    setTimeout(() => {
      flash.style.opacity = "0";
    }, 110);
  },

  render(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const wmo = state.forcedStormMode ? 96 : state.weather?.wmoCode ?? 0;
    const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(wmo);

    if (isRainy) {
      ctx.strokeStyle = "rgba(148, 197, 255, 0.22)";
      ctx.lineWidth = 1.2;
      this.drops.forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.len);
        ctx.stroke();

        d.y += d.speed;
        d.x -= 1.2;
        if (d.y > canvas.height) {
          d.y = -20;
          d.x = Math.random() * canvas.width;
        }
      });
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      ctx.save();
      ctx.strokeStyle = `rgba(255, 238, 130, ${bolt.alpha})`;
      ctx.shadowColor = "#FFD600";
      ctx.shadowBlur = 18;
      bolt.segments.forEach((seg) => {
        ctx.lineWidth = seg.width;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      });
      ctx.restore();

      bolt.alpha -= 0.06;
      if (bolt.alpha <= 0) {
        this.bolts.splice(i, 1);
      }
    }
  },
};

/* City Search */
function setupCitySearch() {
  const input = document.getElementById("city-search-input");
  const dropdown = document.getElementById("search-dropdown");
  let debounceTimer = null;

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    if (q.length < 2) {
      dropdown.classList.remove("open");
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            q
          )}&count=6&language=en&format=json`
        );
        const data = await resp.json();
        const results = data.results || [];
        if (!results.length) {
          dropdown.innerHTML = `<div class="search-result-item"><span class="search-result-meta">No mortal cities found</span></div>`;
          dropdown.classList.add("open");
          return;
        }
        dropdown.innerHTML = "";
        results.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "search-result-item";
          const region = [item.admin1, item.country].filter(Boolean).join(", ");
          btn.innerHTML = `
            <span class="search-result-name">${item.name}</span>
            <span class="search-result-meta">${region}</span>
          `;
          btn.addEventListener("click", () => {
            state.location = {
              name: item.name,
              country: region || item.country || "",
              latitude: item.latitude,
              longitude: item.longitude,
            };
            input.value = "";
            dropdown.classList.remove("open");
            renderPresets();
            loadWeatherForCurrentLocation();
          });
          dropdown.appendChild(btn);
        });
        dropdown.classList.add("open");
      } catch (_) {
        dropdown.classList.remove("open");
      }
    }, 240);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      dropdown.classList.remove("open");
    }
  });
}

/* Geolocation Handler (Automatic on Startup + Manual Button) */
function acquireUserLocation(isAutoStartup = false) {
  if (!navigator.geolocation) {
    if (isAutoStartup) loadWeatherForCurrentLocation();
    return;
  }

  const btn = document.getElementById("locate-me-btn");
  btn.textContent = "Locating...";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      let cityName = "Current Location";
      let country = "GPS Hyperlocal";
      try {
        const rev = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (rev.ok) {
          const info = await rev.json();
          cityName = info.city || info.locality || "Current Location";
          const admin = info.principalSubdivisionCode
            ? info.principalSubdivisionCode.replace(/^US-/, "")
            : info.countryName;
          country = [admin, "GPS Hyperlocal"].filter(Boolean).join(" • ");
        }
      } catch (_) {}

      state.location = { name: cityName, country, latitude, longitude };
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg> Locate`;
      renderPresets();
      loadWeatherForCurrentLocation();
    },
    () => {
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg> Locate`;
      if (isAutoStartup) {
        loadWeatherForCurrentLocation();
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/* Controls & Modals */
function setupControls() {
  document
    .getElementById("locate-me-btn")
    .addEventListener("click", () => acquireUserLocation(false));

  const unitBtn = document.getElementById("unit-toggle-btn");
  const updateUnitBtnLabel = () => {
    unitBtn.textContent = state.useFahrenheit ? "°F / mph" : "°C / km/h";
  };
  updateUnitBtnLabel();

  unitBtn.addEventListener("click", () => {
    state.useFahrenheit = !state.useFahrenheit;
    localStorage.setItem("zus_unit_f", String(state.useFahrenheit));
    updateUnitBtnLabel();
    if (state.weather) {
      updateDashboardUI(document.getElementById("data-source-text").textContent, true);
    }
  });

  const strikeBtn = document.getElementById("strike-btn");
  strikeBtn.addEventListener("click", () => {
    stormEngine.triggerBolt();
  });

  const footerStormToggle = document.getElementById("footer-storm-toggle");
  footerStormToggle.addEventListener("click", () => {
    state.forcedStormMode = !state.forcedStormMode;
    strikeBtn.classList.toggle("active", state.forcedStormMode);
    if (state.forcedStormMode) {
      stormEngine.triggerBolt();
    }
    if (state.weather) {
      updateDashboardUI(document.getElementById("data-source-text").textContent, true);
    }
  });

  document.getElementById("refresh-dataset-btn").addEventListener("click", () => {
    loadWeatherForCurrentLocation();
  });

  // Raw Dataset JSON Modal
  const jsonModal = document.getElementById("json-modal");
  const jsonViewer = document.getElementById("json-viewer-content");
  document.getElementById("inspect-json-btn").addEventListener("click", () => {
    jsonViewer.textContent = JSON.stringify(
      state.rawPandaPayload || state.weather || {},
      null,
      2
    );
    jsonModal.classList.add("open");
  });
  document.getElementById("json-modal-close").addEventListener("click", () => {
    jsonModal.classList.remove("open");
  });
  document.getElementById("copy-json-btn").addEventListener("click", (e) => {
    navigator.clipboard.writeText(jsonViewer.textContent);
    e.target.textContent = "Copied!";
    setTimeout(() => {
      e.target.textContent = "Copy JSON Payload";
    }, 1500);
  });

  // ZüsAPI Endpoint Modal
  const modal = document.getElementById("api-modal");
  const urlInput = document.getElementById("zus-api-url-input");
  const openModal = () => {
    urlInput.value = state.zusApiUrl;
    modal.classList.add("open");
  };
  const closeModal = () => modal.classList.remove("open");

  document.getElementById("api-settings-btn").addEventListener("click", openModal);
  document.getElementById("footer-api-btn").addEventListener("click", openModal);
  document.getElementById("api-modal-close").addEventListener("click", closeModal);

  document.getElementById("api-save-btn").addEventListener("click", () => {
    state.zusApiUrl = urlInput.value.trim() || DEFAULT_PANDA_API;
    localStorage.setItem("zus_api_url", state.zusApiUrl);
    closeModal();
    loadWeatherForCurrentLocation();
  });

  document.getElementById("api-reset-btn").addEventListener("click", () => {
    state.zusApiUrl = DEFAULT_PANDA_API;
    urlInput.value = DEFAULT_PANDA_API;
    localStorage.setItem("zus_api_url", DEFAULT_PANDA_API);
    closeModal();
    loadWeatherForCurrentLocation();
  });
}

/* Boot ZüsCast: Preload Panda Inventory + Auto-Request GPS Location */
document.addEventListener("DOMContentLoaded", () => {
  renderPresets();
  setupCitySearch();
  setupControls();
  stormEngine.init();
  animateRadar();

  // Immediately load initial forecast from Panda while browser prompts for GPS,
  // then automatically switch to exact GPS coordinates as soon as permission resolves!
  loadWeatherForCurrentLocation();
  acquireUserLocation(true);
});
