# kiosk-nav

A simple navigation card for Home Assistant Lovelace dashboards. The component
loads the views from the current dashboard and renders them as large buttons
suited for kiosk screens or touch panels.

## Home Assistant Installation

1. Copy the entire `kiosk-nav` directory into the Home Assistant folder:

   ```text
   /config/www/kiosk-nav/
   ```

   After copying, these files should exist:

   ```text
   /config/www/kiosk-nav/kiosk-nav.js
   /config/www/kiosk-nav/kiosk-nav.css
   /config/www/kiosk-nav/kiosk-tweaks.js
   ```

2. Add the JavaScript file as a Lovelace resource in Home Assistant.

   Through the UI:

   ```text
   Settings -> Dashboards -> Resources -> Add Resource
   ```

   Values:

   ```text
   URL: /local/kiosk-nav/kiosk-nav.js
   Resource type: JavaScript module
   ```

   If you manage resources in YAML:

   ```yaml
   lovelace:
     resources:
       - url: /local/kiosk-nav/kiosk-nav.js
         type: module
   ```

3. Optional: add `kiosk-tweaks.js` as another Lovelace resource if you use
   Home Assistant in the Android app on a kiosk device.

   Through the UI, add a second resource:

   ```text
   URL: /local/kiosk-nav/kiosk-tweaks.js
   Resource type: JavaScript module
   ```

   YAML example:

   ```yaml
   lovelace:
     resources:
       - url: /local/kiosk-nav/kiosk-nav.js
         type: module
       - url: /local/kiosk-nav/kiosk-tweaks.js
         type: module
   ```

   This helper hides Home Assistant's `Add entity to` action in more-info
   dialogs when the Android app already provides native entity add-to actions.
   It is not required for the `custom:kiosk-nav` card itself.

4. Add the card to your dashboard as a manual card.

   In the dashboard UI:

   ```text
   Edit dashboard -> Add card -> Manual
   ```

   Paste this YAML into the manual card editor:

   ```yaml
   type: custom:kiosk-nav
   ```

5. Refresh the dashboard in your browser. If the card does not load right away,
   try a hard refresh or clear the browser cache.

The CSS file is not added as a separate resource. Keep `kiosk-nav.css` in the
same directory as `kiosk-nav.js`; the component resolves it relative to the
JavaScript module URL.

## Usage

The card does not require any configuration. Navigation items are read from the
views of the current Lovelace dashboard, including title, path, and icon.

After 5 minutes without user activity, the card automatically returns the
current dashboard to the first view. The delay is controlled by
`KioskNav.INACTIVITY_DELAY_MS` in `kiosk-nav.js`.

Minimal example:

```yaml
type: custom:kiosk-nav
```

## License

This project is released under the MIT License. See [LICENSE.md](LICENSE.md)
for details.
