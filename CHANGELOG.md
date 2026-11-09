# Changelog

All notable changes to `zuscast.com` will be documented in this file.

## [v1.3.2] - 2026-11-09

### Press-and-Hold Radar Probe & Surface Weather Toast
- **Press-and-Hold (~500ms) Probe Gesture**: Updated the expanded radar modal so point probing triggers only on a stationary ~500ms press-and-hold rather than single or double taps. Single-tapping the map while a probe is active dismisses the probe toast and removes the marker pin.
- **Temp, Wind & Precipitation Status Popup (No `dBZ`)**: Updated the radar probe toast to display point **Temp** (`°F`/`°C`), **Wind** (`speed + compass direction`), and **Precipitation Status** (`Clear` or descriptive status + active rate in `in/hr` / `mm/hr`) without referencing `dBZ`.
