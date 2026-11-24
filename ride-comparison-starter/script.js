// Ride Zero v2: real place search + real route distance + deep links.
// Free services used: Photon (place search) and OSRM demo server (route).
// Both are fine for testing; for a public launch use your own keys/servers.

const form = document.querySelector("#ride-form");
const results = document.querySelector("#results");
const resultGrid = document.querySelector("#result-grid");
const routeSummary = document.querySelector("#route-summary");
const actions = document.querySelector("#actions");
const routeNote = document.querySelector("#route-note");
const formError = document.querySelector("#form-error");

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function searchPlaces(q) {
  // bbox limits results to India
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&bbox=68.1,6.7,97.4,35.7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("search failed");
  const data = await res.json();
  return data.features.map((f) => {
    const p = f.properties;
    const parts = [p.name, p.street, p.district, p.city, p.state].filter(Boolean);
    return { label: [...new Set(parts)].join(", "), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
  });
}

function setupAutocomplete(input, list) {
  let timer;
  const close = () => { list.hidden = true; list.innerHTML = ""; };
  input.addEventListener("input", () => {
    delete input.dataset.lat; delete input.dataset.lon;
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 3) return close();
    timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(q);
        if (input.value.trim() !== q) return;
        list.innerHTML = places.map((p, i) => `<li role="option" data-i="${i}">${esc(p.label)}</li>`).join("");
        list.hidden = places.length === 0;
        list.querySelectorAll("li").forEach((li, i) => {
          li.addEventListener("mousedown", (e) => {
            e.preventDefault();
            input.value = places[i].label;
            input.dataset.lat = places[i].lat;
            input.dataset.lon = places[i].lon;
            close();
          });
        });
      } catch { close(); }
    }, 350);
  });
  input.addEventListener("blur", () => setTimeout(close, 150));
  input.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

setupAutocomplete(document.querySelector("#pickup"), document.querySelector("#pickup-list"));
setupAutocomplete(document.querySelector("#drop"), document.querySelector("#drop-list"));


// Use the browser's Geolocation API to fill pickup coordinates automatically.
// Geolocation requires user permission and a secure context (HTTPS or localhost).
const pickupInput = document.querySelector("#pickup");
const currentLocationButton = document.querySelector("#use-current-location");
const locationStatus = document.querySelector("#location-status");

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Reverse geocoding unavailable");
    const data = await response.json();
    const feature = data.features && data.features[0];
    if (!feature) return "My current location";
    const p = feature.properties || {};
    const parts = [p.name, p.street, p.suburb, p.city || p.town || p.village, p.state]
      .filter(Boolean);
    return [...new Set(parts)].join(", ") || "My current location";
  } catch {
    return "My current location";
  }
}

currentLocationButton.addEventListener("click", () => {
  locationStatus.textContent = "";
  if (!("geolocation" in navigator)) {
    locationStatus.textContent = "Location is not supported by this browser.";
    return;
  }

  currentLocationButton.disabled = true;
  currentLocationButton.textContent = "Finding your location…";
  locationStatus.textContent = "Please allow location access when your browser asks.";

  navigator.geolocation.getCurrentPosition(async (position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const label = await reverseGeocode(lat, lon);

    pickupInput.value = label;
    pickupInput.dataset.lat = String(lat);
    pickupInput.dataset.lon = String(lon);
    locationStatus.textContent = "Pickup location detected.";
    currentLocationButton.disabled = false;
    currentLocationButton.innerHTML = '<span aria-hidden="true">◎</span> Use my current location';
  }, (error) => {
    const messages = {
      1: "Location permission was denied. Allow it in your browser settings and try again.",
      2: "Your location could not be determined. Check GPS or network and retry.",
      3: "Location request timed out. Please try again."
    };
    locationStatus.textContent = messages[error.code] || "Unable to get your location. Please try again.";
    currentLocationButton.disabled = false;
    currentLocationButton.innerHTML = '<span aria-hidden="true">◎</span> Use my current location';
  }, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000
  });
});

