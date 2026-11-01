/**
 * Coordinates Puller - Main Application Logic
 * 100% Free Geospatial Tool
 */

// Application State
const state = {
  center: null,          // { lat, lng, displayName }
  centerMarker: null,
  polygons: [],          // Array of { id, name, radius, unit, geojson, bufferedGeojson, leafletLayer }
  results: [],           // Array of { id, name, type, lat, lng, distKm, distMi, address, leafletMarker }
  manualPinMode: false,
  nextPolyId: 1,
  nextResultId: 1
};

// DOM Elements
const centerInput = document.getElementById('centerInput');
const searchCenterBtn = document.getElementById('searchCenterBtn');
const locateMeBtn = document.getElementById('locateMeBtn');
const centerInfoPill = document.getElementById('centerInfoPill');
const centerCoordsText = document.getElementById('centerCoordsText');

const radiusVal = document.getElementById('radiusVal');
const radiusUnit = document.getElementById('radiusUnit');
const addCircleBtn = document.getElementById('addCircleBtn');
const clearPolysBtn = document.getElementById('clearPolysBtn');
const polygonsList = document.getElementById('polygonsList');

const chkBusinesses = document.getElementById('chkBusinesses');
const chkServices = document.getElementById('chkServices');
const chkHouses = document.getElementById('chkHouses');
const chkOffices = document.getElementById('chkOffices');
const bufferDistance = document.getElementById('bufferDistance');
const circleProximityMode = document.getElementById('circleProximityMode');
const circleCorridorMeters = document.getElementById('circleCorridorMeters');
const maxCoordsInput = document.getElementById('maxCoordsInput');
const ringOrderStrategy = document.getElementById('ringOrderStrategy');
const pullDataBtn = document.getElementById('pullDataBtn');
const pullStatus = document.getElementById('pullStatus');

const toggleManualPinBtn = document.getElementById('toggleManualPinBtn');
const modeBanner = document.getElementById('modeBanner');

const resultsCount = document.getElementById('resultsCount');
const filterResultsInput = document.getElementById('filterResultsInput');
const clearResultsBtn = document.getElementById('clearResultsBtn');
const resultsTbody = document.getElementById('resultsTbody');

const exportKmlBtn = document.getElementById('exportKmlBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportGeoJsonBtn = document.getElementById('exportGeoJsonBtn');
const copyAllCoordsBtn = document.getElementById('copyAllCoordsBtn');

// Initialize Map
const map = L.map('map', {
  center: [20, 0],
  zoom: 2,
  zoomControl: true
});

// Tile Layers (Free OSM, Satellite, and Google Tiles)
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
});

const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  attribution: '© Google Maps'
});

const googleRoads = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  attribution: '© Google Maps'
});

const esriSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles © Esri'
});

// Set default layer
googleHybrid.addTo(map);

// Add Layer Switcher
const baseLayers = {
  "Google Satellite Hybrid": googleHybrid,
  "Google Standard Roadmap": googleRoads,
  "OpenStreetMap (Standard)": osmLayer,
  "Esri World Satellite": esriSatellite
};

L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);
L.control.scale({ imperial: true, metric: true }).addTo(map);

// Layers Groups for cleanup
const polygonLayerGroup = L.layerGroup().addTo(map);
const resultsLayerGroup = L.layerGroup().addTo(map);

// --- 1. Center Coordinates & Search ---

