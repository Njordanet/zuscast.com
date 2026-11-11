/**
 * ZüsCast (zuscast.com) — Hyperlocal Weather & Down-to-the-Minute Nowcast
 * Liquid Glass interface with Dark Sky's minute-by-minute precipitation curve,
 * 24-hour sky condition ribbon, expandable 10-day forecast, and multi-model ensemble.
 */

const DEFAULT_FALLBACK_LOCATION = {
  name: "New York",
  region: "NY • 10007",
  latitude: 40.7128,
  longitude: -74.006,
};

const US_STATE_CODES = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeStateLabel(raw) {
  if (!raw) return "";
  const cleaned = String(raw).replace(/^[A-Z]{2}-/i, "").trim();
  if (/^\d+$/.test(cleaned)) return "";
  const code = US_STATE_CODES[cleaned.toLowerCase()];
  return code || cleaned;
}

function cleanCountryName(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/\s*\(the\)\s*/gi, "")
    .trim();
}

function resolveReverseGeocodeRegion(info, cityName = "") {
  if (!info) return "";
  const countryCode = String(info.countryCode || "").toUpperCase();
  const countryName = cleanCountryName(info.countryName);
  const subCodeSuffix = info.principalSubdivisionCode
    ? String(info.principalSubdivisionCode).replace(/^[A-Z]{2}-/i, "").trim()
    : "";
  const useShortCode =
    ["US", "CA", "AU"].includes(countryCode) && /^[A-Z]{2,3}$/i.test(subCodeSuffix);

  let admin = useShortCode
    ? subCodeSuffix.toUpperCase()
    : normalizeStateLabel(info.principalSubdivision);

  const cityLower = String(cityName || info.city || "").trim().toLowerCase();
  if (admin && cityLower && admin.toLowerCase() === cityLower) {
    const locality = String(info.locality || "").trim();
    if (locality && locality.toLowerCase() !== cityLower && !/^\d+$/.test(locality)) {
      admin = locality;
    } else {
      admin = "";
    }
  }

  const postcode = String(info.postcode || "").trim();
  if (postcode) {
    return [admin || countryName || countryCode, postcode].filter(Boolean).join(" • ");
  }
  if (countryCode && countryCode !== "US") {
    return [admin, countryName || countryCode].filter(Boolean).join(" • ");
  }
  return [admin || countryName, postcode].filter(Boolean).join(" • ");
}

function sanitizeRegionString(regionStr) {
  if (!regionStr) return "";
  const cleaned = String(regionStr)
    .replace(/📍/g, "")
    .replace(/\bGPS\s+Hyperlocal\b/gi, "")
    .replace(/\bHyperlocal(?:\s+Forecast|\s+Telemetry)?\b/gi, "")
    .replace(/^[•\s,]+|[•\s,]+$/g, "")
    .replace(/\s*•\s*•\s*/g, " • ")
    .trim();
  if (/^\d{1,3}$/.test(cleaned)) return "";
  const parts = cleaned
    .split("•")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1 && /^\d{1,3}$/.test(parts[0])) {
    parts.shift();
  }
  return parts.join(" • ");
}

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem("zus_recent_searches");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 6).map((item) => ({
      ...item,
      region: sanitizeRegionString(item.region),
    }));
  } catch (_) {
    return [];
  }
}

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
  sleet: {
    label: "Sleet / Freezing Mix",
    shortLabel: "Sleet",
    bodyClass: "sky-overcast",
    ribbonColor: "var(--cond-snow)",
    icon: "sleet",
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
    case 56:
    case 57:
    case 66:
    case 67:
    case 77:
      return SKY_CONDITIONS.sleet;
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

function getWeatherSVG(type, isNight = false) {
  switch (type) {
    case "clear":
      if (isNight) {
        return `<svg viewBox="0 0 64 64" fill="none">
          <defs>
            <linearGradient id="zus-moon-grad" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#FEF9C3"/>
              <stop offset="55%" stop-color="#FDE68A"/>
              <stop offset="100%" stop-color="#F59E0B"/>
            </linearGradient>
          </defs>
          <path d="M40.8 13.5C31.2 14.9 24.5 23.8 25.9 33.4C27.3 43 36.2 49.7 45.8 48.3C47.7 48 49.5 47.4 51.1 46.5C47.2 51.9 40.6 55.2 33.3 54.6C21.2 53.6 12.2 43 13.2 30.9C14.1 20.1 22.7 11.7 33.5 11C36.1 10.8 38.6 11.7 40.8 13.5Z" fill="url(#zus-moon-grad)"/>
          <circle cx="48" cy="18" r="1.8" fill="#FEF08A" opacity="0.9"/>
          <circle cx="53" cy="27" r="1.3" fill="#E0F2FE" opacity="0.8"/>
        </svg>`;
      }
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
      if (isNight) {
        return `<svg viewBox="0 0 64 64" fill="none">
          <path d="M29.5 11.2C23.4 12.1 19.1 17.8 20 23.9C20.9 30 26.6 34.3 32.7 33.4C33.9 33.2 35 32.8 36 32.2C33.5 35.7 29.3 37.8 24.7 37.4C17 36.8 11.3 30 11.9 22.3C12.5 15.4 18 10.1 24.9 9.6C26.5 9.5 28.1 10.1 29.5 11.2Z" fill="#FDE68A"/>
          <path d="M22 46H46C51.5 46 56 41.5 56 36C56 30.8 52.1 26.6 47 26.1C45.4 19.2 39.2 14 31.8 14C23.1 14 16 21.1 16 29.8C16 30.3 16 30.8 16.1 31.3C12.6 32.6 10 36 10 40C10 43.3 12.7 46 16 46H22Z" fill="#E2E8F0"/>
        </svg>`;
      }
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
    case "sleet":
      return `<svg viewBox="0 0 64 64" fill="none">
        <path d="M18 40H48C53 40 57 36 57 31C57 26.3 53.4 22.5 48.8 22.1C47.2 15.2 41 10 33.5 10C24.9 10 18 16.9 18 25.5C18 26 18 26.5 18.1 27C14 27.8 11 31.4 11 35.7C11 38.1 12.9 40 15.3 40H18Z" fill="#94A3B8"/>
        <g stroke="#58C7FF" stroke-width="2.6" stroke-linecap="round">
          <line x1="20" y1="46" x2="17" y2="54"/>
          <line x1="44" y1="46" x2="41" y2="54"/>
        </g>
        <circle cx="28" cy="50" r="2.8" fill="#E0F2FE" stroke="#7DD3FC" stroke-width="1.2"/>
        <circle cx="35" cy="56" r="2.4" fill="#E0F2FE" stroke="#7DD3FC" stroke-width="1.2"/>
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
const initialRecents = loadRecentSearches();
const state = {
  location: initialRecents[0]
    ? { ...initialRecents[0] }
    : { ...DEFAULT_FALLBACK_LOCATION },
  recentSearches: initialRecents,
  useImperial: localStorage.getItem("zus_unit_imp") !== "false",
  hourlyMode: "temp",
  dailyModes: {},
  weather: null,
};

function saveRecentSearch(loc) {
  if (!loc || !loc.name) return;
  state.recentSearches = [
    {
      name: loc.name,
      region: loc.region || "",
      latitude: loc.latitude,
      longitude: loc.longitude,
    },
    ...state.recentSearches.filter(
      (item) =>
        Math.abs(item.latitude - loc.latitude) >= 0.05 ||
        Math.abs(item.longitude - loc.longitude) >= 0.05
    ),
  ].slice(0, 6);
  localStorage.setItem("zus_recent_searches", JSON.stringify(state.recentSearches));
  renderLocationsStrip();
}

function removeRecentSearch(lat, lon) {
  state.recentSearches = state.recentSearches.filter(
    (item) =>
      Math.abs(item.latitude - lat) >= 0.05 ||
      Math.abs(item.longitude - lon) >= 0.05
  );
  localStorage.setItem("zus_recent_searches", JSON.stringify(state.recentSearches));
  renderLocationsStrip();
}

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

function calculateHumidex(tempC, dewPointC = null, relativeHumidity = null) {
  const T = Number(tempC ?? 0);
  let e;
  if (dewPointC !== null && dewPointC !== undefined && !Number.isNaN(Number(dewPointC))) {
    const Td = Number(dewPointC);
    e = 6.11 * Math.pow(10, (7.5 * Td) / (237.3 + Td));
  } else {
    const rh = Math.max(0, Math.min(100, Number(relativeHumidity ?? 50)));
    e = (rh / 100) * 6.112 * Math.exp((17.67 * T) / (T + 243.5));
  }
  const humidex = T + (5 / 9) * (e - 10);
  return { humidex, vaporPressureHpa: e };
}

/* Thermodynamic Wet-Bulb & Snow/Sleet Physics (Stull 2011 & Kuchera SLR) */
function calcWetBulbC(tempC, rhPct) {
  const t = Number(tempC);
  const rh = Math.max(1.0, Math.min(100.0, Number(rhPct) || 50));
  if (Number.isNaN(t)) return null;
  const tw =
    t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(t + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035;
  return Math.round(tw * 10) / 10;
}

function calcSnowLiquidRatio(tempC, precipType = null) {
  if (precipType === "sleet") return 3.0;
  if (precipType === "rain") return 0.0;
  const t = Number(tempC);
  if (Number.isNaN(t)) return 10.0;
  let slr;
  if (t >= 0.5) {
    slr = Math.max(4.0, 10.0 - 3.0 * t);
  } else if (t >= -15.0) {
    slr = 10.0 + (8.0 / 15.0) * (-t);
  } else if (t >= -25.0) {
    slr = Math.max(14.0, 18.0 - 0.3 * (-t - 15.0));
  } else {
    slr = 14.0;
  }
  return Math.round(slr * 10) / 10;
}

function formatSnowAccum(accumCm) {
  if (accumCm === null || accumCm === undefined || Number.isNaN(Number(accumCm))) return null;
  const cm = Number(accumCm);
  if (state.useImperial) {
    const inches = cm / 2.54;
    if (inches < 0.1) return null;
    return `${inches >= 10 ? Math.round(inches) : inches.toFixed(1)}"`;
  }
  if (cm < 0.25) return null;
  return `${cm >= 10 ? Math.round(cm) : cm.toFixed(1)} cm`;
}

function humidexComfortTier(humidexVal) {
  const h = Math.round(Number(humidexVal ?? 0));
  if (h < 20) {
    return { label: "Cool", shortLabel: "Cool", pillClass: "pill-sky" };
  }
  if (h <= 29) {
    return { label: "Comfortable", shortLabel: "Comfy", pillClass: "pill-emerald" };
  }
  if (h <= 39) {
    return { label: "Muggy", shortLabel: "Muggy", pillClass: "pill-amber" };
  }
  return { label: "Dangerous", shortLabel: "Danger", pillClass: "pill-rose" };
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

function toggleMobileSearch(forceOpen) {
  const topNav = document.querySelector(".top-nav");
  const firstScreen = document.getElementById("mobile-first-screen");
  const toggleBtn = document.getElementById("mobile-search-toggle-btn");
  const searchInput = document.getElementById("city-search-input");
  const dropdown = document.getElementById("search-dropdown");
  if (!topNav) return;

  const isCurrentlyOpen = topNav.classList.contains("mobile-search-open");
  const nextOpen = typeof forceOpen === "boolean" ? forceOpen : !isCurrentlyOpen;

  topNav.classList.toggle("mobile-search-open", nextOpen);
  if (firstScreen) {
    firstScreen.classList.toggle("search-expanded", nextOpen);
  }
  if (toggleBtn) {
    toggleBtn.setAttribute("aria-expanded", String(nextOpen));
  }
  if (nextOpen) {
    requestAnimationFrame(() => {
      if (searchInput) searchInput.focus();
    });
  } else {
    if (dropdown) dropdown.classList.remove("open");
    if (searchInput) searchInput.blur();
  }
}

/* Render Compact Recent Searches Strip (Max 3 Cities, Excluding Currently Displayed City) */
function renderLocationsStrip() {
  const strip = document.getElementById("locations-strip");
  if (!strip) return;
  strip.innerHTML = "";

  const otherCities = state.recentSearches
    .filter((loc) => {
      const sameCoords =
        Math.abs(loc.latitude - state.location.latitude) < 0.05 &&
        Math.abs(loc.longitude - state.location.longitude) < 0.05;
      const sameName =
        (loc.name || "").trim().toLowerCase() ===
        (state.location.name || "").trim().toLowerCase();
      return !sameCoords && !sameName;
    })
    .slice(0, 3);

  if (!otherCities.length) {
    strip.classList.add("empty");
    return;
  }
  strip.classList.remove("empty");

  const label = document.createElement("span");
  label.className = "recent-label";
  label.textContent = "Recent:";
  strip.appendChild(label);

  otherCities.forEach((loc) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "location-chip";
    btn.innerHTML = `<span>${loc.name}</span><span class="chip-remove">&times;</span>`;

    btn.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip-remove")) {
        e.stopPropagation();
        removeRecentSearch(loc.latitude, loc.longitude);
        return;
      }
      state.location = { ...loc };
      toggleMobileSearch(false);
      saveRecentSearch(state.location);
      renderLocationsStrip();
      loadWeatherForCurrentLocation();
    });
    strip.appendChild(btn);
  });
}

const ZUS_API_HTTPS_HOST = "https://api.zuscast.com";
const ZUS_API_LAN_HOST = "http://192.168.1.65:8000";
const ZUS_API_HOST =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? ZUS_API_HTTPS_HOST
    : ZUS_API_LAN_HOST;
const ZUS_API_BASE = `${ZUS_API_HOST}/api/v1`;

