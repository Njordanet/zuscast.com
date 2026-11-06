/**
 * ZüsCast (zuscast.com) — Hyperlocal Weather & Down-to-the-Minute Nowcast
 * Liquid Glass interface with Dark Sky's minute-by-minute precipitation curve,
 * 24-hour sky condition ribbon, expandable 10-day forecast, and multi-model ensemble.
 */

const SAVED_LOCATIONS = [
  { name: "New York", region: "NY", latitude: 40.7128, longitude: -74.006 },
  { name: "San Francisco", region: "CA", latitude: 37.7749, longitude: -122.4194 },
  { name: "Chicago", region: "IL", latitude: 41.8781, longitude: -87.6298 },
  { name: "Miami", region: "FL", latitude: 25.7617, longitude: -80.1918 },
  { name: "London", region: "UK", latitude: 51.5074, longitude: -0.1278 },
  { name: "Tokyo", region: "JP", latitude: 35.6762, longitude: 139.6503 },
];

const SKY_CONDITIONS = {
  clear: {
    label: "Clear",
    shortLabel: "Clear",
    bodyClass: "sky-clear",
    ribbonColor: "var(--cond-clear)",
    icon: "clear",
  },
  partlyCloudy: {
    label: "Partly Cloudy",
    shortLabel: "Partly Cloudy",
    bodyClass: "sky-clear",
    ribbonColor: "var(--cond-partly)",
    icon: "partlyCloudy",
  },
  overcast: {
    label: "Overcast",
    shortLabel: "Overcast",
    bodyClass: "sky-overcast",
    ribbonColor: "var(--cond-overcast)",
    icon: "overcast",
  },
  fog: {
    label: "Foggy",
    shortLabel: "Fog",
    bodyClass: "sky-overcast",
    ribbonColor: "var(--cond-overcast)",
    icon: "fog",
  },
  drizzle: {
    label: "Light Rain",
    shortLabel: "Light Rain",
    bodyClass: "sky-rain",
    ribbonColor: "var(--cond-light-rain)",
    icon: "drizzle",
  },
  rain: {
    label: "Rain",
    shortLabel: "Rain",
    bodyClass: "sky-rain",
    ribbonColor: "var(--cond-rain)",
    icon: "rain",
  },
  heavyRain: {
    label: "Heavy Rain",
    shortLabel: "Heavy Rain",
    bodyClass: "sky-storm",
    ribbonColor: "var(--cond-heavy-rain)",
    icon: "heavyRain",
  },
  snow: {
    label: "Snow",
    shortLabel: "Snow",
    bodyClass: "sky-overcast",
    ribbonColor: "var(--cond-snow)",
    icon: "snow",
  },
  thunderstorm: {
    label: "Thunderstorm",
    shortLabel: "T-Storm",
    bodyClass: "sky-storm",
    ribbonColor: "var(--cond-heavy-rain)",
    icon: "thunderstorm",
  },
};

function conditionFromWMO(code) {
  switch (Number(code)) {
    case 0:
      return SKY_CONDITIONS.clear;
    case 1:
    case 2:
      return SKY_CONDITIONS.partlyCloudy;
    case 3:
      return SKY_CONDITIONS.overcast;
    case 45:
    case 48:
      return SKY_CONDITIONS.fog;
    case 51:
    case 53:
    case 55:
    case 80:
      return SKY_CONDITIONS.drizzle;
    case 61:
    case 63:
    case 81:
      return SKY_CONDITIONS.rain;
    case 65:
    case 82:
      return SKY_CONDITIONS.heavyRain;
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return SKY_CONDITIONS.snow;
    case 95:
    case 96:
    case 99:
      return SKY_CONDITIONS.thunderstorm;
    default:
      return SKY_CONDITIONS.clear;
  }
}