function setCenter(lat, lng, label = null) {
  state.center = { lat, lng, displayName: label || `${lat.toFixed(6)}, ${lng.toFixed(6)}` };

  // Update center marker
  if (state.centerMarker) {
    state.centerMarker.setLatLng([lat, lng]);
  } else {
    const centerIcon = L.divIcon({
      className: 'custom-center-icon',
      html: '<div style="background:#ef4444; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 8px rgba(0,0,0,0.6);"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    state.centerMarker = L.marker([lat, lng], {
      icon: centerIcon,
      draggable: true
    }).addTo(map);

    state.centerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      setCenter(pos.lat, pos.lng, `Custom Position: ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
    });
  }

  state.centerMarker.bindPopup(`<b>Center Coordinate</b><br>${state.center.displayName}<br><small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small>`).openPopup();

  // Update UI text
  centerCoordsText.innerHTML = `<strong>Center:</strong> ${state.center.displayName} <br><span class="coord-cell">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>`;
  map.setView([lat, lng], Math.max(map.getZoom(), 14));
}

// Search Button Handler
searchCenterBtn.addEventListener('click', () => searchLocation(centerInput.value.trim()));
centerInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') searchLocation(centerInput.value.trim());
});

async function searchLocation(query) {
  if (!query) return;

  // Check if query is lat, lng
  const coordRegex = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  if (coordRegex.test(query)) {
    const [latStr, lngStr] = query.split(',').map(s => s.trim());
    setCenter(parseFloat(latStr), parseFloat(lngStr), `Coordinates: ${latStr}, ${lngStr}`);
    return;
  }

  showStatus('Searching location via free OpenStreetMap geocoder...', 'info');

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const item = data[0];
      setCenter(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
      showStatus('Center found and positioned!', 'success', 3000);
    } else {
      showStatus('Location not found. Try exact address, city, or "lat, lng".', 'error');
    }
  } catch (err) {
    showStatus('Geocoding search failed. Check your network.', 'error');
  }
}

// Current GPS Location
locateMeBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  showStatus('Detecting device location...', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCenter(pos.coords.latitude, pos.coords.longitude, 'Your Current Location');
      showStatus('Location set to current GPS coordinates.', 'success', 3000);
    },
    (err) => {
      showStatus('Could not get GPS location: ' + err.message, 'error');
    }
  );
});

// --- 2. Polygon & Circle Generator ---

const POLY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

addCircleBtn.addEventListener('click', () => {
  if (!state.center) {
    alert('Please set a center point first using search or by clicking on the map!');
    return;
  }

  const r = parseFloat(radiusVal.value);
  if (isNaN(r) || r <= 0) {
    alert('Please enter a valid positive radius.');
    return;
  }

  const unit = radiusUnit.value;
  createCirclePolygon(state.center.lat, state.center.lng, r, unit);
});

function createCirclePolygon(lat, lng, radius, unit) {
  // Convert unit to Turf unit & calculate normalized radius in km for ring sorting
  let turfUnit = 'kilometers';
  let radiusKm = radius;
  if (unit === 'miles') {
    turfUnit = 'miles';
    radiusKm = radius * 1.60934;
  } else if (unit === 'm') {
    turfUnit = 'meters';
    radiusKm = radius * 0.001;
  }

  // Generate circle GeoJSON using Turf
  const centerPoint = turf.point([lng, lat]);
  const circleGeoJSON = turf.circle(centerPoint, radius, { steps: 64, units: turfUnit });

  const polyId = state.nextPolyId++;
  const color = POLY_COLORS[(polyId - 1) % POLY_COLORS.length];
  const polyName = `Ring ${polyId} (${radius} ${unit})`;

  // Render on Leaflet
  const leafletLayer = L.geoJSON(circleGeoJSON, {
    style: {
      color: color,
      weight: 2.5,
      opacity: 0.9,
      fillColor: color,
      fillOpacity: 0.15
    }
  }).addTo(polygonLayerGroup);

  leafletLayer.bindPopup(`
    <div style="min-width: 170px;">
      <b>${polyName}</b><br>
      Radius: ${radius} ${unit}<br>
      <button class="btn btn-primary" style="margin-top:6px; padding:5px 8px; font-size:11px; width:100%; border-radius:4px; cursor:pointer;" onclick="pullForSpecificRing(${polyId})">
        <i class="fa-solid fa-cloud-arrow-down"></i> Pull Coords Near This Circle
      </button>
    </div>
  `);

  // Allow clicking inside polygon in manual pin mode
  leafletLayer.on('click', (e) => {
    if (state.manualPinMode) {
      L.DomEvent.stopPropagation(e);
      leafletLayer.closePopup();
      handleManualPinDrop(e.latlng);
    }
  });

  // Fit bounds to show newly created circle
  map.fitBounds(leafletLayer.getBounds(), { padding: [20, 20] });

  // Store in state
  const polyObj = {
    id: polyId,
    name: polyName,
    radius,
    radiusKm,
    unit,
    turfUnit,
    geojson: circleGeoJSON,
    leafletLayer,
    color,
    center: [lat, lng]
  };

  state.polygons.push(polyObj);
  renderPolygonsList();
}

function renderPolygonsList() {
  polygonsList.innerHTML = '';
  if (state.polygons.length === 0) {
    polygonsList.innerHTML = '<span class="hint">No active polygons. Click "Add Circle Polygon" above.</span>';
    return;
  }

  state.polygons.forEach((poly) => {
    const pill = document.createElement('div');
    pill.className = 'poly-pill';
    pill.style.borderLeftColor = poly.color;
    pill.innerHTML = `
      <span><strong>${poly.name}</strong></span>
      <div>
        <button title="Zoom into this polygon" onclick="zoomToPolygon(${poly.id})"><i class="fa-solid fa-eye"></i></button>
        <button title="Remove polygon" onclick="removePolygon(${poly.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    polygonsList.appendChild(pill);
  });
}

