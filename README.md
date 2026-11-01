# Coordinates Puller

A 100% free geospatial tool for pulling coordinates, businesses, houses, and services within and around customizable KML/circle polygons.

## Features

1. **Center Coordinates:**
   - Search by business name, city, address, or exact `lat, lng`.
   - Draggable center pin on the map.
   - Device GPS button ("Locate Me").

2. **Polygons & Rings:**
   - Generate circle polygons with radius in **Kilometers (km)**, **Miles (mi)**, or **Meters (m)**.
   - Add multiple concentric or standalone polygons.
   - Individual polygon management (view, zoom, delete).

3. **Pull Coordinates (Free Overpass API):**
   - **Target Placement:** Choose "Near Each Circle (Closest to circle line)" to prioritize coordinates close to the perimeter corridor, or "Anywhere Inside Ring Area".
   - **Tolerance Corridor:** Set how close to the circle boundary (e.g. within 200m).
   - **Click-to-Pull on Circle:** Clicking any circle polygon on the map reveals a "Pull Coords Near This Circle" button to pull points specifically along that ring.
   - **Businesses & Shops:** Markets, retail, cafes, restaurants, etc.
   - **Amenities & Services:** Banks, pharmacies, gas stations, hospitals, clinics, schools, etc.
   - **Residential & Houses:** House numbers, residential building points, and addresses.
   - **Commercial Offices:** Corporate buildings, office complexes.
   - **Near-Boundary Buffer:** Configurable distance buffer (e.g. 50m outside polygon) to capture items near but not strictly inside.
   - **Max Coordinates Limit:** Set maximum number of coordinates to extract (e.g. 50, 100, 250, or 0 for unlimited).
   - **Concentric Donut Sorting & Round-Robin:**
     - Items partitioned: inside smallest ring, then next ring (excluding previous rings), and so on.
     - Pull ordering: Cycles 1 item from smallest ring, 1 from next ring, then repeats until max limit is reached (or sequential order).

4. **Manual Click-to-Pin Mode:**
   - Toggle crosshair mode to click anywhere on map and instantly record custom coordinates.

5. **Maps & Satellite Views:**
   - Google Satellite Hybrid (No API key needed)
   - Google Roadmap
   - OpenStreetMap Standard
   - Esri World Satellite

6. **Export Options:**
   - **KML** (Google Earth, Google My Maps, ArcGIS)
   - **CSV** (Excel, Google Sheets)
   - **GeoJSON**
   - **Copy Lat,Lng** (Single-click copy to clipboard)

## How to Run

Simply open [index.html](file:///c:/Users/Kent/Desktop/Coordinate%20Puller/index.html) in your browser (double-click or right-click -> Open with Chrome/Edge/Firefox).
