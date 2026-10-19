import * as THREE from 'three';

// Body mock-ups. ALL APPROXIMATIONS: procedural shapes fitted to the model at
// 1:1 scale, for seeing proportions and colour, not for fitment or ordering.
//
//  - Widebody: after the Rocket Bunny / Pandem ND MX-5 V2 kit (TRA Kyoto, Kei
//    Miura). Published parts: front lip, front over-fenders +40 mm, rear
//    over-fenders +80 mm (per side), rear diffuser, optional duck wing. Side
//    skirts are not in the official parts list; a slim sill extension is added
//    so the flares don't look stuck on. Bolt-on flares with exposed rivets.
//    The wheels are pushed out (spacers/offset) to fill the flares.
//  - Spoilers: Rocket Bunny-style ducktail, a small trunk lip, and a generic
//    GT wing on uprights. Shapes and sizes are eyeballed, not from drawings.
//
// Coordinates: glTF scene frame, metres (+x driver/left, +y up, +z nose); see
// docs/CALIBRATION.md. Everything is fitted by ray-casting the "Body kit" mesh,
// so it follows the model's real surface.

export const KIT = {
    front: { hubZ: 1.185, rIn: 0.4, ext: 0.04, slope: 0.12, push: 0.03 },
    rear: { hubZ: -1.125, rIn: 0.415, ext: 0.08, slope: 0.17, push: 0.065 },
    hubY: 0.299,
    arc: [-22, 202],          // degrees, 0 = forward, 90 = up
    lip: 0.03,                // flat face width at the arch edge
    rivetEvery: 9,            // degrees
};
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

