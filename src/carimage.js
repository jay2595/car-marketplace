'use strict';
/**
 * Deterministic vehicle imagery.
 *
 * Real dealership photography is copyrighted and can't be redistributed, so the
 * demo renders a side-profile illustration per body type, tinted with the car's
 * actual exterior colour. It is generated at request time, needs no network, and
 * can't break during a demo.
 *
 * To use real photos instead: drop files into
 *     public/images/cars/<STOCK_NUMBER>/1.jpg, 2.jpg, ...
 * and imagesFor() picks them up automatically with no code change.
 */
const fs = require('fs');
const path = require('path');

const PHOTO_ROOT = path.join(__dirname, '..', 'public', 'images', 'cars');
const PHOTO_EXT = /\.(jpe?g|png|webp|avif)$/i;

/** Side-profile silhouettes. viewBox is 0 0 400 200; wheels sit on y=170. */
const SHAPES = {
  Sedan: {
    body: 'M18,158 L20,133 C22,121 38,116 64,112 L110,84 C121,76 136,72 160,71 L246,71 C270,72 284,79 294,89 L326,112 C354,116 372,122 378,133 L380,158 Z',
    glass: 'M118,86 L156,80 L156,108 L104,108 Z M170,80 L242,80 C258,81 266,86 274,94 L286,108 L170,108 Z',
    wheels: [104, 300], wheelR: 27
  },
  Coupe: {
    body: 'M18,158 L20,134 C22,122 38,117 62,112 L120,80 C134,71 152,68 176,68 L238,69 C264,71 280,80 292,92 L328,112 C356,116 372,123 378,134 L380,158 Z',
    glass: 'M130,84 L176,76 L176,106 L118,106 Z M190,76 L236,78 C252,80 262,86 272,96 L282,106 L190,106 Z',
    wheels: [106, 300], wheelR: 28
  },
  Hatchback: {
    body: 'M22,158 L24,132 C26,120 42,115 66,111 L108,80 C118,72 133,68 156,67 L236,67 C258,68 272,74 284,86 L322,116 C348,120 366,124 372,134 L374,158 Z',
    glass: 'M116,82 L152,76 L152,106 L102,106 Z M166,76 L232,76 C246,77 254,82 262,90 L278,106 L166,106 Z',
    wheels: [102, 292], wheelR: 27
  },
  Wagon: {
    body: 'M16,158 L18,132 C20,120 36,115 60,111 L104,80 C114,72 129,68 152,67 L292,67 C314,68 328,74 336,84 L352,112 C372,116 380,122 382,133 L384,158 Z',
    glass: 'M112,82 L148,76 L148,106 L98,106 Z M162,76 L286,76 C300,77 308,82 314,90 L326,106 L162,106 Z',
    wheels: [100, 300], wheelR: 27
  },
  SUV: {
    body: 'M16,156 L18,124 C20,110 34,104 58,100 L96,66 C106,58 122,54 146,53 L262,53 C286,54 300,60 310,72 L340,102 C366,106 380,112 382,124 L384,156 Z',
    glass: 'M104,68 L142,62 L142,98 L92,98 Z M156,62 L258,62 C272,63 280,68 288,76 L304,98 L156,98 Z',
    wheels: [100, 302], wheelR: 32
  },
  Minivan: {
    body: 'M14,156 L16,122 C18,108 30,102 52,98 L88,60 C98,52 114,48 138,47 L288,47 C312,48 326,56 334,70 L350,100 C374,104 384,110 386,122 L388,156 Z',
    glass: 'M96,62 L134,56 L134,96 L84,96 Z M148,56 L286,56 C300,57 308,62 314,72 L326,96 L148,96 Z',
    wheels: [96, 304], wheelR: 31
  },
  Pickup: {
    body: 'M14,156 L16,120 C18,108 30,102 52,98 L92,62 C102,54 118,50 142,49 L216,49 C232,50 240,58 240,72 L240,100 L376,100 C384,101 386,106 386,116 L388,156 Z',
    glass: 'M100,64 L138,58 L138,96 L88,96 Z M152,58 L212,58 C222,59 226,64 226,74 L226,96 L152,96 Z',
    wheels: [98, 312], wheelR: 33,
    extra: '<rect x="240" y="100" width="146" height="6" opacity=".18"/>'
  }
};
SHAPES.Truck = SHAPES.Pickup;
SHAPES.Convertible = SHAPES.Coupe;
SHAPES.Van = SHAPES.Minivan;