/* Interactive Züs 1km Doppler Radar & 2-Hour Nowcast Map Controller */
const dopplerRadarMap = {
  map: null,
  marker: null,
  scanCircle: null,
  probeMarker: null,
  probedCoords: null,
  probedTelemetry: null,
  tileLayers: {},
  _rawTilePromises: new Map(),
  _processedCanvasCache: new Map(),
  _preloadedTileUrls: new Set(),
  _readyFrameIds: new Set(),
  _lastReadyFrameId: null,
  _baseLayer: null,
  _labelLayer: null,
  activeFrameId: null,
  frames: [],
  currentIndex: 0,
  isPlaying: false,
  playTimer: null,
  telemetry: null,
  cacheStats: null,
  isModalOpen: false,
  modalCloseTimer: null,
  baseZoom: 8,
  layerMode: "both",
  showWindHeatmap: false,
  windCanvas: null,
  windCtx: null,
  _windHeatCanvas: null,
  _windHeatCtx: null,
  _windHeatImgData: null,
  windRafId: null,
  windParticles: [],

  init() {
    const mapEl = document.getElementById("zus-doppler-map");
    if (!mapEl || typeof L === "undefined") return;

    this.map = L.map(mapEl, {
      center: [state.location.latitude, state.location.longitude],
      zoom: this.baseZoom,
      minZoom: 3,
      maxZoom: 10,
      zoomSnap: 0.25,
      zoomDelta: 1,
      fadeAnimation: false,
      zoomAnimation: true,
      markerZoomAnimation: true,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    this.initTrackpadGestures(mapEl);

    // Keyless Esri World Dark Gray Base (persistent 8-tile ring buffer so pan/zoom/modal never flashes)
    this._baseLayer = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        zIndex: 1,
        keepBuffer: 8,
        updateWhenIdle: false,
        updateWhenZooming: false,
      }
    ).addTo(this.map);

    // Transparent Esri World Dark Gray Reference labels layered above the Doppler radar tiles
    this._labelLayer = L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        zIndex: 350,
        opacity: 0.92,
        keepBuffer: 8,
        updateWhenIdle: false,
        updateWhenZooming: false,
      }
    ).addTo(this.map);

    // 35km hyperlocal Doppler scan ring
    this.scanCircle = L.circle([state.location.latitude, state.location.longitude], {
      radius: 35000,
      color: "rgba(56, 189, 248, 0.42)",
      weight: 1.2,
      dashArray: "4 5",
      fillColor: "rgba(56, 189, 248, 0.04)",
      fillOpacity: 1,
      interactive: false,
    }).addTo(this.map);

    // Active location marker
    this.marker = L.circleMarker([state.location.latitude, state.location.longitude], {
      radius: 6,
      color: "#fbbf24",
      weight: 2,
      fillColor: "#38bdf8",
      fillOpacity: 0.95,
    }).addTo(this.map);

    // In inline card: click opens expanded modal.
    // In expanded modal: press-and-hold (~500ms) probes point; single tap dismisses an active probe.
    const mapContainer = this.map.getContainer();
    let holdTimer = null;
    let holdStartPt = null;
    let holdFired = false;
    let lastHoldTs = 0;

    const cancelHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdStartPt = null;
    };

    const isControlTarget = (target) =>
      Boolean(
        target &&
          target.closest &&
          (target.closest("#radar-controls-bar") ||
            target.closest("#radar-map-controls") ||
            target.closest("#radar-probe-toast") ||
            target.closest("#radar-hud-left"))
      );

    const startHold = (clientX, clientY, target) => {
      if (!this.isModalOpen || !this.map || isControlTarget(target)) return;
      cancelHold();
      holdFired = false;
      const rect = mapContainer.getBoundingClientRect();
      holdStartPt = { x: clientX - rect.left, y: clientY - rect.top };
      holdTimer = setTimeout(() => {
        holdTimer = null;
        if (!holdStartPt || !this.isModalOpen || !this.map) return;
        holdFired = true;
        lastHoldTs = Date.now();
        const ll = this.map.containerPointToLatLng([holdStartPt.x, holdStartPt.y]);
        if (ll) {
          this.probePoint(ll.lat, ll.lng);
        }
      }, 500);
    };

    const moveHold = (clientX, clientY) => {
      if (!holdTimer || !holdStartPt) return;
      const rect = mapContainer.getBoundingClientRect();
      const dx = clientX - rect.left - holdStartPt.x;
      const dy = clientY - rect.top - holdStartPt.y;
      if (dx * dx + dy * dy > 64) {
        cancelHold();
      }
    };

    mapContainer.addEventListener(
      "touchstart",
      (e) => {
        if (!e.touches || e.touches.length !== 1) {
          cancelHold();
          return;
        }
        startHold(e.touches[0].clientX, e.touches[0].clientY, e.target);
      },
      { passive: true }
    );
    mapContainer.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches || e.touches.length !== 1) {
          cancelHold();
          return;
        }
        moveHold(e.touches[0].clientX, e.touches[0].clientY);
      },
      { passive: true }
    );
    mapContainer.addEventListener("touchend", cancelHold, { passive: true });
    mapContainer.addEventListener("touchcancel", cancelHold, { passive: true });

    mapContainer.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      startHold(e.clientX, e.clientY, e.target);
    });
    mapContainer.addEventListener("mousemove", (e) => {
      moveHold(e.clientX, e.clientY);
    });
    mapContainer.addEventListener("mouseup", cancelHold);
    mapContainer.addEventListener("mouseleave", cancelHold);
    mapContainer.addEventListener("contextmenu", (e) => {
      if (this.isModalOpen) e.preventDefault();
    });

    this.map.on("movestart zoomstart dragstart", cancelHold);

    this.map.on("click", () => {
      if (!this.isModalOpen) {
        this.openModal();
        return;
      }
      if (holdFired || Date.now() - lastHoldTs < 450) {
        holdFired = false;
        return;
      }
      if (this.probedCoords) {
        this.clearProbe();
      }
    });

    const radarCardEl = document.getElementById("radar-map-card");
    const frameEl = document.getElementById("radar-map-frame");
    const cardHeaderEl = document.getElementById("radar-card-header");
    const controlsBar = document.getElementById("radar-controls-bar");
    const mapControls = document.getElementById("radar-map-controls");
    const probeToast = document.getElementById("radar-probe-toast");
    const hudLeft = document.getElementById("radar-hud-left");
    const layerPill = document.getElementById("radar-layer-pill");
    const heatmapBtn = document.getElementById("radar-heatmap-btn");
    const playBtn = document.getElementById("radar-play-btn");
    const slider = document.getElementById("radar-frame-slider");
    const zoomInBtn = document.getElementById("radar-zoom-in");
    const zoomOutBtn = document.getElementById("radar-zoom-out");
    const recenterBtn = document.getElementById("radar-recenter-btn");
    const probeCloseBtn = document.getElementById("radar-probe-close");
    const modalBackdrop = document.getElementById("radar-detail-modal");
    const modalCloseBtn = document.getElementById("radar-modal-close");

    // Prevent clicks/drags on floating controls from bubbling to map click or inline expand
    [controlsBar, mapControls, probeToast, hudLeft].forEach((el) => {
      if (!el) return;
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      ["click", "pointerdown", "mousedown", "touchstart"].forEach((evt) => {
        el.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
      });
    });

    if (layerPill) {
      layerPill.querySelectorAll(".radar-layer-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.setLayerMode(btn.dataset.layer || "radar");
        });
      });
    }

    if (heatmapBtn) {
      heatmapBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showWindHeatmap = !this.showWindHeatmap;
        heatmapBtn.classList.toggle("is-on", this.showWindHeatmap);
        heatmapBtn.setAttribute("aria-pressed", String(this.showWindHeatmap));
      });
    }

    this.initRegionalRadarCanvas();
    this.initWindCanvas();
    this.map.on("move zoom viewreset resize", () => {
      this.renderRegionalRadarCanvas();
      this.resizeWindCanvas();
      if (this.layerMode === "wind" || this.layerMode === "both") {
        this.drawWindCanvasFrame(false);
      }
    });
    this.setLayerMode("both");

    if (frameEl) {
      frameEl.addEventListener("click", (e) => {
        if (this.isModalOpen) return;
        if (
          e.target.closest("#radar-controls-bar") ||
          e.target.closest("#radar-map-controls") ||
          e.target.closest("#radar-hud-left")
        ) {
          return;
        }
        this.openModal();
      });
    }

    if (radarCardEl) {
      radarCardEl.addEventListener("click", (e) => {
        if (this.isModalOpen) return;
        if (
          e.target.closest("#radar-controls-bar") ||
          e.target.closest("#radar-map-controls") ||
          e.target.closest("#radar-hud-left")
        ) {
          return;
        }
        this.openModal();
      });
    }

    if (cardHeaderEl) {
      cardHeaderEl.addEventListener("click", () => this.openModal());
      cardHeaderEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.openModal();
        }
      });
    }

    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", () => this.closeModal());
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) this.closeModal();
      });
    }

    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.togglePlay();
      });
    }
    if (slider) {
      slider.addEventListener("input", (e) => {
        e.stopPropagation();
        this.stopPlay();
        this.setFrameIndex(Number(e.target.value));
      });
    }
    const tickLive = document.getElementById("radar-tick-live");
    if (tickLive) {
      tickLive.addEventListener("click", (e) => {
        e.stopPropagation();
        this.stopPlay();
        const liveIdx = this.frames.findIndex((f) => f.offsetMinutes === 0);
        if (liveIdx >= 0) this.setFrameIndex(liveIdx);
      });
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.map) this.map.zoomIn();
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.map) this.map.zoomOut();
      });
    }
    if (recenterBtn) {
      recenterBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearProbe();
        if (this.map) {
          this.map.setView([state.location.latitude, state.location.longitude], this.baseZoom, {
            animate: true,
          });
        }
      });
    }
    if (probeCloseBtn) {
      probeCloseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.clearProbe();
      });
    }
    const hudFooterEl = document.getElementById("radar-modal-hud-footer");
    if (hudFooterEl) {
      const toggleHudExpanded = (e) => {
        e.stopPropagation();
        const expanded = hudFooterEl.classList.toggle("is-expanded");
        hudFooterEl.setAttribute("aria-expanded", String(expanded));
      };
      hudFooterEl.addEventListener("click", toggleHudExpanded);
      hudFooterEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleHudExpanded(e);
        }
      });
    }
  },

  initTrackpadGestures(mapEl) {
    if (!mapEl) return;
    this._wheelPinchAccum = 0;
    this._safariGestureActive = false;
    this._gestureStartZoom = this.baseZoom;

    mapEl.addEventListener(
      "wheel",
      (e) => {
        if (!this.isModalOpen || !this.map) return;
        e.preventDefault();
        e.stopPropagation();

        // Trackpad pinch-to-zoom (fires wheel with ctrlKey === true across Chrome, Safari, Firefox, Edge)
        if (e.ctrlKey || e.metaKey) {
          if (this._safariGestureActive) return;
          const zoomDelta = -e.deltaY * 0.024;
          this._wheelPinchAccum += zoomDelta;
          if (Math.abs(this._wheelPinchAccum) >= 0.25) {
            const step = Math.trunc(this._wheelPinchAccum / 0.25) * 0.25;
            this._wheelPinchAccum -= step;
            const rect = mapEl.getBoundingClientRect();
            const pt = L.point(e.clientX - rect.left, e.clientY - rect.top);
            const nextZoom = Math.max(
              this.map.getMinZoom(),
              Math.min(this.map.getMaxZoom(), this.map.getZoom() + step)
            );
            this.map.setZoomAround(pt, nextZoom, { animate: false });
          }
          return;
        }

        // Two-finger trackpad move -> pan the map
        this._wheelPinchAccum = 0;
        const scale = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? 360 : 1;
        const dx = e.deltaX * scale;
        const dy = e.deltaY * scale;
        if (dx !== 0 || dy !== 0) {
          this.map.panBy([dx, dy], { animate: false });
        }
      },
      { passive: false }
    );

    // WebKit / Safari native trackpad pinch gesture fallback
    mapEl.addEventListener(
      "gesturestart",
      (e) => {
        if (!this.isModalOpen || !this.map) return;
        e.preventDefault();
        this._safariGestureActive = true;
        this._gestureStartZoom = this.map.getZoom();
      },
      { passive: false }
    );

    mapEl.addEventListener(
      "gesturechange",
      (e) => {
        if (!this.isModalOpen || !this.map) return;
        e.preventDefault();
        const scale = e.scale || 1;
        const rawTarget = this._gestureStartZoom + Math.log2(scale) * 1.6;
        const snapped = Math.round(rawTarget * 4) / 4;
        const nextZoom = Math.max(
          this.map.getMinZoom(),
          Math.min(this.map.getMaxZoom(), snapped)
        );
        if (nextZoom !== this.map.getZoom()) {
          const rect = mapEl.getBoundingClientRect();
          const cx = typeof e.clientX === "number" ? e.clientX - rect.left : rect.width / 2;
          const cy = typeof e.clientY === "number" ? e.clientY - rect.top : rect.height / 2;
          this.map.setZoomAround(L.point(cx, cy), nextZoom, { animate: false });
        }
      },
      { passive: false }
    );

    mapEl.addEventListener("gestureend", () => {
      this._safariGestureActive = false;
    });
  },

  setMapInteractive(interactive) {
    if (!this.map) return;
    // Keep scrollWheelZoom disabled so two-finger trackpad gestures pan instead of zooming
    const handlers = [
      "dragging",
      "touchZoom",
      "doubleClickZoom",
      "boxZoom",
      "keyboard",
    ];
    handlers.forEach((h) => {
      if (this.map[h]) {
        if (interactive) this.map[h].enable();
        else this.map[h].disable();
      }
    });
    if (this.map.scrollWheelZoom) {
      this.map.scrollWheelZoom.disable();
    }
    this.updateCoordsHudLabel();
  },

  updateCoordsHudLabel() {
    const labelEl = document.getElementById("radar-coords-label");
    if (!labelEl || !state.location) return;
    const { latitude, longitude } = state.location;
    if (this.isModalOpen) {
      labelEl.removeAttribute("hidden");
      labelEl.textContent = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
    } else {
      labelEl.setAttribute("hidden", "");
    }
  },

  syncModalTitleAndKickers() {
    const cardKickerEl = document.getElementById("radar-card-kicker-text");
    const modalKickerEl = document.getElementById("radar-modal-kicker");
    const titleEl = document.getElementById("radar-modal-title");
    const city = state.location?.name || "Current Location";

    if (cardKickerEl) {
      cardKickerEl.textContent =
        this.layerMode === "wind"
          ? "Wind Flow Map"
          : this.layerMode === "both"
          ? "Radar & Wind Flow"
          : "Radar";
    }
    if (modalKickerEl) {
      const kickerLabel =
        this.layerMode === "wind"
          ? "ZÜS 10M SURFACE STREAMLINES & GUST FIELD"
          : this.layerMode === "both"
          ? "ZÜS 1KM DOPPLER + 10M WIND COMPOSITE"
          : "ZÜS 1KM DOPPLER & 2-HOUR NOWCAST";
      modalKickerEl.innerHTML = `<span class="radar-live-dot"></span> <span>${kickerLabel}</span>`;
    }
    if (titleEl) {
      const suffix =
        this.layerMode === "wind"
          ? "Live Wind Flow & 2h Forecast"
          : this.layerMode === "both"
          ? "Radar + Wind Flow Composite"
          : "Live Radar & 2h Nowcast";
      titleEl.textContent = `${city} • ${suffix}`;
    }
  },

  setLayerMode(mode) {
    const valid = ["radar", "wind", "both"].includes(mode) ? mode : "both";
    this.layerMode = valid;

    const layerPill = document.getElementById("radar-layer-pill");
    if (layerPill) {
      layerPill.querySelectorAll(".radar-layer-btn").forEach((btn) => {
        const isMatch = btn.dataset.layer === valid;
        btn.classList.toggle("active", isMatch);
        btn.setAttribute("aria-selected", String(isMatch));
      });
    }

    const heatmapBtn = document.getElementById("radar-heatmap-btn");
    if (heatmapBtn) {
      if (valid === "radar") {
        heatmapBtn.setAttribute("hidden", "");
      } else {
        heatmapBtn.removeAttribute("hidden");
      }
    }

    // Adjust active Doppler radar tile opacity based on mode (smooth crossfade between adjacent frames)
    this.applyRadarCrossfadeOpacity();

    // Toggle Wind Streamline & Color Field Canvas (locked to map coordinates)
    if (this.windCanvas) {
      const showWind = valid === "wind" || valid === "both";
      this.windCanvas.classList.toggle("is-active", showWind);
      if (showWind) {
        this.resizeWindCanvas();
        this.drawWindCanvasFrame(false);
        this.startWindLoop();
      } else {
        this.stopWindLoop();
      }
    }

    this.syncModalTitleAndKickers();
    this.renderTelemetryStrip(this.probedTelemetry || this.telemetry);
    if (this.probedCoords) {
      this.updateProbeToastText(this.probedCoords.lat, this.probedCoords.lon, this.probedTelemetry);
    }
  },

  initWindCanvas() {
    this.windCanvas = document.getElementById("zus-wind-canvas");
    if (!this.windCanvas) return;
    this.windCtx = this.windCanvas.getContext("2d");
    this.resizeWindCanvas();
  },

  resizeWindCanvas() {
    if (!this.windCanvas || !this.windCtx) return;
    const rect = this.windCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (this.windCanvas.width !== targetW || this.windCanvas.height !== targetH) {
      this.windCanvas.width = targetW;
      this.windCanvas.height = targetH;
      this.windCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!this.windParticles.length) {
        this.resetWindParticles(rect.width, rect.height);
      }
    }
  },

  spawnWindParticle(w, h, randomAge = false) {
    const maxAge = 55 + Math.random() * 45;
    const sx = Math.random() * (w || 600);
    const sy = Math.random() * (h || 450);
    let lat = state.location?.latitude ?? 40.7128;
    let lon = state.location?.longitude ?? -74.006;
    if (this.map) {
      const ll = this.map.containerPointToLatLng([sx, sy]);
      lat = ll.lat;
      lon = ll.lng;
    }
    return {
      lat,
      lon,
      age: randomAge ? Math.floor(Math.random() * maxAge) : 0,
      maxAge,
      trail: [],
    };
  },

  resetWindParticles(w, h) {
    const rect = this.windCanvas?.getBoundingClientRect();
    const width = w || rect?.width || 600;
    const height = h || rect?.height || 450;
    const count = window.innerWidth <= 640 ? 125 : 175;
    this.windParticles = [];
    for (let i = 0; i < count; i++) {
      this.windParticles.push(this.spawnWindParticle(width, height, true));
    }
  },

  windColorRgb(kmh) {
    const mph = Math.max(0, kmh * 0.621371);
    const stops = [
      [0, 56, 189, 248],    // Calm / Light Sky Cyan
      [12, 52, 211, 153],   // Breeze Emerald
      [22, 250, 204, 21],   // Strong Breeze Züs Gold
      [33, 249, 115, 22],   // Near Gale Amber Orange
      [46, 232, 121, 249],  // Gale / Storm Magenta
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const s0 = stops[i];
      const s1 = stops[i + 1];
      if (mph <= s1[0]) {
        const t = Math.max(0, Math.min(1, (mph - s0[0]) / Math.max(0.001, s1[0] - s0[0])));
        return [
          Math.round(s0[1] + (s1[1] - s0[1]) * t),
          Math.round(s0[2] + (s1[2] - s0[2]) * t),
          Math.round(s0[3] + (s1[3] - s0[3]) * t),
        ];
      }
    }
    return [232, 121, 249];
  },

  beaufortLabel(kmh) {
    const mph = kmh * 0.621371;
    if (mph < 4) return "Calm";
    if (mph < 8) return "Light Breeze";
    if (mph < 13) return "Gentle Breeze";
    if (mph < 19) return "Moderate Breeze";
    if (mph < 25) return "Fresh Breeze";
    if (mph < 32) return "Strong Breeze";
    if (mph < 39) return "Near Gale";
    return "Gale Force";
  },

  sampleWindField(lat, lon, offsetMinutes = 0) {
    const baseLat = state.location?.latitude ?? 40.7128;
    const baseLon = state.location?.longitude ?? -74.006;
    const w = state.weather;

    let baseSpeedKmh = w?.windSpeed ?? 24;
    let baseGustKmh = w?.windGusts ?? Math.max(baseSpeedKmh * 1.38, baseSpeedKmh + 9);
    let baseFromDeg = w?.windDirection ?? 245;

    // Blend speed, gusts, and wind direction with hourly forecast when scrubbing forward
    if (offsetMinutes > 0 && Array.isArray(w?.hourly) && w.hourly.length > 1) {
      const hrFloat = Math.min(w.hourly.length - 1, offsetMinutes / 60);
      const idx0 = Math.floor(hrFloat);
      const idx1 = Math.min(w.hourly.length - 1, idx0 + 1);
      const h0 = w.hourly[idx0] || w.hourly[0];
      const h1 = w.hourly[idx1] || h0;
      const frac = hrFloat - idx0;
      baseSpeedKmh =
        (h0.windSpeed ?? baseSpeedKmh) * (1 - frac) + (h1.windSpeed ?? baseSpeedKmh) * frac;
      baseGustKmh =
        (h0.windGusts ?? baseGustKmh) * (1 - frac) + (h1.windGusts ?? baseGustKmh) * frac;

      if (typeof h0.windDirection === "number" && typeof h1.windDirection === "number") {
        const d0 = (h0.windDirection * Math.PI) / 180;
        const d1 = (h1.windDirection * Math.PI) / 180;
        const sinMix = Math.sin(d0) * (1 - frac) + Math.sin(d1) * frac;
        const cosMix = Math.cos(d0) * (1 - frac) + Math.cos(d1) * frac;
        baseFromDeg = ((Math.atan2(sinMix, cosMix) * 180) / Math.PI + 360) % 360;
      }
    }

    // Geographic offset in degrees from station center, advected by time offset
    const advShift = (offsetMinutes / 60) * 0.18;
    const dLon = lon - baseLon - advShift;
    const dLat = lat - baseLat + advShift * 0.45;

    // Synoptic wave & localized jet streak modulation across the sector
    const waveRad =
      Math.sin(dLon * 3.4 + dLat * 2.1) * 0.28 +
      Math.cos(dLat * 3.1 - dLon * 1.7) * 0.18;
    const jetCore1 = Math.exp(-((dLon + 0.08) ** 2 + (dLat - 0.04) ** 2) * 8.5) * 14;
    const jetCore2 = Math.exp(-((dLon - 0.22) ** 2 + (dLat + 0.15) ** 2) * 10.0) * 9;
    const spatialMod = 1 + Math.sin(dLon * 4.2) * 0.14 + Math.cos(dLat * 3.8) * 0.1;

    const speedKmh = Math.max(5, Math.min(95, baseSpeedKmh * spatialMod + jetCore1 + jetCore2));
    const gustKmh = Math.max(speedKmh + 5, baseGustKmh * spatialMod + jetCore1 * 1.25);

    const localFromDeg = (((baseFromDeg + (waveRad * 180) / Math.PI) % 360) + 360) % 360;
    const moveTowardsDeg = (localFromDeg + 180) % 360;
    const moveRad = (moveTowardsDeg * Math.PI) / 180;

    // Screen-space velocity at base zoom (east = +x, north = -y)
    const speedPx = Math.max(0.85, Math.min(4.2, speedKmh / 16.5));
    const vx = Math.sin(moveRad) * speedPx;
    const vy = -Math.cos(moveRad) * speedPx;

    return {
      vx,
      vy,
      speedKmh,
      gustKmh,
      windFromDeg: Math.round(localFromDeg),
      windFromCompass: compassDirection(localFromDeg),
      beaufort: this.beaufortLabel(speedKmh),
    };
  },

  startWindLoop() {
    if (this.windRafId) return;
    const step = () => {
      if (this.layerMode !== "wind" && this.layerMode !== "both") {
        this.windRafId = null;
        return;
      }
      this.drawWindCanvasFrame(true);
      this.windRafId = requestAnimationFrame(step);
    };
    this.windRafId = requestAnimationFrame(step);
  },

  stopWindLoop() {
    if (this.windRafId) {
      cancelAnimationFrame(this.windRafId);
      this.windRafId = null;
    }
    if (this.windCanvas && this.windCtx) {
      const rect = this.windCanvas.getBoundingClientRect();
      this.windCtx.clearRect(0, 0, rect.width || 800, rect.height || 600);
    }
  },

  drawWindCanvasFrame(advance = true) {
    if (!this.windCanvas || !this.windCtx || !this.map) return;
    const rect = this.windCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;

    if (!this.windParticles.length) {
      this.resetWindParticles(w, h);
    }

    const ctx = this.windCtx;
    ctx.clearRect(0, 0, w, h);

    const frame = this.frames[this.currentIndex] || { offsetMinutes: 0 };
    const offsetMin =
      typeof this.currentOffsetMinutes === "number"
        ? this.currentOffsetMinutes
        : Number(frame.offsetMinutes || 0);

    // 1. Geographically-Anchored Smooth Bilinear Wind-Speed Color Field (when enabled)
    if (this.showWindHeatmap) {
      const cols = 36;
      const rows = 22;
      if (!this._windHeatCanvas) {
        this._windHeatCanvas = document.createElement("canvas");
        this._windHeatCanvas.width = cols;
        this._windHeatCanvas.height = rows;
        this._windHeatCtx = this._windHeatCanvas.getContext("2d");
        this._windHeatImgData = this._windHeatCtx.createImageData(cols, rows);
      }
      const imgData = this._windHeatImgData.data;
      const alphaScale = this.layerMode === "both" ? 0.72 : 1.0;

      let ptr = 0;
      for (let r = 0; r < rows; r++) {
        const sy = (r / (rows - 1)) * h;
        const latRow = this.map.containerPointToLatLng([0, sy]).lat;
        for (let c = 0; c < cols; c++) {
          const sx = (c / (cols - 1)) * w;
          const lonCol = this.map.containerPointToLatLng([sx, sy]).lng;
          const { speedKmh } = this.sampleWindField(latRow, lonCol, offsetMin);
          const [cr, cg, cb] = this.windColorRgb(speedKmh);
          const rawAlpha = Math.min(0.27, Math.max(0.045, (speedKmh - 6) / 205)) * alphaScale;
          imgData[ptr++] = cr;
          imgData[ptr++] = cg;
          imgData[ptr++] = cb;
          imgData[ptr++] = Math.round(rawAlpha * 255);
        }
      }
      this._windHeatCtx.putImageData(this._windHeatImgData, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(this._windHeatCanvas, 0, 0, w, h);
      ctx.restore();
    }

    // 2. Geographically-Anchored Animated Wind Streamline Particles (locked 1:1 to map coordinates)
    const zoomScale = Math.max(
      0.55,
      Math.min(2.15, Math.pow(1.18, this.map.getZoom() - this.baseZoom))
    );

    ctx.save();
    ctx.lineCap = "round";
    for (let i = 0; i < this.windParticles.length; i++) {
      let p = this.windParticles[i];
      if (typeof p.lat !== "number" || typeof p.lon !== "number") {
        p = this.spawnWindParticle(w, h, true);
        this.windParticles[i] = p;
      }

      let pt = this.map.latLngToContainerPoint([p.lat, p.lon]);

      // If map panning/zooming pushed particle outside viewport, wrap it into the newly exposed edge
      if (pt.x < -24 || pt.x > w + 24 || pt.y < -24 || pt.y > h + 24) {
        const wx = ((pt.x % w) + w) % w;
        const wy = ((pt.y % h) + h) % h;
        const wrappedLl = this.map.containerPointToLatLng([wx, wy]);
        p.lat = wrappedLl.lat;
        p.lon = wrappedLl.lng;
        p.trail = [];
        pt = L.point(wx, wy);
      }

      const { vx, vy, speedKmh } = this.sampleWindField(p.lat, p.lon, offsetMin);

      if (advance) {
        p.trail.push({ lat: p.lat, lon: p.lon, speedKmh });
        if (p.trail.length > 22) p.trail.shift();

        const nextX = pt.x + vx * zoomScale;
        const nextY = pt.y + vy * zoomScale;
        p.age++;

        if (
          p.age >= p.maxAge ||
          nextX < -18 ||
          nextX > w + 18 ||
          nextY < -18 ||
          nextY > h + 18
        ) {
          this.windParticles[i] = this.spawnWindParticle(w, h, false);
          continue;
        }

        const nextLl = this.map.containerPointToLatLng([nextX, nextY]);
        p.lat = nextLl.lat;
        p.lon = nextLl.lng;
      }

      if (p.trail.length > 3) {
        const lifeFade = Math.sin((Math.min(p.age, p.maxAge) / p.maxAge) * Math.PI);
        if (lifeFade > 0.04) {
          const n = p.trail.length;
          const modeOpacityScale = this.layerMode === "both" ? 0.36 : 0.46;
          let prevScreenPt = this.map.latLngToContainerPoint([p.trail[0].lat, p.trail[0].lon]);
          for (let t = 1; t < n; t++) {
            const curScreenPt = this.map.latLngToContainerPoint([p.trail[t].lat, p.trail[t].lon]);
            const frac = t / (n - 1);
            const fade = Math.pow(frac, 1.65) * Math.sin(frac * Math.PI * 0.85 + 0.15);
            const alpha = fade * lifeFade * modeOpacityScale;
            ctx.strokeStyle = `rgba(248, 250, 252, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.45 + frac * 0.85;
            ctx.beginPath();
            ctx.moveTo(prevScreenPt.x, prevScreenPt.y);
            ctx.lineTo(curScreenPt.x, curScreenPt.y);
            ctx.stroke();
            prevScreenPt = curScreenPt;
          }
        }
      }
    }
    ctx.restore();
  },

  openModal() {
    const modal = document.getElementById("radar-detail-modal");
    const sheet = document.getElementById("radar-modal-sheet");
    const modalSlot = document.getElementById("radar-modal-map-slot");
    const frameEl = document.getElementById("radar-map-frame");
    if (!modal || !modalSlot || !frameEl) return;

    clearTimeout(this.modalCloseTimer);
    this.isModalOpen = true;
    const hudFooterEl = document.getElementById("radar-modal-hud-footer");
    if (hudFooterEl) {
      hudFooterEl.classList.remove("is-expanded");
      hudFooterEl.setAttribute("aria-expanded", "false");
    }
    this.syncModalTitleAndKickers();
    this.renderTelemetryStrip(this.probedTelemetry || this.telemetry);

    if (sheet) {
      sheet.style.transform = "";
      sheet.style.transition = "";
    }

    modalSlot.appendChild(frameEl);
    frameEl.classList.add("is-modal");
    this.setMapInteractive(true);

    modal.classList.remove("closing");
    modal.removeAttribute("hidden");
    document.body.classList.add("modal-open");

    const syncCanvases = () => {
      if (this.map) this.map.invalidateSize({ pan: false, animate: false });
      this.resizeWindCanvas();
      this.resetWindParticles();
      if (this.layerMode === "wind" || this.layerMode === "both") {
        this.drawWindCanvasFrame(false);
      }
    };
    requestAnimationFrame(syncCanvases);
    setTimeout(syncCanvases, 120);
    setTimeout(syncCanvases, 340);
  },

  closeModal() {
    const modal = document.getElementById("radar-detail-modal");
    const sheet = document.getElementById("radar-modal-sheet");
    const inlineSlot = document.getElementById("radar-inline-slot");
    const frameEl = document.getElementById("radar-map-frame");
    if (!modal || modal.hasAttribute("hidden")) return;

    this.isModalOpen = false;
    this.clearProbe();
    this.setMapInteractive(false);

    if (inlineSlot && frameEl) {
      frameEl.classList.remove("is-modal");
      inlineSlot.appendChild(frameEl);
    }

    if (this.map && state.location) {
      this.map.setView([state.location.latitude, state.location.longitude], this.baseZoom, {
        animate: false,
      });
      this.map.invalidateSize({ pan: false, animate: false });
      this.resizeWindCanvas();
      this.resetWindParticles();
      if (this.layerMode === "wind" || this.layerMode === "both") {
        this.drawWindCanvasFrame(false);
      }
      setTimeout(() => {
        if (this.map) this.map.invalidateSize({ pan: false, animate: false });
        this.resizeWindCanvas();
        this.resetWindParticles();
        if (this.layerMode === "wind" || this.layerMode === "both") {
          this.drawWindCanvasFrame(false);
        }
      }, 120);
    }

    const tileModal = document.getElementById("tile-detail-modal");
    const hourModal = document.getElementById("hour-detail-modal");
    if (
      (!tileModal || tileModal.hasAttribute("hidden")) &&
      (!hourModal || hourModal.hasAttribute("hidden"))
    ) {
      document.body.classList.remove("modal-open");
    }

    if (sheet) {
      sheet.style.transform = "";
      sheet.style.transition = "";
    }
    modal.classList.add("closing");
    clearTimeout(this.modalCloseTimer);
    this.modalCloseTimer = setTimeout(() => {
      modal.classList.remove("closing");
      modal.setAttribute("hidden", "");
    }, 230);
  },

  stepFrame(delta) {
    if (!this.frames.length) return;
    this.stopPlay();
    const nextIdx = Math.max(0, Math.min(this.frames.length - 1, this.currentIndex + delta));
    this.setFrameIndex(nextIdx);
  },

  updateInteropLinks(lat, lon) {
    const coords = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const units = state.useImperial ? "us" : "si";
    const dsEl = document.getElementById("interop-darksky-url");
    const rvEl = document.getElementById("interop-rainviewer-url");
    const tjEl = document.getElementById("interop-tilejson-url");
    const xyzEl = document.getElementById("interop-xyz-url");
    if (dsEl) dsEl.textContent = `${ZUS_API_HOST}/forecast/zus_key/${coords}?units=${units}`;
    if (rvEl) rvEl.textContent = `${ZUS_API_HOST}/public/weather-maps.json`;
    if (tjEl) tjEl.textContent = `${ZUS_API_BASE}/radar/tilejson.json`;
    if (xyzEl) xyzEl.textContent = `${ZUS_API_BASE}/radar/tiles/latest/{z}/{x}/{y}.png`;
  },

  isConusLocation(lat, lon) {
    return lat >= 21.0 && lat <= 51.0 && lon >= -128.0 && lon <= -64.0;
  },

  classifyDbz(dbz) {
    if (dbz < 8.0) return "Clear";
    if (dbz < 15.0) return "Light Drizzle";
    if (dbz < 25.0) return "Light Rain";
    if (dbz < 35.0) return "Moderate Rain";
    if (dbz < 46.0) return "Heavy Storm";
    return "Severe Hail Core";
  },

  mmHrFromDbz(dbz) {
    if (dbz < 8.0) return 0.0;
    const zLin = Math.pow(10.0, dbz / 10.0);
    const r = dbz < 20.0 ? Math.pow(zLin / 140.0, 1.0 / 1.5) : Math.pow(zLin / 200.0, 1.0 / 1.6);
    return Math.round(Math.min(100.0, Math.max(0.0, r)) * 100) / 100;
  },

  estimateDbzFromN0qRgba(r, g, b, a) {
    if (a < 25) return 0.0;
    // Map IEM N0Q RGBA pixel colors to reflectivity dBZ
    if (r > 210 && b > 200 && g < 180) return 58.0; // Magenta / hail core
    if (r > 180 && g < 60 && b < 60) return 51.0; // Red / severe convective core
    if (r > 220 && g >= 120 && g <= 240 && b < 50) return 41.0; // Yellow-orange / heavy storm
    if (g > 100 && r < 90 && b < 90) {
      // Greens: light-to-moderate rain (20..34 dBZ)
      return g > 190 ? 21.5 : g > 150 ? 26.5 : 32.0;
    }
    if (b > 140 && g > 90) {
      // Blues / cyans: mist to light rain (8..18 dBZ)
      return b > 210 ? 17.5 : 11.5;
    }
    return 0.0;
  },

  zusColorForDbz(dbz) {
    if (dbz < 8.5) return [0, 0, 0, 0];
    if (dbz < 15.0) return [56, 189, 248, 155]; // Crisp cyan mist
    if (dbz < 23.0) return [14, 165, 233, 198]; // Light rain sky blue
    if (dbz < 30.0) return [37, 99, 235, 224]; // Moderate electric blue
    if (dbz < 35.0) return [52, 211, 153, 238]; // Emerald-cyan transition
    if (dbz < 41.0) return [250, 204, 21, 248]; // Züs Storm Gold (#FACC15)
    if (dbz < 47.0) return [245, 158, 11, 252]; // Deep amber gold
    if (dbz < 54.0) return [239, 68, 68, 255]; // Crimson storm core
    return [217, 70, 239, 255]; // Electric violet hail core
  },

  loadRawTileImage(url) {
    if (this._rawTilePromises.has(url)) {
      return this._rawTilePromises.get(url);
    }
    const p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => {
        if (typeof img.decode === "function") {
          img
            .decode()
            .then(() => resolve(img))
            .catch(() => resolve(img));
        } else {
          resolve(img);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    this._rawTilePromises.set(url, p);
    if (this._rawTilePromises.size > 1200) {
      const oldestKey = this._rawTilePromises.keys().next().value;
      this._rawTilePromises.delete(oldestKey);
    }
    return p;
  },

  async sampleHttpsNexradTelemetry(lat, lon) {
    if (!this.isConusLocation(lat, lon)) {
      return {
        inConusGrid: false,
        currentDbz: 0,
        precipRateMmHr: 0,
        intensityCategory: "Clear",
        maxDbzNearby: 0,
        echoCoveragePercent: 0,
        nearestEchoKm: null,
        nearestEchoCompass: null,
        stormMotionKmh: 42.0,
        stormMotionDeg: 245,
        stormMotionCompass: "ENE",
        minuteRates60m: Array(13).fill(0),
      };
    }

    const z = 7;
    const n = Math.pow(2, z);
    const xFloat = ((lon + 180.0) / 360.0) * n;
    const latRad = (lat * Math.PI) / 180.0;
    const yFloat =
      ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * n;
    const xTile = Math.floor(xFloat);
    const yTile = Math.floor(yFloat);
    const pxCenter = Math.min(255, Math.max(0, Math.floor((xFloat - xTile) * 256)));
    const pyCenter = Math.min(255, Math.max(0, Math.floor((yFloat - yTile) * 256)));

    const url = `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/${z}/${xTile}/${yTile}.png`;

    try {
      const img = await this.loadRawTileImage(url);
      if (!img) throw new Error("Tile unavailable");

      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, 256, 256).data;

      const getDbzAt = (px, py) => {
        const cx = Math.min(255, Math.max(0, px));
        const cy = Math.min(255, Math.max(0, py));
        const idx = (cy * 256 + cx) * 4;
        return this.estimateDbzFromN0qRgba(
          imgData[idx],
          imgData[idx + 1],
          imgData[idx + 2],
          imgData[idx + 3]
        );
      };

      // 3x3 smoothing around overhead point
      let currentDbz = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          currentDbz = Math.max(currentDbz, getDbzAt(pxCenter + dx, pyCenter + dy));
        }
      }

      // At z=7 mid-latitudes, 1 pixel ≈ 0.95 km -> 36 pixels ≈ 35km radius
      const radiusPx = 36;
      let maxDbzNearby = currentDbz;
      let totalCells = 0;
      let activeCells = 0;
      let nearestEchoKm = currentDbz >= 10.0 ? 0.0 : null;
      let nearestEchoCompass = currentDbz >= 10.0 ? "Overhead" : null;
      let minDistSq = Infinity;

      for (let dy = -radiusPx; dy <= radiusPx; dy += 2) {
        for (let dx = -radiusPx; dx <= radiusPx; dx += 2) {
          const dSq = dx * dx + dy * dy;
          if (dSq > radiusPx * radiusPx) continue;
          totalCells++;
          const dbz = getDbzAt(pxCenter + dx, pyCenter + dy);
          if (dbz > maxDbzNearby) maxDbzNearby = dbz;
          if (dbz >= 10.0) {
            activeCells++;
            if (dSq < minDistSq) {
              minDistSq = dSq;
              const distKm = Math.sqrt(dSq) * 0.96;
              nearestEchoKm = Math.round(distKm * 10) / 10;
              if (distKm < 1.8) {
                nearestEchoCompass = "Overhead";
              } else {
                const brg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
                nearestEchoCompass = compassDirection(brg);
              }
            }
          }
        }
      }

      const echoCoveragePercent =
        totalCells > 0 ? Math.round((activeCells / totalCells) * 1000) / 10 : 0.0;
      const windSpeed = state.weather?.windSpeed ?? 38.0;
      const windDir = state.weather?.windDirection ?? 245;
      const moveTowardsDeg = (windDir + 180) % 360;
      const stormMotionCompass = compassDirection(moveTowardsDeg);
      const stormMotionKmh = Math.max(18.0, Math.round(windSpeed * 1.15 * 10) / 10);

      // Sample 13 steps (0..60m) upstream along wind direction for minute-by-minute nowcast
      const radUp = (windDir * Math.PI) / 180.0;
      const stepKm5m = (stormMotionKmh * (5.0 / 60.0)) / 0.96;
      const minuteRates60m = [];
      for (let s = 0; s <= 12; s++) {
        const upX = Math.round(pxCenter + Math.sin(radUp) * stepKm5m * s);
        const upY = Math.round(pyCenter - Math.cos(radUp) * stepKm5m * s);
        const sDbz = s === 0 ? currentDbz : getDbzAt(upX, upY) * Math.pow(0.97, s);
        minuteRates60m.push(this.mmHrFromDbz(sDbz));
      }

      return {
        inConusGrid: true,
        currentDbz: Math.round(currentDbz * 10) / 10,
        precipRateMmHr: this.mmHrFromDbz(currentDbz),
        intensityCategory: this.classifyDbz(currentDbz),
        maxDbzNearby: Math.round(maxDbzNearby * 10) / 10,
        echoCoveragePercent,
        nearestEchoKm,
        nearestEchoCompass,
        stormMotionKmh,
        stormMotionDeg: moveTowardsDeg,
        stormMotionCompass,
        minuteRates60m,
      };
    } catch (_) {
      return null;
    }
  },

  createZusCanvasLayer(frame) {
    const self = this;
    const GridLayerClass = L.GridLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement("canvas");
        tile.width = 256;
        tile.height = 256;
        const ctx = tile.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        const cacheKey = `${frame.frameId}:${coords.z}:${coords.x}:${coords.y}`;
        if (self._processedCanvasCache.has(cacheKey)) {
          const cached = self._processedCanvasCache.get(cacheKey);
          ctx.drawImage(cached, 0, 0);
          setTimeout(() => done(null, tile), 0);
          return tile;
        }

        (async () => {
          try {
            const maxTileIndex = Math.pow(2, coords.z) - 1;
            let shiftX = 0;
            let shiftY = 0;

            if (frame.isFuture && frame.offsetMinutes > 0) {
              const lat = state.location?.latitude ?? 39.0;
              const cosLat = Math.max(0.25, Math.cos((lat * Math.PI) / 180.0));
              const kmPerPixel = (40075.017 * cosLat) / (256 * Math.pow(2, coords.z));
              const windSpeed = state.weather?.windSpeed ?? 38.0;
              const windFromDeg = state.weather?.windDirection ?? 245;
              const fallbackMoveDeg = (windFromDeg + 180) % 360;
              const speedKmh = Math.max(
                42.0,
                self.telemetry?.stormMotionKmh ?? Math.round(windSpeed * 1.15)
              );
              const distKm = speedKmh * (frame.offsetMinutes / 60.0);
              const moveDeg =
                self.telemetry?.stormMotionDeg ??
                self.telemetry?.stormMotionDegrees ??
                fallbackMoveDeg;
              const rad = (moveDeg * Math.PI) / 180.0;
              shiftX = Math.round((Math.sin(rad) * distKm) / kmPerPixel);
              shiftY = Math.round((-Math.cos(rad) * distKm) / kmPerPixel);

              // Seamless cross-tile advection: draw any overlapping neighbor tiles from shared cache
              const drawJobs = [];
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const drawX = dx * 256 + shiftX;
                  const drawY = dy * 256 + shiftY;
                  if (drawX < 256 && drawX + 256 > 0 && drawY < 256 && drawY + 256 > 0) {
                    const tx = coords.x + dx;
                    const ty = coords.y + dy;
                    if (tx >= 0 && tx <= maxTileIndex && ty >= 0 && ty <= maxTileIndex) {
                      const url = frame.tileUrlTemplate
                        .replace("{z}", coords.z)
                        .replace("{x}", tx)
                        .replace("{y}", ty);
                      drawJobs.push(
                        self.loadRawTileImage(url).then((im) => ({ im, drawX, drawY }))
                      );
                    }
                  }
                }
              }
              const loaded = await Promise.all(drawJobs);
              loaded.forEach(({ im, drawX, drawY }) => {
                if (im) ctx.drawImage(im, drawX, drawY);
              });
            } else {
              const url = frame.tileUrlTemplate
                .replace("{z}", coords.z)
                .replace("{x}", coords.x)
                .replace("{y}", coords.y);
              const img = await self.loadRawTileImage(url);
              if (img) ctx.drawImage(img, 0, 0);
            }

            const imageData = ctx.getImageData(0, 0, 256, 256);
            const d = imageData.data;
            const decay = frame.isFuture
              ? Math.max(0.76, 1.0 - (frame.offsetMinutes / 120.0) * 0.18)
              : 1.0;

            if (frame.isRainViewer) {
              for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 16) {
                  d[i + 3] = 0;
                  continue;
                }
                d[i + 3] = Math.round(d[i + 3] * decay);
              }
            } else {
              for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 20) {
                  d[i + 3] = 0;
                  continue;
                }
                const dbz =
                  self.estimateDbzFromN0qRgba(d[i], d[i + 1], d[i + 2], d[i + 3]) * decay;
                const [zr, zg, zb, za] = self.zusColorForDbz(dbz);
                d[i] = zr;
                d[i + 1] = zg;
                d[i + 2] = zb;
                d[i + 3] = za;
              }
            }
            ctx.putImageData(imageData, 0, 0);

            const off = document.createElement("canvas");
            off.width = 256;
            off.height = 256;
            off.getContext("2d").drawImage(tile, 0, 0);
            self._processedCanvasCache.set(cacheKey, off);
            if (self._processedCanvasCache.size > 900) {
              const oldest = self._processedCanvasCache.keys().next().value;
              self._processedCanvasCache.delete(oldest);
            }
          } catch (_) {}
          done(null, tile);
        })();

        return tile;
      },
    });

    return new GridLayerClass({
      opacity: 0,
      zIndex: 200,
      maxNativeZoom: frame.maxNativeZoom || 8,
      maxZoom: 10,
      keepBuffer: 6,
      updateWhenIdle: false,
      updateWhenZooming: false,
    });
  },

  updateProbeToastText(lat, lon, tel) {
    const textEl = document.getElementById("radar-probe-text");
    if (!textEl) return;

    const frame = this.frames[this.currentIndex] || { offsetMinutes: 0 };
    const offsetMin = Number(frame.offsetMinutes || 0);
    const windSample = this.sampleWindField(lat, lon, offsetMin);

    const baseLat = state.location?.latitude ?? lat;
    const baseLon = state.location?.longitude ?? lon;
    const baseTempC = state.weather?.temperature ?? 20;
    const dLat = lat - baseLat;
    const dLon = lon - baseLon;
    const estTempC = baseTempC - dLat * 0.65 + Math.sin(dLon * 5) * 0.4;

    const surf = this.probedSurface;
    const tempC = typeof surf?.tempC === "number" ? surf.tempC : estTempC;
    const windKmh = typeof surf?.windSpeedKmh === "number" ? surf.windSpeedKmh : windSample.speedKmh;
    const windCompass = surf?.windCompass || windSample.windFromCompass;

    const tempStr = formatTemp(tempC, true);
    const windStr = `${formatWind(windKmh)} ${windCompass}`;

    let precipCategory = "Clear";
    let rateMmHr = 0;

    if (tel && typeof tel.currentDbz === "number" && tel.currentDbz >= 10) {
      precipCategory =
        tel.intensityCategory && tel.intensityCategory !== "Clear"
          ? tel.intensityCategory
          : this.classifyDbz(tel.currentDbz);
      rateMmHr =
        typeof tel.precipRateMmHr === "number" && tel.precipRateMmHr > 0
          ? tel.precipRateMmHr
          : this.mmHrFromDbz(tel.currentDbz);
    } else if (typeof surf?.precipMm === "number" && surf.precipMm > 0) {
      rateMmHr = surf.precipMm;
      precipCategory = rateMmHr >= 7.5 ? "Heavy Rain" : rateMmHr >= 2.5 ? "Moderate Rain" : "Light Rain";
    }

    let precipStatusStr = "Clear";
    if (precipCategory !== "Clear" && rateMmHr > 0) {
      const rateFormatted = state.useImperial
        ? `${Math.max(0.01, Number((rateMmHr / 25.4).toFixed(2))).toFixed(2)} in/hr`
        : `${Math.max(0.1, Number(rateMmHr.toFixed(1))).toFixed(1)} mm/hr`;
      precipStatusStr = `${precipCategory} • ${rateFormatted}`;
    }

    const latLabel = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
    const lonLabel = `${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`;
    textEl.textContent = `${latLabel}, ${lonLabel}  •  Temp ${tempStr}  •  Wind ${windStr}  •  Precip: ${precipStatusStr}`;
  },

  async probePoint(lat, lon) {
    if (!this.map) return;
    this.probedCoords = { lat, lon };
    this.probedSurface = null;
    if (!this.probeMarker) {
      this.probeMarker = L.circleMarker([lat, lon], {
        radius: 6,
        color: "#ffffff",
        weight: 2,
        fillColor: "#facc15",
        fillOpacity: 0.95,
      }).addTo(this.map);
    } else {
      this.probeMarker.setLatLng([lat, lon]);
    }

    const toastEl = document.getElementById("radar-probe-toast");
    if (toastEl) toastEl.removeAttribute("hidden");
    this.updateProbeToastText(lat, lon, null);

    const fetchSurfacePromise = (async () => {
      try {
        const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
          4
        )}&longitude=${lon.toFixed(
          4
        )}&current=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm`;
        const omResp = await fetch(omUrl);
        if (omResp.ok) {
          const omData = await omResp.json();
          const cur = omData?.current;
          if (cur && typeof cur.temperature_2m === "number") {
            return {
              tempC: cur.temperature_2m,
              windSpeedKmh: Math.max(0, Number(cur.wind_speed_10m ?? 0)),
              windCompass: compassDirection(Number(cur.wind_direction_10m ?? 0)),
              precipMm: Math.max(0, Number(cur.precipitation ?? 0)),
            };
          }
        }
      } catch (_) {}
      return null;
    })();

    const fetchRadarPromise = (async () => {
      if (this.layerMode === "wind") return this.telemetry;
      try {
        const resp = await fetch(
          `${ZUS_API_BASE}/radar/point?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
        );
        if (resp.ok) {
          return await resp.json();
        }
      } catch (_) {
        // Fallback to HTTPS 1km NEXRAD tile sampling when on https://zuscast.com
      }
      return await this.sampleHttpsNexradTelemetry(lat, lon);
    })();

    const [surface, tel] = await Promise.all([fetchSurfacePromise, fetchRadarPromise]);

    // Guard against stale async completion if user cleared or moved probe
    if (
      !this.probedCoords ||
      Math.abs(this.probedCoords.lat - lat) > 0.0001 ||
      Math.abs(this.probedCoords.lon - lon) > 0.0001
    ) {
      return;
    }

    this.probedSurface = surface;
    this.probedTelemetry = tel;
    this.updateProbeToastText(lat, lon, tel);
    this.renderTelemetryStrip(tel);
  },

  clearProbe() {
    this.probedCoords = null;
    this.probedTelemetry = null;
    this.probedSurface = null;
    if (this.probeMarker && this.map) {
      this.map.removeLayer(this.probeMarker);
      this.probeMarker = null;
    }
    const toastEl = document.getElementById("radar-probe-toast");
    if (toastEl) toastEl.setAttribute("hidden", "");
    this.renderTelemetryStrip(this.telemetry);
  },

  ensureTwoHourNowcastFrames(frames, options = {}) {
    if (!Array.isArray(frames) || !frames.length) return frames;
    const liveFrame = frames.find((f) => f.offsetMinutes === 0) || frames[frames.length - 1];
    const baseTs = liveFrame?.timestamp || Math.floor(Date.now() / 1000);
    const fallbackUrl =
      options.tileUrlTemplate ||
      "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png";
    const maxNativeZoom = options.maxNativeZoom || liveFrame?.maxNativeZoom || 8;
    const isRainViewer = Boolean(options.isRainViewer || liveFrame?.isRainViewer);
    const futureTargets = [
      { offset: 15, label: "+15m" },
      { offset: 30, label: "+30m" },
      { offset: 45, label: "+45m" },
      { offset: 60, label: "+1h" },
      { offset: 75, label: "+1h 15m" },
      { offset: 90, label: "+1h 30m" },
      { offset: 105, label: "+1h 45m" },
      { offset: 120, label: "+2h" },
    ];
    const existingOffsets = new Set(frames.map((f) => Number(f.offsetMinutes)));
    const out = [...frames];
    futureTargets.forEach((ft) => {
      if (!existingOffsets.has(ft.offset)) {
        out.push({
          frameId: `nowcast_p${ft.offset}m_${baseTs}`,
          timestamp: baseTs + ft.offset * 60,
          label: ft.label,
          offsetMinutes: ft.offset,
          isFuture: true,
          useZusCanvasLut: true,
          isRainViewer,
          maxNativeZoom,
          tileUrlTemplate: fallbackUrl,
        });
      }
    });
    return out.sort((a, b) => Number(a.offsetMinutes) - Number(b.offsetMinutes));
  },

  async syncForLocation(lat, lon) {
    if (!this.map && typeof L !== "undefined") {
      this.init();
    }
    this.clearProbe();
    this.updateInteropLinks(lat, lon);
    this.updateCoordsHudLabel();

    if (this.map) {
      this.map.setView([lat, lon], this.baseZoom, { animate: false });
      this.map.invalidateSize({ pan: false, animate: false });
      if (this.marker) this.marker.setLatLng([lat, lon]);
      if (this.scanCircle) this.scanCircle.setLatLng([lat, lon]);
      this.resetWindParticles();
    }

    const inConus = this.isConusLocation(lat, lon);
    this._regionalPackBounds = null;
    this._regionalPackImages = null;

    // 1. Try ZüsAPI 1km CONUS Master Grid & Single-Canvas Regional Pack on panda first (CONUS locations)
    if (inConus) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const [manifestResp, packResp] = await Promise.all([
          fetch(`${ZUS_API_BASE}/radar/manifest?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, {
            signal: controller.signal,
          }),
          fetch(`${ZUS_API_BASE}/radar/regional_pack?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, {
            signal: controller.signal,
          }).catch(() => null),
        ]);
        clearTimeout(timeout);

        if (packResp && packResp.ok) {
          const packData = await packResp.json();
          if (packData && packData.inConus && packData.bounds && packData.images) {
            const decodedMap = {};
            const entries = Object.entries(packData.images);
            await Promise.all(
              entries.map(async ([fid, b64]) => {
                if (!b64) {
                  decodedMap[fid] = null;
                  return;
                }
                const img = new Image();
                img.src = "data:image/png;base64," + b64;
                try {
                  if (img.decode) await img.decode();
                  else await new Promise((r) => { img.onload = r; img.onerror = r; });
                } catch (_) {}
                decodedMap[fid] = img;
              })
            );
            this._regionalPackBounds = packData.bounds;
            this._regionalPackImages = decodedMap;
          }
        }

        if (manifestResp.ok) {
          const data = await manifestResp.json();
          if (Array.isArray(data.frames) && data.frames.length > 0) {
            const normalizedFrames = data.frames.map((f) => ({
              ...f,
              maxNativeZoom: 8,
              tileUrlTemplate: (
                typeof f.tileUrlTemplate === "string" &&
                window.location.protocol === "https:" &&
                f.tileUrlTemplate.startsWith("http://")
                  ? "https://" + f.tileUrlTemplate.slice("http://".length)
                  : f.tileUrlTemplate
              ).replace(/\?v=\d+/, "?v=9"),
            }));
            this.frames = this.ensureTwoHourNowcastFrames(normalizedFrames, { maxNativeZoom: 8 });
            this.telemetry = data.localTelemetry || null;
            this.cacheStats = data.cacheStats || null;
            this.rebuildLayers();
            this.renderTelemetryStrip(data.localTelemetry);
            return data.localTelemetry;
          }
        }
      } catch (_) {
        // On https://zuscast.com, browsers block http://192.168.1.65:8000 (Mixed Content) -> use HTTPS 1km CONUS Core
      }
    }

    // 2. HTTPS 1km CONUS NEXRAD + 8-Bit Züs Storm LUT Engine (with +2h in 15m steps)
    if (inConus) {
      const nowSec = Math.floor(Math.floor(Date.now() / 1000) / 300) * 300;
      const steps = [
        { id: "m45m", suffix: "-m45m", offset: -45, label: "-45m", future: false },
        { id: "m35m", suffix: "-m35m", offset: -35, label: "-35m", future: false },
        { id: "m25m", suffix: "-m25m", offset: -25, label: "-25m", future: false },
        { id: "m15m", suffix: "-m15m", offset: -15, label: "-15m", future: false },
        { id: "m05m", suffix: "-m05m", offset: -5, label: "-5m", future: false },
        { id: "latest", suffix: "", offset: 0, label: "LIVE", future: false },
        { id: "p15m", suffix: "", offset: 15, label: "+15m", future: true },
        { id: "p30m", suffix: "", offset: 30, label: "+30m", future: true },
        { id: "p45m", suffix: "", offset: 45, label: "+45m", future: true },
        { id: "p60m", suffix: "", offset: 60, label: "+1h", future: true },
        { id: "p75m", suffix: "", offset: 75, label: "+1h 15m", future: true },
        { id: "p90m", suffix: "", offset: 90, label: "+1h 30m", future: true },
        { id: "p105m", suffix: "", offset: 105, label: "+1h 45m", future: true },
        { id: "p120m", suffix: "", offset: 120, label: "+2h", future: true },
      ];

      this.frames = steps.map((s) => ({
        frameId: s.id,
        timestamp: nowSec + s.offset * 60,
        label: s.label,
        offsetMinutes: s.offset,
        isFuture: s.future,
        useZusCanvasLut: true,
        maxNativeZoom: 8,
        tileUrlTemplate: `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913${s.suffix}/{z}/{x}/{y}.png`,
      }));

      const httpsTel = await this.sampleHttpsNexradTelemetry(lat, lon);
      this.telemetry = httpsTel;
      this.rebuildLayers();
      this.renderTelemetryStrip(httpsTel);
      return httpsTel;
    }

    // 3. International Fallback outside CONUS: RainViewer public radar frames (maxNativeZoom: 7)
    try {
      const rvResp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (rvResp.ok) {
        const rvData = await rvResp.json();
        const host = rvData.host || "https://tilecache.rainviewer.com";
        const past = (rvData.radar?.past || []).slice(-6);
        const nowcast = rvData.radar?.nowcast || [];
        const combined = [...past, ...nowcast];
        const liveTs = past.length ? past[past.length - 1].time : Math.floor(Date.now() / 1000);
        const livePath = past.length
          ? past[past.length - 1].path
          : combined.length
          ? combined[combined.length - 1].path
          : "";
        const liveTileUrl = livePath
          ? `${host}${livePath}/256/{z}/{x}/{y}/2/1_1.png`
          : "";

        const baseFrames = combined.map((f) => {
          const diffMin = Math.round((f.time - liveTs) / 60);
          return {
            frameId: `rv_${f.time}`,
            timestamp: f.time,
            label: diffMin === 0 ? "LIVE" : diffMin > 0 ? `+${diffMin}m` : `${diffMin}m`,
            offsetMinutes: diffMin,
            isFuture: diffMin > 0,
            isRainViewer: true,
            maxNativeZoom: 7,
            tileUrlTemplate: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          };
        });

        this.frames = liveTileUrl
          ? this.ensureTwoHourNowcastFrames(baseFrames, {
              tileUrlTemplate: liveTileUrl,
              maxNativeZoom: 7,
              isRainViewer: true,
            })
          : baseFrames;
        this.telemetry = null;
        this.rebuildLayers();
        this.renderTelemetryStrip(null);
      }
    } catch (_) {}
    return null;
  },

  preloadViewportTiles(lat, lon, zoom = 8) {
    const z = Math.max(3, Math.min(8, Math.round(zoom || this.baseZoom)));
    const n = Math.pow(2, z);
    const cx = Math.floor(((lon + 180.0) / 360.0) * n);
    const latRad = (Math.max(-85.0, Math.min(85.0, lat)) * Math.PI) / 180.0;
    const cy = Math.floor(
      ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * n
    );

    const urls = [];
    // 5x5 tile neighborhood covers both inline card and expanded fullscreen modal with pan buffer
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || tx >= n || ty < 0 || ty >= n) continue;

        // 1. Pre-warm Esri Dark Gray Base & Silver Reference Label tiles
        urls.push(
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${ty}/${tx}`,
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/${z}/${ty}/${tx}`
        );

        // 2. Pre-warm all timeline radar frames for the central 3x3 viewport
        if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
          for (let i = 0; i < this.frames.length; i++) {
            const f = this.frames[i];
            if (!f || !f.tileUrlTemplate) continue;
            const fz = Math.min(z, f.maxNativeZoom || 8);
            const fn = Math.pow(2, fz);
            const ftx = Math.floor(((lon + 180.0) / 360.0) * fn) + dx;
            const fty =
              Math.floor(
                ((1.0 - Math.log(Math.tan(latRad) + 1.0 / Math.cos(latRad)) / Math.PI) / 2.0) * fn
              ) + dy;
            if (ftx >= 0 && ftx < fn && fty >= 0 && fty < fn) {
              urls.push(
                f.tileUrlTemplate
                  .replace("{z}", String(fz))
                  .replace("{x}", String(ftx))
                  .replace("{y}", String(fty))
              );
            }
          }
        }
      }
    }

    for (let i = 0; i < urls.length; i++) {
      const u = urls[i];
      if (!this._preloadedTileUrls.has(u)) {
        this._preloadedTileUrls.add(u);
        if (this._preloadedTileUrls.size > 1800) {
          const first = this._preloadedTileUrls.values().next().value;
          this._preloadedTileUrls.delete(first);
        }
        this.loadRawTileImage(u);
      }
    }
  },

  initRegionalRadarCanvas() {
    if (!this.map || this.regionalRadarCanvas) return;
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "200";
    canvas.style.willChange = "transform";
    this.map.getPanes().overlayPane.appendChild(canvas);
    this.regionalRadarCanvas = canvas;
    this.regionalRadarCtx = canvas.getContext("2d");
  },

  renderRegionalRadarCanvas() {
    if (!this.map || !this.regionalRadarCanvas || !this.regionalRadarCtx) return;
    const ctx = this.regionalRadarCtx;
    const canvas = this.regionalRadarCanvas;
    if (!this._regionalPackBounds || !this._regionalPackImages || this.layerMode === "wind") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const activeIdx = Math.max(
      0,
      Math.min(this.frames.length - 1, Math.round(Number(this.currentIndex) || 0))
    );
    const activeFrame = this.frames[activeIdx];
    if (!activeFrame) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const sw = L.latLng(this._regionalPackBounds[0][0], this._regionalPackBounds[0][1]);
    const ne = L.latLng(this._regionalPackBounds[1][0], this._regionalPackBounds[1][1]);
    const topLeft = this.map.latLngToLayerPoint(L.latLng(ne.lat, sw.lng));
    const bottomRight = this.map.latLngToLayerPoint(L.latLng(sw.lat, ne.lng));
    const w = Math.max(1, Math.round(bottomRight.x - topLeft.x));
    const h = Math.max(1, Math.round(bottomRight.y - topLeft.y));

    L.DomUtil.setPosition(canvas, topLeft);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    const img = this._regionalPackImages[activeFrame.frameId];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.globalAlpha = this.layerMode === "both" ? 0.84 : 0.94;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
    }
  },

  rebuildLayers() {
    if (!this.map) return;
    Object.values(this.tileLayers).forEach((layer) => {
      if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
    });
    this.tileLayers = {};
    this._readyFrameIds = new Set();
    this._lastReadyFrameId = null;

    let liveIdx = this.frames.findIndex((f) => f.offsetMinutes === 0);
    if (liveIdx < 0) liveIdx = Math.max(0, this.frames.length - 1);

    const slider = document.getElementById("radar-frame-slider");
    if (slider) {
      const maxIdx = Math.max(1, this.frames.length - 1);
      slider.max = String(maxIdx);
      const livePct = ((liveIdx / maxIdx) * 100).toFixed(1);
      slider.style.setProperty("--live-pct", `${livePct}%`);
    }

    // If 100%-decoded Regional Pack is active, render directly on the single persistent <canvas>
    if (this._regionalPackBounds && this._regionalPackImages) {
      this.setFrameIndex(liveIdx);
      this.renderRegionalRadarCanvas();
      return;
    }

    // Eagerly mount LIVE frame first, then pre-mount all remaining timeline frames in background
    const liveFrame = this.frames[liveIdx];
    if (liveFrame) {
      this.tileLayers[liveFrame.frameId] = this.createLayerForFrame(liveFrame);
      this._lastReadyFrameId = liveFrame.frameId;
    }

    this.setFrameIndex(liveIdx);

    if (state.location) {
      this.preloadViewportTiles(
        state.location.latitude,
        state.location.longitude,
        this.map.getZoom() || this.baseZoom
      );
    }

    requestAnimationFrame(() => {
      if (!this.map) return;
      this.frames.forEach((f) => {
        if (f && !this.tileLayers[f.frameId]) {
          this.tileLayers[f.frameId] = this.createLayerForFrame(f);
        }
      });
    });
  },

  createLayerForFrame(frame) {
    let layer;
    if (frame.useZusCanvasLut) {
      layer = this.createZusCanvasLayer(frame).addTo(this.map);
    } else {
      layer = L.tileLayer(frame.tileUrlTemplate, {
        opacity: 0,
        zIndex: 200,
        maxNativeZoom: frame.maxNativeZoom || 7,
        maxZoom: 10,
        keepBuffer: 6,
        updateWhenIdle: false,
        updateWhenZooming: false,
      }).addTo(this.map);
    }

    const markReady = () => {
      this._readyFrameIds.add(frame.frameId);
      if (!this._lastReadyFrameId || this.activeFrameId === frame.frameId) {
        this._lastReadyFrameId = frame.frameId;
      }
      if (this.activeFrameId === frame.frameId) {
        this.applyRadarCrossfadeOpacity();
      }
    };
    layer.on("load", markReady);
    // Fallback readiness timer in case all tiles were empty/cached synchronously
    setTimeout(markReady, 220);

    return layer;
  },

  applyRadarCrossfadeOpacity() {
    if (!this.frames.length) return;
    if (this._regionalPackBounds && this._regionalPackImages) {
      this.renderRegionalRadarCanvas();
      return;
    }
    const activeIdx = Math.max(
      0,
      Math.min(this.frames.length - 1, Math.round(Number(this.currentIndex) || 0))
    );
    const activeFrame = this.frames[activeIdx];
    if (!activeFrame) return;

    if (this.map && !this.tileLayers[activeFrame.frameId]) {
      this.tileLayers[activeFrame.frameId] = this.createLayerForFrame(activeFrame);
    }

    const targetRadarOpacity =
      this.layerMode === "wind" ? 0.0 : this.layerMode === "both" ? 0.84 : 0.94;

    const isActiveReady = this._readyFrameIds.has(activeFrame.frameId);
    if (isActiveReady) {
      this._lastReadyFrameId = activeFrame.frameId;
    }
    const holdFallbackId =
      !isActiveReady && this._lastReadyFrameId && this._lastReadyFrameId !== activeFrame.frameId
        ? this._lastReadyFrameId
        : null;

    Object.entries(this.tileLayers).forEach(([id, layer]) => {
      if (targetRadarOpacity <= 0) {
        layer.setOpacity(0.0);
      } else if (id === activeFrame.frameId || id === holdFallbackId) {
        layer.setOpacity(targetRadarOpacity);
      } else {
        layer.setOpacity(0.0);
      }
    });
  },

  formatInterpolatedOffsetLabel(offsetMin) {
    const rounded = Math.round(offsetMin);
    if (Math.abs(rounded) <= 1) return "LIVE";
    const sign = rounded > 0 ? "+" : "-";
    const absMin = Math.abs(rounded);
    if (absMin < 60) return `${sign}${absMin}m`;
    const hrs = Math.floor(absMin / 60);
    const mins = absMin % 60;
    return mins === 0 ? `${sign}${hrs}h` : `${sign}${hrs}h ${mins}m`;
  },

  setFrameIndex(idx) {
    if (!this.map || !this.frames.length) return;
    const snappedIdx = Math.max(
      0,
      Math.min(this.frames.length - 1, Math.round(Number(idx) || 0))
    );
    this.floatIndex = snappedIdx;
    this.currentIndex = snappedIdx;
    const frame = this.frames[snappedIdx];
    if (!frame) return;

    // Pre-create next frame in background (opacity 0) so discrete frame steps are instant
    const iNext = Math.min(this.frames.length - 1, snappedIdx + 1);
    const fNext = this.frames[iNext];
    if (fNext && !this.tileLayers[fNext.frameId]) {
      this.tileLayers[fNext.frameId] = this.createLayerForFrame(fNext);
    }

    this.applyRadarCrossfadeOpacity();
    this.activeFrameId = frame.frameId;

    const offsetMin = Number(frame.offsetMinutes || 0);
    this.currentOffsetMinutes = offsetMin;
    const isFutureFrame = Boolean(frame.isFuture || offsetMin > 0);

    const slider = document.getElementById("radar-frame-slider");
    if (slider) {
      if (Number(slider.value) !== snappedIdx) {
        slider.value = String(snappedIdx);
      }
      const maxIdx = Math.max(1, this.frames.length - 1);
      const scrubPct = ((snappedIdx / maxIdx) * 100).toFixed(2);
      slider.style.setProperty("--scrub-pct", `${scrubPct}%`);
      slider.classList.toggle("is-future", isFutureFrame);
    }

    const frameClock = frame.timestamp
      ? new Date(frame.timestamp * 1000).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    const frameLabel = frame.label || this.formatInterpolatedOffsetLabel(offsetMin);

    const pillEl = document.getElementById("radar-frame-label");
    const timeEl = document.getElementById("radar-time-readout");
    if (pillEl) {
      pillEl.textContent = isFutureFrame
        ? `${frameLabel} NOWCAST (${frameClock})`
        : frameLabel === "LIVE"
        ? `LIVE (${frameClock})`
        : `${frameLabel} (${frameClock})`;
      pillEl.classList.toggle("future", isFutureFrame);
    }
    if (timeEl) {
      timeEl.textContent = frameClock ? `${frameClock} (${frameLabel})` : frameLabel;
      timeEl.classList.toggle("future", isFutureFrame);
    }

    if (this.layerMode === "wind" || this.layerMode === "both") {
      this.renderTelemetryStrip(this.probedTelemetry || this.telemetry);
      if (this.probedCoords) {
        this.updateProbeToastText(
          this.probedCoords.lat,
          this.probedCoords.lon,
          this.probedTelemetry
        );
      }
    }
  },

  togglePlay() {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  },

  startPlay() {
    if (!this.frames.length) return;
    // Pre-warm all frame layers so discrete frame stepping has zero lag
    this.frames.forEach((f) => {
      if (this.map && !this.tileLayers[f.frameId]) {
        this.tileLayers[f.frameId] = this.createLayerForFrame(f);
      }
    });
    this.isPlaying = true;
    const btn = document.getElementById("radar-play-btn");
    if (btn) btn.textContent = "❚❚";

    const maxIdx = Math.max(1, this.frames.length - 1);
    if (this.currentIndex >= maxIdx) {
      this.setFrameIndex(0);
    }

    const stepDelayMs = 540;
    const endHoldMs = 950;
    let nextStepAt = performance.now() + stepDelayMs;

    const tick = (now) => {
      if (!this.isPlaying) return;
      if (now >= nextStepAt) {
        if (this.currentIndex >= maxIdx) {
          this.setFrameIndex(0);
          nextStepAt = now + stepDelayMs;
        } else {
          const nextIdx = this.currentIndex + 1;
          this.setFrameIndex(nextIdx);
          nextStepAt = now + (nextIdx >= maxIdx ? endHoldMs : stepDelayMs);
        }
      }
      this.playTimer = requestAnimationFrame(tick);
    };
    this.playTimer = requestAnimationFrame(tick);
  },

  stopPlay() {
    this.isPlaying = false;
    const btn = document.getElementById("radar-play-btn");
    if (btn) btn.textContent = "▶";
    if (this.playTimer) {
      cancelAnimationFrame(this.playTimer);
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  },

  renderTelemetryStrip(tel) {
    const dbzLabelEl = document.getElementById("radar-stat-dbz-label");
    const peakLabelEl = document.getElementById("radar-stat-peak-label");
    const echoLabelEl = document.getElementById("radar-stat-echo-label");
    const vecRowEl = document.getElementById("radar-stat-vector-row");
    const dbzEl = document.getElementById("radar-stat-dbz");
    const peakEl = document.getElementById("radar-stat-peak");
    const echoEl = document.getElementById("radar-stat-echo");
    const legBarEl = document.getElementById("radar-legend-bar");
    const legMinEl = document.getElementById("radar-legend-min");
    const legMaxEl = document.getElementById("radar-legend-max");
    const minSummaryEl = document.getElementById("radar-hud-min-summary");
    if (!dbzEl || !peakEl || !echoEl) return;

    if (vecRowEl) vecRowEl.setAttribute("hidden", "");

    const isWindMode = this.layerMode === "wind" || this.layerMode === "both";
    if (legBarEl) legBarEl.classList.toggle("is-wind", isWindMode);
    if (legMinEl) {
      legMinEl.textContent = isWindMode
        ? state.useImperial
          ? "0 mph"
          : "0 km/h"
        : "10 dBZ";
    }
    if (legMaxEl) {
      legMaxEl.textContent = isWindMode
        ? state.useImperial
          ? "50+ mph"
          : "80+ km/h"
        : "55+ dBZ";
    }

    if (isWindMode) {
      const sampleLat = this.probedCoords?.lat ?? state.location?.latitude ?? 40.7128;
      const sampleLon = this.probedCoords?.lon ?? state.location?.longitude ?? -74.006;
      const frame = this.frames[this.currentIndex] || { offsetMinutes: 0 };
      const windSample = this.sampleWindField(
        sampleLat,
        sampleLon,
        Number(frame.offsetMinutes || 0)
      );

      if (dbzLabelEl) dbzLabelEl.textContent = this.probedCoords ? "Probed" : "Wind";
      if (peakLabelEl) peakLabelEl.textContent = "Gust";
      if (echoLabelEl) {
        echoLabelEl.textContent = this.layerMode === "both" ? "Echo" : "Scale";
      }

      const windWithDir = `${formatWind(windSample.speedKmh)} ${windSample.windFromCompass}`;
      const gustStr = formatWind(windSample.gustKmh);
      dbzEl.textContent = windWithDir;
      peakEl.textContent = gustStr;

      if (this.layerMode === "both") {
        const curDbz = tel?.inConusGrid ? tel.currentDbz : 0;
        const echoShort = curDbz > 0 ? `${curDbz.toFixed(0)} dBZ` : "0 dBZ";
        echoEl.textContent =
          curDbz > 0 ? `${curDbz.toFixed(0)} dBZ (${tel.intensityCategory})` : "0 dBZ (Clear)";
        if (minSummaryEl) minSummaryEl.textContent = `${windWithDir} · ${echoShort}`;
      } else {
        echoEl.textContent = windSample.beaufort;
        if (minSummaryEl) minSummaryEl.textContent = `${windWithDir} · Gust ${gustStr}`;
      }
      return;
    }

    if (dbzLabelEl) dbzLabelEl.textContent = this.probedCoords ? "Probed" : "Echo";
    if (peakLabelEl) peakLabelEl.textContent = "Peak";
    if (echoLabelEl) echoLabelEl.textContent = "Storm";

    if (!tel || !tel.inConusGrid) {
      const precip = state.weather?.minuteRates?.[0] ?? 0;
      const echoTxt = precip > 0.1 ? "Active Echo" : "0 dBZ (Clear)";
      dbzEl.textContent = echoTxt;
      peakEl.textContent = `${Math.round(state.weather?.hourly?.[0]?.precipProb ?? 0)}% PoP`;
      echoEl.textContent = `${formatWind(state.weather?.windSpeed ?? 15)} ${compassDirection(
        state.weather?.windDirection ?? 240
      )}`;
      if (minSummaryEl) minSummaryEl.textContent = precip > 0.1 ? "Active Echo" : "0 dBZ · Clear";
      return;
    }

    const curDbz = tel.currentDbz;
    dbzEl.textContent =
      curDbz > 0 ? `${curDbz.toFixed(0)} dBZ (${tel.intensityCategory})` : "0 dBZ (Clear)";
    peakEl.textContent = `${tel.maxDbzNearby.toFixed(0)} dBZ`;
    echoEl.textContent = `${formatWind(tel.stormMotionKmh)} ${tel.stormMotionCompass}`;
    if (minSummaryEl) {
      minSummaryEl.textContent =
        curDbz > 0 ? `${curDbz.toFixed(0)} dBZ · ${tel.intensityCategory}` : "0 dBZ · Clear";
    }
  },
};

/* Load Hyperlocal Weather, Minutely-15 Nowcast, Air Quality & Multi-Model Ensemble */
async function loadWeatherForCurrentLocation() {
  renderLocationsStrip();
  if (!state.weather) {
    document.body.classList.add("is-loading");
  }
  const { latitude, longitude, name, region } = state.location;
  document.getElementById("hero-city").textContent = name;
  const mobileNavCityEl = document.getElementById("mobile-nav-city");
  if (mobileNavCityEl) mobileNavCityEl.textContent = name;
  const cleanedRegion = sanitizeRegionString(region);
  document.getElementById("location-kicker").innerHTML = `<span>${cleanedRegion}</span>`;
  const mobileNavKickerEl = document.getElementById("mobile-nav-kicker");
  if (mobileNavKickerEl) mobileNavKickerEl.textContent = cleanedRegion;

  if (!cleanedRegion || !/\b[A-Z0-9]{3,10}\b/i.test((cleanedRegion.split("•")[1] || "").trim())) {
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (!info) return;
        const resolvedRegion = resolveReverseGeocodeRegion(info, name);
        if (
          resolvedRegion &&
          Math.abs(state.location.latitude - latitude) < 0.01 &&
          Math.abs(state.location.longitude - longitude) < 0.01
        ) {
          state.location.region = resolvedRegion;
          document.getElementById("location-kicker").innerHTML = `<span>${resolvedRegion}</span>`;
          if (mobileNavKickerEl) mobileNavKickerEl.textContent = resolvedRegion;
          saveRecentSearch(state.location);
        }
      })
      .catch(() => {});
  }
  const coordsEl = document.getElementById("hero-coords");
  if (coordsEl) {
    const latDir = latitude >= 0 ? "N" : "S";
    const lonDir = longitude >= 0 ? "E" : "W";
    coordsEl.textContent = `${Math.abs(latitude).toFixed(4)}° ${latDir}, ${Math.abs(
      longitude
    ).toFixed(4)}° ${lonDir}`;
  }

  dopplerRadarMap.updateCoordsHudLabel();

  // Sync Züs 1km Doppler Radar Map & Point Telemetry in parallel
  const dopplerPromise = dopplerRadarMap.syncForLocation(latitude, longitude);

  try {
    const forecastParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation,uv_index,dew_point_2m,visibility,cape,is_day",
      minutely_15: "precipitation,weather_code",
      hourly:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,dew_point_2m,cloud_cover,visibility,pressure_msl,cape,is_day",
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
      minutely_15: "precipitation",
      hourly:
        "temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,dew_point_2m,cloud_cover,visibility,pressure_msl",
      models: "best_match,ecmwf_ifs025,gfs_seamless,icon_seamless",
      forecast_days: "10",
      timezone: "auto",
    });

    const fetchWithTimeout = (url, ms = 3600) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ms);
      return fetch(url, { signal: ctrl.signal })
        .then((r) => {
          clearTimeout(timer);
          return r.ok ? r.json() : null;
        })
        .catch(() => {
          clearTimeout(timer);
          return null;
        });
    };

    const zusQuery = `/weather?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(
      4
    )}&city=${encodeURIComponent(name)}`;
    const zusWeatherPromise = fetchWithTimeout(`${ZUS_API_BASE}${zusQuery}`, 3600).then(
      (res) => {
        if (res) return res;
        const fallbackBase =
          ZUS_API_HOST === ZUS_API_HTTPS_HOST
            ? `${ZUS_API_LAN_HOST}/api/v1`
            : `${ZUS_API_HTTPS_HOST}/api/v1`;
        return fetchWithTimeout(`${fallbackBase}${zusQuery}`, 2600);
      }
    );

    const raceTimeout = (p, ms = 2800) =>
      Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

    const [fResp, aqiResp, ensResp, dopplerTel, zusWeather] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`).catch(
        () => null
      ),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqiParams.toString()}`).catch(
        () => null
      ),
      fetch(`https://api.open-meteo.com/v1/forecast?${ensembleParams.toString()}`).catch(
        () => null
      ),
      raceTimeout(dopplerPromise, 2200),
      raceTimeout(zusWeatherPromise, 2800),
    ]);

    if ((!fResp || !fResp.ok) && !zusWeather) {
      throw new Error(`HTTP ${fResp ? fResp.status : "ERR"}`);
    }
    const rawForecast = fResp && fResp.ok ? await fResp.json() : {};
    const rawAqi = aqiResp && aqiResp.ok ? await aqiResp.json() : null;
    const rawEnsemble = ensResp && ensResp.ok ? await ensResp.json() : null;

    const mergedDoppler = zusWeather?.dopplerTelemetry || dopplerTel || dopplerRadarMap.telemetry;
    if (mergedDoppler) {
      dopplerRadarMap.telemetry = mergedDoppler;
    }

    state.weather = parseWeatherData(
      rawForecast,
      rawAqi,
      rawEnsemble,
      mergedDoppler,
      zusWeather
    );
    renderDashboard();
    dopplerRadarMap.renderTelemetryStrip(mergedDoppler);

    // If dopplerPromise or zusWeatherPromise finished after the initial race budget, re-render full dashboard with ZüsAPI alignment
    Promise.all([dopplerPromise.catch(() => null), zusWeatherPromise]).then(
      ([lateDoppler, lateZus]) => {
        const effectiveZus = lateZus || zusWeather;
        const latestTel = effectiveZus?.dopplerTelemetry || lateDoppler || mergedDoppler;
        const zusJustArrived = Boolean(lateZus && !zusWeather);
        const telChanged = Boolean(latestTel && latestTel !== mergedDoppler);
        if (zusJustArrived || telChanged) {
          if (latestTel) {
            dopplerRadarMap.telemetry = latestTel;
            dopplerRadarMap.renderTelemetryStrip(latestTel);
          }
          state.weather = parseWeatherData(
            rawForecast,
            rawAqi,
            rawEnsemble,
            latestTel,
            effectiveZus
          );
          if (state.weather) {
            renderDashboard();
          }
        }
      }
    );
  } catch (err) {
    console.warn("Weather fetch error:", err);
    document.getElementById("last-updated").textContent = "Connection interrupted";
    playTilesAppearCascade("sky-clear");
  }
}

