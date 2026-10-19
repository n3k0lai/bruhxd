import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { createPalette } from './materials.js';
import { PARTS, PART_BY_MESH, meshKey } from './parts.js';
import { createRollbar } from './rollbar.js';
import { createBodyKit } from './body.js';
import { createSeats } from './seats.js';

// Ride-height correction: how far the body sits lower than the source model, in
// metres (negative raises it). 0 = the glTF as exported. Miia is on the stock
// Bilsteins; the source model's arches sit roughly 35-45 mm higher over the hubs
// than forum-reported stock ND figures, so once Miia's hub-to-lip heights are
// measured, set this from docs/CALIBRATION.md rather than guessing.
// The glTF itself is 1:1 in metres (verified there), so no scale factor is applied.
export const STANCE_DROP_M = 0;

// Tyre contact patch height in the glTF frame (docs/CALIBRATION.md).
const GROUND_Y = -0.011;

// Wheel-assembly nodes stay put when the body is lowered.
const WHEEL_NODES = new Set(['Brake_Rotors', 'Rims', 'Suspension', 'Tyres']);

// Brake calipers (stand-ins; the source model has none). The front wheels are
// modelled steered, so nothing is hard-coded: each caliper is fitted to its own
// per-wheel rotor and rim (Brake_Rotors-FL etc., carved in parts.js) at load.
const WHEELS = ['FL', 'FR', 'RL', 'RR'];
const CALIPER = {
    front: { span: 0.95, depth: 0.052, inboard: 0.034, clock: Math.PI }, // Brembo 4-pot, trailing the hub
    rear: { span: 0.62, depth: 0.04, inboard: 0.026, clock: 0 },         // stock single-piston, ahead of the hub
    spokeGap: 0.005, barrelGap: 0.006, bevel: 0.004,
};

// Fit a frame to one wheel from its geometry, in the rotor mesh's own frame
// (x = lateral, y = forward, z = down):
//   centre  disc centre on the friction-ring mid-plane
//   axle    unit axle direction, pointing outboard (the disc normal: the
//           least-variance axis of the rotor's vertices)
//   R       disc radius; barrelR inner radius of the rim barrel at the disc;
//   spokeIn how far outboard of the disc mid-plane the spokes start, within
//           the caliper's radial band
function wheelFrame(rotor, rim, side) {
    const verts = (o) => {
        const p = o.geometry.attributes.position, used = new Set(o.geometry.index.array), out = [];
        for (const i of used) out.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
        return out;
    };
    const rv = verts(rotor);
    const mean = rv.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(rv.length);
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const v of rv) {
        const d = v.clone().sub(mean).toArray();
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j];
    }
    // Smallest-eigenvalue vector via power iteration on (trace * I - C).
    const tr = C[0][0] + C[1][1] + C[2][2];
    let axle = new THREE.Vector3(side, 0, 0);
    for (let it = 0; it < 100; it++) {
        const a = axle.toArray(), b = [0, 0, 0];
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b[i] += ((i === j ? tr : 0) - C[i][j]) * a[j];
        axle.fromArray(b).normalize();
    }
    if (axle.x * side < 0) axle.negate();
    const split = (v, origin) => { const d = v.clone().sub(origin), t = d.dot(axle); return [t, d.addScaledVector(axle, -t).length()]; };
    const R = Math.max(...rv.map((v) => split(v, mean)[1]));
    const ring = rv.map((v) => split(v, mean)).filter(([, r]) => r > 0.85 * R);
    const mid = ring.reduce((s, [t]) => s + t, 0) / ring.length;
    const centre = mean.clone().addScaledVector(axle, mid);
    const ringHalf = Math.max(...ring.map(([t]) => Math.abs(t - mid)));
    let barrelR = Infinity, spokeIn = Infinity;
    for (const v of verts(rim)) {
        const [t, r] = split(v, centre);
        if (Math.abs(t) < 0.06 && r > R) barrelR = Math.min(barrelR, r);
        if (t > 0 && r > R - 0.07 && r < R + 0.04) spokeIn = Math.min(spokeIn, t);
    }
    return { centre, axle, R, ringHalf, barrelR, spokeIn };
}

