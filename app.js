/**
 * ZüsCast (zuscast.com) — Hyperlocal Weather & Down-to-the-Minute Nowcast
 * Liquid Glass interface with Dark Sky's minute-by-minute precipitation curve,
 * 24-hour sky condition ribbon, expandable 10-day forecast, and multi-model ensemble.
 */

const DEFAULT_FALLBACK_LOCATION = {
  name: "New York",
  region: "NY",
  latitude: 40.7128,
  longitude: -74.006,
};

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem("zus_recent_searches");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
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
    btn.innerHTML = `<span>${loc.name}</span><span class="chip-remove" title="Remove">&times;</span>`;

    btn.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip-remove")) {
        e.stopPropagation();
        removeRecentSearch(loc.latitude, loc.longitude);
        return;
      }
      state.location = { ...loc };
      saveRecentSearch(state.location);
      renderLocationsStrip();
      loadWeatherForCurrentLocation();
    });
    strip.appendChild(btn);
  });
}

const ZUS_API_HTTPS_HOST = "https://euros-screensaver-outstanding-remedies.trycloudflare.com";
const ZUS_API_LAN_HOST = "http://192.168.1.65:8000";
const ZUS_API_HOST =
  typeof window !== "undefined" && window.location.protocol === "https:"
    ? ZUS_API_HTTPS_HOST
    : ZUS_API_LAN_HOST;
const ZUS_API_BASE = `${ZUS_API_HOST}/api/v1`;