function parseWeatherData(raw, rawAqi, rawEnsemble, dopplerTel = null, zusWeather = null) {
  const c = raw.current || {};
  const h = raw.hourly || {};
  const d = raw.daily || {};
  const m15 = raw.minutely_15 || {};
  const zCur = zusWeather?.current || null;

  const nowMs = Date.now();
  const currentIso = String(c.time || "");
  const currentHourPrefix = currentIso.slice(0, 13);
  const current15Prefix = currentIso.slice(0, 15);

  let startHourIdx = 0;
  if (Array.isArray(h.time)) {
    const foundByIso = currentHourPrefix
      ? h.time.findIndex((t) => String(t).startsWith(currentHourPrefix))
      : -1;
    if (foundByIso >= 0) {
      startHourIdx = foundByIso;
    } else {
      const found = h.time.findIndex((t) => new Date(t).getTime() >= nowMs - 3600000);
      if (found >= 0) startHourIdx = found;
    }
  }

  // Extract 60-minute precipitation curve from minutely_15 blended with 1km Züs Doppler trajectory
  let startM15Idx = 0;
  if (Array.isArray(m15.time)) {
    const foundM15ByIso = current15Prefix
      ? m15.time.findIndex((t) => String(t) >= current15Prefix)
      : -1;
    if (foundM15ByIso >= 0) {
      startM15Idx = foundM15ByIso;
    } else {
      const foundM15 = m15.time.findIndex((t) => new Date(t).getTime() >= nowMs - 900000);
      if (foundM15 >= 0) startM15Idx = foundM15;
    }
  }

  const zHourly = Array.isArray(zusWeather?.hourly) ? zusWeather.hourly : [];
  const wmoFallbackRateMmHr = (wmo) => {
    const code = Number(wmo || 0);
    if (code === 96 || code === 99) return 6.2;
    if (code === 95) return 4.2;
    if (code === 82 || code === 65) return 5.8;
    if (code === 67 || code === 75 || code === 86) return 4.2;
    if (code === 63 || code === 81 || code === 73) return 2.4;
    if (code === 55 || code === 57 || code === 66) return 1.6;
    if (code === 61 || code === 80 || code === 71 || code === 85) return 1.1;
    if (code === 53) return 0.75;
    if (code === 51 || code === 56 || code === 77) return 0.42;
    return 0;
  };

  const raw15Rates = [0, 1, 2, 3, 4].map((q) =>
    Math.max(0, Number(m15.precipitation?.[startM15Idx + q] ?? 0) * 4)
  );
  let effective15Rates = raw15Rates;
  if (Math.max(...raw15Rates, 0) < 0.08) {
    const curWmo = Number(zCur?.observedWeatherCode ?? c.weather_code ?? 0);
    const hWmo0 = Number(h.weather_code?.[startHourIdx] ?? curWmo);
    const hWmo1 = Number(h.weather_code?.[startHourIdx + 1] ?? hWmo0);
    const pop0 = Number(zHourly[0]?.precipitationChance ?? h.precipitation_probability?.[startHourIdx] ?? 0);
    const pop1 = Number(zHourly[1]?.precipitationChance ?? h.precipitation_probability?.[startHourIdx + 1] ?? pop0);
    const hPrecip0 = Number(zHourly[0]?.precipMm ?? h.precipitation?.[startHourIdx] ?? 0);
    const hPrecip1 = Number(zHourly[1]?.precipMm ?? h.precipitation?.[startHourIdx + 1] ?? 0);

    const rStart = Math.max(
      raw15Rates[0] ?? 0,
      Number(zCur?.precipMm ?? c.precipitation ?? 0),
      curWmo >= 51 || hWmo0 >= 51 || pop0 >= 45 ? hPrecip0 : 0,
      curWmo >= 51 ? wmoFallbackRateMmHr(curWmo) : 0
    );
    const rEnd = Math.max(
      raw15Rates[4] ?? 0,
      hWmo1 >= 51 || pop1 >= 45 || hPrecip1 >= 0.15 ? hPrecip1 : 0,
      hWmo1 >= 51 && pop1 >= 45 ? wmoFallbackRateMmHr(hWmo1) : 0
    );

    if (rStart >= 0.08 && rEnd < 0.08) {
      effective15Rates = [rStart, rStart * 0.78, rStart * 0.42, 0.03, 0];
    } else if (rStart < 0.08 && rEnd >= 0.08) {
      effective15Rates = [0, 0.02, rEnd * 0.36, rEnd * 0.76, rEnd];
    } else if (rStart >= 0.08 && rEnd >= 0.08) {
      const wave = [1.0, 0.92, 1.08, 0.94, 1.0];
      effective15Rates = [0, 1, 2, 3, 4].map((q) => {
        const f = q / 4;
        const base = rStart * (1 - f) + rEnd * f;
        return Math.max(0.12, base * wave[q]);
      });
    }
  }

  const dopRates =
    dopplerTel && dopplerTel.inConusGrid && Array.isArray(dopplerTel.minuteRates60m)
      ? dopplerTel.minuteRates60m
      : [];
  const exact61Rates =
    dopplerTel &&
    dopplerTel.inConusGrid &&
    Array.isArray(dopplerTel.minuteByMinuteRates) &&
    dopplerTel.minuteByMinuteRates.length >= 61 &&
    (Math.max(...dopplerTel.minuteByMinuteRates, 0) >= 0.08 || Math.max(...effective15Rates, 0) < 0.08)
      ? dopplerTel.minuteByMinuteRates
      : null;

  // Build 13 5-minute trajectory steps (0..60m) blending 1km Züs Doppler with 15-min NWP model
  const fiveMinPoints = [];
  for (let s = 0; s <= 12; s++) {
    const seg15 = Math.min(3, Math.floor(s / 3));
    const frac15 = (s - seg15 * 3) / 3;
    const r0 = effective15Rates[seg15] ?? 0;
    const r1 = effective15Rates[seg15 + 1] ?? r0;
    const modelRate = Math.max(0, r0 * (1 - frac15) + r1 * frac15);
    if (dopRates.length >= 13) {
      const dopRate = Number(dopRates[s] ?? 0);
      fiveMinPoints.push(Math.max(dopRate, dopRate * 0.85 + modelRate * 0.15));
    } else {
      fiveMinPoints.push(modelRate);
    }
  }

  // Use 61 1-minute sub-pixel Lagrangian Doppler rates (0..60m) directly when available, else cosine-interpolate
  const minuteRates = [];
  for (let min = 0; min <= 60; min++) {
    if (exact61Rates) {
      minuteRates.push(Math.max(0, Number(exact61Rates[min] ?? 0)));
    } else {
      const seg = Math.min(11, Math.floor(min / 5));
      const frac = (min - seg * 5) / 5;
      const v0 = fiveMinPoints[seg] ?? 0;
      const v1 = fiveMinPoints[seg + 1] ?? v0;
      // Cosine smooth interpolation
      const mu = (1 - Math.cos(frac * Math.PI)) / 2;
      minuteRates.push(Math.max(0, v0 * (1 - mu) + v1 * mu));
    }
  }

  // Next 24 hours (assimilate ZüsAPI MOS bias-corrected & ground-truth hourly stream + multi-model min/max envelope)
  const eh = rawEnsemble?.hourly || {};
  const em15 = rawEnsemble?.minutely_15 || {};
  const modelKeys = ["best_match", "ecmwf_ifs025", "gfs_seamless", "icon_seamless"];

  let startEm15Idx = startM15Idx;
  if (Array.isArray(em15.time)) {
    const foundEm15ByIso = current15Prefix
      ? em15.time.findIndex((t) => String(t) >= current15Prefix)
      : -1;
    if (foundEm15ByIso >= 0) {
      startEm15Idx = foundEm15ByIso;
    } else {
      const foundEm15 = em15.time.findIndex((t) => new Date(t).getTime() >= nowMs - 900000);
      if (foundEm15 >= 0) startEm15Idx = foundEm15;
    }
  }

  // Extract 61-minute per-model precipitation trajectories (0..60m) for the min/max estimation band
  const modelCheckpoints15m = {};
  for (const mk of modelKeys) {
    const arr15 = em15[`precipitation_${mk}`];
    const arrH = eh[`precipitation_${mk}`];
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const v15 = arr15?.[startEm15Idx + k];
      if (v15 !== null && v15 !== undefined && !Number.isNaN(Number(v15)) && Number(v15) > 0) {
        pts.push(Math.max(0, Number(v15) * 4));
      } else {
        const h0 = Number(arrH?.[startHourIdx] ?? effective15Rates[0] ?? 0);
        const h1 = Number(arrH?.[startHourIdx + 1] ?? h0);
        const f = k / 4;
        pts.push(Math.max(0, h0 * (1 - f) + h1 * f));
      }
    }
    modelCheckpoints15m[mk] = pts;
  }

  const minuteRatesMin = [];
  const minuteRatesMax = [];
  const curPop = Number(zHourly[0]?.precipitationChance ?? h.precipitation_probability?.[startHourIdx] ?? 0);
  const baseDrySpread = Math.min(0.85, 0.42 + (curPop / 100) * 0.45);

  for (let min = 0; min <= 60; min++) {
    const p = minuteRates[min] ?? 0;
    const seg15 = Math.min(3, Math.floor(min / 15));
    const frac15 = (min - seg15 * 15) / 15;
    const mu15 = (1 - Math.cos(frac15 * Math.PI)) / 2;

    const candidates = [p];
    for (const mk of modelKeys) {
      const cp = modelCheckpoints15m[mk];
      if (cp) {
        const mRate = cp[seg15] * (1 - mu15) + cp[seg15 + 1] * mu15;
        if (!Number.isNaN(mRate)) candidates.push(Math.max(0, mRate));
      }
    }

    // Include pure primary NWP 15-min rate and pure Doppler rate as physical envelope members
    const p15a = Number(m15.precipitation?.[startM15Idx + seg15] ?? 0) * 4;
    const p15b = Number(m15.precipitation?.[startM15Idx + seg15 + 1] ?? p15a / 4) * 4;
    candidates.push(Math.max(0, p15a * (1 - mu15) + p15b * mu15));

    if (dopRates.length >= 13) {
      const seg5 = Math.min(11, Math.floor(min / 5));
      const frac5 = (min - seg5 * 5) / 5;
      const mu5 = (1 - Math.cos(frac5 * Math.PI)) / 2;
      const d0 = Number(dopRates[seg5] ?? 0);
      const d1 = Number(dopRates[seg5 + 1] ?? d0);
      candidates.push(Math.max(0, d0 * (1 - mu5) + d1 * mu5));
    }

    const rawMin = Math.max(0, Math.min(...candidates));
    const rawMax = Math.max(...candidates);
    const spread = rawMax - rawMin;

    const minFallback = p > 0.05 ? Math.max(0, p * 0.68 - 0.12) : 0;
    const maxFallback = p > 0.05 ? Math.max(p * 1.32 + 0.38, p + baseDrySpread) : baseDrySpread;

    minuteRatesMin.push(
      spread > 0.08 ? Math.max(0, Math.min(p, rawMin)) : Math.min(rawMin, minFallback)
    );
    minuteRatesMax.push(
      Math.min(9.0, spread > 0.08 ? Math.max(p + 0.25, rawMax) : Math.max(rawMax, maxFallback))
    );
  }

  const extractModelVals = (fieldPrefix, hourIdx, scale = 1) => {
    const vals = [];
    for (const mk of modelKeys) {
      const v = eh[`${fieldPrefix}_${mk}`]?.[hourIdx];
      if (v !== null && v !== undefined && !Number.isNaN(Number(v))) {
        vals.push(Number(v) * scale);
      }
    }
    return vals;
  };

  const computeBounds = (primaryVal, modelVals, fallbackHalfSpread, clampMin = -Infinity, clampMax = Infinity) => {
    const p = Number(primaryVal ?? 0);
    if (modelVals.length >= 2) {
      const rawMin = Math.min(...modelVals);
      const rawMax = Math.max(...modelVals);
      const spread = rawMax - rawMin;
      if (spread > 1e-4) {
        return {
          min: Math.max(clampMin, Math.min(p, rawMin)),
          max: Math.min(clampMax, Math.max(p, rawMax)),
        };
      }
    }
    return {
      min: Math.max(clampMin, p - fallbackHalfSpread),
      max: Math.min(clampMax, p + fallbackHalfSpread),
    };
  };

  // Map daily sunrise/sunset local clock times (YYYY-MM-DDTHH:MM) to decimal hours for accurate day/night icons & sky phases
  const parseIsoHourFrac = (isoStr, fallback) => {
    if (!isoStr || typeof isoStr !== "string" || isoStr.length < 16) return fallback;
    const hh = Number(isoStr.slice(11, 13));
    const mm = Number(isoStr.slice(14, 16));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return fallback;
    return hh + mm / 60;
  };

  const zDailyEarly = Array.isArray(zusWeather?.daily) ? zusWeather.daily : [];
  const solarMap = {};
  const maxSolarDays = Math.max(d.time?.length || 0, zDailyEarly.length);
  for (let i = 0; i < maxSolarDays; i++) {
    const zd = i < zDailyEarly.length ? zDailyEarly[i] : null;
    const dKey = String(d.time?.[i] || zd?.date || "").slice(0, 10);
    if (!dKey) continue;
    solarMap[dKey] = {
      rise: parseIsoHourFrac(zd?.sunrise ?? d.sunrise?.[i], 6.25),
      set: parseIsoHourFrac(zd?.sunset ?? d.sunset?.[i], 18.5),
    };
  }

  const getSolarStateFor = (dateKey, hourFrac, rawIsDay) => {
    const bounds = solarMap[dateKey] || { rise: 6.25, set: 18.5 };
    const isNightByClock = hourFrac < bounds.rise || hourFrac >= bounds.set;
    const isNight =
      rawIsDay !== undefined && rawIsDay !== null
        ? Number(rawIsDay) === 0
        : isNightByClock;
    const nearSunrise = Math.abs(hourFrac - bounds.rise) <= 0.75;
    const nearSunset = Math.abs(hourFrac - bounds.set) <= 0.75;
    const solarPhase =
      nearSunrise || nearSunset ? "twilight" : isNight ? "night" : "day";
    return { isNight, solarPhase, rise: bounds.rise, set: bounds.set };
  };

  const zusTempBiasOffset =
    zHourly.length > 0 &&
    zHourly[0]?.temperature !== undefined &&
    h.temperature_2m?.[startHourIdx] !== undefined
      ? Number(zHourly[0].temperature) - Number(h.temperature_2m[startHourIdx])
      : 0;

  const buildHourPoint = (idx, zh = null) => {
    const tStr = String(h.time?.[idx] || zh?.time || "");
    const dateKey = tStr.slice(0, 10);
    const hourNum = Number(tStr.slice(11, 13)) || 0;
    const minNum = Number(tStr.slice(14, 16)) || 0;
    const hourSolar = getSolarStateFor(
      dateKey,
      hourNum + minNum / 60,
      h.is_day?.[idx]
    );

    const rawAlignedTemp =
      h.temperature_2m?.[idx] !== undefined && h.temperature_2m?.[idx] !== null
        ? Number(h.temperature_2m[idx]) + zusTempBiasOffset
        : Number(c.temperature_2m ?? 0) + zusTempBiasOffset;
    const rawAlignedFeels =
      h.apparent_temperature?.[idx] !== undefined && h.apparent_temperature?.[idx] !== null
        ? Number(h.apparent_temperature[idx]) + zusTempBiasOffset
        : rawAlignedTemp;

    const temperature = Number(zh?.temperature ?? rawAlignedTemp);
    const feelsLike = Number(zh?.feelsLike ?? rawAlignedFeels);
    const wmoCode = Number(zh?.wmoCode ?? h.weather_code?.[idx] ?? 0);
    const precipProb = Number(zh?.precipitationChance ?? h.precipitation_probability?.[idx] ?? 0);
    const precipMm = Number(zh?.precipMm ?? h.precipitation?.[idx] ?? 0);
    const windSpeed = Number(zh?.windSpeed ?? h.wind_speed_10m?.[idx] ?? 0);
    const windDirection = Number(
      zh?.windDirection ?? h.wind_direction_10m?.[idx] ?? c.wind_direction_10m ?? 245
    );
    const windGusts = Number(
      zh?.windGusts ?? h.wind_gusts_10m?.[idx] ?? Math.max(windSpeed * 1.3, windSpeed + 4)
    );
    const uvIndex = Math.max(0, Number(zh?.uvIndex ?? h.uv_index?.[idx] ?? 0));
    const dewPoint = Number(
      zh?.dewPoint ??
        (h.dew_point_2m?.[idx] !== undefined && h.dew_point_2m?.[idx] !== null
          ? Number(h.dew_point_2m[idx]) + zusTempBiasOffset
          : temperature - 4)
    );
    const humidity = Number(
      zh?.humidity ??
      h.relative_humidity_2m?.[idx] ??
      Math.max(10, Math.min(100, Math.round(100 - 5 * (temperature - dewPoint))))
    );
    const wetBulbC =
      zh?.wetBulbTemperature !== undefined && zh?.wetBulbTemperature !== null
        ? Number(zh.wetBulbTemperature)
        : calcWetBulbC(temperature, humidity);

    let precipType = zh?.precipType || null;
    if (!precipType) {
      if ([56, 57, 66, 67, 77].includes(wmoCode)) {
        precipType = "sleet";
      } else if (wetBulbC !== null && wetBulbC !== undefined) {
        if (wetBulbC <= -0.4) precipType = "snow";
        else if (wetBulbC <= 0.8) precipType = "sleet";
        else if ([71, 73, 75, 85, 86].includes(wmoCode) && temperature <= 2.0) precipType = "snow";
        else precipType = "rain";
      } else if ([71, 73, 75, 85, 86].includes(wmoCode)) {
        precipType = "snow";
      } else {
        precipType = "rain";
      }
    }

    let snowAccumulationCm =
      zh?.snowAccumulationCm !== undefined && zh?.snowAccumulationCm !== null
        ? Number(zh.snowAccumulationCm)
        : 0.0;
    if (
      (zh?.snowAccumulationCm === undefined || zh?.snowAccumulationCm === null) &&
      (precipType === "snow" || precipType === "sleet") &&
      precipMm > 0
    ) {
      const slr = calcSnowLiquidRatio(temperature, precipType);
      snowAccumulationCm = Math.round(((precipMm / 10.0) * slr) * 100) / 100;
    }

    let hourCondition = conditionFromWMO(wmoCode);
    if (
      precipType === "sleet" &&
      (precipProb >= 25 || precipMm > 0.1 || [56, 57, 66, 67, 77].includes(wmoCode))
    ) {
      hourCondition = SKY_CONDITIONS.sleet;
    }

    const cloudCover = Math.min(100, Math.max(0, Number(zh?.cloudCover ?? h.cloud_cover?.[idx] ?? 0)));
    const visibilityKm = Math.max(
      0.2,
      Number(zh?.visibilityKm ?? (h.visibility?.[idx] ?? 16000) / 1000)
    );
    const pressure = Number(
      zh?.pressure ?? h.pressure_msl?.[idx] ?? c.pressure_msl ?? 1013.25
    );

    const tempB = computeBounds(
      temperature,
      (zh ? [zh.tempMin, zh.tempMax] : extractModelVals("temperature_2m", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.1
    );
    const feelsB = computeBounds(
      feelsLike,
      (zh ? [zh.feelsMin, zh.feelsMax] : extractModelVals("apparent_temperature", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.3
    );
    const popB = computeBounds(
      precipProb,
      (zh
        ? [zh.precipProbMin, zh.precipProbMax]
        : extractModelVals("precipitation_probability", idx)
      ).filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v))),
      12,
      0,
      100
    );
    const prMmB = computeBounds(
      precipMm,
      (zh ? [zh.precipMmMin, zh.precipMmMax] : extractModelVals("precipitation", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      precipMm > 0.05 ? Math.max(0.25, precipMm * 0.35) : 0.12,
      0
    );
    const windB = computeBounds(
      windSpeed,
      (zh ? [zh.windMin, zh.windMax] : extractModelVals("wind_speed_10m", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      Math.max(2.5, windSpeed * 0.18),
      0
    );
    const gustB = computeBounds(
      windGusts,
      (zh ? [zh.gustMin, zh.gustMax] : extractModelVals("wind_gusts_10m", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      Math.max(3.8, windGusts * 0.2),
      0
    );
    const uvB = computeBounds(
      uvIndex,
      (zh ? [zh.uvMin, zh.uvMax] : extractModelVals("uv_index", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      uvIndex > 0.2 ? Math.max(0.4, uvIndex * 0.16) : 0.0,
      0,
      16
    );
    const dewB = computeBounds(
      dewPoint,
      (zh ? [zh.dewMin, zh.dewMax] : extractModelVals("dew_point_2m", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.0
    );
    const cloudB = computeBounds(
      cloudCover,
      (zh ? [zh.cloudMin, zh.cloudMax] : extractModelVals("cloud_cover", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      10,
      0,
      100
    );
    const visB = computeBounds(
      visibilityKm,
      (zh ? [zh.visMin, zh.visMax] : extractModelVals("visibility", idx, 0.001)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      Math.max(1.2, visibilityKm * 0.14),
      0.1,
      40
    );
    const pressB = computeBounds(
      pressure,
      (zh ? [zh.pressMin, zh.pressMax] : extractModelVals("pressure_msl", idx)).filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.2,
      940,
      1060
    );

    return {
      time: new Date(h.time?.[idx] || zh?.time || Date.now()),
      dateKey,
      hourNum,
      isNight: hourSolar.isNight,
      solarPhase: hourSolar.solarPhase,
      wmoCode,
      condition: hourCondition,
      temperature,
      tempMin: tempB.min,
      tempMax: tempB.max,
      feelsLike,
      feelsMin: feelsB.min,
      feelsMax: feelsB.max,
      precipProb,
      precipProbMin: popB.min,
      precipProbMax: popB.max,
      precipMm,
      precipMmMin: prMmB.min,
      precipMmMax: prMmB.max,
      precipType,
      snowAccumulationCm,
      humidity,
      wetBulbC,
      windSpeed,
      windDirection,
      windMin: windB.min,
      windMax: windB.max,
      windGusts,
      gustMin: gustB.min,
      gustMax: gustB.max,
      uvIndex,
      uvMin: uvB.min,
      uvMax: uvB.max,
      dewPoint,
      dewMin: dewB.min,
      dewMax: dewB.max,
      cloudCover,
      cloudMin: cloudB.min,
      cloudMax: cloudB.max,
      visibilityKm,
      visMin: visB.min,
      visMax: visB.max,
      pressure,
      pressMin: pressB.min,
      pressMax: pressB.max,
      capeJkg: Number(zh?.capeJkg ?? h.cape?.[idx] ?? 0),
    };
  };

  // Build full 10-day hourly dataset (all 240 hours) + forward 10-day stream starting at current hour
  const allHourly = [];
  const totalHourLen = Array.isArray(h.time) && h.time.length > 0 ? h.time.length : zHourly.length;
  for (let idx = 0; idx < totalHourLen; idx++) {
    const zOffset = idx - startHourIdx;
    const zh = zOffset >= 0 && zOffset < zHourly.length ? zHourly[zOffset] : null;
    allHourly.push(buildHourPoint(idx, zh));
  }

  const hourly = allHourly.slice(startHourIdx);

  // 10-Day Forecast (consumed from ZüsAPI RLS + Diurnal Harmonic MOS blend, with Open-Meteo fallback)
  const zDaily = Array.isArray(zusWeather?.daily) ? zusWeather.daily : [];
  const daily = [];
  const dayLen = Math.min(Math.max(d.time?.length || 0, zDaily.length), 10);
  for (let i = 0; i < dayLen; i++) {
    const zd = i < zDaily.length ? zDaily[i] : null;
    const dayKey = String(d.time?.[i] || zd?.date || "").slice(0, 10);
    let dayHours =
      i === 0
        ? hourly.slice(0, 24)
        : allHourly.filter((pt) => pt.dateKey === dayKey);
    if (!dayHours.length) {
      dayHours = allHourly.slice(i * 24, (i + 1) * 24);
    }

    let snowAccumulationCm =
      zd?.snowAccumulationCm !== undefined && zd?.snowAccumulationCm !== null
        ? Number(zd.snowAccumulationCm)
        : dayHours.reduce((sum, pt) => sum + (pt.snowAccumulationCm || 0), 0);
    snowAccumulationCm = Math.round(snowAccumulationCm * 10) / 10;

    let precipType = zd?.precipType || null;
    if (!precipType) {
      const sleetHours = dayHours.filter(
        (pt) => pt.precipType === "sleet" && (pt.precipMm > 0.1 || pt.precipProb >= 25)
      );
      const snowHours = dayHours.filter(
        (pt) => pt.precipType === "snow" && (pt.precipMm > 0.1 || pt.precipProb >= 25)
      );
      if (sleetHours.length > snowHours.length && sleetHours.length > 0) {
        precipType = "sleet";
      } else if (snowHours.length > 0) {
        precipType = "snow";
      } else {
        precipType = "rain";
      }
    }

    const dayWmo = Number(zd?.wmoCode ?? d.weather_code?.[i] ?? 0);
    const dayPop = Number(zd?.precipitationChance ?? d.precipitation_probability_max?.[i] ?? 0);
    const dayPsum = Number(zd?.precipSumMm ?? d.precipitation_sum?.[i] ?? 0);
    let dayCondition = conditionFromWMO(dayWmo);
    if (
      precipType === "sleet" &&
      (dayPop >= 25 || dayPsum > 0.1 || [56, 57, 66, 67, 77].includes(dayWmo))
    ) {
      dayCondition = SKY_CONDITIONS.sleet;
    }

    daily.push({
      date: new Date(`${dayKey}T12:00:00`),
      dateKey: dayKey,
      wmoCode: dayWmo,
      condition: dayCondition,
      tempMin: Number(zd?.minTemperature ?? d.temperature_2m_min?.[i] ?? 0),
      tempMax: Number(zd?.maxTemperature ?? d.temperature_2m_max?.[i] ?? 0),
      precipProb: dayPop,
      precipSumMm: dayPsum,
      precipType,
      snowAccumulationCm,
      snowToLiquidRatio: Number(zd?.snowToLiquidRatio ?? 10),
      uvMax: Number(zd?.uvIndexMax ?? d.uv_index_max?.[i] ?? 5),
      windMax: Number(zd?.windSpeedMax ?? d.wind_speed_10m_max?.[i] ?? 10),
      windDir: Number(zd?.windDirectionDominant ?? d.wind_direction_10m_dominant?.[i] ?? 180),
      sunrise: zd?.sunrise ?? d.sunrise?.[i] ?? null,
      sunset: zd?.sunset ?? d.sunset?.[i] ?? null,
      hours: dayHours,
    });
  }

  // Parse Multi-Model Ensemble (preferring ZüsAPI RLS + Diurnal Harmonic MOS modelWeights)
  const eIdx = Math.min(startHourIdx, 23);
  const zWeights = Array.isArray(zusWeather?.modelWeights) ? zusWeather.modelWeights : [];
  const modelMetaMap = {
    HRRR: {
      name: "NOAA HRRR 3km",
      tag: "High-Res CONUS",
      rawTemp: eh.temperature_2m_best_match?.[eIdx],
      rawPop: eh.precipitation_probability_best_match?.[eIdx],
      rawWind: eh.wind_speed_10m_best_match?.[eIdx],
    },
    ECMWF: {
      name: "ECMWF IFS 0.25°",
      tag: "European Global",
      rawTemp: eh.temperature_2m_ecmwf_ifs025?.[eIdx],
      rawPop: eh.precipitation_probability_ecmwf_ifs025?.[eIdx],
      rawWind: eh.wind_speed_10m_ecmwf_ifs025?.[eIdx],
    },
    GFS: {
      name: "NOAA GFS",
      tag: "US Global",
      rawTemp: eh.temperature_2m_gfs_seamless?.[eIdx],
      rawPop: eh.precipitation_probability_gfs_seamless?.[eIdx],
      rawWind: eh.wind_speed_10m_gfs_seamless?.[eIdx],
    },
    ICON: {
      name: "DWD ICON",
      tag: "German Global",
      rawTemp: eh.temperature_2m_icon_seamless?.[eIdx],
      rawPop: eh.precipitation_probability_icon_seamless?.[eIdx],
      rawWind: eh.wind_speed_10m_icon_seamless?.[eIdx],
    },
    GEM: {
      name: "CMC GEM",
      tag: "Canadian Global",
      rawTemp: null,
      rawPop: null,
      rawWind: null,
    },
  };

  let rawEnsembleModels;
  if (zWeights.length > 0) {
    rawEnsembleModels = zWeights.map((mw) => {
      const meta = modelMetaMap[mw.modelName] || {
        name: mw.modelName,
        tag: "RLS Model",
        rawTemp: null,
        rawPop: null,
        rawWind: null,
      };
      const diurnalBias = Number(mw.diurnalBiasNowCelsius ?? mw.biasCelsius ?? 0);
      const fallbackTemp =
        meta.rawTemp !== null && meta.rawTemp !== undefined
          ? Number(meta.rawTemp) - diurnalBias
          : Number(zCur?.temperature ?? zHourly[0]?.temperature ?? c.temperature_2m ?? 0);
      const modelTemp =
        mw.currentTempCelsius !== null && mw.currentTempCelsius !== undefined
          ? Number(mw.currentTempCelsius)
          : fallbackTemp;
      const modelPop =
        mw.currentPrecipProb !== null && mw.currentPrecipProb !== undefined
          ? Number(mw.currentPrecipProb)
          : Number(meta.rawPop ?? zHourly[0]?.precipitationChance ?? 0);
      const modelWind =
        mw.currentWindKmh !== null && mw.currentWindKmh !== undefined
          ? Number(mw.currentWindKmh)
          : Number(meta.rawWind ?? zCur?.windSpeed ?? 0);
      return {
        modelId: mw.modelName,
        name: meta.name,
        tag: `${Math.round(Number(mw.weight ?? 0.25) * 100)}% RLS Weight`,
        temp: modelTemp,
        precip: 0,
        precipProb: modelPop,
        wind: modelWind,
        rlsWeight: Number(mw.weight ?? 0.25),
        weightShort: Number(mw.weightShort ?? mw.weight ?? 0.25),
        weightMed: Number(mw.weightMed ?? mw.weight ?? 0.25),
        weightExt: Number(mw.weightExt ?? mw.weight ?? 0.25),
        accuracyPercent: Number(mw.accuracyPercent ?? 94),
        maeCelsius: Number(mw.maeCelsius ?? 0.8),
        biasCelsius: Number(mw.biasCelsius ?? 0),
        diurnalBiasNowCelsius: diurnalBias,
        samplesVerified: Number(mw.samplesVerified ?? 1),
      };
    });
  } else {
    rawEnsembleModels = [
      {
        name: "HRRR / Best Match",
        tag: "High-Res",
        temp: eh.temperature_2m_best_match?.[eIdx] ?? c.temperature_2m,
        precip: eh.precipitation_best_match?.[eIdx] ?? c.precipitation ?? 0,
        precipProb:
          eh.precipitation_probability_best_match?.[eIdx] ??
          h.precipitation_probability?.[startHourIdx] ??
          0,
        wind: eh.wind_speed_10m_best_match?.[eIdx] ?? c.wind_speed_10m ?? 0,
      },
      {
        name: "ECMWF IFS 0.25°",
        tag: "European",
        temp: eh.temperature_2m_ecmwf_ifs025?.[eIdx] ?? c.temperature_2m,
        precip: eh.precipitation_ecmwf_ifs025?.[eIdx] ?? c.precipitation ?? 0,
        precipProb:
          eh.precipitation_probability_ecmwf_ifs025?.[eIdx] ??
          h.precipitation_probability?.[startHourIdx] ??
          0,
        wind: eh.wind_speed_10m_ecmwf_ifs025?.[eIdx] ?? c.wind_speed_10m ?? 0,
      },
      {
        name: "NOAA GFS",
        tag: "US Global",
        temp: eh.temperature_2m_gfs_seamless?.[eIdx] ?? c.temperature_2m,
        precip: eh.precipitation_gfs_seamless?.[eIdx] ?? c.precipitation ?? 0,
        precipProb:
          eh.precipitation_probability_gfs_seamless?.[eIdx] ??
          h.precipitation_probability?.[startHourIdx] ??
          0,
        wind: eh.wind_speed_10m_gfs_seamless?.[eIdx] ?? c.wind_speed_10m ?? 0,
      },
      {
        name: "DWD ICON",
        tag: "German Global",
        temp: eh.temperature_2m_icon_seamless?.[eIdx] ?? c.temperature_2m,
        precip: eh.precipitation_icon_seamless?.[eIdx] ?? c.precipitation ?? 0,
        precipProb:
          eh.precipitation_probability_icon_seamless?.[eIdx] ??
          h.precipitation_probability?.[startHourIdx] ??
          0,
        wind: eh.wind_speed_10m_icon_seamless?.[eIdx] ?? c.wind_speed_10m ?? 0,
      },
    ];
  }

  const validTemps = rawEnsembleModels
    .map((m) => m.temp)
    .filter((t) => t !== null && t !== undefined && !Number.isNaN(t));
  const consensusRefTempC = Number(
    zHourly[0]?.temperature ??
      zCur?.temperature ??
      (validTemps.length > 0
        ? validTemps.reduce((acc, v) => acc + v, 0) / validTemps.length
        : c.temperature_2m ?? 0)
  );
  const meanPop =
    rawEnsembleModels.reduce((acc, m) => acc + Number(m.precipProb ?? 0), 0) /
    Math.max(1, rawEnsembleModels.length);

  const ensembleModels = rawEnsembleModels.map((m) => {
    const deltaC = Number(m.temp ?? consensusRefTempC) - consensusRefTempC;
    const popDiff = Math.abs(Number(m.precipProb ?? 0) - meanPop);
    const alignmentPct =
      m.accuracyPercent !== undefined
        ? Math.max(74, Math.min(100, Math.round(m.accuracyPercent)))
        : Math.max(
            74,
            Math.min(100, Math.round(100 - Math.abs(deltaC) * 6.2 - popDiff * 0.14))
          );
    return {
      ...m,
      deltaC,
      alignmentPct,
    };
  });

  const spreadC =
    validTemps.length > 1
      ? Math.max(...validTemps) - Math.min(...validTemps)
      : 0.4;
  const confidencePct =
    zCur?.consensusScore ?? Math.max(82, Math.min(99, Math.round(100 - spreadC * 4.5)));

  // Determine observed WMO weather code (assimilating ZüsAPI RLS + METAR/Doppler ground truth)
  let effectiveWmo = Number(
    zCur?.observedWeatherCode ?? zHourly[0]?.wmoCode ?? c.weather_code ?? 0
  );
  if (effectiveWmo < 51 && minuteRates[0] >= 0.35) {
    effectiveWmo = minuteRates[0] >= 4.0 ? 65 : minuteRates[0] >= 0.8 ? 61 : 51;
  }

  const currentHourPt = hourly[0] || null;
  const curTimeStr = String(c.time || h.time?.[startHourIdx] || zCur?.timestamp || "");
  const curDateKey = curTimeStr.slice(0, 10) || daily[0]?.dateKey || "";
  const curHourFrac = parseIsoHourFrac(curTimeStr, currentHourPt?.hourNum ?? 12);
  const currentSolar = getSolarStateFor(
    curDateKey,
    curHourFrac,
    c.is_day ?? h.is_day?.[startHourIdx]
  );

  const currentUv = Number(
    zCur?.uvIndex ??
      currentHourPt?.uvIndex ??
      c.uv_index ??
      h.uv_index?.[startHourIdx] ??
      0
  );
  const currentVisKm = Number(
    zCur?.visibility ??
      currentHourPt?.visibilityKm ??
      (c.visibility !== undefined && c.visibility !== null
        ? c.visibility / 1000
        : null) ??
      (h.visibility?.[startHourIdx] ?? 10000) / 1000
  );

  const currentTemp = Number(
    zCur?.temperature ?? currentHourPt?.temperature ?? c.temperature_2m ?? 0
  );
  const currentFeelsLike = Number(
    zCur?.feelsLike ?? currentHourPt?.feelsLike ?? c.apparent_temperature ?? currentTemp
  );
  const currentHumidity = Number(
    zCur?.humidity ?? currentHourPt?.humidity ?? c.relative_humidity_2m ?? 50
  );
  const currentDewPoint = Number(
    zCur?.dewPoint ??
      currentHourPt?.dewPoint ??
      c.dew_point_2m ??
      h.dew_point_2m?.[startHourIdx] ??
      currentTemp - (100 - currentHumidity) / 5
  );
  const currentWetBulb =
    zCur?.wetBulbTemperature !== undefined && zCur?.wetBulbTemperature !== null
      ? Number(zCur.wetBulbTemperature)
      : calcWetBulbC(currentTemp, currentHumidity);

  let currentPrecipType = zCur?.precipType ?? currentHourPt?.precipType ?? null;
  if (!currentPrecipType) {
    if ([56, 57, 66, 67, 77].includes(effectiveWmo)) {
      currentPrecipType = "sleet";
    } else if (currentWetBulb !== null && currentWetBulb !== undefined) {
      if (currentWetBulb <= -0.4) currentPrecipType = "snow";
      else if (currentWetBulb <= 0.8) currentPrecipType = "sleet";
      else if ([71, 73, 75, 85, 86].includes(effectiveWmo) && currentTemp <= 2.0) currentPrecipType = "snow";
      else currentPrecipType = "rain";
    } else if ([71, 73, 75, 85, 86].includes(effectiveWmo)) {
      currentPrecipType = "snow";
    } else {
      currentPrecipType = "rain";
    }
  }

  let currentCond = conditionFromWMO(effectiveWmo);
  const currentPop = Number(
    zHourly[0]?.precipitationChance ??
    h.precipitation_probability?.[startHourIdx] ??
    (minuteRates[0] > 0.05 ? 80 : 0)
  );
  const currentPrecipMm = Number(
    zHourly[0]?.precipMm ?? h.precipitation?.[startHourIdx] ?? minuteRates[0]
  );
  if (
    currentPrecipType === "sleet" &&
    (currentPop >= 25 || currentPrecipMm > 0.1 || [56, 57, 66, 67, 77].includes(effectiveWmo))
  ) {
    currentCond = SKY_CONDITIONS.sleet;
  }

  const currentPressure = Number(
    zCur?.airPressure ??
      currentHourPt?.pressure ??
      c.pressure_msl ??
      c.surface_pressure ??
      1013
  );
  const currentWindSpeed = Number(
    zCur?.windSpeed ?? currentHourPt?.windSpeed ?? c.wind_speed_10m ?? 0
  );
  const currentWindDir = Number(
    zCur?.windDirection ?? currentHourPt?.windDirection ?? c.wind_direction_10m ?? 0
  );
  const currentWindGusts = Number(
    zCur?.windGust ??
      currentHourPt?.windGusts ??
      c.wind_gusts_10m ??
      currentWindSpeed * 1.25
  );
  const currentCloudCover = Number(
    zCur?.cloudCover ?? currentHourPt?.cloudCover ?? c.cloud_cover ?? 0
  );

  // Anchor hourly[0] ("NOW") to the exact header state so NOW and Header never diverge
  if (hourly.length > 0) {
    hourly[0].temperature = currentTemp;
    hourly[0].tempMin = Math.min(hourly[0].tempMin ?? currentTemp, currentTemp);
    hourly[0].tempMax = Math.max(hourly[0].tempMax ?? currentTemp, currentTemp);
    hourly[0].feelsLike = currentFeelsLike;
    hourly[0].feelsMin = Math.min(hourly[0].feelsMin ?? currentFeelsLike, currentFeelsLike);
    hourly[0].feelsMax = Math.max(hourly[0].feelsMax ?? currentFeelsLike, currentFeelsLike);
    hourly[0].wmoCode = effectiveWmo;
    hourly[0].condition = currentCond;
    hourly[0].isNight = currentSolar.isNight;
    hourly[0].solarPhase = currentSolar.solarPhase;
    hourly[0].cloudCover = currentCloudCover;
    hourly[0].humidity = currentHumidity;
    hourly[0].dewPoint = currentDewPoint;
    hourly[0].wetBulbC = currentWetBulb;
    hourly[0].precipType = currentPrecipType;
    hourly[0].windSpeed = currentWindSpeed;
    hourly[0].windGusts = currentWindGusts;
    hourly[0].windDirection = currentWindDir;
    hourly[0].pressure = currentPressure;
    hourly[0].visibilityKm = currentVisKm;
    hourly[0].uvIndex = currentUv;
    if (effectiveWmo >= 51) {
      hourly[0].precipProb = Math.max(hourly[0].precipProb, 80);
    }
  }

  return {
    elevation: zCur?.elevationMeters ?? raw.elevation ?? 0,
    temperature: currentTemp,
    feelsLike: currentFeelsLike,
    humidity: currentHumidity,
    dewPoint: currentDewPoint,
    wetBulbC: currentWetBulb,
    precipType: currentPrecipType,
    condition: currentCond,
    pressure: currentPressure,
    windSpeed: currentWindSpeed,
    windDirection: currentWindDir,
    windGusts: currentWindGusts,
    cloudCover: currentCloudCover,
    wmoCode: effectiveWmo,
    isNight: currentSolar.isNight,
    solarPhase: currentSolar.solarPhase,
    localHourFrac: curHourFrac,
    utcOffsetSeconds:
      zusWeather?.utcOffsetSeconds !== undefined && zusWeather?.utcOffsetSeconds !== null
        ? Number(zusWeather.utcOffsetSeconds)
        : raw?.utc_offset_seconds !== undefined && raw?.utc_offset_seconds !== null
        ? Number(raw.utc_offset_seconds)
        : null,
    tempMax: Math.max(
      Number(zCur?.tempMax ?? daily[0]?.tempMax ?? currentTemp),
      currentTemp
    ),
    tempMin: Math.min(
      Number(zCur?.tempMin ?? daily[0]?.tempMin ?? currentTemp),
      currentTemp
    ),
    uvIndex: currentUv,
    uvMaxToday: Math.max(Number(daily[0]?.uvMax ?? currentUv), currentUv),
    sunrise: daily[0]?.sunrise ?? null,
    sunset: daily[0]?.sunset ?? null,
    visibilityKm: currentVisKm,
    cape: Number(zCur?.capeJkg ?? currentHourPt?.capeJkg ?? c.cape ?? h.cape?.[startHourIdx] ?? 0),
    liftedIndex: Number(zCur?.liftedIndex ?? 2.0),
    usAqi: Number(zCur?.usAqi ?? rawAqi?.current?.us_aqi ?? 28),
    pm25: Number(zCur?.pm25 ?? rawAqi?.current?.pm2_5 ?? 6.2),
    ozone: zCur?.ozone ?? rawAqi?.current?.ozone ?? null,
    localStationName: zCur?.localStationName ?? null,
    localStationWx: zCur?.localStationWx ?? null,
    dominantModel: zCur?.dominantModel ?? null,
    nearbyStations: Array.isArray(zusWeather?.nearbyStations) ? zusWeather.nearbyStations : [],
    minuteRates,
    minuteRatesMin,
    minuteRatesMax,
    hourly,
    daily,
    ensembleModels,
    spreadC,
    confidencePct,
  };
}

function playTilesAppearCascade(skyClass, solarPhase = "day") {
  const wasLoading = document.body.classList.contains("is-loading");
  const rootEl = document.documentElement;
  const skyClasses = [
    "sky-clear",
    "sky-overcast",
    "sky-rain",
    "sky-storm",
    "sky-phase-day",
    "sky-phase-twilight",
    "sky-phase-night",
  ];
  document.body.classList.remove("is-loading", ...skyClasses);
  rootEl.classList.remove("is-loading", ...skyClasses);

  const activeSky = skyClass || "sky-clear";
  const activePhase = ["day", "twilight", "night"].includes(solarPhase)
    ? solarPhase
    : "day";
  document.body.classList.add(activeSky, `sky-phase-${activePhase}`);
  rootEl.classList.add(activeSky, `sky-phase-${activePhase}`);

  const skyThemeByPhase = {
    day: {
      "sky-clear": "#1d63b8",
      "sky-overcast": "#334766",
      "sky-rain": "#1f3352",
      "sky-storm": "#1a203d",
    },
    twilight: {
      "sky-clear": "#1b2854",
      "sky-overcast": "#222b45",
      "sky-rain": "#172038",
      "sky-storm": "#151833",
    },
    night: {
      "sky-clear": "#070e20",
      "sky-overcast": "#0e1526",
      "sky-rain": "#09101f",
      "sky-storm": "#090b1c",
    },
  };
  const phaseMap = skyThemeByPhase[activePhase] || skyThemeByPhase.day;
  const topHex = phaseMap[activeSky] || "#1d63b8";

  // Sync root <html>, <body>, localStorage, and iOS <meta name="theme-color"> for zero-blur status bar match
  rootEl.style.backgroundColor = topHex;
  document.body.style.backgroundColor = topHex;
  try {
    localStorage.setItem(
      "zus_sky_theme",
      JSON.stringify({ sky: activeSky, phase: activePhase, hex: topHex })
    );
  } catch (_) {}

  const themeMeta =
    document.getElementById("theme-color-meta") ||
    document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    const prevHex = themeMeta.getAttribute("content");
    themeMeta.setAttribute("content", topHex);
    if (prevHex !== topHex && themeMeta.parentNode) {
      const freshMeta = themeMeta.cloneNode(true);
      freshMeta.setAttribute("content", topHex);
      themeMeta.parentNode.replaceChild(freshMeta, themeMeta);
    }
  }

  if (wasLoading) {
    document.body.classList.add("tiles-entering");
    setTimeout(() => {
      if (dopplerRadarMap.map) dopplerRadarMap.map.invalidateSize({ pan: false, animate: false });
      if (state.weather?.minuteRates) {
        renderNextHourNowcast(
          state.weather.minuteRates,
          state.weather.hourly?.[0],
          state.weather.minuteRatesMin,
          state.weather.minuteRatesMax
        );
      }
    }, 80);
    setTimeout(() => {
      if (dopplerRadarMap.map) dopplerRadarMap.map.invalidateSize({ pan: false, animate: false });
    }, 380);
    setTimeout(() => {
      document.body.classList.remove("tiles-entering");
    }, 1050);
  }
}

/* Render Full Dark Sky + Liquid Glass Dashboard */
function renderDashboard() {
  const w = state.weather;
  if (!w) return;

  const cond = w.condition || conditionFromWMO(w.wmoCode);

  // Hero Card
  document.getElementById(
    "confidence-badge-text"
  ).textContent = `${w.confidencePct}% Model Agreement`;
  document.getElementById("hero-icon-container").innerHTML = getWeatherSVG(
    cond.icon,
    Boolean(w.isNight)
  );
  document.getElementById("hero-temp").textContent = formatTemp(w.temperature);
  document.getElementById("hero-condition").textContent = cond.label;
  document.getElementById("hero-feels-like").textContent = `Feels like ${formatTemp(
    w.feelsLike
  )}`;
  document.getElementById("hero-high-low").innerHTML = `High ${formatTemp(
    w.tempMax
  )} &bull; Low ${formatTemp(w.tempMin)}`;

  // Hero 4-Column Micro Strip (Wind, AQI, Humidex, UV Index)
  const microWindLabelEl = document.getElementById("micro-wind-label");
  if (microWindLabelEl) {
    const windUnitLabel = state.useImperial ? "MPH" : "KM/H";
    microWindLabelEl.innerHTML = `Wind <span class="micro-header-unit">&middot; ${windUnitLabel}</span>`;
  }
  const microWindEl = document.getElementById("micro-wind");
  if (microWindEl) {
    const windVal =
      w.windSpeed === null || w.windSpeed === undefined || Number.isNaN(w.windSpeed)
        ? "--"
        : state.useImperial
        ? String(Math.round(w.windSpeed * 0.621371))
        : String(Math.round(w.windSpeed));
    microWindEl.textContent = windVal;
  }
  const microWindBadgeEl = document.getElementById("micro-wind-badge");
  if (microWindBadgeEl) {
    microWindBadgeEl.textContent = compassDirection(w.windDirection);
    microWindBadgeEl.className = "detail-status-pill micro-status-pill pill-sky";
  }

  const aqi = Math.round(w.usAqi ?? 28);
  const microAqiEl = document.getElementById("micro-aqi");
  if (microAqiEl) {
    microAqiEl.textContent = String(aqi);
  }
  const microAqiBadgeEl = document.getElementById("micro-aqi-badge");
  if (microAqiBadgeEl) {
    microAqiBadgeEl.textContent =
      aqi <= 50
        ? "Good"
        : aqi <= 100
        ? "Mod"
        : aqi <= 150
        ? "Sens"
        : aqi <= 200
        ? "Poor"
        : "Haz";
    microAqiBadgeEl.className = `detail-status-pill micro-status-pill ${
      aqi <= 50 ? "pill-emerald" : aqi <= 100 ? "pill-amber" : "pill-rose"
    }`;
  }

  const { humidex } = calculateHumidex(w.temperature, w.dewPoint, w.humidity);
  const humidexRounded = Math.round(humidex);
  const hTier = humidexComfortTier(humidexRounded);
  const microHumidexEl = document.getElementById("micro-humidex");
  if (microHumidexEl) {
    microHumidexEl.textContent = String(humidexRounded);
  }
  const microHumidexBadgeEl = document.getElementById("micro-humidex-badge");
  if (microHumidexBadgeEl) {
    microHumidexBadgeEl.textContent = hTier.shortLabel;
    microHumidexBadgeEl.title = `${hTier.label} (Humidex ${humidexRounded})`;
    microHumidexBadgeEl.className = `detail-status-pill micro-status-pill ${hTier.pillClass}`;
  }

  const uvVal = Math.round((w.uvIndex ?? 0) * 10) / 10;
  const uvCat =
    uvVal < 3 ? "Low" : uvVal < 6 ? "Mod" : uvVal < 8 ? "High" : uvVal < 11 ? "V.High" : "Ext";
  const microUvEl = document.getElementById("micro-uv");
  if (microUvEl) {
    microUvEl.textContent = String(uvVal);
  }
  const microUvBadgeEl = document.getElementById("micro-uv-badge");
  if (microUvBadgeEl) {
    microUvBadgeEl.textContent = uvCat;
    microUvBadgeEl.className = `detail-status-pill micro-status-pill ${
      uvVal < 3 ? "pill-amber" : uvVal < 6 ? "pill-orange" : "pill-rose"
    }`;
  }

  // Next-Hour Minute-by-Minute Nowcast
  renderNextHourNowcast(w.minuteRates, w.hourly[0]);

  // 24-Hour & 10-Day Hourly Timeline
  renderHourlyTimeline(w.hourly);

  // Expandable 10-Day Forecast
  renderDailyForecast(w.daily);

  // 6 Atmospheric Telemetry Cards
  document.getElementById("detail-aqi").textContent = String(aqi);
  document.getElementById("aqi-dot").style.left = `${Math.min(
    100,
    Math.max(4, (aqi / 200) * 100)
  )}%`;
  const ozoneStr =
    w.ozone !== null && w.ozone !== undefined && w.ozone > 0
      ? ` · Ozone ${Math.round(w.ozone)} DU`
      : "";
  document.getElementById("detail-aqi-desc").textContent = `${aqiCategoryLabel(
    aqi
  )} (PM2.5: ${Number(w.pm25 || 0).toFixed(1)} µg/m³${ozoneStr})`;
  const aqiBadgeEl = document.getElementById("detail-aqi-badge");
  if (aqiBadgeEl) {
    aqiBadgeEl.textContent =
      aqi <= 50
        ? "Good"
        : aqi <= 100
        ? "Moderate"
        : aqi <= 150
        ? "Sensitive"
        : aqi <= 200
        ? "Unhealthy"
        : "Hazardous";
    aqiBadgeEl.className = `detail-status-pill ${
      aqi <= 50 ? "pill-emerald" : aqi <= 100 ? "pill-amber" : "pill-rose"
    }`;
  }

  const uv = Math.round(w.uvIndex * 10) / 10;
  document.getElementById("detail-uv").textContent = String(uv);
  document.getElementById("uv-dot").style.left = `${Math.min(100, (uv / 11) * 100)}%`;
  document.getElementById("detail-uv-advice").textContent = uvAdvice(uv);
  const uvBadgeEl = document.getElementById("detail-uv-badge");
  if (uvBadgeEl) {
    uvBadgeEl.textContent =
      uv < 3
        ? "Low"
        : uv < 6
        ? "Moderate"
        : uv < 8
        ? "High"
        : uv < 11
        ? "Very High"
        : "Extreme";
    uvBadgeEl.className = `detail-status-pill ${
      uv < 3 ? "pill-amber" : uv < 6 ? "pill-orange" : "pill-rose"
    }`;
  }

  document.getElementById("detail-wind").textContent = formatWind(w.windSpeed);
  const windDotEl = document.getElementById("wind-dot");
  if (windDotEl) {
    windDotEl.style.left = `${Math.min(100, Math.max(4, (w.windSpeed / 65) * 100))}%`;
  }
  document.getElementById("detail-wind-dir").textContent = `Gusts to ${formatWind(
    w.windGusts
  )}`;
  const windBadgeEl = document.getElementById("detail-wind-badge");
  if (windBadgeEl) {
    windBadgeEl.textContent = compassDirection(w.windDirection);
  }

  document.getElementById("detail-humidity").textContent = `${Math.round(w.humidity)}%`;
  const humDotEl = document.getElementById("humidity-dot");
  if (humDotEl) {
    humDotEl.style.left = `${Math.min(100, Math.max(4, w.humidity))}%`;
  }
  document.getElementById("detail-dewpoint").textContent = `Dew point ${formatTemp(
    w.dewPoint
  )}`;
  const humBadgeEl = document.getElementById("detail-humidity-badge");
  if (humBadgeEl) {
    humBadgeEl.textContent = muggyDescription(w.dewPoint);
  }

  const visVal = state.useImperial
    ? `${(w.visibilityKm * 0.621371).toFixed(1)} mi`
    : `${w.visibilityKm.toFixed(1)} km`;
  document.getElementById("detail-visibility").textContent = visVal;
  const visDotEl = document.getElementById("vis-dot");
  if (visDotEl) {
    visDotEl.style.left = `${Math.min(100, Math.max(4, (w.visibilityKm / 16) * 100))}%`;
  }
  document.getElementById("detail-clouds").textContent = `${Math.round(
    w.cloudCover
  )}% cloud cover`;
  const visBadgeEl = document.getElementById("detail-visibility-badge");
  if (visBadgeEl) {
    visBadgeEl.textContent =
      w.visibilityKm >= 14
        ? "Clear"
        : w.visibilityKm >= 7
        ? "Moderate"
        : w.visibilityKm >= 3
        ? "Hazy"
        : "Low";
  }

  if (w.sunrise && w.sunset) {
    const parseClockParts = (iso) => {
      if (!iso || typeof iso !== "string") return null;
      const tIdx = iso.indexOf("T");
      const timePart = tIdx >= 0 ? iso.slice(tIdx + 1) : iso;
      const [hStr, mStr] = timePart.split(":");
      const h = Number(hStr);
      const m = Number((mStr || "00").slice(0, 2));
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const mPad = m < 10 ? `0${m}` : `${m}`;
      return { label: `${h12}:${mPad} ${ampm}`, frac: h + m / 60 };
    };
    const srParts = parseClockParts(w.sunrise);
    const ssParts = parseClockParts(w.sunset);
    const sr = srParts ? srParts.label : "--:--";
    const ss = ssParts ? ssParts.label : "--:--";
    document.getElementById("detail-sunrise").textContent = sr;
    document.getElementById("detail-sunset").textContent = `Sunset ${ss}`;
    const solarBadgeEl = document.getElementById("detail-solar-badge");
    if (solarBadgeEl) {
      const ssCompact = ss
        .replace(/\s*AM$/i, "A")
        .replace(/\s*PM$/i, "P");
      solarBadgeEl.textContent = `Set ${ssCompact}`;
    }

    const solarDotEl = document.getElementById("solar-dot");
    if (solarDotEl && srParts && ssParts) {
      let nowLocalFrac = w.localHourFrac ?? 12;
      if (typeof w.utcOffsetSeconds === "number" && !Number.isNaN(w.utcOffsetSeconds)) {
        const locDate = new Date(Date.now() + w.utcOffsetSeconds * 1000);
        nowLocalFrac =
          locDate.getUTCHours() + locDate.getUTCMinutes() / 60 + locDate.getUTCSeconds() / 3600;
      }
      const spanHrs = Math.max(0.25, ssParts.frac - srParts.frac);
      const pct = ((nowLocalFrac - srParts.frac) / spanHrs) * 100;
      solarDotEl.style.left = `${Math.min(96, Math.max(4, Number.isFinite(pct) ? pct : 50))}%`;
    }
  }

  // Multi-Model Ensemble Strip
  renderEnsembleComparison(w.ensembleModels, w.spreadC, w.confidencePct);

  document.getElementById("last-updated").textContent = `Updated ${new Date().toLocaleTimeString(
    [],
    { hour: "numeric", minute: "2-digit" }
  )}`;

  playTilesAppearCascade(cond.bodyClass, w.solarPhase);
}

/* Dark Sky Next-Hour Precipitation Curve & Headline */
function renderNextHourNowcast(
  minuteRates,
  currentHour,
  minuteRatesMin = state.weather?.minuteRatesMin,
  minuteRatesMax = state.weather?.minuteRatesMax
) {
  const headlineEl = document.getElementById("nowcast-headline");
  const subEl = document.getElementById("nowcast-subheadline");
  const badgeEl = document.getElementById("nowcast-updated-label");
  const canvas = document.getElementById("nowcast-canvas");
  if (!canvas) return;

  const dopTel = dopplerRadarMap.telemetry;
  if (badgeEl) {
    badgeEl.textContent =
      dopTel && dopTel.inConusGrid
        ? `📡 1km Doppler (${dopTel.currentDbz.toFixed(0)} dBZ)`
        : "Down to the Minute";
  }

  const threshold = 0.08; // mm/hr perceptible rain threshold
  const maxRate = Math.max(...minuteRates);
  const firstWetIdx = minuteRates.findIndex((r) => r >= threshold);
  const currentlyWet = minuteRates[0] >= threshold;
  const nowcastCard = canvas.closest(".nowcast-card");
  const heroNowcastGrid = canvas.closest(".hero-nowcast-grid");
  const chartBox = canvas.closest(".nowcast-chart-box");

  if (maxRate < threshold) {
    const nextPrecipProb = currentHour?.precipProb ?? 0;
    headlineEl.textContent = "No precipitation in next hour.";
    if (nowcastCard) nowcastCard.classList.add("is-dry");
    if (heroNowcastGrid) heroNowcastGrid.classList.add("is-dry");
    if (chartBox) chartBox.setAttribute("hidden", "");
    if (subEl) {
      if (
        dopTel &&
        dopTel.inConusGrid &&
        dopTel.nearestEchoKm !== null &&
        dopTel.nearestEchoKm !== undefined &&
        dopTel.nearestEchoKm > 0
      ) {
        const distStr = state.useImperial
          ? `${(dopTel.nearestEchoKm * 0.621371).toFixed(1)} mi`
          : `${dopTel.nearestEchoKm.toFixed(1)} km`;
        subEl.textContent = `Nearest 1km Doppler echo ${distStr} ${
          dopTel.nearestEchoCompass || ""
        } (35km peak ${dopTel.maxDbzNearby.toFixed(0)} dBZ, tracking ${
          dopTel.stormMotionCompass
        } at ${formatWind(dopTel.stormMotionKmh)}).`;
      } else {
        subEl.textContent =
          nextPrecipProb > 25
            ? `${nextPrecipProb}% chance of scattered moisture in the broader vicinity.`
            : "No radar echoes detected within the 60-minute hyperlocal window.";
      }
    }
    return;
  }

  if (nowcastCard) nowcastCard.classList.remove("is-dry");
  if (heroNowcastGrid) heroNowcastGrid.classList.remove("is-dry");
  if (chartBox) chartBox.removeAttribute("hidden");

  const pType = state.weather?.precipType || currentHour?.precipType || "rain";
  const pNoun = pType === "snow" ? "snow" : pType === "sleet" ? "sleet" : "rain";
  const pNounCap = pNoun.charAt(0).toUpperCase() + pNoun.slice(1);

  if (currentlyWet) {
    const stopIdx = minuteRates.findIndex((r, idx) => idx > 0 && r < threshold);
    const intensityLabel =
      maxRate >= 6.0 ? `Heavy ${pNoun}` : maxRate >= 2.0 ? `Moderate ${pNoun}` : `Light ${pNoun}`;
    if (stopIdx > 0) {
      headlineEl.textContent = `${intensityLabel} stopping in ${stopIdx} min.`;
    } else {
      headlineEl.textContent = `${intensityLabel} continuing for the hour.`;
    }
    if (subEl) {
      const dbzNote =
        dopTel && dopTel.inConusGrid ? ` (${dopTel.currentDbz.toFixed(0)} dBZ overhead)` : "";
      subEl.textContent = `Peak intensity ${maxRate.toFixed(
        1
      )} mm/hr${dbzNote} during the next 60 minutes.`;
    }
  } else {
    const intensityLabel =
      maxRate >= 6.0 ? `Heavy ${pNoun}` : maxRate >= 2.0 ? pNounCap : `Light ${pNoun}`;
    const stopAfterStartIdx = minuteRates.findIndex(
      (r, idx) => idx > firstWetIdx + 3 && r < threshold
    );
    if (stopAfterStartIdx > 0) {
      headlineEl.textContent = `${intensityLabel} starting in ${firstWetIdx} min, stopping ${
        stopAfterStartIdx - firstWetIdx
      } min later.`;
    } else {
      headlineEl.textContent = `${intensityLabel} starting in ${firstWetIdx} min.`;
    }
    if (subEl) {
      subEl.textContent =
        dopTel && dopTel.inConusGrid
          ? `1km Doppler trajectory (${dopTel.stormMotionCompass} at ${formatWind(
              dopTel.stormMotionKmh
            )}) indicates approaching ${pNoun}.`
          : `60-minute radar trajectory indicates approaching ${pNoun}.`;
    }
  }

  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const boxEl = canvas.parentElement;
  const cssW = Math.max(220, Math.min(1200, canvas.clientWidth || 560));
  const rawBoxInnerH = boxEl ? boxEl.clientHeight - 28 : 0;
  const cssH = Math.max(
    36,
    Math.min(120, rawBoxInnerH > 20 ? rawBoxInnerH : window.innerWidth <= 640 ? 46 : 94)
  );
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const W = cssW;
  const H = cssH;
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

  // Plot smooth curve & multi-model min/max estimation band (scale 0..9 mm/hr)
  const scaleMax = 9.0;
  const isCompactH = H <= 58;
  const yBottom = H - (isCompactH ? 3 : 5);
  const yTop = isCompactH ? 5 : 10;
  const ySpan = Math.max(16, yBottom - yTop);
  const rateToY = (r) => {
    const norm = Math.min(1, Math.max(0, Number(r || 0)) / scaleMax);
    return yBottom - norm * ySpan;
  };

  const points = [];
  const upperPoints = [];
  const lowerPoints = [];

  for (let i = 0; i < minuteRates.length; i++) {
    const x = (i / Math.max(1, minuteRates.length - 1)) * W;
    const rMain = Number(minuteRates[i] ?? 0);
    const rMin =
      Array.isArray(minuteRatesMin) && minuteRatesMin[i] !== undefined
        ? Number(minuteRatesMin[i])
        : Math.max(0, rMain * 0.7);
    const rMax =
      Array.isArray(minuteRatesMax) && minuteRatesMax[i] !== undefined
        ? Number(minuteRatesMax[i])
        : Math.max(rMain * 1.3 + 0.35, 0.5);

    const yMain = rateToY(rMain);
    let yUp = rateToY(Math.max(rMain, rMax));
    let yLow = rateToY(Math.min(rMain, rMin));

    // Guarantee a legible light-gray estimation envelope around the curve
    if (yLow - yUp < 9) {
      yUp = Math.max(yTop - 2, Math.min(yUp, yMain - 6));
      yLow = Math.min(H - 1, Math.max(yLow, yMain + 3.5));
    }

    points.push({ x, y: yMain });
    upperPoints.push({ x, y: yUp });
    lowerPoints.push({ x, y: yLow });
  }

  // 1) Light gray multi-model min/max estimation band fill & dashed envelope edges
  if (upperPoints.length > 1) {
    const bandGrad = ctx.createLinearGradient(0, yTop, 0, H);
    bandGrad.addColorStop(0, "rgba(226, 232, 240, 0.28)");
    bandGrad.addColorStop(1, "rgba(148, 163, 184, 0.18)");

    ctx.beginPath();
    upperPoints.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    for (let idx = lowerPoints.length - 1; idx >= 0; idx--) {
      ctx.lineTo(lowerPoints[idx].x, lowerPoints[idx].y);
    }
    ctx.closePath();
    ctx.fillStyle = bandGrad;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = "rgba(203, 213, 225, 0.52)";
    ctx.lineWidth = 1.15;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    upperPoints.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    ctx.beginPath();
    lowerPoints.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // 2) Primary precipitation area fill & curve
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "rgba(56, 189, 248, 0.68)");
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
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  if (!canvas._nowcastResizeBound && typeof ResizeObserver !== "undefined") {
    canvas._nowcastResizeBound = true;
    let lastObservedW = Math.round(cssW);
    const ro = new ResizeObserver((entries) => {
      const wNow = Math.round(entries[0]?.contentRect?.width || canvas.clientWidth || 0);
      if (Math.abs(wNow - lastObservedW) < 2) return;
      lastObservedW = wNow;
      if (state.weather?.minuteRates) {
        renderNextHourNowcast(
          state.weather.minuteRates,
          state.weather.hourly?.[0],
          state.weather.minuteRatesMin,
          state.weather.minuteRatesMax
        );
      }
    });
    ro.observe(canvas.parentElement || canvas);
  }
}

const HOURLY_METRIC_PILLS = [
  { mode: "temp", label: "Temp" },
  { mode: "feels", label: "Feels Like" },
  { mode: "precip", label: "Precip Chance" },
  { mode: "precipAmount", label: "Precip Amount" },
  { mode: "wind", label: "Wind Speed" },
  { mode: "gusts", label: "Wind Gusts" },
  { mode: "uv", label: "UV Index" },
  { mode: "dew", label: "Dew Point" },
  { mode: "clouds", label: "Cloud Cover" },
  { mode: "visibility", label: "Visibility" },
  { mode: "pressure", label: "Pressure" },
];

/* 24-Hour Connected Curve + Multi-Model Envelope Chart (11 Selectable Metrics) */
function getHourlyMetricDescriptor(mode) {
  const imp = state.useImperial;
  const fmtTempSpread = (s) => {
    const half = (imp ? s * 1.8 : s) / 2;
    return half >= 1.5
      ? `±${Math.round(half)}°`
      : `±${Math.max(0.1, half).toFixed(1)}°`;
  };
  switch (mode) {
    case "feels":
      return {
        label: "Feels Like",
        lineColor: "#2dd4bf",
        bandFill: "rgba(45, 212, 191, 0.22)",
        bandStroke: "rgba(45, 212, 191, 0.45)",
        extract: (h) => ({ val: h.feelsLike, min: h.feelsMin, max: h.feelsMax }),
        formatNode: (v) => String(Math.round(imp ? (v * 9) / 5 + 32 : v)),
        formatFull: (v) => formatTemp(v, true),
        formatSpread: fmtTempSpread,
      };
    case "precip":
      return {
        label: "Precip Chance",
        lineColor: "#38bdf8",
        bandFill: "rgba(56, 189, 248, 0.24)",
        bandStroke: "rgba(56, 189, 248, 0.48)",
        extract: (h) => ({ val: h.precipProb, min: h.precipProbMin, max: h.precipProbMax }),
        formatNode: (v) => `${Math.round(v)}%`,
        formatFull: (v) => `${Math.round(v)}%`,
        formatSpread: (s) => `±${Math.max(1, Math.round(s / 2))}%`,
      };
    case "precipAmount":
      return {
        label: "Precip Amount",
        lineColor: "#60a5fa",
        bandFill: "rgba(96, 165, 250, 0.24)",
        bandStroke: "rgba(96, 165, 250, 0.48)",
        extract: (h) => ({ val: h.precipMm, min: h.precipMmMin, max: h.precipMmMax }),
        formatNode: (v) =>
          imp ? `${(v / 25.4).toFixed(2)}"` : `${v.toFixed(1)}mm`,
        formatFull: (v) => formatPrecipAmount(v),
        formatSpread: (s) =>
          imp
            ? `±${Math.max(0.01, s / 25.4 / 2).toFixed(2)}"`
            : `±${Math.max(0.1, s / 2).toFixed(1)}mm`,
      };
    case "wind":
      return {
        label: "Wind Speed",
        lineColor: "#34d399",
        bandFill: "rgba(52, 211, 153, 0.22)",
        bandStroke: "rgba(52, 211, 153, 0.45)",
        extract: (h) => ({ val: h.windSpeed, min: h.windMin, max: h.windMax }),
        formatNode: (v) => String(Math.round(imp ? v * 0.621371 : v)),
        formatFull: (v) => formatWind(v),
        formatSpread: (s) => {
          const half = (imp ? s * 0.621371 : s) / 2;
          return half >= 1.5
            ? `±${Math.round(half)}`
            : `±${Math.max(0.1, half).toFixed(1)}`;
        },
      };
    case "gusts":
      return {
        label: "Wind Gusts",
        lineColor: "#f59e0b",
        bandFill: "rgba(245, 158, 11, 0.22)",
        bandStroke: "rgba(245, 158, 11, 0.45)",
        extract: (h) => ({ val: h.windGusts, min: h.gustMin, max: h.gustMax }),
        formatNode: (v) => String(Math.round(imp ? v * 0.621371 : v)),
        formatFull: (v) => formatWind(v),
        formatSpread: (s) => {
          const half = (imp ? s * 0.621371 : s) / 2;
          return half >= 1.5
            ? `±${Math.round(half)}`
            : `±${Math.max(0.1, half).toFixed(1)}`;
        },
      };
    case "uv":
      return {
        label: "UV Index",
        lineColor: "#fbbf24",
        bandFill: "rgba(251, 191, 36, 0.22)",
        bandStroke: "rgba(251, 191, 36, 0.45)",
        extract: (h) => ({ val: h.uvIndex, min: h.uvMin, max: h.uvMax }),
        formatNode: (v) => (v < 1 ? v.toFixed(1) : String(Math.round(v))),
        formatFull: (v) => `${v.toFixed(1)} UV`,
        formatSpread: (s) => `±${Math.max(0.1, s / 2).toFixed(1)}`,
      };
    case "dew":
      return {
        label: "Dew Point",
        lineColor: "#2dd4bf",
        bandFill: "rgba(45, 212, 191, 0.22)",
        bandStroke: "rgba(45, 212, 191, 0.45)",
        extract: (h) => ({ val: h.dewPoint, min: h.dewMin, max: h.dewMax }),
        formatNode: (v) => String(Math.round(imp ? (v * 9) / 5 + 32 : v)),
        formatFull: (v) => formatTemp(v, true),
        formatSpread: fmtTempSpread,
      };
    case "clouds":
      return {
        label: "Cloud Cover",
        lineColor: "#94a3b8",
        bandFill: "rgba(148, 163, 184, 0.24)",
        bandStroke: "rgba(148, 163, 184, 0.48)",
        extract: (h) => ({ val: h.cloudCover, min: h.cloudMin, max: h.cloudMax }),
        formatNode: (v) => `${Math.round(v)}%`,
        formatFull: (v) => `${Math.round(v)}%`,
        formatSpread: (s) => `±${Math.max(1, Math.round(s / 2))}%`,
      };
    case "visibility":
      return {
        label: "Visibility",
        lineColor: "#a78bfa",
        bandFill: "rgba(167, 139, 250, 0.22)",
        bandStroke: "rgba(167, 139, 250, 0.45)",
        extract: (h) => ({ val: h.visibilityKm, min: h.visMin, max: h.visMax }),
        formatNode: (v) =>
          imp ? `${(v * 0.621371).toFixed(1)}mi` : `${v.toFixed(1)}km`,
        formatFull: (v) =>
          imp ? `${(v * 0.621371).toFixed(1)} mi` : `${v.toFixed(1)} km`,
        formatSpread: (s) =>
          imp
            ? `±${Math.max(0.1, (s * 0.621371) / 2).toFixed(1)}mi`
            : `±${Math.max(0.1, s / 2).toFixed(1)}km`,
      };
    case "pressure":
      return {
        label: "Pressure",
        lineColor: "#818cf8",
        bandFill: "rgba(129, 140, 248, 0.22)",
        bandStroke: "rgba(129, 140, 248, 0.45)",
        extract: (h) => ({ val: h.pressure, min: h.pressMin, max: h.pressMax }),
        formatNode: (v) =>
          imp ? (v * 0.02953).toFixed(2) : String(Math.round(v)),
        formatFull: (v) => formatPressure(v),
        formatSpread: (s) =>
          imp
            ? `±${Math.max(0.01, (s * 0.02953) / 2).toFixed(2)}`
            : `±${Math.max(1, Math.round(s / 2))}`,
      };
    case "temp":
    default:
      return {
        label: "Temp",
        lineColor: "#2dd4bf",
        bandFill: "rgba(45, 212, 191, 0.22)",
        bandStroke: "rgba(45, 212, 191, 0.45)",
        extract: (h) => ({ val: h.temperature, min: h.tempMin, max: h.tempMax }),
        formatNode: (v) => String(Math.round(imp ? (v * 9) / 5 + 32 : v)),
        formatFull: (v) => formatTemp(v, true),
        formatSpread: fmtTempSpread,
      };
  }
}

function buildSmoothCurvePath(pts) {
  if (!pts.length) return "";
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

function buildEnvelopeBandPath(upperPts, lowerPts) {
  if (!upperPts.length || upperPts.length !== lowerPts.length) return "";
  let d = buildSmoothCurvePath(upperPts);
  const revLower = [...lowerPts].reverse();
  d += ` L ${revLower[0].x.toFixed(1)} ${revLower[0].y.toFixed(1)}`;
  for (let i = 0; i < revLower.length - 1; i++) {
    const p0 = revLower[i];
    const p1 = revLower[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  d += " Z";
  return d;
}

/* Certified Liquid Glass Pill State Sync (Direct Button Styling — Zero Detached Glider Artifacts) */
function syncLiquidPillGlider(pillBarEl) {
  if (!pillBarEl) return;
  pillBarEl.classList.remove("has-glider");
  const legacyGlider = pillBarEl.querySelector(".liquid-pill-glider");
  if (legacyGlider) legacyGlider.remove();
}

function attachHourlyTouchScrubber(colsLayer) {
  if (!colsLayer || colsLayer._scrubBound) return;
  colsLayer._scrubBound = true;

  const activateColAtClientX = (clientX) => {
    const rect = colsLayer.getBoundingClientRect();
    const relX = clientX - rect.left;
    const cols = colsLayer.children;
    if (!cols.length) return;
    const colW = rect.width / cols.length;
    const idx = Math.max(0, Math.min(cols.length - 1, Math.floor(relX / colW)));
    const target = cols[idx];
    if (target && !target.classList.contains("active")) {
      Array.from(cols).forEach((c) => c.classList.remove("active"));
      target.classList.add("active");
    }
  };

  let isPointerScrubbing = false;
  let downX = 0;
  let downY = 0;

  colsLayer.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    isPointerScrubbing = true;
    downX = e.clientX;
    downY = e.clientY;
    colsLayer._didDrag = false;
    activateColAtClientX(e.clientX);
  });

  colsLayer.addEventListener("pointermove", (e) => {
    if (!isPointerScrubbing) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) {
      colsLayer._didDrag = true;
      activateColAtClientX(e.clientX);
    }
  });

  const endScrub = () => {
    isPointerScrubbing = false;
  };
  window.addEventListener("pointerup", endScrub, { passive: true });
  window.addEventListener("pointercancel", endScrub, { passive: true });
}

function renderHourlyCurveIntoContainer(
  scrollEl,
  hourly,
  mode,
  options = {}
) {
  if (!scrollEl) return;
  if (!hourly || !hourly.length) {
    scrollEl.innerHTML = "";
    return;
  }

  scrollEl._hourlyData = hourly;
  scrollEl._hourlyMode = mode;
  scrollEl._hourlyOptions = options;

  const {
    showNowOnFirst = true,
    showDayDividers = false,
    colW = 74,
    H = 196,
  } = options;

  const desc = getHourlyMetricDescriptor(mode);
  const series = hourly.map((item) => desc.extract(item));

  const allMin = Math.min(...series.map((s) => s.min));
  const allMax = Math.max(...series.map((s) => s.max));
  const rawSpan = Math.max(0.0001, allMax - allMin);

  const W = hourly.length * colW;
  const isCompactStage = H <= 152;
  const yTop = Math.round(H * (isCompactStage ? 0.48 : 0.44));
  const yBottom = Math.round(H * (isCompactStage ? 0.80 : 0.78));
  const ySpan = yBottom - yTop;

  const valueToY = (v) => {
    if (allMax - allMin < 1e-3) return (yTop + yBottom) / 2;
    const norm = (v - allMin) / rawSpan;
    return yBottom - norm * ySpan;
  };

  const mainPts = [];
  const upperPts = [];
  const lowerPts = [];

  series.forEach((s, i) => {
    const x = i * colW + colW / 2;
    const yMain = valueToY(s.val);
    let yUp = valueToY(s.max);
    let yLow = valueToY(s.min);
    if (Math.abs(yLow - yUp) < 8) {
      yUp = Math.max(yTop - 6, yMain - 4.5);
      yLow = Math.min(yBottom + 6, yMain + 4.5);
    }
    mainPts.push({ x, y: yMain });
    upperPts.push({ x, y: yUp });
    lowerPts.push({ x, y: yLow });
  });

  // Check if we can smoothly morph an existing curve stage in-place (LG3 Certified Morphing)
  const existingStage = scrollEl.querySelector(".hourly-curve-stage");
  const prevState = scrollEl._curveState;
  const firstKey = hourly[0]?.time ? hourly[0].time.getTime() : 0;

  if (
    existingStage &&
    prevState &&
    prevState.len === hourly.length &&
    prevState.colW === colW &&
    prevState.H === H &&
    prevState.firstKey === firstKey
  ) {
    const svgPaths = existingStage.querySelectorAll(".hourly-curve-svg path");
    const cols = existingStage.querySelectorAll(".hourly-col");

    if (svgPaths.length === 4 && cols.length === hourly.length) {
      const [bandPathEl, upperPathEl, lowerPathEl, mainPathEl] = svgPaths;
      bandPathEl.setAttribute("fill", desc.bandFill);
      upperPathEl.setAttribute("stroke", desc.bandStroke);
      lowerPathEl.setAttribute("stroke", desc.bandStroke);
      mainPathEl.setAttribute("stroke", desc.lineColor);

      // Update node positions (animated via CSS spring transition), icons, and labels
      hourly.forEach((item, idx) => {
        const col = cols[idx];
        const s = series[idx];
        const pt = mainPts[idx];
        const cond = item.condition || conditionFromWMO(item.wmoCode);
        const node = col.querySelector(".hourly-point-node");
        const iconEl = col.querySelector(".hourly-node-icon");
        const valEl = col.querySelector(".hourly-node-val");
        const spreadEl = col.querySelector(".hourly-node-spread");
        const popEl = col.querySelector(".hourly-node-pop");

        if (node) node.style.top = `${pt.y.toFixed(1)}px`;
        if (iconEl) {
          iconEl.innerHTML = getWeatherSVG(cond.icon, Boolean(item.isNight));
        }
        if (valEl) valEl.textContent = desc.formatNode(s.val);
        if (spreadEl) {
          spreadEl.textContent = desc.formatSpread(Math.max(0, s.max - s.min));
        }

        const shouldShowPop = mode !== "precip" && item.precipProb >= 20;
        if (shouldShowPop) {
          if (popEl) {
            popEl.textContent = `${Math.round(item.precipProb)}%`;
          } else if (node) {
            const newPop = document.createElement("div");
            newPop.className = "hourly-node-pop";
            newPop.textContent = `${Math.round(item.precipProb)}%`;
            node.prepend(newPop);
          }
        } else if (popEl) {
          popEl.remove();
        }
      });

      // Animate SVG path morphing with spring easing
      if (scrollEl._morphRaf) cancelAnimationFrame(scrollEl._morphRaf);
      const fromMain = prevState.mainPts;
      const fromUpper = prevState.upperPts;
      const fromLower = prevState.lowerPts;
      const startTime = performance.now();
      const duration = 360;

      const stepMorph = (now) => {
        const rawT = Math.min(1, (now - startTime) / duration);
        // Elastic-out smooth easing
        const ease = 1 - Math.pow(1 - rawT, 3.2);

        const curMain = mainPts.map((pt, i) => ({
          x: pt.x,
          y: fromMain[i].y + (pt.y - fromMain[i].y) * ease,
        }));
        const curUpper = upperPts.map((pt, i) => ({
          x: pt.x,
          y: fromUpper[i].y + (pt.y - fromUpper[i].y) * ease,
        }));
        const curLower = lowerPts.map((pt, i) => ({
          x: pt.x,
          y: fromLower[i].y + (pt.y - fromLower[i].y) * ease,
        }));

        bandPathEl.setAttribute("d", buildEnvelopeBandPath(curUpper, curLower));
        upperPathEl.setAttribute("d", buildSmoothCurvePath(curUpper));
        lowerPathEl.setAttribute("d", buildSmoothCurvePath(curLower));
        mainPathEl.setAttribute("d", buildSmoothCurvePath(curMain));

        scrollEl._curveState = {
          len: hourly.length,
          colW,
          H,
          firstKey,
          mainPts: curMain,
          upperPts: curUpper,
          lowerPts: curLower,
        };

        if (rawT < 1) {
          scrollEl._morphRaf = requestAnimationFrame(stepMorph);
        }
      };

      scrollEl._morphRaf = requestAnimationFrame(stepMorph);
      return;
    }
  }

  // Initial full build of stage
  scrollEl.innerHTML = "";

  const stage = document.createElement("div");
  stage.className = "hourly-curve-stage";
  stage.style.width = `${W}px`;
  stage.style.minWidth = `${W}px`;
  stage.style.height = `${H}px`;

  const mainPathD = buildSmoothCurvePath(mainPts);
  const upperPathD = buildSmoothCurvePath(upperPts);
  const lowerPathD = buildSmoothCurvePath(lowerPts);
  const bandPathD = buildEnvelopeBandPath(upperPts, lowerPts);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "hourly-curve-svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");

  svg.innerHTML = `
    <path d="${bandPathD}" fill="${desc.bandFill}" stroke="none" />
    <path d="${upperPathD}" fill="none" stroke="${desc.bandStroke}" stroke-width="1.2" stroke-dasharray="3 3" />
    <path d="${lowerPathD}" fill="none" stroke="${desc.bandStroke}" stroke-width="1.2" stroke-dasharray="3 3" />
    <path d="${mainPathD}" fill="none" stroke="${desc.lineColor}" stroke-width="${colW <= 46 ? 2.5 : colW <= 58 ? 3.2 : 4}" stroke-linecap="round" stroke-linejoin="round" />
  `;
  stage.appendChild(svg);

  const colsLayer = document.createElement("div");
  colsLayer.className = "hourly-columns-layer";

  hourly.forEach((item, idx) => {
    const cond = item.condition || conditionFromWMO(item.wmoCode);
    const s = series[idx];
    const pt = mainPts[idx];

    const isMidnight = idx > 0 && item.time.getHours() === 0;
    const isNow = showNowOnFirst && idx === 0;

    const col = document.createElement("div");
    col.className = `hourly-col ${isNow ? "now" : ""} ${
      showDayDividers && isMidnight ? "day-start" : ""
    }`;
    col.style.flex = `0 0 ${colW}px`;
    col.style.width = `${colW}px`;

    let rawTime = "";
    if (isNow) {
      rawTime = "NOW";
    } else if (showDayDividers && isMidnight) {
      const dayShort = item.time
        .toLocaleDateString([], { weekday: "short" })
        .toUpperCase();
      rawTime =
        colW <= 46
          ? `<span class="day-divider-pill">${dayShort}</span>`
          : `<span class="day-divider-pill">${dayShort}</span> 12AM`;
    } else {
      rawTime = item.time
        .toLocaleTimeString([], { hour: "numeric", hour12: true })
        .replace(/\s+/g, "")
        .toUpperCase();
    }

    const showPopBadge =
      mode !== "precip" && item.precipProb >= 20
        ? `<div class="hourly-node-pop">${Math.round(item.precipProb)}%</div>`
        : "";

    const hoverSpread = Math.max(0, s.max - s.min);

    col.setAttribute("role", "button");
    col.setAttribute("tabindex", "0");

    col.innerHTML = `
      <div class="hourly-col-time">${rawTime}</div>
      <div class="hourly-point-node" style="top: ${pt.y.toFixed(1)}px">
        ${showPopBadge}
        <div class="hourly-node-icon">${getWeatherSVG(cond.icon, Boolean(item.isNight))}</div>
        <div class="hourly-node-val">${desc.formatNode(s.val)}</div>
        <div class="hourly-node-spread">${desc.formatSpread(hoverSpread)}</div>
      </div>
    `;

    col.addEventListener("click", () => {
      if (colsLayer._didDrag) {
        colsLayer._didDrag = false;
        return;
      }
      colsLayer.querySelectorAll(".hourly-col").forEach((c) => c.classList.remove("active"));
      col.classList.add("active");
      openHourDetailModal(scrollEl, idx);
    });

    col.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        colsLayer.querySelectorAll(".hourly-col").forEach((c) => c.classList.remove("active"));
        col.classList.add("active");
        openHourDetailModal(scrollEl, idx);
      }
    });

    colsLayer.appendChild(col);
  });

  attachHourlyTouchScrubber(colsLayer);
  stage.appendChild(colsLayer);
  scrollEl.appendChild(stage);

  scrollEl._curveState = {
    len: hourly.length,
    colW,
    H,
    firstKey,
    mainPts,
    upperPts,
    lowerPts,
  };
}

function getMobileHourlyColWidth(scrollEl) {
  const containerW =
    (scrollEl && scrollEl.clientWidth) ||
    Math.max(296, window.innerWidth - 52);
  const innerW = Math.max(270, containerW - 12);
  // Fit 9 full hourly columns edge-to-edge across the mobile chart viewport with zero 10th-hour cutoff
  return Math.max(32, Math.min(48, Number((innerW / 9).toFixed(2))));
}

function getMobileHourlyStageHeight(scrollEl) {
  const containerH = scrollEl && scrollEl.clientHeight ? scrollEl.clientHeight - 14 : 124;
  return Math.max(114, Math.min(156, Math.round(containerH)));
}

function buildMetricMenuItemsHTML(activeMode) {
  return HOURLY_METRIC_PILLS.map((p) => {
    const desc = getHourlyMetricDescriptor(p.mode);
    const isActive = p.mode === activeMode;
    return `
      <button
        type="button"
        class="metric-option-btn${isActive ? " active" : ""}"
        role="option"
        aria-selected="${isActive}"
        data-mode="${p.mode}"
      >
        <span class="metric-option-left">
          <span class="metric-option-icon" style="color: ${desc.lineColor};">${getHourlyMetricIconSVG(p.mode)}</span>
          <span class="metric-option-label">${p.label}</span>
        </span>
        <span class="metric-option-check" aria-hidden="true">✓</span>
      </button>
    `;
  }).join("");
}

function syncDropdownParentElevation(dropdownEl, isOpen) {
  if (!dropdownEl) return;
  [".day-accordion", ".daily-card", ".timeline-card", ".mobile-first-screen"].forEach((sel) => {
    const ancestor = dropdownEl.closest(sel);
    if (ancestor) {
      ancestor.classList.toggle("has-open-dropdown", isOpen);
    }
  });
}

function closeAllMetricDropdowns(exceptDropdown = null) {
  document.querySelectorAll(".metric-selector-dropdown.open").forEach((dd) => {
    if (dd !== exceptDropdown) {
      dd.classList.remove("open");
      syncDropdownParentElevation(dd, false);
      const btn = dd.querySelector(".metric-selector-btn");
      const menu = dd.querySelector(".metric-selector-menu");
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (menu) menu.setAttribute("hidden", "");
    }
  });
}

function syncMetricDropdownUI(dropdownEl, activeMode) {
  if (!dropdownEl) return;
  const pill =
    HOURLY_METRIC_PILLS.find((p) => p.mode === activeMode) ||
    HOURLY_METRIC_PILLS[0];
  const desc = getHourlyMetricDescriptor(pill.mode);
  const iconEl = dropdownEl.querySelector(".metric-selector-icon");
  const labelEl = dropdownEl.querySelector(".metric-selector-label");
  if (iconEl) {
    iconEl.style.color = desc.lineColor;
    iconEl.innerHTML = getHourlyMetricIconSVG(pill.mode);
  }
  if (labelEl) {
    labelEl.textContent = pill.label;
  }
  dropdownEl.querySelectorAll(".metric-option-btn").forEach((opt) => {
    const isMatch = opt.dataset.mode === pill.mode;
    opt.classList.toggle("active", isMatch);
    opt.setAttribute("aria-selected", String(isMatch));
  });
}

function bindMetricDropdown(dropdownEl, initialMode, onSelect) {
  if (!dropdownEl) return;
  const btn = dropdownEl.querySelector(".metric-selector-btn");
  const menu = dropdownEl.querySelector(".metric-selector-menu");
  if (!btn || !menu) return;

  menu.innerHTML = buildMetricMenuItemsHTML(initialMode);
  syncMetricDropdownUI(dropdownEl, initialMode);

  if (!dropdownEl._metricDropdownBound) {
    dropdownEl._metricDropdownBound = true;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = !dropdownEl.classList.contains("open");
      closeAllMetricDropdowns(dropdownEl);
      dropdownEl.classList.toggle("open", willOpen);
      syncDropdownParentElevation(dropdownEl, willOpen);
      btn.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        menu.removeAttribute("hidden");
      } else {
        menu.setAttribute("hidden", "");
      }
    });

    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      const opt = e.target.closest(".metric-option-btn");
      if (!opt) return;
      const mode = opt.dataset.mode || "temp";
      syncMetricDropdownUI(dropdownEl, mode);
      closeAllMetricDropdowns();
      if (typeof onSelect === "function") {
        onSelect(mode);
      }
    });
  }
}

function renderHourlyTimeline(hourly) {
  const scroll = document.getElementById("hourly-scroll");
  if (!scroll || !hourly || !hourly.length) return;

  const prevScrollLeft = scroll.scrollLeft;
  const isMobile = window.innerWidth <= 640;
  const colW = isMobile ? getMobileHourlyColWidth(scroll) : 74;
  const H = isMobile ? getMobileHourlyStageHeight(scroll) : 196;

  renderHourlyCurveIntoContainer(scroll, hourly, state.hourlyMode, {
    showNowOnFirst: true,
    showDayDividers: true,
    colW,
    H,
    contextLabel: "24-Hour & 10-Day Timeline",
    onSelectMode: (newMode) => {
      state.hourlyMode = newMode;
      syncMetricDropdownUI(
        document.getElementById("hourly-metric-dropdown"),
        newMode
      );
      if (state.weather?.hourly) {
        renderHourlyTimeline(state.weather.hourly);
      }
    },
  });

  scroll.scrollLeft = prevScrollLeft;
  syncMetricDropdownUI(
    document.getElementById("hourly-metric-dropdown"),
    state.hourlyMode
  );

  if (!scroll._hourlyResizeBound && typeof ResizeObserver !== "undefined") {
    scroll._hourlyResizeBound = true;
    const ro = new ResizeObserver(() => {
      if (!state.weather?.hourly) return;
      const mobileNow = window.innerWidth <= 640;
      const nextColW = mobileNow ? getMobileHourlyColWidth(scroll) : 74;
      const nextH = mobileNow ? getMobileHourlyStageHeight(scroll) : 196;
      if (
        scroll._curveState &&
        (Math.abs(scroll._curveState.colW - nextColW) > 0.25 ||
          Math.abs(scroll._curveState.H - nextH) > 2)
      ) {
        renderHourlyTimeline(state.weather.hourly);
      }
    });
    ro.observe(scroll);
  }
}

/* Lock Radar Card height to the collapsed 10-Day Forecast card height so expanding a day never stretches the radar */
function syncRadarCardHeight() {
  const dailyCard = document.querySelector(".daily-card");
  const radarCard = document.getElementById("radar-map-card");
  if (!dailyCard || !radarCard) return;

  if (window.innerWidth <= 960) {
    radarCard.style.removeProperty("--radar-card-height");
    return;
  }

  // Only measure when all 10-day accordions are collapsed so the height stays locked to the base 10-row height
  const hasOpenDay = dailyCard.querySelector(".day-accordion.open");
  if (!hasOpenDay) {
    const h = Math.round(dailyCard.offsetHeight || dailyCard.getBoundingClientRect().height);
    if (h >= 380) {
      radarCard.style.setProperty("--radar-card-height", `${h}px`);
      if (dopplerRadarMap.map && !dopplerRadarMap.isModalOpen) {
        requestAnimationFrame(() =>
          dopplerRadarMap.map.invalidateSize({ pan: false, animate: false })
        );
      }
    }
  }
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
    const cond = dItem.condition || conditionFromWMO(dItem.wmoCode);
    const dayName =
      idx === 0
        ? "TODAY"
        : dItem.date.toLocaleDateString([], { weekday: "short" }).toUpperCase();
    const rawLeftPct = ((dItem.tempMin - globalMin) / totalSpan) * 100;
    const rawWidthPct = ((dItem.tempMax - dItem.tempMin) / totalSpan) * 100;
    const widthPct = Math.min(100, Math.max(10, rawWidthPct));
    const leftPct = Math.min(100 - widthPct, Math.max(0, rawLeftPct));
    const gradWidthPct = (100 / widthPct) * 100;
    const gradLeftPct = -(leftPct / widthPct) * 100;
    const precipPct = Math.round(dItem.precipProb ?? 0);

    let snowBadgeHtml = "";
    const accumFormatted = formatSnowAccum(dItem.snowAccumulationCm);
    if (accumFormatted) {
      const badgeCls = dItem.precipType === "sleet" ? "daily-sleet-badge" : "daily-snow-badge";
      snowBadgeHtml = `<span class="${badgeCls}">${accumFormatted}</span>`;
    }

    let todayDotHtml = "";
    if (idx === 0 && Number.isFinite(state.weather?.temperature)) {
      const curTemp = state.weather.temperature;
      const curGlobalPct = ((curTemp - globalMin) / totalSpan) * 100;
      const clampedDotPct = Math.min(
        leftPct + widthPct,
        Math.max(leftPct, curGlobalPct)
      );
      todayDotHtml = `<div class="meter-dot daily-current-dot" style="left: ${clampedDotPct.toFixed(
        2
      )}%" title="Now: ${formatTemp(curTemp, true)}"></div>`;
    }

    // Start with all 10 days collapsed on load
    const wrapper = document.createElement("div");
    wrapper.className = "day-accordion";

    const dayNarrative = `${cond.label} throughout the day. High of ${formatTemp(
      dItem.tempMax,
      true
    )} and overnight low of ${formatTemp(dItem.tempMin, true)}.`;

    const activeDayMode = state.dailyModes[idx] || "temp";
    const activeDayPill =
      HOURLY_METRIC_PILLS.find((p) => p.mode === activeDayMode) ||
      HOURLY_METRIC_PILLS[0];
    const activeDayDesc = getHourlyMetricDescriptor(activeDayPill.mode);

    wrapper.innerHTML = `
      <button type="button" class="daily-row-btn" aria-expanded="false">
        <div class="daily-day-col">
          <span class="daily-day">${dayName}</span>
          <span class="daily-precip${precipPct === 0 ? " is-zero" : ""}">${precipPct}%</span>
          ${snowBadgeHtml}
        </div>
        <div class="daily-icon">${getWeatherSVG(cond.icon)}</div>
        <div class="daily-scale-lane">
          <div class="daily-scale-track">
            <div class="daily-scale-bar" style="left: ${leftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%">
              <span class="daily-min">${formatTemp(dItem.tempMin)}</span>
              <div class="daily-scale-pill">
                <div class="daily-scale-gradient" style="left: ${gradLeftPct.toFixed(2)}%; width: ${gradWidthPct.toFixed(2)}%"></div>
              </div>
              <span class="daily-max">${formatTemp(dItem.tempMax)}</span>
            </div>
            ${todayDotHtml}
          </div>
        </div>
        <span class="day-chevron">▾</span>
      </button>
      <div class="day-drawer">
        <div class="day-drawer-inner">
          <div class="day-drawer-top">
            <div class="day-drawer-summary">${dayNarrative}</div>
            <div class="metric-selector-dropdown day-metric-dropdown">
              <button
                type="button"
                class="metric-selector-btn day-metric-btn"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-label="Select ${dayName} Hourly Metric"
              >
                <span class="metric-selector-icon" style="color: ${activeDayDesc.lineColor};">${getHourlyMetricIconSVG(activeDayPill.mode)}</span>
                <span class="metric-selector-label">${activeDayPill.label}</span>
                <span class="metric-selector-chevron" aria-hidden="true">▾</span>
              </button>
              <div
                class="metric-selector-menu day-metric-menu"
                role="listbox"
                aria-label="${dayName} Hourly Metrics"
                hidden
              ></div>
            </div>
          </div>
          <div class="hourly-chart-scroll day-hourly-scroll"></div>
        </div>
      </div>
    `;

    const dayScrollEl = wrapper.querySelector(".day-hourly-scroll");
    const dayDropdownEl = wrapper.querySelector(".day-metric-dropdown");
    const dayHours = Array.isArray(dItem.hours) ? dItem.hours : [];
    const fullDayLabel =
      idx === 0
        ? "Today"
        : dItem.date.toLocaleDateString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
          });

    // Mirror Hourly Forecast chart inside each 10-day drawer
    const isMobileDay = window.innerWidth <= 640;
    const dayChartOpts = {
      showNowOnFirst: idx === 0,
      showDayDividers: idx === 0,
      colW: isMobileDay ? getMobileHourlyColWidth(dayScrollEl) : 74,
      H: isMobileDay ? 114 : 196,
      contextLabel: `10-Day Forecast • ${fullDayLabel}`,
      onSelectMode: (newMode) => {
        state.dailyModes[idx] = newMode;
        syncMetricDropdownUI(dayDropdownEl, newMode);
        const prevLeft = dayScrollEl.scrollLeft;
        const mobileNow = window.innerWidth <= 640;
        dayChartOpts.colW = mobileNow ? getMobileHourlyColWidth(dayScrollEl) : 74;
        dayChartOpts.H = mobileNow ? 114 : 196;
        renderHourlyCurveIntoContainer(
          dayScrollEl,
          dayHours,
          newMode,
          dayChartOpts
        );
        dayScrollEl.scrollLeft = prevLeft;
      },
    };

    renderHourlyCurveIntoContainer(
      dayScrollEl,
      dayHours,
      activeDayMode,
      dayChartOpts
    );

    bindMetricDropdown(dayDropdownEl, activeDayMode, (mode) => {
      state.dailyModes[idx] = mode;
      const prevLeft = dayScrollEl.scrollLeft;
      const mobileNow = window.innerWidth <= 640;
      dayChartOpts.colW = mobileNow ? getMobileHourlyColWidth(dayScrollEl) : 74;
      dayChartOpts.H = mobileNow ? 114 : 196;
      renderHourlyCurveIntoContainer(
        dayScrollEl,
        dayHours,
        mode,
        dayChartOpts
      );
      dayScrollEl.scrollLeft = prevLeft;
    });

    const rowBtn = wrapper.querySelector(".daily-row-btn");
    rowBtn.addEventListener("click", () => {
      const willOpen = !wrapper.classList.contains("open");
      closeAllMetricDropdowns();
      // Single-accordion behavior: close any other open day first
      list.querySelectorAll(".day-accordion.open").forEach((other) => {
        if (other !== wrapper) {
          other.classList.remove("open");
          const otherBtn = other.querySelector(".daily-row-btn");
          if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
        }
      });
      wrapper.classList.toggle("open", willOpen);
      rowBtn.setAttribute("aria-expanded", String(willOpen));
    });

    list.appendChild(wrapper);
  });

  requestAnimationFrame(() => syncRadarCardHeight());
}

