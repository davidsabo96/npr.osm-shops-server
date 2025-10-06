// fetch_osm.js
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const OUT_FILE = path.join(__dirname, 'public', 'shops.json');

// --- podesiva polja (meni promeni po potrebi) ---
const CENTER_LAT = parseFloat(process.env.CENTER_LAT || '48.4321');
const CENTER_LON = parseFloat(process.env.CENTER_LON || '17.8033');
const RADIUS_METERS = parseInt(process.env.RADIUS_METERS || '5000', 10); // 5000m = 5km

function buildQuery() {
  return `[out:json][timeout:25];
(
  node(around:${RADIUS_METERS},${CENTER_LAT},${CENTER_LON})["shop"];
  way(around:${RADIUS_METERS},${CENTER_LAT},${CENTER_LON})["shop"];
  relation(around:${RADIUS_METERS},${CENTER_LAT},${CENTER_LON})["shop"];
);
out center;`;
}

async function fetchAndSave() {
  try {
    const query = buildQuery();
    const url = 'https://overpass-api.de/api/interpreter';
    console.log('Sending query to Overpass...');
    const resp = await axios.get(url, { params: { data: query }, timeout: 60000 });
    const elements = resp.data.elements || [];

    const shops = elements.map(el => {
      const tags = el.tags || {};
      const lat = el.lat || (el.center && el.center.lat) || null;
      const lon = el.lon || (el.center && el.center.lon) || null;

      const addrParts = [];
      if (tags['addr:street']) addrParts.push(tags['addr:street']);
      if (tags['addr:housenumber']) addrParts.push(tags['addr:housenumber']);
      if (tags['addr:city']) addrParts.push(tags['addr:city']);

      return {
        id: el.id,
        osm_type: el.type,
        name: tags.name || null,
        brand: tags.brand || tags.operator || null,
        shop: tags.shop || null,
        addr: addrParts.join(' ') || null,
        lat,
        lon,
        tags
      };
    }).filter(s => s.lat && s.lon);

    fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(shops, null, 2), 'utf8');
    console.log(`Saved ${shops.length} items to ${OUT_FILE}`);
  } catch (err) {
    console.error('Error fetching OSM data:', err.message || err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  fetchAndSave();
}

module.exports = { fetchAndSave };
