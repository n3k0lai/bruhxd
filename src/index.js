import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCar } from './car.js';
import { createGradient, setGradientColors } from './bg.js';
import { createControls } from './controls.js';
import { createHotspots } from './hotspots.js';
import { easterEgg } from './egg.js';
import { createMods, stateFromParams } from './mods.js';
import { createDrawer } from './drawer.js';

const params = new URLSearchParams(window.location.search);
const debugMode = params.has('debug');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharp on the Fold without 3x fill cost
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Studio reflections so the pearl clearcoat, chrome and glass read as such
// (without an environment map PBR materials go flat grey).
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;

const gradient = createGradient();
scene.add(gradient);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 7.5);
scene.add(sun);

let car = null, controls = null, hotspots = null, selected = null, mods = null;
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function fitCar() {
    if (!car) return;
    // Scale so the car's bounding sphere fills part of the narrower view axis.
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const visibleHalf = Math.tan(Math.min(vFov, hFov) / 2) * camera.position.z;
    // Portrait phones: use nearly the full width (the sphere already leaves room
    // to spin without clipping). Landscape: keep the original's smaller look.
    const fill = camera.aspect < 1 ? 0.85 : 0.62;
    car.fit.scale.setScalar((visibleHalf * fill) / car.radius);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    gradient.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    fitCar();
}

// ── part selection / mockup API ─────────────────────────────
function partMeshes(id) { return car?.parts.get(id)?.objects ?? []; }

function select(id) {
    if (selected) partMeshes(selected).forEach((m) => m.material.emissive?.setHex(0x000000));
    selected = id && car.parts.has(id) ? id : null;
    if (selected) partMeshes(selected).forEach((m) => m.material.emissive?.setHex(0x6a4a00));
    hotspots?.showPanel(selected ? car.parts.get(selected) : null);
    if (controls) controls.paused = !!selected; // stop auto-spin while reading a part
    const url = new URL(window.location);
    selected ? url.searchParams.set('part', selected) : url.searchParams.delete('part');
    history.replaceState(null, '', url);
}

function pick(e) {
    if (!car) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(car.model, true).find((h) => h.object.visible && h.object.userData.partId);
    select(hit ? hit.object.userData.partId : null);
}

const api = {
    get parts() { return car ? [...car.parts.values()].map(({ objects, anchorLocal, ...p }) => p) : []; },
    select,
    setColor(id, hex) { partMeshes(id).forEach((m) => m.material.color?.set(hex)); },
    setVisible(id, on) { partMeshes(id).forEach((m) => { m.visible = on; }); },
    reset(id) {
        const ids = id ? [id] : [...car.parts.keys()];
        ids.forEach((pid) => partMeshes(pid).forEach((m) => { m.material.copy(m.userData.baseMaterial); m.visible = true; }));
        mods?.apply(); // menu toggles win over the blanket "visible"
        if (selected) select(selected);
    },
    toggleHotspots(on = !hotspots?.visible) { hotspots?.setVisible(on); },
    // Fixed camera view for docs / screenshots, e.g. view({ x: 0.2, y: 1.6, zoom: 2.5 }).
    // target: [x, y, z] in the glTF frame (metres) to orbit/zoom around instead of
    // the car's centre, e.g. [0, 1.0, -0.8] for the roll bar; null restores it.
    view(v, { hold = true } = {}) {
        if (car && v.target !== undefined) car.model.position.copy(v.target ? new THREE.Vector3(...v.target).negate() : car.home);
        controls?.setView(v);
        // Close-ups past the pinch limit (docs only; the next pinch/wheel re-clamps).
        if (car && v.zoom > (controls?.state().zoom ?? Infinity)) car.pivot.scale.setScalar(v.zoom);
        if (controls && hold) controls.paused = true;
    },
    // Mods menu state (see mods.js), e.g. mods({ rollbar: true, color: 'caliper-red' }).
    mods(patch) { return patch ? mods?.set(patch) : mods?.state; },
    // rollbar('gloss-black' | '#d3101b' | true | false): show the bar / set its colour.
    rollbar(value = true) { return mods?.set(typeof value === 'boolean' ? { rollbar: value } : { rollbar: true, color: value }); },
    // background(['111111', '000000'] | null) and floor(true | false): scene options.
    background(stops) { return mods?.set({ bg: stops }); },
    floor(on = true) { return mods?.set({ floor: on }); },
    // seats('tan' | '#a57a50' | null): seat upholstery colour (null = stock black).
    seats(value) { return mods?.set({ seats: value ?? null }); },
    // mirrors('pearl' | 'black' | true | false): mirror caps (true = pearl).
    mirrors(value = 'pearl') { return mods?.set({ mirrors: value }); },
    debugState: () => ({ ...controls?.state(), selected, hotspots: hotspots?.visible ?? false, mods: mods?.state }),
};
window.__bruhxd = api;

async function init() {
    window.addEventListener('resize', onResize);
    onResize();
    easterEgg();
    try {
        car = await createCar(debugMode);
        scene.add(car.pivot);
        car.home = car.model.position.clone();
        if (debugMode) window.__bruhxdCar = car; // console / screenshot tooling
        // ?debug: what is under a screen pixel? -> { name, part, point (glTF frame) }
        if (debugMode) window.__bruhxdPick = (x, y) => {
            const ndc = new THREE.Vector2(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            const hit = raycaster.intersectObject(car.model, true).find((h) => h.object.visible && h.object.isMesh);
            if (!hit) return null;
            const p = car.model.worldToLocal(hit.point.clone());
            return { name: hit.object.name, part: hit.object.userData.partId, point: p.toArray().map((v) => +v.toFixed(3)) };
        };
        fitCar();
        controls = createControls(renderer.domElement, car.pivot, { onTap: (e) => (hotspots?.visible || selected) && pick(e) });
        hotspots = createHotspots({ container: document.body, camera, car, onSelect: select });
        mods = createMods(car, stateFromParams(params), { setBackground: (stops) => setGradientColors(gradient, stops) });
        createDrawer({ container: document.body, mods });
        if (params.has('parts')) hotspots.setVisible(true);
        if (params.get('parts') === 'labels') hotspots.setLabels(true);
        if (params.get('part')) { hotspots.setVisible(true); select(params.get('part')); }
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p') api.toggleHotspots();
            if (e.key === 'Escape') select(null);
        });
    } catch (error) {
        console.error('Failed to load car model:', error);
    }
    renderer.setAnimationLoop(animate);
}

let lastT = performance.now();
function animate(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (!reduceMotion) gradient.material.uniforms.uTime.value += dt;
    controls?.update(dt, now);
    renderer.render(scene, camera);
    hotspots?.update(window.innerWidth, window.innerHeight);
}

init();