/* Render Multi-Model Ensemble Strip */
function renderEnsembleComparison(models, spreadC, confidencePct = 92) {
  const grid = document.getElementById("ensemble-models-grid");
  const spreadLabel = document.getElementById("ensemble-spread-label");
  if (!grid || !models) return;

  const spreadVal = state.useImperial ? spreadC * 1.8 : spreadC;
  const unit = state.useImperial ? "°F" : "°C";
  if (spreadLabel) {
    spreadLabel.textContent = `Spread ±${(spreadVal / 2).toFixed(1)}${unit}`;
  }

  grid.innerHTML = "";
  models.forEach((m, idx) => {
    const deltaVal = state.useImperial ? (m.deltaC ?? 0) * 1.8 : m.deltaC ?? 0;
    const absDelta = Math.abs(deltaVal);
    const deltaLabel =
      absDelta < 0.15
        ? "Consensus"
        : `Δ ${deltaVal > 0 ? "+" : ""}${deltaVal.toFixed(1)}${unit}`;
    const alignPct = m.alignmentPct ?? confidencePct;
    const toneClass =
      alignPct >= 93 ? "aligned" : alignPct >= 86 ? "moderate" : "divergent";
    const pop = Math.round(m.precipProb ?? 0);

    const box = document.createElement("div");
    box.className = "ensemble-pill-box interactive-tile";
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.innerHTML = `
      <div class="ensemble-model-name">
        <span>${m.name}</span>
      </div>
      <div class="ensemble-model-temp-row">
        <span class="ensemble-model-temp">${formatTemp(m.temp, true)}</span>
        <span class="confidence-source-delta ${toneClass}">${deltaLabel}</span>
      </div>
      <div class="ensemble-model-score-row">
        <div class="ensemble-score-track">
          <div class="ensemble-score-fill ${toneClass}" style="width: ${alignPct}%"></div>
        </div>
        <span class="ensemble-score-pct ${toneClass}">${alignPct}% Aligned</span>
      </div>
      <div class="ensemble-model-meta">PoP ${pop}% &bull; ${formatPrecipAmount(
        m.precip
      )}/hr</div>
    `;
    box.addEventListener("click", () => openTileDetailModal("ensemble"));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openTileDetailModal("ensemble");
      }
    });
    grid.appendChild(box);
  });
}