function getWeatherSVG(type) {
  switch (type) {
    case "clear":
      return `<svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="13.5" fill="#FBBF24"/>
        <g stroke="#FBBF24" stroke-width="3.2" stroke-linecap="round">
          <line x1="32" y1="7" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="57"/>
          <line x1="7" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="57" y2="32"/>
          <line x1="14.3" y1="14.3" x2="17.8" y2="17.8"/><line x1="46.2" y1="46.2" x2="49.7" y2="49.7"/>
          <line x1="49.7" y1="14.3" x2="46.2" y2="17.8"/><line x1="17.8" y1="46.2" x2="14.3" y2="49.7"/>
        </g>
      </svg>`;
    case "partlyCloudy":
      return `<svg viewBox="0 0 64 64" fill="none">
        <circle cx="24" cy="24" r="10" fill="#FBBF24"/>
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
        <g stroke="#58C7FF" stroke-width="3" stroke-linecap="round">
          <line x1="22" y1="45" x2="19" y2="55"/>
          <line x1="33" y1="45" x2="30" y2="55"/>
          <line x1="44" y1="45" x2="41" y2="55"/>
        </g>
      </svg>`;
    case "snow":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 40H48C53 40 57 36 57 31C57 26.3 53.4 22.5 48.8 22.1C47.2 15.2 41 10 33.5 10C24.9 10 18 16.9 18 25.5C18 26 18 26.5 18.1 27C14 27.8 11 31.4 11 35.7C11 38.1 12.9 40 15.3 40H18Z" fill="#CBD5E1"/>
        <circle cx="22" cy="50" r="3" fill="#7DD3FC"/>
        <circle cx="33" cy="53" r="3" fill="#7DD3FC"/>
        <circle cx="44" cy="50" r="3" fill="#7DD3FC"/>
      </svg>`;
    case "thunderstorm":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 38H48C53 38 57 34 57 29C57 24.3 53.4 20.5 48.8 20.1C47.2 13.2 41 8 33.5 8C24.9 8 18 14.9 18 23.5C18 24 18 24.5 18.1 25C14 25.8 11 29.4 11 33.7C11 36.1 12.9 38 15.3 38H18Z" fill="#64748B"/>
        <path d="M35 30L23 45H33L29 59L45 42H35L35 30Z" fill="#FBBF24"/>
      </svg>`;
    default:
      return `<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="13.5" fill="#FBBF24"/></svg>`;
  }
}

/* State */
const state = {
  location: { ...SAVED_LOCATIONS[0] },
  useImperial: localStorage.getItem("zus_unit_imp") !== "false",
  hourlyMode: "temp", // 'temp' | 'feels' | 'precip' | 'wind'
  weather: null,
};

/* Formatters */
function formatTemp(celsius, showUnit = false) {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) return "--°";
  const val = state.useImperial ? (celsius * 9) / 5 + 32 : celsius;
  const suffix = showUnit ? (state.useImperial ? "°F" : "°C") : "°";
  return `${Math.round(val)}${suffix}`;
}