window.zoomToPolygon = function(id) {
  const p = state.polygons.find(x => x.id === id);
  if (p && p.leafletLayer) {
    map.fitBounds(p.leafletLayer.getBounds(), { padding: [25, 25] });
  }
};

window.removePolygon = function(id) {
  const idx = state.polygons.findIndex(x => x.id === id);
  if (idx !== -1) {
    polygonLayerGroup.removeLayer(state.polygons[idx].leafletLayer);
    state.polygons.splice(idx, 1);
    renderPolygonsList();
  }
};

clearPolysBtn.addEventListener('click', () => {
  state.polygons.forEach(p => polygonLayerGroup.removeLayer(p.leafletLayer));
  state.polygons = [];
  renderPolygonsList();
});

// --- 3. Pull Coordinates via Overpass API ---

pullDataBtn.addEventListener('click', async () => {
  if (state.polygons.length === 0) {
    alert('Please add at least one circle polygon before pulling data.');
    return;
  }

  const wantBusinesses = chkBusinesses.checked;
  const wantServices = chkServices.checked;
  const wantHouses = chkHouses.checked;
  const wantOffices = chkOffices.checked;

  if (!wantBusinesses && !wantServices && !wantHouses && !wantOffices) {
    alert('Please select at least one data type (Businesses, Services, Houses, or Offices).');
    return;
  }

  const bufferMeters = parseFloat(bufferDistance.value) || 0;
  const maxCoords = parseInt(maxCoordsInput.value) || 0;
  const ringStrategy = ringOrderStrategy ? ringOrderStrategy.value : 'roundrobin';

  await pullCoordinatesForPolygons(bufferMeters, { wantBusinesses, wantServices, wantHouses, wantOffices }, maxCoords, ringStrategy);
});

window.pullForSpecificRing = async function(id) {
  const poly = state.polygons.find(p => p.id === id);
  if (!poly) return;

  const wantBusinesses = chkBusinesses.checked;
  const wantServices = chkServices.checked;
  const wantHouses = chkHouses.checked;
  const wantOffices = chkOffices.checked;

  if (!wantBusinesses && !wantServices && !wantHouses && !wantOffices) {
    alert('Please select at least one data type (Businesses, Services, Houses, or Offices).');
    return;
  }

  const bufferMeters = parseFloat(bufferDistance.value) || 0;
  const maxCoords = parseInt(maxCoordsInput.value) || 0;
  const ringStrategy = ringOrderStrategy ? ringOrderStrategy.value : 'roundrobin';

  await pullCoordinatesForPolygons(bufferMeters, { wantBusinesses, wantServices, wantHouses, wantOffices }, maxCoords, ringStrategy, id);
};