/* App-Like Interactive Telemetry Detail Sheet & Quick-Jump to Timeline */
function jumpToTimelineMetric(mode) {
  const validModes = new Set(HOURLY_METRIC_PILLS.map((p) => p.mode));
  const targetMode = validModes.has(mode) ? mode : "temp";
  state.hourlyMode = targetMode;

  syncMetricDropdownUI(
    document.getElementById("hourly-metric-dropdown"),
    targetMode
  );

  if (state.weather?.hourly) {
    renderHourlyTimeline(state.weather.hourly);
  }

  const timelineSection = document.getElementById("timeline-card-section");
  if (timelineSection) {
    timelineSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

let modalCloseTimer = null;
let hourModalCloseTimer = null;
const hourModalState = {
  scrollEl: null,
  index: 0,
};

function formatHourShortLabel(item, isNow = false) {
  if (!item || !item.time) return "--";
  if (isNow) return "NOW";
  return item.time
    .toLocaleTimeString([], { hour: "numeric", hour12: true })
    .replace(/\s+/g, "")
    .toUpperCase();
}

function getHourlyMetricIconSVG(mode) {
  switch (mode) {
    case "temp":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/><line x1="11.5" y1="9" x2="11.5" y2="15"/></svg>`;
    case "feels":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/><path d="M17 6h3"/><path d="M17 10h4"/><path d="M17 14h2"/></svg>`;
    case "precip":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
    case "precipAmount":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`;
    case "wind":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`;
    case "gusts":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/><polyline points="19 4 22 6 19 8"/></svg>`;
    case "uv":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    case "dew":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M9.5 14.5a3.5 3.5 0 0 0 3.5 3"/></svg>`;
    case "clouds":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
    case "visibility":
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
    case "pressure":
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`;
  }
}

function closeHourDetailModal() {
  const modal = document.getElementById("hour-detail-modal");
  const sheet = document.getElementById("hour-modal-sheet");
  if (!modal || modal.hasAttribute("hidden")) return;

  const tileModal = document.getElementById("tile-detail-modal");
  if (!tileModal || tileModal.hasAttribute("hidden")) {
    document.body.classList.remove("modal-open");
  }
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.transition = "";
  }
  modal.classList.add("closing");
  clearTimeout(hourModalCloseTimer);
  hourModalCloseTimer = setTimeout(() => {
    modal.classList.remove("closing");
    modal.setAttribute("hidden", "");
  }, 230);
}

function renderHourDetailModalContent() {
  const { scrollEl, index } = hourModalState;
  const hourly = scrollEl?._hourlyData;
  if (!hourly || !hourly.length) return;

  const boundedIdx = Math.max(0, Math.min(hourly.length - 1, index));
  hourModalState.index = boundedIdx;
  const item = hourly[boundedIdx];
  const opts = scrollEl._hourlyOptions || {};
  const activeMode = scrollEl._hourlyMode || "temp";
  const isNow = Boolean(opts.showNowOnFirst && boundedIdx === 0);

  // Sync active column highlight & scroll into view on the underlying chart
  const cols = scrollEl.querySelectorAll(".hourly-col");
  if (cols.length) {
    cols.forEach((c, i) => c.classList.toggle("active", i === boundedIdx));
    const activeCol = cols[boundedIdx];
    if (activeCol) {
      const targetLeft =
        activeCol.offsetLeft -
        scrollEl.clientWidth / 2 +
        activeCol.offsetWidth / 2;
      scrollEl.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "smooth",
      });
    }
  }

  const cond = item.condition || conditionFromWMO(item.wmoCode);
  const tempDesc = getHourlyMetricDescriptor("temp");
  const tempSpread = tempDesc.formatSpread(
    Math.max(0, item.tempMax - item.tempMin)
  );

  const kickerEl = document.getElementById("hour-modal-kicker");
  const titleEl = document.getElementById("hour-modal-title");
  const iconEl = document.getElementById("hour-modal-icon");
  const tempEl = document.getElementById("hour-modal-temp");
  const spreadEl = document.getElementById("hour-modal-spread");
  const condBadgeEl = document.getElementById("hour-modal-cond-badge");
  const submetaEl = document.getElementById("hour-modal-submeta");
  const prevBtn = document.getElementById("hour-modal-prev");
  const nextBtn = document.getElementById("hour-modal-next");
  const prevLabel = document.getElementById("hour-modal-prev-label");
  const nextLabel = document.getElementById("hour-modal-next-label");
  const gridEl = document.getElementById("hour-modal-metrics-grid");

  if (kickerEl) {
    kickerEl.textContent = `⏱️ ${
      opts.contextLabel || "HOURLY TELEMETRY BREAKDOWN"
    }`;
  }

  const dateStr = item.time.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const clockStr = item.time.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (titleEl) {
    titleEl.textContent = isNow
      ? `${dateStr} • ${clockStr} (Now)`
      : `${dateStr} • ${clockStr}`;
  }

  if (iconEl) iconEl.innerHTML = getWeatherSVG(cond.icon, Boolean(item.isNight));
  if (tempEl) tempEl.textContent = formatTemp(item.temperature, true);
  if (spreadEl) spreadEl.textContent = tempSpread;
  if (condBadgeEl) condBadgeEl.textContent = cond.label;
  const wetBulbStr =
    item.wetBulbC !== null && item.wetBulbC !== undefined
      ? ` &bull; Wet-Bulb ${formatTemp(item.wetBulbC, true)}`
      : "";
  const accumVal = formatSnowAccum(item.snowAccumulationCm);
  const accumStr = accumVal
    ? ` &bull; ${item.precipType === "sleet" ? "Ice/Sleet" : "Snow"}: ${accumVal}`
    : "";

  if (submetaEl) {
    submetaEl.innerHTML = `Feels like ${formatTemp(
      item.feelsLike,
      true
    )} &bull; PoP ${Math.round(item.precipProb)}% &bull; Wind ${formatWind(
      item.windSpeed
    )}${wetBulbStr}${accumStr}`;
  }

  if (prevBtn) {
    prevBtn.disabled = boundedIdx <= 0;
    if (prevLabel) {
      prevLabel.textContent =
        boundedIdx > 0
          ? formatHourShortLabel(
              hourly[boundedIdx - 1],
              Boolean(opts.showNowOnFirst && boundedIdx - 1 === 0)
            )
          : "Start";
    }
  }

  if (nextBtn) {
    nextBtn.disabled = boundedIdx >= hourly.length - 1;
    if (nextLabel) {
      nextLabel.textContent =
        boundedIdx < hourly.length - 1
          ? formatHourShortLabel(hourly[boundedIdx + 1], false)
          : "End";
    }
  }

  if (gridEl) {
    gridEl.innerHTML = "";
    HOURLY_METRIC_PILLS.forEach((pill) => {
      const desc = getHourlyMetricDescriptor(pill.mode);
      const s = desc.extract(item);
      const spreadStr = desc.formatSpread(Math.max(0, s.max - s.min));
      const isCurrentMode = pill.mode === activeMode;
      const iconSvg = getHourlyMetricIconSVG(pill.mode);

      const card = document.createElement("button");
      card.type = "button";
      card.className = `hour-metric-card ${
        isCurrentMode ? "active-metric" : ""
      }`;
      card.style.setProperty("--metric-accent", desc.lineColor);
      card.innerHTML = `
        <div class="hour-metric-top">
          <span class="hour-metric-label-wrap">
            <span class="hour-metric-icon" style="color: ${desc.lineColor}">${iconSvg}</span>
            <span class="hour-metric-label">${pill.label}</span>
          </span>
          ${
            isCurrentMode
              ? '<span class="hour-metric-active-tag">Active</span>'
              : ""
          }
        </div>
        <div class="hour-metric-mid">
          <span class="hour-metric-val">${desc.formatFull(s.val)}</span>
          <span class="hour-metric-spread">${spreadStr}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        if (typeof opts.onSelectMode === "function") {
          opts.onSelectMode(pill.mode);
        } else {
          scrollEl._hourlyMode = pill.mode;
        }
        renderHourDetailModalContent();
      });

      gridEl.appendChild(card);
    });

    if (item.wetBulbC !== null && item.wetBulbC !== undefined) {
      const card = document.createElement("div");
      card.className = "hour-metric-card static-metric";
      card.style.setProperty("--metric-accent", "#38bdf8");
      card.innerHTML = `
        <div class="hour-metric-top">
          <span class="hour-metric-label-wrap">
            <span class="hour-metric-icon" style="color: #38bdf8">${getHourlyMetricIconSVG("dew")}</span>
            <span class="hour-metric-label">Wet-Bulb Temp</span>
          </span>
          <span class="hour-metric-active-tag" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8">Thermodynamic</span>
        </div>
        <div class="hour-metric-mid">
          <span class="hour-metric-val">${formatTemp(item.wetBulbC, true)}</span>
          <span class="hour-metric-spread">${item.precipType ? item.precipType.toUpperCase() : "PHASE"}</span>
        </div>
      `;
      gridEl.appendChild(card);
    }

    if (item.snowAccumulationCm && item.snowAccumulationCm >= 0.1) {
      const card = document.createElement("div");
      card.className = "hour-metric-card static-metric";
      const isSleet = item.precipType === "sleet";
      const accent = isSleet ? "#c084fc" : "#7dd3fc";
      const label = isSleet ? "Sleet / Ice Accum" : "Snow Accumulation";
      const accumFormatted =
        formatSnowAccum(item.snowAccumulationCm) ||
        (state.useImperial
          ? `${(item.snowAccumulationCm / 2.54).toFixed(1)}"`
          : `${item.snowAccumulationCm.toFixed(1)} cm`);
      card.style.setProperty("--metric-accent", accent);
      card.innerHTML = `
        <div class="hour-metric-top">
          <span class="hour-metric-label-wrap">
            <span class="hour-metric-icon" style="color: ${accent}">${getHourlyMetricIconSVG("precip")}</span>
            <span class="hour-metric-label">${label}</span>
          </span>
          <span class="hour-metric-active-tag" style="background: rgba(125, 211, 252, 0.15); color: ${accent}">Kuchera SLR</span>
        </div>
        <div class="hour-metric-mid">
          <span class="hour-metric-val">${accumFormatted}</span>
          <span class="hour-metric-spread">1-Hour Total</span>
        </div>
      `;
      gridEl.appendChild(card);
    }
  }
}

