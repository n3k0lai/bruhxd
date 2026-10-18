import { BAR_PRESETS, BAR_DEFAULT, LED_PRESETS, LED_DEFAULT, parseColor } from './rollbar.js';
import { BG_DEFAULT } from './bg.js';

// Car mods state: roll bar mock-up, stock hoop covers, bulkhead trim, LED strip,
// plus the scene: background gradient stops and an optional floor grid.
// Default is stock (nothing changed), so the public page looks the same unless
// a URL param or the menu turns something on. State is mirrored to the URL:
//
//   ?rollbar[=on|off|<preset>|<hex>]   roll bar (and its colour); turning it on
//                                      also hides the hoop covers unless ?hoops says otherwise
//   ?mock=rollbar                      alias for ?rollbar
//   ?hoops=on|off                      stock hoop covers + wind blocker
//   ?shielding=off                     plastic bulkhead trim behind the seats
//   ?led[=on|off|<preset>|<hex>]       LED strip under the bar (only shown with the bar)
//   ?bg=<hex>,<hex>                    background gradient stops (default ff0000,ffd600)
//   ?floor[=on|off]                    outlined 0.5 m grid on the ground plane
//
// Colours are preset keys (rollbar.js) or hex without the '#', e.g. ?rollbar=d3101b.

export const STOCK = Object.freeze({
    rollbar: false, hoops: true, shielding: true, color: BAR_DEFAULT, led: false, ledColor: LED_DEFAULT,
    bg: BG_DEFAULT, floor: false,
});
const PARAMS = ['mock', 'rollbar', 'hoops', 'shielding', 'led', 'bg', 'floor'];
const HEX6 = /^(?:#|0x)?([0-9a-f]{6})$/i;
const sameBg = (a, b) => a[0] === b[0] && a[1] === b[1];

const ON = new Set(['', '1', 'on', 'true', 'yes']), OFF = new Set(['0', 'off', 'false', 'no']);
const colorKey = (value, presets) => {
    const p = parseColor(value, presets);
    return p ? (p.key ?? p.hex.toString(16).padStart(6, '0')) : null;
};

export function stateFromParams(params) {
    const s = { ...STOCK };
    const flagged = (name, key, presets) => {
        if (!params.has(name)) return undefined;
        const v = params.get(name).trim().toLowerCase();
        if (OFF.has(v)) return false;
        if (ON.has(v)) return true;
        const c = presets && colorKey(v, presets);
        if (c) { s[key] = c; return true; }
        return true;
    };
    if (params.get('mock') === 'rollbar') s.rollbar = true;
    const rb = flagged('rollbar', 'color', BAR_PRESETS);
    if (rb !== undefined) s.rollbar = rb;
    s.hoops = !s.rollbar;
    const hoops = flagged('hoops');
    if (hoops !== undefined) s.hoops = hoops;
    const sh = flagged('shielding');
    if (sh !== undefined) s.shielding = sh;
    const led = flagged('led', 'ledColor', LED_PRESETS);
    if (led !== undefined) s.led = led;
    const bg = (params.get('bg') ?? '').split(',').map((c) => c.trim().match(HEX6)?.[1].toLowerCase());
    if (bg.length === 2 && bg.every(Boolean)) s.bg = bg;
    const floor = flagged('floor');
    if (floor !== undefined) s.floor = floor;
    return s;
}

export function writeParams(state, url) {
    const q = url.searchParams;
    PARAMS.forEach((k) => q.delete(k));
    if (state.rollbar) q.set('rollbar', state.color === BAR_DEFAULT ? 'on' : state.color);
    if (state.hoops !== !state.rollbar) q.set('hoops', state.hoops ? 'on' : 'off');
    if (!state.shielding) q.set('shielding', 'off');
    if (state.led) q.set('led', state.ledColor === LED_DEFAULT ? 'on' : state.ledColor);
    if (!sameBg(state.bg, BG_DEFAULT)) q.set('bg', state.bg.join(','));
    if (state.floor) q.set('floor', 'on');
    return url;
}

// Owns the state and applies it to the car and scene. `scene.setBackground(stops)`
// recolours the gradient. `onChange(state)` lets the menu follow.
export function createMods(car, initial = STOCK, scene = {}) {
    let state = { ...STOCK };
    const listeners = new Set();

    function apply() {
        for (const p of car.parts.values()) {
            if (!p.mod) continue;
            const on = !!state[p.mod];
            if (p.mod === 'rollbar') continue;
            p.objects.forEach((o) => { o.visible = on; });
        }
        car.rollbar.group.visible = state.rollbar;
        car.rollbar.setColor(state.color);
        car.rollbar.setLed(state.rollbar && state.led, state.ledColor);
        car.floor.visible = state.floor;
        scene.setBackground?.(state.bg);
    }

    function set(patch, { url = true } = {}) {
        const next = { ...state, ...patch };
        // The stock covers sit where the new main hoop goes: swap them together
        // unless the caller says otherwise.
        if ('rollbar' in patch && !('hoops' in patch)) next.hoops = !next.rollbar;
        if ('color' in patch) next.color = colorKey(patch.color, BAR_PRESETS) ?? state.color;
        if ('ledColor' in patch) next.ledColor = colorKey(patch.ledColor, LED_PRESETS) ?? state.ledColor;
        if ('bg' in patch) {
            const bg = (patch.bg ?? BG_DEFAULT).map((c) => String(c).match(HEX6)?.[1].toLowerCase());
            next.bg = bg.length === 2 && bg.every(Boolean) ? bg : state.bg;
        }
        state = next;
        apply();
        if (url) history.replaceState(null, '', writeParams(state, new URL(window.location)));
        listeners.forEach((fn) => fn(state));
        return state;
    }

    set(initial, { url: false });
    return {
        get state() { return state; },
        set,
        apply,
        reset() { return set({ ...STOCK }); },
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    };
}

// Hex string for an <input type=color> from a state colour.
export function colorHex(value, presets) {
    const p = parseColor(value, presets);
    if (!p) return '#000000';
    const hex = p.hex ?? 0;
    return '#' + hex.toString(16).padStart(6, '0');
}
