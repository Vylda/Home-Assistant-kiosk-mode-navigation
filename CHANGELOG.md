# Changelog

All notable changes to this project will be documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/)
and this project follows [Semantic Versioning](https://semver.org/).

## [1.1.2] - 2026-08-18

### Fixed

- Moved host style attribute updates out of the custom element constructor for stricter Android WebView compatibility.
- Fixed the missing-card-configuration error message.

## [1.1.1] - 2026-08-17

### Changed

- Moved drawer transition duration handling from CSS parsing to a JavaScript-provided custom property.

## [1.1.0] - 2026-08-17

### Added

- Bottom drawer navigation with a visible handle, animated open and close states, 50vh maximum height, and scrolling for larger dashboards.
- Outside-tap and Escape-key drawer closing.
- Configurable `--kiosk-nav-*` CSS custom properties for drawer layout, colors, opacity, animation, and sizing.
- Animated chevron flipping for the drawer handle.

### Fixed

- Console info alignment by preserving padded spacing in DevTools output.

## [1.0.0] - 2026-08-16

### Added

- Initial public release of the `kiosk-nav` component.
- Automatic loading of views from the current Lovelace dashboard.
- Navigation buttons with Home Assistant icon support.
- Active item highlighting based on the current URL.
- Separately loaded `kiosk-nav.css` stylesheet.
- Home Assistant installation documentation.
- MIT License.
