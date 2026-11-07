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
  const code = US_STATE_CODES[cleaned.toLowerCase()];
  return code || cleaned;
}

function sanitizeRegionString(regionStr) {
  if (!regionStr) return "";
  return String(regionStr)
    .replace(/📍/g, "")
    .replace(/\bGPS\s+Hyperlocal\b/gi, "")
    .replace(/\bHyperlocal(?:\s+Forecast|\s+Telemetry)?\b/gi, "")
    .replace(/^[•\s,]+|[•\s,]+$/g, "")
    .replace(/\s*•\s*•\s*/g, " • ")
    .trim();
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
  tileLayers: {},
  _rawTilePromises: new Map(),
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

  init() {
    const mapEl = document.getElementById("zus-doppler-map");
    if (!mapEl || typeof L === "undefined") return;

    this.map = L.map(mapEl, {
      center: [state.location.latitude, state.location.longitude],
      zoom: this.baseZoom,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    // Keyless Esri World Dark Gray Base (works on localhost, file://, and production without API keys)
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        zIndex: 1,
      }
    ).addTo(this.map);

    // Transparent Esri World Dark Gray Reference labels layered above the Doppler radar tiles
    L.tileLayer(
      "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        zIndex: 350,
        opacity: 0.92,
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

    // In expanded modal: click anywhere to probe 1km Doppler grid. In inline card: click opens expanded modal.
    this.map.on("click", (e) => {
      if (!this.isModalOpen) {
        this.openModal();
      } else {
        this.probePoint(e.latlng.lat, e.latlng.lng);
      }
    });

    const frameEl = document.getElementById("radar-map-frame");
    const cardHeaderEl = document.getElementById("radar-card-header");
    const controlsBar = document.getElementById("radar-controls-bar");
    const mapControls = document.getElementById("radar-map-controls");
    const probeToast = document.getElementById("radar-probe-toast");
    const playBtn = document.getElementById("radar-play-btn");
    const slider = document.getElementById("radar-frame-slider");
    const zoomInBtn = document.getElementById("radar-zoom-in");
    const zoomOutBtn = document.getElementById("radar-zoom-out");
    const recenterBtn = document.getElementById("radar-recenter-btn");
    const probeCloseBtn = document.getElementById("radar-probe-close");
    const modalBackdrop = document.getElementById("radar-detail-modal");
    const modalCloseBtn = document.getElementById("radar-modal-close");

    // Prevent clicks/drags on floating controls from bubbling to map click or inline expand
    [controlsBar, mapControls, probeToast].forEach((el) => {
      if (!el) return;
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
      ["click", "pointerdown", "mousedown", "touchstart"].forEach((evt) => {
        el.addEventListener(evt, (e) => e.stopPropagation(), { passive: true });
      });
    });

    if (frameEl) {
      frameEl.addEventListener("click", (e) => {
        if (this.isModalOpen) return;
        if (e.target.closest("#radar-controls-bar") || e.target.closest("#radar-map-controls")) {
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
  },

  setMapInteractive(interactive) {
    if (!this.map) return;
    const handlers = [
      "dragging",
      "touchZoom",
      "doubleClickZoom",
      "scrollWheelZoom",
      "boxZoom",
      "keyboard",
    ];
    handlers.forEach((h) => {
      if (this.map[h]) {
        if (interactive) this.map[h].enable();
        else this.map[h].disable();
      }
    });
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

  openModal() {
    const modal = document.getElementById("radar-detail-modal");
    const sheet = document.getElementById("radar-modal-sheet");
    const modalSlot = document.getElementById("radar-modal-map-slot");
    const frameEl = document.getElementById("radar-map-frame");
    const titleEl = document.getElementById("radar-modal-title");
    if (!modal || !modalSlot || !frameEl) return;

    clearTimeout(this.modalCloseTimer);
    this.isModalOpen = true;

    if (titleEl && state.location) {
      titleEl.textContent = `${state.location.name} • Live Radar & 2h Nowcast`;
    }
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

    requestAnimationFrame(() => {
      if (this.map) this.map.invalidateSize();
    });
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 120);
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 340);
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
      this.map.invalidateSize();
      setTimeout(() => this.map && this.map.invalidateSize(), 120);
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
    if (dbz < 7.5) return [0, 0, 0, 0];
    if (dbz < 15.0) return [56, 189, 248, 125]; // Soft cyan mist
    if (dbz < 23.0) return [14, 165, 233, 168]; // Light rain sky blue
    if (dbz < 30.0) return [37, 99, 235, 198]; // Moderate electric blue
    if (dbz < 35.0) return [52, 211, 153, 215]; // Emerald-cyan transition
    if (dbz < 41.0) return [250, 204, 21, 232]; // Züs Storm Gold (#FACC15)
    if (dbz < 47.0) return [245, 158, 11, 240]; // Deep amber gold
    if (dbz < 54.0) return [239, 68, 68, 246]; // Crimson storm core
    return [217, 70, 239, 252]; // Electric violet hail core
  },

  loadRawTileImage(url) {
    if (this._rawTilePromises.has(url)) {
      return this._rawTilePromises.get(url);
    }
    const p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    this._rawTilePromises.set(url, p);
    if (this._rawTilePromises.size > 420) {
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

        (async () => {
          try {
            const maxTileIndex = Math.pow(2, coords.z) - 1;
            let shiftX = 0;
            let shiftY = 0;

            if (frame.isFuture && frame.offsetMinutes > 0) {
              const lat = state.location?.latitude ?? 39.0;
              const cosLat = Math.max(0.25, Math.cos((lat * Math.PI) / 180.0));
              const kmPerPixel = (40075.017 * cosLat) / (256 * Math.pow(2, coords.z));
              const speedKmh = Math.max(52.0, self.telemetry?.stormMotionKmh ?? 54.0);
              const distKm = speedKmh * (frame.offsetMinutes / 60.0);
              const moveDeg =
                self.telemetry?.stormMotionDeg ?? self.telemetry?.stormMotionDegrees ?? 68;
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
            ctx.putImageData(imageData, 0, 0);
          } catch (_) {}
          done(null, tile);
        })();

        return tile;
      },
    });

    return new GridLayerClass({
      opacity: 0,
      zIndex: 200,
      maxNativeZoom: 8,
      maxZoom: 10,
    });
  },

  async probePoint(lat, lon) {
    if (!this.map) return;
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
    const textEl = document.getElementById("radar-probe-text");
    const dbzLabelEl = document.getElementById("radar-stat-dbz-label");
    if (toastEl) toastEl.removeAttribute("hidden");
    if (textEl) {
      textEl.textContent = `Probing 1km grid at ${lat.toFixed(3)}°, ${lon.toFixed(3)}°...`;
    }

    let tel = null;
    try {
      const resp = await fetch(
        `${ZUS_API_BASE}/radar/point?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
      );
      if (resp.ok) {
        tel = await resp.json();
      }
    } catch (_) {
      // Fallback to HTTPS 1km NEXRAD tile sampling when on https://zuscast.com
    }

    if (!tel) {
      tel = await this.sampleHttpsNexradTelemetry(lat, lon);
    }

    if (tel && tel.inConusGrid) {
      if (dbzLabelEl) dbzLabelEl.textContent = "Probed Point";
      this.renderTelemetryStrip(tel);

      const rateStr = state.useImperial
        ? `${(tel.precipRateMmHr / 25.4).toFixed(2)} in/hr`
        : `${tel.precipRateMmHr.toFixed(1)} mm/hr`;
      if (textEl) {
        textEl.textContent = `📍 Probe (${lat.toFixed(2)}°, ${lon.toFixed(2)}°): ${tel.currentDbz.toFixed(
          1
        )} dBZ (${tel.intensityCategory}) • ${rateStr} • 35km Peak ${tel.maxDbzNearby.toFixed(
          0
        )} dBZ`;
      }
    } else if (textEl) {
      textEl.textContent = `📍 Probe (${lat.toFixed(2)}°, ${lon.toFixed(2)}°): Outside 1km CONUS grid`;
    }
  },

  clearProbe() {
    if (this.probeMarker && this.map) {
      this.map.removeLayer(this.probeMarker);
      this.probeMarker = null;
    }
    const toastEl = document.getElementById("radar-probe-toast");
    const dbzLabelEl = document.getElementById("radar-stat-dbz-label");
    if (toastEl) toastEl.setAttribute("hidden", "");
    if (dbzLabelEl) dbzLabelEl.textContent = "Overhead";
    this.renderTelemetryStrip(this.telemetry);
  },

  ensureTwoHourNowcastFrames(frames) {
    if (!Array.isArray(frames) || !frames.length) return frames;
    const liveFrame = frames.find((f) => f.offsetMinutes === 0) || frames[frames.length - 1];
    const baseTs = liveFrame?.timestamp || Math.floor(Date.now() / 1000);
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
          frameId: `nowcast_p${ft.offset}m`,
          timestamp: baseTs + ft.offset * 60,
          label: ft.label,
          offsetMinutes: ft.offset,
          isFuture: true,
          useZusCanvasLut: true,
          tileUrlTemplate:
            "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913/{z}/{x}/{y}.png",
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
      this.map.setView([lat, lon], this.baseZoom, { animate: true });
      if (this.marker) this.marker.setLatLng([lat, lon]);
      if (this.scanCircle) this.scanCircle.setLatLng([lat, lon]);
    }

    // 1. Try ZüsAPI 1km CONUS Master Grid & 8-Bit Storm Engine on panda first
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const resp = await fetch(
        `${ZUS_API_BASE}/radar/manifest?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.frames) && data.frames.length > 0) {
          const normalizedFrames = data.frames.map((f) => ({
            ...f,
            tileUrlTemplate:
              typeof f.tileUrlTemplate === "string" &&
              window.location.protocol === "https:" &&
              f.tileUrlTemplate.startsWith("http://")
                ? "https://" + f.tileUrlTemplate.slice("http://".length)
                : f.tileUrlTemplate,
          }));
          this.frames = this.ensureTwoHourNowcastFrames(normalizedFrames);
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

    // 2. HTTPS 1km CONUS NEXRAD + 8-Bit Züs Storm LUT Engine (with +2h in 15m steps)
    if (this.isConusLocation(lat, lon)) {
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
        tileUrlTemplate: `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q-900913${s.suffix}/{z}/{x}/{y}.png`,
      }));

      const httpsTel = await this.sampleHttpsNexradTelemetry(lat, lon);
      this.telemetry = httpsTel;
      this.rebuildLayers();
      this.renderTelemetryStrip(httpsTel);
      return httpsTel;
    }

    // 3. International Fallback outside CONUS: RainViewer public radar frames
    try {
      const rvResp = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (rvResp.ok) {
        const rvData = await rvResp.json();
        const host = rvData.host || "https://tilecache.rainviewer.com";
        const past = (rvData.radar?.past || []).slice(-6);
        const nowcast = rvData.radar?.nowcast || [];
        const combined = [...past, ...nowcast];
        const liveTs = past.length ? past[past.length - 1].time : Math.floor(Date.now() / 1000);

        this.frames = combined.map((f) => {
          const diffMin = Math.round((f.time - liveTs) / 60);
          return {
            frameId: `rv_${f.time}`,
            timestamp: f.time,
            label: diffMin === 0 ? "LIVE" : diffMin > 0 ? `+${diffMin}m` : `${diffMin}m`,
            offsetMinutes: diffMin,
            isFuture: diffMin > 0,
            tileUrlTemplate: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
          };
        });
        this.rebuildLayers();
        this.renderTelemetryStrip(null);
      }
    } catch (_) {}
    return null;
  },

  rebuildLayers() {
    if (!this.map) return;
    Object.values(this.tileLayers).forEach((layer) => {
      if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
    });
    this.tileLayers = {};

    let liveIdx = this.frames.findIndex((f) => f.offsetMinutes === 0);
    if (liveIdx < 0) liveIdx = Math.max(0, this.frames.length - 1);

    const slider = document.getElementById("radar-frame-slider");
    if (slider) {
      const maxIdx = Math.max(1, this.frames.length - 1);
      slider.max = String(maxIdx);
      const livePct = ((liveIdx / maxIdx) * 100).toFixed(1);
      slider.style.setProperty("--live-pct", `${livePct}%`);
    }

    this.setFrameIndex(liveIdx);
  },

  createLayerForFrame(frame) {
    if (frame.useZusCanvasLut) {
      return this.createZusCanvasLayer(frame).addTo(this.map);
    }
    return L.tileLayer(frame.tileUrlTemplate, {
      opacity: 0,
      zIndex: 200,
      maxNativeZoom: 8,
      maxZoom: 10,
    }).addTo(this.map);
  },

  setFrameIndex(idx) {
    if (!this.map || !this.frames.length) return;
    const bounded = Math.max(0, Math.min(this.frames.length - 1, idx));
    this.currentIndex = bounded;
    const frame = this.frames[bounded];

    const slider = document.getElementById("radar-frame-slider");
    if (slider) {
      if (Number(slider.value) !== bounded) {
        slider.value = String(bounded);
      }
      slider.classList.toggle("is-future", Boolean(frame.isFuture));
    }

    if (!this.tileLayers[frame.frameId]) {
      this.tileLayers[frame.frameId] = this.createLayerForFrame(frame);
    }

    Object.entries(this.tileLayers).forEach(([id, layer]) => {
      layer.setOpacity(id === frame.frameId ? 0.86 : 0.0);
    });
    this.activeFrameId = frame.frameId;

    const frameClock = frame.timestamp
      ? new Date(frame.timestamp * 1000).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

    const pillEl = document.getElementById("radar-frame-label");
    const timeEl = document.getElementById("radar-time-readout");
    if (pillEl) {
      pillEl.textContent = frame.isFuture
        ? `${frame.label} NOWCAST (${frameClock})`
        : frame.offsetMinutes === 0
        ? `LIVE (${frameClock})`
        : `${frame.label} (${frameClock})`;
      pillEl.classList.toggle("future", Boolean(frame.isFuture));
    }
    if (timeEl) {
      timeEl.textContent = frameClock ? `${frameClock} (${frame.label})` : frame.label;
      timeEl.classList.toggle("future", Boolean(frame.isFuture));
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
    // Pre-warm all frame layers so loop animation has zero lag
    this.frames.forEach((f) => {
      if (this.map && !this.tileLayers[f.frameId]) {
        this.tileLayers[f.frameId] = this.createLayerForFrame(f);
      }
    });
    this.isPlaying = true;
    const btn = document.getElementById("radar-play-btn");
    if (btn) btn.textContent = "❚❚";
    this.playTimer = setInterval(() => {
      const next = (this.currentIndex + 1) % this.frames.length;
      this.setFrameIndex(next);
    }, 620);
  },

  stopPlay() {
    this.isPlaying = false;
    const btn = document.getElementById("radar-play-btn");
    if (btn) btn.textContent = "▶";
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  },

  renderTelemetryStrip(tel) {
    const dbzEl = document.getElementById("radar-stat-dbz");
    const peakEl = document.getElementById("radar-stat-peak");
    const echoEl = document.getElementById("radar-stat-echo");
    const vecEl = document.getElementById("radar-stat-vector");
    if (!dbzEl || !peakEl || !echoEl || !vecEl) return;

    if (!tel || !tel.inConusGrid) {
      const precip = state.weather?.minuteRates?.[0] ?? 0;
      dbzEl.textContent = precip > 0.1 ? "Active Echo" : "0 dBZ (Clear)";
      peakEl.textContent = `${Math.round(state.weather?.hourly?.[0]?.precipProb ?? 0)}% PoP`;
      echoEl.textContent = precip > 0.1 ? "Overhead" : "Clear (35km)";
      vecEl.textContent = `${formatWind(state.weather?.windSpeed ?? 15)} ${compassDirection(
        state.weather?.windDirection ?? 240
      )}`;
      return;
    }

    dbzEl.textContent =
      tel.currentDbz > 0
        ? `${tel.currentDbz.toFixed(0)} dBZ (${tel.intensityCategory})`
        : "0 dBZ (Clear)";
    peakEl.textContent = `${tel.maxDbzNearby.toFixed(0)} dBZ (${tel.echoCoveragePercent.toFixed(0)}%)`;
    if (tel.nearestEchoKm !== null && tel.nearestEchoKm !== undefined) {
      const distStr = state.useImperial
        ? `${(tel.nearestEchoKm * 0.621371).toFixed(1)} mi`
        : `${tel.nearestEchoKm.toFixed(1)} km`;
      echoEl.textContent =
        tel.nearestEchoKm < 2.0 ? "Overhead Now" : `${distStr} ${tel.nearestEchoCompass || ""}`;
    } else {
      echoEl.textContent = "Clear (35km)";
    }
    vecEl.textContent = `${formatWind(tel.stormMotionKmh)} ${tel.stormMotionCompass}`;
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

  if (!/\b[A-Z0-9]{3,10}\b/i.test((cleanedRegion.split("•")[1] || "").trim())) {
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((info) => {
        if (!info) return;
        const admin = info.principalSubdivisionCode
          ? info.principalSubdivisionCode.replace(/^[A-Z]{2}-/i, "")
          : normalizeStateLabel(info.principalSubdivision) || info.countryName || "";
        const postcode = (info.postcode || "").trim();
        const resolvedRegion = [admin, postcode].filter(Boolean).join(" • ");
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
        "temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,dew_point_2m,cloud_cover,visibility,pressure_msl,cape,is_day",
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

    const fetchWithTimeout = (url, ms = 2200) => {
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

    const zusWeatherPromise = fetchWithTimeout(
      `${ZUS_API_BASE}/weather?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(
        4
      )}&city=${encodeURIComponent(name)}`,
      2200
    );

    const raceTimeout = (p, ms = 1600) =>
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
      raceTimeout(dopplerPromise, 1600),
      raceTimeout(zusWeatherPromise, 1600),
    ]);

    if (!fResp || !fResp.ok) throw new Error(`HTTP ${fResp ? fResp.status : "ERR"}`);
    const rawForecast = await fResp.json();
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

    // If dopplerPromise or zusWeatherPromise finished after the 1.6s fast-render budget, enrich seamlessly
    Promise.all([dopplerPromise.catch(() => null), zusWeatherPromise]).then(
      ([lateDoppler, lateZus]) => {
        const latestTel = lateZus?.dopplerTelemetry || lateDoppler;
        if (latestTel && latestTel !== mergedDoppler) {
          dopplerRadarMap.telemetry = latestTel;
          dopplerRadarMap.renderTelemetryStrip(latestTel);
          state.weather = parseWeatherData(
            rawForecast,
            rawAqi,
            rawEnsemble,
            latestTel,
            lateZus || zusWeather
          );
          if (state.weather) {
            renderNextHourNowcast(
              state.weather.minuteRates,
              state.weather.hourly?.[0],
              state.weather.minuteRatesMin,
              state.weather.minuteRatesMax
            );
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
  let startHourIdx = 0;
  if (Array.isArray(h.time)) {
    const found = h.time.findIndex((t) => new Date(t).getTime() >= nowMs - 3600000);
    if (found >= 0) startHourIdx = found;
  }

  // Extract 60-minute precipitation curve from minutely_15 blended with 1km Züs Doppler trajectory
  let startM15Idx = 0;
  if (Array.isArray(m15.time)) {
    const foundM15 = m15.time.findIndex((t) => new Date(t).getTime() >= nowMs - 900000);
    if (foundM15 >= 0) startM15Idx = foundM15;
  }

  const dopRates =
    dopplerTel && dopplerTel.inConusGrid && Array.isArray(dopplerTel.minuteRates60m)
      ? dopplerTel.minuteRates60m
      : [];
  const exact61Rates =
    dopplerTel && dopplerTel.inConusGrid && Array.isArray(dopplerTel.minuteByMinuteRates) && dopplerTel.minuteByMinuteRates.length >= 61
      ? dopplerTel.minuteByMinuteRates
      : null;

  // Build 13 5-minute trajectory steps (0..60m) blending 1km Züs Doppler with 15-min NWP model
  const fiveMinPoints = [];
  for (let s = 0; s <= 12; s++) {
    const m15Idx = startM15Idx + Math.min(4, Math.floor(s / 3));
    const mm15 = Number(m15.precipitation?.[m15Idx] ?? 0);
    const modelRate = mm15 * 4;
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
  const zHourly = Array.isArray(zusWeather?.hourly) ? zusWeather.hourly : [];
  const eh = rawEnsemble?.hourly || {};
  const em15 = rawEnsemble?.minutely_15 || {};
  const modelKeys = ["best_match", "ecmwf_ifs025", "gfs_seamless", "icon_seamless"];

  let startEm15Idx = startM15Idx;
  if (Array.isArray(em15.time)) {
    const foundEm15 = em15.time.findIndex((t) => new Date(t).getTime() >= nowMs - 900000);
    if (foundEm15 >= 0) startEm15Idx = foundEm15;
  }

  // Extract 61-minute per-model precipitation trajectories (0..60m) for the min/max estimation band
  const modelCheckpoints15m = {};
  for (const mk of modelKeys) {
    const arr15 = em15[`precipitation_${mk}`];
    const arrH = eh[`precipitation_${mk}`];
    const pts = [];
    for (let k = 0; k <= 4; k++) {
      const v15 = arr15?.[startEm15Idx + k];
      if (v15 !== null && v15 !== undefined && !Number.isNaN(Number(v15))) {
        pts.push(Math.max(0, Number(v15) * 4));
      } else {
        const h0 = Number(arrH?.[startHourIdx] ?? m15.precipitation?.[startM15Idx] * 4 ?? 0);
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

  const solarMap = {};
  if (Array.isArray(d.time)) {
    for (let i = 0; i < d.time.length; i++) {
      const dKey = String(d.time[i]);
      solarMap[dKey] = {
        rise: parseIsoHourFrac(d.sunrise?.[i], 6.25),
        set: parseIsoHourFrac(d.sunset?.[i], 18.5),
      };
    }
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

  const buildHourPoint = (idx, zh = null) => {
    const tStr = String(h.time[idx] || "");
    const dateKey = tStr.slice(0, 10);
    const hourNum = Number(tStr.slice(11, 13)) || 0;
    const minNum = Number(tStr.slice(14, 16)) || 0;
    const hourSolar = getSolarStateFor(
      dateKey,
      hourNum + minNum / 60,
      h.is_day?.[idx]
    );

    const temperature = Number(zh?.temperature ?? h.temperature_2m?.[idx] ?? c.temperature_2m ?? 0);
    const feelsLike = Number(zh?.feelsLike ?? h.apparent_temperature?.[idx] ?? temperature);
    const wmoCode = Number(zh?.wmoCode ?? h.weather_code?.[idx] ?? 0);
    const precipProb = Number(zh?.precipitationChance ?? h.precipitation_probability?.[idx] ?? 0);
    const precipMm = Number(zh?.precipMm ?? h.precipitation?.[idx] ?? 0);
    const windSpeed = Number(zh?.windSpeed ?? h.wind_speed_10m?.[idx] ?? 0);
    const windGusts = Number(
      zh?.windGusts ?? h.wind_gusts_10m?.[idx] ?? Math.max(windSpeed * 1.3, windSpeed + 4)
    );
    const uvIndex = Math.max(0, Number(zh?.uvIndex ?? h.uv_index?.[idx] ?? 0));
    const dewPoint = Number(zh?.dewPoint ?? h.dew_point_2m?.[idx] ?? temperature - 4);
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
      [...extractModelVals("temperature_2m", idx), zh?.tempMin, zh?.tempMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.1
    );
    const feelsB = computeBounds(
      feelsLike,
      [...extractModelVals("apparent_temperature", idx), zh?.feelsMin, zh?.feelsMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.3
    );
    const popB = computeBounds(
      precipProb,
      [
        ...extractModelVals("precipitation_probability", idx),
        zh?.precipProbMin,
        zh?.precipProbMax,
      ].filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v))),
      12,
      0,
      100
    );
    const prMmB = computeBounds(
      precipMm,
      [...extractModelVals("precipitation", idx), zh?.precipMmMin, zh?.precipMmMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      precipMm > 0.05 ? Math.max(0.25, precipMm * 0.35) : 0.12,
      0
    );
    const windB = computeBounds(
      windSpeed,
      [...extractModelVals("wind_speed_10m", idx), zh?.windMin, zh?.windMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      Math.max(2.5, windSpeed * 0.18),
      0
    );
    const gustB = computeBounds(
      windGusts,
      [...extractModelVals("wind_gusts_10m", idx), zh?.gustMin, zh?.gustMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      Math.max(3.8, windGusts * 0.2),
      0
    );
    const uvB = computeBounds(
      uvIndex,
      [...extractModelVals("uv_index", idx), zh?.uvMin, zh?.uvMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      uvIndex > 0.2 ? Math.max(0.4, uvIndex * 0.16) : 0.0,
      0,
      16
    );
    const dewB = computeBounds(
      dewPoint,
      [...extractModelVals("dew_point_2m", idx), zh?.dewMin, zh?.dewMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.0
    );
    const cloudB = computeBounds(
      cloudCover,
      [...extractModelVals("cloud_cover", idx), zh?.cloudMin, zh?.cloudMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      10,
      0,
      100
    );
    const visB = computeBounds(
      visibilityKm,
      [...extractModelVals("visibility", idx, 0.001), zh?.visMin, zh?.visMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      Math.max(1.2, visibilityKm * 0.14),
      0.1,
      40
    );
    const pressB = computeBounds(
      pressure,
      [...extractModelVals("pressure_msl", idx), zh?.pressMin, zh?.pressMax].filter(
        (v) => v !== null && v !== undefined && !Number.isNaN(Number(v))
      ),
      1.2,
      940,
      1060
    );

    return {
      time: new Date(h.time[idx]),
      dateKey,
      hourNum,
      isNight: hourSolar.isNight,
      solarPhase: hourSolar.solarPhase,
      wmoCode,
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
      windSpeed,
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
    };
  };

  // Build full 10-day hourly dataset (all 240 hours) + forward 10-day stream starting at current hour
  const allHourly = [];
  const totalHourLen = Array.isArray(h.time) ? h.time.length : 0;
  for (let idx = 0; idx < totalHourLen; idx++) {
    const zOffset = idx - startHourIdx;
    const zh = zOffset >= 0 && zOffset < zHourly.length ? zHourly[zOffset] : null;
    allHourly.push(buildHourPoint(idx, zh));
  }

  const hourly = allHourly.slice(startHourIdx);

  // 10-Day Forecast (each day includes its 24-hour slice for the expandable day chart)
  const daily = [];
  const dayLen = Math.min(d.time?.length || 0, 10);
  for (let i = 0; i < dayLen; i++) {
    const dayKey = String(d.time[i]);
    let dayHours =
      i === 0
        ? hourly.slice(0, 24)
        : allHourly.filter((pt) => pt.dateKey === dayKey);
    if (!dayHours.length) {
      dayHours = allHourly.slice(i * 24, (i + 1) * 24);
    }

    daily.push({
      date: new Date(`${d.time[i]}T12:00:00`),
      dateKey: dayKey,
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
      hours: dayHours,
    });
  }

  // Parse Multi-Model Ensemble (from hourly model arrays at current hour)
  const eIdx = Math.min(startHourIdx, 23);
  const rawEnsembleModels = [
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

  const validTemps = rawEnsembleModels
    .map((m) => m.temp)
    .filter((t) => t !== null && t !== undefined && !Number.isNaN(t));
  const meanTempC =
    validTemps.length > 0
      ? validTemps.reduce((acc, v) => acc + v, 0) / validTemps.length
      : c.temperature_2m ?? 0;
  const meanPop =
    rawEnsembleModels.reduce((acc, m) => acc + Number(m.precipProb ?? 0), 0) /
    rawEnsembleModels.length;

  const ensembleModels = rawEnsembleModels.map((m) => {
    const deltaC = Number(m.temp ?? meanTempC) - meanTempC;
    const popDiff = Math.abs(Number(m.precipProb ?? 0) - meanPop);
    const alignmentPct = Math.max(
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

  // Determine observed WMO weather code (assimilating ZüsAPI METAR/Doppler ground truth)
  let effectiveWmo = zCur?.observedWeatherCode ?? c.weather_code ?? 0;
  if (effectiveWmo < 51 && minuteRates[0] >= 0.15) {
    effectiveWmo = minuteRates[0] >= 4.0 ? 65 : minuteRates[0] >= 0.8 ? 61 : 51;
  }
  if (hourly.length > 0 && effectiveWmo >= 51 && hourly[0].wmoCode < 51) {
    hourly[0].wmoCode = effectiveWmo;
    hourly[0].precipProb = Math.max(hourly[0].precipProb, 80);
  }

  const currentHourPt = hourly[0] || null;
  const curTimeStr = String(c.time || h.time?.[startHourIdx] || "");
  const curDateKey = curTimeStr.slice(0, 10) || daily[0]?.dateKey || "";
  const curHourFrac = parseIsoHourFrac(curTimeStr, currentHourPt?.hourNum ?? 12);
  const currentSolar = getSolarStateFor(
    curDateKey,
    curHourFrac,
    c.is_day ?? h.is_day?.[startHourIdx]
  );

  const currentUv =
    c.uv_index ??
    currentHourPt?.uvIndex ??
    h.uv_index?.[startHourIdx] ??
    0;
  const currentVisKm =
    zCur?.visibility ??
    (c.visibility !== undefined && c.visibility !== null
      ? c.visibility / 1000
      : null) ??
    currentHourPt?.visibilityKm ??
    (h.visibility?.[startHourIdx] ?? 10000) / 1000;

  return {
    elevation: zCur?.elevationMeters ?? raw.elevation ?? 0,
    temperature: zCur?.temperature ?? c.temperature_2m ?? currentHourPt?.temperature ?? 0,
    feelsLike: zCur?.feelsLike ?? c.apparent_temperature ?? currentHourPt?.feelsLike ?? 0,
    humidity: zCur?.humidity ?? c.relative_humidity_2m ?? 50,
    dewPoint:
      zCur?.dewPoint ??
      c.dew_point_2m ??
      currentHourPt?.dewPoint ??
      h.dew_point_2m?.[startHourIdx] ??
      c.temperature_2m - (100 - c.relative_humidity_2m) / 5,
    pressure: zCur?.airPressure ?? c.pressure_msl ?? c.surface_pressure ?? currentHourPt?.pressure ?? 1013,
    windSpeed: zCur?.windSpeed ?? c.wind_speed_10m ?? currentHourPt?.windSpeed ?? 0,
    windDirection: zCur?.windDirection ?? c.wind_direction_10m ?? 0,
    windGusts:
      zCur?.windGust ??
      c.wind_gusts_10m ??
      currentHourPt?.windGusts ??
      (c.wind_speed_10m ?? 0) * 1.25,
    cloudCover: zCur?.cloudCover ?? c.cloud_cover ?? currentHourPt?.cloudCover ?? 0,
    wmoCode: effectiveWmo,
    isNight: currentSolar.isNight,
    solarPhase: currentSolar.solarPhase,
    localHourFrac: curHourFrac,
    tempMax: zCur?.tempMax ?? daily[0]?.tempMax ?? c.temperature_2m,
    tempMin: zCur?.tempMin ?? daily[0]?.tempMin ?? c.temperature_2m,
    uvIndex: currentUv,
    uvMaxToday: daily[0]?.uvMax ?? currentUv,
    sunrise: daily[0]?.sunrise ?? null,
    sunset: daily[0]?.sunset ?? null,
    visibilityKm: currentVisKm,
    cape: c.cape ?? h.cape?.[startHourIdx] ?? 0,
    usAqi: zCur?.usAqi ?? rawAqi?.current?.us_aqi ?? 28,
    pm25: rawAqi?.current?.pm2_5 ?? 6.2,
    localStationName: zCur?.localStationName ?? null,
    localStationWx: zCur?.localStationWx ?? null,
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
  document.body.classList.remove("is-loading");
  document.body.classList.remove(
    "sky-clear",
    "sky-overcast",
    "sky-rain",
    "sky-storm",
    "sky-phase-day",
    "sky-phase-twilight",
    "sky-phase-night"
  );
  const activeSky = skyClass || "sky-clear";
  const activePhase = ["day", "twilight", "night"].includes(solarPhase)
    ? solarPhase
    : "day";
  document.body.classList.add(activeSky, `sky-phase-${activePhase}`);

  // Sync iOS status bar theme-color meta tag to exact top sky background color for zero-blur crispness
  const themeMeta =
    document.getElementById("theme-color-meta") ||
    document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
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
    themeMeta.setAttribute("content", phaseMap[activeSky] || "#1d63b8");
  }

  if (wasLoading) {
    document.body.classList.add("tiles-entering");
    setTimeout(() => {
      if (dopplerRadarMap.map) dopplerRadarMap.map.invalidateSize();
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
      if (dopplerRadarMap.map) dopplerRadarMap.map.invalidateSize();
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

  const cond = conditionFromWMO(w.wmoCode);

  // Hero Card
  document.getElementById(
    "confidence-badge-text"
  ).textContent = `${w.confidencePct}% Model Agreement`;
  renderConfidenceTooltip(w);
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

  // Hero 4-Column Micro Strip
  document.getElementById("micro-wind").textContent = `${formatWind(
    w.windSpeed
  )} ${compassDirection(w.windDirection)}`;
  document.getElementById("micro-humidity").textContent = `${Math.round(w.humidity)}%`;
  document.getElementById("micro-dew").textContent = formatTemp(w.dewPoint);
  const uvVal = Math.round((w.uvIndex ?? 0) * 10) / 10;
  const uvCat =
    uvVal < 3 ? "Low" : uvVal < 6 ? "Mod" : uvVal < 8 ? "High" : uvVal < 11 ? "V.High" : "Ext";
  const microUvEl = document.getElementById("micro-uv");
  if (microUvEl) {
    microUvEl.textContent = `${uvVal} (${uvCat})`;
  }

  // Next-Hour Minute-by-Minute Nowcast
  renderNextHourNowcast(w.minuteRates, w.hourly[0]);

  // 24-Hour & 10-Day Hourly Timeline
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
  const windDotEl = document.getElementById("wind-dot");
  if (windDotEl) {
    windDotEl.style.left = `${Math.min(100, Math.max(4, (w.windSpeed / 65) * 100))}%`;
  }
  document.getElementById("detail-wind-dir").textContent = `Gusts to ${formatWind(
    w.windGusts
  )} from ${compassDirection(w.windDirection)} (${w.windDirection}°)`;

  document.getElementById("detail-humidity").textContent = `${Math.round(w.humidity)}%`;
  const humDotEl = document.getElementById("humidity-dot");
  if (humDotEl) {
    humDotEl.style.left = `${Math.min(100, Math.max(4, w.humidity))}%`;
  }
  document.getElementById("detail-dewpoint").textContent = `Dew point ${formatTemp(
    w.dewPoint
  )} — ${muggyDescription(w.dewPoint)}`;

  const visVal = state.useImperial
    ? `${(w.visibilityKm * 0.621371).toFixed(1)} mi`
    : `${w.visibilityKm.toFixed(1)} km`;
  document.getElementById("detail-visibility").textContent = visVal;
  const visDotEl = document.getElementById("vis-dot");
  if (visDotEl) {
    visDotEl.style.left = `${Math.min(100, Math.max(4, (w.visibilityKm / 16) * 100))}%`;
  }
  document.getElementById("detail-clouds").textContent = `Cloud cover: ${Math.round(
    w.cloudCover
  )}% • Elev: ${Math.round(w.elevation)}m`;

  if (w.sunrise && w.sunset) {
    const srDate = new Date(w.sunrise);
    const ssDate = new Date(w.sunset);
    const sr = srDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const ss = ssDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    document.getElementById("detail-sunrise").textContent = sr;
    document.getElementById(
      "detail-sunset"
    ).textContent = `Sunset ${ss} • CAPE ${Math.round(w.cape)} J/kg`;

    const solarDotEl = document.getElementById("solar-dot");
    if (solarDotEl) {
      const nowMs = Date.now();
      const spanMs = Math.max(1, ssDate.getTime() - srDate.getTime());
      const pct = ((nowMs - srDate.getTime()) / spanMs) * 100;
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
    headlineEl.textContent = "No precipitation for the hour.";
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

  if (currentlyWet) {
    const stopIdx = minuteRates.findIndex((r, idx) => idx > 0 && r < threshold);
    const intensityLabel =
      maxRate >= 6.0 ? "Heavy rain" : maxRate >= 2.0 ? "Moderate rain" : "Light rain";
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
      maxRate >= 6.0 ? "Heavy rain" : maxRate >= 2.0 ? "Rain" : "Light rain";
    headlineEl.textContent = `${intensityLabel} starting in ${firstWetIdx} min.`;
    if (subEl) {
      subEl.textContent =
        dopTel && dopTel.inConusGrid
          ? `1km Doppler trajectory (${dopTel.stormMotionCompass} at ${formatWind(
              dopTel.stormMotionKmh
            )}) indicates approaching precipitation.`
          : `60-minute radar trajectory indicates approaching precipitation.`;
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

      // Update node positions (animated via CSS spring transition) and labels
      hourly.forEach((item, idx) => {
        const col = cols[idx];
        const s = series[idx];
        const pt = mainPts[idx];
        const node = col.querySelector(".hourly-point-node");
        const valEl = col.querySelector(".hourly-node-val");
        const spreadEl = col.querySelector(".hourly-node-spread");
        const popEl = col.querySelector(".hourly-node-pop");

        if (node) node.style.top = `${pt.y.toFixed(1)}px`;
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
    const cond = conditionFromWMO(item.wmoCode);
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
      const topPillBar = document.getElementById("timeline-pill-bar");
      if (topPillBar) {
        topPillBar.querySelectorAll(".mode-tab").forEach((t) => {
          const isMatch = t.dataset.mode === newMode;
          t.classList.toggle("active", isMatch);
          if (isMatch && typeof t.scrollIntoView === "function") {
            t.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        });
        syncLiquidPillGlider(topPillBar);
      }
      if (state.weather?.hourly) {
        renderHourlyTimeline(state.weather.hourly);
      }
    },
  });

  scroll.scrollLeft = prevScrollLeft;
  syncLiquidPillGlider(document.getElementById("timeline-pill-bar"));

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
    const h = Math.round(dailyCard.getBoundingClientRect().height);
    if (h >= 380) {
      radarCard.style.setProperty("--radar-card-height", `${h}px`);
      if (dopplerRadarMap.map && !dopplerRadarMap.isModalOpen) {
        requestAnimationFrame(() => dopplerRadarMap.map.invalidateSize());
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
    const cond = conditionFromWMO(dItem.wmoCode);
    const dayName =
      idx === 0
        ? "TODAY"
        : dItem.date.toLocaleDateString([], { weekday: "short" }).toUpperCase();
    const rawLeftPct = ((dItem.tempMin - globalMin) / totalSpan) * 100;
    const rawWidthPct = ((dItem.tempMax - dItem.tempMin) / totalSpan) * 100;
    const widthPct = Math.min(100, Math.max(12, rawWidthPct));
    const leftPct = Math.min(100 - widthPct, Math.max(0, rawLeftPct));
    const precipPct = Math.round(dItem.precipProb ?? 0);

    // Start with all 10 days collapsed on load
    const wrapper = document.createElement("div");
    wrapper.className = "day-accordion";

    const dayNarrative = `${cond.label} throughout the day. High of ${formatTemp(
      dItem.tempMax,
      true
    )} and overnight low of ${formatTemp(dItem.tempMin, true)}.`;

    const activeDayMode = state.dailyModes[idx] || "temp";
    const pillsHtml = HOURLY_METRIC_PILLS.map(
      (p) =>
        `<button type="button" class="mode-tab day-mode-tab ${
          p.mode === activeDayMode ? "active" : ""
        }" data-mode="${p.mode}">${p.label}</button>`
    ).join("");

    wrapper.innerHTML = `
      <button type="button" class="daily-row-btn" aria-expanded="false">
        <div class="daily-day-col">
          <span class="daily-day">${dayName}</span>
          <span class="daily-precip${precipPct === 0 ? " is-zero" : ""}">${precipPct}%</span>
        </div>
        <div class="daily-icon">${getWeatherSVG(cond.icon)}</div>
        <div class="daily-scale-lane">
          <div class="daily-scale-track">
            <div class="daily-scale-bar" style="left: ${leftPct.toFixed(2)}%; width: ${widthPct.toFixed(2)}%">
              <span class="daily-min">${formatTemp(dItem.tempMin)}</span>
              <div class="daily-scale-pill"></div>
              <span class="daily-max">${formatTemp(dItem.tempMax)}</span>
            </div>
          </div>
        </div>
        <span class="day-chevron">▾</span>
      </button>
      <div class="day-drawer">
        <div class="day-drawer-inner">
          <div class="day-drawer-top">
            <div class="day-drawer-summary">${dayNarrative}</div>
          </div>
          <div class="hourly-chart-scroll day-hourly-scroll"></div>
          <div class="timeline-pill-bar day-pill-bar" role="tablist" aria-label="${dayName} Hourly Metric Selector">
            ${pillsHtml}
          </div>
        </div>
      </div>
    `;

    const dayScrollEl = wrapper.querySelector(".day-hourly-scroll");
    const dayPillBarEl = wrapper.querySelector(".day-pill-bar");
    const dayHours = Array.isArray(dItem.hours) ? dItem.hours : [];
    const fullDayLabel =
      idx === 0
        ? "Today"
        : dItem.date.toLocaleDateString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
          });

    // Compact 24-hour chart inside each day drawer (constrained to card width with internal scroll)
    const dayChartOpts = {
      showNowOnFirst: idx === 0,
      showDayDividers: idx === 0,
      colW: 54,
      H: 154,
      contextLabel: `10-Day Forecast • ${fullDayLabel}`,
      onSelectMode: (newMode) => {
        state.dailyModes[idx] = newMode;
        wrapper.querySelectorAll(".day-mode-tab").forEach((t) => {
          const isMatch = t.dataset.mode === newMode;
          t.classList.toggle("active", isMatch);
          if (isMatch && typeof t.scrollIntoView === "function") {
            t.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
          }
        });
        syncLiquidPillGlider(dayPillBarEl);
        const prevLeft = dayScrollEl.scrollLeft;
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

    wrapper.querySelectorAll(".day-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        wrapper
          .querySelectorAll(".day-mode-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        syncLiquidPillGlider(dayPillBarEl);
        const mode = tab.dataset.mode || "temp";
        state.dailyModes[idx] = mode;
        const prevLeft = dayScrollEl.scrollLeft;
        renderHourlyCurveIntoContainer(
          dayScrollEl,
          dayHours,
          mode,
          dayChartOpts
        );
        dayScrollEl.scrollLeft = prevLeft;
      });
    });

    const rowBtn = wrapper.querySelector(".daily-row-btn");
    rowBtn.addEventListener("click", () => {
      const willOpen = !wrapper.classList.contains("open");
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
      if (willOpen) {
        requestAnimationFrame(() => syncLiquidPillGlider(dayPillBarEl));
      }
    });

    list.appendChild(wrapper);
  });

  requestAnimationFrame(() => syncRadarCardHeight());
}

/* Render Multi-Model Sources Alignment Tooltip Popover */
function renderConfidenceTooltip(w) {
  if (!w || !w.ensembleModels) return;
  const spreadEl = document.getElementById("confidence-tooltip-spread");
  const summaryEl = document.getElementById("confidence-tooltip-summary");
  const meterFillEl = document.getElementById("confidence-meter-fill");
  const listEl = document.getElementById("confidence-sources-list");
  const groundEl = document.getElementById("confidence-tooltip-ground");
  if (!listEl) return;

  const spreadVal = state.useImperial ? w.spreadC * 1.8 : w.spreadC;
  const unit = state.useImperial ? "°F" : "°C";

  if (spreadEl) {
    spreadEl.textContent = `Spread ±${(spreadVal / 2).toFixed(1)}${unit}`;
  }
  if (summaryEl) {
    const tier =
      w.confidencePct >= 93
        ? "Tight consensus across all 4 NWP sources"
        : w.confidencePct >= 87
        ? "Strong alignment across 4 NWP sources"
        : "Moderate variance across 4 NWP sources";
    summaryEl.textContent = `${w.confidencePct}% agreement • ${tier}`;
  }
  if (meterFillEl) {
    meterFillEl.style.width = `${Math.max(10, Math.min(100, w.confidencePct))}%`;
  }
  if (groundEl) {
    groundEl.textContent = w.localStationName
      ? `Ground truth: ${w.localStationName} + NEXRAD`
      : "Assimilating 1km NEXRAD + METAR";
  }

  listEl.innerHTML = w.ensembleModels
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
      const windStr = formatWind(m.wind ?? w.windSpeed);

      return `
        <div class="confidence-source-row">
          <div class="confidence-source-top">
            <div class="confidence-source-name-wrap">
              <span class="confidence-source-name">${m.name}</span>
              <span class="confidence-source-tag">${m.tag}</span>
            </div>
            <div class="confidence-source-metrics">
              <span class="confidence-source-temp">${formatTemp(m.temp, true)}</span>
              <span class="confidence-source-delta ${toneClass}">${deltaLabel}</span>
            </div>
          </div>
          <div class="confidence-source-sub">
            <span>PoP ${pop}% &bull; Wind ${windStr}</span>
            <div class="confidence-source-bar-wrap">
              <div class="confidence-source-bar-track">
                <div class="confidence-source-bar-fill ${toneClass}" style="width: ${alignPct}%"></div>
              </div>
              <span class="confidence-source-pct">${alignPct}%</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function toggleConfidenceTooltip(forceState) {
  const btn = document.getElementById("confidence-pill-btn");
  const tooltip = document.getElementById("confidence-tooltip");
  const ensembleCard = document.querySelector(".ensemble-card");
  const heroCard = document.querySelector(".hero-card");
  if (!btn || !tooltip) return;

  const isCurrentlyOpen = !tooltip.hasAttribute("hidden");
  const nextOpen = typeof forceState === "boolean" ? forceState : !isCurrentlyOpen;

  if (nextOpen) {
    if (state.weather) renderConfidenceTooltip(state.weather);
    tooltip.removeAttribute("hidden");
    btn.setAttribute("aria-expanded", "true");
    if (ensembleCard) ensembleCard.classList.add("tooltip-open");
    if (heroCard) heroCard.classList.add("tooltip-open");
  } else {
    tooltip.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
    if (ensembleCard) ensembleCard.classList.remove("tooltip-open");
    if (heroCard) heroCard.classList.remove("tooltip-open");
  }
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

  const pillBar = document.getElementById("timeline-pill-bar");
  if (pillBar) {
    pillBar.querySelectorAll(".mode-tab").forEach((t) => {
      const isMatch = t.dataset.mode === targetMode;
      t.classList.toggle("active", isMatch);
      if (isMatch && typeof t.scrollIntoView === "function") {
        t.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    });
    syncLiquidPillGlider(pillBar);
  }

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

  const cond = conditionFromWMO(item.wmoCode);
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
  if (submetaEl) {
    submetaEl.innerHTML = `Feels like ${formatTemp(
      item.feelsLike,
      true
    )} &bull; PoP ${Math.round(item.precipProb)}% &bull; Wind ${formatWind(
      item.windSpeed
    )}`;
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
      kickerEl.textContent = "💧 HYGROMETER & COMFORT SCALE";
      titleEl.textContent = "Humidity & Dew Point";
      primaryEl.textContent = `${Math.round(w.humidity)}%`;
      badgeEl.textContent = muggyDescription(w.dewPoint);
      narrativeEl.textContent = `Dew point is a more direct measure of atmospheric moisture and human comfort than relative humidity. At ${formatTemp(
        w.dewPoint,
        true
      )}, conditions feel ${muggyDescription(w.dewPoint).toLowerCase()}.`;
      chartMode = "dew";
      jumpLabel = "View Dew Point on 10-Day Timeline ↗";
      stats = [
        { label: "Dew Point (2m)", val: formatTemp(w.dewPoint, true), sub: muggyDescription(w.dewPoint) },
        { label: "Relative Humidity", val: `${Math.round(w.humidity)}%`, sub: "Saturation ratio" },
        { label: "Apparent Temp", val: formatTemp(w.feelsLike, true), sub: "Heat index / wind chill" },
        { label: "Air Temperature", val: formatTemp(w.temperature, true), sub: "Dry-bulb reading" },
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
      const sr = w.sunrise
        ? new Date(w.sunrise).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "--:--";
      const ss = w.sunset
        ? new Date(w.sunset).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "--:--";
      let dayLenStr = "--";
      if (w.sunrise && w.sunset) {
        const diffMin = Math.round((new Date(w.sunset) - new Date(w.sunrise)) / 60000);
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
      kickerEl.textContent = "🔬 MULTI-MODEL NWP ENSEMBLE";
      titleEl.textContent = "HRRR • ECMWF • GFS • ICON";
      primaryEl.textContent = `${w.confidencePct}% Agreement`;
      badgeEl.textContent = `Spread ±${(spreadVal / 2).toFixed(1)}${unit}`;
      narrativeEl.textContent =
        "ZüsCast continuously computes the min–max envelope across NOAA HRRR 3km, ECMWF IFS 0.25°, NOAA GFS, and DWD ICON so you can see both the primary forecast and model uncertainty.";
      chartMode = "temp";
      jumpLabel = "View Full 10-Day Model Envelope ↗";
      stats = (w.ensembleModels || []).map((m) => {
        const deltaVal = state.useImperial ? (m.deltaC ?? 0) * 1.8 : m.deltaC ?? 0;
        const deltaLabel =
          Math.abs(deltaVal) < 0.15
            ? "Consensus"
            : `Δ ${deltaVal > 0 ? "+" : ""}${deltaVal.toFixed(1)}${unit}`;
        const alignPct = m.alignmentPct ?? w.confidencePct;
        const pop = Math.round(m.precipProb ?? 0);
        return {
          label: `${m.name} (${m.tag})`,
          val: `${formatTemp(m.temp, true)} • ${alignPct}%`,
          sub: `${deltaLabel} • PoP ${pop}% • ${formatPrecipAmount(m.precip)}/hr`,
        };
      });
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

  // Render structured sub-metrics breakdown cards
  if (statsGridEl) {
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
    const isGrabber = grabber && grabber.contains(e.target);
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
          const dropdownMeta = [item.admin1, item.country].filter(Boolean).join(", ");
          const stateCode = normalizeStateLabel(item.admin1) || item.country_code || item.country || "";
          const firstZip =
            Array.isArray(item.postcodes) && item.postcodes.length
              ? String(item.postcodes[0]).trim()
              : "";
          const kickerRegion = [stateCode, firstZip].filter(Boolean).join(" • ");
          btn.innerHTML = `
            <span class="search-result-name">${item.name}</span>
            <span class="search-result-meta">${dropdownMeta}</span>
          `;
          btn.addEventListener("click", () => {
            state.location = {
              name: item.name,
              region: kickerRegion || stateCode,
              latitude: item.latitude,
              longitude: item.longitude,
            };
            input.value = "";
            dropdown.classList.remove("open");
            toggleMobileSearch(false);
            saveRecentSearch(state.location);
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
          const admin = info.principalSubdivisionCode
            ? info.principalSubdivisionCode.replace(/^[A-Z]{2}-/i, "")
            : normalizeStateLabel(info.principalSubdivision) || info.countryName || "";
          const postcode = (info.postcode || "").trim();
          region = [admin, postcode].filter(Boolean).join(" • ");
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

  // 24-Hour Timeline Mode Tabs (Top Chart)
  const topPillBar = document.getElementById("timeline-pill-bar");
  document.querySelectorAll("#timeline-pill-bar .mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll("#timeline-pill-bar .mode-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      syncLiquidPillGlider(topPillBar);
      state.hourlyMode = tab.dataset.mode || "temp";
      if (state.weather) {
        renderHourlyTimeline(state.weather.hourly);
      }
    });
  });

  requestAnimationFrame(() => syncLiquidPillGlider(topPillBar));
  window.addEventListener(
    "resize",
    () => {
      syncLiquidPillGlider(topPillBar);
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
      document
        .querySelectorAll(".day-accordion.open .day-pill-bar")
        .forEach((bar) => syncLiquidPillGlider(bar));
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

  // Model Agreement Pill -> Toggle Sources Alignment Tooltip
  const confPillBtn = document.getElementById("confidence-pill-btn");
  const confWrap = document.getElementById("confidence-pill-wrap");
  const confMoreBtn = document.getElementById("confidence-tooltip-more-btn");
  if (confPillBtn) {
    confPillBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleConfidenceTooltip();
    });
  }
  if (confMoreBtn) {
    confMoreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleConfidenceTooltip(false);
      openTileDetailModal("ensemble");
    });
  }
  document.addEventListener("click", (e) => {
    if (confWrap && !confWrap.contains(e.target)) {
      toggleConfidenceTooltip(false);
    }
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
      toggleConfidenceTooltip(false);
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