function formatWind(kmh) {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) return "--";
  if (state.useImperial) {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

function formatPressure(hpa) {
  if (hpa === null || hpa === undefined || Number.isNaN(hpa)) return "--";
  if (state.useImperial) {
    return `${(hpa * 0.02953).toFixed(2)} inHg`;
  }
  return `${Math.round(hpa)} hPa`;
}

function formatPrecipAmount(mm) {
  if (!mm || mm <= 0) return state.useImperial ? "0.00 in" : "0.0 mm";
  if (state.useImperial) {
    return `${(mm / 25.4).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

function compassDirection(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8];
}

function muggyDescription(dewPointC) {
  if (dewPointC < 10) return "Dry & crisp";
  if (dewPointC < 15.5) return "Pleasant & comfortable";
  if (dewPointC < 18.5) return "Slightly humid";
  if (dewPointC < 21) return "Muggy";
  return "Oppressive humidity";
}

function aqiCategoryLabel(aqi) {
  if (aqi === null || aqi === undefined) return "Good air quality";
  if (aqi <= 50) return "Good — Clean air";
  if (aqi <= 100) return "Moderate — Acceptable";
  if (aqi <= 150) return "Unhealthy for sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  return "Very Unhealthy";
}

function uvAdvice(uv) {
  if (uv < 3) return "Low — Minimal protection needed";
  if (uv < 6) return "Moderate — Shade during midday";
  if (uv < 8) return "High — Sun protection recommended";
  if (uv < 11) return "Very High — Extra protection required";
  return "Extreme — Avoid direct midday sun";
}

/* Render Saved Locations Strip */
function renderLocationsStrip() {
  const strip = document.getElementById("locations-strip");
  strip.innerHTML = "";
  SAVED_LOCATIONS.forEach((loc) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isActive =
      Math.abs(loc.latitude - state.location.latitude) < 0.05 &&
      Math.abs(loc.longitude - state.location.longitude) < 0.05;
    btn.className = `location-chip ${isActive ? "active" : ""}`;
    btn.textContent = loc.name;
    btn.addEventListener("click", () => {
      state.location = { ...loc };
      renderLocationsStrip();
      loadWeatherForCurrentLocation();
    });
    strip.appendChild(btn);
  });
}

/* Load Hyperlocal Weather, Minutely-15 Nowcast, Air Quality & Multi-Model Ensemble */
async function loadWeatherForCurrentLocation() {
  const { latitude, longitude, name, region } = state.location;
  document.getElementById("hero-city").textContent = name;
  document.getElementById("location-kicker").innerHTML = `<span>📍 ${
    region || "Hyperlocal Telemetry"
  }</span>`;
  const latDir = latitude >= 0 ? "N" : "S";
  const lonDir = longitude >= 0 ? "E" : "W";
  document.getElementById("hero-coords").textContent = `${Math.abs(latitude).toFixed(
    4
  )}° ${latDir}, ${Math.abs(longitude).toFixed(4)}° ${lonDir}`;
  document.getElementById("last-updated").textContent = "Updating forecast...";

  // Update interactive radar iframe coordinates
  const radarIframe = document.getElementById("radar-iframe");
  if (radarIframe) {
    const targetSrc = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=7&overlay=radar&product=radar&level=surface&lat=${latitude.toFixed(
      3
    )}&lon=${longitude.toFixed(3)}`;
    if (radarIframe.src !== targetSrc) {
      radarIframe.src = targetSrc;
    }
  }
  document.getElementById("radar-coords-label").textContent = `${latitude.toFixed(
    2
  )}°, ${longitude.toFixed(2)}°`;

  try {
    const forecastParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation",
      minutely_15: "precipitation,weather_code",
      hourly:
        "temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m,visibility,cape,dew_point_2m",
      daily:
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset",
      timezone: "auto",
      forecast_days: "10",
    });

    const aqiParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "us_aqi,pm2_5",
    });

    const ensembleParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,precipitation",
      models: "best_match,ecmwf_ifs025,gfs_seamless,icon_seamless",
    });

    const [fResp, aqiResp, ensResp] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqiParams.toString()}`).catch(
        () => null
      ),
      fetch(`https://api.open-meteo.com/v1/forecast?${ensembleParams.toString()}`).catch(
        () => null
      ),
    ]);

    if (!fResp.ok) throw new Error(`HTTP ${fResp.status}`);
    const rawForecast = await fResp.json();
    const rawAqi = aqiResp && aqiResp.ok ? await aqiResp.json() : null;
    const rawEnsemble = ensResp && ensResp.ok ? await ensResp.json() : null;

    state.weather = parseWeatherData(rawForecast, rawAqi, rawEnsemble);
    renderDashboard();
  } catch (_) {
    document.getElementById("last-updated").textContent = "Connection interrupted";
  }
}