async function pullCoordinatesForPolygons(bufferMeters, options, maxCoords, ringStrategy, targetPolyId = null) {
  showStatus('Preparing search queries for target polygons...', 'info');
  pullDataBtn.disabled = true;

  try {
    const activeList = targetPolyId ? state.polygons.filter(p => p.id === targetPolyId) : state.polygons;
    if (activeList.length === 0) {
      throw new Error('Target polygon not found.');
    }

    // 1. Sort polygons by normalized radius (smallest to largest)
    const sortedPolys = activeList.map((poly) => {
      let rKm = poly.radiusKm || poly.radius;
      if (!poly.radiusKm) {
        if (poly.unit === 'miles') rKm = poly.radius * 1.60934;
        else if (poly.unit === 'm') rKm = poly.radius * 0.001;
      }

      let searchPolyGeoJSON = poly.geojson;
      if (bufferMeters > 0) {
        searchPolyGeoJSON = turf.buffer(poly.geojson, bufferMeters / 1000, { units: 'kilometers' });
      }

      return {
        ...poly,
        radiusKm: rKm,
        searchPolyGeoJSON
      };
    }).sort((a, b) => a.radiusKm - b.radiusKm);

    // 2. Compute unified bounding box across all buffered polygons
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const poly of sortedPolys) {
      const bbox = turf.bbox(poly.searchPolyGeoJSON);
      minLng = Math.min(minLng, bbox[0]);
      minLat = Math.min(minLat, bbox[1]);
      maxLng = Math.max(maxLng, bbox[2]);
      maxLat = Math.max(maxLat, bbox[3]);
    }

    showStatus(`Querying Overpass API across ${sortedPolys.length} ring(s)...`, 'info');

    // 3. Build Overpass QL Query
    let queryParts = [];
    if (options.wantBusinesses) {
      queryParts.push(`node["shop"](${minLat},${minLng},${maxLat},${maxLng});`);
      queryParts.push(`node["amenity"~"restaurant|cafe|fast_food|bar|pub|supermarket|convenience"](${minLat},${minLng},${maxLat},${maxLng});`);
    }
    if (options.wantServices) {
      queryParts.push(`node["amenity"~"bank|pharmacy|fuel|clinic|hospital|dentist|veterinary|post_office|school|kindergarten|place_of_worship"](${minLat},${minLng},${maxLat},${maxLng});`);
    }
    if (options.wantOffices) {
      queryParts.push(`node["office"](${minLat},${minLng},${maxLat},${maxLng});`);
    }
    if (options.wantHouses) {
      queryParts.push(`node["addr:housenumber"](${minLat},${minLng},${maxLat},${maxLng});`);
      queryParts.push(`node["building"~"house|residential|apartments"](${minLat},${minLng},${maxLat},${maxLng});`);
    }

    const overpassQuery = `
      [out:json][timeout:35];
      (
        ${queryParts.join('\n')}
      );
      out body 2500;
    `;

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    let osmData = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: 'data=' + encodeURIComponent(overpassQuery),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        if (res.ok) {
          osmData = await res.json();
          break;
        }
      } catch (e) {
        console.warn(`Endpoint ${endpoint} failed, trying next...`);
      }
    }

    if (!osmData || !osmData.elements) {
      throw new Error('Overpass API returned empty or servers busy. Please try again in a few moments.');
    }

    // 4. Partition nodes into Ring Buckets (smallest ring first, then next ring excluding previous rings)
    const ringBuckets = sortedPolys.map(() => []);
    const seenCoordKeys = new Set();
    state.results.forEach(r => seenCoordKeys.add(`${r.lat.toFixed(5)},${r.lng.toFixed(5)}`));

    for (const el of osmData.elements) {
      const ptLat = el.lat;
      const ptLng = el.lon;
      if (!ptLat || !ptLng) continue;

      const coordKey = `${ptLat.toFixed(5)},${ptLng.toFixed(5)}`;
      if (seenCoordKeys.has(coordKey)) continue;

      const ptGeoJSON = turf.point([ptLng, ptLat]);

      // Check rings ordered from smallest to largest:
      // Loop breaks on first match, ensuring point belongs to Ring i, NOT any previous Ring < i!
      for (let r = 0; r < sortedPolys.length; r++) {
        const isInside = turf.booleanPointInPolygon(ptGeoJSON, sortedPolys[r].searchPolyGeoJSON);
        if (isInside) {
          seenCoordKeys.add(coordKey);
          const parsed = formatOsmElement(el, state.center, sortedPolys[r].name, sortedPolys[r].radiusKm);
          ringBuckets[r].push(parsed);
          break; // Assigned to this smallest ring, skip larger rings
        }
      }
    }

    // 5. Proximity Optimization: Prioritize points NEAR each circle perimeter line
    const isNearCircleMode = circleProximityMode ? circleProximityMode.value === 'nearCircle' : true;
    const corridorToleranceMeters = circleCorridorMeters ? parseFloat(circleCorridorMeters.value) || 200 : 200;
    const corridorKm = corridorToleranceMeters / 1000;

    for (let r = 0; r < sortedPolys.length; r++) {
      if (isNearCircleMode) {
        // Sort strictly by closest to circle perimeter line
        ringBuckets[r].sort((a, b) => a.distToCircleKm - b.distToCircleKm);

        // If corridor tolerance defined, prioritize points within corridor
        const withinCorridor = ringBuckets[r].filter(item => item.distToCircleKm <= corridorKm);
        if (withinCorridor.length > 0) {
          const outsideCorridor = ringBuckets[r].filter(item => item.distToCircleKm > corridorKm);
          ringBuckets[r] = [...withinCorridor, ...outsideCorridor];
        }
      } else {
        // Standard center-outward sorting
        ringBuckets[r].sort((a, b) => a.distKm - b.distKm);
      }
    }

    // 6. Select items respecting maxCoords and ring strategy
    const maxLimit = maxCoords > 0 ? maxCoords : Infinity;
    const finalSelected = [];

    if (ringStrategy === 'roundrobin') {
      // Pick 1 from smallest ring, then 1 from next ring, then next... and repeat!
      const ringPointers = new Array(sortedPolys.length).fill(0);
      let anyAdded = true;

      while (finalSelected.length < maxLimit && anyAdded) {
        anyAdded = false;
        for (let r = 0; r < sortedPolys.length; r++) {
          if (finalSelected.length >= maxLimit) break;

          const bucket = ringBuckets[r];
          if (ringPointers[r] < bucket.length) {
            finalSelected.push(bucket[ringPointers[r]]);
            ringPointers[r]++;
            anyAdded = true;
          }
        }
      }
    } else {
      // Sequential: Fill from smallest ring completely, then next ring, etc.
      for (let r = 0; r < sortedPolys.length; r++) {
        for (const item of ringBuckets[r]) {
          if (finalSelected.length >= maxLimit) break;
          finalSelected.push(item);
        }
        if (finalSelected.length >= maxLimit) break;
      }
    }

    if (finalSelected.length === 0) {
      showStatus('No new points found matching the selected filters in these rings.', 'info', 4000);
      return;
    }

    // Add each selected point to map and state
    finalSelected.forEach(pt => addResultPoint(pt));

    const ringBreakdown = sortedPolys.map((p, idx) => {
      const count = finalSelected.filter(item => item.ring === p.name).length;
      return `${p.name}: ${count}`;
    }).join(', ');

    showStatus(`Success! Pulled ${finalSelected.length} coordinates near circle(s) (${ringBreakdown}).`, 'success', 6000);
  } catch (err) {
    showStatus('Error pulling coordinates: ' + err.message, 'error');
  } finally {
    pullDataBtn.disabled = false;
  }
}

