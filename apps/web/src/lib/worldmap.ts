import { createRequire } from 'node:module';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import countries from 'i18n-iso-countries';

// A world map as SVG paths, drawn once at build time (visitors download no map library).
// Each country carries its two-letter code, which is what Cloudflare reports for a visitor.
const require = createRequire(import.meta.url);
export const MAP_W = 960, MAP_H = 470;

export function worldMap() {
  const topo = require('world-atlas/countries-110m.json');
  const fc = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  const shapes = fc.features.filter((f) => f.id !== '010'); // leave out Antarctica
  const projection = geoNaturalEarth1().fitSize([MAP_W, MAP_H], { type: 'FeatureCollection', features: shapes });
  const path = geoPath(projection).digits(0); // whole pixels: about a third smaller, same look
  return shapes.map((f) => ({
    // Kosovo has no ISO number in the map data; Cloudflare reports it as XK.
    code: (f.id && countries.numericToAlpha2(String(f.id))) || (f.properties?.name === 'Kosovo' ? 'XK' : ''),
    name: String(f.properties?.name ?? ''),
    d: path(f) ?? '',
  })).filter((s) => s.d);
}
