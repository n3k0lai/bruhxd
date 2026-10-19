import * as THREE from 'three';
import { TOP_MAROON } from './materials.js';

// Procedural mock-up of the Hard Dog "ND Sport" roll bar sold by Flyin' Miata
// (FM part 20-19020, double-diagonal version), for trying colours on Miia.
//
// Reference: FM product photos and their install shots. Built from 1.75 in
// (44.5 mm) DOM tube. A single full-width main hoop stands just behind the seats
// and drops through notches in the upper bulkhead trim, beside the belts, onto
// the factory hoop mounts. Two rear legs leave the top bar inboard ("spread at
// the top" for rear visibility) and run back and down, outboard, to plates on
// the deck behind the bulkhead. A harness bar crosses the hoop at shoulder height.
//
// Coordinates are the glTF scene frame, 1:1 metres (see docs/CALIBRATION.md):
// +x = driver/left side, +y = up (ground at y = -0.011), +z = nose.
// Positions are eyeballed against the model and the photos, not measured on
// the car; replace them with the bar's drawing or tape measurements when known.
export const ROLLBAR = {
    tubeR: 0.0445 / 2,
    hoop: { x: 0.53, top: 1.2, base: 0.6, z: -0.84, bend: 0.15 }, // in the hoop covers' old footprint, clear of the seat backs
    harness: { y: 0.95, back: 0.03 }, // welded to the rear of the hoop legs, above the trim
    legs: { topX: 0.3, base: [0.68, 0.79, -1.05] },
    led: { inset: 0.03, h: 0.008, d: 0.016 },
};

// Colour presets. Paint-type finishes over steel tube. The first three are
// Nicholai's favourites (shown first in every picker): Brembo caliper red, the
// cloth top's maroon, and Miia's own pearl silver (the real MiiaSilver material).
export const FAVORITES = ['caliper-red', 'top-maroon', 'miia-silver'];
export const BAR_PRESETS = {
    'caliper-red': { label: 'Brembo red', color: 0xd3101b, metalness: 0.1, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 },
    'top-maroon': { label: 'Top maroon', color: TOP_MAROON, metalness: 0.2, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1 },
    'miia-silver': { label: 'Miia silver pearl', palette: 'MiiaSilver', color: 0xc6c8cc },
    'satin-black': { label: 'Satin black', color: 0x111113, metalness: 0.35, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.6 },
    'gloss-black': { label: 'Gloss black', color: 0x060607, metalness: 0.4, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04 },
    gunmetal: { label: 'Gunmetal', color: 0x2c2f33, metalness: 0.8, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 },
    white: { label: 'White', color: 0xf0f0ee, metalness: 0.05, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 },
    'baby-blue': { label: 'Baby blue', color: 0x8ccdf0, metalness: 0.15, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 },
};
export const BAR_DEFAULT = 'satin-black';

export const LED_PRESETS = {
    'caliper-red': { label: 'Brembo red', color: 0xd3101b },
    'top-maroon': { label: 'Top maroon', color: TOP_MAROON },
    'miia-silver': { label: 'Miia silver', color: 0xc6c8cc },
    white: { label: 'Cool white', color: 0xe8f0ff },
    'baby-blue': { label: 'Baby blue', color: 0x7fd4ff },
    magenta: { label: 'Magenta', color: 0xff2bd6 },
    amber: { label: 'Amber', color: 0xffa424 },
};
export const LED_DEFAULT = 'white';