function formatOsmElement(el, center, ringName = null, ringRadiusKm = null) {
  const tags = el.tags || {};
  let name = tags.name || (tags['addr:housenumber'] ? `House #${tags['addr:housenumber']} ${tags['addr:street'] || ''}` : null);
  if (!name && tags.shop) name = `${tags.shop.toUpperCase()} shop`;
  if (!name && tags.amenity) name = `${tags.amenity.toUpperCase()}`;
  if (!name && tags.office) name = `${tags.office.toUpperCase()} Office`;
  if (!name) name = `Point (${el.lat.toFixed(4)}, ${el.lon.toFixed(4)})`;

  let type = tags.shop ? `Shop: ${tags.shop}` :
             tags.amenity ? `Amenity: ${tags.amenity}` :
             tags.office ? `Office: ${tags.office}` :
             tags['addr:housenumber'] ? 'Residential House' :
             tags.building ? `Building: ${tags.building}` : 'Service/Point';

  let address = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'] || tags['addr:suburb'],
    tags['addr:postcode']
  ].filter(Boolean).join(', ') || 'No street address tagged';

  // Calculate distance from center if center exists
  let distKm = 0;
  let distMi = 0;
  let distToCircleKm = 0;
  let distToCircleMeters = null;

  if (center) {
    distKm = turf.distance(turf.point([center.lng, center.lat]), turf.point([el.lon, el.lat]), { units: 'kilometers' });
    distMi = distKm * 0.621371;

    if (ringRadiusKm != null) {
      distToCircleKm = Math.abs(distKm - ringRadiusKm);
      distToCircleMeters = Math.round(distToCircleKm * 1000);
    }
  }

  return {
    name,
    type,
    ring: ringName || 'Direct',
    address,
    lat: el.lat,
    lng: el.lon,
    distKm,
    distMi,
    distToCircleKm,
    distToCircleMeters,
    source: 'OSM/Overpass'
  };
}