function openHourDetailModal(scrollEl, index) {
  const modal = document.getElementById("hour-detail-modal");
  const sheet = document.getElementById("hour-modal-sheet");
  if (!modal || !scrollEl || !scrollEl._hourlyData?.length) return;

  hourModalState.scrollEl = scrollEl;
  hourModalState.index = index;

  clearTimeout(hourModalCloseTimer);
  modal.classList.remove("closing");
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.transition = "";
  }

  renderHourDetailModalContent();
  document.body.classList.add("modal-open");
  modal.removeAttribute("hidden");
}

function stepHourDetailModal(delta) {
  const modal = document.getElementById("hour-detail-modal");
  if (!modal || modal.hasAttribute("hidden")) return;
  const hourly = hourModalState.scrollEl?._hourlyData;
  if (!hourly || !hourly.length) return;
  const nextIdx = Math.max(
    0,
    Math.min(hourly.length - 1, hourModalState.index + delta)
  );
  if (nextIdx === hourModalState.index) return;
  hourModalState.index = nextIdx;
  renderHourDetailModalContent();
}

function closeTileDetailModal() {
  const modal = document.getElementById("tile-detail-modal");
  const sheet = document.getElementById("tile-modal-sheet");
  if (!modal || modal.hasAttribute("hidden")) return;

  document.body.classList.remove("modal-open");
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.transition = "";
  }
  modal.classList.add("closing");
  clearTimeout(modalCloseTimer);
  modalCloseTimer = setTimeout(() => {
    modal.classList.remove("closing");
    modal.setAttribute("hidden", "");
  }, 230);
}

