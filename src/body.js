import * as THREE from 'three';

// Body mock-ups. ALL APPROXIMATIONS: procedural shapes fitted to the model at
// 1:1 scale, for seeing proportions and colour, not for fitment or ordering.
//
//  - Spoilers: Rocket Bunny-style ducktail, a small trunk lip, and a generic
//    GT wing on uprights. Shapes and sizes are eyeballed, not from drawings.
//
// Coordinates: glTF scene frame, metres (+x driver/left, +y up, +z nose); see
// docs/CALIBRATION.md. Everything is fitted by ray-casting the "Body kit" mesh,
// so it follows the model's real surface.

export const SPOILERS = {
    none: 'None',
    duck: 'Ducktail',
    lip: 'Trunk lip',
    wing: 'GT wing',
};

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// Mesh from a sweep of rings: rings[i] is a closed profile (same point count
// each). Each profile edge gets its own strip (crisp corners, smooth along the
// sweep); both ends are capped with a fan.
function ringsGeometry(rings, { cap = true } = {}) {
    const pos = [], idx = [];
    const n = rings[0].length;
    for (let e = 0; e < n; e++) {
        const base = pos.length / 3;
        for (const ring of rings) {
            const a = ring[e], b = ring[(e + 1) % n];
            pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
        for (let i = 0; i < rings.length - 1; i++) {
            const k = base + i * 2;
            idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
        }
    }
    if (cap) for (const [ring, flip] of [[rings[0], true], [rings[rings.length - 1], false]]) {
        const base = pos.length / 3;
        ring.forEach((p) => pos.push(p.x, p.y, p.z));
        for (let i = 1; i < n - 1; i++) flip ? idx.push(base, base + i + 1, base + i) : idx.push(base, base + i, base + i + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
}

// Ray-cast the body in the model's own frame.
function surfaceSampler(model, mesh) {
    const rc = new THREE.Raycaster();
    const o = new THREE.Vector3(), d = new THREE.Vector3();
    return (origin, dir) => {
        model.updateMatrixWorld(true);
        o.copy(origin); model.localToWorld(o);
        d.copy(dir).transformDirection(model.matrixWorld);
        rc.set(o, d);
        const hit = rc.intersectObject(mesh, false)[0];
        return hit ? model.worldToLocal(hit.point.clone()) : null;
    };
}

// Strip swept along a path. path: [{ p, out, up }] (unit vectors); profile:
// closed list of [o, u] offsets along out/up. scale(i) shrinks the ends.
function loft(path, profile, mat, scale = () => 1) {
    const rings = path.map(({ p, out, up }, i) => profile.map(([o, u]) => p.clone().addScaledVector(out, o * scale(i)).addScaledVector(up, u * scale(i))));
    return new THREE.Mesh(ringsGeometry(rings), mat);
}

export function createBody(model, palette) {
    const bodyMesh = model.getObjectByName('Body_kit');
    const sample = surfaceSampler(model, bodyMesh);
    const paint = palette.MiiaSilver.clone();
    paint.side = THREE.DoubleSide;
    const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, metalness: 0.3, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });

    // ── spoilers ──────────────────────────────────────────────
    const spoilers = new THREE.Group();
    spoilers.name = 'spoilers';
    const spoilerMeshes = {};
    function trunkPath(z, halfW, step = 0.04) {
        const path = [];
        for (let x = -halfW; x <= halfW + 1e-6; x += step) {
            const hit = sample(v3(x, 1.6, z), v3(0, -1, 0));
            if (hit) path.push({ p: hit, out: v3(0, 0, -1), up: v3(0, 1, 0) });
        }
        return path;
    }
    const endTaper = (path, n) => (i) => 0.1 + 0.9 * smooth(0, n, i) * smooth(path.length - 1, path.length - 1 - n, i);
    function buildSpoiler(kind) {
        if (spoilerMeshes[kind] !== undefined) return spoilerMeshes[kind];
        let obj = null;
        if (kind === 'lip') {
            // Small lip on the trunk's trailing edge (~22 mm tall).
            const path = trunkPath(-1.87, 0.56);
            obj = loft(path, [[-0.05, -0.004], [0.012, -0.004], [0.016, 0.022], [-0.05, 0.004]], paint, endTaper(path, 3));
        } else if (kind === 'duck') {
            // Ducktail: rises from the trunk lid to a ~70 mm kick at the rear.
            const path = trunkPath(-1.8, 0.5);
            obj = loft(path, [[-0.15, -0.006], [0.07, -0.012], [0.08, 0.055], [0.06, 0.062], [-0.15, 0.003]], paint, endTaper(path, 4));
        } else if (kind === 'wing') {
            obj = gtWing();
        }
        if (obj) { obj.name = `spoiler-${kind}`; obj.visible = false; spoilers.add(obj); obj.traverse((o) => { if (o.isMesh) o.userData.partId = 'spoiler'; }); }
        return (spoilerMeshes[kind] = obj);
    }

    // GT wing: cambered airfoil on two swan-neck-free plate uprights with endplates.
    function gtWing() {
        const g = new THREE.Group();
        const chord = 0.26, span = 1.44, top = 1.13, zc = -1.76, aoa = THREE.MathUtils.degToRad(7);
        // Airfoil (NACA-ish, flat-bottomed): points along the chord, front at +z.
        const foil = [];
        for (let i = 0; i <= 16; i++) { const t = i / 16; foil.push([t, 0.11 * chord * (1.4 * Math.sqrt(t) - 1.3 * t - 0.1 * t * t * t)]); }
        const profile = [...foil.map(([t, y]) => [chord * (0.5 - t), y]), ...foil.slice(1, -1).reverse().map(([t]) => [chord * (0.5 - t), -0.004])];
        const rings = [-span / 2, span / 2].map((x) => profile.map(([dz, dy]) => v3(x, top + dy * Math.cos(aoa) + dz * Math.sin(aoa), zc + dz * Math.cos(aoa) - dy * Math.sin(aoa))));
        g.add(new THREE.Mesh(ringsGeometry(rings), black));
        for (const s of [1, -1]) {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.17, 0.32), black);
            plate.position.set(s * (span / 2 + 0.003), top - 0.03, zc - 0.01);
            g.add(plate);
            // Upright from the trunk surface to the wing's underside.
            const base = sample(v3(s * 0.34, 1.6, zc), v3(0, -1, 0));
            const y0 = base ? base.y - 0.004 : 0.85, y1 = top - 0.01;
            const shape = new THREE.Shape([new THREE.Vector2(-0.07, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.03, y1 - y0), new THREE.Vector2(-0.06, y1 - y0)]);
            const up = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }), black);
            up.rotation.y = -Math.PI / 2;
            up.position.set(s * 0.34 + 0.004, y0, zc);
            g.add(up);
        }
        return g;
    }

    model.add(spoilers);
    return {
        spoilers, paint,
        setSpoiler(kind) {
            if (kind && kind !== 'none') buildSpoiler(kind);
            for (const [k, obj] of Object.entries(spoilerMeshes)) if (obj) obj.visible = k === kind;
        },
    };
}
