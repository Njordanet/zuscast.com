# Changelog

All notable changes to `zuscast.com` will be documented in this file.

## [v1.3.3] - 2026-11-09

### Metric Selector Dropdown Stacking & Clipping Fix
- **10-Day & Hourly Metric Dropdown Stacking Order**: Fixed stacking context trapping on `.day-accordion`, `.day-drawer-inner`, and `.day-drawer-top` where sibling 10-day forecast temperature bars (`.daily-scale-lane` / `.daily-scale-bar`) rendered on top of the open metric selector menu.
- **Liquid Glass Menu Opacity & Elevation**: Elevated active dropdown containers (`.has-open-dropdown` / `:has(.metric-selector-dropdown.open)`) and refined `.metric-selector-menu` storm-navy glass opacity (`z-index: 200`) so underlying forecast bars never bleed through or clip the menu.

## [v1.3.2] - 2026-11-09

### Press-and-Hold Radar Probe & Surface Weather Toast
- **Press-and-Hold (~500ms) Probe Gesture**: Updated the expanded radar modal so point probing triggers only on a stationary ~500ms press-and-hold rather than single or double taps. Single-tapping the map while a probe is active dismisses the probe toast and removes the marker pin.
- **Temp, Wind & Precipitation Status Popup (No `dBZ`)**: Updated the radar probe toast to display point **Temp** (`°F`/`°C`), **Wind** (`speed + compass direction`), and **Precipitation Status** (`Clear` or descriptive status + active rate in `in/hr` / `mm/hr`) without referencing `dBZ`.