// Arc-shaped caliper block over the disc edge, in a pivot frame whose x is the
// outboard axle and whose -y points to the rear of the car (projected onto the
// disc plane, so it follows the steer angle). It reaches from `inboard` behind
// the disc to just short of the spokes, and from inside the disc edge to just
// short of the rim barrel.
function caliperGeometry(frame, front) {
    const c = front ? CALIPER.front : CALIPER.rear;
    const outer = Math.min(frame.barrelR - CALIPER.barrelGap - CALIPER.bevel, frame.R + 0.012);
    const inner = frame.R - c.depth;
    const xOut = Math.min(frame.spokeIn - CALIPER.spokeGap - CALIPER.bevel, frame.ringHalf + 0.02);
    const xIn = -c.inboard;
    const width = xOut - xIn;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, c.clock - c.span / 2, c.clock + c.span / 2, false);
    shape.absarc(0, 0, inner, c.clock + c.span / 2, c.clock - c.span / 2, true);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: width, bevelEnabled: true, bevelThickness: CALIPER.bevel, bevelSize: CALIPER.bevel, bevelSegments: 2, curveSegments: 12,
    });
    // Shape (u, v, w) -> pivot (x = w, y = u, z = v); cyclic swap keeps winding.
    // u along +y (forward), so clock pi = trailing (rear of the rotor).
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, xIn + pos.getZ(i), pos.getX(i), pos.getY(i));
    geo.computeVertexNormals();
    return geo;
}

// Pivot at the disc centre, axes (axle out, forward-in-disc-plane, down-ish),
// parented to the per-wheel rotor mesh so it follows steer and the widebody
// track push.
function wheelPivot(frame) {
    const x = frame.axle.clone();
    const y = new THREE.Vector3(0, 1, 0).addScaledVector(x, -x.y).normalize(); // mesh +y = forward
    const z = new THREE.Vector3().crossVectors(x, y);
    const pivot = new THREE.Group();
    pivot.matrix.makeBasis(x, y, z).setPosition(frame.centre);
    pivot.matrix.decompose(pivot.position, pivot.quaternion, pivot.scale);
    return pivot;
}

// Split part of a merged glTF mesh into its own mesh, so it can be hidden or
// recoloured on its own. Triangles whose centroid falls inside the box [min, max]
// (glTF scene frame, metres) move to a new mesh called `name`; the source keeps
// the rest. Shares the vertex buffers, only the index lists differ. A stand-in
// for re-segmenting the .blend (see docs/ROLLBAR.md).
//   whole: true  only move connected pieces (triangles joined through shared
//                vertex positions) that lie entirely inside the box, so a
//                neighbouring part that pokes into the box stays intact.
//   keepFacing: { dir: [x, y, z], dot }  triangles whose normal points along
//                dir (normal . dir > dot) stay behind, e.g. the rear shell of
//                a seat back.
function carveMesh(model, { from, min, max, name, whole = false, keepFacing = null }) {
    const src = model.getObjectByName(meshKey(from));
    if (!src?.isMesh || !src.geometry.index) { console.warn('[bruhxd] carve: no indexed mesh', from); return null; }
    model.updateMatrixWorld(true);
    const lo = new THREE.Vector3(...min), hi = new THREE.Vector3(...max);
    const geo = src.geometry, idx = geo.index.array, pos = geo.attributes.position;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const inBox = new Uint8Array(idx.length / 3);
    for (let i = 0; i < idx.length; i += 3) {
        a.fromBufferAttribute(pos, idx[i]); b.fromBufferAttribute(pos, idx[i + 1]); c.fromBufferAttribute(pos, idx[i + 2]);
        a.add(b).add(c).divideScalar(3).applyMatrix4(src.matrixWorld);
        inBox[i / 3] = a.x >= lo.x && a.x <= hi.x && a.y >= lo.y && a.y <= hi.y && a.z >= lo.z && a.z <= hi.z ? 1 : 0;
    }
    if (whole) {
        const comp = components(geo);
        const outsideComp = new Set();
        for (let t = 0; t < inBox.length; t++) if (!inBox[t]) outsideComp.add(comp[t]);
        for (let t = 0; t < inBox.length; t++) if (outsideComp.has(comp[t])) inBox[t] = 0;
    }
    if (keepFacing) {
        const dir = new THREE.Vector3(...keepFacing.dir).normalize(), n = new THREE.Vector3(), e = new THREE.Vector3();
        for (let i = 0; i < idx.length; i += 3) {
            if (!inBox[i / 3]) continue;
            a.fromBufferAttribute(pos, idx[i]).applyMatrix4(src.matrixWorld);
            b.fromBufferAttribute(pos, idx[i + 1]).applyMatrix4(src.matrixWorld);
            c.fromBufferAttribute(pos, idx[i + 2]).applyMatrix4(src.matrixWorld);
            n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
            if (n.dot(dir) > keepFacing.dot) inBox[i / 3] = 0;
        }
    }
    const inside = [], outside = [];
    for (let i = 0; i < idx.length; i += 3) (inBox[i / 3] ? inside : outside).push(idx[i], idx[i + 1], idx[i + 2]);
    if (!inside.length) { console.warn('[bruhxd] carve: empty box', name); return null; }
    const split = (list) => {
        const g = new THREE.BufferGeometry();
        for (const [k, attr] of Object.entries(geo.attributes)) g.setAttribute(k, attr);
        g.setIndex(list);
        g.computeBoundingBox(); g.computeBoundingSphere();
        return g;
    };
    const mesh = new THREE.Mesh(split(inside), src.material);
    mesh.name = meshKey(name);
    mesh.position.copy(src.position); mesh.quaternion.copy(src.quaternion); mesh.scale.copy(src.scale);
    src.parent.add(mesh);
    src.geometry = split(outside);
    return mesh;
}

