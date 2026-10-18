// Direct-manipulation rotate / zoom for the car.
//
// Why: the old touch path rotated at 0.00008 rad/px while dragging (a full
// screen swipe moved the car ~5°) and then dumped a big velocity in on
// touchend, so the car only visibly moved after you let go. Desktop used
// window-level mouse events and a separate code path.
//
// Now: one Pointer Events path for mouse, touch and pen. The car follows the
// finger 1:1 from the first pointermove, momentum is only a gentle tail on
// release, and a new touch instantly catches a spinning car.

const ROTATE_PER_PX = 0.008;           // rad per CSS px, same on touch and mouse
const MAX_TILT = Math.PI / 3;
const FRICTION_PER_SEC = 0.04;         // fraction of velocity left after 1 s of coasting
const MAX_SPIN = 12;                   // rad/s cap on a flick
const FLICK_WINDOW_MS = 80;            // finger held still this long before release = no flick
const AUTO_ROTATE_DELAY_MS = 1000;     // matches the original interactionTimeout
const AUTO_ROTATE_SPEED = 0.3;         // rad/s (original 0.005 rad/frame at 60 fps)
const TAP_SLOP_PX = 8;
const MIN_ZOOM = 0.3, MAX_ZOOM = 4;

export function createControls(el, pivot, { onTap } = {}) {
    el.style.touchAction = 'none';     // no browser pan/zoom/double-tap delay on the canvas
    el.style.userSelect = 'none';

    const pointers = new Map();        // pointerId -> {x, y}
    let vx = 0, vy = 0;                // rad/s
    let lastMoveT = 0, lastInteraction = 0;
    let tap = null;                    // candidate tap {id, x, y, t}
    let pinch = null;                  // {dist, zoom}
    let zoom = 1;

    const clampTilt = () => { pivot.rotation.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, pivot.rotation.x)); };
    const setZoom = (z) => { zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)); pivot.scale.setScalar(zoom); };
    const pinchDist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

    el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        el.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        vx = vy = 0;                    // catch a spinning car immediately
        lastMoveT = lastInteraction = e.timeStamp;
        tap = pointers.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp } : null;
        if (pointers.size === 2) pinch = { dist: pinchDist(), zoom };
        e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
        const p = pointers.get(e.pointerId);
        if (!p) return;
        // Coalesced events give every sample the OS delivered between frames.
        const samples = e.getCoalescedEvents?.().length ? e.getCoalescedEvents() : [e];
        const last = samples[samples.length - 1];
        const dx = last.clientX - p.x, dy = last.clientY - p.y;
        p.x = last.clientX; p.y = last.clientY;
        lastInteraction = e.timeStamp;

        if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_SLOP_PX) tap = null;

        if (pointers.size >= 2 && pinch) {
            setZoom(pinch.zoom * (pinchDist() / pinch.dist));
            return;
        }
        pivot.rotation.y += dx * ROTATE_PER_PX;
        pivot.rotation.x += dy * ROTATE_PER_PX;
        clampTilt();

        const dt = Math.max(1, e.timeStamp - lastMoveT) / 1000;
        const ivx = (dy * ROTATE_PER_PX) / dt, ivy = (dx * ROTATE_PER_PX) / dt;
        vx = 0.6 * ivx + 0.4 * vx;      // light smoothing so one jittery sample can't fling it
        vy = 0.6 * ivy + 0.4 * vy;
        lastMoveT = e.timeStamp;
    });

    const end = (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        lastInteraction = e.timeStamp;
        if (e.timeStamp - lastMoveT > FLICK_WINDOW_MS || e.type === 'pointercancel') vx = vy = 0;
        vx = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, vx));
        vy = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, vy));
        if (tap && tap.id === e.pointerId && e.type === 'pointerup' && e.timeStamp - tap.t < 400) {
            vx = vy = 0;
            onTap?.(e);
        }
        tap = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);

    el.addEventListener('wheel', (e) => {
        e.preventDefault();
        setZoom(zoom * Math.exp(-e.deltaY * 0.001));
        lastInteraction = e.timeStamp;
    }, { passive: false });

    return {
        // Called once per animation frame with seconds since the last frame.
        update(dt, now) {
            if (pointers.size) return;
            if (vx || vy) {
                pivot.rotation.x += vx * dt;
                pivot.rotation.y += vy * dt;
                clampTilt();
                const k = Math.pow(FRICTION_PER_SEC, dt);
                vx *= k; vy *= k;
                if (Math.abs(vx) < 0.01) vx = 0;
                if (Math.abs(vy) < 0.01) vy = 0;
            } else if (now - lastInteraction > AUTO_ROTATE_DELAY_MS && !this.paused) {
                pivot.rotation.y += AUTO_ROTATE_SPEED * dt;
            }
        },
        paused: false,
        // Jump to a fixed view (radians / zoom factor); stops coasting.
        setView({ x, y, zoom: z } = {}) {
            if (x !== undefined) pivot.rotation.x = x;
            if (y !== undefined) pivot.rotation.y = y;
            if (z !== undefined) setZoom(z);
            clampTilt();
            vx = vy = 0;
        },
        get dragging() { return pointers.size > 0; },
        state() { return { rotX: pivot.rotation.x, rotY: pivot.rotation.y, zoom, vx, vy, pointers: pointers.size }; },
    };
}