// --- 4. Manual Pin Mode & Map Click Listener ---

toggleManualPinBtn.addEventListener('click', () => {
  state.manualPinMode = !state.manualPinMode;
  if (state.manualPinMode) {
    document.body.classList.add('manual-pin-active');
    map.getContainer().classList.add('manual-pin-active');
    toggleManualPinBtn.classList.add('active');
    toggleManualPinBtn.innerHTML = '<i class="fa-solid fa-check"></i> Exit Click-to-Pin Mode';
    modeBanner.classList.remove('hidden');
    map.getContainer().style.cursor = 'crosshair';
  } else {
    document.body.classList.remove('manual-pin-active');
    map.getContainer().classList.remove('manual-pin-active');
    toggleManualPinBtn.classList.remove('active');
    toggleManualPinBtn.innerHTML = '<i class="fa-solid fa-map-pin"></i> Enable Click-to-Pin Mode';
    modeBanner.classList.add('hidden');
    map.getContainer().style.cursor = '';
  }
});

function handleManualPinDrop(latlng) {
  const { lat, lng } = latlng;

  let distKm = 0;
  let distMi = 0;
  if (state.center) {
    distKm = turf.distance(turf.point([state.center.lng, state.center.lat]), turf.point([lng, lat]), { units: 'kilometers' });
    distMi = distKm * 0.621371;
  }

  // Detect which ring the manual click falls inside or near
  let assignedRing = 'Manual';
  let distToCircleKm = 0;
  let distToCircleMeters = null;

  if (state.polygons.length > 0 && state.center) {
    const ptGeo = turf.point([lng, lat]);
    const sorted = [...state.polygons].sort((a, b) => (a.radiusKm || a.radius) - (b.radiusKm || b.radius));
    for (let r = 0; r < sorted.length; r++) {
      if (turf.booleanPointInPolygon(ptGeo, sorted[r].geojson)) {
        assignedRing = `${sorted[r].name}`;
        distToCircleKm = Math.abs(distKm - (sorted[r].radiusKm || sorted[r].radius));
        distToCircleMeters = Math.round(distToCircleKm * 1000);
        break;
      }
    }

    // If outside all rings, find closest ring line
    if (distToCircleMeters == null && sorted.length > 0) {
      let closestDiff = Infinity;
      let closestRing = sorted[0];
      for (const p of sorted) {
        const diff = Math.abs(distKm - (p.radiusKm || p.radius));
        if (diff < closestDiff) {
          closestDiff = diff;
          closestRing = p;
        }
      }
      assignedRing = `Near ${closestRing.name}`;
      distToCircleKm = closestDiff;
      distToCircleMeters = Math.round(closestDiff * 1000);
    }
  }

  const pinId = state.results.length + 1;
  const manualPoint = {
    name: `Custom Pin #${pinId}`,
    type: 'Manual Coordinate',
    ring: assignedRing,
    address: `Custom Click at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
    distKm,
    distMi,
    distToCircleKm,
    distToCircleMeters,
    source: 'Manual'
  };

  addResultPoint(manualPoint);
  showStatus(`Added custom coordinate: ${lat.toFixed(6)}, ${lng.toFixed(6)} (${assignedRing})`, 'success', 3000);
}

// Map click handler (supports setting center or manual pin)
map.on('click', async (e) => {
  if (state.manualPinMode) {
    handleManualPinDrop(e.latlng);
  } else if (!state.center) {
    setCenter(e.latlng.lat, e.latlng.lng, `Clicked Location (${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)})`);
  }
});

// --- 5. Add Result to State, Table, and Map ---

function addResultPoint(point) {
  const resultId = state.nextResultId++;
  point.id = resultId;

  // Add marker to map
  const markerIcon = L.divIcon({
    className: 'custom-poi-marker',
    html: `<div style="background:#0284c7; color:white; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.4);">${resultId}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  const marker = L.marker([point.lat, point.lng], { icon: markerIcon }).addTo(resultsLayerGroup);
  
  const toCircleLine = point.distToCircleMeters != null ? `<p><b>To Circle Line:</b> ${point.distToCircleMeters} m</p>` : '';

  marker.bindPopup(`
    <div class="popup-details">
      <h4>#${resultId} - ${point.name}</h4>
      <p><b>Ring:</b> ${point.ring || 'Direct'}</p>
      ${toCircleLine}
      <p><b>Type:</b> ${point.type}</p>
      <p><b>Address:</b> ${point.address}</p>
      <p><b>Distance to Center:</b> ${point.distKm.toFixed(2)} km (${point.distMi.toFixed(2)} mi)</p>
      <span class="popup-coords">${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}</span>
    </div>
  `);

  point.leafletMarker = marker;
  state.results.push(point);

  updateResultsUI();
}

