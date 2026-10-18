import * as THREE from 'three';

// Material palette. Values are Nicholai's original hand-tuned materials from
// car.js, moved here unchanged so parts can reference them by key.
export function createPalette() {
    return {
        Glass: new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.5,
            envMapIntensity: 1, clearcoat: 1, clearcoatRoughness: 0, opacity: 0.3, transparent: true,
        }),
        RedGlass: new THREE.MeshPhysicalMaterial({
            color: 0xff0000, metalness: 0, roughness: 0, transmission: 1, thickness: 0.5,
            envMapIntensity: 1, clearcoat: 1, clearcoatRoughness: 0, opacity: 0.5, transparent: true,
        }),
        RedMetal: new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.8, roughness: 0.2 }),
        BlackMetal: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 }),
        Chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.1 }),
        PearlWhite: new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1,
        }),
        // Miia's paint: "a beautiful light muted silver with a rich pearloid shimmer"
        // (possibly Mazda Ceramic Metallic, unconfirmed). Light, slightly
        // desaturated silver; metallic flake under a glossy clearcoat; a thin
        // iridescent film + cool sheen for the pearl shift at glancing angles,
        // kept low so it reads silver, not rainbow.
        // Revert: point parts.js 'body' / 'mirrors' back at PearlWhite (his original,
        // { color: 0xffffff, metalness: 0.1, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }).
        MiiaSilver: new THREE.MeshPhysicalMaterial({
            color: 0xc6c8cc, metalness: 0.6, roughness: 0.35,
            clearcoat: 1, clearcoatRoughness: 0.05,
            iridescence: 0.25, iridescenceIOR: 1.45, iridescenceThicknessRange: [300, 450],
            sheen: 0.35, sheenColor: 0xe6ebf5, sheenRoughness: 0.45,
            envMapIntensity: 1.3,
        }),
        BlackPlastic: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0, roughness: 0.8 }),
        GreyPlastic: new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0, roughness: 0.5 }),
        BlackCloth: new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0, roughness: 0.8 }),
        MaroonCloth: new THREE.MeshStandardMaterial({ color: 0x800000, metalness: 0, roughness: 0.8 }),
        RawMetal: new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.2 }),
        DebugMaterial: new THREE.MeshStandardMaterial({ color: 0x00ff00, metalness: 0.5, roughness: 0.5 }),
    };
}