function haversineKm(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

async function getRoute(a, b) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data.routes[0];
    return { km: route.distance / 1000, min: Math.round(route.duration / 60), approx: false, geo: route.geometry.coordinates.map(([x, y]) => [y, x]) };
  } catch {
    const km = haversineKm(a, b) * 1.3; // rough road factor
    return { km, min: Math.round((km / 25) * 60), approx: true };
  }
}

function uberLink(a, b) {
  const q = (k, v) => `${k}=${encodeURIComponent(v)}`;
  return "https://m.uber.com/ul/?action=setPickup&" + [
    q("pickup[latitude]", a.lat), q("pickup[longitude]", a.lon), q("pickup[nickname]", a.label),
    q("dropoff[latitude]", b.lat), q("dropoff[longitude]", b.lon), q("dropoff[nickname]", b.label),
  ].join("&");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;

  const pi = document.querySelector("#pickup");
  const di = document.querySelector("#drop");
  const vehicle = document.querySelector('input[name="vehicle"]:checked').value;

  if (!pi.dataset.lat || !di.dataset.lat) {
    formError.textContent = "Please pick both places from the suggestion list.";
    formError.hidden = false;
    return;
  }
  const a = { label: pi.value.trim(), lat: +pi.dataset.lat, lon: +pi.dataset.lon };
  const b = { label: di.value.trim(), lat: +di.dataset.lat, lon: +di.dataset.lon };

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  const route = await getRoute(a, b);
  btn.disabled = false;

  routeSummary.textContent = `${a.label} → ${b.label}`;
  // These are transparent planning assumptions, NOT official provider tariffs or live quotes.
  // Tune these ranges for your launch city after collecting verified fare samples.
  const estimateRates = {
    Bike: {
      Uber: { base: [20, 30], perKm: [5, 8] },
      Ola: { base: [20, 30], perKm: [5, 8] },
      Rapido: { base: [15, 25], perKm: [4, 7] }
    },
    Auto: {
      Uber: { base: [25, 35], perKm: [9, 13] },
      Ola: { base: [25, 35], perKm: [9, 13] },
      Rapido: { base: [20, 30], perKm: [8, 12] }
    },
    Car: {
      Uber: { base: [45, 65], perKm: [12, 17] },
      Ola: { base: [45, 65], perKm: [12, 18] },
      Rapido: { base: [40, 60], perKm: [11, 16] }
    }
  };
  const money = (n) => `₹${Math.round(n)}`;
  const estimateCard = (provider) => {
    const r = estimateRates[vehicle][provider];
    const low = r.base[0] + route.km * r.perKm[0];
    const high = r.base[1] + route.km * r.perKm[1];
    return `<article class="result-card fare-estimate-card">
      <div class="provider">${provider} · ${esc(vehicle)} estimate</div>
      <div class="price">${money(low)}–${money(high)}</div>
      <div class="result-meta">Indicative estimate only · ${money(r.base[0])}–${money(r.base[1])} base + ${money(r.perKm[0])}–${money(r.perKm[1])}/km</div>
      <div class="result-meta">Actual fare may change with city, traffic, waiting, demand, taxes and availability.</div>
    </article>`;
  };
  resultGrid.innerHTML = `
    <article class="result-card"><div class="provider">Route distance</div><div class="price">${route.km.toFixed(1)} km</div><div class="result-meta">${route.approx ? "Approximate road-distance fallback" : "Road distance from route service"}</div></article>
    <article class="result-card"><div class="provider">Estimated travel time</div><div class="price">~${route.min} min</div><div class="result-meta">Driving estimate; actual time depends on traffic</div></article>
    ${estimateCard("Uber")}
    ${estimateCard("Ola")}
    ${estimateCard("Rapido")}
    <article class="result-card estimate-disclaimer"><div class="provider">Important</div><div class="result-meta">These are Ride Zero's sample calculations, not prices received from Uber, Ola or Rapido. They are not live fares. Confirm the final price in the provider app before booking.</div></article>`;

  const copyText = `${a.label} → ${b.label}`;
  actions.innerHTML = `
    <a class="action-btn" href="${uberLink(a, b)}" target="_blank" rel="noopener">Open in Uber</a>
    <a class="action-btn" href="https://book.olacabs.com/" target="_blank" rel="noopener">Open Ola</a>
    <a class="action-btn" href="https://www.rapido.bike/" target="_blank" rel="noopener">Open Rapido</a>
    <a class="action-btn ghost" href="https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}" target="_blank" rel="noopener">View on Google Maps</a>
    <button class="action-btn ghost" type="button" id="copy-route">Copy route</button>`;
  document.querySelector("#copy-route").addEventListener("click", (e) => {
    navigator.clipboard?.writeText(copyText);
    e.target.textContent = "Copied!";
  });

  routeNote.textContent = "Ride Zero's Uber, Ola and Rapido prices are indicative estimates calculated from editable sample rates, not live provider quotes. Open each provider app to confirm the actual fare. Ride Zero is independent and not affiliated with these providers.";
  results.hidden = false;
  drawMap(a, b, route);
  saveRecent(a, b);
  results.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Scroll reveal for sections (respects reduced motion via CSS)
const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Loading state on the main button while the route is fetched
form.addEventListener("submit", () => { const b = form.querySelector("button[type=submit]"); if (b.disabled) b.firstChild.textContent = "Finding route… "; });

// Dark mode toggle (remembers choice)
const themeBtn = document.querySelector("#theme-toggle");
const paintTheme = () => { themeBtn.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙"; };
paintTheme();
themeBtn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch {}
  paintTheme();
});