// Connected-piece id per triangle; vertices are welded by position first, since
// the glTF splits them at UV/normal seams.
function components(geo) {
    const pos = geo.attributes.position, idx = geo.index.array;
    const weld = new Map(), wid = new Int32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
        const k = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
        if (!weld.has(k)) weld.set(k, weld.size);
        wid[i] = weld.get(k);
    }
    const parent = Int32Array.from({ length: weld.size }, (_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    for (let i = 0; i < idx.length; i += 3) {
        const r = find(wid[idx[i]]);
        parent[find(wid[idx[i + 1]])] = r;
        parent[find(wid[idx[i + 2]])] = r;
    }
    const out = new Int32Array(idx.length / 3);
    for (let t = 0; t < out.length; t++) out[t] = find(wid[idx[t * 3]]);
    return out;
}

// Loads the Miata and returns { pivot, model, parts, box }.
//   pivot: what the controls rotate/zoom (owns the original 45° / tilt pose)
//   fit:   scaled on resize so the car fills the screen on any aspect ratio
//   model: the glTF scene, recentred so the car spins about its own middle
export async function createCar(debugMode) {
    const gltf = await new GLTFLoader().loadAsync('/Miata-mx-5.gltf', (xhr) => {
        if (debugMode && xhr.total) console.log((xhr.loaded / xhr.total * 100).toFixed(0) + '% loaded');
    });
    const model = gltf.scene;
    const palette = createPalette();
    const parts = new Map(PARTS.map((p) => [p.id, { ...p, objects: [] }]));
    const unknown = [];

    for (const p of PARTS) for (const c of p.carve ?? []) carveMesh(model, c);

    model.traverse((child) => {
        if (!child.isMesh) return;
        const def = PART_BY_MESH.get(child.name);
        if (!def) { unknown.push(child.name); return; }
        const part = parts.get(def.id);
        if (def.hidden) { child.visible = false; return; }

        const override = def.overrides && Object.entries(def.overrides).find(([n]) => meshKey(n) === child.name);
        const key = override ? override[1] : def.material;
        let mat = key ? palette[key] : child.material;
        if (!key && debugMode) mat = palette.DebugMaterial;
        // Own copy per mesh so a single part can be highlighted / recoloured.
        child.material = mat.clone();
        child.userData.partId = def.id;
        child.userData.baseMaterial = child.material.clone();
        part.objects.push(child);
    });
    if (unknown.length) console.warn('[bruhxd] meshes missing from parts.js:', unknown);

    // Calipers (generated; see parts.js 'calipers'), one per wheel, fitted to
    // that wheel's rotor and rim and parented to its rotor.
    const calipers = parts.get('calipers');
    for (const k of WHEELS) {
        const rotor = model.getObjectByName(meshKey(`Brake Rotors-${k}`)), rim = model.getObjectByName(meshKey(`Rims-${k}`));
        if (!rotor || !rim || !calipers) { console.warn('[bruhxd] caliper: missing wheel meshes', k); continue; }
        const front = k[0] === 'F', side = k[1] === 'L' ? 1 : -1;
        const frame = wheelFrame(rotor, rim, side);
        const pivot = wheelPivot(frame);
        pivot.name = `caliper_pivot_${k}`;
        const mesh = new THREE.Mesh(caliperGeometry(frame, front), palette[calipers.material].clone());
        mesh.name = `caliper_${front ? 'front' : 'rear'}_${side > 0 ? 'left' : 'right'}`;
        mesh.userData.partId = 'calipers';
        mesh.userData.baseMaterial = mesh.material.clone();
        mesh.userData.wheel = { k, ...frame };
        pivot.add(mesh);
        rotor.add(pivot);
        calipers.objects.push(mesh);
    }

    // Roll bar mock-up (generated; see parts.js 'rollbar' and rollbar.js).
    // Added before the ride-height offset so it moves with the body.
    const rollbar = createRollbar(palette);
    model.add(rollbar.group);
    const rbPart = parts.get('rollbar');
    for (const t of rollbar.tubes) { t.userData.partId = 'rollbar'; rbPart?.objects.push(t); }
    rollbar.group.visible = false;

    // Ride height: lower every top-level node, then lift the wheel
    // assembly (children of "Vehicle base") back so the tyres stay planted.
    for (const node of model.children) node.position.y -= STANCE_DROP_M;
    const base = model.getObjectByName('Vehicle_base');
    // Vehicle base is rotated +90 deg about X, so world +Y is its local -Z.
    if (base) for (const child of base.children) if (WHEEL_NODES.has(child.name)) child.position.z -= STANCE_DROP_M;

    // Bounds of the visible car only (the hidden 35 m studio floor would skew it).
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const p of parts.values()) for (const o of p.objects) box.expandByObject(o);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    box.translate(center.clone().negate());

    // Optional floor (menu / ?floor): outlined 0.5 m squares on the true ground
    // plane (tyre contact, y = -0.011 in the glTF frame), so it doubles as a scale
    // reference. Line-only, off by default, not counted in the bounds above.
    const floor = new THREE.GridHelper(8, 16, 0xffffff, 0xffffff);
    floor.name = 'floor-grid';
    floor.material.transparent = true;
    floor.material.opacity = 0.4;
    floor.material.depthWrite = false;
    floor.position.set(center.x, GROUND_Y - 0.0005, center.z);
    floor.visible = false;
    model.add(floor);

    // Resolve hotspot anchors into model-local coordinates (the glTF scene's own
    // frame, i.e. before the recentring offset applied to model.position).
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    for (const p of parts.values()) {
        if (!p.anchor || !p.objects.length) { p.anchorLocal = null; continue; }
        if (p.anchor === 'auto') {
            const b = new THREE.Box3();
            p.objects.forEach((o) => b.expandByObject(o));
            p.anchorLocal = b.getCenter(new THREE.Vector3());
        } else {
            const [x, y, z] = p.anchor;
            p.anchorLocal = new THREE.Vector3(x * half.x, (y * 2 - 1) * half.y, z * half.z).add(center);
        }
    }

    // Body mock-ups (widebody, spoilers); built lazily when first switched on.
    const body = createBodyKit(model, palette);

    // Seat upholstery colour (seats.js) and mirror caps (black / pearl).
    const seatPart = parts.get('seats');
    const upholstery = new Set((seatPart?.upholstery ?? []).map(meshKey));
    const seats = createSeats(seatPart ? seatPart.objects.filter((o) => upholstery.has(o.name)) : []);
    const caps = parts.get('mirrors')?.objects.filter((o) => o.name === meshKey('mirror-caps')) ?? [];
    const mirrors = {
        caps,
        set(kind) {
            const mat = palette[kind === 'pearl' ? 'MiiaSilver' : 'PianoBlack'];
            for (const o of caps) { o.material = mat.clone(); o.userData.baseMaterial = o.material.clone(); }
        },
    };

    const fit = new THREE.Group();
    fit.add(model);
    const pivot = new THREE.Group();
    pivot.add(fit);
    pivot.rotation.y = -Math.PI / 4; // original pose: 45° three-quarter view
    pivot.rotation.x = Math.PI / 12; // slight downward tilt
    return { pivot, fit, model, parts, rollbar, floor, body, seats, mirrors, box, radius: box.getBoundingSphere(new THREE.Sphere()).radius };
}
