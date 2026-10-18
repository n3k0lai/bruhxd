import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { createPalette } from './materials.js';
import { PARTS, PART_BY_MESH, meshKey } from './parts.js';

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

    // Bounds of the visible car only (the hidden 35 m studio floor would skew it).
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const p of parts.values()) for (const o of p.objects) box.expandByObject(o);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    box.translate(center.clone().negate());

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

    const fit = new THREE.Group();
    fit.add(model);
    const pivot = new THREE.Group();
    pivot.add(fit);
    pivot.rotation.y = -Math.PI / 4; // original pose: 45° three-quarter view
    pivot.rotation.x = Math.PI / 12; // slight downward tilt
    return { pivot, fit, model, parts, box, radius: box.getBoundingSphere(new THREE.Sphere()).radius };
}
