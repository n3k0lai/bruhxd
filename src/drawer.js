import { BAR_PRESETS, FAVORITES } from './rollbar.js';
import { colorHex, writeParams } from './mods.js';
import { SEAT_PRESETS } from './seats.js';
import { SPOILERS } from './body.js';

// Hamburger menu + slide-out drawer of car toggles, driven by mods.js.
// Plain DOM over the canvas: pointer events on the menu never reach the
// canvas, so dragging the car and using the menu don't fight.
export function createDrawer({ container, mods }) {
    const btn = el('button', { id: 'menu-btn', type: 'button', 'aria-label': 'Car options', 'aria-expanded': 'false', 'aria-controls': 'drawer' });
    btn.innerHTML = '<span></span><span></span><span></span>';

    const drawer = el('aside', { id: 'drawer', 'aria-hidden': 'true' });
    const head = el('header');
    head.append(el('h2', {}, 'MIIA · MODS'), el('button', { type: 'button', class: 'close', 'aria-label': 'Close' }, '×'));

    const toggles = {
        rollbar: toggle('Roll bar', 'Hard Dog ND Sport mock-up'),
        hoops: toggle('Stock hoop covers', 'and wind blocker'),
        shielding: toggle('Bulkhead trim', 'plastic shielding behind the seats'),
    };
    const barColor = swatches('Bar colour', BAR_PRESETS, (v) => mods.set({ color: v }));
    const mirrorToggle = toggle('Pearl mirror caps', 'body pearl instead of gloss black');
    const seatColor = swatches('Seat colour', SEAT_PRESETS, (v) => mods.set({ seats: v }));
    mirrorToggle.input.addEventListener('change', () => mods.set({ mirrors: mirrorToggle.input.checked ? 'pearl' : 'black' }));
    const reset = el('button', { type: 'button', class: 'reset' }, 'Reset to stock');
    const copy = el('button', { type: 'button', class: 'reset copy' }, 'Copy config link');

    // Body: spoiler selector (approximations, see body.js).
    const spoilerBox = el('fieldset', { class: 'segmented' });
    spoilerBox.append(el('legend', {}, 'Spoiler'));
    const segRow = el('div', { class: 'seg' });
    const segButtons = Object.entries(SPOILERS).map(([key, label]) => {
        const b = el('button', { type: 'button', 'aria-pressed': 'false' }, label);
        b.dataset.key = key;
        b.addEventListener('click', () => mods.set({ spoiler: key }));
        segRow.append(b);
        return b;
    });
    spoilerBox.append(segRow);

    // Scene: floor grid and background gradient stops.
    const sceneHead = el('h3', {}, 'Scene');
    const floorToggle = toggle('Floor', 'outlined grid, 0.5 m squares');
    const bgBox = el('fieldset', { class: 'swatches bg' });
    bgBox.append(el('legend', {}, 'Background gradient'));
    // One row per stop: favourites, then a free colour input showing the current stop.
    const setStop = (i, hex) => { const bg = [...mods.state.bg]; bg[i] = hex; mods.set({ bg }); };
    const bgInputs = [0, 1].map((i) => {
        const row = el('div', { class: 'grid stop' });
        row.append(el('span', { class: 'stop-label' }, i ? 'To' : 'From'));
        const favButtons = FAVORITES.map((key) => {
            const hex = BAR_PRESETS[key].color.toString(16).padStart(6, '0');
            const b = el('button', { type: 'button', class: 'swatch', title: BAR_PRESETS[key].label, 'aria-label': `${BAR_PRESETS[key].label} (stop ${i + 1})` });
            b.style.setProperty('--c', '#' + hex);
            if (key === 'miia-silver') b.classList.add('pearl');
            b.dataset.hex = hex;
            b.addEventListener('click', () => setStop(i, hex));
            row.append(b);
            return b;
        });
        const wrap = el('label', { class: 'swatch custom on', title: `Custom colour (stop ${i + 1})` });
        const input = el('input', { type: 'color', 'aria-label': `Background colour ${i + 1}` });
        input.addEventListener('input', () => setStop(i, input.value.slice(1)));
        wrap.append(input);
        row.append(wrap);
        bgBox.append(row);
        return { wrap, input, favButtons };
    });
    const bgReset = el('button', { type: 'button', class: 'mini' }, 'Default gradient');
    bgReset.addEventListener('click', () => mods.set({ bg: null }));
    bgBox.append(bgReset);
    floorToggle.input.addEventListener('change', () => mods.set({ floor: floorToggle.input.checked }));

    const body = el('div', { class: 'body' });
    body.append(el('h3', {}, 'Car'), toggles.rollbar.row, toggles.hoops.row, toggles.shielding.row, barColor.box,
        seatColor.box, mirrorToggle.row,
        el('h3', {}, 'Body'), spoilerBox,
        sceneHead, floorToggle.row, bgBox, reset, copy);
    drawer.append(head, body);
    container.append(btn, drawer);

    for (const [key, t] of Object.entries(toggles)) t.input.addEventListener('change', () => mods.set({ [key]: t.input.checked }));
    reset.addEventListener('click', () => mods.reset());
    copy.addEventListener('click', async () => {
        // Always share the public site URL so a localhost session still produces
        // a link others can open.
        const url = writeParams(mods.state, new URL('https://bruhxd.com/')).href;
        try {
            await navigator.clipboard.writeText(url);
            copy.textContent = 'Copied!';
            copy.classList.add('ok');
            setTimeout(() => { copy.textContent = 'Copy config link'; copy.classList.remove('ok'); }, 1500);
        } catch {
            // Fallback: select-friendly prompt if clipboard is blocked.
            window.prompt('Copy this config link:', url);
        }
    });

    let open = false;
    function setOpen(on) {
        open = on;
        drawer.classList.toggle('open', on);
        btn.classList.toggle('open', on);
        btn.setAttribute('aria-expanded', String(on));
        drawer.setAttribute('aria-hidden', String(!on));
        drawer.inert = !on;
    }
    btn.addEventListener('click', () => setOpen(!open));
    head.querySelector('.close').addEventListener('click', () => setOpen(false));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) setOpen(false); });
    // Belt and braces: keep gestures that start on the menu away from anything
    // listening further up (the controls only listen on the canvas).
    for (const n of [btn, drawer]) n.addEventListener('pointerdown', (e) => e.stopPropagation());

    function render(s) {
        for (const [key, t] of Object.entries(toggles)) t.input.checked = !!s[key];
        floorToggle.input.checked = !!s.floor;
        mirrorToggle.input.checked = s.mirrors === 'pearl';
        seatColor.select(s.seats);
        segButtons.forEach((b) => { const on = b.dataset.key === s.spoiler; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
        s.bg.forEach((c, i) => {
            const { input, wrap, favButtons } = bgInputs[i];
            input.value = '#' + c;
            wrap.style.setProperty('--c', '#' + c);
            const fav = favButtons.find((b) => b.dataset.hex === c);
            favButtons.forEach((b) => b.classList.toggle('on', b === fav));
            wrap.classList.toggle('on', !fav);
        });
        barColor.select(s.color);
        // Bar colour only means something with the bar fitted.
        barColor.box.classList.toggle('disabled', !s.rollbar);
    }
    mods.onChange(render);
    render(mods.state);
    setOpen(false);
    return { setOpen, get open() { return open; } };

    function toggle(label, hint) {
        const row = el('label', { class: 'row' });
        const input = el('input', { type: 'checkbox', role: 'switch' });
        const text = el('span', { class: 'text' });
        text.append(el('span', { class: 'label' }, label), el('span', { class: 'hint' }, hint));
        row.append(text, input, el('span', { class: 'switch', 'aria-hidden': 'true' }));
        return { row, input };
    }

    function swatches(label, presets, onPick) {
        const box = el('fieldset', { class: 'swatches' });
        box.append(el('legend', {}, label));
        // Favourites first, on their own row, then the rest.
        const favs = el('div', { class: 'grid favs' });
        const grid = el('div', { class: 'grid' });
        const buttons = new Map();
        const keys = [...FAVORITES.filter((k) => presets[k]), ...Object.keys(presets).filter((k) => !FAVORITES.includes(k))];
        for (const key of keys) {
            const p = presets[key];
            const b = el('button', { type: 'button', class: 'swatch', title: p.label, 'aria-label': p.label });
            b.style.setProperty('--c', colorHex(key, presets));
            if (key === 'miia-silver') b.classList.add('pearl');
            b.addEventListener('click', () => onPick(key));
            (FAVORITES.includes(key) ? favs : grid).append(b);
            buttons.set(key, b);
        }
        box.append(favs);
        const custom = el('label', { class: 'swatch custom', title: 'Custom colour' });
        const picker = el('input', { type: 'color', 'aria-label': `${label}: custom` });
        picker.addEventListener('input', () => onPick(picker.value));
        custom.append(picker);
        grid.append(custom);
        const name = el('span', { class: 'name' });
        box.append(grid, name);
        return {
            box,
            select(value) {
                const preset = presets[value];
                buttons.forEach((b, k) => b.classList.toggle('on', k === value));
                custom.classList.toggle('on', !preset);
                picker.value = colorHex(value, presets);
                if (!preset) custom.style.setProperty('--c', picker.value);
                name.textContent = preset ? preset.label : picker.value;
            },
        };
    }
}

function el(tag, attrs = {}, text) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
}