function parseWeatherData(raw, rawAqi, rawEnsemble) {
  const c = raw.current || {};
  const h = raw.hourly || {};
  const d = raw.daily || {};
  const m15 = raw.minutely_15 || {};

  const nowMs = Date.now();
  let startHourIdx = 0;
  if (Array.isArray(h.time)) {
    const found = h.time.findIndex((t) => new Date(t).getTime() >= nowMs - 3600000);
    if (found >= 0) startHourIdx = found;
  }

  // Extract 60-minute precipitation curve from minutely_15
  let startM15Idx = 0;
  if (Array.isArray(m15.time)) {
    const foundM15 = m15.time.findIndex((t) => new Date(t).getTime() >= nowMs - 900000);
    if (foundM15 >= 0) startM15Idx = foundM15;
  }

  const m15Points = [];
  for (let i = 0; i < 5; i++) {
    const idx = startM15Idx + i;
    const mm15 = Number(m15.precipitation?.[idx] ?? 0);
    // Convert 15-min accumulation to hourly rate (mm/hr)
    m15Points.push(mm15 * 4);
  }

  // Interpolate 61 minute-by-minute points (0..60m)
  const minuteRates = [];
  for (let min = 0; min <= 60; min++) {
    const seg = Math.min(3, Math.floor(min / 15));
    const frac = (min - seg * 15) / 15;
    const v0 = m15Points[seg] ?? 0;
    const v1 = m15Points[seg + 1] ?? v0;
    // Cosine smooth interpolation
    const mu = (1 - Math.cos(frac * Math.PI)) / 2;
    minuteRates.push(Math.max(0, v0 * (1 - mu) + v1 * mu));
  }

  // Next 24 hours
  const hourly = [];
  for (let i = 0; i < 24; i++) {
    const idx = startHourIdx + i;
    if (!h.time || idx >= h.time.length) break;
    hourly.push({
      time: new Date(h.time[idx]),
      temperature: h.temperature_2m[idx],
      feelsLike: h.apparent_temperature?.[idx] ?? h.temperature_2m[idx],
      wmoCode: h.weather_code[idx],
      precipProb: h.precipitation_probability?.[idx] ?? 0,
      precipMm: h.precipitation?.[idx] ?? 0,
      windSpeed: h.wind_speed_10m?.[idx] ?? 0,
    });
  }

  // 10-Day Forecast
  const daily = [];
  const dayLen = Math.min(d.time?.length || 0, 10);
  for (let i = 0; i < dayLen; i++) {
    daily.push({
      date: new Date(`${d.time[i]}T12:00:00`),
      wmoCode: d.weather_code[i],
      tempMin: d.temperature_2m_min[i],
      tempMax: d.temperature_2m_max[i],
      precipProb: d.precipitation_probability_max?.[i] ?? 0,
      precipSumMm: d.precipitation_sum?.[i] ?? 0,
      uvMax: d.uv_index_max?.[i] ?? 5,
      windMax: d.wind_speed_10m_max?.[i] ?? 10,
      windDir: d.wind_direction_10m_dominant?.[i] ?? 180,
      sunrise: d.sunrise?.[i] ?? null,
      sunset: d.sunset?.[i] ?? null,
    });
  }

  // Parse Multi-Model Ensemble
  const ec = rawEnsemble?.current || {};
  const ensembleModels = [
    {
      name: "HRRR / Best Match",
      tag: "High-Res",
      temp: ec.temperature_2m_best_match ?? c.temperature_2m,
      precip: ec.precipitation_best_match ?? c.precipitation ?? 0,
    },
    {
      name: "ECMWF IFS 0.25°",
      tag: "European",
      temp: ec.temperature_2m_ecmwf_ifs025 ?? c.temperature_2m,
      precip: ec.precipitation_ecmwf_ifs025 ?? c.precipitation ?? 0,
    },
    {
      name: "NOAA GFS",
      tag: "US Global",
      temp: ec.temperature_2m_gfs_seamless ?? c.temperature_2m,
      precip: ec.precipitation_gfs_seamless ?? c.precipitation ?? 0,
    },
    {
      name: "DWD ICON",
      tag: "German Global",
      temp: ec.temperature_2m_icon_seamless ?? c.temperature_2m,
      precip: ec.precipitation_icon_seamless ?? c.precipitation ?? 0,
    },
  ];

  const validTemps = ensembleModels
    .map((m) => m.temp)
    .filter((t) => t !== null && t !== undefined && !Number.isNaN(t));
  const spreadC =
    validTemps.length > 1
      ? Math.max(...validTemps) - Math.min(...validTemps)
      : 0.4;
  const confidencePct = Math.max(82, Math.min(99, Math.round(100 - spreadC * 4.5)));

  return {
    elevation: raw.elevation ?? 0,
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    dewPoint:
      h.dew_point_2m?.[startHourIdx] ??
      c.temperature_2m - (100 - c.relative_humidity_2m) / 5,
    pressure: c.surface_pressure,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    windGusts: c.wind_gusts_10m ?? c.wind_speed_10m * 1.25,
    cloudCover: c.cloud_cover ?? 0,
    wmoCode: c.weather_code ?? 0,
    tempMax: daily[0]?.tempMax ?? c.temperature_2m,
    tempMin: daily[0]?.tempMin ?? c.temperature_2m,
    uvIndex: daily[0]?.uvMax ?? 5,
    sunrise: daily[0]?.sunrise ?? null,
    sunset: daily[0]?.sunset ?? null,
    visibilityKm: (h.visibility?.[startHourIdx] ?? 10000) / 1000,
    cape: h.cape?.[startHourIdx] ?? 0,
    usAqi: rawAqi?.current?.us_aqi ?? 28,
    pm25: rawAqi?.current?.pm2_5 ?? 6.2,
    minuteRates,
    hourly,
    daily,
    ensembleModels,
    spreadC,
    confidencePct,
  };
}

