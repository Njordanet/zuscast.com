# Changelog

All notable changes to `zuscast.com` will be documented in this file.

## [v1.5.1] - 2026-11-11

### Dry Overcast Sky Condition & Next-Hour Precipitation Calibration (`app.js`)
- **Confirmed Precipitation Rate Threshold (`app.js`)**:
  - Updated sky condition resolution so faint high-cloud radar echoes never override dry overcast or partly cloudy conditions unless surface stations or active precipitation rates confirm rain reaching the ground.

## [v1.5.0] - 2026-11-10

### Dedicated App Store Privacy Policy (`/privacy`) & Customer Support (`/support`) Pages
- **Standalone Privacy Policy & Terms (`/privacy`, `/privacy.html`)**: Published dedicated, plain-English Privacy Policy and Terms of Use pages covering ephemeral GPS usage, zero ad trackers, 100% on-device settings, and coarse-grid push notifications.
- **Standalone Customer Support & Help Center (`/support`, `/support.html`)**: Published dedicated Support Center with iOS 27 widget setup instructions, unit customization FAQ, and direct email support.

## [v1.4.1] - 2026-11-09

### Location-Tied Solar Ephemeris & Streamlined Telemetry Tile Sub-Captions (`app.js`)
- **Location-Local Sunrise/Sunset & Solar Progress (`app.js`)**:
  - Updated `solarMap`, the Sunrise/Sunset telemetry card, and the Solar detail modal to parse location-local ISO clock times (`YYYY-MM-DDTHH:MM`) directly without browser-timezone shifting, and computed `#solar-dot` progress in the selected city's local time (`utcOffsetSeconds`).
- **Streamlined Top-Level Tile Sub-Captions (`app.js`)**:
  - Simplified Wind, Humidity, Visibility, and Sunrise sub-captions to top-level summaries without cluttered secondary numbers.

## [v1.4.0] - 2026-11-09

### Full ZüsAPI Recursive Alignment Integration & Hourly Curve Icon Sync
- **End-to-End ZüsAPI Recursive Alignment (`app.js`)**:
  - Switched the 10-Day Forecast (`daily`), Multi-Model Ensemble (`ensembleModels`), Hourly Uncertainty Bounds (`computeBounds`), and all secondary telemetry (`uvIndex`, `cape`, `pm25`, `liftedIndex`) to consume ZüsAPI's Diurnal Harmonic MOS + Multi-Horizon RLS + IDERW Station Assimilation engine first.
  - Added dual-host resilience (`api.zuscast.com` + LAN fallback) and full dashboard re-rendering (`renderDashboard()`) when ZüsAPI completes after the initial fast-render window.
- **Header, Hourly Strip & Modal Icon Synchronization (`app.js`)**:
  - Anchored `hourly[0]` ("NOW") to the exact header state (`temperature`, `feelsLike`, `wmoCode`, `condition`, `isNight`, `solarPhase`, `cloudCover`) and prioritized local `h.time` timestamps for solar day/night icon resolution.
  - Updated `renderHourlyCurveIntoContainer` in-place morphing to refresh `.hourly-node-icon` SVGs on every update so hourly curve icons always match the header and hourly detail modal.

## [v1.3.3] - 2026-11-09

### Metric Selector Dropdown Stacking & Clipping Fix
- **10-Day & Hourly Metric Dropdown Stacking Order**: Fixed stacking context trapping on `.day-accordion`, `.day-drawer-inner`, and `.day-drawer-top` where sibling 10-day forecast temperature bars (`.daily-scale-lane` / `.daily-scale-bar`) rendered on top of the open metric selector menu.
- **Liquid Glass Menu Opacity & Elevation**: Elevated active dropdown containers (`.has-open-dropdown` / `:has(.metric-selector-dropdown.open)`) and refined `.metric-selector-menu` storm-navy glass opacity (`z-index: 200`) so underlying forecast bars never bleed through or clip the menu.

## [v1.3.2] - 2026-11-09

### Press-and-Hold Radar Probe & Surface Weather Toast
- **Press-and-Hold (~500ms) Probe Gesture**: Updated the expanded radar modal so point probing triggers only on a stationary ~500ms press-and-hold rather than single or double taps. Single-tapping the map while a probe is active dismisses the probe toast and removes the marker pin.
- **Temp, Wind & Precipitation Status Popup (No `dBZ`)**: Updated the radar probe toast to display point **Temp** (`°F`/`°C`), **Wind** (`speed + compass direction`), and **Precipitation Status** (`Clear` or descriptive status + active rate in `in/hr` / `mm/hr`) without referencing `dBZ`.