function updateResultsUI() {
  resultsCount.textContent = state.results.length;
  renderTable(state.results);
}

function renderTable(items) {
  const query = filterResultsInput.value.toLowerCase().trim();
  const filtered = query
    ? items.filter(r => r.name.toLowerCase().includes(query) || (r.ring && r.ring.toLowerCase().includes(query)) || r.type.toLowerCase().includes(query) || r.address.toLowerCase().includes(query))
    : items;

  resultsTbody.innerHTML = '';

  if (filtered.length === 0) {
    resultsTbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">No matching coordinates found.</td>
      </tr>
    `;
    return;
  }

  filtered.forEach(item => {
    const toCircleText = item.distToCircleMeters != null ? `${item.distToCircleMeters}m` : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.id}</td>
      <td title="${item.name}">${truncate(item.name, 18)}</td>
      <td><span class="badge" style="font-size:0.7rem; color:#38bdf8; background:#0f172a; padding:2px 6px; border-radius:4px; border:1px solid #1e3a8a;">${item.ring || '-'}</span></td>
      <td><span style="font-size:0.72rem; color:#a7f3d0; font-weight:600;">${toCircleText}</span></td>
      <td><span class="badge" style="font-size:0.7rem; color:#94a3b8;">${item.type}</span></td>
      <td class="coord-cell">${item.lat.toFixed(5)}</td>
      <td class="coord-cell">${item.lng.toFixed(5)}</td>
      <td>${item.distKm.toFixed(2)} km</td>
      <td>
        <button class="btn-table-action" title="Zoom to marker" onclick="zoomToResult(${item.id})"><i class="fa-solid fa-location-crosshairs"></i></button>
        <button class="btn-table-action" title="Delete" onclick="deleteResult(${item.id})"><i class="fa-solid fa-xmark"></i></button>
      </td>
    `;
    resultsTbody.appendChild(tr);
  });
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max) + '...' : str;
}

filterResultsInput.addEventListener('input', () => renderTable(state.results));

window.zoomToResult = function(id) {
  const item = state.results.find(x => x.id === id);
  if (item && item.leafletMarker) {
    map.setView([item.lat, item.lng], 17);
    item.leafletMarker.openPopup();
  }
};

window.deleteResult = function(id) {
  const idx = state.results.findIndex(x => x.id === id);
  if (idx !== -1) {
    resultsLayerGroup.removeLayer(state.results[idx].leafletMarker);
    state.results.splice(idx, 1);
    updateResultsUI();
  }
};

clearResultsBtn.addEventListener('click', () => {
  if (state.results.length === 0) return;
  if (!confirm('Clear all pulled coordinates?')) return;
  state.results.forEach(r => resultsLayerGroup.removeLayer(r.leafletMarker));
  state.results = [];
  updateResultsUI();
});

// --- 6. Export Engine (KML, CSV, GeoJSON, Copy) ---