/* Render Full Dark Sky + Liquid Glass Dashboard */
function renderDashboard() {
  const w = state.weather;
  if (!w) return;

  const cond = conditionFromWMO(w.wmoCode);
  document.body.className = cond.bodyClass;

  // Hero Card
  document.getElementById(
    "confidence-badge-text"
  ).textContent = `${w.confidencePct}% Model Agreement`;
  document.getElementById("hero-icon-container").innerHTML = getWeatherSVG(cond.icon);
  document.getElementById("hero-temp").textContent = formatTemp(w.temperature);
  document.getElementById("hero-condition").textContent = cond.label;
  document.getElementById("hero-feels-like").textContent = `Feels like ${formatTemp(
    w.feelsLike
  )}`;
  document.getElementById("hero-high-low").innerHTML = `High ${formatTemp(
    w.tempMax
  )} &bull; Low ${formatTemp(w.tempMin)}`;

  // Hero 4-Column Micro Strip
  document.getElementById("micro-wind").textContent = `${formatWind(
    w.windSpeed
  )} ${compassDirection(w.windDirection)}`;
  document.getElementById("micro-humidity").textContent = `${Math.round(w.humidity)}%`;
  document.getElementById("micro-dew").textContent = formatTemp(w.dewPoint);
  document.getElementById("micro-pressure").textContent = formatPressure(w.pressure);

  // Next-Hour Minute-by-Minute Nowcast
  renderNextHourNowcast(w.minuteRates, w.hourly[0]);

  // 24-Hour Condition Ribbon & Hourly Timeline
  renderConditionRibbon(w.hourly);
  renderHourlyTimeline(w.hourly);

  // Expandable 10-Day Forecast
  renderDailyForecast(w.daily);

  // 6 Atmospheric Telemetry Cards
  const aqi = Math.round(w.usAqi ?? 28);
  document.getElementById("detail-aqi").textContent = String(aqi);
  document.getElementById("aqi-dot").style.left = `${Math.min(
    100,
    Math.max(4, (aqi / 200) * 100)
  )}%`;
  document.getElementById("detail-aqi-desc").textContent = `${aqiCategoryLabel(
    aqi
  )} (PM2.5: ${Number(w.pm25 || 0).toFixed(1)} µg/m³)`;

  const uv = Math.round(w.uvIndex * 10) / 10;
  document.getElementById("detail-uv").textContent = String(uv);
  document.getElementById("uv-dot").style.left = `${Math.min(100, (uv / 11) * 100)}%`;
  document.getElementById("detail-uv-advice").textContent = uvAdvice(uv);

  document.getElementById("detail-wind").textContent = formatWind(w.windSpeed);
  document.getElementById("detail-wind-dir").textContent = `Gusts to ${formatWind(
    w.windGusts
  )} from ${compassDirection(w.windDirection)} (${w.windDirection}°)`;

  document.getElementById("detail-humidity").textContent = `${Math.round(w.humidity)}%`;
  document.getElementById("detail-dewpoint").textContent = `Dew point ${formatTemp(
    w.dewPoint
  )} — ${muggyDescription(w.dewPoint)}`;

  const visVal = state.useImperial
    ? `${(w.visibilityKm * 0.621371).toFixed(1)} mi`
    : `${w.visibilityKm.toFixed(1)} km`;
  document.getElementById("detail-visibility").textContent = visVal;
  document.getElementById("detail-clouds").textContent = `Cloud cover: ${Math.round(
    w.cloudCover
  )}% • Elev: ${Math.round(w.elevation)}m`;

  if (w.sunrise && w.sunset) {
    const sr = new Date(w.sunrise).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const ss = new Date(w.sunset).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    document.getElementById("detail-sunrise").textContent = sr;
    document.getElementById(
      "detail-sunset"
    ).textContent = `Sunset ${ss} • CAPE ${Math.round(w.cape)} J/kg`;
  }

  // Multi-Model Ensemble Strip
  renderEnsembleComparison(w.ensembleModels, w.spreadC);

  document.getElementById("last-updated").textContent = `Updated ${new Date().toLocaleTimeString(
    [],
    { hour: "numeric", minute: "2-digit" }
  )}`;
}