// "#d3101b", "d3101b", "0xd3101b" or a preset key -> { key, hex } | null
export function parseColor(value, presets) {
    if (value == null) return null;
    const v = String(value).trim().toLowerCase();
    if (presets[v]) return { key: v, hex: presets[v].color ?? null };
    const m = v.match(/^(?:#|0x)?([0-9a-f]{6}|[0-9a-f]{3})$/);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return { key: null, hex: parseInt(h, 16) };
}

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Polyline with rounded corners: straight runs joined by quadratic bends of
// radius ~r (the control point is the sharp corner, like a tube bender).
function bentPath(points, r) {
    const path = new THREE.CurvePath();
    let prev = points[0];
    for (let i = 1; i < points.length - 1; i++) {
        const c = points[i];
        const a = c.clone().add(prev.clone().sub(c).setLength(Math.min(r, prev.distanceTo(c) / 2)));
        const b = c.clone().add(points[i + 1].clone().sub(c).setLength(Math.min(r, points[i + 1].distanceTo(c) / 2)));
        if (prev.distanceTo(a) > 1e-4) path.add(new THREE.LineCurve3(prev, a));
        path.add(new THREE.QuadraticBezierCurve3(a, c, b));
        prev = b;
    }
    path.add(new THREE.LineCurve3(prev, points[points.length - 1]));
    return path;
}

function tube(curve, r, segments) {
    return new THREE.TubeGeometry(curve, segments, r, 20, false);
}

// Returns { group, tubes: Mesh[], led: Mesh, glow: Light, setColor, setLed }.
export function createRollbar(palette) {
    const { tubeR: R, hoop: H, harness, legs, led } = ROLLBAR;
    const group = new THREE.Group();
    group.name = 'rollbar';
    const material = new THREE.MeshPhysicalMaterial();
    const tubes = [];
    const add = (geo, name) => {
        const m = new THREE.Mesh(geo, material);
        m.name = name;
        group.add(m);
        tubes.push(m);
        return m;
    };

    // Main hoop.
    const hoopPath = bentPath([v3(H.x, H.base, H.z), v3(H.x, H.top, H.z), v3(-H.x, H.top, H.z), v3(-H.x, H.base, H.z)], H.bend);
    add(tube(hoopPath, R, 240), 'rollbar_hoop');

    // Harness bar between the hoop legs (ends sit inside the legs).
    const hz = H.z - harness.back;
    add(tube(new THREE.LineCurve3(v3(H.x - R * 0.5, harness.y, hz), v3(-H.x + R * 0.5, harness.y, hz)), R, 8), 'rollbar_harness');

    // Rear legs / diagonals: from the top bar, back and down to the deck plates.
    for (const s of [1, -1]) {
        const top = v3(s * legs.topX, H.top - R * 0.4, H.z - R * 0.4);
        const base = v3(s * legs.base[0], legs.base[1], legs.base[2]);
        add(tube(new THREE.LineCurve3(top, base), R, 8), `rollbar_leg_${s > 0 ? 'left' : 'right'}`);
    }

    // LED strip on the underside of the top bar, between the bends.
    const span = 2 * (H.x - H.bend) - 2 * led.inset;
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2.5, roughness: 0.4, toneMapped: false });
    const ledMesh = new THREE.Mesh(new THREE.BoxGeometry(span, led.h, led.d), ledMat);
    ledMesh.name = 'rollbar_led';
    ledMesh.position.set(0, H.top - R - led.h / 2 + 0.002, H.z);
    // Soft halo so the strip reads as lit from any angle (additive, no depth write).
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const halo = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, span, 6, 12).rotateZ(Math.PI / 2), haloMat);
    halo.name = 'rollbar_led_halo';
    halo.position.set(0, H.top - R - 0.012, H.z);
    // Soft spill onto the seats and bulkhead. Light range is in world units and
    // the car is scaled by fit/zoom, so update() rescales it to ~0.9 m of car.
    const GLOW_RANGE = 0.9;
    const glow = new THREE.PointLight(0xffffff, 6, GLOW_RANGE, 1);
    glow.position.set(0, H.top - 0.06, H.z + 0.02);
    const ledGroup = new THREE.Group();
    ledGroup.name = 'rollbar_led_group';
    ledGroup.add(ledMesh, halo, glow);
    ledGroup.visible = false;
    group.add(ledGroup);

    function setColor(value) {
        const p = parseColor(value, BAR_PRESETS) ?? { key: BAR_DEFAULT };
        const preset = p.key ? BAR_PRESETS[p.key] : null;
        if (preset?.palette) material.copy(palette[preset.palette]);
        else {
            const base = preset ?? BAR_PRESETS['caliper-red']; // custom colours use a glossy powder-coat finish
            material.copy(new THREE.MeshPhysicalMaterial({
                color: preset ? base.color : p.hex, metalness: base.metalness, roughness: base.roughness,
                clearcoat: base.clearcoat, clearcoatRoughness: base.clearcoatRoughness,
            }));
        }
        tubes.forEach((t) => { t.userData.baseMaterial = material.clone(); });
        return p;
    }

    function setLed(on, value) {
        ledGroup.visible = !!on;
        const p = parseColor(value, LED_PRESETS) ?? { key: LED_DEFAULT, hex: LED_PRESETS[LED_DEFAULT].color };
        ledMat.emissive.setHex(p.hex);
        haloMat.color.setHex(p.hex);
        glow.color.setHex(p.hex);
        return p;
    }

    const ws = new THREE.Vector3();
    function update() {
        if (ledGroup.visible && group.visible) glow.distance = GLOW_RANGE * ledGroup.getWorldScale(ws).x;
    }

    setColor(BAR_DEFAULT);
    setLed(false);
    return { group, tubes, material, led: ledGroup, setColor, setLed, update };
}