function shade(hex, amount) {
  const h = String(hex || '#8A8F96').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function wheel(cx, cy, r) {
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r * 0.52).toFixed(1)}" y2="${(cy + Math.sin(a) * r * 0.52).toFixed(1)}" stroke="#9aa0a6" stroke-width="${(r * 0.13).toFixed(1)}" stroke-linecap="round"/>`;
  }).join('');
  return `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="#1b1d20"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.62).toFixed(1)}" fill="#c8ccd1"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.58).toFixed(1)}" fill="#eceef1"/>${spokes}<circle cx="${cx}" cy="${cy}" r="${(r * 0.16).toFixed(1)}" fill="#8f959b"/></g>`;
}

/** SVG side profile for a vehicle, tinted to its exterior colour. */
function carSvg(car, opts = {}) {
  const width = opts.width || 800;
  const height = Math.round(width / 2);
  const shape = SHAPES[car.bodyType] || SHAPES.Sedan;
  const base = car.exteriorColourHex || '#8A8F96';
  const light = shade(base, 26);
  const dark = shade(base, -34);
  const isDark = parseInt(String(base).replace('#', ''), 16) < 0x555555;
  const wheelY = 170 - (shape.wheelR - 27);
  const id = `g${String(car.id || 'x').replace(/\W/g, '')}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="${width}" height="${height}" role="img" aria-label="${car.year} ${car.make} ${car.model} in ${car.exteriorColour}">
<defs>
  <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${light}"/><stop offset="55%" stop-color="${base}"/><stop offset="100%" stop-color="${dark}"/>
  </linearGradient>
  <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#4b5560"/><stop offset="100%" stop-color="#20262d"/>
  </linearGradient>
</defs>
<ellipse cx="200" cy="196" rx="170" ry="6" fill="#000" opacity=".16"/>
<path d="${shape.body}" fill="url(#${id}b)" stroke="${dark}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="${shape.glass}" fill="url(#${id}g)" opacity=".92"/>
${shape.extra || ''}
<path d="${shape.body}" fill="none" stroke="${isDark ? '#ffffff' : '#000000'}" stroke-width="1" opacity=".10"/>
<rect x="20" y="126" width="16" height="7" rx="3" fill="#fff3c4" opacity=".95"/>
<rect x="366" y="126" width="14" height="7" rx="3" fill="#e0403a" opacity=".9"/>
<line x1="${shape.wheels[0] + shape.wheelR + 6}" y1="132" x2="${shape.wheels[1] - shape.wheelR - 6}" y2="132" stroke="${dark}" stroke-width="1.4" opacity=".55"/>
${wheel(shape.wheels[0], wheelY, shape.wheelR)}
${wheel(shape.wheels[1], wheelY, shape.wheelR)}
</svg>`;
}

/** Real photos if present on disk, otherwise the generated illustration. */
function imagesFor(car) {
  const dir = path.join(PHOTO_ROOT, String(car.stockNumber));
  try {
    const files = fs.readdirSync(dir).filter((f) => PHOTO_EXT.test(f)).sort();
    if (files.length) {
      return { source: 'photo', images: files.map((f) => `/images/cars/${car.stockNumber}/${f}`) };
    }
  } catch { /* no photo folder - fall through */ }
  return {
    source: 'generated',
    images: [`/api/cars/${car.id}/image.svg`],
    note: 'Illustration. Drop photos into public/images/cars/' + car.stockNumber + '/ to override.'
  };
}

module.exports = { carSvg, imagesFor, SHAPES, shade };