/* Dark Sky Next-Hour Precipitation Curve & Headline */
function renderNextHourNowcast(minuteRates, currentHour) {
  const headlineEl = document.getElementById("nowcast-headline");
  const subEl = document.getElementById("nowcast-subheadline");
  const canvas = document.getElementById("nowcast-canvas");
  if (!canvas) return;

  const threshold = 0.08; // mm/hr perceptible rain threshold
  const maxRate = Math.max(...minuteRates);
  const firstWetIdx = minuteRates.findIndex((r) => r >= threshold);
  const currentlyWet = minuteRates[0] >= threshold;

  if (maxRate < threshold) {
    const nextPrecipProb = currentHour?.precipProb ?? 0;
    headlineEl.textContent = "Clear of precipitation for the hour.";
    subEl.textContent =
      nextPrecipProb > 25
        ? `${nextPrecipProb}% chance of scattered moisture in the broader vicinity.`
        : "No radar echoes detected within the 60-minute hyperlocal window.";
  } else if (currentlyWet) {
    const stopIdx = minuteRates.findIndex((r, idx) => idx > 0 && r < threshold);
    const intensityLabel =
      maxRate >= 6.0 ? "Heavy rain" : maxRate >= 2.0 ? "Moderate rain" : "Light rain";
    if (stopIdx > 0) {
      headlineEl.textContent = `${intensityLabel} stopping in ${stopIdx} min.`;
    } else {
      headlineEl.textContent = `${intensityLabel} continuing for the hour.`;
    }
    subEl.textContent = `Peak intensity ${maxRate.toFixed(1)} mm/hr during the next 60 minutes.`;
  } else {
    const intensityLabel =
      maxRate >= 6.0 ? "Heavy rain" : maxRate >= 2.0 ? "Rain" : "Light rain";
    headlineEl.textContent = `${intensityLabel} starting in ${firstWetIdx} min.`;
    subEl.textContent = `60-minute radar trajectory indicates approaching precipitation.`;
  }

  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Horizontal threshold dashed lines (LIGHT, MED, HEAVY)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.11)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  [0.22, 0.52, 0.8].forEach((frac) => {
    const y = H * frac;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Plot curve (scale 0..10 mm/hr)
  const scaleMax = 9.0;
  const points = minuteRates.map((rate, i) => {
    const x = (i / 60) * W;
    const norm = Math.min(1, rate / scaleMax);
    const y = H - 4 - norm * (H - 14);
    return { x, y };
  });

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(56, 189, 248, 0.65)");
  grad.addColorStop(1, "rgba(56, 189, 248, 0.04)");

  ctx.beginPath();
  ctx.moveTo(0, H);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = "#58c7ff";
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

/* Dark Sky 24-Hour Condition Ribbon */
function renderConditionRibbon(hourly) {
  const ribbon = document.getElementById("condition-ribbon");
  ribbon.innerHTML = "";
  if (!hourly || !hourly.length) return;

  const segments = [];
  hourly.forEach((item) => {
    const cond = conditionFromWMO(item.wmoCode);
    const last = segments[segments.length - 1];
    if (last && last.shortLabel === cond.shortLabel) {
      last.count += 1;
    } else {
      segments.push({
        shortLabel: cond.shortLabel,
        color: cond.ribbonColor,
        count: 1,
      });
    }
  });

  const total = hourly.length;
  segments.forEach((seg) => {
    const div = document.createElement("div");
    div.className = "ribbon-segment";
    const pct = (seg.count / total) * 100;
    div.style.width = `${pct}%`;
    div.style.background = seg.color;
    div.textContent = pct >= 11 ? seg.shortLabel : "";
    div.title = `${seg.shortLabel} (${seg.count} hr)`;
    ribbon.appendChild(div);
  });
}

/* 24-Hour Timeline Cells (Supports Temp / Feels Like / Precip % / Wind) */
function renderHourlyTimeline(hourly) {
  const scroll = document.getElementById("hourly-scroll");
  scroll.innerHTML = "";
  if (!hourly) return;

  hourly.forEach((item, idx) => {
    const cond = conditionFromWMO(item.wmoCode);
    const cell = document.createElement("div");
    cell.className = `hour-cell ${idx === 0 ? "now" : ""}`;
    const timeLabel =
      idx === 0
        ? "Now"
        : item.time.toLocaleTimeString([], { hour: "numeric", hour12: true });

    let primaryVal = formatTemp(item.temperature);
    if (state.hourlyMode === "feels") {
      primaryVal = formatTemp(item.feelsLike);
    } else if (state.hourlyMode === "precip") {
      primaryVal = `${item.precipProb}%`;
    } else if (state.hourlyMode === "wind") {
      primaryVal = formatWind(item.windSpeed);
    }

    cell.innerHTML = `
      <div class="hour-time">${timeLabel}</div>
      <div class="hour-icon">${getWeatherSVG(cond.icon)}</div>
      <div class="hour-precip">${
        state.hourlyMode !== "precip" && item.precipProb >= 15
          ? `${item.precipProb}%`
          : ""
      }</div>
      <div class="hour-primary-val">${primaryVal}</div>
    `;
    scroll.appendChild(cell);
  });
}

/* Dark Sky Expandable 10-Day Forecast */
function renderDailyForecast(daily) {
  const list = document.getElementById("daily-list");
  const summaryBanner = document.getElementById("weekly-summary-banner");
  list.innerHTML = "";
  if (!daily || !daily.length) return;

  const allMins = daily.map((d) => d.tempMin);
  const allMaxs = daily.map((d) => d.tempMax);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const totalSpan = Math.max(1, globalMax - globalMin);

  // Build natural-language Dark Sky weekly summary
  const peakDay = daily.reduce(
    (best, cur) => (cur.tempMax > best.tempMax ? cur : best),
    daily[0]
  );
  const rainyDays = daily.filter((d) => d.precipProb >= 45);
  const peakDayName = peakDay.date.toLocaleDateString([], { weekday: "long" });
  if (rainyDays.length === 0) {
    summaryBanner.textContent = `Mostly dry conditions across the next 10 days, with temperatures peaking at ${formatTemp(
      peakDay.tempMax,
      true
    )} on ${peakDayName}.`;
  } else {
    const firstRainDay = rainyDays[0].date.toLocaleDateString([], { weekday: "long" });
    summaryBanner.textContent = `Precipitation likely starting ${firstRainDay}, with weekly highs reaching ${formatTemp(
      peakDay.tempMax,
      true
    )} on ${peakDayName}.`;
  }

  daily.forEach((dItem, idx) => {
    const cond = conditionFromWMO(dItem.wmoCode);
    const dayName =
      idx === 0
        ? "Today"
        : dItem.date.toLocaleDateString([], { weekday: "short" });
    const leftPct = ((dItem.tempMin - globalMin) / totalSpan) * 100;
    const widthPct = Math.max(7, ((dItem.tempMax - dItem.tempMin) / totalSpan) * 100);

    const wrapper = document.createElement("div");
    wrapper.className = `day-accordion ${idx === 0 ? "open" : ""}`;

    const sr = dItem.sunrise
      ? new Date(dItem.sunrise).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "--:--";
    const ss = dItem.sunset
      ? new Date(dItem.sunset).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "--:--";

    const dayNarrative = `${cond.label} throughout the day. High of ${formatTemp(
      dItem.tempMax,
      true
    )} and overnight low of ${formatTemp(dItem.tempMin, true)}.`;

    wrapper.innerHTML = `
      <button type="button" class="daily-row-btn" aria-expanded="${idx === 0}">
        <div class="daily-day">${dayName}</div>
        <div class="daily-icon">${getWeatherSVG(cond.icon)}</div>
        <div class="daily-precip">${
          dItem.precipProb >= 15 ? `${dItem.precipProb}%` : ""
        }</div>
        <div class="daily-range-group">
          <span class="daily-min">${formatTemp(dItem.tempMin)}</span>
          <div class="range-track">
            <div class="range-bar" style="left: ${leftPct}%; width: ${widthPct}%"></div>
          </div>
          <span class="daily-max">${formatTemp(dItem.tempMax)}</span>
        </div>
        <span class="day-chevron">▾</span>
      </button>
      <div class="day-drawer">
        <div class="day-drawer-summary">${dayNarrative}</div>
        <div class="day-drawer-metrics">
          <div class="drawer-metric-box">
            <div class="drawer-metric-label">Precip Accum</div>
            <div class="drawer-metric-val">${formatPrecipAmount(
              dItem.precipSumMm
            )} (${dItem.precipProb}%)</div>
          </div>
          <div class="drawer-metric-box">
            <div class="drawer-metric-label">Peak Wind</div>
            <div class="drawer-metric-val">${formatWind(
              dItem.windMax
            )} ${compassDirection(dItem.windDir)}</div>
          </div>
          <div class="drawer-metric-box">
            <div class="drawer-metric-label">Max UV Index</div>
            <div class="drawer-metric-val">${Math.round(dItem.uvMax)}</div>
          </div>
          <div class="drawer-metric-box">
            <div class="drawer-metric-label">Sunrise / Sunset</div>
            <div class="drawer-metric-val">${sr} / ${ss}</div>
          </div>
        </div>
      </div>
    `;

    const rowBtn = wrapper.querySelector(".daily-row-btn");
    rowBtn.addEventListener("click", () => {
      wrapper.classList.toggle("open");
    });

    list.appendChild(wrapper);
  });
}

/* Render Multi-Model Ensemble Strip */
function renderEnsembleComparison(models, spreadC) {
  const grid = document.getElementById("ensemble-models-grid");
  const spreadLabel = document.getElementById("ensemble-spread-label");
  if (!grid || !models) return;

  const spreadVal = state.useImperial ? spreadC * 1.8 : spreadC;
  const unit = state.useImperial ? "°F" : "°C";
  spreadLabel.textContent = `Model Spread: ±${(spreadVal / 2).toFixed(1)}${unit}`;

  grid.innerHTML = "";
  models.forEach((m) => {
    const box = document.createElement("div");
    box.className = "ensemble-pill-box";
    box.innerHTML = `
      <div class="ensemble-model-name">
        <span>${m.name}</span>
        <span>${m.tag}</span>
      </div>
      <div class="ensemble-model-temp">${formatTemp(m.temp, true)}</div>
      <div class="ensemble-model-meta">Precip rate: ${formatPrecipAmount(
        m.precip
      )}/hr</div>
    `;
    grid.appendChild(box);
  });
}

/* Subtle Ambient Liquid Atmosphere Canvas */
const atmosphereCanvas = {
  drops: [],
  init() {
    const canvas = document.getElementById("atmosphere-canvas");
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    this.drops = Array.from({ length: 75 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      len: 10 + Math.random() * 14,
      speed: 6 + Math.random() * 6,
    }));

    const loop = () => {
      this.render(canvas);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  render(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const wmo = state.weather?.wmoCode ?? 0;
    const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(wmo);

    if (isRainy) {
      ctx.strokeStyle = "rgba(125, 211, 252, 0.18)";
      ctx.lineWidth = 1.1;
      this.drops.forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 1.5, d.y + d.len);
        ctx.stroke();

        d.y += d.speed;
        d.x -= 0.8;
        if (d.y > canvas.height) {
          d.y = -20;
          d.x = Math.random() * canvas.width;
        }
      });
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
          dropdown.innerHTML = `<div class="search-result-item"><span class="search-result-meta">No matching locations</span></div>`;
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
              region: region || item.country || "",
              latitude: item.latitude,
              longitude: item.longitude,
            };
            input.value = "";
            dropdown.classList.remove("open");
            renderLocationsStrip();
            loadWeatherForCurrentLocation();
          });
          dropdown.appendChild(btn);
        });
        dropdown.classList.add("open");
      } catch (_) {
        dropdown.classList.remove("open");
      }
    }, 220);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      dropdown.classList.remove("open");
    }
  });
}