function flare(sample, side, cfg, mat, rivetGeo, rivetMat) {
    const { hubY, arc: arc0, lip, rivetEvery } = KIT;
    const c = v3(0, hubY, cfg.hubZ);
    const rOut = cfg.rIn + cfg.slope;
    let lastIn = 0.86, lastOut = 0.85;
    const bodyX = (r, u, fallback) => {
        const p = c.clone().addScaledVector(u, r);
        const hit = sample(v3(side * 1.5, p.y, p.z), v3(-side, 0, 0));
        return hit && Math.abs(hit.x) > 0.6 ? Math.abs(hit.x) : fallback;
    };
    // Stop the arc where the flare's outer edge would drop below the sill line
    // (y ~0.175), so the ends never hang below the body.
    const lim = Math.round(THREE.MathUtils.radToDeg(Math.asin((0.175 - hubY) / rOut)));
    const arc = [Math.max(arc0[0], lim), Math.min(arc0[1], 180 - lim)];
    const rings = [], rivets = [];
    for (let deg = arc[0]; deg <= arc[1] + 1e-6; deg += 2) {
        const t = THREE.MathUtils.degToRad(deg);
        const u = v3(0, Math.sin(t), Math.cos(t));
        const xin = (lastIn = bodyX(cfg.rIn + 0.03, u, lastIn));
        const xout = (lastOut = bodyX(rOut, u, lastOut));
        const taper = smooth(arc[0], arc[0] + 22, deg) * smooth(arc[1], arc[1] - 22, deg);
        const ext = 0.006 + cfg.ext * taper;
        const at = (r, x) => c.clone().addScaledVector(u, r).setX(side * x);
        const p0 = at(cfg.rIn + 0.006, xin - 0.012);
        const p1 = at(cfg.rIn - 0.004, xin + ext);
        const p2 = at(cfg.rIn + lip, xin + ext * 0.96);
        const p3 = at(rOut, xout - 0.004);
        rings.push(side > 0 ? [p0, p1, p2, p3] : [p0, p3, p2, p1]);
        if ((deg - arc[0]) % rivetEvery === 0 && taper > 0.5) rivets.push({ p: p2.clone().lerp(p3, 0.22), a: p2, b: p3 });
    }
    const group = new THREE.Group();
    group.add(new THREE.Mesh(ringsGeometry(rings), mat));
    // Rivet heads: short cylinders sitting on the flare face.
    const inst = new THREE.InstancedMesh(rivetGeo, rivetMat, rivets.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = v3(0, 1, 0);
    rivets.forEach(({ p, a, b }, i) => {
        const slope = b.clone().sub(a).normalize();
        const tangent = v3(0, -(p.z - c.z), p.y - c.y).normalize(); // along the arc
        const n = slope.clone().cross(tangent).normalize();
        if (n.x * side < 0) n.negate();
        q.setFromUnitVectors(up, n);
        m.compose(p.clone().addScaledVector(n, 0.002), q, v3(1, 1, 1));
        inst.setMatrixAt(i, m);
    });
    inst.name = 'rivets';
    group.add(inst);
    return group;
}

// Strip swept along a path. path: [{ p, out, up }] (unit vectors); profile:
// closed list of [o, u] offsets along out/up. scale(i) shrinks the ends.
function loft(path, profile, mat, scale = () => 1) {
    const rings = path.map(({ p, out, up }, i) => profile.map(([o, u]) => p.clone().addScaledVector(out, o * scale(i)).addScaledVector(up, u * scale(i))));
    return new THREE.Mesh(ringsGeometry(rings), mat);
}

export function createBodyKit(model, palette) {
    const bodyMesh = model.getObjectByName('Body_kit');
    const sample = surfaceSampler(model, bodyMesh);
    const paint = palette.MiiaSilver.clone();
    paint.side = THREE.DoubleSide;
    const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, metalness: 0.3, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const rivetMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.6, roughness: 0.35 });
    const rivetGeo = new THREE.CylinderGeometry(0.0055, 0.006, 0.004, 10);

    const kit = new THREE.Group();
    kit.name = 'widebody';
    kit.visible = false;
    let built = false;
    function buildKit() {
        if (built) return;
        built = true;
        for (const side of [1, -1]) for (const cfg of [KIT.front, KIT.rear]) kit.add(flare(sample, side, cfg, paint, rivetGeo, rivetMat));
        kit.add(frontLip(), diffuser(), ...[1, -1].map(sideSkirt));
        kit.traverse((o) => { if (o.isMesh) o.userData.partId = 'widebody'; });
    }

    // Front lip: a downward/forward blade following the bumper's lower edge.
    function frontLip() {
        const path = [];
        const cz = 1.45;
        for (let deg = -62; deg <= 62; deg += 3) {
            const t = THREE.MathUtils.degToRad(deg);
            const dir = v3(Math.sin(t), 0, Math.cos(t));
            // Bumper lower edge: cast inward at a height just above the bottom.
            const hit = sample(v3(0, 0.185, cz).addScaledVector(dir, 1.2), dir.clone().negate());
            if (!hit) continue;
            path.push({ p: hit.setY(0.16), out: dir, up: v3(0, 1, 0) });
        }
        const profile = [[-0.07, 0.012], [0.012, 0.004], [0.04, -0.012], [0.04, -0.02], [-0.07, -0.012]];
        return loft(path, profile, paint, (i) => 0.4 + 0.6 * smooth(0, 6, i) * smooth(path.length - 1, path.length - 7, i));
    }

    // Rear diffuser: a kicked-up undertray under the rear bumper with fins
    // (kept clear of the exhaust tips at x = ±0.29..0.43).
    function diffuser() {
        // Follows the bumper's underside, which rises ~95 mm over the last 0.4 m.
        const g = new THREE.Group();
        const w = 0.9, len = 0.34;
        g.position.set(0, 0.238, -1.73);
        g.rotation.x = Math.atan2(0.095, 0.4); // rear edge up
        g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, len), paint));
        for (const x of [-0.46, -0.2, 0, 0.2, 0.46]) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.045, len * 0.85), paint);
            fin.position.set(x, -0.026, -0.02);
            g.add(fin);
        }
        return g;
    }

    // Slim sill extension between the arches (not part of the official kit).
    function sideSkirt(side) {
        const path = [];
        for (let z = 0.78; z >= -0.7; z -= 0.06) {
            const hit = sample(v3(side * 1.5, 0.2, z), v3(-side, 0, 0));
            if (hit) path.push({ p: hit.setY(0.165), out: v3(side, 0, 0), up: v3(0, 1, 0) });
        }
        const profile = side > 0
            ? [[-0.015, 0.05], [-0.015, -0.015], [0.03, -0.015], [0.03, -0.004], [0.004, 0.05]]
            : [[-0.015, 0.05], [0.004, 0.05], [0.03, -0.004], [0.03, -0.015], [-0.015, -0.015]];
        return loft(path, profile, paint, (i) => 0.5 + 0.5 * smooth(0, 3, i) * smooth(path.length - 1, path.length - 4, i));
    }

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

    // ── wheels: push out to fill the flares ──────────────────
    // The tyres/rims/rotors are carved per wheel at load (parts.js), names end
    // in -FL/-FR/-RL/-RR. Calipers are children of their rotor, so they follow.
    const wheelNodes = [];
    model.traverse((o) => {
        const m = o.name.match(/-(F|R)(L|R)$/);
        if (!m) return;
        const front = m[1] === 'F', left = m[2] === 'L';
        wheelNodes.push({ o, x0: o.position.x, push: (left ? 1 : -1) * (front ? KIT.front.push : KIT.rear.push) });
    });

    model.add(kit, spoilers);
    return {
        kit, spoilers, paint,
        setKit(on, { rivets = true } = {}) {
            if (on) buildKit();
            kit.visible = on;
            kit.traverse((o) => { if (o.name === 'rivets') o.visible = rivets; });
            for (const { o, x0, push } of wheelNodes) o.position.x = x0 + (on ? push : 0);
        },
        setSpoiler(kind) {
            if (kind && kind !== 'none') buildSpoiler(kind);
            for (const [k, obj] of Object.entries(spoilerMeshes)) if (obj) obj.visible = k === kind;
        },
    };
}