function openTileDetailModal(tileType) {
  const w = state.weather;
  const modal = document.getElementById("tile-detail-modal");
  const sheet = document.getElementById("tile-modal-sheet");
  if (!w || !modal) return;
  clearTimeout(modalCloseTimer);
  modal.classList.remove("closing");
  if (sheet) {
    sheet.style.transform = "";
    sheet.style.transition = "";
  }

  const kickerEl = document.getElementById("tile-modal-kicker");
  const titleEl = document.getElementById("tile-modal-title");
  const primaryEl = document.getElementById("tile-modal-primary");
  const badgeEl = document.getElementById("tile-modal-badge");
  const narrativeEl = document.getElementById("tile-modal-narrative");
  const chartSecEl = document.getElementById("tile-modal-chart-section");
  const chartScrollEl = document.getElementById("tile-modal-chart-scroll");
  const chartLabelEl = document.getElementById("tile-modal-chart-label");
  const spreadBadgeEl = document.getElementById("tile-modal-spread-badge");
  const statsGridEl = document.getElementById("tile-modal-stats-grid");
  const jumpBtnEl = document.getElementById("tile-modal-jump-btn");

  const next24 = (w.hourly || []).slice(0, 24);
  let chartMode = "temp";
  let jumpLabel = "View on 10-Day Forecast Curve ↗";
  let stats = [];

  switch (tileType) {
    case "aqi": {
      const aqi = Math.round(w.usAqi ?? 28);
      const pm25 = Number(w.pm25 || 0).toFixed(1);
      const cat = aqiCategoryLabel(aqi);
      kickerEl.textContent = "🌿 ATMOSPHERIC AIR QUALITY";
      titleEl.textContent = "US EPA Air Quality Index";
      primaryEl.textContent = `${aqi} AQI`;
      badgeEl.textContent = cat;
      narrativeEl.textContent =
        aqi <= 50
          ? "Air quality is satisfactory and air pollution poses little or no risk. Ideal conditions for outdoor activities and exercise."
          : aqi <= 100
          ? "Air quality is acceptable; however, unusually sensitive individuals should consider limiting prolonged outdoor exertion."
          : "Members of sensitive groups may experience health effects. Consider reducing prolonged or heavy exertion outdoors.";
      chartMode = "visibility";
      jumpLabel = "View Visibility Curve on 10-Day Timeline ↗";
      stats = [
        { label: "Fine Particulates (PM2.5)", val: `${pm25} µg/m³`, sub: "Primary pollutant" },
        { label: "EPA Category", val: cat, sub: "0–50 Good • 51–100 Moderate" },
        {
          label: "Surface Visibility",
          val: state.useImperial
            ? `${(w.visibilityKm * 0.621371).toFixed(1)} mi`
            : `${w.visibilityKm.toFixed(1)} km`,
          sub: "Optical clarity",
        },
        {
          label: "Boundary Layer Wind",
          val: `${formatWind(w.windSpeed)} ${compassDirection(w.windDirection)}`,
          sub: "Ventilation rate",
        },
      ];
      break;
    }

    case "uv": {
      const uv = Math.round(w.uvIndex * 10) / 10;
      const maxUv24 = next24.length ? Math.max(...next24.map((h) => h.uvIndex)) : uv;
      kickerEl.textContent = "☀️ SOLAR ULTRAVIOLET RADIATION";
      titleEl.textContent = "UV Index & Sun Protection";
      primaryEl.textContent = `${uv} UV`;
      badgeEl.textContent = uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : "Very High";
      narrativeEl.textContent = `${uvAdvice(
        uv
      )} 24-hour peak ultraviolet index reaches ${maxUv24.toFixed(
        1
      )} during solar noon.`;
      chartMode = "uv";
      jumpLabel = "View UV Index on 10-Day Timeline ↗";
      stats = [
        { label: "Current UV Index", val: String(uv), sub: uvAdvice(uv) },
        { label: "24-Hour Peak UV", val: maxUv24.toFixed(1), sub: "Peak solar intensity" },
        { label: "Cloud Attenuation", val: `${Math.round(w.cloudCover)}%`, sub: "Current sky cover" },
        {
          label: "Sunset Today",
          val: w.sunset
            ? new Date(w.sunset).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : "--:--",
          sub: "End of solar exposure",
        },
      ];
      break;
    }

    case "wind": {
      const maxGust24 = next24.length
        ? Math.max(...next24.map((h) => h.windGusts))
        : w.windGusts;
      kickerEl.textContent = "💨 ANEMOMETER & GUST TELEMETRY";
      titleEl.textContent = "Surface Wind & Peak Gusts";
      primaryEl.textContent = formatWind(w.windSpeed);
      badgeEl.textContent = `From ${compassDirection(w.windDirection)} (${w.windDirection}°)`;
      narrativeEl.textContent = `Sustained 10m surface wind at ${formatWind(
        w.windSpeed
      )} with gusts reaching ${formatWind(
        w.windGusts
      )}. Over the next 24 hours, peak gusts are projected up to ${formatWind(maxGust24)}.`;
      chartMode = "wind";
      jumpLabel = "View Wind Speed on 10-Day Timeline ↗";
      stats = [
        { label: "Sustained Wind (10m)", val: formatWind(w.windSpeed), sub: "10-minute average" },
        { label: "Current Wind Gusts", val: formatWind(w.windGusts), sub: "Instantaneous peak" },
        { label: "24-Hour Peak Gust", val: formatWind(maxGust24), sub: "Model envelope high" },
        {
          label: "Vector Heading",
          val: `${compassDirection(w.windDirection)} (${w.windDirection}°)`,
          sub: "Meteorological origin",
        },
      ];
      break;
    }

    case "humidity": {
      const { humidex, vaporPressureHpa } = calculateHumidex(
        w.temperature,
        w.dewPoint,
        w.humidity
      );
      const hRounded = Math.round(humidex);
      const hTier = humidexComfortTier(hRounded);
      kickerEl.textContent = "💧 HYGROMETER & HUMIDEX COMFORT SCALE";
      titleEl.textContent = "Humidex, Humidity & Dew Point";
      primaryEl.textContent = `${hRounded} Humidex`;
      badgeEl.textContent = `${hTier.label} • ${Math.round(w.humidity)}% RH`;
      narrativeEl.textContent = `Humidex combines air temperature (${formatTemp(
        w.temperature,
        true
      )}) and actual vapor pressure (${vaporPressureHpa.toFixed(
        1
      )} hPa from a ${formatTemp(
        w.dewPoint,
        true
      )} dew point) into a Canadian-standard perceived warmth index. At ${hRounded}, conditions feel ${hTier.label.toLowerCase()}.`;
      chartMode = "dew";
      jumpLabel = "View Dew Point on 10-Day Timeline ↗";
      stats = [
        { label: "Humidex Index", val: `${hRounded} (${hTier.label})`, sub: "<20 Cool • 20–29 Comfy • 30–39 Muggy" },
        { label: "Vapor Pressure (e)", val: `${vaporPressureHpa.toFixed(1)} hPa`, sub: "Actual moisture tension" },
        { label: "Dew Point (2m)", val: formatTemp(w.dewPoint, true), sub: muggyDescription(w.dewPoint) },
        { label: "Relative Humidity", val: `${Math.round(w.humidity)}%`, sub: "Saturation ratio" },
      ];
      break;
    }

    case "visibility": {
      const visStr = state.useImperial
        ? `${(w.visibilityKm * 0.621371).toFixed(1)} mi`
        : `${w.visibilityKm.toFixed(1)} km`;
      kickerEl.textContent = "👁️ OPTICAL RANGE & CEILING";
      titleEl.textContent = "Visibility & Cloud Cover";
      primaryEl.textContent = visStr;
      badgeEl.textContent = `${Math.round(w.cloudCover)}% Cloud Cover`;
      narrativeEl.textContent =
        w.visibilityKm >= 10
          ? "Unrestricted horizontal surface visibility across the local sector with clear optical transmission."
          : "Reduced horizontal visibility due to atmospheric moisture, mist, or low ceiling particulates.";
      chartMode = "visibility";
      jumpLabel = "View Visibility on 10-Day Timeline ↗";
      stats = [
        { label: "Surface Visibility", val: visStr, sub: "Horizontal optical range" },
        { label: "Total Cloud Cover", val: `${Math.round(w.cloudCover)}%`, sub: "Integrated sky fraction" },
        { label: "Terrain Elevation", val: `${Math.round(w.elevation)} m`, sub: "DEM grid altitude" },
        { label: "Barometric Pressure", val: formatPressure(w.pressure), sub: "Mean sea-level pressure" },
      ];
      break;
    }

    case "solar": {
      const parseClockParts = (iso) => {
        if (!iso || typeof iso !== "string") return null;
        const tIdx = iso.indexOf("T");
        const timePart = tIdx >= 0 ? iso.slice(tIdx + 1) : iso;
        const [hStr, mStr] = timePart.split(":");
        const h = Number(hStr);
        const m = Number((mStr || "00").slice(0, 2));
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        const mPad = m < 10 ? `0${m}` : `${m}`;
        return { label: `${h12}:${mPad} ${ampm}`, totalMin: h * 60 + m };
      };
      const srParts = parseClockParts(w.sunrise);
      const ssParts = parseClockParts(w.sunset);
      const sr = srParts ? srParts.label : "--:--";
      const ss = ssParts ? ssParts.label : "--:--";
      let dayLenStr = "--";
      if (srParts && ssParts) {
        const diffMin = ssParts.totalMin - srParts.totalMin;
        if (diffMin > 0) {
          dayLenStr = `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
        }
      }
      const cape = Math.round(w.cape || 0);
      kickerEl.textContent = "🌅 ASTRONOMICAL & CONVECTIVE";
      titleEl.textContent = "Solar Ephemeris & CAPE";
      primaryEl.textContent = sr;
      badgeEl.textContent = `Sunset ${ss}`;
      narrativeEl.textContent = `Total daylight duration today is ${dayLenStr}. Convective Available Potential Energy (CAPE) is ${cape} J/kg (${
        cape < 300
          ? "stable air mass, minimal thunderstorm energy"
          : cape < 1000
          ? "marginal convective instability"
          : "strong thunderstorm updraft potential"
      }).`;
      chartMode = "clouds";
      jumpLabel = "View Cloud Cover on 10-Day Timeline ↗";
      stats = [
        { label: "Sunrise", val: sr, sub: "Local horizon" },
        { label: "Sunset", val: ss, sub: "Local horizon" },
        { label: "Daylight Length", val: dayLenStr, sub: "Solar photoperiod" },
        { label: "Convective CAPE", val: `${cape} J/kg`, sub: "Updraft potential energy" },
      ];
      break;
    }

    case "pressure": {
      kickerEl.textContent = "🧭 BAROMETRIC TELEMETRY";
      titleEl.textContent = "Mean Sea-Level Pressure";
      primaryEl.textContent = formatPressure(w.pressure);
      badgeEl.textContent = w.pressure >= 1018 ? "High Pressure" : w.pressure <= 1008 ? "Low Pressure" : "Normal Range";
      narrativeEl.textContent = `Barometric pressure is currently ${formatPressure(
        w.pressure
      )}. Tracking the 24-hour and 10-day pressure curve reveals approaching frontal troughs and ridge building.`;
      chartMode = "pressure";
      jumpLabel = "View Pressure on 10-Day Timeline ↗";
      stats = [
        { label: "MSL Pressure", val: formatPressure(w.pressure), sub: "Sea-level adjusted" },
        { label: "Raw hPa", val: `${Math.round(w.pressure)} hPa`, sub: "Standard metric" },
        { label: "Inches of Mercury", val: `${(w.pressure * 0.02953).toFixed(2)} inHg`, sub: "US aviation altimeter" },
        { label: "Station Elevation", val: `${Math.round(w.elevation)} m`, sub: "Local MSL offset" },
      ];
      break;
    }

    case "precip": {
      const pop = Math.round(w.hourly?.[0]?.precipProb ?? 0);
      const maxRate = Math.max(...(w.minuteRates || [0]));
      kickerEl.textContent = "🌧️ HYPERLOCAL NOWCAST & NWP";
      titleEl.textContent = "Precipitation Probability & Rate";
      primaryEl.textContent = `${pop}% PoP`;
      badgeEl.textContent = maxRate >= 0.08 ? `${maxRate.toFixed(1)} mm/hr Peak` : "Dry Next 60m";
      narrativeEl.textContent =
        "Assimilating 1km NEXRAD Doppler reflectivity with HRRR, ECMWF, GFS, and ICON precipitation ensembles across the next 24 hours.";
      chartMode = "precip";
      jumpLabel = "View Precip Chance on 10-Day Timeline ↗";
      stats = [
        { label: "Current Hour PoP", val: `${pop}%`, sub: "Probability of precipitation" },
        { label: "60m Peak Rate", val: `${maxRate.toFixed(1)} mm/hr`, sub: "Minutely radar nowcast" },
        {
          label: "Today's Total",
          val: formatPrecipAmount(w.daily?.[0]?.precipSumMm ?? 0),
          sub: "24-hour accumulation",
        },
        {
          label: "Dew Point Spread",
          val: formatTemp(Math.max(0, w.temperature - w.dewPoint)),
          sub: "Lower spread = higher saturation",
        },
      ];
      break;
    }

    case "ensemble":
    default: {
      const spreadVal = state.useImperial ? w.spreadC * 1.8 : w.spreadC;
      const unit = state.useImperial ? "°F" : "°C";
      kickerEl.textContent = "🔬 FORECAST MODELS BREAKDOWN";
      titleEl.textContent = "HRRR • ECMWF • GFS • ICON";
      primaryEl.textContent = `${w.confidencePct}% Model Agreement`;
      badgeEl.textContent = `Spread ±${(spreadVal / 2).toFixed(1)}${unit}`;
      narrativeEl.textContent =
        "ZüsCast continuously computes the min–max envelope across NOAA HRRR 3km, ECMWF IFS 0.25°, NOAA GFS, and DWD ICON so you can see both the primary forecast and model uncertainty.";
      chartMode = "temp";
      jumpLabel = "View Full 10-Day Model Envelope ↗";
      stats = [];
      break;
    }
  }

  // Render 24-hour mini curve + model envelope inside the modal
  if (chartSecEl && chartScrollEl && next24.length) {
    chartSecEl.removeAttribute("hidden");
    const desc = getHourlyMetricDescriptor(chartMode);
    if (chartLabelEl) {
      chartLabelEl.textContent = `24-Hour ${desc.label} Curve + Model Envelope`;
    }
    renderHourlyCurveIntoContainer(chartScrollEl, next24, chartMode, {
      showNowOnFirst: true,
      showDayDividers: true,
      colW: 54,
      H: 152,
    });
  } else if (chartSecEl) {
    chartSecEl.setAttribute("hidden", "");
  }

  // Render structured sub-metrics breakdown cards (or full 4-model breakout for ensemble)
  if (statsGridEl) {
    if (tileType === "ensemble") {
      const unit = state.useImperial ? "°F" : "°C";
      statsGridEl.innerHTML = (w.ensembleModels || [])
        .map((m) => {
          const deltaVal = state.useImperial ? (m.deltaC ?? 0) * 1.8 : m.deltaC ?? 0;
          const absDelta = Math.abs(deltaVal);
          const deltaLabel =
            absDelta < 0.15
              ? "Consensus"
              : `Δ ${deltaVal > 0 ? "+" : ""}${deltaVal.toFixed(1)}${unit}`;
          const alignPct = m.alignmentPct ?? w.confidencePct;
          const toneClass =
            alignPct >= 93 ? "aligned" : alignPct >= 86 ? "moderate" : "divergent";
          const pop = Math.round(m.precipProb ?? 0);
          return `
        <div class="ensemble-pill-box">
          <div class="ensemble-model-name">
            <span>${m.name}</span>
          </div>
          <div class="ensemble-model-temp-row">
            <span class="ensemble-model-temp">${formatTemp(m.temp, true)}</span>
            <span class="confidence-source-delta ${toneClass}">${deltaLabel}</span>
          </div>
          <div class="ensemble-model-score-row">
            <div class="ensemble-score-track">
              <div class="ensemble-score-fill ${toneClass}" style="width: ${alignPct}%"></div>
            </div>
            <span class="ensemble-score-pct ${toneClass}">${alignPct}% Aligned</span>
          </div>
          <div class="ensemble-model-meta">PoP ${pop}% &bull; ${formatPrecipAmount(
            m.precip
          )}/hr</div>
        </div>
      `;
        })
        .join("");
    } else {
      statsGridEl.innerHTML = stats
        .map(
          (s) => `
      <div class="tile-stat-box">
        <span class="tile-stat-label">${s.label}</span>
        <span class="tile-stat-val">${s.val}</span>
        <span class="tile-stat-sub">${s.sub}</span>
      </div>
    `
        )
        .join("");
    }
  }

  if (jumpBtnEl) {
    jumpBtnEl.textContent = jumpLabel;
    jumpBtnEl.onclick = () => {
      closeTileDetailModal();
      setTimeout(() => jumpToTimelineMetric(chartMode), 140);
    };
  }

  document.body.classList.add("modal-open");
  modal.removeAttribute("hidden");
}

/* Certified High-Res Time-of-Day + Weather Ambient Atmosphere Engine */
const atmosphereCanvas = {
  drops: [],
  flakes: [],
  stars: [],
  clouds: [],
  sunRays: [],
  bokehFlares: [],
  orbs: [],
  lightningAlpha: 0,
  lightningBolt: null,
  nextLightningAt: 0,
  dpr: 1,
  w: 0,
  h: 0,

  init() {
    const canvas = document.getElementById("atmosphere-canvas");
    if (!canvas) return;

    const resize = () => {
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.25);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      canvas.width = Math.round(this.w * this.dpr);
      canvas.height = Math.round(this.h * this.dpr);
    };
    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Dual-layer parallax raindrops (foreground + distant mist streaks)
    this.drops = Array.from({ length: 120 }, (_, i) => {
      const layer = i < 45 ? 1 : 0; // 1 = foreground, 0 = background
      return {
        x: Math.random() * (this.w + 120),
        y: Math.random() * this.h,
        len: layer ? 22 + Math.random() * 18 : 11 + Math.random() * 10,
        speed: layer ? 13 + Math.random() * 6 : 7.5 + Math.random() * 4.5,
        windX: layer ? -2.2 : -1.2,
        alpha: layer ? 0.28 + Math.random() * 0.14 : 0.13 + Math.random() * 0.08,
        width: layer ? 1.35 : 0.85,
      };
    });

    // 3-layer depth-of-field snow flurries
    this.flakes = Array.from({ length: 84 }, (_, i) => {
      const depth = i < 20 ? 2 : i < 52 ? 1 : 0;
      return {
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        r: depth === 2 ? 3.2 + Math.random() * 2.2 : depth === 1 ? 1.8 + Math.random() * 1.4 : 0.9 + Math.random() * 0.9,
        speedY: depth === 2 ? 1.35 + Math.random() * 0.8 : depth === 1 ? 0.85 + Math.random() * 0.55 : 0.45 + Math.random() * 0.35,
        swayAmp: depth === 2 ? 0.8 : depth === 1 ? 0.5 : 0.25,
        alpha: depth === 2 ? 0.62 : depth === 1 ? 0.44 : 0.26,
        phase: Math.random() * Math.PI * 2,
      };
    });

    // High-res night stars with subtle color temperatures & twinkle cadence
    const starWarmths = ["255, 255, 255", "224, 242, 254", "254, 249, 195", "199, 210, 254"];
    this.stars = Array.from({ length: 115 }, () => ({
      xFrac: Math.random(),
      yFrac: Math.random() * 0.72,
      r: 0.65 + Math.random() * 1.45,
      baseAlpha: 0.22 + Math.random() * 0.62,
      twinkleSpeed: 0.0008 + Math.random() * 0.0022,
      phase: Math.random() * Math.PI * 2,
      rgb: starWarmths[Math.floor(Math.random() * starWarmths.length)],
    }));

    // Volumetric multi-puff cloud banks that drift across the sky
    this.clouds = Array.from({ length: 9 }, (_, idx) => ({
      xFrac: (idx / 9) * 1.3 - 0.15,
      yFrac: 0.05 + (idx % 4) * 0.095 + Math.random() * 0.03,
      scale: 0.78 + (idx % 3) * 0.28,
      speedFrac: 0.000011 + (idx % 3) * 0.000005,
      layer: idx % 3,
      puffs: [
        { dx: -0.36, dy: 0.05, r: 0.48 },
        { dx: -0.14, dy: -0.07, r: 0.62 },
        { dx: 0.12, dy: -0.04, r: 0.58 },
        { dx: 0.35, dy: 0.06, r: 0.44 },
        { dx: 0.0, dy: 0.08, r: 0.52 },
      ],
    }));

    // Volumetric sunbeams fanning from upper solar apex
    this.sunRays = Array.from({ length: 9 }, (_, i) => ({
      angle: Math.PI * 0.22 + (i / 8) * Math.PI * 0.56,
      spread: 0.045 + (i % 3) * 0.018,
      lenFrac: 0.62 + (i % 2) * 0.22,
      speed: (i % 2 === 0 ? 1 : -1) * (0.00007 + (i % 3) * 0.000025),
      phase: i * 0.9,
      alpha: 0.038 + (i % 3) * 0.014,
    }));

    // Apple Weather Cupertino-style optical lens-flare bokeh discs along the sun axis
    this.bokehFlares = [
      { dist: 0.19, r: 22, rgb: "186, 230, 253", alpha: 0.12 },
      { dist: 0.29, r: 14, rgb: "254, 240, 138", alpha: 0.1 },
      { dist: 0.38, r: 28, rgb: "147, 197, 253", alpha: 0.11 },
      { dist: 0.46, r: 19, rgb: "196, 181, 253", alpha: 0.085 },
      { dist: 0.55, r: 34, rgb: "125, 211, 252", alpha: 0.09 },
    ];

    this.orbs = [
      { xFrac: 0.22, yFrac: 0.24, r: 260, speed: 0.00032, phase: 0.4, color: "56, 189, 248" },
      { xFrac: 0.78, yFrac: 0.22, r: 290, speed: 0.00026, phase: 2.1, color: "251, 191, 36" },
      { xFrac: 0.52, yFrac: 0.38, r: 270, speed: 0.00029, phase: 4.2, color: "129, 140, 248" },
    ];

    this.nextLightningAt = performance.now() + 3800 + Math.random() * 5500;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const loop = (now) => {
      if (document.visibilityState === "visible" && !reducedMotionQuery.matches) {
        this.render(canvas, now);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  buildLightningBolt(W, H) {
    const startX = W * (0.22 + Math.random() * 0.56);
    const pts = [{ x: startX, y: 0 }];
    let cx = startX;
    let cy = 0;
    const steps = 8 + Math.floor(Math.random() * 5);
    const maxH = H * (0.42 + Math.random() * 0.22);
    for (let i = 1; i <= steps; i++) {
      cx += (Math.random() - 0.5) * 64;
      cy = (i / steps) * maxH;
      pts.push({ x: cx, y: cy });
    }
    return pts;
  },

  render(canvas, now = performance.now()) {
    const ctx = canvas.getContext("2d");
    const W = this.w || window.innerWidth;
    const H = this.h || window.innerHeight;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Keep loading screen calm and neutral (no sunlight, stars, or weather effects until telemetry arrives)
    if (document.body.classList.contains("is-loading") || !state.weather) {
      const cx = W * 0.5;
      const cy = H * 0.38;
      const rad = Math.min(W, H) * 0.45;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.045)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const wmo = state.weather?.wmoCode ?? 0;
    const isNight = Boolean(state.weather?.isNight);
    const solarPhase = state.weather?.solarPhase || (isNight ? "night" : "day");
    const isTwilight = solarPhase === "twilight";
    const isThunder = [95, 96, 99].includes(wmo);
    const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(wmo) || isThunder;
    const isSnowy = [71, 73, 75, 77, 85, 86].includes(wmo);
    const isOvercast = [3, 45, 48].includes(wmo);
    const isPartlyCloudy = wmo === 1 || wmo === 2;
    const isClear = wmo === 0;
    const isMobile = W <= 640;

    // 1. Ambient Atmospheric Caustic Glow Orbs
    this.orbs.forEach((orb, idx) => {
      const cx = W * orb.xFrac + Math.sin(now * orb.speed + orb.phase) * 55;
      const cy = H * orb.yFrac + Math.cos(now * orb.speed * 0.85 + orb.phase) * 28;
      const rad = orb.r * (isMobile ? 0.78 : 1.08);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      let col = orb.color;
      let alpha = 0.06;
      if (isTwilight) {
        col = idx === 0 ? "251, 146, 60" : idx === 1 ? "244, 114, 182" : "129, 140, 248";
        alpha = 0.11;
      } else if (!isNight && (isClear || isPartlyCloudy)) {
        col = idx === 1 ? "253, 224, 71" : "125, 211, 252";
        alpha = idx === 1 ? 0.1 : 0.085;
      } else if (isOvercast || isRainy) {
        col = "148, 163, 184";
        alpha = 0.05;
      }
      grad.addColorStop(0, `rgba(${col}, ${alpha})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Night & Twilight Starfield + Lunar Corona
    if (isNight || isTwilight) {
      const cloudAtten = isOvercast || isRainy || isSnowy ? 0.18 : isPartlyCloudy ? 0.68 : 1;
      const twilightAtten = isTwilight ? 0.45 : 1;
      const starVis = cloudAtten * twilightAtten;
      if (starVis > 0.05) {
        this.stars.forEach((s) => {
          const twinkle = 0.55 + 0.45 * Math.sin(now * s.twinkleSpeed + s.phase);
          const a = s.baseAlpha * twinkle * starVis;
          if (a <= 0.03) return;
          const sx = s.xFrac * W;
          const sy = s.yFrac * H;
          ctx.fillStyle = `rgba(${s.rgb}, ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Soft Lunar Glow in upper sky on Clear / Partly Cloudy nights
      if (isNight && (isClear || isPartlyCloudy)) {
        const moonX = isMobile ? W * 0.76 : W * 0.78;
        const moonY = isMobile ? H * 0.09 : H * 0.12;
        const moonR = isMobile ? 175 : 250;
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, moonR);
        moonGlow.addColorStop(0, "rgba(254, 249, 195, 0.34)");
        moonGlow.addColorStop(0.22, "rgba(186, 230, 253, 0.16)");
        moonGlow.addColorStop(0.55, "rgba(99, 102, 241, 0.06)");
        moonGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Daytime Clear & Partly Cloudy: Apple Weather Sun Corona, Prismatic Halo, God-Rays & Bokeh Lens Flare
    if (!isNight && (isClear || isPartlyCloudy)) {
      const sunX = isMobile ? W * 0.5 : W * 0.32;
      const sunY = isMobile ? -H * 0.015 : H * 0.02;
      const haloR = Math.min(W, H) * (isMobile ? 0.56 : 0.46);
      const sunIntensity = isPartlyCloudy ? 0.74 : 1.0;

      // Rotating volumetric sunbeams fanning downward
      ctx.save();
      this.sunRays.forEach((ray) => {
        const ang = ray.angle + Math.sin(now * ray.speed * 12 + ray.phase) * 0.08;
        const rayLen = Math.max(W, H) * ray.lenFrac;
        const x1 = sunX + Math.cos(ang - ray.spread) * rayLen;
        const y1 = sunY + Math.sin(ang - ray.spread) * rayLen;
        const x2 = sunX + Math.cos(ang + ray.spread) * rayLen;
        const y2 = sunY + Math.sin(ang + ray.spread) * rayLen;
        const rGrad = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, rayLen);
        rGrad.addColorStop(0, `rgba(255, 253, 240, ${(ray.alpha * 1.65 * sunIntensity).toFixed(3)})`);
        rGrad.addColorStop(0.45, `rgba(224, 242, 254, ${(ray.alpha * 0.75 * sunIntensity).toFixed(3)})`);
        rGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      // Prismatic atmospheric rainbow halo + solar core (matching Cupertino Apple Weather reference)
      const coronaGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, haloR);
      coronaGrad.addColorStop(0, `rgba(255, 255, 255, ${(0.92 * sunIntensity).toFixed(3)})`);
      coronaGrad.addColorStop(0.11, `rgba(254, 249, 195, ${(0.58 * sunIntensity).toFixed(3)})`);
      coronaGrad.addColorStop(0.26, `rgba(253, 224, 71, ${(0.18 * sunIntensity).toFixed(3)})`);
      coronaGrad.addColorStop(0.52, `rgba(251, 191, 36, ${(0.08 * sunIntensity).toFixed(3)})`);
      coronaGrad.addColorStop(0.64, `rgba(165, 243, 252, ${(0.11 * sunIntensity).toFixed(3)})`);
      coronaGrad.addColorStop(0.74, `rgba(196, 181, 253, ${(0.08 * sunIntensity).toFixed(3)})`);
      coronaGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Drifting optical lens-flare bokeh circles descending from the sun
      const flareAngle = isMobile ? Math.PI * 0.44 : Math.PI * 0.39;
      const flareDrift = Math.sin(now * 0.00055) * 14;
      const maxAxis = Math.min(W, H) * 0.92;
      this.bokehFlares.forEach((bf, bIdx) => {
        const d = bf.dist * maxAxis + flareDrift * (bIdx * 0.35 + 0.5);
        const bx = sunX + Math.cos(flareAngle) * d;
        const by = sunY + Math.sin(flareAngle) * d;
        const br = bf.r * (isMobile ? 0.85 : 1.1);
        const bGrad = ctx.createRadialGradient(bx, by, br * 0.1, bx, by, br);
        bGrad.addColorStop(0, `rgba(${bf.rgb}, ${(bf.alpha * 0.55 * sunIntensity).toFixed(3)})`);
        bGrad.addColorStop(0.78, `rgba(${bf.rgb}, ${(bf.alpha * 1.15 * sunIntensity).toFixed(3)})`);
        bGrad.addColorStop(1, `rgba(${bf.rgb}, 0)`);
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 4. Multi-Layer Volumetric Drifting Clouds (Partly Cloudy, Overcast, Fog, Rain, Snow, Storm)
    if (!isClear) {
      const activeCloudCount = isPartlyCloudy ? 5 : 9;
      let cloudRgb = "255, 255, 255";
      let baseCloudAlpha = 0.14;
      if (isNight) {
        cloudRgb = isThunder || isRainy ? "71, 85, 105" : "148, 163, 184";
        baseCloudAlpha = isPartlyCloudy ? 0.11 : 0.16;
      } else if (isTwilight) {
        cloudRgb = "251, 207, 232";
        baseCloudAlpha = 0.16;
      } else if (isThunder) {
        cloudRgb = "100, 116, 139";
        baseCloudAlpha = 0.22;
      } else if (isOvercast || isRainy) {
        cloudRgb = "226, 232, 240";
        baseCloudAlpha = 0.19;
      } else if (isPartlyCloudy) {
        cloudRgb = "255, 255, 255";
        baseCloudAlpha = 0.22;
      }

      const cloudSpanW = W + 420;
      for (let i = 0; i < activeCloudCount; i++) {
        const c = this.clouds[i];
        const travel = ((c.xFrac + now * c.speedFrac) % 1.45) - 0.22;
        const cx = travel * cloudSpanW;
        const cy = c.yFrac * H + Math.sin(now * 0.0003 + i) * 8;
        const baseW = (isMobile ? 210 : 340) * c.scale;

        c.puffs.forEach((p) => {
          const px = cx + p.dx * baseW;
          const py = cy + p.dy * baseW * 0.45;
          const pr = p.r * baseW * 0.52;
          const pGrad = ctx.createRadialGradient(px, py - pr * 0.2, pr * 0.08, px, py, pr);
          pGrad.addColorStop(0, `rgba(${cloudRgb}, ${baseCloudAlpha.toFixed(3)})`);
          pGrad.addColorStop(0.55, `rgba(${cloudRgb}, ${(baseCloudAlpha * 0.52).toFixed(3)})`);
          pGrad.addColorStop(1, `rgba(${cloudRgb}, 0)`);
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    // 5. Dual-Layer Parallax Rain Streaks + Ambient Mist
    if (isRainy) {
      ctx.lineCap = "round";
      this.drops.forEach((d) => {
        ctx.strokeStyle = `rgba(186, 230, 253, ${d.alpha})`;
        ctx.lineWidth = d.width;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.windX, d.y + d.len);
        ctx.stroke();

        d.y += d.speed;
        d.x += d.windX * 0.48;
        if (d.y > H + 25) {
          d.y = -30;
          d.x = Math.random() * (W + 120);
        }
      });
    }

    // 6. Zeus Sheet Lightning + Branching Cloud-to-Sky Bolt in Thunderstorms
    if (isThunder) {
      if (now >= this.nextLightningAt) {
        this.lightningAlpha = 0.32;
        this.lightningBolt = this.buildLightningBolt(W, H);
        this.nextLightningAt = now + 4200 + Math.random() * 7200;
      }
      if (this.lightningAlpha > 0.006) {
        const boltX = this.lightningBolt?.[0]?.x ?? W * 0.5;
        const flashGrad = ctx.createRadialGradient(boltX, 0, 10, boltX, 0, H * 0.9);
        flashGrad.addColorStop(0, `rgba(254, 240, 138, ${this.lightningAlpha})`);
        flashGrad.addColorStop(0.42, `rgba(125, 211, 252, ${this.lightningAlpha * 0.7})`);
        flashGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, W, H);

        if (this.lightningBolt && this.lightningAlpha > 0.08) {
          ctx.save();
          ctx.strokeStyle = `rgba(254, 249, 195, ${Math.min(1, this.lightningAlpha * 2.4)})`;
          ctx.lineWidth = 2.2;
          ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
          ctx.shadowBlur = 14;
          ctx.beginPath();
          this.lightningBolt.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.restore();
        }
        this.lightningAlpha *= 0.86;
      }
    }

    // 7. 3-Layer Depth-of-Field Crystalline Snowflakes
    if (isSnowy) {
      this.flakes.forEach((f) => {
        f.y += f.speedY;
        f.x += Math.sin(now * 0.0013 + f.phase) * f.swayAmp;
        if (f.y > H + 12) {
          f.y = -12;
          f.x = Math.random() * W;
        }
        ctx.fillStyle = `rgba(240, 249, 255, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  },
};

/* Ambient Sky Refraction Controller (LG1 — Damped, Ultra-Subtle Ambient Drift) */
function setupLiquidGlassSheen() {
  let activeCard = null;
  let rafId = null;

  const updateSheen = (card, clientX, clientY) => {
    if (!card) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      // Heavily damp cursor offset toward natural top-center sky reflection (only 20% drift)
      const ambientX = rect.width * 0.5 + (rawX - rect.width * 0.5) * 0.2;
      const ambientY = rect.height * 0.14 + (rawY - rect.height * 0.14) * 0.2;
      card.style.setProperty("--sheen-x", `${ambientX.toFixed(0)}px`);
      card.style.setProperty("--sheen-y", `${ambientY.toFixed(0)}px`);
      card.style.setProperty("--sheen-opacity", "0.62");
    });
  };

  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      const card = e.target.closest(".liquid-glass");
      if (activeCard && activeCard !== card) {
        activeCard.style.setProperty("--sheen-opacity", "0.35");
      }
      activeCard = card;
      if (card) {
        updateSheen(card, e.clientX, e.clientY);
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerdown",
    (e) => {
      const card = e.target.closest(".liquid-glass");
      if (card) {
        if (activeCard && activeCard !== card) {
          activeCard.style.setProperty("--sheen-opacity", "0.35");
        }
        activeCard = card;
        updateSheen(card, e.clientX, e.clientY);
      }
    },
    { passive: true }
  );

  const clearActiveSheen = () => {
    if (activeCard) {
      activeCard.style.setProperty("--sheen-opacity", "0.35");
      activeCard = null;
    }
  };
  document.addEventListener("pointerup", clearActiveSheen, { passive: true });
  document.addEventListener("pointercancel", clearActiveSheen, { passive: true });
}

/* Native Mobile Bottom-Sheet Swipe-to-Dismiss Controller (M6) */
function bindSheetSwipeDismiss(sheetId, grabberId, closeFn) {
  const sheet = document.getElementById(sheetId);
  const grabber = document.getElementById(grabberId);
  if (!sheet) return;

  let startY = 0;
  let currentDY = 0;
  let dragging = false;

  const onTouchStart = (e) => {
    if (window.innerWidth > 640) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    if (
      sheetId === "radar-modal-sheet" &&
      e.target.closest(
        "#radar-modal-map-slot, #radar-map-frame, #zus-doppler-map, .leaflet-container, .radar-controls-bar, .radar-map-controls, .radar-modal-hud-footer, #radar-modal-close"
      )
    ) {
      return;
    }
    const isGrabber =
      (grabber && grabber.contains(e.target)) ||
      Boolean(e.target.closest(".sheet-grabber-bar, .tile-modal-header"));
    if (!isGrabber && sheet.scrollTop > 2) return;
    startY = touch.clientY;
    currentDY = 0;
    dragging = true;
    sheet.style.transition = "none";
  };

  const onTouchMove = (e) => {
    if (!dragging) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const dy = touch.clientY - startY;
    if (dy <= 0) {
      currentDY = 0;
      sheet.style.transform = "";
      return;
    }
    // Prevent native pull-to-refresh while dragging the sheet down
    if (e.cancelable) e.preventDefault();
    currentDY = Math.pow(dy, 0.92);
    sheet.style.transform = `translate3d(0, ${currentDY.toFixed(1)}px, 0)`;
  };

  const onTouchEnd = () => {
    if (!dragging) return;
    dragging = false;
    if (currentDY > 82) {
      closeFn();
    } else {
      sheet.style.transition = "transform 0.32s cubic-bezier(0.22, 1.25, 0.36, 1)";
      sheet.style.transform = "translate3d(0, 0, 0)";
    }
    currentDY = 0;
  };

  sheet.addEventListener("touchstart", onTouchStart, { passive: true });
  sheet.addEventListener("touchmove", onTouchMove, { passive: false });
  sheet.addEventListener("touchend", onTouchEnd, { passive: true });
  sheet.addEventListener("touchcancel", onTouchEnd, { passive: true });
}

function setupMobileBottomSheetSwipe() {
  bindSheetSwipeDismiss("tile-modal-sheet", "sheet-grabber-bar", closeTileDetailModal);
  bindSheetSwipeDismiss("hour-modal-sheet", "hour-sheet-grabber-bar", closeHourDetailModal);
  bindSheetSwipeDismiss("radar-modal-sheet", "radar-sheet-grabber-bar", () =>
    dopplerRadarMap.closeModal()
  );
}

/* City Search (Compact Desktop Pill + On-Click Recents + Keyboard Navigation) */
function setupCitySearch() {
  const input = document.getElementById("city-search-input");
  const dropdown = document.getElementById("search-dropdown");
  if (!input || !dropdown) return;

  let debounceTimer = null;
  let currentItems = [];
  let activeIndex = -1;

  const closeDropdown = () => {
    dropdown.classList.remove("open");
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  };

  const updateHighlight = () => {
    const rows = dropdown.querySelectorAll(".search-result-item[data-index]");
    rows.forEach((row) => {
      const idx = Number(row.dataset.index);
      const isAct = idx === activeIndex;
      row.classList.toggle("is-active", isAct);
      row.setAttribute("aria-selected", isAct ? "true" : "false");
    });
  };

  const selectLocationItem = (loc) => {
    if (!loc) return;
    state.location = {
      name: loc.name,
      region: loc.region || "",
      latitude: loc.latitude,
      longitude: loc.longitude,
    };
    input.value = "";
    closeDropdown();
    toggleMobileSearch(false);
    input.blur();
    saveRecentSearch(state.location);
    loadWeatherForCurrentLocation();
  };

  const getFilteredRecents = () =>
    state.recentSearches
      .filter((loc) => {
        const sameCoords =
          Math.abs(loc.latitude - state.location.latitude) < 0.05 &&
          Math.abs(loc.longitude - state.location.longitude) < 0.05;
        const sameName =
          (loc.name || "").trim().toLowerCase() ===
          (state.location.name || "").trim().toLowerCase();
        return !sameCoords && !sameName;
      })
      .slice(0, 4);

  const renderRecentsDropdown = () => {
    currentItems = getFilteredRecents();
    dropdown.innerHTML = "";
    if (!currentItems.length) {
      closeDropdown();
      return;
    }

    if (activeIndex >= currentItems.length) activeIndex = currentItems.length - 1;
    if (activeIndex < 0) activeIndex = 0;

    const header = document.createElement("div");
    header.className = "dropdown-section-header";
    header.innerHTML = `
      <span>Recent</span>
      <span class="kbd-hint"><span class="kbd-badge">↑</span><span class="kbd-badge">↓</span> <span class="kbd-badge">↵</span></span>
    `;
    dropdown.appendChild(header);

    currentItems.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result-item" + (idx === activeIndex ? " is-active" : "");
      btn.dataset.index = String(idx);
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", idx === activeIndex ? "true" : "false");

      btn.innerHTML = `
        <div class="result-left">
          <svg class="result-kind-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="12 7 12 12 15 15"></polyline>
          </svg>
          <span class="search-result-name">${item.name}</span>
        </div>
        <div class="result-right">
          <span class="search-result-meta">${sanitizeRegionString(item.region)}</span>
          <span class="recent-remove-btn" data-remove="1" title="Remove from recents" aria-label="Remove ${item.name} from recents">&times;</span>
        </div>
      `;

      btn.addEventListener("mouseenter", () => {
        activeIndex = idx;
        updateHighlight();
      });

      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      btn.addEventListener("click", (e) => {
        if (e.target.closest("[data-remove]")) {
          e.stopPropagation();
          removeRecentSearch(item.latitude, item.longitude);
          renderRecentsDropdown();
          return;
        }
        selectLocationItem(item);
      });

      dropdown.appendChild(btn);
    });

    dropdown.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  };

  const renderSearchResultsDropdown = (results) => {
    dropdown.innerHTML = "";
    if (!results.length) {
      currentItems = [];
      activeIndex = -1;
      dropdown.innerHTML = `<div class="search-result-item"><span class="search-result-meta">No matching locations</span></div>`;
      dropdown.classList.add("open");
      input.setAttribute("aria-expanded", "true");
      return;
    }

    currentItems = results.map((item) => {
      const dropdownMeta = [item.admin1, item.country].filter(Boolean).join(", ");
      const rawAdmin = normalizeStateLabel(item.admin1);
      const countryLabel = cleanCountryName(item.country) || item.country_code || "";
      const stateCode =
        rawAdmin && rawAdmin.toLowerCase() !== String(item.name || "").trim().toLowerCase()
          ? rawAdmin
          : countryLabel || rawAdmin || "";
      const firstZip =
        Array.isArray(item.postcodes) && item.postcodes.length
          ? String(item.postcodes[0]).trim()
          : "";
      const kickerRegion = [stateCode, firstZip].filter(Boolean).join(" • ");
      return {
        name: item.name,
        region: kickerRegion || stateCode,
        meta: dropdownMeta,
        latitude: item.latitude,
        longitude: item.longitude,
      };
    });

    activeIndex = 0;

    const header = document.createElement("div");
    header.className = "dropdown-section-header";
    header.innerHTML = `
      <span>Locations</span>
      <span class="kbd-hint"><span class="kbd-badge">↑</span><span class="kbd-badge">↓</span> <span class="kbd-badge">↵</span></span>
    `;
    dropdown.appendChild(header);

    currentItems.forEach((loc, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result-item" + (idx === activeIndex ? " is-active" : "");
      btn.dataset.index = String(idx);
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", idx === activeIndex ? "true" : "false");

      btn.innerHTML = `
        <div class="result-left">
          <svg class="result-kind-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span class="search-result-name">${loc.name}</span>
        </div>
        <div class="result-right">
          <span class="search-result-meta">${loc.meta}</span>
        </div>
      `;

      btn.addEventListener("mouseenter", () => {
        activeIndex = idx;
        updateHighlight();
      });

      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      btn.addEventListener("click", () => {
        selectLocationItem(loc);
      });

      dropdown.appendChild(btn);
    });

    dropdown.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  };

  input.addEventListener("focus", () => {
    if (input.value.trim().length < 2) {
      renderRecentsDropdown();
    }
  });

  input.addEventListener("click", () => {
    if (!dropdown.classList.contains("open")) {
      if (input.value.trim().length < 2) {
        renderRecentsDropdown();
      }
    }
  });

  input.addEventListener("input", () => {
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    if (q.length < 2) {
      activeIndex = 0;
      renderRecentsDropdown();
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
        renderSearchResultsDropdown(data.results || []);
      } catch (_) {
        closeDropdown();
      }
    }, 200);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!dropdown.classList.contains("open")) {
        if (input.value.trim().length < 2) {
          renderRecentsDropdown();
        }
        return;
      }
      if (currentItems.length > 0) {
        activeIndex = (activeIndex + 1) % currentItems.length;
        updateHighlight();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!dropdown.classList.contains("open")) {
        if (input.value.trim().length < 2) {
          renderRecentsDropdown();
        }
        return;
      }
      if (currentItems.length > 0) {
        activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
        updateHighlight();
      }
    } else if (e.key === "Enter") {
      if (dropdown.classList.contains("open") && currentItems.length > 0) {
        e.preventDefault();
        const chosen = currentItems[activeIndex >= 0 ? activeIndex : 0];
        if (chosen) selectLocationItem(chosen);
      }
    } else if (e.key === "Escape") {
      if (dropdown.classList.contains("open")) {
        e.preventDefault();
        e.stopPropagation();
        closeDropdown();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      closeDropdown();
    }
    if (
      window.innerWidth <= 640 &&
      !e.target.closest(".top-nav")
    ) {
      toggleMobileSearch(false);
    }
  });
}

/* Automatic & Manual GPS Location Acquisition */
function acquireUserLocation(isAutoStartup = false) {
  if (!navigator.geolocation) {
    return;
  }

  const btn = document.getElementById("locate-me-btn");
  if (!isAutoStartup) {
    btn.textContent = "Locating...";
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const sameAsCurrent =
        Math.abs((state.location?.latitude ?? 999) - latitude) < 0.02 &&
        Math.abs((state.location?.longitude ?? 999) - longitude) < 0.02;
      const hasValidZip = /\b[A-Z0-9]{3,10}\b/i.test(
        (sanitizeRegionString(state.location?.region).split("•")[1] || "").trim()
      );

      if (isAutoStartup && sameAsCurrent && hasValidZip) {
        return;
      }

      let cityName = "Current Location";
      let region = "";
      try {
        const rev = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (rev.ok) {
          const info = await rev.json();
          cityName = info.city || info.locality || "Current Location";
          region = resolveReverseGeocodeRegion(info, cityName);
        }
      } catch (_) {}

      state.location = { name: cityName, region, latitude, longitude };
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg> GPS`;
      saveRecentSearch(state.location);
      loadWeatherForCurrentLocation();
    },
    () => {
      btn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg> GPS`;
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/* Setup Interactive Controls */
function setupControls() {
  document
    .getElementById("locate-me-btn")
    .addEventListener("click", () => {
      toggleMobileSearch(false);
      acquireUserLocation(false);
    });

  const mobileSearchToggleBtn = document.getElementById("mobile-search-toggle-btn");
  const mobileSearchCloseBtn = document.getElementById("mobile-search-close-btn");
  if (mobileSearchToggleBtn) {
    mobileSearchToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileSearch();
    });
  }
  const mobileNavLocBtn = document.getElementById("mobile-nav-location");
  if (mobileNavLocBtn) {
    mobileNavLocBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileSearch();
    });
  }
  if (mobileSearchCloseBtn) {
    mobileSearchCloseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMobileSearch(false);
    });
  }

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
    const hourModal = document.getElementById("hour-detail-modal");
    if (hourModal && !hourModal.hasAttribute("hidden")) {
      renderHourDetailModalContent();
    }
    dopplerRadarMap.renderTelemetryStrip(dopplerRadarMap.telemetry);
  });

  // 24-Hour Timeline Metric Dropdown (Top Chart)
  const topMetricDropdown = document.getElementById("hourly-metric-dropdown");
  bindMetricDropdown(topMetricDropdown, state.hourlyMode || "temp", (mode) => {
    state.hourlyMode = mode;
    if (state.weather) {
      renderHourlyTimeline(state.weather.hourly);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".metric-selector-dropdown")) {
      closeAllMetricDropdowns();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllMetricDropdowns();
    }
  });

  window.addEventListener(
    "resize",
    () => {
      syncRadarCardHeight();
      const scroll = document.getElementById("hourly-scroll");
      const targetColW =
        window.innerWidth <= 640 ? getMobileHourlyColWidth(scroll) : 74;
      if (
        scroll &&
        scroll._curveState &&
        scroll._curveState.colW !== targetColW &&
        state.weather?.hourly
      ) {
        renderHourlyTimeline(state.weather.hourly);
      }
    },
    { passive: true }
  );

  setupLiquidGlassSheen();
  setupMobileBottomSheetSwipe();

  // App-Like Interactive Tiles -> Open Detail Modal Sheet
  document.querySelectorAll(".interactive-tile[data-tile]").forEach((tile) => {
    const tileType = tile.dataset.tile;
    tile.addEventListener("click", () => openTileDetailModal(tileType));
    tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openTileDetailModal(tileType);
      }
    });
  });

  // Modal Close Controls
  const modalCloseBtn = document.getElementById("tile-modal-close");
  const modalDoneBtn = document.getElementById("tile-modal-done-btn");
  const modalBackdrop = document.getElementById("tile-detail-modal");
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeTileDetailModal);
  if (modalDoneBtn) modalDoneBtn.addEventListener("click", closeTileDetailModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeTileDetailModal();
    });
  }

  // Hourly All-Pills Detail Modal Controls (Prev / Next / Close / Keyboard)
  const hourModalBackdrop = document.getElementById("hour-detail-modal");
  const hourModalCloseBtn = document.getElementById("hour-modal-close");
  const hourModalDoneBtn = document.getElementById("hour-modal-done-btn");
  const hourPrevBtn = document.getElementById("hour-modal-prev");
  const hourNextBtn = document.getElementById("hour-modal-next");

  if (hourModalCloseBtn) hourModalCloseBtn.addEventListener("click", closeHourDetailModal);
  if (hourModalDoneBtn) hourModalDoneBtn.addEventListener("click", closeHourDetailModal);
  if (hourPrevBtn) hourPrevBtn.addEventListener("click", () => stepHourDetailModal(-1));
  if (hourNextBtn) hourNextBtn.addEventListener("click", () => stepHourDetailModal(1));
  if (hourModalBackdrop) {
    hourModalBackdrop.addEventListener("click", (e) => {
      if (e.target === hourModalBackdrop) closeHourDetailModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    const hourModalOpen =
      hourModalBackdrop && !hourModalBackdrop.hasAttribute("hidden");
    const radarModalOpen = Boolean(dopplerRadarMap.isModalOpen);
    if (e.key === "Escape") {
      toggleMobileSearch(false);
      if (radarModalOpen) {
        dopplerRadarMap.closeModal();
      } else if (hourModalOpen) {
        closeHourDetailModal();
      } else {
        closeTileDetailModal();
      }
      return;
    }
    if (radarModalOpen) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        dopplerRadarMap.stopPlay();
        dopplerRadarMap.stepFrame(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        dopplerRadarMap.stopPlay();
        dopplerRadarMap.stepFrame(1);
      } else if (e.key === " ") {
        e.preventDefault();
        dopplerRadarMap.togglePlay();
      }
      return;
    }
    if (hourModalOpen) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepHourDetailModal(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepHourDetailModal(1);
      }
    }
  });
}