// Route map (Leaflet + OpenStreetMap tiles)
let map, layer;
function drawMap(a, b, route) {
  if (!window.L) return;
  if (!map) {
    map = L.map("map", { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
  }
  if (layer) layer.remove();
  const pts = route.geo || [[a.lat, a.lon], [b.lat, b.lon]];
  layer = L.layerGroup([
    L.polyline(pts, { color: "#5a3df0", weight: 5, dashArray: route.geo ? null : "8 8" }),
    L.circleMarker([a.lat, a.lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#12c9a5", fillOpacity: 1 }).bindTooltip("Pickup"),
    L.circleMarker([b.lat, b.lon], { radius: 8, color: "#17124f", weight: 3, fillColor: "#ffb938", fillOpacity: 1 }).bindTooltip("Drop"),
  ]).addTo(map);
  setTimeout(() => { map.invalidateSize(); map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] }); }, 100);
}

// Recent searches (kept in this browser only)
const recentBox = document.querySelector("#recent");
const getRecent = () => { try { return JSON.parse(localStorage.getItem("recent") || "[]"); } catch { return []; } };
function saveRecent(a, b) {
  const list = [{ a, b }, ...getRecent().filter((r) => r.a.label !== a.label || r.b.label !== b.label)].slice(0, 3);
  try { localStorage.setItem("recent", JSON.stringify(list)); } catch {}
  showRecent();
}
function showRecent() {
  const list = getRecent();
  recentBox.innerHTML = list.length ? '<span class="recent-label">Recent routes</span>' : "";
  list.forEach((r) => {
    const chip = document.createElement("button");
    chip.type = "button"; chip.className = "chip";
    chip.textContent = `${r.a.label.split(",")[0]} → ${r.b.label.split(",")[0]}`;
    chip.title = `${r.a.label} → ${r.b.label}`;
    chip.addEventListener("click", () => {
      [["#pickup", r.a], ["#drop", r.b]].forEach(([sel, p]) => { const i = document.querySelector(sel); i.value = p.label; i.dataset.lat = p.lat; i.dataset.lon = p.lon; });
    });
    recentBox.appendChild(chip);
  });
}
showRecent();

// 3D scene: mouse parallax + replay
const scene = document.querySelector("#scene");
scene.addEventListener("mousemove", (e) => {
  const r = scene.getBoundingClientRect(), st = scene.querySelector(".stage");
  st.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 16 + "deg");
  st.style.setProperty("--rx", -((e.clientY - r.top) / r.height - 0.5) * 10 + "deg");
});
scene.addEventListener("mouseleave", () => { const st = scene.querySelector(".stage"); st.style.setProperty("--ry", "0deg"); st.style.setProperty("--rx", "0deg"); });
document.querySelector("#replay").addEventListener("click", () => { const st = scene.querySelector(".stage"); st.replaceWith(st.cloneNode(true)); });
