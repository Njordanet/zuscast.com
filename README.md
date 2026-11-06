# ZüsCast (`zuscast.com`) ⚡️

**ZüsCast** ([https://zuscast.com](https://zuscast.com)) is the official web weather dashboard and convective lightning telemetry client for the **Züs** platform.

## Features
- **Live Global Weather & 10-Day Forecast**: Powered by Open-Meteo REST API with optional primary connection to a **ZüsAPI** backend (`/weather` & `/lightning`).
- **Zeus Lightning & Convective Instability Telemetry**: Real-time CAPE (J/kg), Lifted Index, storm threat classification (*Calm* → *Divine Wrath*), and an animated 50km strike radar.
- **Interactive Storm & Lightning Engine**: Fullscreen HTML5 canvas rendering atmospheric precipitation and branching lightning bolts (`⚡ Summon Bolt` & `⚡ Toggle Storm Mode`).
- **Sacred Presets & Global Search**: Instant switching between Mount Olympus, Athens, New York, Tokyo, London, and Reykjavik, plus global city search and GPS geolocation.

## Local Development
```bash
python3 -m http.server 8080
# Open http://localhost:8080
```