/* Live Build Version Watcher — Force Refresh on Production/Staging Updates */
function initVersionUpdateWatcher() {
  const metaEl = document.querySelector('meta[name="zus-build-version"]');
  const currentVersion = metaEl ? metaEl.getAttribute("content") : null;
  if (!currentVersion || window.location.protocol === "file:") return;

  let checking = false;
  const checkForUpdate = async () => {
    if (checking) return;
    checking = true;
    try {
      const resp = await fetch(`./version.json?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      const remoteVersion = data && data.version ? String(data.version) : null;
      if (remoteVersion && remoteVersion !== currentVersion) {
        const lastForced = sessionStorage.getItem("zus_forced_reload_version");
        if (lastForced === remoteVersion) return;
        sessionStorage.setItem("zus_forced_reload_version", remoteVersion);

        // Revalidate the HTML document in browser HTTP cache before reloading
        try {
          await fetch(window.location.pathname || "/", {
            cache: "reload",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
            },
          });
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch (_) {}

        window.location.reload();
      }
    } catch (_) {
      // Ignore transient offline errors
    } finally {
      checking = false;
    }
  };

  // Check immediately on boot, when returning to the tab, and every 60s
  checkForUpdate();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdate();
    }
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      checkForUpdate();
    }
  });
  setInterval(checkForUpdate, 60000);
}

/* Boot ZüsCast */
document.addEventListener("DOMContentLoaded", () => {
  initVersionUpdateWatcher();
  renderLocationsStrip();
  setupCitySearch();
  setupControls();
  atmosphereCanvas.init();
  dopplerRadarMap.init();

  // Preload initial forecast and automatically request GPS coordinates
  loadWeatherForCurrentLocation();
  acquireUserLocation(true);
});