// KML Generator
exportKmlBtn.addEventListener('click', () => {
  if (state.results.length === 0 && state.polygons.length === 0) {
    alert('No data or polygons to export.');
    return;
  }

  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Coordinates Puller Export</name>
    <description>Polygons and Coordinates generated by Coordinates Puller</description>
    <Style id="polyStyle">
      <LineStyle><color>ffeb6325</color><width>3</width></LineStyle>
      <PolyStyle><color>40eb6325</color></PolyStyle>
    </Style>
    <Style id="pinStyle">
      <IconStyle>
        <scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon>
      </IconStyle>
    </Style>
`;

  // 1. Export Polygons
  state.polygons.forEach(p => {
    const coords = p.geojson.geometry.coordinates[0];
    const coordString = coords.map(c => `${c[0]},${c[1]},0`).join(' ');

    kml += `
    <Placemark>
      <name>${escapeXml(p.name)}</name>
      <styleUrl>#polyStyle</styleUrl>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
  });

  // 2. Export Points
  state.results.forEach(r => {
    kml += `
    <Placemark>
      <name>${escapeXml(r.name)}</name>
      <description><![CDATA[Ring: ${escapeXml(r.ring || '-')}<br>To Circle: ${r.distToCircleMeters != null ? r.distToCircleMeters + 'm' : '-'}<br>Type: ${r.type}<br>Address: ${r.address}<br>Lat: ${r.lat}<br>Lng: ${r.lng}<br>Distance Center: ${r.distKm.toFixed(2)} km]]></description>
      <styleUrl>#pinStyle</styleUrl>
      <Point>
        <coordinates>${r.lng},${r.lat},0</coordinates>
      </Point>
    </Placemark>`;
  });

  kml += `
  </Document>
</kml>`;

  downloadFile('coordinates_export.kml', kml, 'application/vnd.google-earth.kml+xml');
});

// CSV Generator
exportCsvBtn.addEventListener('click', () => {
  if (state.results.length === 0) {
    alert('No coordinates to export.');
    return;
  }

  const headers = ['ID', 'Name', 'Ring', 'Dist_to_Circle_m', 'Type', 'Latitude', 'Longitude', 'Distance_Center_km', 'Distance_Center_miles', 'Address', 'Source'];
  const rows = state.results.map(r => [
    r.id,
    `"${(r.name || '').replace(/"/g, '""')}"`,
    `"${(r.ring || '').replace(/"/g, '""')}"`,
    r.distToCircleMeters != null ? r.distToCircleMeters : '',
    `"${(r.type || '').replace(/"/g, '""')}"`,
    r.lat,
    r.lng,
    r.distKm.toFixed(3),
    r.distMi.toFixed(3),
    `"${(r.address || '').replace(/"/g, '""')}"`,
    r.source
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  downloadFile('coordinates_export.csv', csvContent, 'text/csv;charset=utf-8;');
});

// GeoJSON Generator
exportGeoJsonBtn.addEventListener('click', () => {
  if (state.results.length === 0 && state.polygons.length === 0) {
    alert('No data to export.');
    return;
  }

  const features = [];

  // Add polygons
  state.polygons.forEach(p => {
    features.push({
      type: 'Feature',
      properties: { name: p.name, radius: p.radius, unit: p.unit },
      geometry: p.geojson.geometry
    });
  });

  // Add points
  state.results.forEach(r => {
    features.push({
      type: 'Feature',
      properties: {
        id: r.id,
        name: r.name,
        ring: r.ring || null,
        dist_to_circle_m: r.distToCircleMeters,
        type: r.type,
        address: r.address,
        distance_center_km: r.distKm,
        distance_center_miles: r.distMi
      },
      geometry: {
        type: 'Point',
        coordinates: [r.lng, r.lat]
      }
    });
  });

  const geoJson = {
    type: 'FeatureCollection',
    features
  };

  downloadFile('coordinates_export.geojson', JSON.stringify(geoJson, null, 2), 'application/geo+json');
});

// Copy Lat,Lng to Clipboard
copyAllCoordsBtn.addEventListener('click', () => {
  if (state.results.length === 0) {
    alert('No coordinates to copy.');
    return;
  }

  const text = state.results.map(r => `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}  // ${r.name}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showStatus(`Copied ${state.results.length} coordinates to clipboard!`, 'success', 3000);
  }).catch(() => {
    alert('Could not copy to clipboard automatically. Browser permission required.');
  });
});

// Helper utilities
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe) {
  return (unsafe || '').replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

function showStatus(text, type = 'info', timeout = null) {
  pullStatus.className = `status-msg ${type}`;
  pullStatus.textContent = text;
  pullStatus.classList.remove('hidden');

  if (timeout) {
    setTimeout(() => {
      pullStatus.classList.add('hidden');
    }, timeout);
  }
}
