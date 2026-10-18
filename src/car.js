import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { createPalette } from './materials.js';
import { PARTS, PART_BY_MESH, meshKey } from './parts.js';
import { createRollbar } from './rollbar.js';
import { createBodyKit } from './body.js';

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

// Rotor centres and radius in the "Brake Rotors" mesh's own frame
// (x = lateral, y = forward, z = down), measured from the glTF.
const ROTORS = [
    { side: 1, y: 1.185, front: true }, { side: -1, y: 1.185, front: true },
    { side: 1, y: -1.125, front: false }, { side: -1, y: -1.125, front: false },
];
const ROTOR_Z = -0.295, ROTOR_R = 0.135;

// Simple caliper stand-in: an arc-shaped block clamped over the rotor edge.
// Fronts sit behind the rotor and are larger (Brembo 4-pot); rears sit ahead
// of it and are smaller. Built in the rotor mesh's frame and parented to it.
function caliperGeometry({ side, y, front }) {
    const span = front ? 0.95 : 0.6;            // radians of arc
    const inner = ROTOR_R - (front ? 0.06 : 0.045), outer = ROTOR_R + 0.014;
    const width = front ? 0.075 : 0.06;          // across the disc
    const mid = front ? Math.PI : 0;             // angle in the (y, z) plane: pi = rearward
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outer, mid - span / 2, mid + span / 2, false);
    shape.absarc(0, 0, inner, mid + span / 2, mid - span / 2, true);
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: width, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 12,
    });
    // Shape (u, v, w) -> mesh (x = w, y = u, z = v); cyclic swap keeps winding.
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i), v = pos.getY(i), w = pos.getZ(i);
        pos.setXYZ(i, side * 0.745 + (side > 0 ? 0 : -width) + w, y + u, ROTOR_Z + v);
    }
    geo.computeVertexNormals();
    return geo;
}

// Split part of a merged glTF mesh into its own mesh, so it can be hidden or
// recoloured on its own. Triangles whose centroid falls inside the box [min, max]
// (glTF scene frame, metres) move to a new mesh called `name`; the source keeps
// the rest. Shares the vertex buffers, only the index lists differ. A stand-in
// for re-segmenting the .blend (see docs/ROLLBAR.md).
function carveMesh(model, { from, min, max, name }) {
    const src = model.getObjectByName(meshKey(from));
    if (!src?.isMesh || !src.geometry.index) { console.warn('[bruhxd] carve: no indexed mesh', from); return null; }
    model.updateMatrixWorld(true);
    const lo = new THREE.Vector3(...min), hi = new THREE.Vector3(...max);
    const geo = src.geometry, idx = geo.index.array, pos = geo.attributes.position;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const inside = [], outside = [];
    for (let i = 0; i < idx.length; i += 3) {
        a.fromBufferAttribute(pos, idx[i]); b.fromBufferAttribute(pos, idx[i + 1]); c.fromBufferAttribute(pos, idx[i + 2]);
        a.add(b).add(c).divideScalar(3).applyMatrix4(src.matrixWorld);
        const dst = a.x >= lo.x && a.x <= hi.x && a.y >= lo.y && a.y <= hi.y && a.z >= lo.z && a.z <= hi.z ? inside : outside;
        dst.push(idx[i], idx[i + 1], idx[i + 2]);
    }
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

    // Calipers (generated; see parts.js 'calipers').
    const rotors = model.getObjectByName('Brake_Rotors');
    const calipers = parts.get('calipers');
    if (rotors && calipers) {
        for (const r of ROTORS) {
            const mesh = new THREE.Mesh(caliperGeometry(r), palette[calipers.material].clone());
            mesh.name = `caliper_${r.front ? 'front' : 'rear'}_${r.side > 0 ? 'left' : 'right'}`;
            mesh.userData.partId = 'calipers';
            mesh.userData.baseMaterial = mesh.material.clone();
            rotors.add(mesh);
            calipers.objects.push(mesh);
        }
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

    const fit = new THREE.Group();
    fit.add(model);
    const pivot = new THREE.Group();
    pivot.add(fit);
    pivot.rotation.y = -Math.PI / 4; // original pose: 45° three-quarter view
    pivot.rotation.x = Math.PI / 12; // slight downward tilt
    return { pivot, fit, model, parts, rollbar, floor, body, box, radius: box.getBoundingSphere(new THREE.Sphere()).radius };
}