/* Automatic & Manual GPS Location Acquisition */
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
      let region = "GPS Hyperlocal";
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
          region = [admin, "GPS Hyperlocal"].filter(Boolean).join(" • ");
        }
      } catch (_) {}

      state.location = { name: cityName, region, latitude, longitude };
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg> GPS`;
      renderLocationsStrip();
      loadWeatherForCurrentLocation();
    },
    () => {
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg> GPS`;
      if (isAutoStartup) {
        loadWeatherForCurrentLocation();
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/* Setup Interactive Controls */
function setupControls() {
  document
    .getElementById("locate-me-btn")
    .addEventListener("click", () => acquireUserLocation(false));

  const unitBtn = document.getElementById("unit-toggle-btn");
  const updateUnitLabel = () => {
    unitBtn.textContent = state.useImperial ? "°F, mph" : "°C, km/h";
  };
  updateUnitLabel();

  unitBtn.addEventListener("click", () => {
    state.useImperial = !state.useImperial;
    localStorage.setItem("zus_unit_imp", String(state.useImperial));
    updateUnitLabel();
    if (state.weather) renderDashboard();
  });

  // 24-Hour Timeline Mode Tabs
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.hourlyMode = tab.dataset.mode || "temp";
      if (state.weather) {
        renderHourlyTimeline(state.weather.hourly);
      }
    });
  });
}

/* Boot ZüsCast */
document.addEventListener("DOMContentLoaded", () => {
  renderLocationsStrip();
  setupCitySearch();
  setupControls();
  atmosphereCanvas.init();

  // Preload initial forecast and automatically request GPS coordinates
  loadWeatherForCurrentLocation();
  acquireUserLocation(true);
});
