import * as THREE from 'three';
import { parseColor } from './rollbar.js';
import { TOP_MAROON } from './materials.js';

// Seat upholstery colours (drawer "Seat colour", ?seats=, __bruhxd.seats()).
// Recolours the seat inserts ("Seats Base") and the bolsters / headrest fronts
// (carved out of "Internals" at load, see parts.js 'seats'); the plastic seat
// back shells, belts and trim stay as they are. Fabric look: fully matte with
// a soft sheen at grazing angles, like the stock cloth / suede-ish inserts.
// Favourites first, as in every picker.
export const SEAT_PRESETS = {
    'caliper-red': { label: 'Brembo red', color: 0xd3101b },
    'top-maroon': { label: 'Top maroon', color: TOP_MAROON },
    'miia-silver': { label: 'Miia silver pearl', color: 0xc6c8cc, pearl: true },
    'stock-black': { label: 'Stock black', color: 0x0b0b0c },
    tan: { label: 'Tan', color: 0xa57a50 },
    oxblood: { label: 'Oxblood', color: 0x4a1014 },
    white: { label: 'White', color: 0xe6e3dc },
    grey: { label: 'Grey', color: 0x56585c },
    'baby-blue': { label: 'Baby blue', color: 0x8ccdf0 },
};
export const SEAT_DEFAULT = 'stock-black';

// Matte fabric with sheen. Stock black keeps the original suede values exactly.
export function seatMaterial(value) {
    const p = parseColor(value, SEAT_PRESETS) ?? { key: SEAT_DEFAULT };
    const preset = p.key ? SEAT_PRESETS[p.key] : null;
    const hex = preset ? preset.color : p.hex;
    if (p.key === 'stock-black') {
        return new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0, roughness: 1, sheen: 0.35, sheenColor: 0x2a2a2e, sheenRoughness: 0.8 });
    }
    const color = new THREE.Color(hex);
    const sheenColor = color.clone().lerp(new THREE.Color(0xffffff), 0.3);
    const m = new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.95, sheen: 0.6, sheenColor, sheenRoughness: 0.55 });
    if (preset?.pearl) Object.assign(m, { sheenColor: new THREE.Color(0xe6ebf5), iridescence: 0.15, iridescenceIOR: 1.45, iridescenceThicknessRange: [300, 450] });
    return m;
}

// objects: the upholstery meshes. Returns { setColor(value) }.
export function createSeats(objects) {
    function setColor(value) {
        const mat = seatMaterial(value);
        for (const o of objects) { o.material = mat.clone(); o.userData.baseMaterial = o.material.clone(); }
    }
    return { objects, setColor };
}
