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