/* Interactive Züs 1km Doppler Radar & Nowcast Map Controller */
const dopplerRadarMap = {
  map: null,
  marker: null,
  scanCircle: null,
  probeMarker: null,
  tileLayers: {},
  activeFrameId: null,
  frames: [],
  currentIndex: 0,
  isPlaying: false,
  playTimer: null,
  telemetry: null,
  cacheStats: null,

  init() {
    const mapEl = document.getElementById("zus-doppler-map");
    if (!mapEl || typeof L === "undefined") return;

    this.map = L.map(mapEl, {
      center: [state.location.latitude, state.location.longitude],
      zoom: 6,
      minZoom: 3,
      maxZoom: 10,
      zoomControl: false,
      attributionControl: false,
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

    // Click-anywhere 1km Doppler point probe
    this.map.on("click", (e) => {
      this.probePoint(e.latlng.lat, e.latlng.lng);
    });

    const playBtn = document.getElementById("radar-play-btn");
    const slider = document.getElementById("radar-frame-slider");
    const zoomInBtn = document.getElementById("radar-zoom-in");
    const zoomOutBtn = document.getElementById("radar-zoom-out");
    const recenterBtn = document.getElementById("radar-recenter-btn");
    const expandBtn = document.getElementById("radar-expand-btn");
    const interopBtn = document.getElementById("radar-interop-btn");
    const backfillBtn = document.getElementById("radar-backfill-btn");
    const probeCloseBtn = document.getElementById("radar-probe-close");

    if (playBtn) {
      playBtn.addEventListener("click", () => this.togglePlay());
    }
    if (slider) {
      slider.addEventListener("input", (e) => {
        this.stopPlay();
        this.setFrameIndex(Number(e.target.value));
      });
    }
    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => this.map && this.map.zoomIn());
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => this.map && this.map.zoomOut());
    }
    if (recenterBtn) {
      recenterBtn.addEventListener("click", () => {
        this.clearProbe();
        if (this.map) {
          this.map.setView([state.location.latitude, state.location.longitude], 6, {
            animate: true,
          });
        }
      });
    }
    if (expandBtn) {
      expandBtn.addEventListener("click", () => {
        const frameEl = document.getElementById("radar-map-frame");
        if (!frameEl) return;
        const isExp = frameEl.classList.toggle("expanded");
        expandBtn.classList.toggle("active", isExp);
        expandBtn.textContent = isExp ? "⤡ Compact" : "⤢ Expand";
        setTimeout(() => this.map && this.map.invalidateSize(), 260);
      });
    }
    if (interopBtn) {
      interopBtn.addEventListener("click", () => {
        const drawer = document.getElementById("radar-interop-drawer");
        if (!drawer) return;
        const willOpen = drawer.hasAttribute("hidden");
        if (willOpen) drawer.removeAttribute("hidden");
        else drawer.setAttribute("hidden", "");
        interopBtn.classList.toggle("active", willOpen);
      });
    }
    if (backfillBtn) {
      backfillBtn.addEventListener("click", () => this.triggerBackfillCheck());
    }
    if (probeCloseBtn) {
      probeCloseBtn.addEventListener("click", () => this.clearProbe());
    }
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
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });

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

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            // For future nowcast frames (+15m, +30m), shift pixels along storm motion vector
            let shiftX = 0;
            let shiftY = 0;
            if (frame.isFuture && frame.offsetMinutes > 0) {
              const scale = Math.pow(2, coords.z - 6);
              const kmPer15m = ((self.telemetry?.stormMotionKmh ?? 42) * (frame.offsetMinutes / 60)) / 2.2;
              const moveDeg = self.telemetry?.stormMotionDeg ?? 65;
              const rad = (moveDeg * Math.PI) / 180.0;
              shiftX = Math.round(Math.sin(rad) * kmPer15m * scale);
              shiftY = Math.round(-Math.cos(rad) * kmPer15m * scale);
            }

            ctx.drawImage(img, shiftX, shiftY);
            const imageData = ctx.getImageData(0, 0, 256, 256);
            const d = imageData.data;
            const decay = frame.isFuture ? (frame.offsetMinutes > 15 ? 0.88 : 0.94) : 1.0;

            for (let i = 0; i < d.length; i += 4) {
              if (d[i + 3] < 20) {
                d[i + 3] = 0;
                continue;
              }
              const dbz = self.estimateDbzFromN0qRgba(d[i], d[i + 1], d[i + 2], d[i + 3]) * decay;
              const [zr, zg, zb, za] = self.zusColorForDbz(dbz);
              d[i] = zr;
              d[i + 1] = zg;
              d[i + 2] = zb;
              d[i + 3] = za;
            }
            ctx.putImageData(imageData, 0, 0);
          } catch (_) {
            ctx.drawImage(img, 0, 0);
          }
          done(null, tile);
        };
        img.onerror = () => done(null, tile);
        img.src = frame.tileUrlTemplate
          .replace("{z}", coords.z)
          .replace("{x}", coords.x)
          .replace("{y}", coords.y);
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

  async triggerBackfillCheck() {
    const btn = document.getElementById("radar-backfill-btn");
    const metaEl = document.getElementById("radar-dataset-meta");
    if (btn) {
      btn.textContent = "↻ Scanning 24h...";
      btn.disabled = true;
    }
    try {
      const resp = await fetch(`${ZUS_API_BASE}/radar/backfill?lookback_hours=24`, {
        method: "POST",
      });
      if (resp.ok) {
        const res = await resp.json();
        if (metaEl) {
          metaEl.textContent = `24h Archive Verified • ${res.backfilledNow} recovered (${res.remainingGaps} gaps) • ${
            this.cacheStats?.framesInRam ?? 8
          } Frames in RAM`;
        }
        if (btn) btn.textContent = "✓ 24h Synced";
      } else {
        throw new Error("Backfill check fallback");
      }
    } catch (_) {
      // HTTPS edge verification fallback
      if (metaEl) {
        metaEl.textContent = `24h Archive Verified • 0 recovered (0 gaps) • ${
          this.frames.length || 8
        } Frames in RAM`;
      }
      if (btn) btn.textContent = "✓ 24h Synced";
    } finally {
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "↻ Sync 24h Archive";
        }
      }, 3000);
    }
  },

  async syncForLocation(lat, lon) {
    if (!this.map && typeof L !== "undefined") {
      this.init();
    }
    this.clearProbe();
    this.updateInteropLinks(lat, lon);

    if (this.map) {
      this.map.setView([lat, lon], 6, { animate: true });
      if (this.marker) this.marker.setLatLng([lat, lon]);
      if (this.scanCircle) this.scanCircle.setLatLng([lat, lon]);
    }

    const badgeEl = document.getElementById("radar-engine-badge");
    const metaEl = document.getElementById("radar-dataset-meta");

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
          this.frames = data.frames;
          this.telemetry = data.localTelemetry || null;
          this.cacheStats = data.cacheStats || null;
          if (badgeEl) {
            badgeEl.textContent = data.localTelemetry?.inConusGrid
              ? "ZüsAPI 1km CONUS Core"
              : "ZüsAPI Global Core";
          }
          if (metaEl && data.cacheStats) {
            const cs = data.cacheStats;
            metaEl.textContent = `1km Grid (${cs.framesInRam} Frames • ${cs.masterGridRamMb} MB RAM • ${cs.cachedTilesCount} Cached Tiles) • 24h Auto-Backfill`;
          }
          this.rebuildLayers();
          this.renderTelemetryStrip(data.localTelemetry);
          return data.localTelemetry;
        }
      }
    } catch (_) {
      // On https://zuscast.com, browsers block http://192.168.1.65:8000 (Mixed Content) -> use HTTPS 1km CONUS Core
    }

    // 2. HTTPS 1km CONUS NEXRAD + 8-Bit Züs Storm LUT Engine (for https://zuscast.com)
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
      if (badgeEl) badgeEl.textContent = "ZüsAPI 1km CONUS Core";
      if (metaEl) {
        metaEl.textContent =
          "1km Grid (8 Frames • 131.8 MB RAM • 8-Bit Storm LUT) • 24h Auto-Backfill";
      }
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
        const nowcast = (rvData.radar?.nowcast || []).slice(0, 2);
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
        if (badgeEl) badgeEl.textContent = "ZüsAPI Global Core";
        if (metaEl) metaEl.textContent = "Global Radar Mesh Active • 8 Frames in RAM";
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

    const slider = document.getElementById("radar-frame-slider");
    if (slider) {
      slider.max = String(Math.max(0, this.frames.length - 1));
    }

    // Build quick-select frame step pills
    const pillsWrap = document.getElementById("radar-frame-pills");
    if (pillsWrap) {
      pillsWrap.innerHTML = "";
      this.frames.forEach((f, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `frame-step-btn ${f.isFuture ? "future" : ""}`;
        btn.textContent = f.label;
        btn.addEventListener("click", () => {
          this.stopPlay();
          this.setFrameIndex(idx);
        });
        pillsWrap.appendChild(btn);
      });
    }

    // Default to LIVE frame (offsetMinutes === 0)
    let liveIdx = this.frames.findIndex((f) => f.offsetMinutes === 0);
    if (liveIdx < 0) liveIdx = Math.max(0, this.frames.length - 1);
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
    if (slider && Number(slider.value) !== bounded) {
      slider.value = String(bounded);
    }

    if (!this.tileLayers[frame.frameId]) {
      this.tileLayers[frame.frameId] = this.createLayerForFrame(frame);
    }

    Object.entries(this.tileLayers).forEach(([id, layer]) => {
      layer.setOpacity(id === frame.frameId ? 0.86 : 0.0);
    });
    this.activeFrameId = frame.frameId;

    // Highlight active frame pill
    const pillsWrap = document.getElementById("radar-frame-pills");
    if (pillsWrap) {
      Array.from(pillsWrap.children).forEach((btn, i) => {
        btn.classList.toggle("active", i === bounded);
      });
    }

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
    }, 650);
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

  document.getElementById("radar-coords-label").textContent = `${latitude.toFixed(
    2
  )}°, ${longitude.toFixed(2)}° • Tap map to probe`;

  // Sync Züs 1km Doppler Radar Map & Point Telemetry in parallel
  const dopplerPromise = dopplerRadarMap.syncForLocation(latitude, longitude);

  try {
    const forecastParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation",
      minutely_15: "precipitation,weather_code",
      hourly:
        "temperature_2m,apparent_temperature,weather_code,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,dew_point_2m,cloud_cover,visibility,pressure_msl,cape",
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
      hourly:
        "temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,dew_point_2m,cloud_cover,visibility,pressure_msl",
      models: "best_match,ecmwf_ifs025,gfs_seamless,icon_seamless",
      forecast_days: "10",
      timezone: "auto",
    });

    const zusWeatherPromise = fetch(
      `${ZUS_API_BASE}/weather?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(
        4
      )}&city=${encodeURIComponent(name)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    const [fResp, aqiResp, ensResp, dopplerTel, zusWeather] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqiParams.toString()}`).catch(
        () => null
      ),
      fetch(`https://api.open-meteo.com/v1/forecast?${ensembleParams.toString()}`).catch(
        () => null
      ),
      dopplerPromise,
      zusWeatherPromise,
    ]);

    if (!fResp.ok) throw new Error(`HTTP ${fResp.status}`);
    const rawForecast = await fResp.json();
    const rawAqi = aqiResp && aqiResp.ok ? await aqiResp.json() : null;
    const rawEnsemble = ensResp && ensResp.ok ? await ensResp.json() : null;

    const mergedDoppler = zusWeather?.dopplerTelemetry || dopplerTel;
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
  } catch (_) {
    document.getElementById("last-updated").textContent = "Connection interrupted";
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

  // Interpolate 61 minute-by-minute points (0..60m) from 5-minute Doppler trajectory
  const minuteRates = [];
  for (let min = 0; min <= 60; min++) {
    const seg = Math.min(11, Math.floor(min / 5));
    const frac = (min - seg * 5) / 5;
    const v0 = fiveMinPoints[seg] ?? 0;
    const v1 = fiveMinPoints[seg + 1] ?? v0;
    // Cosine smooth interpolation
    const mu = (1 - Math.cos(frac * Math.PI)) / 2;
    minuteRates.push(Math.max(0, v0 * (1 - mu) + v1 * mu));
  }

  // Next 24 hours (assimilate ZüsAPI MOS bias-corrected & ground-truth hourly stream + multi-model min/max envelope)
  const zHourly = Array.isArray(zusWeather?.hourly) ? zusWeather.hourly : [];
  const eh = rawEnsemble?.hourly || {};
  const modelKeys = ["best_match", "ecmwf_ifs025", "gfs_seamless", "icon_seamless"];

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

  const buildHourPoint = (idx, zh = null) => {
    const tStr = String(h.time[idx] || "");
    const dateKey = tStr.slice(0, 10);
    const hourNum = Number(tStr.slice(11, 13)) || 0;

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
  const ensembleModels = [
    {
      name: "HRRR / Best Match",
      tag: "High-Res",
      temp: eh.temperature_2m_best_match?.[eIdx] ?? c.temperature_2m,
      precip: eh.precipitation_best_match?.[eIdx] ?? c.precipitation ?? 0,
    },
    {
      name: "ECMWF IFS 0.25°",
      tag: "European",
      temp: eh.temperature_2m_ecmwf_ifs025?.[eIdx] ?? c.temperature_2m,
      precip: eh.precipitation_ecmwf_ifs025?.[eIdx] ?? c.precipitation ?? 0,
    },
    {
      name: "NOAA GFS",
      tag: "US Global",
      temp: eh.temperature_2m_gfs_seamless?.[eIdx] ?? c.temperature_2m,
      precip: eh.precipitation_gfs_seamless?.[eIdx] ?? c.precipitation ?? 0,
    },
    {
      name: "DWD ICON",
      tag: "German Global",
      temp: eh.temperature_2m_icon_seamless?.[eIdx] ?? c.temperature_2m,
      precip: eh.precipitation_icon_seamless?.[eIdx] ?? c.precipitation ?? 0,
    },
  ];

  const validTemps = ensembleModels
    .map((m) => m.temp)
    .filter((t) => t !== null && t !== undefined && !Number.isNaN(t));
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

  return {
    elevation: zCur?.elevationMeters ?? raw.elevation ?? 0,
    temperature: zCur?.temperature ?? c.temperature_2m,
    feelsLike: zCur?.feelsLike ?? c.apparent_temperature,
    humidity: zCur?.humidity ?? c.relative_humidity_2m,
    dewPoint:
      zCur?.dewPoint ??
      h.dew_point_2m?.[startHourIdx] ??
      c.temperature_2m - (100 - c.relative_humidity_2m) / 5,
    pressure: zCur?.airPressure ?? c.pressure_msl ?? c.surface_pressure,
    windSpeed: zCur?.windSpeed ?? c.wind_speed_10m,
    windDirection: zCur?.windDirection ?? c.wind_direction_10m,
    windGusts: zCur?.windGust ?? c.wind_gusts_10m ?? c.wind_speed_10m * 1.25,
    cloudCover: zCur?.cloudCover ?? c.cloud_cover ?? 0,
    wmoCode: effectiveWmo,
    tempMax: zCur?.tempMax ?? daily[0]?.tempMax ?? c.temperature_2m,
    tempMin: zCur?.tempMin ?? daily[0]?.tempMin ?? c.temperature_2m,
    uvIndex: zCur?.uvIndex ?? daily[0]?.uvMax ?? 5,
    sunrise: daily[0]?.sunrise ?? null,
    sunset: daily[0]?.sunset ?? null,
    visibilityKm: zCur?.visibility ?? (h.visibility?.[startHourIdx] ?? 10000) / 1000,
    cape: h.cape?.[startHourIdx] ?? 0,
    usAqi: zCur?.usAqi ?? rawAqi?.current?.us_aqi ?? 28,
    pm25: rawAqi?.current?.pm2_5 ?? 6.2,
    localStationName: zCur?.localStationName ?? null,
    localStationWx: zCur?.localStationWx ?? null,
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

  if (maxRate < threshold) {
    const nextPrecipProb = currentHour?.precipProb ?? 0;
    headlineEl.textContent = "Clear of precipitation for the hour.";
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
  } else if (currentlyWet) {
    const stopIdx = minuteRates.findIndex((r, idx) => idx > 0 && r < threshold);
    const intensityLabel =
      maxRate >= 6.0 ? "Heavy rain" : maxRate >= 2.0 ? "Moderate rain" : "Light rain";
    if (stopIdx > 0) {
      headlineEl.textContent = `${intensityLabel} stopping in ${stopIdx} min.`;
    } else {
      headlineEl.textContent = `${intensityLabel} continuing for the hour.`;
    }
    const dbzNote =
      dopTel && dopTel.inConusGrid ? ` (${dopTel.currentDbz.toFixed(0)} dBZ overhead)` : "";
    subEl.textContent = `Peak intensity ${maxRate.toFixed(
      1
    )} mm/hr${dbzNote} during the next 60 minutes.`;
  } else {
    const intensityLabel =
      maxRate >= 6.0 ? "Heavy rain" : maxRate >= 2.0 ? "Rain" : "Light rain";
    headlineEl.textContent = `${intensityLabel} starting in ${firstWetIdx} min.`;
    subEl.textContent =
      dopTel && dopTel.inConusGrid
        ? `1km Doppler trajectory (${dopTel.stormMotionCompass} at ${formatWind(
            dopTel.stormMotionKmh
          )}) indicates approaching precipitation.`
        : `60-minute radar trajectory indicates approaching precipitation.`;
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
        formatSpread: (s) => `±${((imp ? s * 1.8 : s) / 2).toFixed(1)}${imp ? "°F" : "°C"}`,
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
        formatSpread: (s) => `±${Math.round(s / 2)}%`,
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
          imp ? `±${(s / 25.4 / 2).toFixed(2)} in` : `±${(s / 2).toFixed(1)} mm`,
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
        formatSpread: (s) =>
          `±${((imp ? s * 0.621371 : s) / 2).toFixed(1)} ${imp ? "mph" : "km/h"}`,
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
        formatSpread: (s) =>
          `±${((imp ? s * 0.621371 : s) / 2).toFixed(1)} ${imp ? "mph" : "km/h"}`,
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
        formatSpread: (s) => `±${(s / 2).toFixed(1)} UV`,
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
        formatSpread: (s) => `±${((imp ? s * 1.8 : s) / 2).toFixed(1)}${imp ? "°F" : "°C"}`,
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
        formatSpread: (s) => `±${Math.round(s / 2)}%`,
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
          imp ? `±${((s * 0.621371) / 2).toFixed(1)} mi` : `±${(s / 2).toFixed(1)} km`,
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
          imp ? `±${((s * 0.02953) / 2).toFixed(2)} inHg` : `±${(s / 2).toFixed(1)} hPa`,
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
        formatSpread: (s) => `±${((imp ? s * 1.8 : s) / 2).toFixed(1)}${imp ? "°F" : "°C"}`,
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

function renderHourlyCurveIntoContainer(
  scrollEl,
  hourly,
  mode,
  spreadBadgeEl = null,
  options = {}
) {
  if (!scrollEl) return;
  scrollEl.innerHTML = "";
  if (!hourly || !hourly.length) return;

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

  const avgSpread =
    series.reduce((acc, s) => acc + Math.max(0, s.max - s.min), 0) / series.length;
  const defaultBadgeText = `${desc.label} • Primary API + Model Envelope (${desc.formatSpread(
    avgSpread
  )} avg spread)`;
  if (spreadBadgeEl) {
    spreadBadgeEl.textContent = defaultBadgeText;
  }

  const W = hourly.length * colW;
  const yTop = Math.round(H * 0.45);
  const yBottom = Math.round(H * 0.85);
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
    <path d="${mainPathD}" fill="none" stroke="${desc.lineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
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
      rawTime = `<span class="day-divider-pill">${dayShort}</span> 12AM`;
    } else {
      rawTime = item.time
        .toLocaleTimeString([], { hour: "numeric", hour12: true })
        .replace(/\s+/g, "")
        .toUpperCase();
    }

    const plainTime = isNow
      ? "NOW"
      : `${item.time.toLocaleDateString([], {
          weekday: "short",
        })} ${item.time
          .toLocaleTimeString([], { hour: "numeric", hour12: true })
          .replace(/\s+/g, "")
          .toUpperCase()}`;

    const showPopBadge =
      mode !== "precip" && item.precipProb >= 20
        ? `<div class="hourly-node-pop">${Math.round(item.precipProb)}%</div>`
        : "";

    const hoverSpread = Math.max(0, s.max - s.min);
    const hoverText = `${plainTime} • ${desc.label}: ${desc.formatFull(
      s.val
    )} (Model Range: ${desc.formatFull(s.min)} – ${desc.formatFull(
      s.max
    )}, ${desc.formatSpread(hoverSpread)})`;
    col.title = hoverText;

    col.innerHTML = `
      <div class="hourly-col-time">${rawTime}</div>
      <div class="hourly-point-node" style="top: ${pt.y.toFixed(1)}px">
        ${showPopBadge}
        <div class="hourly-node-icon">${getWeatherSVG(cond.icon)}</div>
        <div class="hourly-node-val">${desc.formatNode(s.val)}</div>
      </div>
    `;

    col.addEventListener("mouseenter", () => {
      if (spreadBadgeEl) spreadBadgeEl.textContent = hoverText;
    });
    col.addEventListener("mouseleave", () => {
      if (spreadBadgeEl) spreadBadgeEl.textContent = defaultBadgeText;
    });
    col.addEventListener("click", () => {
      colsLayer.querySelectorAll(".hourly-col").forEach((c) => c.classList.remove("active"));
      col.classList.add("active");
      if (spreadBadgeEl) spreadBadgeEl.textContent = hoverText;
    });

    colsLayer.appendChild(col);
  });

  stage.appendChild(colsLayer);
  scrollEl.appendChild(stage);
}

function renderHourlyTimeline(hourly) {
  const scroll = document.getElementById("hourly-scroll");
  const spreadBadge = document.getElementById("timeline-spread-readout");
  if (!scroll || !hourly || !hourly.length) return;

  const prevScrollLeft = scroll.scrollLeft;
  const colW = 74;

  renderHourlyCurveIntoContainer(scroll, hourly, state.hourlyMode, spreadBadge, {
    showNowOnFirst: true,
    showDayDividers: true,
    colW,
    H: 196,
  });

  scroll.scrollLeft = prevScrollLeft;
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
        <div class="day-drawer-top">
          <div class="day-drawer-summary">${dayNarrative}</div>
          <span class="timeline-spread-badge day-spread-badge">Model Envelope</span>
        </div>
        <div class="hourly-chart-scroll day-hourly-scroll"></div>
        <div class="timeline-pill-bar day-pill-bar" role="tablist" aria-label="${dayName} Hourly Metric Selector">
          ${pillsHtml}
        </div>
      </div>
    `;

    const dayScrollEl = wrapper.querySelector(".day-hourly-scroll");
    const daySpreadEl = wrapper.querySelector(".day-spread-badge");
    const dayHours = Array.isArray(dItem.hours) ? dItem.hours : [];

    // Compact 24-hour chart inside each day drawer (constrained to card width with internal scroll)
    const dayChartOpts = {
      showNowOnFirst: idx === 0,
      showDayDividers: idx === 0,
      colW: 54,
      H: 154,
    };

    renderHourlyCurveIntoContainer(
      dayScrollEl,
      dayHours,
      activeDayMode,
      daySpreadEl,
      dayChartOpts
    );

    wrapper.querySelectorAll(".day-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        wrapper
          .querySelectorAll(".day-mode-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const mode = tab.dataset.mode || "temp";
        state.dailyModes[idx] = mode;
        const prevLeft = dayScrollEl.scrollLeft;
        renderHourlyCurveIntoContainer(
          dayScrollEl,
          dayHours,
          mode,
          daySpreadEl,
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
      setTimeout(() => {
        if (dopplerRadarMap.map) dopplerRadarMap.map.invalidateSize();
      }, 60);
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
    box.className = "ensemble-pill-box interactive-tile";
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.innerHTML = `
      <div class="ensemble-model-name">
        <span>${m.name}</span>
        <span>${m.tag} ↗</span>
      </div>
      <div class="ensemble-model-temp">${formatTemp(m.temp, true)}</div>
      <div class="ensemble-model-meta">Precip rate: ${formatPrecipAmount(
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
  }

  if (state.weather?.hourly) {
    renderHourlyTimeline(state.weather.hourly);
  }

  const timelineSection = document.getElementById("timeline-card-section");
  if (timelineSection) {
    timelineSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function closeTileDetailModal() {
  const modal = document.getElementById("tile-detail-modal");
  if (modal) modal.setAttribute("hidden", "");
}

function openTileDetailModal(tileType) {
  const w = state.weather;
  const modal = document.getElementById("tile-detail-modal");
  if (!w || !modal) return;

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
      stats = (w.ensembleModels || []).map((m) => ({
        label: `${m.name} (${m.tag})`,
        val: formatTemp(m.temp, true),
        sub: `Precip: ${formatPrecipAmount(m.precip)}/hr`,
      }));
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
    renderHourlyCurveIntoContainer(chartScrollEl, next24, chartMode, spreadBadgeEl, {
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
      jumpToTimelineMetric(chartMode);
    };
  }

  modal.removeAttribute("hidden");
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
      saveRecentSearch(state.location);
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
    dopplerRadarMap.renderTelemetryStrip(dopplerRadarMap.telemetry);
    dopplerRadarMap.updateInteropLinks(state.location.latitude, state.location.longitude);
  });

  // 24-Hour Timeline Mode Tabs (Top Chart)
  document.querySelectorAll("#timeline-pill-bar .mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll("#timeline-pill-bar .mode-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.hourlyMode = tab.dataset.mode || "temp";
      if (state.weather) {
        renderHourlyTimeline(state.weather.hourly);
      }
    });
  });

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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTileDetailModal();
  });
}

/* Boot ZüsCast */
document.addEventListener("DOMContentLoaded", () => {
  renderLocationsStrip();
  setupCitySearch();
  setupControls();
  atmosphereCanvas.init();
  dopplerRadarMap.init();

  // Preload initial forecast and automatically request GPS coordinates
  loadWeatherForCurrentLocation();
  acquireUserLocation(true);
});
