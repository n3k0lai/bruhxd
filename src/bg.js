import * as THREE from 'three';

let gradient; // Declare gradient variable to access it in the resize function

export function createGradient() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const planeGeometry = createPlaneGeometry(aspectRatio);
    const gradientMaterial = createGradientMaterial();

    gradient = new THREE.Mesh(planeGeometry, gradientMaterial);
    gradient.position.z = -5; // Moved further back in the scene

    window.addEventListener('resize', debounce(onResize, 1000)); // Debounced resize event

    return gradient;
}

function createPlaneGeometry(aspectRatio) {
    const planeWidth = aspectRatio > 1 ? 20 * aspectRatio : 20; // Adjust width for widescreen
    const planeHeight = aspectRatio > 1 ? 20 : 20 / aspectRatio; // Adjust height for mobile
    return new THREE.PlaneGeometry(planeWidth, planeHeight);
}

function createGradientMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2() }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            varying vec2 vUv;

            void main() {
                vec2 center = vec2(0.5, 0.5);
                float angle = uTime * 0.5;
                vec2 dir = vec2(cos(angle), sin(angle));
                float d = dot(vUv - center, dir) * 0.5 + 0.5;
                vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.84, 0.0), d);
                gl_FragColor = vec4(color, 1.0);
            }
        `
    });
}

function onResize() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const newGeometry = createPlaneGeometry(aspectRatio);
    gradient.geometry.dispose(); // Dispose of the old geometry
    gradient.geometry = newGeometry; // Update to the new geometry
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
