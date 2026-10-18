import * as THREE from 'three';

// Part labels projected from 3D anchors, plus a black info panel.
// Off by default so the public page looks the same; enable with ?parts or "p".
// Dots only; a label shows on hover / selection, or all labels with ?parts=labels.
export function createHotspots({ container, camera, car, onSelect }) {
    const layer = document.createElement('div');
    layer.id = 'hotspots';
    container.appendChild(layer);

    const items = [];
    for (const part of car.parts.values()) {
        if (!part.anchorLocal) continue;
        const el = document.createElement('button');
        el.className = 'hotspot';
        el.type = 'button';
        el.dataset.part = part.id;
        el.dataset.category = part.category;
        el.innerHTML = '<span class="dot"></span><span class="label"></span>';
        el.querySelector('.label').textContent = part.label;
        el.addEventListener('pointerdown', (e) => { e.stopPropagation(); onSelect(part.id); });
        layer.appendChild(el);
        items.push({ part, el });
    }

    const panel = document.createElement('aside');
    panel.id = 'part-panel';
    panel.hidden = true;
    container.appendChild(panel);

    const v = new THREE.Vector3(), centre = new THREE.Vector3(), toCam = new THREE.Vector3(), out = new THREE.Vector3();
    let visible = false;

    return {
        get visible() { return visible; },
        setVisible(on) { visible = on; layer.classList.toggle('on', on); },
        setLabels(on) { layer.classList.toggle('labels', on); },
        showPanel(part) {
            if (!part) { panel.hidden = true; return; }
            panel.hidden = false;
            panel.innerHTML = '';
            const h = document.createElement('h2'); h.textContent = part.label;
            const meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = `${part.category} · ${part.id}`;
            panel.append(h, meta);
            if (part.notes) { const n = document.createElement('p'); n.textContent = part.notes; panel.append(n); }
            if (part.changed) { const c = document.createElement('p'); c.className = 'changed'; c.textContent = `Model fix: ${part.changed}`; panel.append(c); }
            const m = document.createElement('p'); m.className = 'meshes'; m.textContent = `meshes: ${part.meshes.join(', ')}`;
            panel.append(m);
            items.forEach(({ part: p, el }) => el.classList.toggle('selected', p.id === part.id));
        },
        clearSelection() { panel.hidden = true; items.forEach(({ el }) => el.classList.remove('selected')); },
        update(width, height) {
            if (!visible) return;
            car.model.localToWorld(centre.set(0, 0, 0));
            for (const { part, el } of items) {
                car.model.localToWorld(v.copy(part.anchorLocal));
                // Hide labels on the far side of the car (interior parts always show).
                const facing = part.category === 'interior' ||
                    out.copy(v).sub(centre).normalize().dot(toCam.copy(camera.position).sub(v).normalize()) > -0.05;
                v.project(camera);
                const x = (v.x * 0.5 + 0.5) * width, y = (-v.y * 0.5 + 0.5) * height;
                el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
                el.classList.toggle('behind', (!facing && !el.classList.contains('selected')) || v.z > 1);
            }
        },
    };
}
