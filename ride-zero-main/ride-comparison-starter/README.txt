RIDE ZERO — STARTER WEBSITE

This is a front-end learning prototype built with plain HTML, CSS and JavaScript.

HOW TO RUN
1. Extract the ZIP file.
2. Open the extracted folder.
3. Double-click index.html to open it in Chrome or Edge.
   Better option: open the folder in VS Code and use the Live Server extension.

FILES
- index.html: website structure
- style.css: design and responsive layout
- script.js: place search (Photon), route distance/time (OSRM), and Uber/Rapido/Google Maps links

IMPORTANT
- v2: needs internet. Place search and routing use free public OpenStreetMap-based services meant for light testing; use your own keys/servers before a public launch.
- Fares are NOT shown yet (the old demo prices were removed).
- The fares in this prototype are fictional sample values.
- This project does NOT connect to Uber or Rapido.
- It does NOT book rides or fetch live driver availability.
- Do not scrape either provider's app or use private endpoints.
- Before showing real provider prices or booking rides, obtain the necessary written permissions and approved API/partner access.
- "Ride Zero" is a temporary working name; check domain and trademark availability before launch.

NEXT DEVELOPMENT STEP
Replace the demo fare data with a backend API that calls only authorized provider integrations. Keep provider API credentials on the server, never in browser JavaScript.


CURRENT LOCATION PICKUP
- Click "Use my current location" below the pickup field.
- Your browser will ask for location permission.
- If allowed, Ride Zero fills the pickup coordinates and attempts to show a readable place name.
- This works on HTTPS deployments (such as Vercel) or localhost. Browser geolocation usually will not work when opening index.html directly as a file.
- Location is used in the browser for the route search; this feature does not send it to a Ride Zero account or store it on a server.

FREE ESTIMATED FARES (IMPORTANT)
- The comparison screen now displays indicative Uber, Ola and Rapido fare ranges.
- These are Ride Zero calculations using sample base-fare and per-kilometre assumptions; they are NOT live provider quotes or official tariffs.
- To tune the sample assumptions for your launch city, edit the `estimateRates` object near the route-submit handler in `script.js`.
- Do not describe these prices as live fares. Confirm all real fares inside the provider apps.
- The public OSRM demo routing service is for reasonable/testing use and has no uptime guarantee. Review its usage policy before production traffic: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
